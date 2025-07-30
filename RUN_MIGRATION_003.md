# Run Migration 003 - Fix Corrections RLS

## Important: Check if Migration 002 Was Run First!

Before running migration 003, you must ensure that migration 002 (which creates the corrections and user_progress tables) has been run.

### Check if tables exist:

1. Go to Supabase Dashboard
2. Navigate to Table Editor
3. Check if these tables exist:
   - `corrections`
   - `user_progress`

If they don't exist, run migration 002 first!

## Running Migration 002 (if needed)

### Option 1: Supabase Dashboard
1. Go to SQL Editor in Supabase Dashboard
2. Copy contents of `supabase/migrations/002_esl_corrections.sql`
3. Paste and run

### Option 2: Supabase CLI
```bash
supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

## Running Migration 003

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the contents of `supabase/migrations/003_fix_corrections_rls.sql`
5. Click "Run"

### Option 2: Using Supabase CLI

```bash
# First, link your project
supabase link --project-ref [YOUR-PROJECT-REF]

# Then push the migration
supabase db push
```

### Option 3: Direct PostgreSQL Connection

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f supabase/migrations/003_fix_corrections_rls.sql
```

## Verify Migration Success

After running the migration, verify it worked:

1. Go to Authentication → Policies in Supabase Dashboard
2. Check the `corrections` table has:
   - "Users can view own corrections"
   - "Users can create own corrections"
   - "Users can update own corrections"
3. Check the `user_progress` table has:
   - "Users can view own progress"
   - "Users can create own progress"
   - "Users can update own progress"

## Note on Service Role Fix

The API has been updated to use the service role key for database operations, which bypasses RLS entirely. This means the app will work even without running this migration, but running it ensures proper security policies are in place.