export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

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
      corrections: {
        Row: {
          id: string
          message_id: string
          session_id: string
          user_id: string
          original_text: string
          corrected_text: string
          error_types: string[]
          error_count: number
          analysis: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          session_id: string
          user_id: string
          original_text: string
          corrected_text: string
          error_types: string[]
          error_count?: number
          analysis?: Json | null
          created_at?: string
        }
        Update: {
          original_text?: string
          corrected_text?: string
          error_types?: string[]
          error_count?: number
          analysis?: Json | null
        }
      }
      user_progress: {
        Row: {
          id: string
          user_id: string
          date: string
          total_speaking_time: number
          total_messages: number
          error_counts: Json
          improvement_areas: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          total_speaking_time?: number
          total_messages?: number
          error_counts?: Json
          improvement_areas?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          total_speaking_time?: number
          total_messages?: number
          error_counts?: Json
          improvement_areas?: string[] | null
          updated_at?: string
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
