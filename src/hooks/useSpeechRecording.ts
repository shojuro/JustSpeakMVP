'use client'

import { useState, useRef, useCallback } from 'react'

export function useSpeechRecording() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = useCallback(async () => {
    console.log('[Recording] Start requested, current state:', isRecording)
    
    // Reset state
    setError(null)
    setTranscript('')
    setDuration(0)
    chunksRef.current = []

    try {
      console.log('[Recording] Requesting microphone access...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      console.log('[Recording] Microphone access granted')

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
          console.log('[Recording] Data chunk received, size:', event.data.size)
        }
      }

      mediaRecorder.onstop = async () => {
        console.log('[Recording] MediaRecorder stopped')
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.stop()
            console.log('[Recording] Track stopped:', track.label)
          })
          streamRef.current = null
        }

        // Process audio if we have data
        if (chunksRef.current.length > 0) {
          console.log('[Recording] Processing', chunksRef.current.length, 'audio chunks')
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
          await transcribeAudio(audioBlob)
        }

        setIsRecording(false)
      }

      mediaRecorder.onerror = (event: any) => {
        console.error('[Recording] MediaRecorder error:', event)
        setError('Recording failed. Please try again.')
        stopRecording()
      }

      // Start recording
      mediaRecorder.start()
      setIsRecording(true)
      
      // Start duration tracking
      startTimeRef.current = Date.now()
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setDuration(elapsed)
      }, 100)

      console.log('[Recording] Started successfully')
    } catch (error: any) {
      console.error('[Recording] Failed to start:', error)
      
      if (error.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow access and try again.')
      } else if (error.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.')
      } else {
        setError('Failed to start recording: ' + error.message)
      }
      
      // Cleanup on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      setIsRecording(false)
    }
  }, [])

  const stopRecording = useCallback(() => {
    console.log('[Recording] Stop requested')
    
    // Clear duration interval
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    // Stop media recorder if it exists and is recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('[Recording] Stopping MediaRecorder...')
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    } else {
      console.log('[Recording] MediaRecorder not recording, cleaning up...')
      // If not recording, still clean up
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      setIsRecording(false)
    }
  }, [])

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      console.log('[Transcription] Starting, blob size:', audioBlob.size)
      
      if (audioBlob.size < 1000) {
        console.log('[Transcription] Audio too short, skipping')
        setError('Recording too short. Please hold the button longer.')
        return
      }

      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`)
      }

      const data = await response.json()
      console.log('[Transcription] Result:', data)
      
      if (data.text) {
        setTranscript(data.text)
      } else {
        setError('No speech detected. Please try again.')
      }
    } catch (error) {
      console.error('[Transcription] Error:', error)
      setError('Failed to process audio. Please try again.')
    }
  }

  // Cleanup function for manual recovery
  const forceCleanup = useCallback(() => {
    console.log('[Recording] Force cleanup requested')
    
    // Stop everything
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
    
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop()
        }
      } catch (e) {
        console.error('[Recording] Error stopping MediaRecorder:', e)
      }
      mediaRecorderRef.current = null
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    // Reset all state
    setIsRecording(false)
    setError(null)
    setTranscript('')
    setDuration(0)
    chunksRef.current = []
    
    console.log('[Recording] Force cleanup complete')
  }, [])

  return {
    isRecording,
    transcript,
    duration,
    error,
    startRecording,
    stopRecording,
    forceCleanup,
    // Expose these for debugging
    isStarting: false,
    isStopping: false,
  }
}