-- Migration: 20260904180000_get_monthly_encouragement_activity.sql
-- Description: Server-side activity aggregation for monthly encouragement boards (Top Learner, Most Improved, New Player).
-- Avoids downloading tens of thousands of raw quiz_attempts rows over PostgREST to JavaScript.

CREATE OR REPLACE FUNCTION get_monthly_encouragement_activity(
    p_start timestamptz,
    p_end timestamptz,
    p_user_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
    user_id uuid,
    hourly bigint,
    lessons bigint,
    learner_score bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT
        qa.user_id,
        COUNT(*) FILTER (WHERE qa.quiz_id LIKE 'hourly-challenge-%')::bigint AS hourly,
        COUNT(DISTINCT (
            CASE 
                WHEN qa.quiz_id ~ '^lesson_bonus_\d+\.\d+' 
                THEN (regexp_match(qa.quiz_id, '^lesson_bonus_(\d+\.\d+)'))[1]
                WHEN qa.quiz_id LIKE 'lesson_bonus_%' 
                THEN qa.quiz_id
                ELSE NULL 
            END
        ))::bigint AS lessons,
        COALESCE(SUM(qa.score) FILTER (WHERE qa.quiz_id LIKE 'lesson_bonus%'), 0)::bigint AS learner_score
    FROM quiz_attempts qa
    WHERE qa.created_at >= p_start
      AND qa.created_at < p_end
      AND (p_user_ids IS NULL OR qa.user_id = ANY(p_user_ids))
      AND (qa.quiz_id LIKE 'hourly-challenge-%' OR qa.quiz_id LIKE 'lesson_bonus%')
    GROUP BY qa.user_id;
$$;

-- Grant execution to public / anon / authenticated so client leaderboards can call it
GRANT EXECUTE ON FUNCTION get_monthly_encouragement_activity(timestamptz, timestamptz, uuid[]) TO anon, authenticated, service_role;
