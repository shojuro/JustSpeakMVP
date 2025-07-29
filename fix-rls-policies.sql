-- Fix RLS Policies for JustSpeak MVP Sessions Table
-- This script fixes the critical issue where authenticated users cannot create sessions
-- Run this in Supabase SQL Editor

-- Step 1: Check current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'sessions';

-- Step 2: Check existing policies
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

-- Step 3: Enable RLS if not already enabled
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON sessions;

-- Legacy policy names that might exist
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON sessions;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON sessions;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON sessions;

-- Step 5: Create comprehensive RLS policies
-- Policy for SELECT - users can only view their own sessions
CREATE POLICY "Users can view own sessions" ON sessions
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Policy for INSERT - users can only create sessions for themselves
CREATE POLICY "Users can create own sessions" ON sessions
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE - users can only update their own sessions
CREATE POLICY "Users can update own sessions" ON sessions
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy for DELETE - users can only delete their own sessions
CREATE POLICY "Users can delete own sessions" ON sessions
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Step 6: Verify the new policies
SELECT 
    tablename,
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'sessions'
ORDER BY policyname;

-- Step 7: Test auth.uid() function (should return current user's ID or NULL if not authenticated)
SELECT auth.uid() as current_user_id;

-- Step 8: Clean up any orphaned sessions without a user_id (optional)
-- Uncomment the next line only if you want to delete sessions with NULL user_id
-- DELETE FROM sessions WHERE user_id IS NULL;

-- Step 9: Check session count for the test user
SELECT 
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN ended_at IS NULL THEN 1 END) as active_sessions
FROM sessions
WHERE user_id = '044a4734-6ff1-465e-879a-544859605cfa';

-- Success message
SELECT 'RLS policies have been successfully updated!' as status;