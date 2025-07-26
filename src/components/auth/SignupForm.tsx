'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import Link from 'next/link'

export default function SignupForm() {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>('')

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long'
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return 'Password must contain uppercase, lowercase, and a number'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setDebugInfo('Starting signup...')

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password strength
    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    setLoading(true)

    try {
      const { error } = await signUp(email, password)
      if (error) {
        setError(error.message)
        setDebugInfo(`Signup failed: ${error.message}`)
      } else {
        setSuccess(true)
        setDebugInfo('Signup successful! Check your email.')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      setDebugInfo(`Unexpected error: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-4 text-text-primary">
            Check Your Email
          </h2>
          <p className="text-text-secondary mb-6">
            We've sent you a confirmation email. Please check your inbox and click the link to
            activate your account.
          </p>
          <div className="bg-amber-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-amber-800 font-medium mb-2">
              Important: Supabase Email Limitations
            </p>
            <p className="text-sm text-amber-700">
              If you don't receive an email within 5 minutes, it may be due to Supabase's rate limits.
              Free tier only allows 3 emails per hour.
            </p>
          </div>
          <Link href="/auth/login" className="text-primary hover:text-blue-700 font-medium">
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8">
        <h2 className="text-2xl font-bold text-center mb-6 text-text-primary">
          Start Speaking Today
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* Debug info in production */}
        {debugInfo && (
          <div className="mb-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
            {debugInfo}
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

        <div className="mb-4">
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
          <p className="text-xs text-text-muted mt-1">
            At least 8 characters with uppercase, lowercase, and a number
          </p>
        </div>

        <div className="mb-6">
          <label
            className="block text-text-secondary text-sm font-medium mb-2"
            htmlFor="confirmPassword"
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-field"
            placeholder="••••••••"
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={loading}
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>

        <div className="mt-6 text-center">
          <p className="text-text-secondary">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:text-blue-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>

        {/* Production debug links */}
        <div className="mt-4 pt-4 border-t text-center text-xs">
          <Link href="/auth/debug" className="text-gray-500 hover:text-gray-700 mr-4">
            Auth Debug
          </Link>
          <Link href="/system-check" className="text-gray-500 hover:text-gray-700">
            System Check
          </Link>
        </div>
      </form>
    </div>
  )
}