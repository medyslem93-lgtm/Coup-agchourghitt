-- Keep the live score synchronized with future goal event changes.
-- Existing rows are intentionally not recalculated or modified.
create or replace function private.sync_match_score_from_event_delta()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  old_is_goal boolean := false;
  new_is_goal boolean := false;
begin
  if tg_op <> 'INSERT' then
    old_is_goal := old.type in ('هدف', 'ركلة جزاء مسجلة');
  end if;
  if tg_op <> 'DELETE' then
    new_is_goal := new.type in ('هدف', 'ركلة جزاء مسجلة');
  end if;

  if tg_op = 'UPDATE'
     and old.match_id = new.match_id
     and old.team_id is not distinct from new.team_id
     and old_is_goal = new_is_goal then
    return new;
  end if;

  if old_is_goal and old.team_id is not null then
    update public.matches
       set score_a = case when team_a_id = old.team_id then greatest(coalesce(score_a, 0) - 1, 0) else score_a end,
           score_b = case when team_b_id = old.team_id then greatest(coalesce(score_b, 0) - 1, 0) else score_b end
     where id = old.match_id
       and old.team_id in (team_a_id, team_b_id);
  end if;

  if new_is_goal and new.team_id is not null then
    update public.matches
       set score_a = case when team_a_id = new.team_id then coalesce(score_a, 0) + 1 else score_a end,
           score_b = case when team_b_id = new.team_id then coalesce(score_b, 0) + 1 else score_b end
     where id = new.match_id
       and new.team_id in (team_a_id, team_b_id);
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists sync_match_score_from_event_delta on public.match_events;
create trigger sync_match_score_from_event_delta
before insert or update or delete on public.match_events
for each row execute function private.sync_match_score_from_event_delta();

comment on function private.sync_match_score_from_event_delta() is
  'Atomically adjusts match scores when future goal events are inserted, edited, or deleted.';
