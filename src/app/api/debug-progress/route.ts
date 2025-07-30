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
  const requestId = `debug_${Date.now()}_${Math.random().toString(36).substring(7)}`
  console.log(`[debug-progress][${requestId}] API endpoint called`)

  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const date = searchParams.get('date')
    const days = parseInt(searchParams.get('days') || '7', 10)

    console.log(`[debug-progress][${requestId}] Parameters:`, { userId, date, days })

    // Try both clients to see which one works
    const results: any = {
      requestId,
      timestamp: new Date().toISOString(),
      parameters: { userId, date, days },
      regularClient: { success: false, data: null, error: null },
      serviceClient: { success: false, data: null, error: null },
    }

    // Test with regular client
    try {
      const supabase = await createClient()
      console.log(`[debug-progress][${requestId}] Testing with regular client...`)

      let query = supabase.from('user_progress').select('*')

      if (userId) {
        query = query.eq('user_id', userId)
      }

      if (date) {
        query = query.eq('date', date)
      } else {
        // Get last N days
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        query = query.gte('date', startDate.toISOString().split('T')[0])
      }

      const { data, error } = await query.order('date', { ascending: false })

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

      console.log(`[debug-progress][${requestId}] Regular client result:`, {
        success: !error,
        count: data?.length || 0,
        error: error?.message,
      })
    } catch (error) {
      console.error(`[debug-progress][${requestId}] Regular client error:`, error)
      results.regularClient.error = {
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }

    // Test with service role client
    try {
      const serviceSupabase = getServiceSupabase()
      console.log(`[debug-progress][${requestId}] Testing with service role client...`)

      let query = serviceSupabase.from('user_progress').select('*')

      if (userId) {
        query = query.eq('user_id', userId)
      }

      if (date) {
        query = query.eq('date', date)
      } else {
        // Get last N days
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        query = query.gte('date', startDate.toISOString().split('T')[0])
      }

      const { data, error } = await query.order('date', { ascending: false })

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

      console.log(`[debug-progress][${requestId}] Service client result:`, {
        success: !error,
        count: data?.length || 0,
        error: error?.message,
      })

      // Add summary statistics if data exists
      if (data && data.length > 0) {
        const totalSpeakingTime = data.reduce(
          (sum, record) => sum + (record.total_speaking_time || 0),
          0
        )
        const totalMessages = data.reduce((sum, record) => sum + (record.total_messages || 0), 0)

        const allErrorCounts: Record<string, number> = {}
        data.forEach((record) => {
          const errorCounts = (record.error_counts as Record<string, number>) || {}
          Object.entries(errorCounts).forEach(([type, count]) => {
            allErrorCounts[type] = (allErrorCounts[type] || 0) + count
          })
        })

        results.summary = {
          totalRecords: data.length,
          totalSpeakingTime,
          totalMessages,
          errorCounts: allErrorCounts,
          averageSpeakingTimePerDay: Math.round(totalSpeakingTime / data.length),
          datesWithData: data.map((record) => record.date),
        }
      }
    } catch (error) {
      console.error(`[debug-progress][${requestId}] Service client error:`, error)
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

    console.log(`[debug-progress][${requestId}] Final analysis:`, results.analysis)

    return NextResponse.json(results)
  } catch (error) {
    console.error(`[debug-progress][${requestId}] API error:`, error)
    return NextResponse.json(
      {
        error: 'Failed to debug user progress',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    )
  }
}
