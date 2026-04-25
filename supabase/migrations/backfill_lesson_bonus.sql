-- ============================================================
-- SAFE BACKFILL: lesson_bonus entries into quiz_attempts
-- ============================================================
-- This script is 100% NON-DESTRUCTIVE:
--   - Only INSERTs new rows, never UPDATEs or DELETEs anything
--   - ON CONFLICT DO NOTHING prevents any duplicates
--   - profiles table is NOT modified
--   - Existing quiz_attempts rows are NOT modified
--
-- Each completed lesson gets one row: lesson_bonus_X.X
-- Timestamp = user's profile created_at (join date as approximation)
-- Score = 20 points per lesson (matches award_training_points RPC)
-- ============================================================

-- Step 1: Preview what will be inserted (run this first)
SELECT 
    p.full_name,
    'lesson_bonus_' || lesson_id AS quiz_id,
    20 AS score,
    p.created_at AS approximate_date,
    CASE 
        WHEN qa.quiz_id IS NOT NULL THEN 'ALREADY EXISTS - SKIP'
        ELSE 'WILL INSERT'
    END AS action
FROM profiles p,
LATERAL (
    SELECT value::text AS lesson_id
    FROM jsonb_array_elements_text(
        CASE 
            WHEN jsonb_typeof(p.completed_lessons::jsonb) = 'array' 
            THEN p.completed_lessons::jsonb
            ELSE '[]'::jsonb
        END
    )
    WHERE value::text ~ '^\d+\.\d+$'  -- valid lesson IDs only: "1.1", "2.3" etc
) lessons
LEFT JOIN quiz_attempts qa 
    ON qa.user_id = p.id 
    AND qa.quiz_id = 'lesson_bonus_' || lesson_id
WHERE p.completed_lessons IS NOT NULL
ORDER BY p.full_name, lesson_id;

-- ============================================================
-- Step 2: Run the actual backfill (after reviewing Step 1)
-- ============================================================

INSERT INTO quiz_attempts (user_id, quiz_id, score, penalty, created_at)
SELECT 
    p.id AS user_id,
    'lesson_bonus_' || lesson_id AS quiz_id,
    20 AS score,
    0 AS penalty,
    p.created_at AS created_at  -- use join date as approximate timestamp
FROM profiles p,
LATERAL (
    SELECT value::text AS lesson_id
    FROM jsonb_array_elements_text(
        CASE 
            WHEN jsonb_typeof(p.completed_lessons::jsonb) = 'array' 
            THEN p.completed_lessons::jsonb
            ELSE '[]'::jsonb
        END
    )
    WHERE value::text ~ '^\d+\.\d+$'  -- valid lesson IDs only
) lessons
WHERE p.completed_lessons IS NOT NULL
ON CONFLICT (user_id, quiz_id) DO NOTHING;

-- Step 3: Verify the result
SELECT 
    'Total lesson_bonus entries after backfill' AS description,
    COUNT(*) AS count
FROM quiz_attempts
WHERE quiz_id LIKE 'lesson_bonus_%';
