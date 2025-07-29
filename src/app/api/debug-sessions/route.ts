import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  console.log('[Debug Sessions API] Called')
  
  try {
    // Get session ID from query params
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')
    const userId = searchParams.get('userId')
    
    // Create admin client with service role key to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Test 1: Get all sessions for a user (bypassing RLS)
    if (userId) {
      const { data: sessions, error } = await supabaseAdmin
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)
      
      console.log('[Debug Sessions API] User sessions query:', {
        userId,
        found: sessions?.length || 0,
        error: error?.message
      })
      
      return NextResponse.json({
        success: true,
        userId,
        sessions: sessions || [],
        error: error?.message
      })
    }
    
    // Test 2: Get specific session (bypassing RLS)
    if (sessionId) {
      const { data: session, error } = await supabaseAdmin
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()
      
      console.log('[Debug Sessions API] Session query:', {
        sessionId,
        found: !!session,
        error: error?.message
      })
      
      // Also get message count for this session
      const { count: messageCount } = await supabaseAdmin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
      
      return NextResponse.json({
        success: true,
        sessionId,
        session,
        messageCount,
        error: error?.message
      })
    }
    
    // Test 3: Get recent sessions (no filters)
    const { data: recentSessions, error } = await supabaseAdmin
      .from('sessions')
      .select('id, user_id, created_at, ended_at')
      .order('created_at', { ascending: false })
      .limit(20)
    
    console.log('[Debug Sessions API] Recent sessions:', {
      found: recentSessions?.length || 0,
      error: error?.message
    })
    
    return NextResponse.json({
      success: true,
      recentSessions: recentSessions || [],
      error: error?.message,
      info: 'Add ?userId=xxx or ?sessionId=xxx to query specific data'
    })
    
  } catch (error: any) {
    console.error('[Debug Sessions API] Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}