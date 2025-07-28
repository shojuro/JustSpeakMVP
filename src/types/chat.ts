export interface Message {
  id: string
  session_id: string
  speaker: 'USER' | 'AI'
  content: string
  duration: number | null
  created_at: string
}

export interface Session {
  id: string
  user_id: string
  total_speaking_time: number
  created_at: string
  ended_at: string | null
}
