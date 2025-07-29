'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import type { Database } from '@/types/database'

type UserProgress = Database['public']['Tables']['user_progress']['Row']
type Correction = Database['public']['Tables']['corrections']['Row']

export default function ReportsPage() {
  const { user } = useAuth()
  const [monthProgress, setMonthProgress] = useState<UserProgress[]>([])
  const [corrections, setCorrections] = useState<Correction[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('week') // week, month, all

  useEffect(() => {
    if (user) {
      loadReportData()
    }
  }, [user, dateRange])

  const loadReportData = async () => {
    if (!user) return

    try {
      let startDate = new Date()

      switch (dateRange) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1)
          break
        case 'all':
          startDate = new Date('2024-01-01') // Or user's signup date
          break
      }

      const startDateStr = startDate.toISOString().split('T')[0]

      // Load progress data
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDateStr)
        .order('date', { ascending: true })

      if (progressData) {
        setMonthProgress(progressData)
      }

      // Load corrections
      const { data: correctionsData } = await supabase
        .from('corrections')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })

      if (correctionsData) {
        setCorrections(correctionsData)
      }
    } catch (error) {
      console.error('Error loading report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m ${remainingSeconds}s`
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

  const getProgressSummary = () => {
    const totalTime = monthProgress.reduce((sum, day) => sum + day.total_speaking_time, 0)
    const totalMessages = monthProgress.reduce((sum, day) => sum + day.total_messages, 0)

    const errorTotals: Record<string, number> = {}
    monthProgress.forEach((day) => {
      Object.entries(day.error_counts as Record<string, number>).forEach(([type, count]) => {
        errorTotals[type] = (errorTotals[type] || 0) + count
      })
    })

    const topErrors = Object.entries(errorTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)

    return { totalTime, totalMessages, topErrors }
  }

  const generateReportText = () => {
    const summary = getProgressSummary()
    const reportDate = new Date().toLocaleDateString()

    let report = `Just Speak - Progress Report\n`
    report += `Generated: ${reportDate}\n`
    report += `Student: ${user?.email}\n`
    report += `Period: Last ${dateRange}\n\n`

    report += `SUMMARY\n`
    report += `Total Speaking Time: ${formatTime(summary.totalTime)}\n`
    report += `Total Messages: ${summary.totalMessages}\n\n`

    report += `TOP AREAS FOR IMPROVEMENT\n`
    summary.topErrors.forEach(([type, count], index) => {
      report += `${index + 1}. ${getErrorTypeLabel(type)}: ${count} occurrences\n`
    })

    report += `\nRECENT CORRECTIONS\n`
    corrections.slice(0, 10).forEach((correction, index) => {
      report += `\n${index + 1}. Original: "${correction.original_text}"\n`
      report += `   Corrected: "${correction.corrected_text}"\n`
      report += `   Error types: ${correction.error_types.map((t) => getErrorTypeLabel(t)).join(', ')}\n`
    })

    report += `\nRECOMMENDATIONS\n`
    report += `1. Continue daily practice to maintain momentum\n`
    report += `2. Focus on ${getErrorTypeLabel(summary.topErrors[0]?.[0] || 'word_order')} exercises\n`
    report += `3. Aim for at least 10 minutes of speaking practice per day\n`

    return report
  }

  const downloadReport = () => {
    const report = generateReportText()
    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `JustSpeak_Report_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <div className="text-text-secondary">Loading report data...</div>
      </div>
    )
  }

  const summary = getProgressSummary()

  return (
    <div className="min-h-screen bg-bg-secondary">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-border-light px-4 py-3">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-primary">Progress Report</h1>
            <p className="text-sm text-text-secondary">
              Detailed analysis of your speaking practice
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-primary hover:underline">
              ← Back to Dashboard
            </Link>
            <button onClick={downloadReport} className="btn-primary">
              Download Report
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setDateRange('week')}
              className={`px-4 py-2 rounded ${dateRange === 'week' ? 'bg-primary text-white' : 'bg-bg-secondary text-text-primary'}`}
            >
              Last Week
            </button>
            <button
              onClick={() => setDateRange('month')}
              className={`px-4 py-2 rounded ${dateRange === 'month' ? 'bg-primary text-white' : 'bg-bg-secondary text-text-primary'}`}
            >
              Last Month
            </button>
            <button
              onClick={() => setDateRange('all')}
              className={`px-4 py-2 rounded ${dateRange === 'all' ? 'bg-primary text-white' : 'bg-bg-secondary text-text-primary'}`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-bg-secondary rounded-lg">
              <div className="text-3xl font-bold text-primary">{formatTime(summary.totalTime)}</div>
              <div className="text-sm text-text-secondary">Total Speaking Time</div>
            </div>
            <div className="text-center p-4 bg-bg-secondary rounded-lg">
              <div className="text-3xl font-bold text-primary">{summary.totalMessages}</div>
              <div className="text-sm text-text-secondary">Total Messages</div>
            </div>
            <div className="text-center p-4 bg-bg-secondary rounded-lg">
              <div className="text-3xl font-bold text-primary">
                {monthProgress.length > 0
                  ? Math.round(summary.totalTime / monthProgress.length / 60)
                  : 0}
              </div>
              <div className="text-sm text-text-secondary">Avg Minutes/Day</div>
            </div>
          </div>
        </div>

        {/* Error Analysis */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Error Analysis</h2>
          {summary.topErrors.length > 0 ? (
            <div className="space-y-4">
              {summary.topErrors.map(([type, count]) => {
                const total = corrections.filter((c) => c.error_types.includes(type)).length
                const percentage = total > 0 ? Math.round((count / total) * 100) : 0

                return (
                  <div key={type}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-text-primary">
                        {getErrorTypeLabel(type)}
                      </span>
                      <span className="text-sm text-text-secondary">{count} occurrences</span>
                    </div>
                    <div className="w-full bg-bg-secondary rounded-full h-3">
                      <div
                        className="bg-primary h-3 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-text-secondary">No errors found yet. Keep practicing!</p>
          )}
        </div>

        {/* Sample Corrections */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Corrections</h2>
          {corrections.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {corrections.slice(0, 10).map((correction) => {
                const analysis = correction.analysis as any
                return (
                  <div
                    key={correction.id}
                    className="border-b border-border-light pb-4 last:border-0"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-text-muted mb-1">Original:</p>
                        <p className="text-sm text-text-secondary">{correction.original_text}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-muted mb-1">Corrected:</p>
                        <p className="text-sm text-success font-medium">
                          {correction.corrected_text}
                        </p>
                      </div>
                    </div>
                    {analysis?.summary && (
                      <p className="text-xs text-text-muted mt-2">{analysis.summary}</p>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-text-secondary">No corrections recorded yet.</p>
          )}
        </div>

        {/* Recommendations */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">Recommendations</h3>
          <ul className="space-y-2 text-blue-700">
            <li>
              • Keep up the great work! You've spoken for {formatTime(summary.totalTime)} total.
            </li>
            {summary.topErrors[0] && (
              <li>
                • Focus on {getErrorTypeLabel(summary.topErrors[0][0])} - this is your most common
                error type.
              </li>
            )}
            <li>• Try to maintain at least 10 minutes of practice daily for best results.</li>
            <li>• Remember: communication is more important than perfection!</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
