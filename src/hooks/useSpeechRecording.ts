'use client'

import { useState, useRef, useCallback } from 'react'
import { apiFetch } from '@/lib/api'

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
  const recordingStartTime = useRef<number>(0)
  const dataRequestIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = useCallback(async () => {
    console.log('[Recording] Start requested, current state:', isRecording)

    // Don't start if already recording
    if (isRecording) {
      console.log('[Recording] Already recording, ignoring start request')
      return
    }

    // Reset state completely
    setError(null)
    setTranscript('')
    setDuration(0)
    chunksRef.current = []
    
    // Clear any existing intervals
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
    if (dataRequestIntervalRef.current) {
      clearInterval(dataRequestIntervalRef.current)
      dataRequestIntervalRef.current = null
    }

    try {
      console.log('[Recording] Requesting microphone access...')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream
      console.log('[Recording] Microphone access granted')

      // Verify audio stream is active
      const audioTracks = stream.getAudioTracks()
      console.log('[Recording] Audio tracks:', audioTracks.length)
      audioTracks.forEach((track, index) => {
        console.log(`[Recording] Track ${index}:`, {
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          settings: track.getSettings(),
        })
      })

      // Check if we have active audio tracks
      if (
        audioTracks.length === 0 ||
        !audioTracks.some((track) => track.enabled && track.readyState === 'live')
      ) {
        throw new Error('No active audio tracks found')
      }

      // Determine best MIME type
      let mimeType = 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm'
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      }
      console.log('[Recording] Using MIME type:', mimeType)

      // Create MediaRecorder with options
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000,
      })
      mediaRecorderRef.current = mediaRecorder

      // Set up event handlers BEFORE starting
      mediaRecorder.onstart = () => {
        console.log('[Recording] MediaRecorder started successfully')
        console.log('[Recording] State:', mediaRecorder.state)
        console.log('[Recording] MIME type:', mediaRecorder.mimeType)
      }

      mediaRecorder.ondataavailable = (event) => {
        console.log('[Recording] Data available event fired!')
        console.log('[Recording] Event data size:', event.data?.size || 0)
        console.log('[Recording] Event data type:', event.data?.type || 'unknown')

        if (event.data && event.data.size > 0) {
          // Limit total chunks to prevent memory issues
          if (chunksRef.current.length < 500) { // Max ~1MB of chunks
            chunksRef.current.push(event.data)
            console.log('[Recording] Data chunk received and stored')
            console.log('[Recording] Total chunks collected:', chunksRef.current.length)
            if (chunksRef.current.length <= 10) {
              console.log(
                '[Recording] Chunk sizes:',
                chunksRef.current.map((c) => c.size)
              )
            }
          } else {
            console.warn('[Recording] Maximum chunks reached, ignoring additional data')
          }
        } else {
          console.warn('[Recording] Empty data chunk received')
        }
      }

      mediaRecorder.onstop = async () => {
        console.log('[Recording] MediaRecorder stopped')
        console.log('[Recording] Final state:', mediaRecorder.state)
        console.log('[Recording] Total chunks collected:', chunksRef.current.length)

        // Process audio if we have data
        if (chunksRef.current.length > 0) {
          console.log('[Recording] Creating blob from chunks...')
          const totalSize = chunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0)
          console.log('[Recording] Total data size:', totalSize)

          const audioBlob = new Blob(chunksRef.current, { type: mimeType })
          console.log('[Recording] Blob created successfully')
          console.log('[Recording] Blob size:', audioBlob.size)
          console.log('[Recording] Blob type:', audioBlob.type)
          console.log('[Recording] Duration:', (Date.now() - recordingStartTime.current) / 1000, 'seconds')

          // Stop tracks after creating blob
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => {
              track.stop()
              console.log('[Recording] Track stopped:', track.label)
            })
            streamRef.current = null
          }

          await transcribeAudio(audioBlob)
        } else {
          console.error('[Recording] No audio chunks collected!')
          console.log('[Recording] MediaRecorder state at stop:', mediaRecorder.state)
          setError('No audio was recorded. Please check microphone permissions.')

          // Still stop tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop())
            streamRef.current = null
          }
        }

        setIsRecording(false)
      }

      mediaRecorder.onerror = (event: any) => {
        console.error('[Recording] MediaRecorder error event:', event)
        console.error('[Recording] Error type:', event.error?.name)
        console.error('[Recording] Error message:', event.error?.message)
        setError('Recording failed: ' + (event.error?.message || 'Unknown error'))
        stopRecording()
      }

      // Force data collection by requesting data before starting
      console.log('[Recording] Starting MediaRecorder with 1000ms timeslice...')

      // Start recording with reasonable timeslice to prevent excessive chunks
      mediaRecorder.start(1000) // Capture data every 1 second
      setIsRecording(true)

      // Start duration tracking
      startTimeRef.current = Date.now()
      recordingStartTime.current = Date.now()
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
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      setIsRecording(false)
    }
  }, [])

  const stopRecording = useCallback(() => {
    console.log('[Recording] Stop requested')
    console.log('[Recording] Current MediaRecorder state:', mediaRecorderRef.current?.state)
    console.log('[Recording] Current chunks count:', chunksRef.current.length)

    // Track recording duration for transcription
    const recordingDuration = (Date.now() - startTimeRef.current) / 1000
    console.log('[Recording] Recording duration:', recordingDuration, 'seconds')

    // Clear all intervals
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
    if (dataRequestIntervalRef.current) {
      clearInterval(dataRequestIntervalRef.current)
      dataRequestIntervalRef.current = null
    }

    // Stop media recorder if it exists and is recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('[Recording] Requesting data before stopping...')

      // Force data collection by requesting data
      try {
        mediaRecorderRef.current.requestData()
        console.log('[Recording] Data requested successfully')
      } catch (e) {
        console.error('[Recording] Error requesting data:', e)
      }

      // Small delay to allow data collection before stopping
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          console.log('[Recording] Now stopping MediaRecorder...')
          mediaRecorderRef.current.stop()
          mediaRecorderRef.current = null
        }
      }, 50)
    } else {
      console.log('[Recording] MediaRecorder not recording, cleaning up...')
      // If not recording, still clean up
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      setIsRecording(false)
    }
  }, [])

  const transcribeAudio = async (audioBlob: Blob, retryCount = 0) => {
    const MAX_RETRIES = 2
    const RETRY_DELAY = 1000 // 1 second

    try {
      console.log('[Transcription] Starting, blob size:', audioBlob.size, 'retry:', retryCount)

      // Minimum size for 0.1 seconds of audio (roughly 2000 bytes for webm)
      if (audioBlob.size < 2000) {
        console.log('[Transcription] Audio too short, skipping')
        setError('Recording too short. Please hold the button for at least half a second.')
        return
      }

      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      
      console.log('[Transcription] Sending audio to API:', {
        blobSize: audioBlob.size,
        blobType: audioBlob.type,
        fileName: 'recording.webm',
      })

      const response = await apiFetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      })

      console.log('[Transcription] Response status:', response.status)
      console.log(
        '[Transcription] Response headers:',
        Object.fromEntries(response.headers.entries())
      )

      const data = await response.json()

      if (!response.ok) {
        console.error('[Transcription] API error:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
          error: data.error,
          details: data.details || 'No additional details',
        })
        throw new Error(data.error || `Transcription failed: ${response.status}`)
      }

      console.log('[Transcription] Result:', data)

      if (data.text) {
        setTranscript(data.text)
      } else {
        setError('No speech detected. Please try again.')
      }
    } catch (error: any) {
      console.error('[Transcription] Error:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        response: error.response,
        blobSize: audioBlob.size,
        blobType: audioBlob.type,
        retryCount,
      })

      // Retry logic for transient failures
      if (
        retryCount < MAX_RETRIES &&
        (error.message.includes('network') ||
          error.message.includes('timeout') ||
          error.message.includes('fetch'))
      ) {
        console.log(`[Transcription] Retrying... attempt ${retryCount + 1} of ${MAX_RETRIES}`)
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY))
        return transcribeAudio(audioBlob, retryCount + 1)
      }

      setError(`Failed to process audio: ${error.message || 'Unknown error'}. Please try again.`)
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
    if (dataRequestIntervalRef.current) {
      clearInterval(dataRequestIntervalRef.current)
      dataRequestIntervalRef.current = null
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
      streamRef.current.getTracks().forEach((track) => track.stop())
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

  const clearTranscript = useCallback(() => {
    setTranscript('')
  }, [])

  return {
    isRecording,
    transcript,
    duration,
    error,
    startRecording,
    stopRecording,
    forceCleanup,
    clearTranscript,
    // Expose these for debugging
    isStarting: false,
    isStopping: false,
  }
}
