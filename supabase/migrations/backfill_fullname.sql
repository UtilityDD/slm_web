-- Backfill full_name in quiz_attempts from profiles table
UPDATE quiz_attempts qa
SET full_name = p.full_name
FROM profiles p
WHERE qa.user_id = p.id 
  AND (qa.full_name IS NULL OR qa.full_name = '');

-- Verify the update
-- SELECT count(*) as updated_rows FROM quiz_attempts WHERE full_name IS NOT NULL;
