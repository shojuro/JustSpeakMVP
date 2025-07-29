const fs = require('fs')
const path = require('path')

// Read .env file
const envPath = path.join(__dirname, '..', '.env')
const envContent = fs.readFileSync(envPath, 'utf8')
const envVars = {}
envContent.split('\n').forEach((line) => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

// Extract project ref
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
console.log(`Project: ${projectRef}`)

console.log('\n✅ Environment variables found!')
console.log('\n📋 To run the migration:')
console.log('\n1. Go to your Supabase SQL Editor:')
console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`)
console.log('\n2. Copy and paste the SQL from:')
console.log('   supabase/migrations/002_esl_corrections.sql')
console.log('\n3. Click "Run" to execute the migration')
console.log('\n4. Verify in Table Editor:')
console.log(`   https://supabase.com/dashboard/project/${projectRef}/editor`)
console.log('\nTables to look for:')
console.log('  - corrections')
console.log('  - user_progress')
