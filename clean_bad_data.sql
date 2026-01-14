-- 1. Count invalid rows before deleting (for your info)
-- Run this block first if you want to see how many there are.
SELECT count(*) as invalid_rows_count FROM quiz_attempts WHERE user_id IS NULL;

-- 2. Delete rows with NO user_id (These are "zombie" records and shouldn't exist)
DELETE FROM quiz_attempts WHERE user_id IS NULL;

-- 3. (Optional) Check for mixed "hourly-challenge" records for valid users
-- This shows if a user has both legacy and new formats
SELECT user_id, quiz_id, score, created_at 
FROM quiz_attempts 
WHERE quiz_id LIKE 'hourly-challenge%' 
ORDER BY created_at DESC 
LIMIT 20;
