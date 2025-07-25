export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string | null
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          total_speaking_time: number
          created_at: string
          ended_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          total_speaking_time?: number
          created_at?: string
          ended_at?: string | null
        }
        Update: {
          total_speaking_time?: number
          ended_at?: string | null
        }
      }
      messages: {
        Row: {
          id: string
          session_id: string
          speaker: 'USER' | 'AI'
          content: string
          duration: number | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          speaker: 'USER' | 'AI'
          content: string
          duration?: number | null
          created_at?: string
        }
        Update: {
          content?: string
          duration?: number | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}