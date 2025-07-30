'use client'

import { useEffect, useState, Suspense } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { Database } from '@/types/database'

type UserProgress = Database['public']['Tables']['user_progress']['Row']
type Correction = Database['public']['Tables']['corrections']['Row']
type Session = Database['public']['Tables']['sessions']['Row']

interface DebugInfo {
  progressDebug?: any
  correctionsDebug?: any
  errors: string[]
  timestamp: string
}

function DashboardContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const isDebugMode = searchParams.get('debug') === 'true'
  
  const [todayProgress, setTodayProgress] = useState<UserProgress | null>(null)
  const [weekProgress, setWeekProgress] = useState<UserProgress[]>([])
  const [recentCorrections, setRecentCorrections] = useState<Correction[]>([])
  const [recentSessions, setRecentSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    errors: [],
    timestamp: new Date().toISOString(),
  })

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    const newDebugInfo: DebugInfo = {
      errors: [],
      timestamp: new Date().toISOString(),
    }

    try {
      const now = new Date()
      // Use UTC dates for consistency with analyze-errors
      const utcYear = now.getUTCFullYear()
      const utcMonth = String(now.getUTCMonth() + 1).padStart(2, '0')
      const utcDay = String(now.getUTCDate()).padStart(2, '0')
      const today = `${utcYear}-${utcMonth}-${utcDay}`
      
      const weekAgoDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const weekAgoYear = weekAgoDate.getUTCFullYear()
      const weekAgoMonth = String(weekAgoDate.getUTCMonth() + 1).padStart(2, '0')
      const weekAgoDay = String(weekAgoDate.getUTCDate()).padStart(2, '0')
      const weekAgo = `${weekAgoYear}-${weekAgoMonth}-${weekAgoDay}`
      
      console.log('[Dashboard] Date calculation:', {
        clientTime: now.toISOString(),
        clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        utcTime: now.toUTCString(),
        todayDate: today,
        weekAgoDate: weekAgo,
        timestamp: now.getTime(),
        utcComponents: { year: utcYear, month: utcMonth, day: utcDay },
      })

      // If debug mode, fetch debug data
      if (isDebugMode) {
        try {
          console.log('[Dashboard Debug] Fetching debug data...')
          
          // Fetch progress debug info
          const progressDebugResponse = await fetch(`/api/debug-progress?userId=${user.id}`)
          if (progressDebugResponse.ok) {
            newDebugInfo.progressDebug = await progressDebugResponse.json()
            console.log('[Dashboard Debug] Progress debug:', newDebugInfo.progressDebug)
          } else {
            newDebugInfo.errors.push(`Progress debug failed: ${progressDebugResponse.status}`)
          }

          // Fetch corrections debug info
          const correctionsDebugResponse = await fetch(`/api/debug-corrections?userId=${user.id}`)
          if (correctionsDebugResponse.ok) {
            newDebugInfo.correctionsDebug = await correctionsDebugResponse.json()
            console.log('[Dashboard Debug] Corrections debug:', newDebugInfo.correctionsDebug)
          } else {
            newDebugInfo.errors.push(`Corrections debug failed: ${correctionsDebugResponse.status}`)
          }
        } catch (error) {
          console.error('[Dashboard Debug] Error fetching debug data:', error)
          newDebugInfo.errors.push(`Debug fetch error: ${error instanceof Error ? error.message : 'Unknown'}`)
        }
      }

      // Load today's progress
      console.log(`[Dashboard] Loading today's progress for ${today}...`)
      const { data: todayData, error: todayError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle()

      if (todayError) {
        console.error('[Dashboard] Error loading today\'s progress:', todayError)
        newDebugInfo.errors.push(`Today's progress: ${todayError.message}`)
      } else {
        console.log('[Dashboard] Today\'s progress:', todayData)
        if (todayData) {
          setTodayProgress(todayData)
        }
      }

      // Load today's actual speaking time from sessions
      console.log(`[Dashboard] Loading today's sessions for accurate speaking time...`)
      const todayStart = new Date(today + 'T00:00:00.000Z')
      const todayEnd = new Date(today + 'T23:59:59.999Z')
      
      const { data: todaySessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, total_speaking_time')
        .eq('user_id', user.id)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString())

      if (sessionsError) {
        console.error('[Dashboard] Error loading today\'s sessions:', sessionsError)
        newDebugInfo.errors.push(`Today's sessions: ${sessionsError.message}`)
      } else {
        console.log('[Dashboard] Today\'s sessions:', todaySessions)
        // Calculate total speaking time from sessions
        const totalSpeakingTime = todaySessions?.reduce((sum, session) => sum + (session.total_speaking_time || 0), 0) || 0
        console.log('[Dashboard] Calculated total speaking time:', totalSpeakingTime)
        
        // Load today's message count
        let messageCount = 0
        if (todaySessions && todaySessions.length > 0) {
          const sessionIds = todaySessions.map(s => s.id)
          const { count, error: messagesError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('speaker', 'USER')
            .in('session_id', sessionIds)

          if (messagesError) {
            console.error('[Dashboard] Error loading message count:', messagesError)
            newDebugInfo.errors.push(`Message count: ${messagesError.message}`)
          } else {
            messageCount = count || 0
          }
        }
        console.log('[Dashboard] Today\'s message count:', messageCount)

        // Update or create today's progress with accurate data
        if (todayData) {
          setTodayProgress({
            ...todayData,
            total_speaking_time: totalSpeakingTime,
            total_messages: messageCount,
          })
        } else {
          // Create a temporary progress object for display
          setTodayProgress({
            id: 'temp',
            user_id: user.id,
            date: today,
            total_speaking_time: totalSpeakingTime,
            total_messages: messageCount,
            error_counts: {},
            improvement_areas: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any)
        }
      }

      // Load week's progress
      const { data: weekData } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', weekAgo)
        .order('date', { ascending: false })

      if (weekData) {
        setWeekProgress(weekData)
      }

      // Load recent corrections
      const { data: correctionsData } = await supabase
        .from('corrections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (correctionsData) {
        setRecentCorrections(correctionsData)
      }

      // Load recent sessions
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (sessionsData) {
        setRecentSessions(sessionsData)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      newDebugInfo.errors.push(`General error: ${error instanceof Error ? error.message : 'Unknown'}`)
    } finally {
      setLoading(false)
      if (isDebugMode) {
        setDebugInfo(newDebugInfo)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' at ' + 
             date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    }
  }

  const getErrorTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      word_order: 'Word Order',
      word_form: 'Word Form',
      verb_tense: 'Verb Tense',
      prepositions: 'Prepositions',
      articles: 'Articles',
      agreement: 'Agreement',
      pronouns: 'Pronouns',
      spelling: 'Spelling',
      punctuation: 'Punctuation',
    }
    return labels[type] || type
  }

  const getTotalSpeakingTime = () => {
    return weekProgress.reduce((total, day) => total + day.total_speaking_time, 0)
  }

  const getTopErrors = () => {
    const errorTotals: Record<string, number> = {}
    weekProgress.forEach((day) => {
      Object.entries(day.error_counts as Record<string, number>).forEach(([type, count]) => {
        errorTotals[type] = (errorTotals[type] || 0) + count
      })
    })

    return Object.entries(errorTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([type, count]) => ({ type, count }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <div className="text-text-secondary">Loading your progress...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-secondary">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-border-light px-4 py-3">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-primary">Speaking Progress Dashboard</h1>
            <p className="text-sm text-text-secondary">Track your English improvement</p>
          </div>
          <Link href="/chat" className="btn-primary">
            Continue Practice
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Today's Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Today's Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-bg-secondary rounded-lg">
              <div className="text-3xl font-bold text-primary">
                {formatTime(todayProgress?.total_speaking_time || 0)}
              </div>
              <div className="text-sm text-text-secondary">Speaking Time</div>
            </div>
            <div className="text-center p-4 bg-bg-secondary rounded-lg">
              <div className="text-3xl font-bold text-primary">
                {todayProgress?.total_messages || 0}
              </div>
              <div className="text-sm text-text-secondary">Messages</div>
            </div>
            <div className="text-center p-4 bg-bg-secondary rounded-lg">
              <div className="text-3xl font-bold text-primary">
                {todayProgress?.improvement_areas?.length || 0}
              </div>
              <div className="text-sm text-text-secondary">Areas to Improve</div>
            </div>
          </div>
          {/* View Feedback Button */}
          <div className="mt-4 text-center">
            <Link href="/feedback" className="btn-primary inline-block">
              View Conversation Feedback
            </Link>
          </div>
        </div>

        {/* Recent Conversations */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Conversations</h2>
          {recentSessions.length > 0 ? (
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex justify-between items-center p-3 bg-bg-secondary rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-text-primary">
                      {formatDateTime(session.created_at)}
                    </div>
                    <div className="text-xs text-text-secondary">
                      Duration: {formatTime(session.total_speaking_time)}
                      {session.ended_at ? ' • Completed' : ' • In Progress'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/feedback?session=${session.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      View Feedback
                    </Link>
                    {!session.ended_at && (
                      <Link
                        href="/chat"
                        className="text-sm text-success hover:underline"
                      >
                        Continue
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No conversations yet. Start practicing!</p>
          )}
          <Link
            href="/feedback"
            className="text-sm text-primary hover:underline mt-4 inline-block"
          >
            View all conversations →
          </Link>
        </div>

        {/* Week Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">This Week</h2>
          <div className="mb-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">
                {formatTime(getTotalSpeakingTime())}
              </div>
              <div className="text-sm text-text-secondary">Total Speaking Time</div>
            </div>
          </div>

          {/* Top Error Types */}
          {getTopErrors().length > 0 && (
            <div>
              <h3 className="text-md font-medium text-text-primary mb-3">Areas for Improvement</h3>
              <div className="space-y-2">
                {getTopErrors().map(({ type, count }) => (
                  <div
                    key={type}
                    className="flex justify-between items-center p-3 bg-bg-secondary rounded"
                  >
                    <span className="text-text-primary">{getErrorTypeLabel(type)}</span>
                    <span className="text-sm text-text-secondary">{count} occurrences</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Corrections */}
        {recentCorrections.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Corrections</h2>
            <div className="space-y-4">
              {recentCorrections.map((correction) => (
                <div key={correction.id} className="border-l-4 border-primary pl-4 py-2">
                  <div className="text-sm text-text-secondary mb-1">
                    You said: "{correction.original_text}"
                  </div>
                  <div className="text-sm text-success font-medium">
                    Better: "{correction.corrected_text}"
                  </div>
                  {correction.error_types.length > 0 && (
                    <div className="text-xs text-text-muted mt-1">
                      Types: {correction.error_types.map((t) => getErrorTypeLabel(t)).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Link
              href="/reports"
              className="text-sm text-primary hover:underline mt-4 inline-block"
            >
              View detailed report →
            </Link>
          </div>
        )}

        {/* Encouragement */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-blue-800">
            Great job practicing! Remember, the more you speak, the more confident you'll become.
            Focus on communicating your ideas - perfection comes with time.
          </p>
        </div>

        {/* Debug Panel */}
        {isDebugMode && (
          <div className="bg-gray-900 text-gray-100 rounded-lg p-6 font-mono text-sm">
            <h2 className="text-lg font-semibold mb-4 text-yellow-400">Debug Information</h2>
            
            {/* Debug Controls */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
              >
                Refresh Data
              </button>
              <a
                href={`/api/debug-progress?userId=${user?.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
              >
                Progress API
              </a>
              <a
                href={`/api/debug-corrections?userId=${user?.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
              >
                Corrections API
              </a>
            </div>

            {/* Errors */}
            {debugInfo.errors.length > 0 && (
              <div className="mb-4">
                <h3 className="text-red-400 font-semibold mb-2">Errors:</h3>
                <ul className="list-disc list-inside">
                  {debugInfo.errors.map((error, index) => (
                    <li key={index} className="text-red-300">{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Progress Debug */}
            {debugInfo.progressDebug && (
              <div className="mb-4">
                <h3 className="text-green-400 font-semibold mb-2">User Progress Debug:</h3>
                <div className="bg-gray-800 p-3 rounded overflow-auto max-h-96">
                  <pre className="text-xs">{JSON.stringify(debugInfo.progressDebug, null, 2)}</pre>
                </div>
              </div>
            )}

            {/* Corrections Debug */}
            {debugInfo.correctionsDebug && (
              <div className="mb-4">
                <h3 className="text-green-400 font-semibold mb-2">Corrections Debug:</h3>
                <div className="bg-gray-800 p-3 rounded overflow-auto max-h-96">
                  <pre className="text-xs">{JSON.stringify(debugInfo.correctionsDebug, null, 2)}</pre>
                </div>
              </div>
            )}

            {/* Current Data */}
            <div className="mb-4">
              <h3 className="text-blue-400 font-semibold mb-2">Current Dashboard Data:</h3>
              <div className="bg-gray-800 p-3 rounded overflow-auto max-h-96">
                <pre className="text-xs">{JSON.stringify({
                  todayProgress,
                  weekProgressCount: weekProgress.length,
                  recentCorrectionsCount: recentCorrections.length,
                  recentSessionsCount: recentSessions.length,
                  userId: user?.id,
                  timestamp: debugInfo.timestamp,
                }, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-secondary flex items-center justify-center">
      <div className="text-text-secondary">Loading dashboard...</div>
    </div>}>
      <DashboardContent />
    </Suspense>
  )
}
