import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Skip middleware for static assets and api routes
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Create response once and reuse it
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Set cookie on both request and response
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
          })
        },
        remove(name: string, options: CookieOptions) {
          // Remove cookie from both request and response
          request.cookies.delete(name)
          response.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
            sameSite: options.sameSite ?? 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: options.httpOnly ?? true,
          })
        },
      },
    }
  )

  // Get current path
  const path = request.nextUrl.pathname
  
  // Auth pages that should be accessible without authentication
  const isAuthPage = path.startsWith('/auth/') || path === '/auth'
  const isPublicPage = path === '/' || path === '/about' || path === '/system-check' || path === '/chat'
  const isProtectedPage = false // No protected pages for now
  
  // Skip auth check for auth callback to allow OAuth flow
  if (path === '/auth/callback') {
    console.log('Middleware: Allowing auth callback')
    return response
  }

  // Check for auth cookies to detect recent login
  // Supabase uses cookies with pattern: sb-<project-ref>-auth-token
  const cookies = request.cookies.getAll()
  const hasAuthCookie = cookies.some(cookie => 
    cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')
  )
  console.log(`Middleware: Auth cookies present: ${hasAuthCookie}, cookie count: ${cookies.length}`)

  // If we're on login page and have auth cookies, wait a moment for session to establish
  if (path === '/auth/login' && hasAuthCookie) {
    console.log('Middleware: Detected auth cookies on login page, checking session...')
  }

  const { data: { session }, error } = await supabase.auth.getSession()
  
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
  
  console.log(`Middleware: path=${path}, authenticated=${!!session}, isAuthPage=${isAuthPage}, hasAuthCookie=${hasAuthCookie}`)

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

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}