-- Keep Team of the Week usable when a configured round has no matching match/lineup rows yet.
-- Manual eligibility remains highest priority; then recorded lineup players; then round teams;
-- finally all players in the selected tournament as a safe data-backed fallback.
create or replace function public.get_weekly_eligible_players(p_round_id uuid)
returns table(
  player_id uuid,
  player_name text,
  photo_url text,
  shirt_number integer,
  player_position text,
  team_id uuid,
  team_name text,
  team_logo text
)
language sql
stable
security definer
set search_path = public
as $function$
with r as (
  select wr.*, t.division
  from weekly_lineup_rounds wr
  join tournaments t on t.id = wr.tournament_id
  where wr.id = p_round_id
),
round_matches as (
  select m.*
  from matches m, r
  where m.tournament_id = r.tournament_id
    and coalesce(m.round_name, m.stage) = r.label
),
lineup_players as (
  select distinct mlp.player_id
  from match_lineup_players mlp
  join match_lineups ml on ml.id = mlp.lineup_id
  join round_matches rm on rm.id = ml.match_id
),
custom as (
  select e.player_id
  from weekly_lineup_eligible_players e
  where e.round_id = p_round_id
),
base as (
  select p.id
  from players p
  join teams tm on tm.id = p.team_id
  cross join r
  where tm.tournament_id = r.tournament_id
    and (
      (exists(select 1 from custom) and p.id in (select player_id from custom))
      or (not exists(select 1 from custom) and exists(select 1 from lineup_players) and p.id in (select player_id from lineup_players))
      or (not exists(select 1 from custom) and not exists(select 1 from lineup_players) and exists(select 1 from round_matches) and p.team_id in (
        select team_a_id from round_matches where team_a_id is not null
        union
        select team_b_id from round_matches where team_b_id is not null
      ))
      or (not exists(select 1 from custom) and not exists(select 1 from lineup_players) and not exists(select 1 from round_matches))
    )
)
select p.id, p.name, p.photo_url, p.number, p.position, tm.id, tm.name, tm.logo_url
from base b
join players p on p.id = b.id
join teams tm on tm.id = p.team_id
order by tm.name, p.name;
$function$;
