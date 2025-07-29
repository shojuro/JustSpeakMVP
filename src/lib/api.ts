/**
 * API utility functions with CSRF protection and Supabase auth
 */
import { supabase } from './supabase/client'

function getCSRFToken(): string | null {
  // Get CSRF token from client-accessible cookie
  const cookies = document.cookie.split(';')
  const csrfCookie = cookies.find((cookie) => cookie.trim().startsWith('csrf-token-client='))
  if (csrfCookie) {
    return csrfCookie.split('=')[1]
  }
  return null
}

interface FetchOptions extends RequestInit {
  skipCSRF?: boolean
  skipAuth?: boolean
}

export async function apiFetch(url: string, options: FetchOptions = {}) {
  const { skipCSRF = false, skipAuth = false, ...fetchOptions } = options

  // Note: Authentication is handled via cookies by Supabase SSR
  // The server-side createClient will automatically use auth cookies
  if (!skipAuth) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        console.log('[apiFetch] User authenticated:', session.user.id)
      } else {
        console.log('[apiFetch] No auth session available')
      }
    } catch (error) {
      console.error('[apiFetch] Error checking auth session:', error)
    }
  }

  // Add CSRF token to headers for state-changing requests
  if (
    !skipCSRF &&
    fetchOptions.method &&
    !['GET', 'HEAD'].includes(fetchOptions.method.toUpperCase())
  ) {
    const csrfToken = getCSRFToken()
    if (csrfToken) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'x-csrf-token': csrfToken,
      }
    }
  }

  // Ensure content-type is set for JSON requests (but not for FormData)
  if (fetchOptions.body && typeof fetchOptions.body === 'string') {
    fetchOptions.headers = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    }
  }

  // Add cache control headers to prevent stale deployments
  fetchOptions.headers = {
    ...fetchOptions.headers,
    'Cache-Control': 'no-cache',
  }

  return fetch(url, fetchOptions)
}
