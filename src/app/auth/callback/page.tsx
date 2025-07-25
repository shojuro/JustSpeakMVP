'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // Handle the auth callback
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.push('/chat')
      }
    })
  }, [router])

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