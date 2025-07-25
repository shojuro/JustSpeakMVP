'use client'

import Link from 'next/link'
import { useAuth } from '@/components/providers/AuthProvider'

export default function HomePage() {
  const { user } = useAuth()

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
              <Link href="/chat" className="btn-primary">
                Continue Practicing
              </Link>
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
        </div>
      </div>
    </main>
  )
}