'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [totalSpeakingTime, setTotalSpeakingTime] = useState(0)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    isRecording,
    isStarting,
    isStopping,
    startRecording,
    stopRecording,
    forceCleanup,
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

  // Create or get session on mount
  useEffect(() => {
    if (user && !isAnonymous) {
      createOrGetSession()
    }
  }, [user, isAnonymous])

  // Handle transcript updates
  const lastTranscriptRef = useRef<string>('')
  const sessionRetryRef = useRef<boolean>(false)

  useEffect(() => {
    console.log(
      '[ChatInterface] Transcript update - transcript:',
      transcript,
      'isRecording:',
      isRecording
    )
    if (transcript && transcript.trim().length > 0 && !isRecording) {
      // Prevent duplicate messages
      if (lastTranscriptRef.current === transcript) {
        console.log('[ChatInterface] Duplicate transcript, skipping:', transcript)
        return
      }
      lastTranscriptRef.current = transcript

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
    }
  }, [transcript, isRecording])

  const createOrGetSession = async (forceNew = false) => {
    if (!user) return

    console.log('[ChatInterface] Creating or getting session for user:', user.id, 'Force new:', forceNew)

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
          setSession(mostRecentSession)
          setTotalSpeakingTime(mostRecentSession.total_speaking_time)
          await loadMessages(mostRecentSession.id)
          return
        }
      }

      // Create new session
      console.log('[ChatInterface] Creating new session')
      const { data: newSession, error: createError } = await supabase
        .from('sessions')
        .insert({ user_id: user.id })
        .select()
        .single()

      if (createError) {
        console.error('[ChatInterface] Error creating session:', createError)
        throw createError
      }
      console.log('[ChatInterface] New session created:', newSession.id)
      setSession(newSession)
      setMessages([])
      setTotalSpeakingTime(0)
    } catch (error) {
      console.error('[ChatInterface] Error managing session:', error)
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

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return
    if (!isAnonymous && !session) {
      console.error('[ChatInterface] No session available for authenticated user')
      return
    }

    console.log('[ChatInterface] Sending message:', {
      textLength: text.length,
      sessionId: session?.id || 'anonymous',
      userId: user?.id || 'anonymous',
      isAnonymous,
      hasSession: !!session,
      sessionDetails: session ? { id: session.id, userId: session.user_id } : null
    })

    setIsLoading(true)
    const userMessage: Message = {
      id: crypto.randomUUID(),
      session_id: session?.id || 'anonymous',
      speaker: 'USER',
      content: text,
      duration: duration,
      created_at: new Date().toISOString(),
    }

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage])

    // Update speaking time
    const newSpeakingTime = totalSpeakingTime + duration
    setTotalSpeakingTime(newSpeakingTime)

    try {
      // Call OpenAI via API route
      const response = await apiFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          sessionId: session?.id || 'anonymous',
          userId: user?.id || 'anonymous',
          isAnonymous,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // If session not found and we haven't retried yet, recreate session
        if (response.status === 404 && errorData.error === 'Session not found' && !sessionRetryRef.current && !isAnonymous) {
          console.log('[ChatInterface] Session not found, creating NEW session...')
          sessionRetryRef.current = true
          
          // Remove the failed message
          setMessages((prev) => prev.slice(0, -1))
          
          // Force create a NEW session (don't reuse existing)
          setSession(null)
          await createOrGetSession(true) // Force new session
          
          // Reset retry flag after delay
          setTimeout(() => {
            sessionRetryRef.current = false
          }, 2000)
          
          // Don't retry automatically - let user try again manually
          return
        }
        
        throw new Error(errorData.error || 'Failed to get AI response')
      }

      const data = await response.json()

      // Add AI message
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        session_id: session?.id || 'anonymous',
        speaker: 'AI',
        content: data.message,
        duration: null,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, aiMessage])

      // Speak the AI response if voice is enabled
      if (voiceEnabled) {
        console.log('[ChatInterface] Speaking AI response:', data.message.substring(0, 50) + '...')
        speak(data.message)
      } else {
        console.log('[ChatInterface] Voice disabled, not speaking')
      }

      // Update session speaking time in database (only for authenticated users)
      if (session && !isAnonymous) {
        await supabase
          .from('sessions')
          .update({ total_speaking_time: newSpeakingTime })
          .eq('id', session.id)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          session_id: session?.id || 'anonymous',
          speaker: 'AI',
          content: "I'm sorry, I couldn't process that. Please try again.",
          duration: null,
          created_at: new Date().toISOString(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

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
      setSession(null)
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
                    setSession(null)
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
              startRecording()
            }}
            onStop={() => {
              console.log('[ChatInterface] Stop recording requested')
              stopRecording()
            }}
            disabled={isLoading || isSpeaking}
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
        <div className="absolute bottom-full right-0 mb-2 p-2 bg-gray-800 text-white rounded text-xs font-mono max-h-48 overflow-y-auto min-w-[200px]">
          <div>Recording: {isRecording ? 'YES' : 'NO'}</div>
          <div>Loading: {isLoading ? 'YES' : 'NO'}</div>
          <div>Duration: {duration}s</div>
          <div>Speaking: {isSpeaking ? 'YES' : 'NO'}</div>
          <div className="break-words">Transcript: {transcript || 'none'}</div>
          <button
            onClick={() => {
              console.log('[Debug] Force cleanup triggered')
              forceCleanup()
            }}
            className="mt-1 text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600 w-full"
          >
            Force Reset
          </button>
        </div>
      </details>
    </div>
  )
}
