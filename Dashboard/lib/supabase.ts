import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xeyqicxgycpmsgdofbgk.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhleXFpY3hneWNwbXNnZG9mYmdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDg5OTk5OSwiZXhwIjoyMDY2NDc1OTk5fQ.kpaV9Xg02doFf1BtxL8TXHzdeYCkwFotldJFRNhyQvA'

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
