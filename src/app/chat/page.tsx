'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import ChatInterface from '@/components/chat/ChatInterface'

export default function ChatPage() {
  const { user } = useAuth()

  // Allow chat for both authenticated and anonymous users
  return <ChatInterface isAnonymous={!user} />
}
