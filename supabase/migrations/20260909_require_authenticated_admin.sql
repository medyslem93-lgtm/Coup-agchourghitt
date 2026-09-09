-- Retire the legacy secret-link administration path.
-- Public read/voting policies remain unchanged; management writes require an
-- authenticated account accepted by private.is_tournament_admin().
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where policyname ilike '%direct_link%'
       or policyname ilike '%link_manage%'
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end
$$;
