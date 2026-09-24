-- Gift/rules plaque says “পয়েন্ট”. Show awarded Home points (cap 100),
-- not raw correct-answer count (can be 108+).

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
        'score', LEAST(COALESCE(s.points_awarded, s.score), 100)
      )
      FROM public.identify_scores s
      JOIN public.profiles p ON p.id = s.user_id
      WHERE COALESCE(s.points_awarded, s.score) > 0
        AND coalesce(p.role, '') IS DISTINCT FROM 'admin'
        AND NOT public.is_guest_user(s.user_id)
      ORDER BY LEAST(COALESCE(s.points_awarded, s.score), 100) DESC,
               s.score DESC,
               s.updated_at ASC
      LIMIT 1
    ),
    jsonb_build_object('ok', true, 'empty', true)
  );
$$;

COMMENT ON FUNCTION public.get_identify_top_scorer() IS
  'Identify rules card: highest awarded Parichiti points (cap 100) + name.';

GRANT EXECUTE ON FUNCTION public.get_identify_top_scorer() TO anon, authenticated, service_role;
