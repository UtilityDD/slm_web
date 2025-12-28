-- Add supervisor_id column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_supervisor_id ON profiles(supervisor_id);

-- Add comment to the column
COMMENT ON COLUMN profiles.supervisor_id IS 'References the ID of the Safety Mitra or Admin supervising this lineman.';
