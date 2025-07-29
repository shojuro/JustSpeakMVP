import { NextResponse } from 'next/server'

export async function GET() {
  // Simple diagnostics safe for production
  const diagnostics = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {
      openaiKey: {
        exists: !!process.env.OPENAI_API_KEY,
        valid: process.env.OPENAI_API_KEY?.startsWith('sk-') || false,
        length: process.env.OPENAI_API_KEY?.length || 0,
      },
      supabase: {
        urlExists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKeyExists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        serviceKeyExists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    },
  }

  // Determine if configuration is valid
  const isConfigured =
    diagnostics.checks.openaiKey.exists &&
    diagnostics.checks.openaiKey.valid &&
    diagnostics.checks.openaiKey.length > 40 &&
    diagnostics.checks.supabase.urlExists &&
    diagnostics.checks.supabase.anonKeyExists

  return NextResponse.json({
    ...diagnostics,
    configured: isConfigured,
    message: isConfigured
      ? 'All required environment variables are configured'
      : 'Missing or invalid environment variables',
  })
}
