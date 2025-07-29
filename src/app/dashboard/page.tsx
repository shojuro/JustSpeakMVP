'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import type { Database } from '@/types/database'

type UserProgress = Database['public']['Tables']['user_progress']['Row']
type Correction = Database['public']['Tables']['corrections']['Row']

export default function DashboardPage() {
  const { user } = useAuth()
  const [todayProgress, setTodayProgress] = useState<UserProgress | null>(null)
  const [weekProgress, setWeekProgress] = useState<UserProgress[]>([])
  const [recentCorrections, setRecentCorrections] = useState<Correction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    try {
      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Load today's progress
      const { data: todayData } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single()

      if (todayData) {
        setTodayProgress(todayData)
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
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
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
      </div>
    </div>
  )
}
