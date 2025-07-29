# Critical Auth Fix Instructions

## Problem

Authenticated users cannot use the chat feature because Supabase RLS (Row Level Security) policies are preventing session creation.

## Solution

Run the SQL scripts provided to fix the RLS policies.

## Steps to Fix

### 1. Get Your Supabase Project Reference

```bash
# Run this command to get your project reference
node scripts/simple-migration.js
```

This will show you your project reference and direct link to the SQL editor.

### 2. Run the RLS Fix Script

1. Open your Supabase SQL Editor (the link from step 1)
2. Copy the entire contents of one of these files:
   - `fix-rls-policies.sql` - Fixes only the sessions table (minimum required)
   - `fix-all-rls-policies.sql` - Comprehensive fix for all tables (recommended)
3. Paste into the SQL editor
4. Click "Run" to execute

### 3. Verify the Fix

After running the script:

1. Clear your browser cache:

   ```javascript
   // In browser console:
   localStorage.clear()
   sessionStorage.clear()
   ```

2. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

3. Sign in again at `/auth/login`

4. Go to `/chat`

5. Check the debug panel - you should now see:
   - Valid Session ID (not "none")
   - Valid User ID

6. Try speaking - you should get AI responses

## What the Fix Does

The scripts:

1. Enable Row Level Security on tables
2. Create proper policies that allow users to:
   - Create their own sessions
   - View their own sessions
   - Update their own sessions
   - Create and view messages in their sessions
   - Access their corrections and progress

## Alternative Manual Steps

If you prefer to run the fixes step by step:

1. **Enable RLS on sessions table:**

   ```sql
   ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
   ```

2. **Create the essential policies:**

   ```sql
   CREATE POLICY "Users can create own sessions" ON sessions
       FOR INSERT WITH CHECK (auth.uid() = user_id);

   CREATE POLICY "Users can view own sessions" ON sessions
       FOR SELECT USING (auth.uid() = user_id);

   CREATE POLICY "Users can update own sessions" ON sessions
       FOR UPDATE USING (auth.uid() = user_id);
   ```

## Troubleshooting

If the fix doesn't work:

1. **Check auth.uid() is working:**

   ```sql
   SELECT auth.uid();
   ```

   This should return your user ID when logged in.

2. **Check for duplicate sessions:**

   ```sql
   SELECT * FROM sessions
   WHERE user_id = 'your-user-id'
   ORDER BY created_at DESC;
   ```

3. **Manually create a test session:**
   ```sql
   INSERT INTO sessions (user_id)
   VALUES ('your-user-id')
   RETURNING id;
   ```

## Support

If you still have issues after running these fixes:

1. Check `/auth/debug` page for detailed auth state
2. Check browser console for errors
3. Check Supabase logs for RLS policy violations
