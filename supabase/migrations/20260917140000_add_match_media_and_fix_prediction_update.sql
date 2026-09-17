-- Add typed match media metadata without changing existing records.
alter table public.media_assets
  add column if not exists media_type text,
  add column if not exists captured_minute integer,
  add column if not exists score_a integer,
  add column if not exists score_b integer;

update public.media_assets
set media_type = case
  when lower(coalesce(kind, '')) like '%video%'
    or lower(path) ~ '\.(mp4|webm|mov|m4v)$' then 'video'
  else 'image'
end
where media_type is null;

alter table public.media_assets
  alter column media_type set default 'image',
  alter column media_type set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'media_assets_media_type_check'
  ) then
    alter table public.media_assets
      add constraint media_assets_media_type_check
      check (media_type in ('image', 'video'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'media_assets_captured_minute_check'
  ) then
    alter table public.media_assets
      add constraint media_assets_captured_minute_check
      check (captured_minute is null or captured_minute between 0 and 200);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'media_assets_score_a_check'
  ) then
    alter table public.media_assets
      add constraint media_assets_score_a_check check (score_a is null or score_a >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'media_assets_score_b_check'
  ) then
    alter table public.media_assets
      add constraint media_assets_score_b_check check (score_b is null or score_b >= 0);
  end if;
end $$;

comment on column public.media_assets.media_type is 'Rendered media kind: image or video.';
comment on column public.media_assets.captured_minute is 'Match minute shown in the broadcast overlay for this media item.';
comment on column public.media_assets.score_a is 'Home score captured with this media item.';
comment on column public.media_assets.score_b is 'Away score captured with this media item.';

-- The existing public media bucket now accepts short match videos and iPhone clips.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime'
    ]::text[]
where id = 'tournament-media';

-- pg-safeupdate correctly rejected the former unqualified prediction_users UPDATE.
-- Keep the same calculation but scope it to users who actually have predictions.
create or replace function public.calculate_match_prediction_points(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  m public.matches%rowtype;
  p public.match_predictions%rowtype;
  exact_pts int := 3;
  winner_pts int := 2;
  v_exact boolean;
  v_outcome boolean;
  v_total int;
begin
  select * into m from public.matches where id = p_match_id;
  if not found or m.status <> 'انتهت' or m.score_a is null or m.score_b is null then
    return jsonb_build_object('ok', false, 'reason', 'MATCH_NOT_FINISHED');
  end if;

  insert into public.match_prediction_settings(match_id, points_settings)
  values(p_match_id, jsonb_build_object('exactScore',3,'winner',2,'scorer',0,'assist',0,'motm',0,'fullBonus',0))
  on conflict(match_id) do nothing;

  select coalesce((points_settings->>'exactScore')::int,3),
         coalesce((points_settings->>'winner')::int,2)
    into exact_pts, winner_pts
  from public.match_prediction_settings
  where match_id = p_match_id;

  for p in select * from public.match_predictions where match_id = p_match_id loop
    v_exact := p.prediction_a = m.score_a and p.prediction_b = m.score_b;
    v_outcome := sign(p.prediction_a-p.prediction_b) = sign(m.score_a-m.score_b);
    v_total := case when v_exact then exact_pts when v_outcome then winner_pts else 0 end;

    update public.match_predictions
       set points = v_total,
           points_awarded = v_total,
           is_correct = v_outcome,
           locked_at = coalesce(locked_at, public.prediction_match_deadline(p_match_id)),
           updated_at = now()
     where id = p.id;

    insert into public.prediction_points(
      prediction_id, exact_score_points, winner_points, scorer_points,
      assist_points, motm_points, bonus_points, total_points, calculated_at
    ) values (
      p.id,
      case when v_exact then exact_pts else 0 end,
      case when (not v_exact and v_outcome) then winner_pts else 0 end,
      0,0,0,0,v_total,now()
    )
    on conflict(prediction_id) do update set
      exact_score_points = excluded.exact_score_points,
      winner_points = excluded.winner_points,
      scorer_points = 0,
      assist_points = 0,
      motm_points = 0,
      bonus_points = 0,
      total_points = excluded.total_points,
      calculated_at = excluded.calculated_at;
  end loop;

  update public.prediction_users u
     set total_points = coalesce((
           select sum(mp.points_awarded) from public.match_predictions mp where mp.user_id = u.id
         ),0),
         exact_scores = coalesce((
           select count(*) from public.match_predictions mp
           join public.matches mm on mm.id = mp.match_id
           where mp.user_id = u.id and mm.status = 'انتهت'
             and mp.prediction_a = mm.score_a and mp.prediction_b = mm.score_b
         ),0),
         correct_winners = coalesce((
           select count(*) from public.match_predictions mp
           join public.matches mm on mm.id = mp.match_id
           where mp.user_id = u.id and mm.status = 'انتهت'
             and sign(mp.prediction_a-mp.prediction_b) = sign(mm.score_a-mm.score_b)
         ),0),
         last_points_at = now(),
         updated_at = now()
   where exists (
     select 1 from public.match_predictions mp where mp.user_id = u.id
   );

  update public.match_prediction_settings
     set scored_at = now(), updated_at = now()
   where match_id = p_match_id;

  return jsonb_build_object(
    'ok', true,
    'matchId', p_match_id,
    'predictions', (select count(*) from public.match_predictions where match_id = p_match_id)
  );
end
$function$;
