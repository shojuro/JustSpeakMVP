'use client'

import { useState, useRef, useCallback } from 'react'
import { apiFetch } from '@/lib/api'

export function useVoiceSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const speak = useCallback(async (text: string) => {
    try {
      // Cancel any ongoing speech
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Stop any playing audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      setError(null)
      setIsSpeaking(true)

      // Create new abort controller
      abortControllerRef.current = new AbortController()

      console.log('[Voice] Requesting speech synthesis for text:', text.substring(0, 50) + '...')

      // Call the text-to-speech API
      const response = await apiFetch('/api/text-to-speech', {
        method: 'POST',
        body: JSON.stringify({ text }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[Voice] API error response:', errorData)
        throw new Error(errorData.error || 'Failed to generate speech')
      }

      // Get the audio data
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      console.log('[Voice] Audio received, size:', audioBlob.size)

      // Create and play audio
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onplay = () => {
        console.log('[Voice] Audio playback started')
      }

      audio.onended = () => {
        console.log('[Voice] Audio playback ended')
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
        audioRef.current = null
      }

      audio.onerror = (e) => {
        console.error('[Voice] Audio playback error:', e)
        setError('Failed to play audio')
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
        audioRef.current = null
      }

      // Play the audio
      await audio.play()
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[Voice] Speech synthesis aborted')
      } else {
        console.error('[Voice] Speech synthesis error:', error)
        setError(error.message || 'Failed to synthesize speech')
      }
      setIsSpeaking(false)
    }
  }, [])

  const stop = useCallback(() => {
    console.log('[Voice] Stopping speech')

    // Abort any ongoing API request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    setIsSpeaking(false)
  }, [])

  return {
    speak,
    stop,
    isSpeaking,
    error,
  }
}
