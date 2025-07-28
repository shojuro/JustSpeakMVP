/**
 * Security event logging utility
 * Logs security-related events for monitoring and audit trails
 */

export enum SecurityEventType {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  SIGNUP_SUCCESS = 'SIGNUP_SUCCESS',
  SIGNUP_FAILURE = 'SIGNUP_FAILURE',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',
  
  // Authorization events
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  FORBIDDEN_ACCESS = 'FORBIDDEN_ACCESS',
  
  // Security protection events
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CSRF_VALIDATION_FAILURE = 'CSRF_VALIDATION_FAILURE',
  FILE_VALIDATION_FAILURE = 'FILE_VALIDATION_FAILURE',
  INPUT_VALIDATION_FAILURE = 'INPUT_VALIDATION_FAILURE',
  
  // API events
  API_ERROR = 'API_ERROR',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

export interface SecurityEvent {
  type: SecurityEventType
  timestamp: string
  ip?: string
  userAgent?: string
  userId?: string
  email?: string
  details?: Record<string, any>
  severity: 'info' | 'warning' | 'error' | 'critical'
}

class SecurityLogger {
  private events: SecurityEvent[] = []
  private maxEvents = 1000 // Keep last 1000 events in memory

  /**
   * Log a security event
   */
  log(event: Omit<SecurityEvent, 'timestamp'>) {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    }

    // Add to in-memory store
    this.events.push(fullEvent)
    
    // Trim if exceeds max
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SECURITY] ${event.type}:`, fullEvent)
    }

    // In production, you would send this to a logging service
    // Example: this.sendToLoggingService(fullEvent)
    
    // For critical events, you might want to alert immediately
    if (event.severity === 'critical') {
      this.handleCriticalEvent(fullEvent)
    }
  }

  /**
   * Get recent security events
   */
  getRecentEvents(limit = 100): SecurityEvent[] {
    return this.events.slice(-limit)
  }

  /**
   * Get events by type
   */
  getEventsByType(type: SecurityEventType, limit = 100): SecurityEvent[] {
    return this.events
      .filter(event => event.type === type)
      .slice(-limit)
  }

  /**
   * Get events by user
   */
  getEventsByUser(userId: string, limit = 100): SecurityEvent[] {
    return this.events
      .filter(event => event.userId === userId)
      .slice(-limit)
  }

  /**
   * Clear old events
   */
  clearOldEvents(olderThanHours = 24) {
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - olderThanHours)
    
    this.events = this.events.filter(
      event => new Date(event.timestamp) > cutoffTime
    )
  }

  /**
   * Handle critical security events
   */
  private handleCriticalEvent(event: SecurityEvent) {
    // In production, this would:
    // 1. Send immediate alerts to security team
    // 2. Trigger automated responses
    // 3. Log to external security monitoring service
    console.error('[CRITICAL SECURITY EVENT]', event)
  }

  /**
   * Format log message for external logging services
   */
  private formatLogMessage(event: SecurityEvent): string {
    const { type, timestamp, ip, userId, email, details, severity } = event
    const parts = [
      `[${severity.toUpperCase()}]`,
      `${type}`,
      `timestamp=${timestamp}`,
    ]

    if (ip) parts.push(`ip=${ip}`)
    if (userId) parts.push(`userId=${userId}`)
    if (email) parts.push(`email=${email}`)
    if (details) parts.push(`details=${JSON.stringify(details)}`)

    return parts.join(' ')
  }
}

// Export singleton instance
export const securityLogger = new SecurityLogger()

// Helper functions for common logging scenarios
export function logAuthEvent(
  type: SecurityEventType,
  request: Request,
  options: {
    userId?: string
    email?: string
    details?: Record<string, any>
    severity?: 'info' | 'warning' | 'error' | 'critical'
  } = {}
) {
  const ip = request.headers.get('x-forwarded-for') || 
    request.headers.get('x-real-ip') || 
    'unknown'
    
  const userAgent = request.headers.get('user-agent') || 'unknown'

  securityLogger.log({
    type,
    ip,
    userAgent,
    severity: options.severity || 'info',
    ...options,
  })
}

export function logSecurityViolation(
  type: SecurityEventType,
  request: Request,
  details: Record<string, any>
) {
  logAuthEvent(type, request, {
    details,
    severity: 'warning',
  })
}

export function logCriticalSecurityEvent(
  type: SecurityEventType,
  request: Request,
  details: Record<string, any>
) {
  logAuthEvent(type, request, {
    details,
    severity: 'critical',
  })
}