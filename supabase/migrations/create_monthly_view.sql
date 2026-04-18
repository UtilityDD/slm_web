-- Update the Monthly Leaderboard View to be more explicit and match frontend expectations
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
    -- Aggregate ONLY the points earned in this specific month/year window
    SUM(qa.score) as points, 
    SUM(qa.penalty) as total_penalties,
    SUM(CASE WHEN qa.quiz_id LIKE 'lesson_bonus%' THEN qa.score ELSE 0 END) as reading_points,
    SUM(CASE WHEN qa.quiz_id NOT LIKE 'lesson_bonus%' THEN qa.score ELSE 0 END) as quiz_points
FROM quiz_attempts qa
JOIN profiles p ON qa.user_id = p.id
GROUP BY 
    qa.user_id, 
    p.full_name, 
    p.avatar_url, 
    p.district, 
    p.training_level, 
    EXTRACT(MONTH FROM qa.created_at), -- Use expressions directly for robustness
    EXTRACT(YEAR FROM qa.created_at)
HAVING SUM(qa.score) > 0;

-- Grant access
GRANT SELECT ON monthly_leaderboard_view TO postgres, anon, authenticated, service_role;
