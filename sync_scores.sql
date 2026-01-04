-- Run this script to FORCE SYNC your profile scores with the actual attempt history
-- Source of Truth: 'quiz_attempts' table.

WITH calculated_scores AS (
    SELECT 
        user_id,
        -- Total Score
        COALESCE(SUM(score), 0) as total_score,
        -- Total Penalties
        COALESCE(SUM(penalty), 0) as total_penalty,
        -- Reading Points (Lesson Bonuses)
        COALESCE(SUM(CASE WHEN quiz_id LIKE 'lesson_bonus%' THEN score ELSE 0 END), 0) as reading,
        -- Quiz Points (Everything Else)
        COALESCE(SUM(CASE WHEN quiz_id NOT LIKE 'lesson_bonus%' THEN score ELSE 0 END), 0) as quiz
    FROM quiz_attempts
    GROUP BY user_id
)
UPDATE profiles p
SET 
    points = c.total_score,
    total_penalties = c.total_penalty,
    reading_points = c.reading,
    quiz_points = c.quiz
FROM calculated_scores c
WHERE p.id = c.user_id;
