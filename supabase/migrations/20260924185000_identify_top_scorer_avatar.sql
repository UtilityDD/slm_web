-- Visiting-card plaque: include today's top scorer photo + district.

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
        'avatar_url', nullif(trim(p.avatar_url), ''),
        'district', nullif(trim(p.district), ''),
        'score', LEAST(COALESCE(s.points_awarded, s.score), 100)
      )
      FROM public.identify_scores s
      JOIN public.profiles p ON p.id = s.user_id
      WHERE s.played_on = (timezone('Asia/Kolkata', now()))::date
        AND COALESCE(s.points_awarded, s.score) > 0
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
  'Identify rules card: today''s top awarded points (IST, cap 100) + name, photo, district.';

GRANT EXECUTE ON FUNCTION public.get_identify_top_scorer() TO anon, authenticated, service_role;
