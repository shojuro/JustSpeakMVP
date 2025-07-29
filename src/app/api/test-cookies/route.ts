import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  console.log('[Test Cookies API] Called')

  try {
    const cookieStore = await cookies()

    // List all cookies
    const allCookies = cookieStore.getAll()
    console.log('[Test Cookies API] Total cookies:', allCookies.length)

    // Get Supabase project reference
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'unknown'

    // Look for Supabase auth cookies
    const authCookies = allCookies.filter(
      (c) =>
        c.name.includes(`sb-${projectRef}`) || c.name.includes('sb-') || c.name.includes('auth')
    )

    // Create Supabase client and test auth
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    // Test setting a cookie
    const testCookieName = 'test-cookie-' + Date.now()
    cookieStore.set({
      name: testCookieName,
      value: 'test-value',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60, // 1 minute
    })

    const response = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      supabaseProjectRef: projectRef,
      cookies: {
        total: allCookies.length,
        names: allCookies.map((c) => c.name),
        authCookies: authCookies.map((c) => ({
          name: c.name,
          hasValue: !!c.value,
          length: c.value?.length || 0,
        })),
      },
      auth: {
        authenticated: !!user,
        userId: user?.id,
        email: user?.email,
        error: error?.message,
      },
      testCookie: {
        name: testCookieName,
        status: 'Cookie set - check if it appears in next request',
      },
    }

    console.log('[Test Cookies API] Response:', response)

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[Test Cookies API] Error:', error)
    return NextResponse.json(
      {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
