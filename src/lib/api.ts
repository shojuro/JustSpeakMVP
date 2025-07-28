/**
 * API utility functions with CSRF protection
 */

function getCSRFToken(): string | null {
  // Get CSRF token from cookie
  const cookies = document.cookie.split(';')
  const csrfCookie = cookies.find((cookie) => cookie.trim().startsWith('csrf-token='))
  if (csrfCookie) {
    return csrfCookie.split('=')[1]
  }
  return null
}

interface FetchOptions extends RequestInit {
  skipCSRF?: boolean
}

export async function apiFetch(url: string, options: FetchOptions = {}) {
  const { skipCSRF = false, ...fetchOptions } = options

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

  return fetch(url, fetchOptions)
}
