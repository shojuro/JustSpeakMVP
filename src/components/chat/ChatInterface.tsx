'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import MessageBubble from './MessageBubble'
import SpeakButton from './SpeakButton'
import SpeakingTimer from './SpeakingTimer'
import { useSpeechRecording } from '@/hooks/useSpeechRecording'
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
  
  useEffect(() => {
    console.log('[ChatInterface] Transcript update - transcript:', transcript, 'isRecording:', isRecording)
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
      if (lowerTranscript.includes('engvid.com') || 
          lowerTranscript.includes('learn english for free') ||
          lowerTranscript.includes('www.') ||
          lowerTranscript.includes('.com')) {
        console.error('[ChatInterface] Suspicious transcript blocked:', transcript)
        return
      }
      handleSendMessage(transcript)
    }
  }, [transcript, isRecording])

  const createOrGetSession = async () => {
    if (!user) return

    try {
      // Check for existing active session
      const { data: existingSessions, error: fetchError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .is('ended_at', null)
        .order('created_at', { ascending: false })
        .limit(1)

      if (fetchError) throw fetchError

      if (existingSessions && existingSessions.length > 0) {
        // Use existing session
        setSession(existingSessions[0])
        setTotalSpeakingTime(existingSessions[0].total_speaking_time)
        await loadMessages(existingSessions[0].id)
      } else {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from('sessions')
          .insert({ user_id: user.id })
          .select()
          .single()

        if (createError) throw createError
        setSession(newSession)
      }
    } catch (error) {
      console.error('Error managing session:', error)
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
    if (!isAnonymous && !session) return // Only require session for authenticated users

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
    setMessages(prev => [...prev, userMessage])
    
    // Update speaking time
    const newSpeakingTime = totalSpeakingTime + duration
    setTotalSpeakingTime(newSpeakingTime)

    try {
      // Call OpenAI via API route
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          sessionId: session?.id || 'anonymous',
          userId: user?.id || 'anonymous',
          isAnonymous,
        }),
      })

      if (!response.ok) throw new Error('Failed to get AI response')

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
      
      setMessages(prev => [...prev, aiMessage])

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
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        session_id: session?.id || 'anonymous',
        speaker: 'AI',
        content: "I'm sorry, I couldn't process that. Please try again.",
        duration: null,
        created_at: new Date().toISOString(),
      }])
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
            {isAnonymous ? (
              <>
                <span className="text-sm text-text-muted">Practice mode</span>
                <Link href="/auth/login" className="text-sm text-primary hover:text-blue-700">
                  Sign in to track progress
                </Link>
              </>
            ) : (
              <button
                onClick={handleEndSession}
                className="text-sm text-text-secondary hover:text-text-primary"
              >
                End Session
              </button>
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

      {/* Speaking Interface */}
      <div className="bg-white border-t border-border-light px-4 py-6">
        <div className="max-w-2xl mx-auto">
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
            disabled={isLoading}
          />
          
          {/* Recording states */}
          {isStarting && (
            <div className="text-center mt-4">
              <p className="text-text-secondary animate-pulse">
                Starting microphone...
              </p>
            </div>
          )}
          
          {isRecording && (
            <div className="text-center mt-4">
              <p className="text-warning font-medium animate-pulse">
                Listening... {duration}s
              </p>
              <p className="text-sm text-text-muted mt-1">
                Release to send your message
              </p>
            </div>
          )}
          
          {isStopping && (
            <div className="text-center mt-4">
              <p className="text-text-secondary animate-pulse">
                Processing...
              </p>
            </div>
          )}
          
          {/* Error display */}
          {recordingError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{recordingError}</p>
              <button
                onClick={forceCleanup}
                className="mt-2 text-sm text-red-700 hover:text-red-800 underline"
              >
                Reset microphone
              </button>
            </div>
          )}
          
          {/* Debug panel */}
          <div className="mt-4 p-2 bg-gray-100 rounded text-xs font-mono">
            <div>Recording: {isRecording ? 'YES' : 'NO'}</div>
            <div>Loading: {isLoading ? 'YES' : 'NO'}</div>
            <div>Duration: {duration}s</div>
            <div>Transcript: {transcript || 'none'}</div>
            <button
              onClick={() => {
                console.log('[Debug] Force cleanup triggered')
                forceCleanup()
              }}
              className="mt-1 text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
            >
              Force Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}