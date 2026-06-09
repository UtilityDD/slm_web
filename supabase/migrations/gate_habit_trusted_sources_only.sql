-- Gate reads: only trusted reading timestamps (exclude backfill_profile estimates).
-- Does NOT modify award_training_points, submit_quiz_result_v2, or scoring logic.

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

GRANT EXECUTE ON FUNCTION public.get_latest_reading_habit_at(uuid) TO anon, authenticated, service_role;
