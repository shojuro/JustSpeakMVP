import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Check if corrections table exists
    const { data: corrections, error: correctionsError } = await supabase
      .from('corrections')
      .select('id')
      .limit(1)
    
    // Check if user_progress table exists
    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .select('id')
      .limit(1)
    
    return NextResponse.json({
      tables: {
        corrections: {
          exists: !correctionsError || correctionsError.code !== 'PGRST116',
          error: correctionsError?.message || null,
          errorCode: correctionsError?.code || null,
        },
        user_progress: {
          exists: !progressError || progressError.code !== 'PGRST116',
          error: progressError?.message || null,
          errorCode: progressError?.code || null,
        },
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[check-tables] Error:', error)
    return NextResponse.json({ error: 'Failed to check tables' }, { status: 500 })
  }
}