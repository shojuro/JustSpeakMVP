-- Check current RLS policies on sessions table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'sessions'
ORDER BY policyname;

-- Check if RLS is enabled on sessions table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'sessions';

-- Check the sessions table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'sessions'
ORDER BY ordinal_position;

-- Count sessions by user
SELECT 
    user_id,
    COUNT(*) as session_count,
    COUNT(CASE WHEN ended_at IS NULL THEN 1 END) as active_sessions
FROM sessions
GROUP BY user_id
ORDER BY session_count DESC;

-- If RLS is not enabled or policies are missing, here's the fix:
/*
-- Enable RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;

-- Create policies
CREATE POLICY "Users can view own sessions" ON sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON sessions
    FOR UPDATE USING (auth.uid() = user_id);
*/