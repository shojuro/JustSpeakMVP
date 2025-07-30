import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Create service role client for bypassing RLS
const getServiceSupabase = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

export async function GET(request: NextRequest) {
  const requestId = `health_${Date.now()}_${Math.random().toString(36).substring(7)}`
  console.log(`[system-health][${requestId}] Health check initiated`)

  const health: any = {
    requestId,
    timestamp: new Date().toISOString(),
    status: 'checking',
    checks: {
      environment: { status: 'pending', details: {} },
      database: { status: 'pending', details: {} },
      openai: { status: 'pending', details: {} },
      auth: { status: 'pending', details: {} },
      serviceRole: { status: 'pending', details: {} },
    },
  }

  // Check environment variables
  try {
    console.log(`[system-health][${requestId}] Checking environment variables...`)
    
    const envCheck = {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      openaiKey: !!process.env.OPENAI_API_KEY,
      nodeEnv: process.env.NODE_ENV,
    }

    // Extract project ID from Supabase URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)
    const projectId = urlMatch ? urlMatch[1] : 'unknown'

    // Check if service role key matches project
    const serviceKeyData = process.env.SUPABASE_SERVICE_ROLE_KEY ? 
      JSON.parse(Buffer.from(process.env.SUPABASE_SERVICE_ROLE_KEY.split('.')[1], 'base64').toString()) : null
    const serviceKeyProjectId = serviceKeyData?.ref || 'unknown'

    health.checks.environment = {
      status: 'success',
      details: {
        ...envCheck,
        projectId,
        serviceKeyProjectId,
        projectMatch: projectId === serviceKeyProjectId,
        openaiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
      },
    }

    if (!envCheck.supabaseUrl || !envCheck.supabaseAnonKey || !envCheck.openaiKey) {
      health.checks.environment.status = 'error'
      health.checks.environment.error = 'Missing required environment variables'
    }
  } catch (error) {
    console.error(`[system-health][${requestId}] Environment check error:`, error)
    health.checks.environment = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  // Check database connectivity and tables
  try {
    console.log(`[system-health][${requestId}] Checking database...`)
    
    const supabase = await createClient()
    
    // Check tables exist
    const tables = ['profiles', 'sessions', 'messages', 'corrections', 'user_progress']
    const tableChecks: Record<string, any> = {}

    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1)
      tableChecks[table] = {
        exists: !error || error.code !== 'PGRST116',
        error: error?.message,
        code: error?.code,
      }
    }

    health.checks.database = {
      status: 'success',
      details: {
        tables: tableChecks,
        allTablesExist: Object.values(tableChecks).every(check => check.exists),
      },
    }

    if (!health.checks.database.details.allTablesExist) {
      health.checks.database.status = 'warning'
      health.checks.database.error = 'Some tables are missing'
    }
  } catch (error) {
    console.error(`[system-health][${requestId}] Database check error:`, error)
    health.checks.database = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  // Check OpenAI connectivity
  try {
    console.log(`[system-health][${requestId}] Checking OpenAI API...`)
    
    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })

      // Simple test to check API key validity
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Say "OK"' }],
        max_tokens: 5,
      })

      health.checks.openai = {
        status: 'success',
        details: {
          apiKeyValid: true,
          testResponse: completion.choices[0]?.message?.content,
        },
      }
    } else {
      health.checks.openai = {
        status: 'error',
        error: 'OpenAI API key not configured',
      }
    }
  } catch (error) {
    console.error(`[system-health][${requestId}] OpenAI check error:`, error)
    health.checks.openai = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        apiKeyConfigured: !!process.env.OPENAI_API_KEY,
      },
    }
  }

  // Check auth functionality
  try {
    console.log(`[system-health][${requestId}] Checking auth...`)
    
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    health.checks.auth = {
      status: 'success',
      details: {
        authenticated: !!user,
        userId: user?.id,
        email: user?.email,
      },
    }

    if (error) {
      health.checks.auth.status = 'info'
      health.checks.auth.details.error = error.message
    }
  } catch (error) {
    console.error(`[system-health][${requestId}] Auth check error:`, error)
    health.checks.auth = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  // Check service role client
  try {
    console.log(`[system-health][${requestId}] Checking service role client...`)
    
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const serviceSupabase = getServiceSupabase()
      
      // Test query with service role
      const { data, error } = await serviceSupabase
        .from('user_progress')
        .select('id')
        .limit(1)

      health.checks.serviceRole = {
        status: 'success',
        details: {
          canQuery: !error,
          error: error?.message,
        },
      }

      if (error && error.code !== 'PGRST116') {
        health.checks.serviceRole.status = 'error'
      }
    } else {
      health.checks.serviceRole = {
        status: 'error',
        error: 'Service role key not configured',
      }
    }
  } catch (error) {
    console.error(`[system-health][${requestId}] Service role check error:`, error)
    health.checks.serviceRole = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  // Determine overall health status
  const statuses = Object.values(health.checks).map((check: any) => check.status)
  if (statuses.includes('error')) {
    health.status = 'unhealthy'
  } else if (statuses.includes('warning')) {
    health.status = 'degraded'
  } else {
    health.status = 'healthy'
  }

  // Add recommendations
  health.recommendations = []
  
  if (health.checks.environment.details?.projectMatch === false) {
    health.recommendations.push({
      severity: 'critical',
      message: 'Service role key does not match Supabase project. Update SUPABASE_SERVICE_ROLE_KEY.',
    })
  }

  if (!health.checks.database.details?.allTablesExist) {
    const missingTables = Object.entries(health.checks.database.details?.tables || {})
      .filter(([_, check]) => !check.exists)
      .map(([table]) => table)
    
    health.recommendations.push({
      severity: 'critical',
      message: `Missing database tables: ${missingTables.join(', ')}. Run migrations.`,
    })
  }

  if (health.checks.openai.status === 'error') {
    health.recommendations.push({
      severity: 'high',
      message: 'OpenAI API is not working. Check API key configuration.',
    })
  }

  console.log(`[system-health][${requestId}] Health check complete:`, health.status)

  return NextResponse.json(health)
}