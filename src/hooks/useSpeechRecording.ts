'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export function useSpeechRecording() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<any>(null)

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          }
        }
        
        if (finalTranscript) {
          setTranscript(finalTranscript.trim())
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setError(`Speech recognition error: ${event.error}`)
      }
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setTranscript('')
      setDuration(0)
      chunksRef.current = []

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Start MediaRecorder for audio recording
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      })
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // Clean up stream
        stream.getTracks().forEach(track => track.stop())
        
        // If we have audio data and no transcript from Web Speech API, 
        // we'll send to backend for transcription
        if (chunksRef.current.length > 0 && !transcript) {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
          await transcribeAudio(audioBlob)
        }
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder

      // Start speech recognition if available
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start()
        } catch (e) {
          console.log('Speech recognition already started')
        }
      }

      // Start tracking duration
      startTimeRef.current = Date.now()
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setDuration(elapsed)
      }, 100)

      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      setError('Failed to start recording. Please check microphone permissions.')
    }
  }, [transcript])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
      
      // Stop speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }

      // Stop duration tracking
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }

      setIsRecording(false)
    }
  }, [isRecording])

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Transcription failed')
      }

      const data = await response.json()
      if (data.text) {
        setTranscript(data.text)
      }
    } catch (error) {
      console.error('Error transcribing audio:', error)
      setError('Failed to transcribe audio. Please try again.')
    }
  }

  return {
    isRecording,
    transcript,
    duration,
    error,
    startRecording,
    stopRecording,
  }
}