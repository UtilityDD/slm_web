-- Check schema of profiles table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';

-- Check RLS
SELECT tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';
