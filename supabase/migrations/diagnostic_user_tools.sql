-- DIAGNOSTIC SCRIPT: RUN THIS TO TROUBLESHOOT 401 ERROR
-- This will temporarily lower security to see if the error persists.

-- 1. Try to disable RLS temporarily
ALTER TABLE IF EXISTS user_tools DISABLE ROW LEVEL SECURITY;

-- 2. Grant ALL permissions to both anon and authenticated for testing
GRANT ALL ON user_tools TO anon;
GRANT ALL ON user_tools TO authenticated;
GRANT ALL ON user_tools TO service_role;

-- 3. Ensure the schema itself is accessible
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 4. Flush everything
NOTIFY pgrst, 'reload schema';

-- AFTER RUNNING THIS: 
-- 1. Try to save tools in the browser.
-- 2. If it WORKS, then RLS was the problem.
-- 3. If it STILL FAILS (401), then the issue is NOT RLS, 
--    and might be related to the Supabase client or a different table configuration.
