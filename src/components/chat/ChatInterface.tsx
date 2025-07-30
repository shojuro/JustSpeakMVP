'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import MessageBubble from './MessageBubble'
import SpeakButton from './SpeakButton'
import SpeakingTimer from './SpeakingTimer'
import { useSpeechRecording } from '@/hooks/useSpeechRecording'
import { useVoiceSynthesis } from '@/hooks/useVoiceSynthesis'
import { apiFetch } from '@/lib/api'
import type { Message, Session } from '@/types/chat'

interface ChatInterfaceProps {
  isAnonymous?: boolean
}

export default function ChatInterface({ isAnonymous = false }: ChatInterfaceProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [totalSpeakingTime, setTotalSpeakingTime] = useState(0)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sessionRef = useRef<Session | null>(null)
  const recordingDurationRef = useRef<number>(0)

  const {
    isRecording,
    isStarting,
    isStopping,
    startRecording,
    stopRecording,
    forceCleanup,
    clearTranscript,
    transcript,
    duration,
    error: recordingError,
  } = useSpeechRecording()

  const { speak, stop: stopSpeaking, isSpeaking, error: voiceError } = useVoiceSynthesis()

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Helper function to update session in both state and ref
  const updateSession = (newSession: Session | null) => {
    setSession(newSession)
    sessionRef.current = newSession

    // Persist session ID to sessionStorage
    if (newSession && !isAnonymous) {
      sessionStorage.setItem(`session-${user?.id}`, newSession.id)
    } else if (!newSession && user) {
      sessionStorage.removeItem(`session-${user.id}`)
    }
  }

  // Create or get session on mount
  useEffect(() => {
    if (user && !isAnonymous) {
      // Check if we already have a session before creating a new one
      if (session) {
        console.log('[ChatInterface] Session already exists, skipping creation:', session.id)
        return
      }

      // Check if session creation is already in progress
      const creatingKey = `creating-session-${user.id}`
      const isCreating = sessionStorage.getItem(creatingKey)

      if (isCreating) {
        console.log('[ChatInterface] Session creation already in progress, skipping')
        return
      }

      // Check if we have a session ID in storage
      const storedSessionId = sessionStorage.getItem(`session-${user.id}`)
      if (storedSessionId) {
        console.log('[ChatInterface] Found stored session ID, verifying:', storedSessionId)
        // Verify the session still exists
        supabase
          .from('sessions')
          .select('*')
          .eq('id', storedSessionId)
          .eq('user_id', user.id)
          .is('ended_at', null)
          .single()
          .then(({ data, error }) => {
            if (data && !error) {
              console.log('[ChatInterface] Restored session from storage:', data.id)
              updateSession(data)
              setTotalSpeakingTime(data.total_speaking_time)
              loadMessages(data.id)
            } else {
              console.log('[ChatInterface] Stored session not found, creating new')
              sessionStorage.removeItem(`session-${user.id}`)
              // Mark that we're creating a session
              sessionStorage.setItem(creatingKey, 'true')
              createOrGetSession().finally(() => {
                sessionStorage.removeItem(creatingKey)
              })
            }
          })
      } else {
        // Mark that we're creating a session
        sessionStorage.setItem(creatingKey, 'true')

        createOrGetSession().finally(() => {
          // Clear the flag after creation attempt
          sessionStorage.removeItem(creatingKey)
        })
      }
    }
  }, [user, isAnonymous, session])

  // Handle transcript updates
  const lastTranscriptRef = useRef<string>('')
  const sessionRetryRef = useRef<boolean>(false)

  const createOrGetSession = async (forceNew = false) => {
    if (!user) return null

    console.log(
      '[ChatInterface] Creating or getting session for user:',
      user.id,
      'Force new:',
      forceNew
    )

    setSessionLoading(true)
    try {
      if (!forceNew) {
        // Check for existing active session
        const { data: existingSessions, error: fetchError } = await supabase
          .from('sessions')
          .select('*')
          .eq('user_id', user.id)
          .is('ended_at', null)
          .order('created_at', { ascending: false })
          .limit(1)

        if (fetchError) {
          console.error('[ChatInterface] Error fetching sessions:', fetchError)
          throw fetchError
        }

        if (existingSessions && existingSessions.length > 0) {
          // Use existing session - take the most recent one
          const mostRecentSession = existingSessions[0]
          console.log('[ChatInterface] Found', existingSessions.length, 'active sessions')
          console.log('[ChatInterface] Using most recent session:', mostRecentSession.id)
          updateSession(mostRecentSession)
          setTotalSpeakingTime(mostRecentSession.total_speaking_time)
          await loadMessages(mostRecentSession.id)
          return mostRecentSession
        }
      }

      // Always clean up orphaned sessions before creating new one
      try {
        console.log('[ChatInterface] Cleaning up any orphaned sessions before creating new')
        const { data: orphanedSessions, error: cleanupError } = await supabase
          .from('sessions')
          .update({ ended_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .is('ended_at', null)
          .select()

        if (!cleanupError && orphanedSessions && orphanedSessions.length > 0) {
          console.log('[ChatInterface] Ended', orphanedSessions.length, 'orphaned sessions')
        }
      } catch (error) {
        console.error('[ChatInterface] Error cleaning up sessions:', error)
      }

      // Create new session
      console.log('[ChatInterface] Creating new session for user:', user.id)

      // First, ensure we have a valid user
      if (!user.id) {
        console.error('[ChatInterface] No user ID available for session creation')
        throw new Error('User ID is required to create a session')
      }

      const { data: newSession, error: createError } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          created_at: new Date().toISOString(),
          total_speaking_time: 0,
        })
        .select()
        .single()

      if (createError) {
        console.error('[ChatInterface] Error creating session:', {
          error: createError,
          code: createError.code,
          message: createError.message,
          details: createError.details,
          hint: createError.hint,
          userId: user.id,
        })
        throw createError
      }

      if (!newSession) {
        console.error('[ChatInterface] Session creation returned null')
        throw new Error('Failed to create session - no data returned')
      }

      console.log('[ChatInterface] New session created:', {
        sessionId: newSession.id,
        userId: newSession.user_id,
        createdAt: newSession.created_at,
      })

      // Verify the session was actually created in the database
      const { data: verifySession, error: verifyError } = await supabase
        .from('sessions')
        .select('id, user_id')
        .eq('id', newSession.id)
        .single()

      if (verifyError || !verifySession) {
        console.error('[ChatInterface] Session verification failed:', {
          verifyError,
          sessionId: newSession.id,
          verifySession,
        })
        throw new Error('Session created but verification failed')
      }

      console.log('[ChatInterface] Session verified in database:', verifySession.id)

      updateSession(newSession)
      setMessages([])
      setTotalSpeakingTime(0)
      return newSession
    } catch (error: any) {
      console.error('[ChatInterface] Error managing session:', {
        error,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        userId: user?.id,
        errorType: error?.constructor?.name,
      })

      // Show user-friendly error message
      const errorMessage = error?.message || 'Failed to create session'
      alert(`Session Error: ${errorMessage}. Please refresh the page and try again.`)

      return null
    } finally {
      setSessionLoading(false)
    }
  }

  const loadMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) throw error
      if (data) {
        setMessages(data)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  // Move transcript handling effect after handleSendMessage declaration
  // This will be added later after handleSendMessage is defined

  const handleSendMessage = useCallback(
    async (text: string, retrySession?: Session) => {
      if (!text.trim() || isLoading) return

      // Use retry session if provided, otherwise use current session from ref
      const currentSession = retrySession || sessionRef.current

      if (!isAnonymous && !currentSession) {
        console.error('[ChatInterface] No session available for authenticated user')
        // Try to create a session if we don't have one
        const newSession = await createOrGetSession()
        if (!newSession) {
          console.error('[ChatInterface] Failed to create session for message')
          return
        }
        // Use the newly created session
        return handleSendMessage(text, newSession)
      }

      // For authenticated users, verify session exists in database before sending
      if (!isAnonymous && currentSession) {
        console.log('[ChatInterface] Verifying session before sending message:', currentSession.id)
        const { data: sessionExists, error: checkError } = await supabase
          .from('sessions')
          .select('id')
          .eq('id', currentSession.id)
          .single()

        if (checkError || !sessionExists) {
          console.error('[ChatInterface] Session verification failed before sending:', {
            sessionId: currentSession.id,
            error: checkError,
            exists: !!sessionExists,
          })

          // Session doesn't exist, create a new one
          updateSession(null)
          const newSession = await createOrGetSession(true)
          if (!newSession) {
            console.error('[ChatInterface] Failed to create new session after verification failure')
            return
          }
          console.log(
            '[ChatInterface] Created new session after verification failure:',
            newSession.id
          )
          // Use the new session for this message
          return handleSendMessage(text, newSession)
        } else {
          console.log('[ChatInterface] Session verified successfully:', sessionExists.id)
        }
      }

      // Log the current session state before sending
      console.log('[ChatInterface] Current session state:', {
        session: currentSession,
        sessionId: currentSession?.id,
        sessionUserId: currentSession?.user_id,
        currentUserId: user?.id,
        isAnonymous,
      })

      console.log('[ChatInterface] Sending message:', {
        textLength: text.length,
        sessionId: currentSession?.id || 'anonymous',
        userId: user?.id || 'anonymous',
        isAnonymous,
        hasSession: !!currentSession,
        sessionDetails: currentSession
          ? { id: currentSession.id, userId: currentSession.user_id }
          : null,
      })

      setIsLoading(true)
      // Use the saved duration from recordingDurationRef
      const messageDuration = recordingDurationRef.current
      console.log('[ChatInterface] Using saved duration for message:', messageDuration)

      const userMessage: Message = {
        id: crypto.randomUUID(),
        session_id: currentSession?.id || 'anonymous',
        speaker: 'USER',
        content: text,
        duration: messageDuration,
        created_at: new Date().toISOString(),
      }

      // Add user message immediately
      setMessages((prev) => [...prev, userMessage])

      // Update speaking time with saved duration
      const newSpeakingTime = totalSpeakingTime + messageDuration
      setTotalSpeakingTime(newSpeakingTime)
      console.log(
        '[ChatInterface] Updated total speaking time:',
        newSpeakingTime,
        'added:',
        messageDuration
      )

      // Reset recording duration for next message
      recordingDurationRef.current = 0

      // Save user message to database first (for authenticated users)
      let savedMessageId = userMessage.id
      if (!isAnonymous && user && currentSession) {
        try {
          console.log('[ChatInterface] Saving user message to database...', {
            sessionId: currentSession.id,
            userId: user.id,
            contentLength: text.length,
            duration: messageDuration,
          })
          
          const { data: savedMessage, error: saveError } = await supabase
            .from('messages')
            .insert({
              session_id: currentSession.id,
              speaker: 'USER',
              content: text,
              duration: messageDuration,
            })
            .select()
            .single()

          if (saveError) {
            console.error('[ChatInterface] Error saving message:', {
              error: saveError,
              code: saveError.code,
              message: saveError.message,
              details: saveError.details,
              hint: saveError.hint,
              sessionId: currentSession.id,
              userId: user.id,
            })
            
            // Check if it's an RLS error
            if (saveError.code === '42501') {
              console.error('[ChatInterface] RLS policy violation - user may not have permission to insert messages')
              
              // Try to verify session ownership
              const { data: sessionCheck } = await supabase
                .from('sessions')
                .select('user_id')
                .eq('id', currentSession.id)
                .single()
                
              console.log('[ChatInterface] Session ownership check:', {
                sessionId: currentSession.id,
                sessionUserId: sessionCheck?.user_id,
                currentUserId: user.id,
                match: sessionCheck?.user_id === user.id,
              })
            }
          } else if (savedMessage) {
            savedMessageId = savedMessage.id
            console.log('[ChatInterface] Message saved successfully:', {
              messageId: savedMessageId,
              sessionId: savedMessage.session_id,
              speaker: savedMessage.speaker,
            })
          } else {
            console.error('[ChatInterface] No message returned after insert')
          }
        } catch (error) {
          console.error('[ChatInterface] Exception saving message:', error)
        }
      } else {
        console.log('[ChatInterface] Skipping message save:', {
          isAnonymous,
          hasUser: !!user,
          hasSession: !!currentSession,
          sessionId: currentSession?.id,
        })
      }

      // Start parallel API calls
      const apiCalls: Promise<any>[] = []

      // 1. Analyze errors for authenticated users (non-blocking)
      if (!isAnonymous && user && currentSession && savedMessageId) {
        const analyzePromise = (async () => {
          try {
            console.log('[ChatInterface] Starting error analysis for message:', {
              messageId: savedMessageId,
              userId: user.id,
              sessionId: currentSession.id,
              contentLength: text.length,
              duration: messageDuration,
            })

            const analyzePayload = {
              messageId: savedMessageId,
              userId: user.id,
              sessionId: currentSession.id,
              content: text,
              duration: messageDuration,
            }

            console.log('[ChatInterface] Calling analyze-errors API with payload:', analyzePayload)

            const analyzeRequestId = `chat_${Date.now()}_${Math.random().toString(36).substring(7)}`
            console.log(`[ChatInterface][${analyzeRequestId}] Starting analyze-errors request`)

            const analyzeResponse = await apiFetch('/api/analyze-errors', {
              method: 'POST',
              body: JSON.stringify(analyzePayload),
              headers: {
                'X-Request-ID': analyzeRequestId,
              },
            })

            console.log(
              `[ChatInterface][${analyzeRequestId}] analyze-errors response status:`,
              analyzeResponse.status
            )

            if (!analyzeResponse.ok) {
              const errorText = await analyzeResponse.text()
              console.error(`[ChatInterface][${analyzeRequestId}] analyze-errors API failed:`, {
                status: analyzeResponse.status,
                statusText: analyzeResponse.statusText,
                error: errorText,
              })

              // Try to parse error details if in development
              try {
                const errorData = JSON.parse(errorText)
                if (errorData.details) {
                  console.error(
                    `[ChatInterface][${analyzeRequestId}] Error details:`,
                    errorData.details
                  )
                }
              } catch (e) {
                // Not JSON, ignore
              }
            } else {
              const result = await analyzeResponse.json()
              console.log(
                `[ChatInterface][${analyzeRequestId}] Error analysis complete. Full result:`,
                result
              )
              console.log(`[ChatInterface][${analyzeRequestId}] Analysis summary:`, {
                success: result.success,
                correctionId: result.correctionId,
                errorCount: result.errorCount,
                primaryErrors: result.primaryErrors,
              })

              // Log debug info if available (in development)
              if (result.debug) {
                console.log(`[ChatInterface][${analyzeRequestId}] Debug info:`, result.debug)
              }
            }
          } catch (error) {
            console.error('[ChatInterface] Exception in analyze-errors call:', {
              error,
              message: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            })
            // Don't fail the whole message if error analysis fails
          }
        })()

        apiCalls.push(analyzePromise)
      } else {
        console.log('[ChatInterface] Skipping error analysis:', {
          isAnonymous,
          hasUser: !!user,
          hasSession: !!currentSession,
        })
      }

      // 2. Call OpenAI via API route (chat response)
      const chatPromise = (async () => {
        try {
          // For authenticated users without a session, don't send 'anonymous'
          const messagePayload = {
            message: text,
            sessionId: isAnonymous ? 'anonymous' : currentSession?.id || null,
            userId: isAnonymous ? 'anonymous' : user?.id || null,
            isAnonymous,
          }

          console.log('[ChatInterface] Sending chat request with payload:', messagePayload)

          const response = await apiFetch('/api/chat', {
            method: 'POST',
            body: JSON.stringify(messagePayload),
          })

          if (!response.ok) {
            const errorData = await response.json()

            // If session not found and we haven't retried yet, recreate session
            if (
              response.status === 404 &&
              errorData.error === 'Session not found' &&
              !sessionRetryRef.current &&
              !isAnonymous
            ) {
              console.log('[ChatInterface] Session not found, creating NEW session...')
              sessionRetryRef.current = true

              // Remove the failed message
              setMessages((prev) => prev.slice(0, -1))

              // Force create a NEW session (don't reuse existing)
              updateSession(null)
              const newSession = await createOrGetSession(true) // Force new session

              // Reset retry flag after delay
              setTimeout(() => {
                sessionRetryRef.current = false
              }, 2000)

              // If we got a new session, retry the message
              if (newSession) {
                console.log('[ChatInterface] Retrying message with new session:', newSession.id)
                // Retry the message with the new session
                handleSendMessage(text, newSession)
              }
              return
            }

            throw new Error(errorData.error || 'Failed to get AI response')
          }

          const data = await response.json()

          // Add AI message
          const aiMessage: Message = {
            id: crypto.randomUUID(),
            session_id: currentSession?.id || 'anonymous',
            speaker: 'AI',
            content: data.message,
            duration: null,
            created_at: new Date().toISOString(),
          }

          setMessages((prev) => [...prev, aiMessage])

          // Speak the AI response if voice is enabled
          if (voiceEnabled) {
            console.log(
              '[ChatInterface] Speaking AI response:',
              data.message.substring(0, 50) + '...'
            )
            speak(data.message)
          } else {
            console.log('[ChatInterface] Voice disabled, not speaking')
          }

          // Update session speaking time in database (only for authenticated users)
          if (currentSession && !isAnonymous) {
            await supabase
              .from('sessions')
              .update({ total_speaking_time: newSpeakingTime })
              .eq('id', currentSession.id)
          }

          return { success: true }
        } catch (error) {
          console.error('Error sending message:', error)
          // Add error message
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              session_id: currentSession?.id || 'anonymous',
              speaker: 'AI',
              content: "I'm sorry, I couldn't process that. Please try again.",
              duration: null,
              created_at: new Date().toISOString(),
            },
          ])
          return { success: false, error }
        }
      })()

      apiCalls.push(chatPromise)

      try {
        // Wait for both API calls to complete
        console.log('[ChatInterface] Running API calls in parallel...')
        const startTime = Date.now()

        const results = await Promise.allSettled(apiCalls)

        const endTime = Date.now()
        console.log('[ChatInterface] API calls completed in', endTime - startTime, 'ms')

        // Log results for debugging
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`[ChatInterface] API call ${index} failed:`, result.reason)
          }
        })

        // Check if chat succeeded
        const chatResult = await chatPromise
        if (chatResult && !chatResult.success && chatResult.error) {
          throw chatResult.error
        }
      } catch (error) {
        console.error('[ChatInterface] Error in parallel API calls:', error)
        // Error handling already done in individual promises
      } finally {
        setIsLoading(false)
      }
    },
    [
      isLoading,
      isAnonymous,
      user,
      sessionRef,
      totalSpeakingTime,
      voiceEnabled,
      speak,
      supabase,
      apiFetch,
      setMessages,
      setTotalSpeakingTime,
      createOrGetSession,
    ]
  )

  // Handle transcript updates - must be after handleSendMessage declaration
  useEffect(() => {
    console.log(
      '[ChatInterface] Transcript update - transcript:',
      transcript,
      'isRecording:',
      isRecording,
      'duration:',
      duration
    )
    if (transcript && transcript.trim().length > 0 && !isRecording) {
      // Prevent duplicate messages
      if (lastTranscriptRef.current === transcript) {
        console.log('[ChatInterface] Duplicate transcript, skipping:', transcript)
        return
      }
      lastTranscriptRef.current = transcript

      // Save the duration value before it gets reset
      recordingDurationRef.current = duration
      console.log('[ChatInterface] Saved recording duration:', recordingDurationRef.current)

      console.log('[ChatInterface] Processing transcript:', transcript)
      // Add validation to prevent spam messages
      const lowerTranscript = transcript.toLowerCase()
      if (
        lowerTranscript.includes('engvid.com') ||
        lowerTranscript.includes('learn english for free') ||
        lowerTranscript.includes('www.') ||
        lowerTranscript.includes('.com')
      ) {
        console.error('[ChatInterface] Suspicious transcript blocked:', transcript)
        return
      }
      handleSendMessage(transcript)
      // Clear the transcript immediately after processing to prevent loops
      clearTranscript()
    }
  }, [transcript, isRecording, duration, handleSendMessage, clearTranscript])

  const handleEndSession = async () => {
    if (isAnonymous) {
      // For anonymous users, just clear the messages
      setMessages([])
      setTotalSpeakingTime(0)
      return
    }

    if (!session) return

    try {
      await supabase
        .from('sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', session.id)

      // Reset state
      updateSession(null)
      setMessages([])
      setTotalSpeakingTime(0)

      // Create new session
      createOrGetSession()
    } catch (error) {
      console.error('Error ending session:', error)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-bg-secondary">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-border-light px-4 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold text-primary">Just Speak</h1>
            <SpeakingTimer totalSeconds={totalSpeakingTime} />
          </div>
          <div className="flex items-center gap-4">
            {/* Voice toggle */}
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`text-sm flex items-center gap-1 ${voiceEnabled ? 'text-primary' : 'text-text-muted'}`}
              title={voiceEnabled ? 'Voice enabled' : 'Voice disabled'}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                {voiceEnabled ? (
                  <path
                    fillRule="evenodd"
                    d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
                    clipRule="evenodd"
                  />
                ) : (
                  <path
                    fillRule="evenodd"
                    d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                )}
              </svg>
              <span className="hidden sm:inline">{voiceEnabled ? 'Voice On' : 'Voice Off'}</span>
            </button>

            {isAnonymous ? (
              <>
                <span className="text-sm text-text-muted">Practice mode</span>
                <Link href="/auth/login" className="text-sm text-primary hover:text-blue-700">
                  Sign in to track progress
                </Link>
              </>
            ) : (
              <>
                <Link href="/dashboard" className="text-sm text-primary hover:text-blue-700">
                  View Progress
                </Link>
                <button
                  onClick={async () => {
                    console.log('[ChatInterface] Manual refresh requested')
                    updateSession(null)
                    setMessages([])
                    setTotalSpeakingTime(0)
                    await createOrGetSession(true) // Force new session
                  }}
                  className="text-sm text-text-secondary hover:text-text-primary"
                  title="Create new session"
                >
                  New Session
                </button>
                <button
                  onClick={handleEndSession}
                  className="text-sm text-text-secondary hover:text-text-primary"
                >
                  End Session
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-text-secondary mb-2">
                Ready to practice? Hold the button and start speaking!
              </p>
              <p className="text-sm text-text-muted">
                I'll respond naturally to help you practice English conversation.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="chat-bubble-ai flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Speaking Interface - Compact */}
      <div className="bg-white border-t border-border-light px-4 py-3">
        <div className="max-w-2xl mx-auto relative">
          <SpeakButton
            isRecording={isRecording}
            onStart={() => {
              console.log('[ChatInterface] Start recording requested')
              // For authenticated users, ensure session is ready
              if (!isAnonymous && (!session || sessionLoading)) {
                console.log('[ChatInterface] Session not ready, cannot start recording')
                alert('Please wait for session to initialize...')
                return
              }
              startRecording()
            }}
            onStop={() => {
              console.log('[ChatInterface] Stop recording requested')
              stopRecording()
            }}
            disabled={isLoading || isSpeaking || (!isAnonymous && (sessionLoading || !session))}
          />

          {/* Compact recording states */}
          {(isStarting || isRecording || isStopping) && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white rounded-lg shadow-md px-3 py-1 text-xs">
              {isStarting && <span className="text-text-secondary animate-pulse">Starting...</span>}
              {isRecording && (
                <span className="text-warning font-medium animate-pulse">
                  Listening {duration}s
                </span>
              )}
              {isStopping && (
                <span className="text-text-secondary animate-pulse">Processing...</span>
              )}
            </div>
          )}

          {/* Compact status indicators */}
          {(isSpeaking || recordingError || voiceError) && (
            <div className="mt-2 space-y-1">
              {/* AI Speaking indicator */}
              {isSpeaking && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded flex items-center justify-between text-xs">
                  <div className="flex items-center">
                    <svg
                      className="w-4 h-4 text-blue-600 mr-1 animate-pulse"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-blue-700">AI speaking...</span>
                  </div>
                  <button
                    onClick={stopSpeaking}
                    className="text-blue-700 hover:text-blue-800 underline"
                  >
                    Stop
                  </button>
                </div>
              )}

              {/* Error display */}
              {(recordingError || voiceError) && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                  <p className="text-red-600">{recordingError || voiceError}</p>
                  <button
                    onClick={forceCleanup}
                    className="mt-1 text-red-700 hover:text-red-800 underline"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Debug panel */}
      <details className="fixed bottom-4 right-4 z-50">
        <summary className="cursor-pointer text-xs bg-gray-800 text-white px-2 py-1 rounded">
          Debug
        </summary>
        <div className="absolute bottom-full right-0 mb-2 p-2 bg-gray-800 text-white rounded text-xs font-mono max-h-96 overflow-y-auto min-w-[300px]">
          <div className="border-b border-gray-600 pb-1 mb-1">Session Info</div>
          <div>User ID: {user?.id || 'none'}</div>
          <div>Session ID: {session?.id || 'none'}</div>
          <div>Session User: {session?.user_id || 'none'}</div>
          <div>
            Created:{' '}
            {session?.created_at ? new Date(session.created_at).toLocaleTimeString() : 'none'}
          </div>
          <div>Is Anonymous: {isAnonymous ? 'YES' : 'NO'}</div>

          <div className="border-b border-gray-600 pb-1 mb-1 mt-2">Recording State</div>
          <div>Recording: {isRecording ? 'YES' : 'NO'}</div>
          <div>Loading: {isLoading ? 'YES' : 'NO'}</div>
          <div>Duration: {duration}s</div>
          <div>Speaking: {isSpeaking ? 'YES' : 'NO'}</div>
          <div className="break-words">Transcript: {transcript || 'none'}</div>

          <div className="border-b border-gray-600 pb-1 mb-1 mt-2">Messages</div>
          <div>Count: {messages.length}</div>
          <div>Speaking Time: {totalSpeakingTime}s</div>

          <div className="mt-2 space-y-1">
            <button
              onClick={async () => {
                console.log('[Debug] Checking all active sessions')
                const { data, error } = await supabase
                  .from('sessions')
                  .select('*')
                  .eq('user_id', user?.id)
                  .is('ended_at', null)
                console.log('[Debug] Active sessions:', data, 'Error:', error)
              }}
              className="text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600 w-full"
            >
              Check Active Sessions
            </button>
            <button
              onClick={() => {
                console.log('[Debug] Current state:', {
                  user,
                  session,
                  messages,
                  isAnonymous,
                  totalSpeakingTime,
                })
              }}
              className="text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600 w-full"
            >
              Log Current State
            </button>
            <button
              onClick={() => {
                console.log('[Debug] Force cleanup triggered')
                forceCleanup()
              }}
              className="text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600 w-full"
            >
              Force Reset Recording
            </button>
            <button
              onClick={() => {
                sessionStorage.clear()
                console.log('[Debug] Cleared sessionStorage')
              }}
              className="text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600 w-full"
            >
              Clear Session Storage
            </button>
          </div>
        </div>
      </details>
    </div>
  )
}
