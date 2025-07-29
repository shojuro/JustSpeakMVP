const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.log('URL:', supabaseUrl ? 'Found' : 'Missing')
  console.log('Service Key:', supabaseServiceKey ? 'Found' : 'Missing')
  process.exit(1)
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function runMigration() {
  console.log('Testing Supabase connection...')

  // Test connection by checking existing tables
  const { data: tables, error: tablesError } = await supabase
    .from('sessions')
    .select('count')
    .limit(0)

  if (tablesError) {
    console.log('Connection test result:', tablesError.message)
  } else {
    console.log('✅ Connected to Supabase successfully')
  }

  // Since direct SQL execution isn't available in Supabase JS client,
  // let's provide the manual steps
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

  console.log('\n' + '='.repeat(60))
  console.log('MANUAL MIGRATION REQUIRED')
  console.log('='.repeat(60))
  console.log('\nThe Supabase JS client cannot execute raw SQL directly.')
  console.log('Please follow these steps:\n')
  console.log('1. Click this link to open your SQL Editor:')
  console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`)
  console.log('\n2. Copy the SQL from this file:')
  console.log('   supabase/migrations/002_esl_corrections.sql')
  console.log('\n3. Paste it in the SQL Editor and click "Run"\n')
  console.log('4. Verify tables were created:')
  console.log(`   https://supabase.com/dashboard/project/${projectRef}/editor`)
  console.log('\n' + '='.repeat(60))

  // Check if tables already exist
  console.log('\nChecking for existing tables...')

  const tablesToCheck = ['corrections', 'user_progress']
  for (const table of tablesToCheck) {
    const { error } = await supabase.from(table).select('count').limit(0)

    if (error) {
      console.log(`❌ Table '${table}' does not exist`)
    } else {
      console.log(`✅ Table '${table}' already exists`)
    }
  }
}

runMigration().catch(console.error)
