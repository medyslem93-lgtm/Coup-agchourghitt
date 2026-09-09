create or replace function public.admin_recalculate_prediction_points(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
begin
  if not coalesce(private.is_tournament_admin(), false) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return public.calculate_match_prediction_points(p_match_id);
end;
$$;

revoke all on function public.admin_recalculate_prediction_points(uuid) from public, anon;
grant execute on function public.admin_recalculate_prediction_points(uuid) to authenticated;

-- Trigger functions run through their triggers and must never be exposed as RPCs.
revoke all on function public.guard_match_prediction() from public, anon, authenticated;
revoke all on function public.recalculate_prediction_points_on_match() from public, anon, authenticated;
