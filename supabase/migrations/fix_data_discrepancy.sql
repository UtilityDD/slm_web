-- Fix missing reading points by backfilling from completed_lessons history
-- This script ensures: Reading Points = Completed Lessons * 20

DO $$
DECLARE
    u record;
    lesson_id text;
    bonus_id text;
    lessons jsonb;
BEGIN
    -- Iterate through all users who have completed at least one lesson
    FOR u IN SELECT id, completed_lessons FROM profiles WHERE completed_lessons IS NOT NULL AND jsonb_array_length(completed_lessons) > 0 LOOP
        
        lessons := u.completed_lessons;
        
        -- Iterate through each lesson ID in the user's history
        FOR lesson_id IN SELECT jsonb_array_elements_text(lessons) LOOP
            bonus_id := 'lesson_bonus_' || lesson_id;
            
            -- Check if a reward attempt already exists for this lesson
            IF NOT EXISTS (SELECT 1 FROM quiz_attempts WHERE user_id = u.id AND quiz_id = bonus_id) THEN
                
                -- If missing, INSERT the backdated reward (20 points)
                INSERT INTO quiz_attempts (user_id, quiz_id, score, penalty, created_at)
                VALUES (u.id, bonus_id, 20, 0, NOW());
                
                RAISE NOTICE 'Backfilled points for User % Lesson %', u.id, lesson_id;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- After backfill, force-recalculate all profile totals to ensure 100% accuracy
WITH calculated_scores AS (
    SELECT 
        user_id,
        COALESCE(SUM(score), 0) as total_score,
        COALESCE(SUM(penalty), 0) as total_penalty,
        COALESCE(SUM(CASE WHEN quiz_id LIKE 'lesson_bonus%' THEN score ELSE 0 END), 0) as reading,
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
