import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { generateCSRFToken, validateCSRFToken, getCSRFToken } from '@/lib/csrf'
import { rateLimiters } from '@/lib/rateLimit'
import { SecurityEventType, logSecurityViolation } from '@/lib/securityLogger'

export async function middleware(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname

    // Skip middleware for static assets and public files
    if (
      path.startsWith('/_next') ||
      path.startsWith('/favicon') ||
      path === '/manifest.json' ||
      path === '/sw.js' ||
      path.endsWith('.png') ||
      path.endsWith('.jpg') ||
      path.endsWith('.svg') ||
      (path.includes('.') && !path.startsWith('/api'))
    ) {
      return NextResponse.next()
    }

    // Check if this is an API route
    const isApiRoute = path.startsWith('/api')

    // For API routes, apply rate limiting and CSRF validation
    if (isApiRoute) {
      // Apply rate limiting in production (skip in development unless explicitly enabled)
      const isProduction = process.env.NODE_ENV === 'production'
      const enableRateLimit = process.env.ENABLE_RATE_LIMIT === 'true'

      if (isProduction || enableRateLimit) {
        // Determine which rate limiter to use
        let rateLimiter = rateLimiters.api

        if (path.startsWith('/api/auth')) {
          rateLimiter = rateLimiters.auth
        } else if (
          path.startsWith('/api/speech-to-text') ||
          path.startsWith('/api/text-to-speech')
        ) {
          rateLimiter = rateLimiters.speech
        }

        // Apply rate limit
        const { success, limit, remaining, reset } = await rateLimiter(request)

        if (!success) {
          // Log rate limit violation
          logSecurityViolation(SecurityEventType.RATE_LIMIT_EXCEEDED, request, {
            path,
            limit,
            endpoint: path.startsWith('/api/auth')
              ? 'auth'
              : path.startsWith('/api/speech')
                ? 'speech'
                : 'api',
          })

          return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': new Date(reset).toISOString(),
              'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
            },
          })
        }
      }

      // Validate CSRF
      const isValid = validateCSRFToken(request)
      if (!isValid) {
        console.log('[Middleware] CSRF validation failed for:', path, 'Method:', request.method)

        // Log CSRF validation failure
        logSecurityViolation(SecurityEventType.CSRF_VALIDATION_FAILURE, request, {
          path,
          method: request.method,
        })

        return new NextResponse(JSON.stringify({ error: 'Invalid CSRF token' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // Create response once and reuse it
    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    // Set CSRF token cookie if not present
    let csrfToken = getCSRFToken(request)
    if (!csrfToken) {
      csrfToken = generateCSRFToken()
      // Set httpOnly cookie for server-side validation
      response.cookies.set('csrf-token', csrfToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })
    }

    // Always ensure client-accessible token is set
    if (csrfToken) {
      response.cookies.set('csrf-token-client', csrfToken, {
        httpOnly: false, // Allow JavaScript access
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })
    }

    // For page routes that aren't API routes, continue with auth logic
    if (!isApiRoute) {
      // Check if Supabase environment variables are available
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Supabase environment variables not configured')
        return response
      }

      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          get(name: string) {
            const value = request.cookies.get(name)?.value
            console.log(`[Middleware] Getting cookie '${name}':`, !!value)
            return value
          },
          set(name: string, value: string, options: CookieOptions) {
            // Set cookie on both request and response
            console.log(`[Middleware] Setting cookie '${name}' with options:`, {
              httpOnly: options.httpOnly ?? true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: options.sameSite ?? 'lax',
              hasValue: !!value,
            })

            request.cookies.set({
              name,
              value,
              ...options,
            })
            response.cookies.set({
              name,
              value,
              ...options,
              sameSite: options.sameSite ?? 'lax',
              secure: process.env.NODE_ENV === 'production',
              httpOnly: options.httpOnly ?? true,
              path: options.path ?? '/',
              // Ensure auth cookies persist
              maxAge: options.maxAge ?? 60 * 60 * 24 * 365, // 1 year default
            })
          },
          remove(name: string, options: CookieOptions) {
            // Remove cookie from both request and response
            console.log(`[Middleware] Removing cookie '${name}'`)
            request.cookies.delete(name)
            response.cookies.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
              expires: new Date(0),
              sameSite: options.sameSite ?? 'lax',
              secure: process.env.NODE_ENV === 'production',
              httpOnly: options.httpOnly ?? true,
              path: options.path ?? '/',
            })
          },
        },
      })

      // Auth pages that should be accessible without authentication
      const isAuthPage = path.startsWith('/auth/') || path === '/auth'
      const isPublicPage =
        path === '/' || path === '/about' || path === '/system-check' || path === '/chat'
      const isProtectedPage = false // No protected pages for now

      // Skip auth check for auth callback to allow OAuth flow
      if (path === '/auth/callback') {
        console.log('Middleware: Allowing auth callback')
        return response
      }

      // Check for auth cookies to detect recent login
      // Supabase uses cookies with pattern: sb-<project-ref>-auth-token
      const cookies = request.cookies.getAll()
      const hasAuthCookie = cookies.some(
        (cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')
      )
      console.log(
        `Middleware: Auth cookies present: ${hasAuthCookie}, cookie count: ${cookies.length}`
      )

      // If we're on login page and have auth cookies, wait a moment for session to establish
      if (path === '/auth/login' && hasAuthCookie) {
        console.log('Middleware: Detected auth cookies on login page, checking session...')
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error('Middleware auth error:', error)
        // On error, allow access to public and auth pages, protect others
        if (!isAuthPage && !isPublicPage) {
          const redirectUrl = new URL('/auth/login', request.url)
          redirectUrl.searchParams.set('redirectTo', path)
          return NextResponse.redirect(redirectUrl)
        }
        return response
      }

      console.log(
        `Middleware: path=${path}, authenticated=${!!session}, isAuthPage=${isAuthPage}, hasAuthCookie=${hasAuthCookie}`
      )

      // Handle protected routes
      if (isProtectedPage && !session) {
        console.log('Middleware: Redirecting unauthenticated user to login')
        const redirectUrl = new URL('/auth/login', request.url)
        redirectUrl.searchParams.set('redirectTo', path)
        return NextResponse.redirect(redirectUrl)
      }

      // Handle auth pages when already logged in
      // TEMPORARILY DISABLED to debug redirect loop
      // Let client-side handle the redirect after login
      /*
    if (session && isAuthPage && (path === '/auth/login' || path === '/auth/signup')) {
      console.log('Middleware: Authenticated user on auth page - allowing client-side redirect')
      return response
    }
    */
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    // Return a basic response on error to prevent the app from crashing
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\..*|manifest\\.json|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
