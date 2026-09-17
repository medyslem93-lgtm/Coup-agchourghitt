alter table public.matches
  add column if not exists recap_title text,
  add column if not exists recap_text text,
  add column if not exists recap_published boolean not null default false;

comment on column public.matches.recap_title is
  'Optional editorial title for the public match recap.';

comment on column public.matches.recap_text is
  'Editorial match recap published from the authenticated administration panel.';

comment on column public.matches.recap_published is
  'Controls whether the editorial recap and its match gallery are public.';
