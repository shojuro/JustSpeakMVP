# Production Deployment Fix Guide

## Issues Found
1. Missing `OPENAI_API_KEY` in production environment
2. Database migrations not run (missing `user_progress` and `corrections` tables)

## Fix Instructions

### Step 1: Add OpenAI API Key to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `just-speak-mvp` project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - Key: `OPENAI_API_KEY`
   - Value: Your OpenAI API key (starts with `sk-`)
   - Environment: ✅ Production
5. Click **Save**

### Step 2: Run Database Migration

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your production project
3. Navigate to **SQL Editor**
4. Copy and paste the entire contents of `run-production-migration.sql`
5. Click **Run** to execute the migration

### Step 3: Redeploy Application

1. In Vercel, go to your project
2. Navigate to **Deployments**
3. Click the three dots on your latest deployment
4. Select **Redeploy**
5. Wait for deployment to complete

### Step 4: Verify Fix

Test the following:
1. Sign up/Sign in works
2. Speech recording captures audio
3. AI responds to your messages
4. Dashboard shows speaking time
5. No 404 errors in console

## What This Fixes

- ✅ Speech-to-text will work (OpenAI Whisper API)
- ✅ Dashboard will load without errors
- ✅ ESL error corrections will be stored
- ✅ Progress tracking will function

## Additional Notes

- The app uses OpenAI's Whisper API for speech-to-text (not Google Cloud)
- All sensitive data is protected by Row Level Security (RLS)
- Users can only access their own data