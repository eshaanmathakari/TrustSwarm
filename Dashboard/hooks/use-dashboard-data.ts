import { useState, useEffect } from 'react'

export interface DashboardData {
  trending: any[]
  leaderboard: {
    sports: Array<{
      rank: number
      username: string
      handle: string
      points: number
      streak: string | null
    }>
    finance: {
      guardBots: { count: string; status: string }
      firewall: { percentage: string; status: string }
      htmlWarnings: { count: string; status: string }
    }
  }
  charts: {
    spendings: Array<{ date: string; value: number }>
    sales: Array<{ date: string; value: number }>
    coffee: Array<{ date: string; value: number }>
  }
  notifications: Array<{
    id: string
    title: string
    message: string
    date: string
    type: string
  }>
}

export interface PredictTask {
  title: string
  answers: string[]
  sources: string[]
  created_at: string
  category: string
  event_ticker: string
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/dashboard-data?type=all')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        
        if (result.success) {
          setData(result.data)
        } else {
          throw new Error(result.error || 'Failed to fetch data')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        console.error('Error fetching dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return { data, loading, error, refetch: () => window.location.reload() }
}

export function usePredictTasks(filters?: { category?: string; limit?: number }) {
  const [data, setData] = useState<PredictTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        
        if (filters?.category) params.append('category', filters.category)
        if (filters?.limit) params.append('limit', filters.limit.toString())
        
        const response = await fetch(`/api/predict-tasks?${params.toString()}`)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        
        if (result.success) {
          setData(result.data)
        } else {
          throw new Error(result.error || 'Failed to fetch predict tasks')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        console.error('Error fetching predict tasks:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [filters?.category, filters?.limit])

  return { data, loading, error }
}