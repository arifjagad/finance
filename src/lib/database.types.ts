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
      categories: {
        Row: {
          id: string
          name: string
          color: string
          icon: string
          user_id: string
          created_at: string
          type: 'income' | 'expense'
          budget: number | null
        }
        Insert: {
          id?: string
          name: string
          color: string
          icon: string
          user_id: string
          created_at?: string
          type: 'income' | 'expense'
          budget?: number | null
        }
        Update: {
          id?: string
          name?: string
          color?: string
          icon?: string
          user_id?: string
          created_at?: string
          type?: 'income' | 'expense'
          budget?: number | null
        }
      }
      transactions: {
        Row: {
          id: string
          amount: number
          description: string
          date: string
          category_id: string
          user_id: string
          created_at: string
          type: 'income' | 'expense'
          is_recurring: boolean
          recurring_interval: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
          recurring_end_date: string | null
        }
        Insert: {
          id?: string
          amount: number
          description: string
          date: string
          category_id: string
          user_id: string
          created_at?: string
          type: 'income' | 'expense'
          is_recurring?: boolean
          recurring_interval?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
          recurring_end_date?: string | null
        }
        Update: {
          id?: string
          amount?: number
          description?: string
          date?: string
          category_id?: string
          user_id?: string
          created_at?: string
          type?: 'income' | 'expense'
          is_recurring?: boolean
          recurring_interval?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
          recurring_end_date?: string | null
        }
      }
      savings_goals: {
        Row: {
          id: string
          name: string
          target_amount: number
          current_amount: number
          target_date: string | null
          user_id: string
          created_at: string
          color: string
          icon: string
        }
        Insert: {
          id?: string
          name: string
          target_amount: number
          current_amount?: number
          target_date?: string | null
          user_id: string
          created_at?: string
          color: string
          icon: string
        }
        Update: {
          id?: string
          name?: string
          target_amount?: number
          current_amount?: number
          target_date?: string | null
          user_id?: string
          created_at?: string
          color?: string
          icon?: string
        }
      }
      investments: {
        Row: {
          id: string
          name: string
          type: 'stocks' | 'crypto' | 'bonds' | 'real_estate' | 'other'
          amount_invested: number
          current_value: number
          purchase_date: string
          user_id: string
          created_at: string
          notes: string | null
          risk_level: 'low' | 'medium' | 'high'
        }
        Insert: {
          id?: string
          name: string
          type: 'stocks' | 'crypto' | 'bonds' | 'real_estate' | 'other'
          amount_invested: number
          current_value: number
          purchase_date: string
          user_id: string
          created_at?: string
          notes?: string | null
          risk_level: 'low' | 'medium' | 'high'
        }
        Update: {
          id?: string
          name?: string
          type?: 'stocks' | 'crypto' | 'bonds' | 'real_estate' | 'other'
          amount_invested?: number
          current_value?: number
          purchase_date?: string
          user_id?: string
          created_at?: string
          notes?: string | null
          risk_level?: 'low' | 'medium' | 'high'
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string | null
          currency: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string | null
          currency?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string | null
          currency?: string
        }
      }
    }
  }
}