-- Keep existing submissions intact while accepting the twelve standard plans shown in the editor.
alter table public.weekly_lineup_rounds drop constraint if exists weekly_lineup_rounds_formation_check;
alter table public.weekly_lineup_rounds add constraint weekly_lineup_rounds_formation_check check (formation = any (array['4-4-2','4-3-3','4-5-1','3-4-3','3-5-2','3-1-5-1','5-3-2','5-4-1','4-2-2-2','4-2-3-1','2-4-4','2-5-3']));
alter table public.weekly_lineup_submissions drop constraint if exists weekly_lineup_submissions_formation_check;
alter table public.weekly_lineup_submissions add constraint weekly_lineup_submissions_formation_check check (formation = any (array['4-4-2','4-3-3','4-5-1','3-4-3','3-5-2','3-1-5-1','5-3-2','5-4-1','4-2-2-2','4-2-3-1','2-4-4','2-5-3']));

create or replace function public.get_weekly_lineup_owner(p_session_token uuid)
returns table(name text,avatar_url text)
language sql stable security definer set search_path = public
as $body$
  select u.name, u.avatar_url from prediction_users u where u.session_token = p_session_token limit 1;
$body$;
revoke all on function public.get_weekly_lineup_owner(uuid) from public;
grant execute on function public.get_weekly_lineup_owner(uuid) to anon, authenticated;

create or replace function public.get_weekly_crowd_lineup(p_round_id uuid)
returns table(player_id uuid,position_group text,slot_key text,selection_count bigint,selection_percent numeric)
language sql stable security definer set search_path = public
as $body$
with r as (select string_to_array(formation,'-')::int[] as parts from weekly_lineup_rounds where id=p_round_id),
s as (select * from get_weekly_selection_stats(p_round_id)),
ranked as (select s.*,row_number() over(partition by position_group order by selection_count desc,player_id) rn from s),
lim as (select parts[1] d, (select sum(parts[i]) from generate_subscripts(parts,1) i where i>1 and i<array_length(parts,1)) m,parts[array_length(parts,1)] f from r)
select player_id,position_group,
case position_group when 'حارس مرمى' then 'gk' when 'دفاع' then 'def'||rn when 'وسط' then 'mid'||rn when 'هجوم' then 'fwd'||rn end,
selection_count,selection_percent from ranked,lim
where (position_group='حارس مرمى' and rn<=1) or (position_group='دفاع' and rn<=d) or (position_group='وسط' and rn<=m) or (position_group='هجوم' and rn<=f)
order by case position_group when 'حارس مرمى' then 1 when 'دفاع' then 2 when 'وسط' then 3 else 4 end,rn;
$body$;

create or replace function public.save_weekly_lineup(p_round_id uuid,p_session_token uuid,p_formation text,p_selections jsonb)
returns uuid language plpgsql security definer set search_path = public
as $body$
declare v_user uuid; v_round weekly_lineup_rounds%rowtype; v_submission uuid;
v_count int; v_unique int; v_item jsonb; v_pid uuid; v_slot text; v_group text; v_pos text;
v_known_gk int; v_expected_def int; v_expected_mid int; v_expected_fwd int; v_parts int[];
begin
 select id into v_user from prediction_users where session_token=p_session_token;
 if v_user is null then raise exception 'INVALID_SESSION'; end if;
 select * into v_round from weekly_lineup_rounds where id=p_round_id;
 if v_round.id is null then raise exception 'ROUND_NOT_FOUND'; end if;
 if not weekly_round_is_open(p_round_id) then raise exception 'ROUND_CLOSED'; end if;
 if p_formation not in ('4-4-2','4-3-3','4-5-1','3-4-3','3-5-2','3-1-5-1','5-3-2','5-4-1','4-2-2-2','4-2-3-1','2-4-4','2-5-3') then raise exception 'INVALID_FORMATION'; end if;
 v_parts:=string_to_array(p_formation,'-')::int[];
 v_expected_def:=v_parts[1];v_expected_fwd:=v_parts[array_length(v_parts,1)];
 select sum(v_parts[i]) into v_expected_mid from generate_subscripts(v_parts,1) i where i>1 and i<array_length(v_parts,1);
 if jsonb_typeof(p_selections)<>'array' then raise exception 'INVALID_SELECTIONS'; end if;
 select count(*),count(distinct (x->>'player_id')) into v_count,v_unique from jsonb_array_elements(p_selections) x;
 if v_count<>11 or v_unique<>11 then raise exception 'LINEUP_MUST_HAVE_11_UNIQUE_PLAYERS'; end if;
 if (select count(*) from jsonb_array_elements(p_selections) x where x->>'position_group'='حارس مرمى')<>1
 or (select count(*) from jsonb_array_elements(p_selections) x where x->>'position_group'='دفاع')<>v_expected_def
 or (select count(*) from jsonb_array_elements(p_selections) x where x->>'position_group'='وسط')<>v_expected_mid
 or (select count(*) from jsonb_array_elements(p_selections) x where x->>'position_group'='هجوم')<>v_expected_fwd then raise exception 'FORMATION_COUNTS_INVALID'; end if;
 select count(*) into v_known_gk from get_weekly_eligible_players(p_round_id) e where e.player_position='حارس مرمى';
 for v_item in select * from jsonb_array_elements(p_selections) loop
   v_pid:=(v_item->>'player_id')::uuid;v_slot:=v_item->>'slot_key';v_group:=v_item->>'position_group';
   if v_slot is null or v_group not in ('حارس مرمى','دفاع','وسط','هجوم') then raise exception 'INVALID_SLOT'; end if;
   if (v_group='حارس مرمى' and v_slot<>'gk') or (v_group='دفاع' and v_slot!~'^def[1-5]$') or (v_group='وسط' and v_slot!~'^mid[1-6]$') or (v_group='هجوم' and v_slot!~'^fwd[1-4]$') then raise exception 'INVALID_SLOT'; end if;
   if not exists(select 1 from get_weekly_eligible_players(p_round_id) e where e.player_id=v_pid) then raise exception 'PLAYER_NOT_ELIGIBLE'; end if;
   select position into v_pos from players where id=v_pid;
   if v_pos is not null and v_pos<>'غير محدد' then
      if v_group='حارس مرمى' and v_pos<>'حارس مرمى' and v_known_gk>0 then raise exception 'POSITION_MISMATCH'; end if;
      if v_group<>'حارس مرمى' and v_pos<>v_group then raise exception 'POSITION_MISMATCH'; end if;
   end if;
 end loop;
 insert into weekly_lineup_submissions(round_id,tournament_id,prediction_user_id,formation)
 values(p_round_id,v_round.tournament_id,v_user,p_formation)
 on conflict (round_id,prediction_user_id) where prediction_user_id is not null do update set formation=excluded.formation,updated_at=now() returning id into v_submission;
 delete from weekly_lineup_players where submission_id=v_submission;
 for v_item in select * from jsonb_array_elements(p_selections) loop
   insert into weekly_lineup_players(submission_id,player_id,slot_key,position_group,sort_order)
   values(v_submission,(v_item->>'player_id')::uuid,v_item->>'slot_key',v_item->>'position_group',coalesce((v_item->>'sort_order')::int,0));
 end loop;
 return v_submission;
end;
$body$;

-- The photo link can be changed only by its guest-session owner.
create or replace function public.set_weekly_lineup_owner_avatar(p_session_token uuid,p_avatar_url text)
returns table(name text,avatar_url text)
language plpgsql security definer set search_path = public
as $body$
declare v_url text := nullif(trim(p_avatar_url),'');
begin
 if v_url is not null and (length(v_url)>1000 or v_url !~* '^https://[^[:space:]]+[.][^[:space:]]+') then raise exception 'INVALID_AVATAR_URL'; end if;
 return query update prediction_users u set avatar_url=v_url where u.session_token=p_session_token returning u.name,u.avatar_url;
end;
$body$;
revoke all on function public.set_weekly_lineup_owner_avatar(uuid,text) from public;
grant execute on function public.set_weekly_lineup_owner_avatar(uuid,text) to anon, authenticated;
