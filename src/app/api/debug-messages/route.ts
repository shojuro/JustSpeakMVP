import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sessionId = searchParams.get('sessionId')
  
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId parameter required' }, { status: 400 })
  }

  try {
    // Regular client
    const supabase = await createClient()
    
    // Try to get messages with regular client
    const { data: regularMessages, error: regularError } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    // Try with service role client if available
    let serviceMessages = null
    let serviceError = null
    
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const serviceClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )
      
      const result = await serviceClient
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        
      serviceMessages = result.data
      serviceError = result.error
    }

    // Get session info
    const { data: sessionInfo } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    return NextResponse.json({
      sessionId,
      sessionInfo,
      regularClient: {
        messages: regularMessages,
        error: regularError,
        count: regularMessages?.length || 0,
      },
      serviceClient: {
        messages: serviceMessages,
        error: serviceError,
        count: serviceMessages?.length || 0,
        available: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to debug messages',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}