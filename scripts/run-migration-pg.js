#!/usr/bin/env node

/**
 * Script to run migration 002_esl_corrections.sql using pg library
 * Creates user_progress and corrections tables in Supabase
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

// Manually load DATABASE_URL from .env file
const envPath = path.join(__dirname, '..', '.env')
let DATABASE_URL = ''

try {
  const envContent = fs.readFileSync(envPath, 'utf8')
  const lines = envContent.split('\n')

  for (const line of lines) {
    if (line.startsWith('DATABASE_URL=')) {
      DATABASE_URL = line.substring('DATABASE_URL='.length).trim()
      break
    }
  }
} catch (error) {
  console.error('❌ Error reading .env file:', error.message)
  process.exit(1)
}

// Verify DATABASE_URL exists
if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL not found in .env file')
  process.exit(1)
}

async function runMigration() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Required for Supabase connection
    },
  })

  try {
    // Connect to database
    console.log('🔧 Connecting to Supabase PostgreSQL...')
    await client.connect()
    console.log('✅ Connected successfully')

    // Read migration file
    const migrationPath = path.join(
      __dirname,
      '..',
      'supabase',
      'migrations',
      '002_esl_corrections.sql'
    )
    console.log(`📄 Reading migration file: ${migrationPath}`)

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    console.log(`✅ Migration file loaded (${migrationSQL.length} characters)`)

    // Execute the migration
    console.log('🚀 Running migration...')
    await client.query(migrationSQL)

    console.log('✅ Migration completed successfully!')
    console.log('\n📊 Created tables:')
    console.log('  - corrections (for storing error analysis)')
    console.log('  - user_progress (for tracking improvement)')
    console.log('\n🔒 Row Level Security policies applied')
    console.log('🏗️  Indexes created for performance')
    console.log('⚡ Helper function update_user_progress created')

    // Verify tables were created
    console.log('\n🔍 Verifying tables...')
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('corrections', 'user_progress')
      ORDER BY table_name;
    `)

    console.log('✅ Tables found:')
    tablesResult.rows.forEach((row) => {
      console.log(`  - ${row.table_name}`)
    })
  } catch (error) {
    console.error('❌ Migration failed:', error.message)

    // Check for common errors
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  It looks like some tables already exist.')
      console.log(
        'If you want to re-run the migration, you may need to drop the existing tables first.'
      )
      console.log('WARNING: This will delete all data in these tables!')
      console.log('\nTo drop tables, run this SQL in Supabase dashboard:')
      console.log('DROP TABLE IF EXISTS public.corrections CASCADE;')
      console.log('DROP TABLE IF EXISTS public.user_progress CASCADE;')
    }

    process.exit(1)
  } finally {
    // Close connection
    await client.end()
    console.log('\n🔌 Database connection closed')
  }
}

// Check if pg is installed
try {
  require.resolve('pg')
} catch (e) {
  console.error('❌ Error: pg package not installed')
  console.log('Please install it by running:')
  console.log('npm install pg')
  process.exit(1)
}

// Run the migration
runMigration()
