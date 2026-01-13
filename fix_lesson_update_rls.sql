
-- Fix RLS policies to allow users to update their own training progress (completed_lessons, etc.)

-- 1. Enable RLS on profiles (just in case)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop potential conflicting or strict policies for UPDATE
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own training progress" ON profiles;

-- 3. Create a permissive UPDATE policy for the user's own row
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 4. Ensure INSERT is also allowed (if they don't have a profile yet - strictly speaking handled by trigger, but for safety)
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- 5. Ensure SELECT is allowed (usually is, but good to reaffirm)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- We usually want public view for leaderboard, but strict edit.
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

-- Final check
SELECT 'RLS Policies Updated Successfully' as status;
