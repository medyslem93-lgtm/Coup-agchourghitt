-- A clock belongs to the match, so every viewer sees the same elapsed time.
-- Match scheduling remains separate from the actual start of play.
create table if not exists public.match_live_clocks (
  match_id uuid primary key references public.matches(id) on delete cascade,
  elapsed_seconds integer not null default 0 check (elapsed_seconds >= 0),
  anchor_at timestamptz,
  running boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.match_live_clocks enable row level security;
grant select on public.match_live_clocks to anon, authenticated;
grant insert, update, delete on public.match_live_clocks to authenticated;
create policy public_read on public.match_live_clocks for select to public using (true);
create policy admin_manage on public.match_live_clocks for all to authenticated
  using ((select private.is_tournament_admin()))
  with check ((select private.is_tournament_admin()));

create or replace function private.sync_match_live_clock()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  previous_active boolean := false;
  current_active boolean;
  existing public.match_live_clocks%rowtype;
  tick timestamptz := clock_timestamp();
begin
  current_active := new.status not in ('انتهت', 'ملغاة', 'مؤجلة')
    and (new.status = 'مباشر' or new.stream_status = 'live');
  if tg_op = 'UPDATE' then
    previous_active := old.status not in ('انتهت', 'ملغاة', 'مؤجلة')
      and (old.status = 'مباشر' or old.stream_status = 'live');
  end if;

  select * into existing from public.match_live_clocks where match_id = new.id for update;
  if not found then
    insert into public.match_live_clocks(match_id, elapsed_seconds, anchor_at, running)
    values (new.id, greatest(0, coalesce(new.minute, 0)) * 60,
            case when current_active then tick end, current_active);
  elsif tg_op = 'UPDATE' and new.minute is distinct from old.minute then
    update public.match_live_clocks
       set elapsed_seconds = greatest(0, coalesce(new.minute, 0)) * 60,
           anchor_at = case when current_active then tick end,
           running = current_active, updated_at = tick
     where match_id = new.id;
  elsif current_active and not previous_active then
    update public.match_live_clocks
       set anchor_at = tick, running = true, updated_at = tick
     where match_id = new.id;
  elsif not current_active and previous_active then
    update public.match_live_clocks
       set elapsed_seconds = existing.elapsed_seconds
           + case when existing.running and existing.anchor_at is not null
             then greatest(0, floor(extract(epoch from (tick - existing.anchor_at)))::integer)
             else 0 end,
           anchor_at = null, running = false, updated_at = tick
     where match_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function private.sync_match_live_clock() from public, anon, authenticated;
drop trigger if exists sync_match_live_clock on public.matches;
create trigger sync_match_live_clock
after insert or update of status, stream_status, minute on public.matches
for each row execute function private.sync_match_live_clock();

-- Preserve existing minutes without starting clocks for historical results.
insert into public.match_live_clocks(match_id, elapsed_seconds, anchor_at, running)
select id, greatest(0, coalesce(minute, 0)) * 60,
       case when status not in ('انتهت', 'ملغاة', 'مؤجلة')
                  and (status = 'مباشر' or stream_status = 'live') then clock_timestamp() end,
       status not in ('انتهت', 'ملغاة', 'مؤجلة')
         and (status = 'مباشر' or stream_status = 'live')
from public.matches
on conflict (match_id) do nothing;
