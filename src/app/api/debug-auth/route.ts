import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export async function GET(request: NextRequest) {
  console.log('[Debug Auth API] Called')

  try {
    const cookieStore = await cookies()

    // Log ALL cookies
    const allCookies = cookieStore.getAll()
    console.log('[Debug Auth API] Total cookies:', allCookies.length)
    console.log(
      '[Debug Auth API] Cookie details:',
      allCookies.map((c) => ({
        name: c.name,
        length: c.value?.length || 0,
        sample: c.value?.substring(0, 20) + '...',
      }))
    )

    // Get Supabase project reference
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'unknown'

    // Create multiple Supabase clients to test different approaches

    // Approach 1: Standard server client
    const supabase1 = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const cookie = cookieStore.get(name)
            console.log(`[Debug Auth API] Cookie get '${name}':`, !!cookie?.value)
            return cookie?.value
          },
        },
      }
    )

    // Test auth with standard client
    const {
      data: { user: user1 },
      error: error1,
    } = await supabase1.auth.getUser()

    // Approach 2: Try manual cookie parsing
    const authToken = cookieStore.get(`sb-${projectRef}-auth-token`)
    const authRefresh = cookieStore.get(`sb-${projectRef}-auth-token-refresh`)

    // Approach 3: Look for any sb- prefixed cookies
    const sbCookies = allCookies.filter((c) => c.name.startsWith('sb-'))

    const debugInfo = {
      environment: {
        nodeEnv: process.env.NODE_ENV,
        supabaseUrl: supabaseUrl,
        projectRef: projectRef,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        vercelUrl: process.env.VERCEL_URL,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
      },
      cookies: {
        totalCount: allCookies.length,
        cookieNames: allCookies.map((c) => c.name),
        sbCookies: sbCookies.map((c) => ({ name: c.name, hasValue: !!c.value })),
        expectedAuthCookie: `sb-${projectRef}-auth-token`,
        foundAuthToken: !!authToken,
        foundRefreshToken: !!authRefresh,
      },
      auth: {
        approach1_serverClient: {
          authenticated: !!user1,
          userId: user1?.id,
          email: user1?.email,
          error: error1?.message,
        },
      },
      headers: {
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
        cookie: request.headers.get('cookie')?.substring(0, 100) + '...',
      },
    }

    console.log('[Debug Auth API] Debug info:', debugInfo)

    return NextResponse.json(debugInfo)
  } catch (error: any) {
    console.error('[Debug Auth API] Error:', error)
    return NextResponse.json(
      {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
