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

  // Comprehensive cleanup function
  const cleanup = useCallback(() => {
    console.log('Cleaning up recording resources...')

    // Stop and clean up speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
        recognitionRef.current = null
      } catch (e) {
        console.error('Error stopping speech recognition:', e)
      }
    }

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

    // Clear duration interval
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    // Reset chunks
    chunksRef.current = []
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  const startRecording = useCallback(async () => {
    // Prevent starting if not in idle state
    if (state !== 'idle') {
      console.log('Cannot start recording, current state:', state)
      return
    }

    try {
      setState('starting')
      setError(null)
      setTranscript('')
      setDuration(0)
      
      // Ensure cleanup of any previous session
      cleanup()

      // Small delay to ensure cleanup completes
      await new Promise(resolve => setTimeout(resolve, 100))

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
        console.log('MediaRecorder stopped, chunks:', chunksRef.current.length)
        
        // Only transcribe if we have audio data
        if (chunksRef.current.length > 0) {
          const audioBlob = new Blob(chunksRef.current, { type: mimeType })
          
          // If no transcript from speech recognition, use audio transcription
          if (!transcript) {
            await transcribeAudio(audioBlob)
          }
        }
        
        // Ensure state is reset
        setState('idle')
      }

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setError('Recording error occurred')
        cleanup()
        setState('idle')
      }

      // Start recording
      mediaRecorder.start(100) // Collect data every 100ms
      mediaRecorderRef.current = mediaRecorder

      // Try to use Web Speech API if available (but don't rely on it)
      if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
        try {
          const SpeechRecognition = (window as any).webkitSpeechRecognition
          const recognition = new SpeechRecognition()
          recognition.continuous = false // Change to false to avoid issues
          recognition.interimResults = false // Change to false for more stability
          recognition.lang = 'en-US'
          recognition.maxAlternatives = 1

          recognition.onresult = (event: any) => {
            const result = event.results[0]
            if (result && result.isFinal) {
              const finalTranscript = result[0].transcript
              console.log('Speech recognition result:', finalTranscript)
              setTranscript(finalTranscript)
            }
          }

          recognition.onerror = (event: any) => {
            console.warn('Speech recognition error:', event.error)
            // Don't show errors to user, fallback to audio transcription
          }

          recognition.onend = () => {
            console.log('Speech recognition ended')
          }

          recognition.start()
          recognitionRef.current = recognition
        } catch (e) {
          console.warn('Could not start speech recognition:', e)
          // Continue without it
        }
      }

      // Start tracking duration
      startTimeRef.current = Date.now()
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setDuration(elapsed)
      }, 100)

      setState('recording')
      console.log('Recording started successfully')
    } catch (error: any) {
      console.error('Error starting recording:', error)
      cleanup()
      setState('idle')
      
      if (error.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow microphone access.')
      } else if (error.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.')
      } else {
        setError('Failed to start recording. Please try again.')
      }
    }
  }, [state, cleanup, transcript])

  const stopRecording = useCallback(() => {
    // Only stop if actually recording
    if (state !== 'recording') {
      console.log('Not recording, cannot stop. State:', state)
      return
    }

    setState('stopping')
    console.log('Stopping recording...')

    // Stop speech recognition first
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        console.error('Error stopping recognition:', e)
      }
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    // Stop duration tracking
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    // Cleanup streams after a delay
    setTimeout(() => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }, 500)
  }, [state])

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
        console.log('Transcription result:', data.text)
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
    setState('idle')
    setError(null)
    setTranscript('')
    setDuration(0)
  }, [cleanup])

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