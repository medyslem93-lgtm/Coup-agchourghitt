alter table public.matches drop constraint if exists matches_stream_type_check;

alter table public.matches
  add constraint matches_stream_type_check
  check (stream_type is null or stream_type in ('youtube','facebook','hls','embed','livekit'));

comment on column public.matches.stream_type is
  'Stream provider: youtube, facebook, hls, embed, or livekit camera.';
