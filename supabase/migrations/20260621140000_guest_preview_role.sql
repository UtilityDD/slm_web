-- Guest preview role: browse-only accounts that cannot save scores or progress.
-- REVERT: run supabase/migrations/rollback_guest_preview_role.sql
--
-- After applying:
--   1. In Admin, set a user's role to 'guest' OR create account then:
--        UPDATE public.profiles SET role = 'guest' WHERE phone_number = '...';
--   2. Deploy the matching front-end build.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Helper: is this user a guest preview account?
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_guest_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role = 'guest'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_guest_user(uuid) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Allow role = 'guest' on profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'safety mitra', 'lineman', 'guest'));

COMMENT ON FUNCTION public.is_guest_user(uuid) IS
  'Returns true when the profile role is guest (preview-only; no scoring writes).';

-- ---------------------------------------------------------------------------
-- 3) submit_quiz_result_v2 — block guests (copy of hourly time guard + guard)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_quiz_result_v2(
  p_quiz_id text,
  p_score numeric,
  p_penalty numeric DEFAULT 0,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_rows int;
  v_final_points int;
  v_final_reading int;
  v_final_quiz_points int;
  v_score_int int := ROUND(p_score)::int;
  v_penalty_int int := ROUND(p_penalty)::int;
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
  v_net_points int;
  v_slot text;
  v_slot_ist timestamp;
  v_now_ist timestamp := (now() AT TIME ZONE 'Asia/Kolkata');
  v_diff_min numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF public.is_guest_user(v_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'guest_preview',
      'message', 'Guest preview accounts cannot save scores.'
    );
  END IF;

  IF p_quiz_id ~ '^hourly-challenge-\d{4}-\d{2}-\d{2}-\d{1,2}$' THEN
    v_slot := substring(p_quiz_id from 'hourly-challenge-(.*)$');
    v_slot_ist := make_timestamp(
      split_part(v_slot, '-', 1)::int,
      split_part(v_slot, '-', 2)::int,
      split_part(v_slot, '-', 3)::int,
      split_part(v_slot, '-', 4)::int,
      0, 0
    );
    v_diff_min := EXTRACT(EPOCH FROM (v_now_ist - v_slot_ist)) / 60.0;

    IF v_diff_min < -5 OR v_diff_min > 90 THEN
      RETURN json_build_object(
        'success', false,
        'error', 'hourly_time_mismatch',
        'message', 'This hourly challenge can only be submitted during its own hour.',
        'slot_ist', to_char(v_slot_ist, 'YYYY-MM-DD HH24:MI'),
        'now_ist', to_char(v_now_ist, 'YYYY-MM-DD HH24:MI')
      );
    END IF;
  END IF;

  v_net_points := v_score_int - v_penalty_int;

  IF p_quiz_id LIKE 'lesson_%' THEN
    INSERT INTO quiz_attempts (user_id, quiz_id, score, penalty)
    VALUES (v_user_id, p_quiz_id, v_score_int, v_penalty_int)
    ON CONFLICT (user_id, quiz_id) DO NOTHING;
  ELSE
    INSERT INTO quiz_attempts (user_id, quiz_id, score, penalty)
    VALUES (v_user_id, p_quiz_id, v_score_int, v_penalty_int)
    ON CONFLICT (user_id, quiz_id) DO UPDATE SET
      score = EXCLUDED.score,
      penalty = EXCLUDED.penalty,
      created_at = now();
  END IF;

  GET DIAGNOSTICS v_inserted_rows = ROW_COUNT;

  UPDATE profiles
  SET
    reading_points = CASE
      WHEN (v_inserted_rows > 0 OR p_quiz_id NOT LIKE 'lesson_%') AND p_quiz_id LIKE 'lesson_%'
      THEN COALESCE(reading_points, 0) + v_score_int
      ELSE COALESCE(reading_points, 0)
    END,
    quiz_points = CASE
      WHEN v_inserted_rows > 0 AND p_quiz_id NOT LIKE 'lesson_%'
      THEN COALESCE(quiz_points, 0) + v_net_points
      ELSE COALESCE(quiz_points, 0)
    END,
    points = CASE
      WHEN v_inserted_rows > 0
      THEN COALESCE(points, 0) + v_net_points
      ELSE COALESCE(points, 0)
    END,
    updated_at = now()
  WHERE id = v_user_id;

  SELECT points, reading_points, quiz_points
  INTO v_final_points, v_final_reading, v_final_quiz_points
  FROM profiles WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'new_total_points', v_final_points,
    'new_reading_points', v_final_reading,
    'new_quiz_points', v_final_quiz_points,
    'v_inserted_rows', v_inserted_rows
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) award_training_points — block guests; optional p_user_id for custom auth
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.award_training_points(text, numeric);

CREATE OR REPLACE FUNCTION public.award_training_points(
  input_quiz_id text,
  input_score numeric,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
  v_inserted_rows int;
  v_final_points int;
  v_final_reading int;
  v_score_int int := input_score::int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF public.is_guest_user(v_user_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'guest_preview',
      'message', 'Guest preview accounts cannot save scores.'
    );
  END IF;

  INSERT INTO quiz_attempts (user_id, quiz_id, score, penalty)
  VALUES (v_user_id, input_quiz_id, v_score_int, 0)
  ON CONFLICT (user_id, quiz_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted_rows = ROW_COUNT;

  IF v_inserted_rows > 0 THEN
    UPDATE profiles
    SET
      reading_points = COALESCE(reading_points, 0) + v_score_int,
      points = COALESCE(points, 0) + v_score_int,
      updated_at = now()
    WHERE id = v_user_id;
  END IF;

  SELECT points, reading_points
  INTO v_final_points, v_final_reading
  FROM profiles WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'already_awarded', (v_inserted_rows = 0),
    'new_total_points', v_final_points,
    'new_reading_points', v_final_reading
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_training_points(text, numeric, uuid)
  TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) log_reading_habit_completion — block guests
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_reading_habit_completion(
    p_user_id uuid,
    p_lesson_id text,
    p_kind text DEFAULT 'app'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := COALESCE(p_user_id, auth.uid());
    v_lesson_id text := trim(coalesce(p_lesson_id, ''));
    v_kind text := lower(trim(coalesce(p_kind, 'app')));
    v_completed_at timestamptz := timezone('utc'::text, now());
    v_inserted int;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    IF public.is_guest_user(v_user_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'guest_preview',
            'message', 'Guest preview accounts cannot save reading progress.'
        );
    END IF;

    IF v_lesson_id !~ '^\d+\.\d+$' THEN
        RETURN json_build_object('success', false, 'error', 'Invalid lesson id');
    END IF;

    IF v_kind NOT IN ('app', 'review') THEN
        v_kind := 'app';
    END IF;

    INSERT INTO public.reading_habit_completions (user_id, lesson_id, completed_at, source)
    VALUES (v_user_id, v_lesson_id, v_completed_at, 'app')
    ON CONFLICT (user_id, lesson_id)
    DO UPDATE SET completed_at = EXCLUDED.completed_at
    WHERE public.reading_habit_completions.completed_at < EXCLUDED.completed_at;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    RETURN json_build_object(
        'success', true,
        'inserted_or_updated', v_inserted > 0,
        'completed_at', v_completed_at,
        'kind', v_kind
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMIT;
