'use client'

import React, { useRef } from 'react'

interface SpeakButtonProps {
  isRecording: boolean
  onStart: () => void
  onStop: () => void
  disabled?: boolean
}

export default function SpeakButton({ isRecording, onStart, onStop, disabled }: SpeakButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()

    console.log('[Button] Start event, disabled:', disabled, 'isRecording:', isRecording)

    if (!disabled && !isRecording) {
      onStart()
    }
  }

  const handleStop = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()

    console.log('[Button] Stop event, isRecording:', isRecording)

    if (isRecording) {
      onStop()
    }
  }

  const handleMouseLeave = () => {
    console.log('[Button] Mouse leave, isRecording:', isRecording)
    if (isRecording) {
      onStop()
    }
  }

  // Global mouse up handler to catch releases outside button
  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      console.log('[Button] Global mouse up, isRecording:', isRecording)
      if (isRecording) {
        onStop()
      }
    }

    const handleGlobalTouchEnd = () => {
      console.log('[Button] Global touch end, isRecording:', isRecording)
      if (isRecording) {
        onStop()
      }
    }

    if (isRecording) {
      document.addEventListener('mouseup', handleGlobalMouseUp)
      document.addEventListener('touchend', handleGlobalTouchEnd)

      return () => {
        document.removeEventListener('mouseup', handleGlobalMouseUp)
        document.removeEventListener('touchend', handleGlobalTouchEnd)
      }
    }
  }, [isRecording, onStop])

  // Prevent context menu on long press
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  return (
    <div className="flex flex-col items-center">
      <button
        ref={buttonRef}
        onMouseDown={handleStart}
        onMouseUp={handleStop}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleStart}
        onTouchEnd={handleStop}
        onTouchCancel={handleMouseLeave}
        onContextMenu={handleContextMenu}
        disabled={disabled}
        className={`
          relative w-16 h-16 rounded-full flex items-center justify-center
          text-white font-semibold transition-all transform
          ${
            isRecording
              ? 'bg-warning scale-110 animate-pulse shadow-lg'
              : 'bg-primary hover:bg-blue-700 active:scale-95 shadow-md'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          focus:outline-none focus:ring-4 focus:ring-primary focus:ring-opacity-50
        `}
      >
        <svg
          className="w-8 h-8"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <p className="mt-2 text-xs text-text-secondary">
        {isRecording ? 'Release to send' : 'Hold to speak'}
      </p>
    </div>
  )
}
