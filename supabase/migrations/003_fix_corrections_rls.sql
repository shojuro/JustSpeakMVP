-- Fix RLS policies for corrections and user_progress tables
-- This migration updates the policies to allow users to create their own records

-- Drop existing INSERT policy for corrections
DROP POLICY IF EXISTS "System can create corrections" ON public.corrections;

-- Create new INSERT policy that allows users to create their own corrections
CREATE POLICY "Users can create own corrections" ON public.corrections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Also allow users to update their own corrections if needed in future
CREATE POLICY "Users can update own corrections" ON public.corrections
  FOR UPDATE USING (auth.uid() = user_id);

-- Fix user_progress policies to be more specific
DROP POLICY IF EXISTS "System can manage progress" ON public.user_progress;

-- Allow users to insert their own progress records
CREATE POLICY "Users can create own progress" ON public.user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own progress records
CREATE POLICY "Users can update own progress" ON public.user_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Add helpful comment
COMMENT ON TABLE public.corrections IS 'Stores grammar corrections for user messages. Users can only access their own corrections.';
COMMENT ON TABLE public.user_progress IS 'Tracks daily user progress and error statistics. Users can only access their own progress data.';