import { useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'

export function useRequireAuth() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [loading, user, router])

  return { user, loading }
}
