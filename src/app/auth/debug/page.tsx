'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import Link from 'next/link'

export default function AuthDebugPage() {
  const { user } = useAuth()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        setSession(session)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get session')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const handleResendConfirmation = async () => {
    if (!user?.email) return
    
    setResendLoading(true)
    setResendMessage(null)
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      })
      
      if (error) throw error
      
      setResendMessage('Confirmation email sent! Please check your inbox.')
    } catch (err) {
      setResendMessage(err instanceof Error ? err.message : 'Failed to resend email')
    } finally {
      setResendLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-bg-secondary to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-bg-secondary to-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-primary hover:text-blue-700">
            ← Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-8">Auth Debug Information</h1>

        <div className="space-y-6">
          {/* Environment Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Environment</h2>
            <div className="space-y-2 font-mono text-sm">
              <div>
                <span className="text-text-secondary">App URL:</span>{' '}
                <span className="text-text-primary">{window.location.origin}</span>
              </div>
              <div>
                <span className="text-text-secondary">Supabase URL:</span>{' '}
                <span className="text-text-primary">{process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'}</span>
              </div>
            </div>
          </div>

          {/* Auth Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Auth Status</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">Authenticated:</span>
                <span className={session ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                  {session ? 'Yes' : 'No'}
                </span>
              </div>
              {user && (
                <>
                  <div>
                    <span className="text-text-secondary">User ID:</span>{' '}
                    <span className="font-mono text-xs">{user.id}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Email:</span>{' '}
                    <span className="font-mono">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-text-secondary">Email Confirmed:</span>
                    <span className={user.confirmed_at ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {user.confirmed_at ? 'Yes' : 'No'}
                    </span>
                    {!user.confirmed_at && (
                      <button
                        onClick={handleResendConfirmation}
                        disabled={resendLoading}
                        className="ml-4 text-sm bg-primary text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {resendLoading ? 'Sending...' : 'Resend Confirmation'}
                      </button>
                    )}
                  </div>
                  {resendMessage && (
                    <div className={`mt-2 text-sm ${resendMessage.includes('sent') ? 'text-green-600' : 'text-red-600'}`}>
                      {resendMessage}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Session Details */}
          {session && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Session Details</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-text-secondary">Expires at:</span>{' '}
                  <span className="font-mono">
                    {new Date(session.expires_at * 1000).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary">Provider:</span>{' '}
                  <span className="font-mono">{session.user?.app_metadata?.provider || 'email'}</span>
                </div>
              </div>
              
              <details className="mt-4">
                <summary className="cursor-pointer text-text-secondary hover:text-text-primary">
                  View Full Session (Debug)
                </summary>
                <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-2 text-red-800">Error</h2>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="flex gap-4">
              {session ? (
                <>
                  <Link href="/chat" className="btn-primary">
                    Go to Chat
                  </Link>
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut()
                      window.location.reload()
                    }}
                    className="btn-secondary"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="btn-primary">
                    Login
                  </Link>
                  <Link href="/auth/signup" className="btn-secondary">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}