'use client'

import Link from 'next/link'
import { useAuth } from '@/components/providers/AuthProvider'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Debug auth state
    console.log('Home page - Auth state:', { user: user?.email, loading })
  }, [user, loading])

  // Show loading while checking auth
  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-bg-secondary to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-bg-secondary to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-text-primary mb-6">
            Speak English Confidently
          </h1>
          <p className="text-xl text-text-secondary mb-8">
            Practice speaking English 24/7 with AI conversation partners. 
            Track your speaking time and build confidence one conversation at a time.
          </p>
          <div className="flex gap-4 justify-center">
            {user ? (
              <>
                <Link href="/chat" className="btn-primary">
                  Continue Practicing
                </Link>
                <button 
                  onClick={async () => {
                    await supabase.auth.signOut()
                    router.refresh()
                  }}
                  className="btn-secondary"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/signup" className="btn-primary">
                  Start Speaking Now
                </Link>
                <Link href="/auth/login" className="btn-secondary">
                  Sign In
                </Link>
              </>
            )}
          </div>
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-4xl mb-4">🎤</div>
              <h3 className="text-lg font-semibold mb-2">Push to Talk</h3>
              <p className="text-text-secondary">
                Simple one-button interface. Just hold and speak naturally.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-4xl mb-4">⏱️</div>
              <h3 className="text-lg font-semibold mb-2">Track Progress</h3>
              <p className="text-text-secondary">
                Monitor your speaking time and see your improvement over time.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-lg font-semibold mb-2">AI Partners</h3>
              <p className="text-text-secondary">
                Natural conversations with AI that adapts to your level.
              </p>
            </div>
          </div>

          {/* Debug info for production */}
          <div className="mt-12 pt-8 border-t text-xs text-gray-500">
            <p>Auth state: {loading ? 'Loading...' : user ? `Logged in as ${user.email}` : 'Not logged in'}</p>
            <div className="mt-2">
              <Link href="/auth/debug" className="text-gray-500 hover:text-gray-700 mr-4">
                Auth Debug
              </Link>
              <Link href="/system-check" className="text-gray-500 hover:text-gray-700 mr-4">
                System Check
              </Link>
              <button
                onClick={() => {
                  localStorage.clear()
                  sessionStorage.clear()
                  window.location.reload()
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                Clear Cache
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}