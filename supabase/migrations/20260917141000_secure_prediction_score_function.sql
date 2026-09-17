-- This function is an internal trigger helper and must not be callable through the public API.
revoke all on function public.calculate_match_prediction_points(uuid) from public, anon, authenticated;
