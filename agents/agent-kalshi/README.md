# Agent Kalshi

## Environment Variables

Set these before running:

- `KALSHI_API_BASE_URL` (optional) default: `https://demo-api.kalshi.co/trade-api/v2`
- `KALSHI_EMAIL`
- `KALSHI_PASSWORD`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## Usage

- Dev server:

```bash
pnpm dev
```

- Run Kalshi workflow programmatically:

```ts
import { mastra } from './src/mastra';

await mastra.runWorkflow('kalshi-workflow', { category: 'Sports' });
```