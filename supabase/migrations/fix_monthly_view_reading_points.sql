-- Fix monthly_leaderboard_view to properly include reading_points
-- Problem: reading_points are stored in profiles.reading_points but never logged
-- in quiz_attempts with timestamps. So monthly view misses all reading points.
--
-- Solution: For users who JOINED in the same month as the quiz activity,
-- include profiles.reading_points (since ALL their reading is from that month).
-- For older users, fall back to lesson_bonus% entries in quiz_attempts.

DROP VIEW IF EXISTS monthly_leaderboard_view;

CREATE VIEW monthly_leaderboard_view AS
SELECT 
    qa.user_id,
    p.full_name,
    p.avatar_url,
    p.district,
    p.training_level,
    CAST(EXTRACT(MONTH FROM qa.created_at) AS INTEGER) as month_num,
    CAST(EXTRACT(YEAR FROM qa.created_at) AS INTEGER) as year_num,

    -- Total points = quiz scores + reading_points (for users who joined this month)
    SUM(qa.score) + 
        CASE 
            WHEN CAST(EXTRACT(MONTH FROM p.created_at) AS INTEGER) = CAST(EXTRACT(MONTH FROM MIN(qa.created_at)) AS INTEGER)
             AND CAST(EXTRACT(YEAR FROM p.created_at) AS INTEGER) = CAST(EXTRACT(YEAR FROM MIN(qa.created_at)) AS INTEGER)
            THEN COALESCE(p.reading_points, 0)
            ELSE SUM(CASE WHEN qa.quiz_id LIKE 'lesson_bonus%' THEN qa.score ELSE 0 END)
        END as points,

    SUM(qa.penalty) as total_penalties,

    -- Reading points: full profile reading_points for new users, lesson_bonus% for others
    CASE 
        WHEN CAST(EXTRACT(MONTH FROM p.created_at) AS INTEGER) = CAST(EXTRACT(MONTH FROM MIN(qa.created_at)) AS INTEGER)
         AND CAST(EXTRACT(YEAR FROM p.created_at) AS INTEGER) = CAST(EXTRACT(YEAR FROM MIN(qa.created_at)) AS INTEGER)
        THEN COALESCE(p.reading_points, 0)
        ELSE SUM(CASE WHEN qa.quiz_id LIKE 'lesson_bonus%' THEN qa.score ELSE 0 END)
    END as reading_points,

    -- Quiz points: everything except lesson_bonus
    SUM(CASE WHEN qa.quiz_id NOT LIKE 'lesson_bonus%' THEN qa.score ELSE 0 END) as quiz_points

FROM quiz_attempts qa
JOIN profiles p ON qa.user_id = p.id
GROUP BY 
    qa.user_id, 
    p.full_name, 
    p.avatar_url, 
    p.district, 
    p.training_level,
    p.created_at,
    p.reading_points,
    EXTRACT(MONTH FROM qa.created_at),
    EXTRACT(YEAR FROM qa.created_at)
HAVING SUM(qa.score) > 0;

-- Re-grant access
GRANT SELECT ON monthly_leaderboard_view TO postgres, anon, authenticated, service_role;
