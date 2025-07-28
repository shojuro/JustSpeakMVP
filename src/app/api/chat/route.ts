import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { sanitizeText } from '@/lib/sanitization'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  console.log('[Chat API] POST handler called')
  
  try {
    // Add request validation
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      console.error('[Chat API] Invalid content-type:', contentType)
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch (e) {
      console.error('[Chat API] Failed to parse JSON:', e)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { message, sessionId, userId, isAnonymous } = body

    console.log('[Chat API] Request received:', {
      messageLength: message?.length,
      sessionId,
      userId,
      isAnonymous,
      headers: Object.fromEntries(request.headers.entries())
    })

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Sanitize user input
    const sanitizedMessage = sanitizeText(message)

    // For anonymous users, skip session verification
    if (!isAnonymous) {
      if (!sessionId) {
        console.error('[Chat API] Missing sessionId for authenticated user')
        return NextResponse.json(
          { error: 'SessionId is required for authenticated users' },
          { status: 400 }
        )
      }

      // Verify user owns the session
      const supabase = await createClient()
      const { data: sessions, error: sessionError } = await supabase
        .from('sessions')
        .select('user_id')
        .eq('id', sessionId)

      console.log('[Chat API] Session query result:', {
        sessionError: sessionError?.message,
        sessionCount: sessions?.length || 0,
        sessionId,
        userId
      })

      // Handle the case where .single() would fail
      if (sessionError) {
        console.error('[Chat API] Session query error:', sessionError)
        return NextResponse.json({ error: 'Failed to verify session' }, { status: 500 })
      }

      if (!sessions || sessions.length === 0) {
        console.error('[Chat API] No session found for ID:', sessionId)
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      if (sessions.length > 1) {
        console.error('[Chat API] Multiple sessions found for ID:', sessionId, 'Count:', sessions.length)
        // Use the first one but log the issue
      }

      const session = sessions[0]

      console.log('[Chat API] Session verification:', {
        sessionUserId: session?.user_id,
        requestUserId: userId,
        match: session?.user_id === userId
      })

      if (session.user_id !== userId) {
        console.error('[Chat API] Session user mismatch:', {
          sessionUserId: session.user_id,
          requestUserId: userId
        })
        return NextResponse.json({ error: 'Invalid session' }, { status: 403 })
      }
    }

    // Get conversation history for context (last 20 messages) - only for authenticated users
    let history = null
    if (!isAnonymous && sessionId !== 'anonymous') {
      const supabase = await createClient()
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
      history.reverse().forEach((msg) => {
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

    // Save both messages to database (only for authenticated users)
    if (!isAnonymous && sessionId !== 'anonymous') {
      const supabase = await createClient()
      
      console.log('[Chat API] Saving messages to database for session:', sessionId)
      
      // Insert user message
      const { data: userMessage, error: userInsertError } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          speaker: 'USER',
          content: sanitizedMessage,
        })
        .select()
        .single()

      if (userInsertError) {
        console.error('[Chat API] Error saving user message:', {
          error: userInsertError.message,
          code: userInsertError.code,
          details: userInsertError.details
        })
        // Don't fail the whole request if message saving fails
      }

      // Insert AI message
      const { error: aiInsertError } = await supabase
        .from('messages')
        .insert({
          session_id: sessionId,
          speaker: 'AI',
          content: aiResponse,
        })

      if (aiInsertError) {
        console.error('[Chat API] Error saving AI message:', {
          error: aiInsertError.message,
          code: aiInsertError.code,
          details: aiInsertError.details
        })
      }

      // Check if we should analyze this message (every 3rd message)
      if (userMessage && userId) {
        try {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', sessionId)
            .eq('speaker', 'USER')

          console.log('[Chat API] Message count for error analysis:', count)

          if (count && count % 3 === 0) {
            console.log('[Chat API] Triggering error analysis for message', userMessage.id)
            // Trigger error analysis in the background
            // Use absolute URL for server-side fetch
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`
            fetch(`${baseUrl}/api/analyze-errors`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messageId: userMessage.id,
                userId,
                sessionId,
                content: sanitizedMessage,
                duration: 0, // Duration will be added when we implement it
              }),
            }).catch(err => console.error('[Chat API] Error analysis failed:', err))
          }
        } catch (error) {
          console.error('[Chat API] Error checking for analysis trigger:', error)
        }
      }
    }

    return NextResponse.json({ message: aiResponse })
  } catch (error: any) {
    console.error('[Chat API] Fatal error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      status: error.status,
      type: error.constructor.name
    })
    
    // Check for specific OpenAI errors
    if (error.status === 401) {
      return NextResponse.json({ error: 'Invalid OpenAI API key' }, { status: 500 })
    }
    
    if (error.status === 429) {
      return NextResponse.json({ error: 'OpenAI rate limit exceeded' }, { status: 429 })
    }
    
    // Return more detailed error in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Failed to process chat: ${error.message}`
      : 'Failed to process chat message'
    
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

