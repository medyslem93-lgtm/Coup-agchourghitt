-- General invitations are separate from the existing tournament and news data.
create table if not exists public.site_invitations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  body text,
  image_url text,
  event_at timestamptz,
  venue text,
  action_label text default 'عرض التفاصيل',
  action_url text,
  published boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  show_on_entry boolean not null default true,
  show_on_home boolean not null default true,
  display_mode text not null default 'session' check (display_mode in ('session', 'every_visit')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_invitations enable row level security;
create policy site_invitations_public_read on public.site_invitations
  for select to anon, authenticated
  using (published = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy site_invitations_admin_manage on public.site_invitations
  for all to authenticated
  using ((select private.is_tournament_admin()))
  with check ((select private.is_tournament_admin()));
grant select on public.site_invitations to anon;
grant select, insert, update, delete on public.site_invitations to authenticated;
