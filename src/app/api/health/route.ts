import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    deploymentTimestamp: '2025-07-29T02:47:00+07:00', // Force redeployment
  }

  // Check environment variables (safely)
  diagnostics.env = {
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    openAIKeyLength: process.env.OPENAI_API_KEY?.length || 0,
    openAIKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 3) === 'sk-' ? 'valid' : 'invalid',
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  }

  // Test OpenAI connection
  try {
    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    
    // Try a minimal API call
    const models = await openai.models.list()
    diagnostics.openai = {
      connected: true,
      modelsAvailable: models.data.length > 0,
    }
  } catch (error: any) {
    diagnostics.openai = {
      connected: false,
      error: error.message,
      errorType: error.constructor.name,
    }
  }

  // Test Supabase connection and tables
  try {
    const supabase = await createClient()
    
    // Check if tables exist by attempting to query them
    const tables = ['sessions', 'messages', 'profiles', 'corrections', 'user_progress']
    const tableStatus: Record<string, boolean> = {}
    
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('count').limit(0)
        tableStatus[table] = !error
      } catch {
        tableStatus[table] = false
      }
    }
    
    diagnostics.database = {
      connected: true,
      tables: tableStatus,
    }
  } catch (error: any) {
    diagnostics.database = {
      connected: false,
      error: error.message,
    }
  }

  // Overall health status
  diagnostics.healthy = 
    diagnostics.env.hasOpenAIKey && 
    diagnostics.env.openAIKeyPrefix === 'valid' &&
    diagnostics.openai?.connected &&
    diagnostics.database?.connected &&
    diagnostics.database?.tables?.corrections &&
    diagnostics.database?.tables?.user_progress

  return NextResponse.json(diagnostics, {
    status: diagnostics.healthy ? 200 : 503,
  })
}