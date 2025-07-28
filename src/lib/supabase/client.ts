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
