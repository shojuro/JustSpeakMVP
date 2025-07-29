import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  console.log('[User Progress API] Called')

  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[User Progress API] Auth error:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { speakingTime, sessionId } = body

    console.log('[User Progress API] Request:', {
      userId: user.id,
      speakingTime,
      sessionId,
    })

    if (typeof speakingTime !== 'number' || speakingTime < 0) {
      return NextResponse.json({ error: 'Invalid speaking time' }, { status: 400 })
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]

    // Check if progress record exists for today
    const { data: existingProgress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle()

    if (existingProgress) {
      // Update existing record
      const { data: updated, error: updateError } = await supabase
        .from('user_progress')
        .update({
          total_speaking_time: existingProgress.total_speaking_time + speakingTime,
          total_messages: existingProgress.total_messages + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProgress.id)
        .select()

      if (updateError) {
        console.error('[User Progress API] Update error:', updateError)
        throw updateError
      }

      console.log('[User Progress API] Updated progress:', updated)
      return NextResponse.json({ success: true, progress: updated?.[0] || updated })
    } else {
      // Create new record for today
      const { data: created, error: createError } = await supabase
        .from('user_progress')
        .insert({
          user_id: user.id,
          date: today,
          total_speaking_time: speakingTime,
          total_messages: 1,
          error_counts: {},
          improvement_areas: [],
        })
        .select()

      if (createError) {
        console.error('[User Progress API] Create error:', createError)
        throw createError
      }

      console.log('[User Progress API] Created progress:', created)
      return NextResponse.json({ success: true, progress: created?.[0] || created })
    }
  } catch (error: any) {
    console.error('[User Progress API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update progress' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  console.log('[User Progress API] GET called')

  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[User Progress API] Auth error:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get date range from query params
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '7')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]

    // Get progress data
    const { data: progress, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDateStr)
      .order('date', { ascending: false })

    if (error) {
      console.error('[User Progress API] Query error:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      progress: progress || [],
      userId: user.id,
    })
  } catch (error: any) {
    console.error('[User Progress API] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to get progress' }, { status: 500 })
  }
}
