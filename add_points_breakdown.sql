-- Add breakdown columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS reading_points int DEFAULT 0,
ADD COLUMN IF NOT EXISTS quiz_points int DEFAULT 0;

-- Backfill data based on quiz_id patterns
WITH breakdown AS (
    SELECT 
        user_id,
        -- Reading Points: lesson_bonus_% (20 points per lesson)
        COALESCE(SUM(CASE WHEN quiz_id LIKE 'lesson_bonus%' THEN score ELSE 0 END), 0) as reading,
        -- Quiz Points: Everything else (Chapter quizzes, Hourly challenges, etc.)
        COALESCE(SUM(CASE WHEN quiz_id NOT LIKE 'lesson_bonus%' THEN score ELSE 0 END), 0) as quiz
    FROM quiz_attempts
    GROUP BY user_id
)
UPDATE profiles p
SET 
    reading_points = b.reading,
    quiz_points = b.quiz
FROM breakdown b
WHERE p.id = b.user_id;
