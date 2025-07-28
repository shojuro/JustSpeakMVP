require('dotenv').config()

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  // Extract project ref from URL
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  if (!projectRef) {
    console.error('Could not extract project ref from Supabase URL')
    process.exit(1)
  }

  console.log(`Running migration for project: ${projectRef}`)

  // SQL to execute
  const migrationSQL = `
-- Create corrections table to store error analysis
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

-- Create user_progress table for tracking improvement
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_corrections_user_id_created_at 
ON public.corrections(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_corrections_session_id 
ON public.corrections(session_id);

CREATE INDEX IF NOT EXISTS idx_corrections_error_types 
ON public.corrections USING GIN(error_types);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id_date 
ON public.user_progress(user_id, date DESC);

-- Enable RLS
ALTER TABLE public.corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for corrections
CREATE POLICY "Users can view own corrections" ON public.corrections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own corrections" ON public.corrections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own corrections" ON public.corrections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own corrections" ON public.corrections
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_progress
CREATE POLICY "Users can view own progress" ON public.user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON public.user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON public.user_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress" ON public.user_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DROP TRIGGER IF EXISTS update_user_progress_updated_at ON public.user_progress;
CREATE TRIGGER update_user_progress_updated_at 
  BEFORE UPDATE ON public.user_progress 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();
  `

  try {
    // Use fetch to call Supabase REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
      },
      body: JSON.stringify({ query: migrationSQL })
    })

    if (!response.ok) {
      // If query RPC doesn't exist, show manual instructions
      console.log('\n❌ Could not run migration automatically.')
      console.log('\n📋 Please run the migration manually:')
      console.log('\n1. Go to your Supabase SQL Editor:')
      console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`)
      console.log('\n2. Copy and paste the SQL from:')
      console.log('   supabase/migrations/002_esl_corrections.sql')
      console.log('\n3. Click "Run" to execute the migration')
      return
    }

    console.log('✅ Migration completed successfully!')
    
    // Verify tables exist
    const tablesResponse = await fetch(`${supabaseUrl}/rest/v1/corrections?select=count&limit=0`, {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
      }
    })

    const progressResponse = await fetch(`${supabaseUrl}/rest/v1/user_progress?select=count&limit=0`, {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
      }
    })

    if (tablesResponse.ok && progressResponse.ok) {
      console.log('\n✅ Tables verified:')
      console.log('  - corrections table exists')
      console.log('  - user_progress table exists')
    }

  } catch (error) {
    console.error('Error:', error.message)
    console.log('\n📋 Please run the migration manually in Supabase Dashboard')
  }
}

runMigration()