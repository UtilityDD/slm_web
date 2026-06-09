-- Habit logging RPCs for custom-auth clients (no Supabase JWT / auth.uid()).
-- Does NOT modify award_training_points, submit_quiz_result_v2, or scoring logic.

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

CREATE OR REPLACE FUNCTION public.get_latest_reading_habit_at(p_user_id uuid)
RETURNS timestamptz
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT max(completed_at)
    FROM public.reading_habit_completions
    WHERE user_id = COALESCE(p_user_id, auth.uid())
      AND source IN ('app', 'backfill_quiz_attempts');
$$;

GRANT EXECUTE ON FUNCTION public.log_reading_habit_completion(uuid, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_latest_reading_habit_at(uuid) TO anon, authenticated, service_role;
