import { NextRequest } from 'next/server'
import crypto from 'crypto'

const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const TOKEN_LENGTH = 32

export function generateCSRFToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex')
}

export function getCSRFToken(request: NextRequest): string | null {
  // Try to get token from cookie first
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
  if (cookieToken) return cookieToken
  
  // For new sessions, we'll generate in middleware
  return null
}

export function validateCSRFToken(request: NextRequest): boolean {
  // Skip CSRF check for GET requests and other safe methods
  const method = request.method.toUpperCase()
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true
  }

  // Skip CSRF for API routes that are public (like time check)
  const pathname = request.nextUrl.pathname
  const publicApiRoutes = ['/api/time']
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    return true
  }

  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
  if (!cookieToken) {
    console.warn('CSRF validation failed: No cookie token')
    return false
  }

  // Get token from header or body
  const headerToken = request.headers.get(CSRF_HEADER_NAME)
  
  // Validate tokens match
  const valid = cookieToken === headerToken
  if (!valid) {
    console.warn('CSRF validation failed: Token mismatch')
  }
  
  return valid
}

export function getCSRFHeaders(token: string): Record<string, string> {
  return {
    [CSRF_HEADER_NAME]: token,
  }
}