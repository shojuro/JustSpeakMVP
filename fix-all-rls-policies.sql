-- Comprehensive RLS Fix for JustSpeak MVP
-- This script fixes RLS policies for all tables to ensure authenticated users can use the app
-- Run this in Supabase SQL Editor

-- ==============================================
-- SESSIONS TABLE
-- ==============================================

-- Enable RLS on sessions table
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON sessions;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON sessions;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON sessions;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON sessions;

-- Create new policies for sessions
CREATE POLICY "Users can view own sessions" ON sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON sessions
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON sessions
    FOR DELETE USING (auth.uid() = user_id);

-- ==============================================
-- MESSAGES TABLE
-- ==============================================

-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages from their sessions" ON messages;
DROP POLICY IF EXISTS "Users can create messages in their sessions" ON messages;
DROP POLICY IF EXISTS "Users can update messages in their sessions" ON messages;
DROP POLICY IF EXISTS "Users can delete messages from their sessions" ON messages;

-- Create new policies for messages
-- Users can view messages if they own the session
CREATE POLICY "Users can view messages from their sessions" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = messages.session_id 
            AND sessions.user_id = auth.uid()
        )
    );

-- Users can create messages if they own the session
CREATE POLICY "Users can create messages in their sessions" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = messages.session_id 
            AND sessions.user_id = auth.uid()
        )
    );

-- Users can update messages if they own the session
CREATE POLICY "Users can update messages in their sessions" ON messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = messages.session_id 
            AND sessions.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = messages.session_id 
            AND sessions.user_id = auth.uid()
        )
    );

-- Users can delete messages if they own the session
CREATE POLICY "Users can delete messages from their sessions" ON messages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = messages.session_id 
            AND sessions.user_id = auth.uid()
        )
    );

-- ==============================================
-- PROFILES TABLE (if exists)
-- ==============================================

-- Check if profiles table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'profiles') THEN
        -- Enable RLS
        EXECUTE 'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY';
        
        -- Drop existing policies
        EXECUTE 'DROP POLICY IF EXISTS "Users can view own profile" ON profiles';
        EXECUTE 'DROP POLICY IF EXISTS "Users can update own profile" ON profiles';
        EXECUTE 'DROP POLICY IF EXISTS "Users can insert own profile" ON profiles';
        
        -- Create new policies
        EXECUTE 'CREATE POLICY "Users can view own profile" ON profiles
            FOR SELECT USING (auth.uid() = id)';
            
        EXECUTE 'CREATE POLICY "Users can insert own profile" ON profiles
            FOR INSERT WITH CHECK (auth.uid() = id)';
            
        EXECUTE 'CREATE POLICY "Users can update own profile" ON profiles
            FOR UPDATE USING (auth.uid() = id)
            WITH CHECK (auth.uid() = id)';
    END IF;
END $$;

-- ==============================================
-- CORRECTIONS TABLE (if exists)
-- ==============================================

-- Check if corrections table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'corrections') THEN
        -- Enable RLS
        EXECUTE 'ALTER TABLE corrections ENABLE ROW LEVEL SECURITY';
        
        -- Drop existing policies
        EXECUTE 'DROP POLICY IF EXISTS "Users can view corrections from their messages" ON corrections';
        EXECUTE 'DROP POLICY IF EXISTS "Users can create corrections for their messages" ON corrections';
        
        -- Create new policies
        EXECUTE 'CREATE POLICY "Users can view corrections from their messages" ON corrections
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM messages 
                    JOIN sessions ON sessions.id = messages.session_id
                    WHERE messages.id = corrections.message_id 
                    AND sessions.user_id = auth.uid()
                )
            )';
            
        EXECUTE 'CREATE POLICY "Users can create corrections for their messages" ON corrections
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM messages 
                    JOIN sessions ON sessions.id = messages.session_id
                    WHERE messages.id = corrections.message_id 
                    AND sessions.user_id = auth.uid()
                )
            )';
    END IF;
END $$;

-- ==============================================
-- USER_PROGRESS TABLE (if exists)
-- ==============================================

-- Check if user_progress table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_progress') THEN
        -- Enable RLS
        EXECUTE 'ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY';
        
        -- Drop existing policies
        EXECUTE 'DROP POLICY IF EXISTS "Users can view own progress" ON user_progress';
        EXECUTE 'DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress';
        EXECUTE 'DROP POLICY IF EXISTS "Users can update own progress" ON user_progress';
        
        -- Create new policies
        EXECUTE 'CREATE POLICY "Users can view own progress" ON user_progress
            FOR SELECT USING (auth.uid() = user_id)';
            
        EXECUTE 'CREATE POLICY "Users can insert own progress" ON user_progress
            FOR INSERT WITH CHECK (auth.uid() = user_id)';
            
        EXECUTE 'CREATE POLICY "Users can update own progress" ON user_progress
            FOR UPDATE USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id)';
    END IF;
END $$;

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Verify RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('sessions', 'messages', 'profiles', 'corrections', 'user_progress')
ORDER BY tablename;

-- Verify policies exist
SELECT 
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('sessions', 'messages', 'profiles', 'corrections', 'user_progress')
ORDER BY tablename, policyname;

-- Test auth.uid() function
SELECT auth.uid() as current_user_id;

-- Final status
SELECT 'All RLS policies have been successfully updated!' as status;