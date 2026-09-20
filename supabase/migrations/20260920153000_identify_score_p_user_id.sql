-- Fix Identify RPCs for custom auth: pass p_user_id (auth.uid() is often null).
-- Same pattern as award_training_points / submit_quiz_result_v2.
-- Non-destructive: CREATE OR REPLACE only.

NOTIFY pgrst, 'reload schema';

-- Drop old 0-arg / 3-arg forms so PostgREST picks the new signatures cleanly.
DROP FUNCTION IF EXISTS public.get_identify_score_status();
DROP FUNCTION IF EXISTS public.submit_identify_score(integer, integer, integer);

CREATE OR REPLACE FUNCTION public.get_identify_score_status(
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := COALESCE(auth.uid(), p_user_id);
  v_role text;
  v_row public.identify_scores%ROWTYPE;
  v_today date := public.ist_today();
  v_is_admin boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  v_is_admin := (v_role = 'admin');

  IF public.is_guest_user(v_uid) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'guest', true,
      'is_admin', false,
      'can_play', false,
      'score', null,
      'played_on', null,
      'played_today', false,
      'today', v_today
    );
  END IF;

  SELECT * INTO v_row FROM public.identify_scores WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'guest', false,
    'is_admin', v_is_admin,
    'can_play', v_is_admin OR v_row.user_id IS NULL OR v_row.played_on IS DISTINCT FROM v_today,
    'score', CASE WHEN v_row.user_id IS NULL THEN null ELSE v_row.score END,
    'asked', CASE WHEN v_row.user_id IS NULL THEN null ELSE v_row.asked END,
    'mistakes', CASE WHEN v_row.user_id IS NULL THEN null ELSE v_row.mistakes END,
    'played_on', CASE WHEN v_row.user_id IS NULL THEN null ELSE v_row.played_on::text END,
    'played_today', COALESCE(v_row.played_on = v_today, false),
    'points_awarded', CASE WHEN v_row.user_id IS NULL THEN null ELSE v_row.points_awarded END,
    'today', v_today
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_identify_score(
  p_score integer,
  p_asked integer DEFAULT 0,
  p_mistakes integer DEFAULT 0,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := COALESCE(auth.uid(), p_user_id);
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

GRANT EXECUTE ON FUNCTION public.get_identify_score_status(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.submit_identify_score(integer, integer, integer, uuid) TO authenticated, anon, service_role;
