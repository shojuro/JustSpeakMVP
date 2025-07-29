import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { isClockSkewError } from '@/lib/clockSkew'

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce', // More secure auth flow
      debug: process.env.NODE_ENV === 'development', // Enable debug logs in dev
      // Use cookies for storage to ensure they're sent with requests
      storage: {
        getItem: (key) => {
          if (typeof document === 'undefined') {
            return null
          }
          const cookies = document.cookie.split('; ')
          const cookie = cookies.find((c) => c.startsWith(`${key}=`))
          if (cookie) {
            return decodeURIComponent(cookie.split('=')[1])
          }
          return null
        },
        setItem: (key, value) => {
          if (typeof document === 'undefined') {
            return
          }
          // Get the Supabase project reference from the URL
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
          const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || ''

          // Set cookie with proper options
          const cookieOptions = [
            `${key}=${encodeURIComponent(value)}`,
            'path=/',
            'max-age=31536000', // 1 year
            'SameSite=Lax',
          ]

          // Add secure flag in production
          if (process.env.NODE_ENV === 'production') {
            cookieOptions.push('Secure')
          }

          document.cookie = cookieOptions.join('; ')
        },
        removeItem: (key) => {
          if (typeof document === 'undefined') {
            return
          }
          // Remove cookie by setting expiry in the past
          document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
        },
      },
    },
    global: {
      headers: {
        'X-Client-Info': 'just-speak-mvp',
      },
    },
  }
)

// Add global error interceptor
const originalAuthSignIn = supabase.auth.signInWithPassword
supabase.auth.signInWithPassword = async (...args) => {
  try {
    const result = await originalAuthSignIn.apply(supabase.auth, args)
    return result
  } catch (error) {
    // Check for clock skew errors
    if (isClockSkewError(error)) {
      console.error('Clock skew detected during sign in:', error)
      throw new Error(
        'Your device clock appears to be incorrect. Please check your system time settings and try again.'
      )
    }
    throw error
  }
}
