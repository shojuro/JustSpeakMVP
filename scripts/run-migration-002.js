#!/usr/bin/env node

/**
 * Script to run migration 002_esl_corrections.sql
 * Creates user_progress and corrections tables in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Verify required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing required environment variables:');
  if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseServiceRoleKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🔧 Connecting to Supabase...');
console.log(`   URL: ${supabaseUrl}`);

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '002_esl_corrections.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`✅ Migration file loaded (${migrationSQL.length} characters)`);

    // Execute the migration
    console.log('🚀 Running migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If the RPC function doesn't exist, try running the SQL directly
      console.log('⚠️  exec_sql RPC not available, trying alternative method...');
      
      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      console.log(`📋 Found ${statements.length} SQL statements to execute`);

      // Since we can't execute raw SQL directly with the JS client,
      // we'll provide instructions for manual execution
      console.log('\n⚠️  Direct SQL execution is not available through the Supabase JS client.');
      console.log('Please run the migration using one of these methods:\n');
      
      console.log('Option 1: Use Supabase Dashboard');
      console.log('1. Go to: https://supabase.com/dashboard/project/vokeaqpxhrroaisyaizz/sql/new');
      console.log('2. Copy and paste the contents of: supabase/migrations/002_esl_corrections.sql');
      console.log('3. Click "Run"\n');
      
      console.log('Option 2: Use Supabase CLI');
      console.log('1. Install Supabase CLI: npm install -g supabase');
      console.log('2. Run: supabase db push --db-url "' + process.env.DATABASE_URL + '"');
      console.log('   Or: supabase migration up --db-url "' + process.env.DATABASE_URL + '"\n');
      
      console.log('Option 3: Use psql directly');
      console.log('psql "' + process.env.DATABASE_URL + '" -f supabase/migrations/002_esl_corrections.sql\n');
      
      return;
    }

    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Created tables:');
    console.log('  - corrections (for storing error analysis)');
    console.log('  - user_progress (for tracking improvement)');
    console.log('\n🔒 Row Level Security policies applied');
    console.log('🏗️  Indexes created for performance');
    console.log('⚡ Helper function update_user_progress created');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
runMigration();