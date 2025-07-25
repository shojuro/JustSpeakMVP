/**
 * Clock skew detection and management utilities
 */

interface ClockSkewResult {
  hasSkew: boolean
  skewSeconds: number
  serverTime: Date
  localTime: Date
  message: string
}

/**
 * Detects clock skew by comparing local time with server time
 * @param serverTimeMs Server timestamp in milliseconds
 * @returns Clock skew detection result
 */
export function detectClockSkew(serverTimeMs: number): ClockSkewResult {
  const localTimeMs = Date.now()
  const skewMs = localTimeMs - serverTimeMs
  const skewSeconds = Math.round(skewMs / 1000)
  const absSkewSeconds = Math.abs(skewSeconds)
  
  // Consider >30 seconds as significant skew
  const hasSkew = absSkewSeconds > 30
  
  let message = ''
  if (hasSkew) {
    if (skewSeconds > 0) {
      message = `Your device clock is ${formatTime(absSkewSeconds)} ahead of the server time.`
    } else {
      message = `Your device clock is ${formatTime(absSkewSeconds)} behind the server time.`
    }
  }
  
  return {
    hasSkew,
    skewSeconds,
    serverTime: new Date(serverTimeMs),
    localTime: new Date(localTimeMs),
    message
  }
}

/**
 * Formats seconds into human-readable time
 */
function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  }
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes} minute${minutes !== 1 ? 's' : ''} and ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`
      : `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  return remainingMinutes > 0
    ? `${hours} hour${hours !== 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`
    : `${hours} hour${hours !== 1 ? 's' : ''}`
}

/**
 * Checks if error is related to clock skew
 */
export function isClockSkewError(error: any): boolean {
  if (!error) return false
  
  const errorMessage = error.message || error.toString()
  const clockSkewPatterns = [
    'issued in the future',
    'clock for skew',
    'token used before issued',
    'jwt issued in the future',
    'clock skew detected'
  ]
  
  return clockSkewPatterns.some(pattern => 
    errorMessage.toLowerCase().includes(pattern)
  )
}

/**
 * Gets server time from Supabase headers
 */
export async function getServerTime(): Promise<number | null> {
  try {
    // Make a simple request to get server headers
    const response = await fetch('/api/time', {
      method: 'GET',
      cache: 'no-store'
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.serverTime
    }
    
    // Fallback: try to get from response headers
    const dateHeader = response.headers.get('date')
    if (dateHeader) {
      return new Date(dateHeader).getTime()
    }
  } catch (error) {
    console.error('Failed to get server time:', error)
  }
  
  return null
}