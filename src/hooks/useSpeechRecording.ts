'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

type RecordingState = 'idle' | 'starting' | 'recording' | 'stopping'

export function useSpeechRecording() {
  const [state, setState] = useState<RecordingState>('idle')
  const [transcript, setTranscript] = useState('')
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  // Stable refs that won't cause re-renders
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<any>(null)
  const isCleaningUp = useRef(false)
  const transcriptRef = useRef('')
  const stateRef = useRef<RecordingState>('idle')

  // Helper to update both state and ref
  const updateState = useCallback((newState: RecordingState) => {
    stateRef.current = newState
    setState(newState)
  }, [])

  // Initialize Web Speech API once
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event: any) => {
        let finalTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          }
        }
        
        if (finalTranscript) {
          const newTranscript = transcriptRef.current + ' ' + finalTranscript.trim()
          transcriptRef.current = newTranscript.trim()
          setTranscript(newTranscript.trim())
        }
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        
        // Handle specific errors
        if (event.error === 'aborted') {
          // This is expected when we stop recognition
          return
        } else if (event.error === 'no-speech') {
          // This happens when no speech is detected for a while
          console.log('No speech detected, continuing...')
          // Don't show error to user, just continue recording
          return
        } else if (event.error === 'audio-capture') {
          setError('Microphone access lost. Please check your permissions.')
        } else if (event.error === 'network') {
          setError('Network error. Please check your connection.')
        } else {
          setError(`Speech recognition error: ${event.error}`)
        }
      }

      recognition.onend = () => {
        console.log('Speech recognition ended, current state:', stateRef.current)
        // If we're still supposed to be recording, restart recognition
        if (stateRef.current === 'recording' && recognitionRef.current) {
          try {
            console.log('Restarting speech recognition...')
            recognitionRef.current.start()
          } catch (e) {
            console.error('Failed to restart recognition:', e)
          }
        }
      }

      recognitionRef.current = recognition
    }

    // Cleanup on unmount
    return () => {
      cleanup()
    }
  }, [])

  // Comprehensive cleanup function
  const cleanup = useCallback(() => {
    if (isCleaningUp.current) return
    isCleaningUp.current = true

    console.log('Cleaning up recording resources...')

    // Stop media recorder
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop()
        }
      } catch (e) {
        console.error('Error stopping media recorder:', e)
      }
      mediaRecorderRef.current = null
    }

    // Stop all stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        console.log('Stopped track:', track.label)
      })
      streamRef.current = null
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch (e) {
        console.error('Error stopping speech recognition:', e)
      }
    }

    // Clear duration interval
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    // Reset chunks
    chunksRef.current = []

    isCleaningUp.current = false
  }, [])

  const startRecording = useCallback(async () => {
    // Prevent starting if not in idle state
    if (state !== 'idle') {
      console.log('Cannot start recording, current state:', state)
      return
    }

    try {
      updateState('starting')
      setError(null)
      setTranscript('')
      transcriptRef.current = ''
      setDuration(0)
      
      // Ensure cleanup of any previous session
      cleanup()

      // Request microphone permission
      console.log('Requesting microphone permission...')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      streamRef.current = stream

      // Create and configure MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm'
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        console.log('MediaRecorder stopped')
        
        // Only transcribe if we have audio and no transcript
        if (chunksRef.current.length > 0 && !transcriptRef.current) {
          const audioBlob = new Blob(chunksRef.current, { type: mimeType })
          await transcribeAudio(audioBlob)
        }
      }

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setError('Recording error occurred')
        cleanup()
        updateState('idle')
      }

      // Start recording
      mediaRecorder.start(100) // Collect data every 100ms
      mediaRecorderRef.current = mediaRecorder

      // Start speech recognition if available
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start()
          console.log('Speech recognition started')
        } catch (e: any) {
          if (e.message && e.message.includes('already started')) {
            console.log('Speech recognition already running')
          } else {
            console.error('Speech recognition error:', e)
            // Continue without speech recognition
          }
        }
      }

      // Start tracking duration
      startTimeRef.current = Date.now()
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setDuration(elapsed)
      }, 100)

      updateState('recording')
      console.log('Recording started successfully')
    } catch (error: any) {
      console.error('Error starting recording:', error)
      cleanup()
      updateState('idle')
      
      if (error.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow microphone access.')
      } else if (error.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.')
      } else {
        setError('Failed to start recording. Please try again.')
      }
    }
  }, [state, cleanup, updateState])

  const stopRecording = useCallback(() => {
    // Only stop if actually recording
    if (state !== 'recording') {
      console.log('Not recording, cannot stop. State:', state)
      return
    }

    updateState('stopping')
    console.log('Stopping recording...')

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        console.error('Error stopping recognition:', e)
      }
    }

    // Stop duration tracking
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    // Cleanup will happen in mediaRecorder.onstop
    setTimeout(() => {
      cleanup()
      updateState('idle')
    }, 500) // Give time for data to be processed
  }, [state, cleanup, updateState])

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      console.log('Transcribing audio blob, size:', audioBlob.size)
      
      if (audioBlob.size < 1000) {
        console.log('Audio too short, skipping transcription')
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
      if (data.text) {
        transcriptRef.current = data.text
        setTranscript(data.text)
      }
    } catch (error) {
      console.error('Error transcribing audio:', error)
      setError('Failed to transcribe audio. Please try again.')
    }
  }

  // Force cleanup method for error recovery
  const forceCleanup = useCallback(() => {
    cleanup()
    updateState('idle')
    setError(null)
    setTranscript('')
    transcriptRef.current = ''
    setDuration(0)
  }, [cleanup, updateState])

  return {
    isRecording: state === 'recording',
    isStarting: state === 'starting',
    isStopping: state === 'stopping',
    transcript,
    duration,
    error,
    startRecording,
    stopRecording,
    forceCleanup,
  }
}