-- Competition wide selections in each of the three active divisions.
-- The season remains editable from the administration panel.
update public.weekly_lineup_rounds r
set label='تشكيلة البطولة', is_open=true, closes_at='2026-09-30T23:59:59+00:00'::timestamptz, updated_at=now()
from public.tournaments t
where t.id=r.tournament_id and t.division in ('الكبار','الوسط','الصغار');

-- Position labels in the picker must agree with the validation performed on save.
create or replace function public.get_weekly_eligible_players(p_round_id uuid)
returns table(player_id uuid, player_name text, photo_url text, shirt_number integer, player_position text, team_id uuid, team_name text, team_logo text)
language sql stable security definer set search_path=public
as $body$
with r as (
 select wr.tournament_id from weekly_lineup_rounds wr where wr.id=p_round_id
)
select p.id,p.name,p.photo_url,p.number,
       coalesce(nullif(p.position,''),'غير محدد')::text,
       tm.id,tm.name,tm.logo_url
from players p
join teams tm on tm.id=p.team_id
join r on r.tournament_id=tm.tournament_id
order by tm.name,p.name;
$body$;
