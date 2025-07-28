# Running Database Migration 002_esl_corrections.sql

This migration creates the missing `user_progress` and `corrections` tables in your Supabase database.

## Migration Contents
- Creates `corrections` table for storing error analysis
- Creates `user_progress` table for tracking user improvement
- Sets up Row Level Security (RLS) policies
- Creates performance indexes
- Adds helper function `update_user_progress`

## Option 1: Supabase Dashboard (Recommended)

1. Open your Supabase project dashboard:
   https://supabase.com/dashboard/project/vokeaqpxhrroaisyaizz/sql/new

2. Copy the entire contents of the migration file:
   `/supabase/migrations/002_esl_corrections.sql`

3. Paste it into the SQL editor

4. Click the "Run" button

5. You should see a success message confirming the tables were created

## Option 2: Using psql (Command Line)

### Prerequisites
- Install PostgreSQL client tools (includes psql):
  - Windows: Download from https://www.postgresql.org/download/windows/
  - Or install via Chocolatey: `choco install postgresql`

### Run Migration
```bash
# Windows Command Prompt or PowerShell
psql "postgresql://postgres:DALMj5NPLNNypsqKpWBnzbK3ymlD2m6MqqHIoyxVNxpBV1oARyVDRyg6DKyfXgX4a@db.vokeaqpxhrroaisyaizz.supabase.co:5432/postgres" -f supabase\migrations\002_esl_corrections.sql

# Or use the batch script (after installing psql)
scripts\run-migration-psql.bat
```

## Option 3: Using Supabase CLI

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Run the migration:
   ```bash
   supabase db push --db-url "postgresql://postgres:DALMj5NPLNNypsqKpWBnzbK3ymlD2m6MqqHIoyxVNxpBV1oARyVDRyg6DKyfXgX4a@db.vokeaqpxhrroaisyaizz.supabase.co:5432/postgres"
   ```

## Verification

After running the migration, verify it was successful:

1. Go to your Supabase Table Editor:
   https://supabase.com/dashboard/project/vokeaqpxhrroaisyaizz/editor

2. You should see two new tables:
   - `corrections`
   - `user_progress`

3. Check that RLS is enabled (shield icon should be active on both tables)

## Troubleshooting

### If you get permission errors:
- Make sure you're using the correct DATABASE_URL from your .env file
- The service role key in the .env file should have sufficient permissions

### If tables already exist:
- The migration will fail if the tables already exist
- You can drop them first (be careful with production data):
  ```sql
  DROP TABLE IF EXISTS public.corrections CASCADE;
  DROP TABLE IF EXISTS public.user_progress CASCADE;
  ```

### Connection issues:
- Check your internet connection
- Verify the DATABASE_URL is correct
- Ensure your IP is not blocked by Supabase (check project settings)