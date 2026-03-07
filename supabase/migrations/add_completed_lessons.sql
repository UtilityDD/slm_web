-- Add completed_lessons column to profiles table to store reading progress
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS completed_lessons JSONB DEFAULT '[]'::jsonb;

-- Comment on column
COMMENT ON COLUMN profiles.completed_lessons IS 'Array of completed lesson IDs (e.g. ["1.1", "1.2"])';
