import type { Message } from '@/types/chat'

interface MessageBubbleProps {
  message: Message
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.speaker === 'USER'
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}>
        <p className="text-text-primary">{message.content}</p>
        {isUser && message.duration && (
          <p className="text-xs text-text-muted mt-1">
            {message.duration}s speaking time
          </p>
        )}
      </div>
    </div>
  )
}