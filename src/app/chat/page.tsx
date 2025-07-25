'use client'

import { useRequireAuth } from '@/hooks/useRequireAuth'
import ChatInterface from '@/components/chat/ChatInterface'

export default function ChatPage() {
  const { user, loading } = useRequireAuth()

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return <ChatInterface />
}