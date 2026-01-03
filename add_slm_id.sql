-- Create a sequence for the numeric part of the ID
CREATE SEQUENCE IF NOT EXISTS slm_id_seq START WITH 1;

-- Function to generate the formatted SLM ID (e.g., SLM-0001)
CREATE OR REPLACE FUNCTION generate_slm_id() RETURNS text AS $$
BEGIN
  RETURN 'SLM-' || LPAD(nextval('slm_id_seq')::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Add the slm_id column to the profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS slm_id text UNIQUE;

-- Populate existing records with unique IDs
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM profiles WHERE slm_id IS NULL ORDER BY created_at ASC LOOP
        UPDATE profiles SET slm_id = generate_slm_id() WHERE id = r.id;
    END LOOP;
END $$;

-- Set a default value for new records
ALTER TABLE profiles 
ALTER COLUMN slm_id SET DEFAULT generate_slm_id();

-- Add index for search performance
CREATE INDEX IF NOT EXISTS idx_profiles_slm_id ON profiles(slm_id);

-- Add comment to the column
COMMENT ON COLUMN profiles.slm_id IS 'Human-readable unique ID for linemen (e.g., SLM-0001).';
