'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import type { Database } from '@/types/database'

type Session = Database['public']['Tables']['sessions']['Row']
type Message = Database['public']['Tables']['messages']['Row']
type Correction = Database['public']['Tables']['corrections']['Row']

// ESL Error Hierarchy levels
const ESL_HIERARCHY = {
  1: ['word_order'],
  2: ['word_form'],
  3: ['verb_tense'],
  4: ['prepositions'],
  5: ['articles', 'agreement'],
  6: ['pronouns'],
  7: ['spelling', 'punctuation'],
}

const getErrorLevel = (errorType: string): number => {
  for (const [level, types] of Object.entries(ESL_HIERARCHY)) {
    if (types.includes(errorType)) {
      return parseInt(level)
    }
  }
  return 8 // Other errors
}

const getErrorTypeLabel = (type: string): string => {
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
    return (
      date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' +
      date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    )
  }
}

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export default function FeedbackPage() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [corrections, setCorrections] = useState<Correction[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)

  // Load sessions when user changes or when page becomes visible
  useEffect(() => {
    if (user) {
      loadSessions()

      // Refresh when page becomes visible
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          console.log('[Feedback] Page visible, refreshing sessions')
          loadSessions()
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)

      // Also refresh when window gains focus
      const handleFocus = () => {
        console.log('[Feedback] Window focused, refreshing sessions')
        loadSessions()
      }

      window.addEventListener('focus', handleFocus)

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('focus', handleFocus)
      }
    }
  }, [user])

  useEffect(() => {
    if (selectedSession) {
      loadSessionData(selectedSession.id)
    }
  }, [selectedSession])

  const loadSessions = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      if (data) {
        console.log('[Feedback] Loaded sessions:', data.length)
        setSessions(data)

        // If we have a selected session, check if it's still in the new data
        if (selectedSession) {
          const stillExists = data.find((s) => s.id === selectedSession.id)
          if (stillExists) {
            // Update the selected session with fresh data
            setSelectedSession(stillExists)
          } else {
            // Session no longer exists, select the most recent
            if (data.length > 0) {
              setSelectedSession(data[0])
            } else {
              setSelectedSession(null)
            }
          }
        } else if (data.length > 0) {
          // No session selected, auto-select the most recent
          setSelectedSession(data[0])
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSessionData = async (sessionId: string) => {
    setLoadingMessages(true)
    try {
      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (messagesError) throw messagesError
      
      // Debug logging to understand timestamp mismatch
      if (messagesData && messagesData.length > 0 && selectedSession) {
        console.log('[Feedback] Session vs Messages timestamps:', {
          sessionCreatedAt: selectedSession.created_at,
          sessionTime: new Date(selectedSession.created_at).toLocaleString(),
          firstMessageCreatedAt: messagesData[0].created_at,
          firstMessageTime: new Date(messagesData[0].created_at).toLocaleString(),
          timeDiff: new Date(messagesData[0].created_at).getTime() - new Date(selectedSession.created_at).getTime(),
          timeDiffMinutes: (new Date(messagesData[0].created_at).getTime() - new Date(selectedSession.created_at).getTime()) / 1000 / 60,
        })
      }
      
      setMessages(messagesData || [])

      // Load corrections for this session
      const { data: correctionsData, error: correctionsError } = await supabase
        .from('corrections')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (correctionsError) throw correctionsError
      setCorrections(correctionsData || [])
    } catch (error) {
      console.error('Error loading session data:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  const getTopImprovementAreas = () => {
    if (corrections.length === 0) return []

    // Count errors by type and level
    const errorCounts: Record<string, number> = {}
    corrections.forEach((correction) => {
      correction.error_types.forEach((type) => {
        errorCounts[type] = (errorCounts[type] || 0) + 1
      })
    })

    // Sort by hierarchy level first, then by count
    const sortedErrors = Object.entries(errorCounts).sort(([typeA, countA], [typeB, countB]) => {
      const levelA = getErrorLevel(typeA)
      const levelB = getErrorLevel(typeB)
      if (levelA !== levelB) return levelA - levelB
      return countB - countA
    })

    // Take top 3, prioritizing levels 1-4
    const topErrors = sortedErrors.filter(([type]) => getErrorLevel(type) <= 4).slice(0, 3)

    // If we don't have 3 errors from levels 1-4, add from higher levels
    if (topErrors.length < 3) {
      const additionalErrors = sortedErrors
        .filter(([type]) => getErrorLevel(type) > 4)
        .slice(0, 3 - topErrors.length)
      topErrors.push(...additionalErrors)
    }

    return topErrors.map(([type, count]) => ({ type, count, level: getErrorLevel(type) }))
  }

  const generateFeedbackDocument = () => {
    if (!selectedSession || messages.length === 0) return ''

    const sessionDate = new Date(selectedSession.created_at).toLocaleDateString()
    const topAreas = getTopImprovementAreas()

    let doc = `JUST SPEAK - FEEDBACK DOCUMENT\n`
    doc += `Session Date: ${sessionDate}\n`
    doc += `Total Speaking Time: ${Math.floor(selectedSession.total_speaking_time / 60)} minutes\n`
    doc += `\n${'='.repeat(50)}\n\n`

    // Conversation Transcript
    doc += `CONVERSATION TRANSCRIPT\n`
    doc += `${'='.repeat(50)}\n\n`

    messages.forEach((message, index) => {
      const time = new Date(message.created_at).toLocaleTimeString()
      doc += `[${time}] ${message.speaker}:\n${message.content}\n\n`
    })

    // Corrections Section
    if (corrections.length > 0) {
      doc += `\n${'='.repeat(50)}\n\n`
      doc += `CORRECTIONS\n`
      doc += `${'='.repeat(50)}\n\n`

      corrections.forEach((correction, index) => {
        doc += `${index + 1}. Original: "${correction.original_text}"\n`
        doc += `   Corrected: "${correction.corrected_text}"\n`
        doc += `   Error Types: ${correction.error_types.map((t) => getErrorTypeLabel(t)).join(', ')}\n\n`
      })
    }

    // Improvement Summary
    doc += `\n${'='.repeat(50)}\n\n`
    doc += `TOP 3 AREAS TO FOCUS ON\n`
    doc += `${'='.repeat(50)}\n\n`

    if (topAreas.length > 0) {
      topAreas.forEach((area, index) => {
        doc += `${index + 1}. ${getErrorTypeLabel(area.type)} (Level ${area.level})\n`
        doc += `   Occurrences: ${area.count}\n`

        // Add specific advice based on error type
        switch (area.type) {
          case 'word_order':
            doc += `   Tip: Practice Subject-Verb-Object sentence structure\n`
            break
          case 'word_form':
            doc += `   Tip: Pay attention to using correct forms of words (noun/verb/adjective)\n`
            break
          case 'verb_tense':
            doc += `   Tip: Focus on when actions happen (past/present/future)\n`
            break
          case 'prepositions':
            doc += `   Tip: Practice common preposition combinations (in/on/at)\n`
            break
        }
        doc += '\n'
      })
    } else {
      doc += 'Great job! Keep practicing to maintain your skills.\n'
    }

    doc += `\n${'='.repeat(50)}\n\n`
    doc += `RECOMMENDATIONS\n`
    doc += `${'='.repeat(50)}\n\n`
    doc += `1. Continue daily practice sessions of at least 10 minutes\n`
    doc += `2. Focus on the top error areas identified above\n`
    doc += `3. Remember: Communication is more important than perfection!\n`

    return doc
  }

  const downloadFeedback = () => {
    const content = generateFeedbackDocument()
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `JustSpeak_Feedback_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <div className="text-text-secondary">Loading feedback data...</div>
      </div>
    )
  }

  const topAreas = getTopImprovementAreas()

  return (
    <div className="min-h-screen bg-bg-secondary">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-border-light px-4 py-3">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-primary">Speaking Feedback</h1>
            <p className="text-sm text-text-secondary">
              Review your conversations and improvement areas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-primary hover:underline">
              ← Back to Dashboard
            </Link>
            {selectedSession && messages.length > 0 && (
              <button onClick={downloadFeedback} className="btn-primary">
                Download Feedback
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Session Selector */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <label className="block text-sm font-medium text-text-primary mb-2">
            Select a Practice Session:
          </label>
          <select
            value={selectedSession?.id || ''}
            onChange={(e) => {
              const session = sessions.find((s) => s.id === e.target.value)
              setSelectedSession(session || null)
            }}
            className="w-full p-2 border border-border-light rounded"
          >
            <option value="">Choose a session...</option>
            {sessions.map((session) => {
              // Use the session's created_at for now, but ideally we'd use the first message time
              const sessionTime = session.created_at
              return (
                <option key={session.id} value={session.id}>
                  {formatDateTime(sessionTime)} - Duration:{' '}
                  {formatDuration(session.total_speaking_time)}
                </option>
              )
            })}
          </select>
        </div>

        {loadingMessages ? (
          <div className="text-center py-8 text-text-secondary">Loading session data...</div>
        ) : selectedSession && messages.length > 0 ? (
          <>
            {/* Improvement Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Top 3 Areas to Focus On
              </h2>
              {topAreas.length > 0 ? (
                <div className="space-y-4">
                  {topAreas.map((area, index) => (
                    <div key={area.type} className="border-l-4 border-primary pl-4">
                      <h3 className="font-medium text-text-primary">
                        {index + 1}. {getErrorTypeLabel(area.type)} (Level {area.level})
                      </h3>
                      <p className="text-sm text-text-secondary">
                        {area.count} occurrences in this session
                      </p>
                      <p className="text-sm text-success mt-1">
                        {area.type === 'word_order' &&
                          'Tip: Practice Subject-Verb-Object sentence structure'}
                        {area.type === 'word_form' &&
                          'Tip: Pay attention to using correct forms of words'}
                        {area.type === 'verb_tense' &&
                          'Tip: Focus on when actions happen (past/present/future)'}
                        {area.type === 'prepositions' &&
                          'Tip: Practice common preposition combinations'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-secondary">
                  Great job! No significant errors found. Keep practicing!
                </p>
              )}
            </div>

            {/* Conversation Transcript */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Conversation Transcript
              </h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-3 rounded ${
                      message.speaker === 'USER' ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'
                    }`}
                  >
                    <div className="text-xs text-text-muted mb-1">
                      {message.speaker} - {new Date(message.created_at).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit', 
                        second: '2-digit',
                        hour12: true 
                      })}
                    </div>
                    <div className="text-sm text-text-primary">{message.content}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Corrections */}
            {corrections.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Corrections</h2>
                <div className="space-y-4">
                  {corrections.map((correction, index) => (
                    <div
                      key={correction.id}
                      className="border-b border-border-light pb-4 last:border-0"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-text-muted mb-1">Your version:</p>
                          <p className="text-sm text-text-secondary">
                            "{correction.original_text}"
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-text-muted mb-1">Corrected version:</p>
                          <p className="text-sm text-success font-medium">
                            "{correction.corrected_text}"
                          </p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs text-text-muted">
                          Error types:{' '}
                          {correction.error_types.map((t) => getErrorTypeLabel(t)).join(', ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : selectedSession ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-text-secondary">No messages found for this session.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-text-secondary">Please select a session to view feedback.</p>
          </div>
        )}
      </div>
    </div>
  )
}
