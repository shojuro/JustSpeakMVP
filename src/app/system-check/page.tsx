'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { detectClockSkew, getServerTime } from '@/lib/clockSkew'
import Link from 'next/link'

interface SystemStatus {
  clockSync: {
    status: 'checking' | 'ok' | 'error'
    message: string
    details?: any
  }
  supabase: {
    status: 'checking' | 'ok' | 'error'
    message: string
    details?: any
  }
  auth: {
    status: 'checking' | 'ok' | 'error'
    message: string
    details?: any
  }
  browser: {
    status: 'ok'
    message: string
    details: any
  }
}

export default function SystemCheckPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState<SystemStatus>({
    clockSync: { status: 'checking', message: 'Checking clock synchronization...' },
    supabase: { status: 'checking', message: 'Checking Supabase connection...' },
    auth: { status: 'checking', message: 'Checking authentication status...' },
    browser: { 
      status: 'ok', 
      message: 'Browser information',
      details: {
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: typeof window !== 'undefined' ? window.navigator.language : 'N/A'
      }
    }
  })

  useEffect(() => {
    const runChecks = async () => {
      // Check clock synchronization
      try {
        const serverTime = await getServerTime()
        if (serverTime) {
          const skewResult = detectClockSkew(serverTime)
          setStatus(prev => ({
            ...prev,
            clockSync: {
              status: skewResult.hasSkew ? 'error' : 'ok',
              message: skewResult.hasSkew 
                ? `Clock skew detected: ${skewResult.message}`
                : 'Clock is synchronized',
              details: {
                serverTime: skewResult.serverTime.toISOString(),
                localTime: skewResult.localTime.toISOString(),
                skewSeconds: skewResult.skewSeconds
              }
            }
          }))
        } else {
          throw new Error('Could not retrieve server time')
        }
      } catch (error) {
        setStatus(prev => ({
          ...prev,
          clockSync: {
            status: 'error',
            message: 'Failed to check clock synchronization',
            details: error
          }
        }))
      }

      // Check Supabase connection
      try {
        const { data, error } = await supabase.from('profiles').select('id').limit(1)
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          throw error
        }
        
        setStatus(prev => ({
          ...prev,
          supabase: {
            status: 'ok',
            message: 'Connected to Supabase',
            details: {
              url: process.env.NEXT_PUBLIC_SUPABASE_URL,
              connected: true
            }
          }
        }))
      } catch (error) {
        setStatus(prev => ({
          ...prev,
          supabase: {
            status: 'error',
            message: 'Supabase connection failed',
            details: error
          }
        }))
      }

      // Check authentication
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        setStatus(prev => ({
          ...prev,
          auth: {
            status: session ? 'ok' : 'error',
            message: session 
              ? `Authenticated as ${session.user.email}`
              : 'Not authenticated',
            details: {
              hasSession: !!session,
              user: session?.user ? {
                id: session.user.id,
                email: session.user.email,
                confirmed: session.user.confirmed_at ? new Date(session.user.confirmed_at) : null
              } : null,
              expiresAt: session ? new Date(session.expires_at! * 1000).toISOString() : null
            }
          }
        }))
      } catch (error) {
        setStatus(prev => ({
          ...prev,
          auth: {
            status: 'error',
            message: 'Failed to check authentication',
            details: error
          }
        }))
      }
    }

    runChecks()
  }, [])

  const getStatusIcon = (status: 'checking' | 'ok' | 'error') => {
    switch (status) {
      case 'checking':
        return '🔄'
      case 'ok':
        return '✅'
      case 'error':
        return '❌'
    }
  }

  const getStatusColor = (status: 'checking' | 'ok' | 'error') => {
    switch (status) {
      case 'checking':
        return 'text-gray-600'
      case 'ok':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-bg-secondary to-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-primary hover:text-blue-700">
            ← Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">System Check</h1>
        <p className="text-text-secondary mb-8">
          This page helps diagnose authentication and system issues.
        </p>

        <div className="space-y-6">
          {/* Clock Synchronization */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{getStatusIcon(status.clockSync.status)}</span>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">Clock Synchronization</h2>
                <p className={`${getStatusColor(status.clockSync.status)} font-medium`}>
                  {status.clockSync.message}
                </p>
                {status.clockSync.details && (
                  <div className="mt-3 text-sm text-text-secondary">
                    <p>Server Time: {status.clockSync.details.serverTime}</p>
                    <p>Local Time: {status.clockSync.details.localTime}</p>
                    <p>Difference: {status.clockSync.details.skewSeconds} seconds</p>
                  </div>
                )}
                {status.clockSync.status === 'error' && (
                  <div className="mt-4 p-4 bg-amber-50 rounded-lg">
                    <p className="text-sm font-medium text-amber-800 mb-2">How to fix:</p>
                    <ol className="list-decimal list-inside text-sm text-amber-700 space-y-1">
                      <li>Open your device's Date & Time settings</li>
                      <li>Enable "Set time automatically" or "Use network time"</li>
                      <li>If on Windows, run "w32tm /resync" as administrator</li>
                      <li>Refresh this page after fixing</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Supabase Connection */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{getStatusIcon(status.supabase.status)}</span>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">Supabase Connection</h2>
                <p className={`${getStatusColor(status.supabase.status)} font-medium`}>
                  {status.supabase.message}
                </p>
                {status.supabase.details && status.supabase.status === 'ok' && (
                  <div className="mt-3 text-sm text-text-secondary">
                    <p>URL: {status.supabase.details.url}</p>
                  </div>
                )}
                {status.supabase.status === 'error' && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-red-600">
                      View error details
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                      {JSON.stringify(status.supabase.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>

          {/* Authentication Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{getStatusIcon(status.auth.status)}</span>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">Authentication Status</h2>
                <p className={`${getStatusColor(status.auth.status)} font-medium`}>
                  {status.auth.message}
                </p>
                {status.auth.details && status.auth.details.user && (
                  <div className="mt-3 text-sm text-text-secondary">
                    <p>User ID: {status.auth.details.user.id}</p>
                    <p>Email: {status.auth.details.user.email}</p>
                    <p>Email Confirmed: {status.auth.details.user.confirmed ? 'Yes' : 'No'}</p>
                    <p>Session Expires: {status.auth.details.expiresAt}</p>
                  </div>
                )}
                <div className="mt-4 flex gap-3">
                  {status.auth.status === 'ok' ? (
                    <>
                      <Link href="/chat" className="btn-primary text-sm">
                        Go to Chat
                      </Link>
                      <Link href="/auth/debug" className="btn-secondary text-sm">
                        Auth Debug
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link href="/auth/login" className="btn-primary text-sm">
                        Login
                      </Link>
                      <Link href="/auth/signup" className="btn-secondary text-sm">
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Browser Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🌐</span>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">Browser Information</h2>
                <div className="text-sm text-text-secondary space-y-1">
                  <p>Timezone: {status.browser.details.timezone}</p>
                  <p>Language: {status.browser.details.language}</p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-text-secondary hover:text-text-primary">
                      User Agent
                    </summary>
                    <p className="mt-1 text-xs font-mono bg-gray-100 p-2 rounded break-all">
                      {status.browser.details.userAgent}
                    </p>
                  </details>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => window.location.reload()}
                className="btn-secondary text-sm"
              >
                Refresh Checks
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  window.location.reload()
                }}
                className="btn-secondary text-sm"
              >
                Clear Session
              </button>
              <Link href="/" className="btn-secondary text-sm">
                Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}