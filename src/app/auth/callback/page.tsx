'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the code from the URL
        const code = new URLSearchParams(window.location.search).get('code')
        
        if (!code) {
          throw new Error('No authorization code found')
        }

        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        
        if (error) {
          throw error
        }

        if (data.session) {
          // Successfully authenticated, redirect to chat
          router.push('/chat')
        } else {
          throw new Error('No session created')
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        setError(err instanceof Error ? err.message : 'An error occurred during authentication')
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/auth/login')
        }, 3000)
      }
    }

    handleAuthCallback()
  }, [router])

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-bg-secondary to-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Authentication Error</h2>
          <p className="text-text-secondary mb-4">{error}</p>
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