-- Public landing page: exact registered-user count (bypasses RLS edge cases for anon clients).
CREATE OR REPLACE FUNCTION public.get_registered_linemen_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT count(*)::integer FROM public.profiles;
$$;

GRANT EXECUTE ON FUNCTION public.get_registered_linemen_count() TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_registered_linemen_count() IS
  'Total profiles count for public landing stats. SLM sequence may exceed this when accounts were deleted.';
