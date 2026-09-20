-- Identify → feed Monthly + Lineman Day via existing quiz_attempts → daily_user_activity pipe.
-- Non-destructive: CREATE OR REPLACE only; no drops; admin still awards 0.
-- Depends on: 20260919103000_identify_scores.sql, 20260920120000_identify_score_award_points.sql

NOTIFY pgrst, 'reload schema';

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
  v_quiz_id text;
  v_board_row boolean := false;
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

    -- One attempt id per IST day → trigger syncs daily_user_activity
    -- → Monthly (calendar month) + Lineman Day (cycle date range) both SUM that diary.
    v_quiz_id := 'identify-' || to_char(v_today, 'YYYY-MM-DD');
    BEGIN
      INSERT INTO public.quiz_attempts (user_id, quiz_id, score, penalty)
      SELECT v_uid, v_quiz_id, v_award, 0
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.quiz_attempts qa
        WHERE qa.user_id = v_uid
          AND qa.quiz_id = v_quiz_id
      );
      v_board_row := FOUND;
    EXCEPTION WHEN OTHERS THEN
      -- Non-fatal: Parichiti board + Home points already saved.
      RAISE WARNING '[submit_identify_score] quiz_attempts insert skipped: %', SQLERRM;
      v_board_row := false;
    END;
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
    'board_attempt', v_board_row,
    'preview', v_is_admin,
    'today', v_today
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_identify_score(integer, integer, integer) TO authenticated, service_role;

COMMENT ON FUNCTION public.submit_identify_score(integer, integer, integer) IS
  'Parichiti real submit: replace identify_scores; non-admin +min(score,100) to profiles; one identify-YYYY-MM-DD quiz_attempts row for Monthly + Lineman Day. Admin preview awards 0.';
