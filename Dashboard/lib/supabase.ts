import { createClient } from 'supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for predict_tasks table
export interface PredictTask {
  id: string
  title: string
  description?: string
  odds?: number
  status?: string
  created_at?: string
  updated_at?: string
  category?: string
  end_date?: string
  participants?: number
  total_volume?: number
}

export interface PredictTaskResponse {
  data: PredictTask[] | null
  error: any
}
