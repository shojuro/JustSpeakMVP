import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export const createClient = async () => {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = cookieStore.get(name)
          console.log(`[Server Supabase] Getting cookie '${name}':`, !!cookie?.value)
          return cookie?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // Ensure proper cookie options for auth cookies
            const cookieOptions = {
              name,
              value,
              ...options,
              // Ensure these options are set for auth cookies
              httpOnly: options.httpOnly ?? true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: (options.sameSite ?? 'lax') as 'lax' | 'strict' | 'none',
              path: options.path ?? '/',
              // Ensure cookies persist for a reasonable time
              maxAge: options.maxAge ?? 60 * 60 * 24 * 365, // 1 year default
            }

            console.log(`[Server Supabase] Setting cookie '${name}' with options:`, {
              httpOnly: cookieOptions.httpOnly,
              secure: cookieOptions.secure,
              sameSite: cookieOptions.sameSite,
              path: cookieOptions.path,
              hasValue: !!value,
            })

            cookieStore.set(cookieOptions)
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            console.error(`[Server Supabase] Error setting cookie '${name}':`, error)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            console.log(`[Server Supabase] Removing cookie '${name}'`)
            cookieStore.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
              expires: new Date(0),
            })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            console.error(`[Server Supabase] Error removing cookie '${name}':`, error)
          }
        },
      },
    }
  )
}
