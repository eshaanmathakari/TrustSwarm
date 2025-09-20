# Supabase Integration for TrustSwarm Dashboard

This document explains the Supabase integration added to the Dashboard for fetching betting odds and prediction data.

## Setup

### 1. Install Dependencies
```bash
cd Dashboard
npm install
# or
pnpm install
```

### 2. Environment Variables
Create a `.env.local` file in the Dashboard directory with:
```
NEXT_PUBLIC_SUPABASE_URL=https://xeyqicxgycpmsgdofbgk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhleXFpY3hneWNwbXNnZG9mYmdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDg5OTk5OSwiZXhwIjoyMDY2NDc1OTk5fQ.kpaV9Xg02doFf1BtxL8TXHzdeYCkwFotldJFRNhyQvA
```

## API Endpoints

### 1. Predict Tasks API
- **GET** `/api/predict-tasks` - Fetch all predict tasks
- **POST** `/api/predict-tasks` - Create a new predict task

Query Parameters:
- `limit` - Number of records to fetch (default: 50)
- `category` - Filter by category
- `status` - Filter by status

Example:
```javascript
// Fetch all predict tasks
const response = await fetch('/api/predict-tasks')
const data = await response.json()

// Fetch with filters
const response = await fetch('/api/predict-tasks?category=sports&limit=10')
const data = await response.json()
```

### 2. Dashboard Data API
- **GET** `/api/dashboard-data` - Fetch all dashboard data
- **GET** `/api/dashboard-data?type=trending` - Fetch only trending data
- **GET** `/api/dashboard-data?type=leaderboard` - Fetch only leaderboard data
- **GET** `/api/dashboard-data?type=charts` - Fetch only chart data
- **GET** `/api/dashboard-data?type=notifications` - Fetch only notifications

## React Hooks

### useDashboardData()
Fetches all dashboard data including trending predictions, leaderboards, charts, and notifications.

```typescript
import { useDashboardData } from '@/hooks/use-dashboard-data'

function MyComponent() {
  const { data, loading, error } = useDashboardData()
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  
  return (
    <div>
      <h2>Trending: {data?.trending?.length} items</h2>
      {/* Render your dashboard components */}
    </div>
  )
}
```

### usePredictTasks(filters?)
Fetches predict tasks with optional filters.

```typescript
import { usePredictTasks } from '@/hooks/use-dashboard-data'

function PredictTasksList() {
  const { data, loading, error } = usePredictTasks({ 
    category: 'sports', 
    limit: 20 
  })
  
  return (
    <div>
      {data?.map(task => (
        <div key={task.id}>
          <h3>{task.title}</h3>
          <p>Odds: {task.odds}</p>
          <p>Participants: {task.participants}</p>
        </div>
      ))}
    </div>
  )
}
```

## Database Schema

The integration expects a `predict_tasks` table with the following structure:

```sql
CREATE TABLE predict_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  odds DECIMAL,
  status TEXT,
  category TEXT,
  end_date TIMESTAMP,
  participants INTEGER DEFAULT 0,
  total_volume DECIMAL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Test Component

A test component is available at `/components/dashboard/supabase-test/index.tsx` to verify the integration is working correctly.

## Usage in Dashboard Components

To use the data in your dashboard components:

1. Import the hooks:
```typescript
import { useDashboardData, usePredictTasks } from '@/hooks/use-dashboard-data'
```

2. Use the data in your components:
```typescript
const { data: dashboardData } = useDashboardData()
const { data: predictTasks } = usePredictTasks({ limit: 5 })

// Access trending predictions
const trendingPredictions = dashboardData?.trending

// Access leaderboard data
const sportsLeaderboard = dashboardData?.leaderboard?.sports
const financeData = dashboardData?.leaderboard?.finance

// Access chart data
const spendingsData = dashboardData?.charts?.spendings
const salesData = dashboardData?.charts?.sales
```

## Error Handling

Both hooks include error handling and loading states. Always check for errors and loading states before rendering data:

```typescript
const { data, loading, error } = useDashboardData()

if (loading) return <LoadingSpinner />
if (error) return <ErrorMessage error={error} />
if (!data) return <NoDataMessage />

// Safe to use data here
return <DashboardComponent data={data} />
```
