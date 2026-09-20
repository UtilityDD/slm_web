-- Identify real score → add to profiles.points (cap 100 / day). Admin preview: 0 points.
-- Depends on: 20260919103000_identify_scores.sql

NOTIFY pgrst, 'reload schema';

ALTER TABLE public.identify_scores
  ADD COLUMN IF NOT EXISTS points_awarded integer NOT NULL DEFAULT 0
  CHECK (points_awarded >= 0 AND points_awarded <= 100);

COMMENT ON COLUMN public.identify_scores.points_awarded IS
  'Home/quiz points granted for this IST-day run (0 for admin preview; max 100).';

CREATE OR REPLACE FUNCTION public.submit_identify_score(
  p_score integer,
  p_asked integer DEFAULT 0,
  p_mistakes integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_is_admin boolean := false;
  v_today date := public.ist_today();
  v_existing public.identify_scores%ROWTYPE;
  v_score integer;
  v_asked integer;
  v_mistakes integer;
  v_award integer := 0;
  v_new_total integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF public.is_guest_user(v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'guest_preview');
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  v_is_admin := (v_role = 'admin');

  v_score := GREATEST(0, LEAST(10000, COALESCE(p_score, 0)));
  v_asked := GREATEST(0, LEAST(10000, COALESCE(p_asked, 0)));
  v_mistakes := GREATEST(0, LEAST(20, COALESCE(p_mistakes, 0)));

  SELECT * INTO v_existing FROM public.identify_scores WHERE user_id = v_uid;

  IF NOT v_is_admin
     AND v_existing.user_id IS NOT NULL
     AND v_existing.played_on = v_today THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'already_played',
      'score', v_existing.score,
      'points_awarded', COALESCE(v_existing.points_awarded, 0),
      'played_on', v_existing.played_on,
      'today', v_today
    );
  END IF;

  -- Normal users: award once per IST day, capped at 100. Admin preview: never award.
  IF NOT v_is_admin THEN
    v_award := LEAST(v_score, 100);
  ELSE
    v_award := 0;
  END IF;

  INSERT INTO public.identify_scores AS s (
    user_id, score, asked, mistakes, played_on, points_awarded, updated_at
  )
  VALUES (
    v_uid, v_score, v_asked, v_mistakes, v_today, v_award, timezone('utc'::text, now())
  )
  ON CONFLICT (user_id) DO UPDATE SET
    score = EXCLUDED.score,
    asked = EXCLUDED.asked,
    mistakes = EXCLUDED.mistakes,
    played_on = EXCLUDED.played_on,
    points_awarded = EXCLUDED.points_awarded,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_existing;

  IF v_award > 0 THEN
    UPDATE public.profiles
    SET
      points = COALESCE(points, 0) + v_award,
      quiz_points = COALESCE(quiz_points, 0) + v_award,
      updated_at = timezone('utc'::text, now())
    WHERE id = v_uid
    RETURNING points INTO v_new_total;
  ELSE
    SELECT points INTO v_new_total FROM public.profiles WHERE id = v_uid;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'score', v_existing.score,
    'asked', v_existing.asked,
    'mistakes', v_existing.mistakes,
    'played_on', v_existing.played_on,
    'points_awarded', v_award,
    'new_total_points', v_new_total,
    'preview', v_is_admin,
    'today', v_today
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_identify_score(integer, integer, integer) TO authenticated, service_role;
