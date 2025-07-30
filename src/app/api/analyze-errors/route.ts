import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { securityLogger, SecurityEventType } from '@/lib/securityLogger'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Create service role client for database operations (bypasses RLS)
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

// ESL Error hierarchy (most serious to least serious)
const ERROR_HIERARCHY = {
  WORD_ORDER: 'word_order',
  WORD_FORM: 'word_form',
  VERB_TENSE: 'verb_tense',
  PREPOSITIONS: 'prepositions',
  ARTICLES: 'articles',
  AGREEMENT: 'agreement',
  PRONOUNS: 'pronouns',
  SPELLING: 'spelling',
  PUNCTUATION: 'punctuation',
}

// Focus on top 4 error types initially
const PRIMARY_ERROR_TYPES = [
  ERROR_HIERARCHY.WORD_ORDER,
  ERROR_HIERARCHY.WORD_FORM,
  ERROR_HIERARCHY.VERB_TENSE,
  ERROR_HIERARCHY.PREPOSITIONS,
]

export async function POST(request: NextRequest) {
  console.log('[analyze-errors] API endpoint called')
  
  try {
    const body = await request.json()
    console.log('[analyze-errors] Request body:', body)
    
    const { messageId, userId, sessionId, content, duration } = body

    if (!messageId || !userId || !sessionId || !content) {
      console.error('[analyze-errors] Missing required fields:', {
        hasMessageId: !!messageId,
        hasUserId: !!userId,
        hasSessionId: !!sessionId,
        hasContent: !!content,
      })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('[analyze-errors] Validated input:', {
      messageId,
      userId,
      sessionId,
      contentLength: content.length,
      duration,
    })

    // Get Supabase client (regular client for auth check)
    const supabase = await createClient()
    console.log('[analyze-errors] Created Supabase client for auth')

    // Verify user owns the session
    console.log('[analyze-errors] Verifying session ownership...')
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single()

    if (sessionError) {
      console.error('[analyze-errors] Session verification error:', sessionError)
    }

    if (sessionError || !session || session.user_id !== userId) {
      console.error('[analyze-errors] Session verification failed:', {
        sessionError,
        hasSession: !!session,
        sessionUserId: session?.user_id,
        expectedUserId: userId,
      })
      
      securityLogger.log({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: 'warning',
        details: {
          reason: 'Invalid session access attempt',
          userId,
          sessionId,
        },
      })
      return NextResponse.json({ error: 'Invalid session' }, { status: 403 })
    }
    
    console.log('[analyze-errors] Session verified successfully')

    // Analyze errors using GPT-4
    const analysisPrompt = `You are an ESL teacher analyzing a student's spoken English. 
Analyze the following transcribed speech for ESL errors. Focus on these error types in order of importance:
1. Word Order - Incorrect placement of words in sentences
2. Word Form - Wrong form of words (e.g., using noun instead of verb)
3. Verb Tense - Incorrect or inconsistent verb tenses
4. Prepositions - Wrong or missing prepositions

Student's speech: "${content}"

Provide:
1. The corrected version of their speech (maintaining their intended meaning)
2. List each error found with its type
3. Brief explanation for the top 2-3 most important corrections

Format as JSON:
{
  "corrected_text": "corrected version here",
  "errors": [
    {
      "type": "word_order|word_form|verb_tense|prepositions|articles|agreement|pronouns|spelling|punctuation",
      "original": "what they said",
      "corrected": "what they should have said",
      "explanation": "brief explanation"
    }
  ],
  "summary": "2-3 sentences summarizing the main areas for improvement"
}`

    console.log('[analyze-errors] Calling OpenAI for analysis...')
    console.log('[analyze-errors] Using model: gpt-4-turbo-preview')
    console.log('[analyze-errors] OpenAI API key configured:', !!process.env.OPENAI_API_KEY)
    console.log('[analyze-errors] OpenAI API key length:', process.env.OPENAI_API_KEY?.length || 0)
    
    let completion
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are an ESL teacher providing gentle, constructive feedback. Focus on major communication issues, not minor imperfections.',
          },
          {
            role: 'user',
            content: analysisPrompt,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
        temperature: 0.3,
      })
      console.log('[analyze-errors] OpenAI response received')
    } catch (openaiError) {
      console.error('[analyze-errors] OpenAI API error:', {
        error: openaiError,
        message: openaiError instanceof Error ? openaiError.message : 'Unknown error',
        status: (openaiError as any)?.status,
        code: (openaiError as any)?.code,
        type: (openaiError as any)?.type,
      })
      
      // If OpenAI fails, return a generic response
      return NextResponse.json({ 
        error: 'Failed to analyze errors',
        details: 'OpenAI API error',
        openaiConfigured: !!process.env.OPENAI_API_KEY
      }, { status: 500 })
    }
    
    const analysisContent = completion.choices[0]?.message?.content || '{}'
    console.log('[analyze-errors] Raw analysis content:', analysisContent)
    
    const analysis = JSON.parse(analysisContent)
    console.log('[analyze-errors] Parsed analysis:', analysis)

    // Count errors by type
    const errorCounts: Record<string, number> = {}
    const errorTypes: string[] = []

    analysis.errors?.forEach((error: any) => {
      if (error.type) {
        errorTypes.push(error.type)
        errorCounts[error.type] = (errorCounts[error.type] || 0) + 1
      }
    })

    // Save correction to database using service role client
    console.log('[analyze-errors] Saving correction to database...')
    console.log('[analyze-errors] Error types found:', errorTypes)
    console.log('[analyze-errors] Error counts:', errorCounts)
    
    // Get service role client for database operations (with fallback)
    let dbClient = supabase // Default to regular client
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        dbClient = getServiceSupabase()
        console.log('[analyze-errors] Using service role client for database operations')
      } else {
        console.log('[analyze-errors] Service role key not configured, using regular client')
        console.log('[analyze-errors] Note: This may fail due to RLS policies')
      }
    } catch (error) {
      console.error('[analyze-errors] Failed to create service role client, using regular client:', error)
      // Continue with regular client
    }
    
    const correctionData = {
      message_id: messageId,
      session_id: sessionId,
      user_id: userId,
      original_text: content,
      corrected_text: analysis.corrected_text || content,
      error_types: errorTypes,
      error_count: errorTypes.length,
      analysis: {
        errors: analysis.errors || [],
        summary: analysis.summary || '',
        timestamp: new Date().toISOString(),
      },
    }
    
    console.log('[analyze-errors] Correction data to insert:', correctionData)
    
    const { data: correction, error: correctionError } = await dbClient
      .from('corrections')
      .insert(correctionData)
      .select()
      .single()

    if (correctionError) {
      console.error('[analyze-errors] Error saving correction:', {
        error: correctionError,
        code: correctionError.code,
        message: correctionError.message,
        details: correctionError.details,
      })
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 })
    }
    
    console.log('[analyze-errors] Correction saved successfully:', correction?.id)

    // Update user progress
    const today = new Date().toISOString().split('T')[0]
    console.log('[analyze-errors] Updating user progress for date:', today)

    // Get existing progress for today using service role client
    console.log('[analyze-errors] Checking for existing progress...')
    const { data: existingProgress, error: progressFetchError } = await dbClient
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle()
    
    if (progressFetchError) {
      console.error('[analyze-errors] Error fetching progress:', progressFetchError)
    }
    
    console.log('[analyze-errors] Existing progress:', existingProgress)

    if (existingProgress) {
      // Update existing progress
      console.log('[analyze-errors] Updating existing progress record...')
      const updatedErrorCounts = { ...existingProgress.error_counts }
      Object.entries(errorCounts).forEach(([type, count]) => {
        updatedErrorCounts[type] = (updatedErrorCounts[type] || 0) + count
      })

      const updateData = {
        total_speaking_time: existingProgress.total_speaking_time + (duration || 0),
        total_messages: existingProgress.total_messages + 1,
        error_counts: updatedErrorCounts,
        improvement_areas: PRIMARY_ERROR_TYPES.filter((type) => updatedErrorCounts[type] > 0),
        updated_at: new Date().toISOString(),
      }
      
      console.log('[analyze-errors] Progress update data:', updateData)

      const { error: updateError } = await dbClient
        .from('user_progress')
        .update(updateData)
        .eq('id', existingProgress.id)
      
      if (updateError) {
        console.error('[analyze-errors] Error updating progress:', updateError)
      } else {
        console.log('[analyze-errors] Progress updated successfully')
      }
    } else {
      // Create new progress entry
      console.log('[analyze-errors] Creating new progress record...')
      
      const insertData = {
        user_id: userId,
        date: today,
        total_speaking_time: duration || 0,
        total_messages: 1,
        error_counts: errorCounts,
        improvement_areas: PRIMARY_ERROR_TYPES.filter((type) => errorCounts[type] > 0),
      }
      
      console.log('[analyze-errors] Progress insert data:', insertData)
      
      const { error: insertError } = await dbClient
        .from('user_progress')
        .insert(insertData)
      
      if (insertError) {
        console.error('[analyze-errors] Error inserting progress:', insertError)
      } else {
        console.log('[analyze-errors] Progress created successfully')
      }
    }

    const response = {
      success: true,
      correctionId: correction?.id,
      errorCount: errorTypes.length,
      primaryErrors: errorTypes.filter((type) => PRIMARY_ERROR_TYPES.includes(type)),
    }
    
    console.log('[analyze-errors] Returning success response:', response)
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('[analyze-errors] API error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json({ error: 'Failed to analyze errors' }, { status: 500 })
  }
}
