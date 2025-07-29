import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { securityLogger, SecurityEventType } from '@/lib/securityLogger'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
  try {
    const { messageId, userId, sessionId, content, duration } = await request.json()

    if (!messageId || !userId || !sessionId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get Supabase client
    const supabase = await createClient()

    // Verify user owns the session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session || session.user_id !== userId) {
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

    const completion = await openai.chat.completions.create({
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

    const analysis = JSON.parse(completion.choices[0]?.message?.content || '{}')

    // Count errors by type
    const errorCounts: Record<string, number> = {}
    const errorTypes: string[] = []

    analysis.errors?.forEach((error: any) => {
      if (error.type) {
        errorTypes.push(error.type)
        errorCounts[error.type] = (errorCounts[error.type] || 0) + 1
      }
    })

    // Save correction to database
    const { data: correction, error: correctionError } = await supabase
      .from('corrections')
      .insert({
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
      })
      .select()
      .single()

    if (correctionError) {
      console.error('Error saving correction:', correctionError)
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 })
    }

    // Update user progress
    const today = new Date().toISOString().split('T')[0]

    // Get existing progress for today
    const { data: existingProgress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle()

    if (existingProgress) {
      // Update existing progress
      const updatedErrorCounts = { ...existingProgress.error_counts }
      Object.entries(errorCounts).forEach(([type, count]) => {
        updatedErrorCounts[type] = (updatedErrorCounts[type] || 0) + count
      })

      await supabase
        .from('user_progress')
        .update({
          total_speaking_time: existingProgress.total_speaking_time + (duration || 0),
          total_messages: existingProgress.total_messages + 1,
          error_counts: updatedErrorCounts,
          improvement_areas: PRIMARY_ERROR_TYPES.filter((type) => updatedErrorCounts[type] > 0),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProgress.id)
    } else {
      // Create new progress entry
      await supabase.from('user_progress').insert({
        user_id: userId,
        date: today,
        total_speaking_time: duration || 0,
        total_messages: 1,
        error_counts: errorCounts,
        improvement_areas: PRIMARY_ERROR_TYPES.filter((type) => errorCounts[type] > 0),
      })
    }

    return NextResponse.json({
      success: true,
      correctionId: correction?.id,
      errorCount: errorTypes.length,
      primaryErrors: errorTypes.filter((type) => PRIMARY_ERROR_TYPES.includes(type)),
    })
  } catch (error) {
    console.error('Error analysis API error:', error)
    return NextResponse.json({ error: 'Failed to analyze errors' }, { status: 500 })
  }
}
