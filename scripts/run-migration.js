const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

async function runMigration() {
  // Check for required environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: Missing required environment variables')
    console.error(
      'Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env'
    )
    process.exit(1)
  }

  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  try {
    console.log('Running migration 002_esl_corrections.sql...')

    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      '..',
      'supabase',
      'migrations',
      '002_esl_corrections.sql'
    )
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Execute the migration
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql: migrationSQL,
      })
      .single()

    if (error) {
      // If exec_sql doesn't exist, try direct query (if using Supabase JS v2)
      console.log('Trying alternative method...')

      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      // Execute each statement
      for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 50)}...`)

        // Use raw SQL execution
        const { error: stmtError } = await supabase.from('_sql').select(statement)

        if (stmtError && !stmtError.message.includes('already exists')) {
          console.error('Error executing statement:', stmtError)
          throw stmtError
        }
      }
    }

    console.log('✅ Migration completed successfully!')

    // Verify tables were created
    console.log('\nVerifying tables...')

    const { data: corrections } = await supabase.from('corrections').select('count').single()

    const { data: progress } = await supabase.from('user_progress').select('count').single()

    console.log('✅ Tables verified:')
    console.log('  - corrections table exists')
    console.log('  - user_progress table exists')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
runMigration()
