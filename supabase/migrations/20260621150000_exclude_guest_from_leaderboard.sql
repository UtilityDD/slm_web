-- Exclude guest preview accounts from leaderboard views.
-- Guests can browse scoreboards but must not appear on them.
-- Run after 20260621140000_guest_preview_role.sql
--
-- Note: CREATE OR REPLACE cannot remove columns from an existing view (42P16).
-- We DROP and recreate both views. Safe: views only, no table data touched.

BEGIN;

DROP VIEW IF EXISTS public.monthly_leaderboard_view;
DROP VIEW IF EXISTS public.leaderboard_view CASCADE;

CREATE VIEW public.leaderboard_view AS
SELECT
  p.id AS user_id,
  p.points AS score,
  p.full_name,
  p.district,
  p.avatar_url,
  p.training_level,
  p.completed_lessons,
  p.total_penalties,
  p.reading_points,
  p.quiz_points,
  p.last_login_at,
  p.updated_at AS last_active
FROM public.profiles p
WHERE p.points > 0
  AND COALESCE(p.role, 'lineman') <> 'guest';

GRANT SELECT ON public.leaderboard_view TO postgres, anon, authenticated, service_role;

-- Monthly view: v2 net scoring (see fix_monthly_leaderboard_view_v2_net.sql) + guest exclusion.
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
WHERE COALESCE(p.role, 'lineman') <> 'guest'
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

COMMIT;
