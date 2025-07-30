# Final Debug Steps for Analyze-Errors Issue

## What We've Done

1. Added service role client with fallback to regular client
2. Created endpoints to help debug the issue

## Debug Steps After Deployment (1-2 minutes)

### 1. Check if Tables Exist

Visit: https://just-speak-mvp-7uhu.vercel.app/api/check-tables

This will show if the `corrections` and `user_progress` tables exist in your database.

### 2. Check OpenAI Configuration

Visit: https://just-speak-mvp-7uhu.vercel.app/api/debug-openai

This will show if OpenAI API key is configured.

### 3. Check Vercel Function Logs

1. Go to Vercel dashboard
2. Click on your project
3. Go to "Functions" tab
4. Click on "analyze-errors" function
5. Check the logs for detailed error messages

## Most Likely Issues

### Issue 1: Tables Don't Exist

If the check-tables endpoint shows the tables don't exist, you need to run migration 002:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/migrations/002_esl_corrections.sql`
3. Run it in SQL Editor

### Issue 2: RLS Policies Blocking Inserts

If tables exist but inserts are failing:

1. Option A: Add SUPABASE_SERVICE_ROLE_KEY to Vercel environment variables
2. Option B: Run migration 003 to fix RLS policies

### Issue 3: OpenAI Not Configured

If debug-openai shows the API key is not configured:

- Add OPENAI_API_KEY to Vercel environment variables

## Quick Fix for RLS (if needed)

If you just want it to work immediately, run this in Supabase SQL Editor:

```sql
-- Temporarily disable RLS (NOT recommended for production)
ALTER TABLE public.corrections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress DISABLE ROW LEVEL SECURITY;
```

Or better, run the proper fix:

```sql
-- Allow users to insert their own records
DROP POLICY IF EXISTS "System can create corrections" ON public.corrections;
CREATE POLICY "Users can create own corrections" ON public.corrections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage progress" ON public.user_progress;
CREATE POLICY "Users can create own progress" ON public.user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.user_progress
  FOR UPDATE USING (auth.uid() = user_id);
```

## Next Steps

1. Wait for deployment to complete
2. Check the debug endpoints
3. Based on results, either:
   - Run missing migrations
   - Add missing environment variables
   - Fix RLS policies
