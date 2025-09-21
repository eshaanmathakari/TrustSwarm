import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for predict_tasks table
export interface PredictTask {
  title: string
  answers: string[]
  sources: string[]
  created_at: string
  category: string
  event_ticker: string
}

export interface PredictTaskResponse {
  data: PredictTask[] | null
  error: any
}
