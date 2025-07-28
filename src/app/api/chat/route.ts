import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { sanitizeText } from '@/lib/sanitization'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, userId, isAnonymous } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Sanitize user input
    const sanitizedMessage = sanitizeText(message)

    // For anonymous users, skip session verification
    if (!isAnonymous) {
      if (!sessionId) {
        return NextResponse.json(
          { error: 'SessionId is required for authenticated users' },
          { status: 400 }
        )
      }

      // Verify user owns the session
      const supabase = await createClient()
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('user_id')
        .eq('id', sessionId)
        .single()

      if (sessionError || !session || session.user_id !== userId) {
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

    // Save both messages to database (only for authenticated users)
    if (!isAnonymous && sessionId !== 'anonymous') {
      const supabase = await createClient()
      
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
        console.error('Error saving user message:', userInsertError)
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
        console.error('Error saving AI message:', aiInsertError)
      }

      // Check if we should analyze this message (every 3rd message)
      if (userMessage && userId) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', sessionId)
          .eq('speaker', 'USER')

        if (count && count % 3 === 0) {
          // Trigger error analysis in the background
          fetch('/api/analyze-errors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messageId: userMessage.id,
              userId,
              sessionId,
              content: sanitizedMessage,
              duration: 0, // Duration will be added when we implement it
            }),
          }).catch(err => console.error('Error analysis failed:', err))
        }
      }
    }

    return NextResponse.json({ message: aiResponse })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 })
  }
}
