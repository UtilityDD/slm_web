-- Public top Identify (পরিচিতি) scorer for the gift/rules card.
-- Read-only; excludes guests and admins. Non-destructive.

NOTIFY pgrst, 'reload schema';

CREATE OR REPLACE FUNCTION public.get_identify_top_scorer()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_build_object(
        'ok', true,
        'empty', false,
        'user_id', s.user_id,
        'full_name', coalesce(nullif(trim(p.full_name), ''), 'Lineman'),
        'score', s.score
      )
      FROM public.identify_scores s
      JOIN public.profiles p ON p.id = s.user_id
      WHERE s.score > 0
        AND coalesce(p.role, '') IS DISTINCT FROM 'admin'
        AND NOT public.is_guest_user(s.user_id)
      ORDER BY s.score DESC, s.updated_at ASC
      LIMIT 1
    ),
    jsonb_build_object('ok', true, 'empty', true)
  );
$$;

COMMENT ON FUNCTION public.get_identify_top_scorer() IS
  'Highest current Parichiti real score + display name (no admins/guests). For the Identify rules card.';

GRANT EXECUTE ON FUNCTION public.get_identify_top_scorer() TO anon, authenticated, service_role;
