-- ROLLBACK guest preview role (run in Supabase SQL Editor if feature must be reverted)
--
-- Order:
--   1. UPDATE guest profiles to lineman (below).
--   2. Paste and run ALL of: supabase/migrations/20260620153000_hourly_submit_time_guard.sql
--   3. Paste and run the rest of THIS file (award_training_points, log_reading_habit, constraint, drop helper).

BEGIN;

UPDATE public.profiles SET role = 'lineman' WHERE role = 'guest';
CREATE OR REPLACE FUNCTION public.award_training_points(
  input_quiz_id text,
  input_score numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_inserted_rows int;
  v_final_points int;
  v_final_reading int;
  v_score_int int := input_score::int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
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

-- log_reading_habit_completion: restore from log_reading_habit_rpc.sql (no guest guard)
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

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'safety mitra', 'lineman'));

DROP FUNCTION IF EXISTS public.is_guest_user(uuid);

COMMIT;
