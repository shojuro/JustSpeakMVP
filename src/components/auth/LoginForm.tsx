'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginForm() {
  const { signIn } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showResendConfirmation, setShowResendConfirmation] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await signIn(email, password)
      if (error) {
        // Handle specific error cases
        if (error.message.includes('Email not confirmed')) {
          setError('Please check your email and confirm your account before logging in.')
          setShowResendConfirmation(true)
        } else if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again.')
        } else if (error.message.includes('User not found')) {
          setError('No account found with this email. Please sign up first.')
        } else {
          setError(error.message)
        }
        console.error('Login error:', error)
      } else {
        // Success - add additional navigation attempt
        console.log('Login successful, attempting navigation...')
        // Give auth state time to update
        setTimeout(() => {
          router.push('/chat')
        }, 500)
      }
    } catch (err) {
      console.error('Unexpected login error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    setResendLoading(true)
    setResendSuccess(false)
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      })
      
      if (error) throw error
      
      setResendSuccess(true)
      setError(null)
      setShowResendConfirmation(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend confirmation email')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8">
        <h2 className="text-2xl font-bold text-center mb-6 text-text-primary">
          Welcome Back
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-error">{error}</p>
            {showResendConfirmation && (
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendLoading}
                className="mt-2 text-sm text-primary hover:text-blue-700 underline"
              >
                {resendLoading ? 'Sending...' : 'Resend confirmation email'}
              </button>
            )}
          </div>
        )}

        {resendSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">
              Confirmation email sent! Please check your inbox and click the link to confirm your account.
            </p>
          </div>
        )}

        <div className="mb-4">
          <label
            className="block text-text-secondary text-sm font-medium mb-2"
            htmlFor="email"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            placeholder="you@example.com"
            required
            disabled={loading}
          />
        </div>

        <div className="mb-6">
          <label
            className="block text-text-secondary text-sm font-medium mb-2"
            htmlFor="password"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            placeholder="••••••••"
            required
            disabled={loading}
          />
        </div>

        <div className="flex items-center justify-between mb-6">
          <Link
            href="/auth/forgot-password"
            className="text-sm text-primary hover:text-blue-700"
          >
            Forgot Password?
          </Link>
        </div>

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div className="mt-6 text-center">
          <p className="text-text-secondary">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-primary hover:text-blue-700 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </form>
    </div>
  )
}