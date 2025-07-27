'use client'

import { useRef } from 'react'

interface SpeakButtonProps {
  isRecording: boolean
  onStart: () => void
  onStop: () => void
  disabled?: boolean
}

export default function SpeakButton({ isRecording, onStart, onStop, disabled }: SpeakButtonProps) {
  const lastActionTime = useRef<number>(0)
  const cooldownMs = 300 // Minimum time between actions
  
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const now = Date.now()
    if (now - lastActionTime.current < cooldownMs) {
      console.log('Button cooldown active')
      return
    }
    
    if (!disabled && !isRecording) {
      lastActionTime.current = now
      onStart()
    }
  }

  const handleMouseUp = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isRecording) {
      lastActionTime.current = Date.now()
      onStop()
    }
  }

  const handleMouseLeave = () => {
    if (isRecording) {
      lastActionTime.current = Date.now()
      onStop()
    }
  }
  
  // Prevent context menu on long press
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  return (
    <div className="flex flex-col items-center">
      <button
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        onTouchCancel={handleMouseLeave}
        onContextMenu={handleContextMenu}
        disabled={disabled}
        className={`
          relative w-24 h-24 rounded-full flex items-center justify-center
          text-white font-semibold transition-all transform
          ${isRecording 
            ? 'bg-warning scale-110 animate-pulse shadow-lg' 
            : 'bg-primary hover:bg-blue-700 active:scale-95 shadow-md'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          focus:outline-none focus:ring-4 focus:ring-primary focus:ring-opacity-50
        `}
      >
        <svg
          className="w-10 h-10"
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
      
      <p className="mt-4 text-sm text-text-secondary font-medium">
        {isRecording ? 'Release to send' : 'Hold to speak'}
      </p>
    </div>
  )
}