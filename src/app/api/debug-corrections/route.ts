import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

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
  const requestId = `debug_corr_${Date.now()}_${Math.random().toString(36).substring(7)}`
  console.log(`[debug-corrections][${requestId}] API endpoint called`)

  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const sessionId = searchParams.get('sessionId')
    const messageId = searchParams.get('messageId')
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    console.log(`[debug-corrections][${requestId}] Parameters:`, {
      userId,
      sessionId,
      messageId,
      limit,
    })

    // Try both clients to see which one works
    const results: any = {
      requestId,
      timestamp: new Date().toISOString(),
      parameters: { userId, sessionId, messageId, limit },
      regularClient: { success: false, data: null, error: null },
      serviceClient: { success: false, data: null, error: null },
    }

    // Test with regular client
    try {
      const supabase = await createClient()
      console.log(`[debug-corrections][${requestId}] Testing with regular client...`)

      let query = supabase.from('corrections').select('*')

      if (userId) {
        query = query.eq('user_id', userId)
      }

      if (sessionId) {
        query = query.eq('session_id', sessionId)
      }

      if (messageId) {
        query = query.eq('message_id', messageId)
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(limit)

      results.regularClient = {
        success: !error,
        data: data || [],
        count: data?.length || 0,
        error: error
          ? {
              code: error.code,
              message: error.message,
              details: error.details,
            }
          : null,
      }

      console.log(`[debug-corrections][${requestId}] Regular client result:`, {
        success: !error,
        count: data?.length || 0,
        error: error?.message,
      })
    } catch (error) {
      console.error(`[debug-corrections][${requestId}] Regular client error:`, error)
      results.regularClient.error = {
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }

    // Test with service role client
    try {
      const serviceSupabase = getServiceSupabase()
      console.log(`[debug-corrections][${requestId}] Testing with service role client...`)

      let query = serviceSupabase.from('corrections').select('*')

      if (userId) {
        query = query.eq('user_id', userId)
      }

      if (sessionId) {
        query = query.eq('session_id', sessionId)
      }

      if (messageId) {
        query = query.eq('message_id', messageId)
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(limit)

      results.serviceClient = {
        success: !error,
        data: data || [],
        count: data?.length || 0,
        error: error
          ? {
              code: error.code,
              message: error.message,
              details: error.details,
            }
          : null,
      }

      console.log(`[debug-corrections][${requestId}] Service client result:`, {
        success: !error,
        count: data?.length || 0,
        error: error?.message,
      })

      // Add summary statistics if data exists
      if (data && data.length > 0) {
        const errorTypeCounts: Record<string, number> = {}
        const totalErrors = data.reduce((sum, correction) => {
          const errorTypes = correction.error_types || []
          errorTypes.forEach((type: string) => {
            errorTypeCounts[type] = (errorTypeCounts[type] || 0) + 1
          })
          return sum + correction.error_count
        }, 0)

        results.summary = {
          totalCorrections: data.length,
          totalErrors,
          averageErrorsPerMessage: totalErrors / data.length,
          errorTypeCounts,
          recentCorrections: data.slice(0, 5).map((correction) => ({
            id: correction.id,
            created_at: correction.created_at,
            original: correction.original_text?.substring(0, 50) + '...',
            corrected: correction.corrected_text?.substring(0, 50) + '...',
            errorTypes: correction.error_types,
            errorCount: correction.error_count,
          })),
        }
      }
    } catch (error) {
      console.error(`[debug-corrections][${requestId}] Service client error:`, error)
      results.serviceClient.error = {
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }

    // Add analysis
    results.analysis = {
      serviceKeyConfigured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      comparison: {
        regularClientWorked: results.regularClient.success,
        serviceClientWorked: results.serviceClient.success,
        dataMatches:
          JSON.stringify(results.regularClient.data) === JSON.stringify(results.serviceClient.data),
      },
    }

    // Check table existence
    try {
      const serviceSupabase = getServiceSupabase()
      const { error: tableError } = await serviceSupabase.from('corrections').select('id').limit(1)

      results.tableStatus = {
        exists: !tableError || tableError.code !== 'PGRST116',
        error: tableError
          ? {
              code: tableError.code,
              message: tableError.message,
            }
          : null,
      }
    } catch (error) {
      results.tableStatus = {
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }

    console.log(`[debug-corrections][${requestId}] Final analysis:`, results.analysis)

    return NextResponse.json(results)
  } catch (error) {
    console.error(`[debug-corrections][${requestId}] API error:`, error)
    return NextResponse.json(
      {
        error: 'Failed to debug corrections',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    )
  }
}
