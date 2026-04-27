-- =============================================================================
-- monthly_leaderboard_view v2 — NET monthly points (aligned with profiles.points)
-- =============================================================================
-- Problem fixed:
--   Old view used SUM(score) as "points" (gross) and could add profiles.reading_points
--   for "new users", while all-time uses profiles.points (net lifetime). That made
--   monthly_leaderboard_view.points > leaderboard_view.score for some users.
--
-- New rules:
--   * points (month)     = SUM(score) - SUM(COALESCE(penalty, 0))  — same net idea as profile repair
--   * total_penalties    = SUM(penalty)
--   * reading_points     = SUM(score) WHERE quiz_id LIKE 'lesson_bonus%' only (timestamped reading only)
--   * quiz_points        = points - reading_points (split for display)
--
-- Legacy reading without dated lesson_bonus rows will NOT appear in monthly totals
-- (they still count in all-time profiles.points). This is intentional for fairness.
--
-- Run in Supabase SQL Editor. Review then execute. Re-run debug_scores_leaderboard.sql query 3 after.
-- =============================================================================

DROP VIEW IF EXISTS public.monthly_leaderboard_view;

CREATE VIEW public.monthly_leaderboard_view AS
SELECT
    qa.user_id,
    p.full_name,
    p.avatar_url,
    p.district,
    p.training_level,
    CAST(EXTRACT(MONTH FROM qa.created_at) AS INTEGER) AS month_num,
    CAST(EXTRACT(YEAR FROM qa.created_at) AS INTEGER) AS year_num,

    SUM(COALESCE(qa.score, 0)) - SUM(COALESCE(qa.penalty, 0)) AS points,

    SUM(COALESCE(qa.penalty, 0)) AS total_penalties,

    SUM(
        CASE WHEN qa.quiz_id LIKE 'lesson_bonus%'
             THEN COALESCE(qa.score, 0)
             ELSE 0
        END
    ) AS reading_points,

    (
        SUM(COALESCE(qa.score, 0)) - SUM(COALESCE(qa.penalty, 0))
        - SUM(
            CASE WHEN qa.quiz_id LIKE 'lesson_bonus%'
                 THEN COALESCE(qa.score, 0)
                 ELSE 0
            END
        )
    ) AS quiz_points

FROM public.quiz_attempts qa
JOIN public.profiles p ON p.id = qa.user_id
GROUP BY
    qa.user_id,
    p.full_name,
    p.avatar_url,
    p.district,
    p.training_level,
    EXTRACT(MONTH FROM qa.created_at),
    EXTRACT(YEAR FROM qa.created_at)
HAVING
    SUM(COALESCE(qa.score, 0)) > 0
    OR SUM(COALESCE(qa.penalty, 0)) > 0;

GRANT SELECT ON public.monthly_leaderboard_view TO postgres, anon, authenticated, service_role;
