'use client'

import { useEffect, useState } from 'react'
import { detectClockSkew, getServerTime } from '@/lib/clockSkew'

export default function ClockSkewWarning() {
  const [clockSkew, setClockSkew] = useState<{
    hasSkew: boolean
    message: string
  } | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const checkClockSkew = async () => {
      try {
        const serverTime = await getServerTime()
        if (serverTime) {
          const skewResult = detectClockSkew(serverTime)
          if (skewResult.hasSkew) {
            setClockSkew({
              hasSkew: true,
              message: skewResult.message
            })
            console.warn('Clock skew detected:', skewResult)
          }
        }
      } catch (error) {
        console.error('Failed to check clock skew:', error)
      } finally {
        setIsChecking(false)
      }
    }

    checkClockSkew()
    
    // Recheck every 5 minutes
    const interval = setInterval(checkClockSkew, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (isChecking || !clockSkew?.hasSkew || isDismissed) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800">
              System Clock Issue Detected
            </p>
            <p className="text-sm text-amber-700 mt-1">
              {clockSkew.message} This may prevent you from signing in.
            </p>
            <div className="mt-2 text-sm">
              <span className="text-amber-800 font-medium">To fix:</span>
              <ol className="list-decimal list-inside text-amber-700 mt-1">
                <li>Open your device settings</li>
                <li>Navigate to Date & Time settings</li>
                <li>Enable "Set time automatically" or sync with internet time</li>
                <li>Refresh this page after fixing</li>
              </ol>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="flex-shrink-0 ml-4 text-amber-600 hover:text-amber-800"
          aria-label="Dismiss"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}