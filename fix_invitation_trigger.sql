-- ULTRA-ROBUST fix for invitation/signup trigger
-- Run this in your Supabase SQL Editor

-- 1. Ensure sensible defaults for EVERY POSSIBLE mandatory column
-- This prevents the trigger from failing if any of these are NOT NULL
ALTER TABLE public.profiles 
  ALTER COLUMN role SET DEFAULT 'lineman',
  ALTER COLUMN points SET DEFAULT 0,
  ALTER COLUMN training_level SET DEFAULT 1,
  ALTER COLUMN total_penalties SET DEFAULT 0,
  ALTER COLUMN full_name SET DEFAULT '',
  ALTER COLUMN avatar_url SET DEFAULT '',
  ALTER COLUMN current_session_id SET DEFAULT '',
  ALTER COLUMN completed_lessons SET DEFAULT '[]'::jsonb;

-- 2. Update role constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'safety mitra', 'lineman'));

-- 3. Robust trigger function with error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name, points, training_level, total_penalties)
  VALUES (
    new.id, 
    new.email, 
    'lineman',
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    0,
    1,
    0
  )
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    role = COALESCE(profiles.role, EXCLUDED.role);
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- This will log the error to Supabase Postgres logs but still allow us to see what happened
  RAISE WARNING 'Error in handle_new_user for user %: %', new.id, SQLERRM;
  RETURN new; -- Still return new to allow auth.users insert, profile can be fixed later
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-bind trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
