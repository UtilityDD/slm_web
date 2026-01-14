-- Add full_name column to quiz_attempts table
-- Note: PostgreSQL adds columns to the end of the table by default. 
-- Reordering requires recreating the table, which is risky for existing data.
ALTER TABLE quiz_attempts 
ADD COLUMN IF NOT EXISTS full_name text;

-- Optional: Backfill existing attempts from profiles (if needed)
-- UPDATE quiz_attempts qa
-- SET full_name = p.full_name
-- FROM profiles p
-- WHERE qa.user_id = p.id AND qa.full_name IS NULL;
