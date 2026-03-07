-- Enable RLS (just in case)
ALTER TABLE IF EXISTS user_tools ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own tools" ON user_tools;
DROP POLICY IF EXISTS "Users can insert their own tools" ON user_tools;
DROP POLICY IF EXISTS "Users can update their own tools" ON user_tools;
DROP POLICY IF EXISTS "Users can delete their own tools" ON user_tools;

-- 1. Policy for SELECT: Users can only see their own rows
CREATE POLICY "Users can view their own tools" ON user_tools
    FOR SELECT
    USING (auth.uid() = user_id);

-- 2. Policy for INSERT: Users can only insert rows for themselves
CREATE POLICY "Users can insert their own tools" ON user_tools
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 3. Policy for UPDATE: Users can only update their own rows
CREATE POLICY "Users can update their own tools" ON user_tools
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Policy for DELETE: Users can only delete their own rows
CREATE POLICY "Users can delete their own tools" ON user_tools
    FOR DELETE
    USING (auth.uid() = user_id);

-- Grant permissions to authenticated role (PostgREST uses this)
GRANT ALL ON user_tools TO authenticated;
GRANT ALL ON user_tools TO service_role;

-- Reload schema cache to reflect changes immediately
NOTIFY pgrst, 'reload schema';
