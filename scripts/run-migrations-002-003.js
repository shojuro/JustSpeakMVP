#!/usr/bin/env node

/**
 * Run migrations 002 and 003 to fix the analyze-errors functionality
 * This script checks if migrations are already applied and runs them if needed
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables:')
  if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  if (!serviceRoleKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function checkTableExists(tableName) {
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .single()
  
  return !error && data !== null
}

async function runMigration(migrationNumber, description) {
  console.log(`\n📋 Migration ${migrationNumber}: ${description}`)
  
  try {
    // Read migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', `${migrationNumber}.sql`)
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    console.log(`📄 Running migration from: ${migrationPath}`)
    
    // Execute migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    }).single()
    
    if (error) {
      // If exec_sql doesn't exist, try direct query (this won't work without admin access)
      console.error('⚠️  exec_sql function not available. Please run the migration manually in Supabase Dashboard.')
      console.error('Error:', error.message)
      return false
    }
    
    console.log(`✅ Migration ${migrationNumber} completed successfully`)
    return true
  } catch (error) {
    console.error(`❌ Error running migration ${migrationNumber}:`, error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Starting migration check and execution...')
  console.log('🔗 Supabase URL:', supabaseUrl)
  
  // Check if tables exist
  const correctionsExists = await checkTableExists('corrections')
  const userProgressExists = await checkTableExists('user_progress')
  
  console.log('\n📊 Table Status:')
  console.log(`  - corrections table: ${correctionsExists ? '✅ exists' : '❌ missing'}`)
  console.log(`  - user_progress table: ${userProgressExists ? '✅ exists' : '❌ missing'}`)
  
  // If tables don't exist, we need to run migration 002
  if (!correctionsExists || !userProgressExists) {
    console.log('\n⚠️  Tables are missing. Migration 002 needs to be run.')
    console.log('\n📝 Manual Steps Required:')
    console.log('1. Go to Supabase Dashboard: https://app.supabase.com')
    console.log('2. Select your project')
    console.log('3. Go to SQL Editor')
    console.log('4. Copy and paste the contents of:')
    console.log('   supabase/migrations/002_esl_corrections.sql')
    console.log('5. Execute the SQL')
    console.log('\nThen run this script again to check migration 003.')
  } else {
    console.log('\n✅ Required tables exist!')
    
    // Check if we need migration 003 (RLS policy fixes)
    console.log('\n🔐 Checking RLS policies...')
    const { data: policies, error } = await supabase
      .from('pg_policies')
      .select('policyname, tablename')
      .in('tablename', ['corrections', 'user_progress'])
    
    if (!error && policies) {
      console.log('\n📋 Current RLS policies:')
      policies.forEach(p => {
        console.log(`  - ${p.tablename}: ${p.policyname}`)
      })
      
      const hasOldPolicy = policies.some(p => 
        p.policyname === 'System can create corrections' || 
        p.policyname === 'System can manage progress'
      )
      
      if (hasOldPolicy) {
        console.log('\n⚠️  Old RLS policies detected. Migration 003 needs to be run.')
        console.log('\n📝 Manual Steps Required:')
        console.log('1. Go to Supabase Dashboard: https://app.supabase.com')
        console.log('2. Select your project')
        console.log('3. Go to SQL Editor')
        console.log('4. Copy and paste the contents of:')
        console.log('   supabase/migrations/003_fix_corrections_rls.sql')
        console.log('5. Execute the SQL')
      } else {
        console.log('\n✅ RLS policies appear to be up to date!')
      }
    }
  }
  
  console.log('\n\n📌 Summary:')
  console.log('After running the required migrations, the analyze-errors functionality should work properly.')
  console.log('The app will be able to:')
  console.log('  - Analyze speech for ESL errors')
  console.log('  - Save corrections to the database')
  console.log('  - Track user progress over time')
  
  console.log('\n⚠️  Important: After running migrations, ensure your Vercel deployment has:')
  console.log('  - SUPABASE_SERVICE_ROLE_KEY environment variable set')
  console.log('  - Or run migration 003 to fix RLS policies for regular auth')
}

main().catch(console.error)