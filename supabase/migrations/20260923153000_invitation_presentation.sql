alter table public.site_invitations
  add column if not exists presentation text not null default 'standard';

alter table public.site_invitations
  drop constraint if exists site_invitations_presentation_check;

alter table public.site_invitations
  add constraint site_invitations_presentation_check
  check (presentation in ('standard', 'cinematic'));
