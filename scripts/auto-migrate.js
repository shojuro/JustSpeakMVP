const fs = require('fs')
const path = require('path')

// Read environment variables
const envPath = path.join(__dirname, '..', '.env')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach((line) => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim()
  }
})

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY')
  process.exit(1)
}

// Read migration SQL
const migrationPath = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '002_esl_corrections.sql'
)
const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

console.log('Running migration via Supabase REST API...')
console.log('URL:', SUPABASE_URL)

// Split SQL into individual statements
const statements = migrationSQL
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith('--'))

async function runMigration() {
  let successCount = 0
  let errorCount = 0

  for (const statement of statements) {
    const queryType = statement.split(' ')[0].toUpperCase()
    console.log(`\nExecuting ${queryType} statement...`)

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: statement + ';' }),
      })

      if (response.ok) {
        console.log('✅ Success')
        successCount++
      } else {
        const text = await response.text()
        console.log('❌ Failed:', text)
        errorCount++
      }
    } catch (error) {
      console.log('❌ Error:', error.message)
      errorCount++
    }
  }

  console.log(`\n\nMigration Summary:`)
  console.log(`✅ Successful statements: ${successCount}`)
  console.log(`❌ Failed statements: ${errorCount}`)

  if (errorCount === 0) {
    console.log('\n🎉 Migration completed successfully!')
  } else {
    console.log('\n⚠️  Some statements failed. This might be okay if tables already exist.')
  }

  // Verify tables exist
  console.log('\nVerifying tables...')

  const tables = ['corrections', 'user_progress']
  for (const table of tables) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=count&limit=0`, {
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
        },
      })

      if (response.ok) {
        console.log(`✅ Table '${table}' exists`)
      } else {
        console.log(`❌ Table '${table}' not found`)
      }
    } catch (error) {
      console.log(`❌ Error checking table '${table}':`, error.message)
    }
  }
}

runMigration().catch(console.error)
