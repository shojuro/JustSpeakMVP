'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { isClockSkewError } from '@/lib/clockSkew'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the error from the URL if any
        const urlParams = new URLSearchParams(window.location.search)
        const errorCode = urlParams.get('error')
        const errorDescription = urlParams.get('error_description')
        
        if (errorCode) {
          throw new Error(errorDescription || errorCode)
        }

        // When using PKCE flow, Supabase automatically handles the code exchange
        // We just need to check if a session was created
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          throw error
        }

        if (session) {
          // Successfully authenticated, redirect to chat
          router.push('/chat')
        } else {
          // If no session after callback, wait a moment for auth state to update
          const authListener = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
              router.push('/chat')
            }
          })

          // Clean up listener after 5 seconds if no auth state change
          setTimeout(() => {
            authListener.data.subscription.unsubscribe()
            if (!session) {
              setError('Authentication failed. Please try again.')
              setTimeout(() => router.push('/auth/login'), 3000)
            }
          }, 5000)
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        
        if (isClockSkewError(err)) {
          setError('Your device clock appears to be incorrect. Please fix your system time settings and try again.')
        } else {
          setError(err instanceof Error ? err.message : 'An error occurred during authentication')
        }
        
        // Redirect to login after 5 seconds for clock skew, 3 for other errors
        const delay = isClockSkewError(err) ? 5000 : 3000
        setTimeout(() => {
          router.push('/auth/login')
        }, delay)
      }
    }

    handleAuthCallback()
  }, [router])

  if (error) {
    const isClockError = error.includes('clock appears to be incorrect')
    
    return (
      <main className="min-h-screen bg-gradient-to-b from-bg-secondary to-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">{isClockError ? '🕐' : '❌'}</div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            {isClockError ? 'System Time Issue' : 'Authentication Error'}
          </h2>
          <p className="text-text-secondary mb-4">{error}</p>
          {isClockError && (
            <div className="text-sm text-text-secondary mb-4 text-left bg-amber-50 p-4 rounded-lg">
              <p className="font-medium mb-2">To fix this issue:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open your device settings</li>
                <li>Go to Date & Time settings</li>
                <li>Enable "Set time automatically"</li>
                <li>Restart your browser and try again</li>
              </ol>
            </div>
          )}
          <p className="text-sm text-text-muted">Redirecting to login...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-bg-secondary to-white flex items-center justify-center px-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-text-primary">Confirming your email...</h2>
        <p className="text-text-secondary mt-2">Please wait while we log you in.</p>
      </div>
    </main>
  )
}