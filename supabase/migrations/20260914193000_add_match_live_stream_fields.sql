alter table public.matches
  add column if not exists stream_enabled boolean not null default false,
  add column if not exists stream_url text,
  add column if not exists stream_type text,
  add column if not exists stream_status text not null default 'offline';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'matches_stream_type_check' and conrelid = 'public.matches'::regclass) then
    alter table public.matches add constraint matches_stream_type_check
      check (stream_type is null or stream_type in ('youtube','facebook','hls','embed'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'matches_stream_status_check' and conrelid = 'public.matches'::regclass) then
    alter table public.matches add constraint matches_stream_status_check
      check (stream_status in ('offline','scheduled','live','ended'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'matches_stream_url_https_check' and conrelid = 'public.matches'::regclass) then
    alter table public.matches add constraint matches_stream_url_https_check
      check (stream_url is null or stream_url = '' or stream_url ~ '^https://');
  end if;
end $$;

comment on column public.matches.stream_enabled is 'Controls whether a stream is available for this match.';
comment on column public.matches.stream_url is 'HTTPS source URL for the live stream.';
comment on column public.matches.stream_type is 'Stream provider: youtube, facebook, hls, or embed.';
comment on column public.matches.stream_status is 'Stream lifecycle: offline, scheduled, live, or ended.';
