import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'

    let result: any = {}

    switch (type) {
      case 'trending':
        // Get trending predictions (most active/popular)
        const { data: trendingData, error: trendingError } = await supabase
          .from('predict_tasks')
          .select('*')
          .order('participants', { ascending: false })
          .limit(5)

        if (trendingError) throw trendingError
        result.trending = trendingData || []
        break

      case 'leaderboard':
        // Get leaderboard data (mock data for now, you can replace with actual user data)
        result.leaderboard = {
          sports: [
            { rank: 1, username: 'KRIMSON', handle: '@KRIMSON', points: 148, streak: '2 WEEKS STREAK' },
            { rank: 2, username: 'MATI', handle: '@MATI', points: 129, streak: null },
            { rank: 3, username: 'PEK', handle: '@MATT', points: 108, streak: null },
            { rank: 4, username: 'JOYBOY', handle: '@JOYBOY', points: 64, streak: null }
          ],
          finance: {
            guardBots: { count: '124/124', status: 'RUNNING...' },
            firewall: { percentage: '99.9%', status: 'BLOCKED' },
            htmlWarnings: { count: '12042', status: 'ACCESSIBILITY' }
          }
        }
        break

      case 'charts':
        // Get data for charts (spendings, sales, coffee trends)
        const { data: chartData, error: chartError } = await supabase
          .from('predict_tasks')
          .select('created_at, total_volume, participants')
          .order('created_at', { ascending: true })
          .limit(30)

        if (chartError) throw chartError

        // Process chart data
        result.charts = {
          spendings: chartData?.map((item, index) => ({
            date: new Date(item.created_at || '').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }),
            value: Math.floor(Math.random() * 100) + 50 // Mock data for spendings
          })) || [],
          sales: chartData?.map((item, index) => ({
            date: new Date(item.created_at || '').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }),
            value: item.total_volume || Math.floor(Math.random() * 200) + 100
          })) || [],
          coffee: chartData?.map((item, index) => ({
            date: new Date(item.created_at || '').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }),
            value: Math.floor(Math.random() * 50) + 20 // Mock data for coffee
          })) || []
        }
        break

      case 'notifications':
        // Get notifications (mock data for now)
        result.notifications = [
          {
            id: '1',
            title: 'PAYMENT RECEIVED MED',
            message: 'Your payment to Rampant Studio has been processed successfully.',
            date: '7/10/2024',
            type: 'payment'
          },
          {
            id: '2',
            title: 'INTRO: JOYCO STUDIO AND VØ',
            message: 'About us - We\'re a healthcare company focused on accessibility and innovation.',
            date: '7/10/2024',
            type: 'info'
          },
          {
            id: '3',
            title: 'SYSTEM UPDATE MED',
            message: 'Security patches have been applied to all guard bots.',
            date: '7/10/2024',
            type: 'system'
          }
        ]
        break

      default:
        // Get all dashboard data
        const [trendingRes, chartRes] = await Promise.all([
          supabase
            .from('predict_tasks')
            .select('*')
            .order('participants', { ascending: false })
            .limit(5),
          supabase
            .from('predict_tasks')
            .select('created_at, total_volume, participants')
            .order('created_at', { ascending: true })
            .limit(30)
        ])

        if (trendingRes.error) throw trendingRes.error
        if (chartRes.error) throw chartRes.error

        result = {
          trending: trendingRes.data || [],
          leaderboard: {
            sports: [
              { rank: 1, username: 'KRIMSON', handle: '@KRIMSON', points: 148, streak: '2 WEEKS STREAK' },
              { rank: 2, username: 'MATI', handle: '@MATI', points: 129, streak: null },
              { rank: 3, username: 'PEK', handle: '@MATT', points: 108, streak: null },
              { rank: 4, username: 'JOYBOY', handle: '@JOYBOY', points: 64, streak: null }
            ],
            finance: {
              guardBots: { count: '124/124', status: 'RUNNING...' },
              firewall: { percentage: '99.9%', status: 'BLOCKED' },
              htmlWarnings: { count: '12042', status: 'ACCESSIBILITY' }
            }
          },
          charts: {
            spendings: chartRes.data?.map((item, index) => ({
              date: new Date(item.created_at || '').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }),
              value: Math.floor(Math.random() * 100) + 50
            })) || [],
            sales: chartRes.data?.map((item, index) => ({
              date: new Date(item.created_at || '').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }),
              value: item.total_volume || Math.floor(Math.random() * 200) + 100
            })) || [],
            coffee: chartRes.data?.map((item, index) => ({
              date: new Date(item.created_at || '').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }),
              value: Math.floor(Math.random() * 50) + 20
            })) || []
          },
          notifications: [
            {
              id: '1',
              title: 'PAYMENT RECEIVED MED',
              message: 'Your payment to Rampant Studio has been processed successfully.',
              date: '7/10/2024',
              type: 'payment'
            },
            {
              id: '2',
              title: 'INTRO: JOYCO STUDIO AND VØ',
              message: 'About us - We\'re a healthcare company focused on accessibility and innovation.',
              date: '7/10/2024',
              type: 'info'
            },
            {
              id: '3',
              title: 'SYSTEM UPDATE MED',
              message: 'Security patches have been applied to all guard bots.',
              date: '7/10/2024',
              type: 'system'
            }
          ]
        }
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
