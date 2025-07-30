import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import OpenAI from 'openai'
import { sanitizeText } from '@/lib/sanitization'
import type { Database } from '@/types/database'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  console.log('[Chat API] POST handler called')

  // Declare variables at function scope for error handling
  let isAnonymous = false
  let sessionId: string | null = null

  try {
    // Add request validation
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      console.error('[Chat API] Invalid content-type:', contentType)
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 400 })
    }

    // Create Supabase client with proper cookie handling
    const cookieStore = await cookies()

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Remove auth header check - we're using cookie-based auth
    console.log('[Chat API] Using cookie-based authentication')

    // Log all cookies for debugging
    const allCookies = cookieStore.getAll()
    console.log(
      '[Chat API] ALL cookies received:',
      allCookies.map((c) => ({
        name: c.name,
        hasValue: !!c.value,
        valueLength: c.value?.length || 0,
      }))
    )

    // Look for Supabase auth cookies with various patterns
    const authCookies = allCookies.filter(
      (c) => c.name.includes('sb-') || c.name.includes('supabase') || c.name.includes('auth')
    )
    console.log(
      '[Chat API] Potential auth cookies:',
      authCookies.map((c) => ({
        name: c.name,
        hasValue: !!c.value,
      }))
    )

    // Get Supabase project reference from URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'unknown'
    console.log('[Chat API] Supabase project ref:', projectRef)
    console.log('[Chat API] Expected cookie prefix:', `sb-${projectRef}-auth-token`)

    // Get user from the server-side client (uses cookies)
    const {
      data: { user: authenticatedUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[Chat API] Auth error:', authError)
    } else if (authenticatedUser) {
      console.log(
        '[Chat API] Authenticated user from cookies:',
        authenticatedUser.id,
        authenticatedUser.email
      )
    } else {
      console.log('[Chat API] No authenticated user found')
    }

    let body
    try {
      body = await request.json()
    } catch (e) {
      console.error('[Chat API] Failed to parse JSON:', e)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const { message, sessionId: reqSessionId, userId, isAnonymous: reqIsAnonymous } = body
    sessionId = reqSessionId
    isAnonymous = reqIsAnonymous

    console.log('[Chat API] Request received:', {
      messageLength: message?.length,
      sessionId,
      sessionIdLength: sessionId?.length,
      userId,
      userIdLength: userId?.length,
      isAnonymous,
      headers: Object.fromEntries(request.headers.entries()),
    })

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Sanitize user input
    const sanitizedMessage = sanitizeText(message)

    // For authenticated users, verify auth context and session
    if (!isAnonymous) {
      // Check if we have authenticated user context
      if (!authenticatedUser) {
        console.error('[Chat API] No authenticated user context for non-anonymous request')
        return NextResponse.json(
          { error: 'Authentication required. Please log in again.' },
          { status: 401 }
        )
      }

      // Verify the provided userId matches the authenticated user
      if (userId !== authenticatedUser.id) {
        console.error('[Chat API] User ID mismatch:', {
          provided: userId,
          authenticated: authenticatedUser.id,
        })
        return NextResponse.json({ error: 'Invalid user context' }, { status: 403 })
      }

      if (!sessionId) {
        console.error('[Chat API] Missing sessionId for authenticated user')
        return NextResponse.json(
          { error: 'Session needs to be created first. Please refresh the page.' },
          { status: 400 }
        )
      }

      // Verify user owns the session
      console.log('[Chat API] Verifying session ownership:', {
        sessionId,
        authenticatedUserId: authenticatedUser.id,
        sessionIdLength: sessionId.length,
      })

      // Query with explicit user context
      let { data: sessions, error: sessionError } = await supabase
        .from('sessions')
        .select('id, user_id, created_at')
        .eq('id', sessionId)
        .eq('user_id', authenticatedUser.id)

      console.log('[Chat API] Session query result:', {
        sessionError: sessionError?.message,
        sessionCount: sessions?.length || 0,
        sessionData: sessions?.[0],
        queryParams: {
          sessionId,
          userId: authenticatedUser.id,
        },
      })

      // Handle the case where .single() would fail
      if (sessionError) {
        console.error('[Chat API] Session query error:', sessionError)
        return NextResponse.json({ error: 'Failed to verify session' }, { status: 500 })
      }

      if (!sessions || sessions.length === 0) {
        console.error('[Chat API] Session not found:', {
          sessionId,
          userId: authenticatedUser.id,
        })

        // Debug: Try to query without user filter to see if session exists
        const { data: allSessions, error: debugError } = await supabase
          .from('sessions')
          .select('id, user_id')
          .eq('id', sessionId)

        console.error('[Chat API] Debug - session exists check:', {
          found: allSessions?.length || 0,
          sessionData: allSessions?.[0],
          error: debugError?.message,
        })

        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      if (sessions.length > 1) {
        console.error(
          '[Chat API] Multiple sessions found for ID:',
          sessionId,
          'Count:',
          sessions.length
        )
        // Use the first one but log the issue
      }

      const session = sessions[0]

      console.log('[Chat API] Session verification:', {
        sessionUserId: session?.user_id,
        authenticatedUserId: authenticatedUser.id,
        match: session?.user_id === authenticatedUser.id,
      })

      if (session.user_id !== authenticatedUser.id) {
        console.error('[Chat API] Session ownership mismatch:', {
          sessionUserId: session.user_id,
          authenticatedUserId: authenticatedUser.id,
        })
        return NextResponse.json({ error: 'Invalid session ownership' }, { status: 403 })
      }
    }

    // Get conversation history for context (last 20 messages) - only for authenticated users
    let history = null
    if (!isAnonymous && sessionId !== 'anonymous') {
      const { data } = await supabase
        .from('messages')
        .select('speaker, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(20)
      history = data
    }

    // Prepare messages for OpenAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are a friendly English conversation partner helping someone practice speaking English. 
Your role is to:
- Have natural, engaging conversations
- Gently correct major errors without interrupting the flow
- Ask follow-up questions to keep the conversation going
- Adapt to the user's English level
- Be encouraging and supportive
- Keep responses concise (2-3 sentences usually)
- Focus on helping them practice speaking, not teaching grammar rules`,
      },
    ]

    // Add conversation history (reversed to get chronological order)
    if (history) {
      history.reverse().forEach((msg: any) => {
        messages.push({
          role: msg.speaker === 'USER' ? 'user' : 'assistant',
          content: msg.content,
        })
      })
    }

    // Add current message
    messages.push({ role: 'user', content: sanitizedMessage })

    // Get AI response
    console.log('[Chat API] Calling OpenAI with', messages.length, 'messages')

    if (!process.env.OPENAI_API_KEY) {
      console.error('[Chat API] OPENAI_API_KEY not configured')
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      max_tokens: 250,
      temperature: 0.8,
      presence_penalty: 0.6,
      frequency_penalty: 0.3,
    })

    const aiResponse =
      completion.choices[0]?.message?.content ||
      "I'm sorry, I didn't catch that. Could you please repeat?"

    console.log('[Chat API] OpenAI response received:', aiResponse.substring(0, 50) + '...')
    console.log('[Chat API] Auth context summary:', {
      isAnonymous,
      authenticatedUserId: authenticatedUser?.id,
      sessionId,
      willSaveToDb: !isAnonymous && sessionId !== 'anonymous',
    })

    // Save AI message to database (only for authenticated users)
    // Note: User message is now saved in ChatInterface before calling this API
    if (!isAnonymous && sessionId !== 'anonymous') {
      console.log('[Chat API] Saving AI message to database for session:', sessionId)

      // Insert AI message
      const { error: aiInsertError } = await supabase.from('messages').insert({
        session_id: sessionId,
        speaker: 'AI',
        content: aiResponse,
      })

      if (aiInsertError) {
        console.error('[Chat API] Error saving AI message:', {
          error: aiInsertError.message,
          code: aiInsertError.code,
          details: aiInsertError.details,
        })
      }

      // Note: Error analysis is now done in ChatInterface after saving the user message
    }

    return NextResponse.json({ message: aiResponse })
  } catch (error: any) {
    console.error('[Chat API] Fatal error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      status: error.status,
      type: error.constructor.name,
    })

    // Check for specific OpenAI errors
    if (error.status === 401) {
      return NextResponse.json({ error: 'Invalid OpenAI API key' }, { status: 500 })
    }

    if (error.status === 429) {
      return NextResponse.json({ error: 'OpenAI rate limit exceeded' }, { status: 429 })
    }

    // Return more detailed error in development
    const errorDetails = {
      message: error.message,
      isAnonymous,
      hasSession: !!sessionId,
    }

    const errorMessage =
      process.env.NODE_ENV === 'development'
        ? `Failed to process chat: ${error.message}`
        : 'Failed to process chat message'

    console.error('[Chat API] Error details:', errorDetails)

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
