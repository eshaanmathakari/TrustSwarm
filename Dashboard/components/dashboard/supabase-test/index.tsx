'use client'

import { useDashboardData, usePredictTasks } from '@/hooks/use-dashboard-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export function SupabaseTest() {
  const { data: dashboardData, loading: dashboardLoading, error: dashboardError } = useDashboardData()
  const { data: predictTasks, loading: tasksLoading, error: tasksError } = usePredictTasks({ limit: 10 })

  if (dashboardLoading || tasksLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (dashboardError || tasksError) {
    return (
      <Card className="border-red-500">
        <CardHeader>
          <CardTitle className="text-red-500">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">
            {dashboardError || tasksError}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Data Test */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Data (Supabase Integration)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Trending Predictions:</h3>
            <div className="space-y-2">
              {dashboardData?.trending?.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                  <span>{item.title || `Trending Item ${index + 1}`}</span>
                  <Badge variant="secondary">{item.participants || 0} participants</Badge>
                </div>
              )) || <p>No trending data available</p>}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Leaderboard:</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Sports</h4>
                {dashboardData?.leaderboard?.sports?.map((player) => (
                  <div key={player.rank} className="flex justify-between text-sm">
                    <span>{player.username}</span>
                    <span>{player.points} pts</span>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="font-medium mb-2">Finance</h4>
                <div className="text-sm space-y-1">
                  <div>Guard Bots: {dashboardData?.leaderboard?.finance?.guardBots?.count}</div>
                  <div>Firewall: {dashboardData?.leaderboard?.finance?.firewall?.percentage}</div>
                  <div>Warnings: {dashboardData?.leaderboard?.finance?.htmlWarnings?.count}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Predict Tasks Test */}
      <Card>
        <CardHeader>
          <CardTitle>Predict Tasks (Direct Supabase Query)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {predictTasks?.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <h4 className="font-medium">{task.title}</h4>
                  {task.description && (
                    <p className="text-sm text-gray-600">{task.description}</p>
                  )}
                  <div className="flex gap-2 mt-1">
                    {task.category && <Badge variant="outline">{task.category}</Badge>}
                    {task.status && <Badge variant="secondary">{task.status}</Badge>}
                  </div>
                </div>
                <div className="text-right text-sm">
                  {task.odds && <div>Odds: {task.odds}</div>}
                  {task.participants && <div>Participants: {task.participants}</div>}
                  {task.total_volume && <div>Volume: {task.total_volume}</div>}
                </div>
              </div>
            )) || <p>No predict tasks found</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
