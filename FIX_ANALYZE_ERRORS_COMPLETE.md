# Complete Fix for Analyze-Errors Functionality

## 🚨 Critical Issues Found

### 1. **Exposed API Keys in .env File**

Your API keys are exposed in the .env file. These need to be rotated immediately:

- OpenAI API Key
- Supabase Service Role Key
- ElevenLabs API Key

**Action Required:**

1. Rotate all API keys in their respective dashboards
2. Update .env file with new keys
3. Update Vercel environment variables

### 2. **Missing Database Tables**

The `corrections` and `user_progress` tables required for the analyze-errors functionality may not exist in your database.

### 3. **RLS Policies Blocking Inserts**

The current RLS policies prevent users from creating their own correction records.

## 🛠️ Step-by-Step Solution

### Step 1: Rotate API Keys (CRITICAL - Do This First!)

1. **OpenAI:**
   - Go to https://platform.openai.com/api-keys
   - Create a new API key
   - Delete the old key
   - Update OPENAI_API_KEY in .env and Vercel

2. **Supabase Service Role:**
   - Go to your Supabase project settings
   - Generate new service role key
   - Update SUPABASE_SERVICE_ROLE_KEY in .env and Vercel

3. **ElevenLabs:**
   - Go to your ElevenLabs dashboard
   - Generate new API key
   - Update ELEVENLABS_API_KEY in .env and Vercel

### Step 2: Run Database Migrations

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to https://app.supabase.com and select your project
2. Navigate to SQL Editor
3. Run Migration 002 (if tables don't exist):

```sql
-- Copy the entire contents of supabase/migrations/002_esl_corrections.sql
-- and paste it in the SQL Editor, then execute
```

4. Run Migration 003 (to fix RLS policies):

```sql
-- Copy the entire contents of supabase/migrations/003_fix_corrections_rls.sql
-- and paste it in the SQL Editor, then execute
```

#### Option B: Quick Combined Migration

Run this in Supabase SQL Editor to create tables and fix policies in one go:

```sql
-- Create tables if they don't exist
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

CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  total_speaking_time INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  error_counts JSONB DEFAULT '{}',
  improvement_areas TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_corrections_user_id ON public.corrections(user_id);
CREATE INDEX IF NOT EXISTS idx_corrections_session_id ON public.corrections(session_id);
CREATE INDEX IF NOT EXISTS idx_corrections_created_at ON public.corrections(created_at);
CREATE INDEX IF NOT EXISTS idx_corrections_error_types ON public.corrections USING GIN(error_types);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_date ON public.user_progress(date);

-- Enable RLS
ALTER TABLE public.corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "System can create corrections" ON public.corrections;
DROP POLICY IF EXISTS "System can manage progress" ON public.user_progress;

-- Create correct RLS policies
CREATE POLICY IF NOT EXISTS "Users can view own corrections" ON public.corrections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can create own corrections" ON public.corrections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own corrections" ON public.corrections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own progress" ON public.user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can create own progress" ON public.user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own progress" ON public.user_progress
  FOR UPDATE USING (auth.uid() = user_id);
```

### Step 3: Update Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Ensure these variables are set (with your NEW keys):
   - `OPENAI_API_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (optional but recommended)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 4: Verify the Fix

After deployment, test these endpoints:

1. **Check Tables Exist:**

   ```
   https://your-app.vercel.app/api/check-tables
   ```

2. **Check OpenAI Configuration:**

   ```
   https://your-app.vercel.app/api/debug-openai
   ```

3. **Test the Analyze Errors Feature:**
   - Log into your app
   - Start a conversation
   - Speak some text with intentional grammar errors
   - Check if corrections are being saved

### Step 5: Monitor for Issues

Check Vercel Function logs:

1. Go to Vercel Dashboard
2. Click on your project
3. Go to "Functions" tab
4. Click on "analyze-errors"
5. Review logs for any errors

## 🔒 Security Best Practices Going Forward

1. **Never commit .env files with real keys**
   - Use .env.example for templates
   - Add .env to .gitignore

2. **Rotate keys regularly**
   - Set calendar reminders every 90 days
   - Use different keys for dev/staging/production

3. **Use least privilege**
   - Only give APIs the permissions they need
   - Use Supabase anon key for client-side operations

4. **Monitor usage**
   - Set up alerts for unusual API usage
   - Review logs regularly

## 📊 Expected Outcome

After completing these steps:

- ✅ Analyze-errors endpoint will work properly
- ✅ ESL corrections will be saved to database
- ✅ User progress will be tracked
- ✅ API keys will be secure
- ✅ RLS policies will allow proper data access

## 🆘 If Issues Persist

1. Check Vercel function logs for specific errors
2. Verify all environment variables are set correctly
3. Ensure migrations ran successfully
4. Test with the debug endpoints provided

## 📝 Quick Checklist

- [ ] Rotated all exposed API keys
- [ ] Updated .env file with new keys
- [ ] Updated Vercel environment variables
- [ ] Ran migration 002 (create tables)
- [ ] Ran migration 003 (fix RLS policies)
- [ ] Tested analyze-errors functionality
- [ ] Verified no errors in Vercel logs
