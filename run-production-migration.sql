-- Run this SQL in your Supabase SQL Editor (production database)
-- This creates the missing tables for ESL error correction feature

-- Create corrections table for storing ESL error corrections
CREATE TABLE IF NOT EXISTS public.corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  original_text TEXT NOT NULL,
  corrected_text TEXT NOT NULL,
  error_types TEXT[] NOT NULL,
  error_count INTEGER NOT NULL DEFAULT 0,
  analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_progress table for tracking daily progress
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_messages INTEGER NOT NULL DEFAULT 0,
  total_speaking_time INTEGER NOT NULL DEFAULT 0,
  total_corrections INTEGER NOT NULL DEFAULT 0,
  error_summary JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_corrections_user_id_created_at 
ON public.corrections(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_corrections_session_id 
ON public.corrections(session_id);

CREATE INDEX IF NOT EXISTS idx_corrections_error_types 
ON public.corrections USING GIN(error_types);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id_date 
ON public.user_progress(user_id, date DESC);

-- Enable Row Level Security
ALTER TABLE public.corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for corrections table
CREATE POLICY "Users can view own corrections" ON public.corrections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own corrections" ON public.corrections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own corrections" ON public.corrections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own corrections" ON public.corrections
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_progress table
CREATE POLICY "Users can view own progress" ON public.user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON public.user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON public.user_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress" ON public.user_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_progress_updated_at 
  BEFORE UPDATE ON public.user_progress 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();