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

  // Add Supabase auth headers
  if (!skipAuth) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'Authorization': `Bearer ${session.access_token}`,
        }
        console.log('[apiFetch] Added auth header for user:', session.user.id)
      } else {
        console.log('[apiFetch] No auth session available')
      }
    } catch (error) {
      console.error('[apiFetch] Error getting auth session:', error)
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
