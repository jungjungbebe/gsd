export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          nickname: string | null
          level: number
          subscription_status: 'free' | 'subscriber'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          nickname?: string | null
          level?: number
          subscription_status?: 'free' | 'subscriber'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          nickname?: string | null
          level?: number
          subscription_status?: 'free' | 'subscriber'
          updated_at?: string
        }
      }
      contents: {
        Row: {
          id: string
          level: number
          type: 'article' | 'transcription'
          title: string
          body: string
          vocabulary_hints: Json
          source: 'ai' | 'admin'
          created_at: string
        }
        Insert: {
          id?: string
          level: number
          type: 'article' | 'transcription'
          title: string
          body: string
          vocabulary_hints?: Json
          source?: 'ai' | 'admin'
          created_at?: string
        }
        Update: {
          level?: number
          type?: 'article' | 'transcription'
          title?: string
          body?: string
          vocabulary_hints?: Json
          source?: 'ai' | 'admin'
        }
      }
      transcription_missions: {
        Row: {
          id: string
          content_id: string | null
          target_sentence: string
          category: '쿠션어' | '업무메일' | '공문서' | '일반'
          mission_date: string
          created_at: string
        }
        Insert: {
          id?: string
          content_id?: string | null
          target_sentence: string
          category: '쿠션어' | '업무메일' | '공문서' | '일반'
          mission_date?: string
          created_at?: string
        }
        Update: {
          target_sentence?: string
          category?: '쿠션어' | '업무메일' | '공문서' | '일반'
          mission_date?: string
        }
      }
      submissions: {
        Row: {
          id: string
          user_id: string
          mission_id: string
          typed_text: string
          submitted_at: string
        }
        Insert: {
          id?: string
          user_id: string
          mission_id: string
          typed_text: string
          submitted_at?: string
        }
        Update: {
          typed_text?: string
        }
      }
      streaks: {
        Row: {
          user_id: string
          current_streak: number
          longest_streak: number
          last_completed_at: string | null
        }
        Insert: {
          user_id: string
          current_streak?: number
          longest_streak?: number
          last_completed_at?: string | null
        }
        Update: {
          current_streak?: number
          longest_streak?: number
          last_completed_at?: string | null
        }
      }
      badges: {
        Row: {
          id: string
          user_id: string
          badge_type: '7day_streak' | '30day_streak' | 'first_mission' | 'level_up'
          earned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_type: '7day_streak' | '30day_streak' | 'first_mission' | 'level_up'
          earned_at?: string
        }
        Update: {
          badge_type?: '7day_streak' | '30day_streak' | 'first_mission' | 'level_up'
        }
      }
      translations: {
        Row: {
          id: string
          user_id: string | null
          input_text: string
          output_text: string
          relation: string
          purpose: string
          formality: string
          likes: number
          dislikes: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          input_text: string
          output_text: string
          relation: string
          purpose: string
          formality: string
          likes?: number
          dislikes?: number
          created_at?: string
        }
        Update: {
          likes?: number
          dislikes?: number
        }
      }
      translation_votes: {
        Row: {
          id: string
          translation_id: string
          user_id: string
          vote: 'like' | 'dislike'
          created_at: string
        }
        Insert: {
          id?: string
          translation_id: string
          user_id: string
          vote: 'like' | 'dislike'
          created_at?: string
        }
        Update: {
          vote?: 'like' | 'dislike'
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          body: string
          image_url: string | null
          likes_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          body: string
          image_url?: string | null
          likes_count?: number
          created_at?: string
        }
        Update: {
          body?: string
          image_url?: string | null
          likes_count?: number
        }
      }
    }
  }
}
