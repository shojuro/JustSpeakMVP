'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ChatPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [loading, user, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-secondary">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-border-light">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-primary">Just Speak</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-secondary">{user.email}</span>
            <button
              onClick={() => signOut()}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-bold text-text-primary mb-4">
              Welcome to Just Speak! 🎉
            </h2>
            <p className="text-text-secondary mb-6">
              You're all set up and ready to start practicing. The chat interface is coming soon!
            </p>
            <div className="bg-bg-secondary rounded-lg p-6">
              <p className="text-sm text-text-muted">
                Next up: Building the real-time chat interface with speech recording...
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}