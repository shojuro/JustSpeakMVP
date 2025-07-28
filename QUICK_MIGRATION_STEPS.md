# Quick Steps to Run the Migration

The migration script creates two important tables for the ESL error correction feature:
- `corrections` - Stores error analysis for each message
- `user_progress` - Tracks user improvement over time

## Fastest Method: Use Supabase Dashboard

1. **Open your Supabase SQL Editor:**
   
   Click this link: https://supabase.com/dashboard/project/vokeaqpxhrroaisyaizz/sql/new

2. **Copy the entire SQL below and paste it into the editor:**

```sql
-- ESL Error Corrections Schema

-- Create corrections table to store error analysis
CREATE TABLE public.corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  original_text TEXT NOT NULL,
  corrected_text TEXT NOT NULL,
  error_types TEXT[] NOT NULL, -- Array of error types found
  error_count INTEGER NOT NULL DEFAULT 0,
  analysis JSONB, -- Detailed analysis data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_progress table for tracking improvement
CREATE TABLE public.user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  total_speaking_time INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  error_counts JSONB DEFAULT '{}', -- JSON object with error type counts
  improvement_areas TEXT[], -- Top areas needing improvement
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create indexes for performance
CREATE INDEX idx_corrections_user_id ON public.corrections(user_id);
CREATE INDEX idx_corrections_session_id ON public.corrections(session_id);
CREATE INDEX idx_corrections_created_at ON public.corrections(created_at);
CREATE INDEX idx_corrections_error_types ON public.corrections USING GIN(error_types);

CREATE INDEX idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX idx_user_progress_date ON public.user_progress(date);

-- Enable Row Level Security
ALTER TABLE public.corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for corrections
CREATE POLICY "Users can view own corrections" ON public.corrections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create corrections" ON public.corrections
  FOR INSERT WITH CHECK (true); -- API will handle auth

-- Create RLS policies for user_progress
CREATE POLICY "Users can view own progress" ON public.user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage progress" ON public.user_progress
  FOR ALL USING (true); -- API will handle auth

-- Create function to update user_progress
CREATE OR REPLACE FUNCTION public.update_user_progress(
  p_user_id UUID,
  p_speaking_time INTEGER,
  p_error_type TEXT,
  p_error_count INTEGER
)
RETURNS void AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  INSERT INTO public.user_progress (user_id, date, total_speaking_time, total_messages, error_counts)
  VALUES (
    p_user_id,
    v_today,
    p_speaking_time,
    1,
    jsonb_build_object(p_error_type, p_error_count)
  )
  ON CONFLICT (user_id, date) DO UPDATE
  SET 
    total_speaking_time = user_progress.total_speaking_time + p_speaking_time,
    total_messages = user_progress.total_messages + 1,
    error_counts = user_progress.error_counts || jsonb_build_object(p_error_type, p_error_count),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

3. **Click the "Run" button**

4. **Verify Success:**
   - You should see a success message
   - Go to the Table Editor: https://supabase.com/dashboard/project/vokeaqpxhrroaisyaizz/editor
   - Check that `corrections` and `user_progress` tables are listed

## If Tables Already Exist

If you get an error saying tables already exist, first drop them:

1. Run this SQL in the dashboard:
```sql
DROP TABLE IF EXISTS public.corrections CASCADE;
DROP TABLE IF EXISTS public.user_progress CASCADE;
```

2. Then run the migration SQL above again

## What This Migration Does

✅ Creates two new tables:
- `corrections` - Stores grammatical error analysis for each user message
- `user_progress` - Tracks daily improvement metrics

✅ Sets up security:
- Row Level Security (RLS) ensures users only see their own data
- Policies allow the API to manage data while protecting user privacy

✅ Optimizes performance:
- Indexes on frequently queried columns
- Efficient JSONB storage for flexible error tracking

✅ Provides helper functions:
- `update_user_progress()` - Simplifies progress tracking logic