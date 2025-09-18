import { createClient } from '@supabase/supabase-js';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const kalshiBetSchema = z.object({
  category: z.enum(['Sports', 'Financial']).describe('Bet category'),
});

const kalshiBetOutputSchema = z.object({
  betTitle: z.string(),
  betAnswers: z.array(z.string()),
  category: z.string(),
  event_ticker: z.string(),
  settlement_sources: z.array(
    z.object({
      name: z.string(),
      url: z.string(),
    }),
  ).default([]),
});

const persistOutputSchema = z.object({
  event_ticker: z.string(),
});

const fetchKalshiBet = createStep({
  id: 'fetch-kalshi-bet',
  description: 'Fetch one bet from Kalshi in Sports or Financial with metadata',
  inputSchema: kalshiBetSchema,
  outputSchema: kalshiBetOutputSchema,
  execute: async ({ inputData }: { inputData: z.infer<typeof kalshiBetSchema> }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }
    console.log("Starttttt")
    const baseUrl = 'https://api.elections.kalshi.com/trade-api/v2';

    // First, fetch existing event_tickers from database
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: existingTasks } = await supabase
      .from('predict_tasks')
      .select('event_ticker');
    
    const existingTickers = new Set((existingTasks || []).map((t: any) => t.event_ticker));
    console.log('Existing event tickers:', Array.from(existingTickers));

    // Find a new event by paginating through Kalshi events
    let cursor = '';
    let desired: { title: string; event_ticker: string; category?: string } | null = null;
    
    while (!desired) {
      const url = `${baseUrl}/events?status=open&limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const pageRes = await fetch(url);
      if (!pageRes.ok) throw new Error(`Kalshi events fetch failed: ${pageRes.status}`);
      
      const pageData = (await pageRes.json()) as { 
        events: { title: string; event_ticker: string; category?: string }[]; 
        cursor?: string 
      };
      
      // Filter by category and exclude existing events
      const availableEvents = pageData.events.filter((e) => 
        (e.category || '').toLowerCase().includes(inputData.category.toLowerCase()) &&
        !existingTickers.has(e.event_ticker)
      );
      
      if (availableEvents.length > 0) {
        desired = availableEvents[Math.floor(Math.random() * availableEvents.length)];
        break;
      }
      
      // If no new events found in this page, try next page
      if (!pageData.cursor) {
        throw new Error(`No new open events found for category ${inputData.category}`);
      }
      cursor = pageData.cursor;
    }
    
    console.log('Chosen new event', desired)

    const eventRes = await fetch(`${baseUrl}/events/${desired.event_ticker}`);
    if (!eventRes.ok) {
      throw new Error(`Kalshi event details failed: ${eventRes.status}`);
    }
    const eventData = (await eventRes.json()) as { event: { title: string }; markets: { subtitle: string }[] };

    // Fetch event metadata for settlement sources
    const metaRes = await fetch(`${baseUrl}/events/${desired.event_ticker}/metadata`);
    if (!metaRes.ok) {
      throw new Error(`Kalshi event metadata failed: ${metaRes.status}`);
    }
    const meta = (await metaRes.json()) as {
      image_url?: string;
      settlement_sources?: { name: string; url: string }[];
    };

    const betTitle = eventData.event.title;
    let betAnswers = eventData.markets.map((m) => m.yes_sub_title).filter(Boolean);
    if (betAnswers.length === 1) {
      betAnswers = ['yes', 'no'];
    }
    const event_ticker = desired.event_ticker;
    const category = inputData.category.toLowerCase();
    const settlement_sources = (meta.settlement_sources || []).filter((s) => s.name && s.url);
    return { betTitle, betAnswers, category, event_ticker, settlement_sources };
  },
});

const persistPredictTask = createStep({
  id: 'persist-predict-task',
  description: 'Store predict task in Supabase table predict_tasks',
  inputSchema: kalshiBetOutputSchema,
  outputSchema: persistOutputSchema,
  execute: async ({ inputData }: { inputData: z.infer<typeof kalshiBetOutputSchema> }) => {
    if (!inputData) throw new Error('Missing input data');

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const payload = {
      title: inputData.betTitle,
      answers: inputData.betAnswers,
      sources: inputData.settlement_sources,
      created_at: new Date().toISOString(),
      category: inputData.category,
      event_ticker: inputData.event_ticker
    } as Record<string, unknown>;
    
    console.log(payload);
    const { data, error } = await supabase
      .from('predict_tasks')
      .upsert(payload, { onConflict: 'event_ticker' })
      .select('event_ticker')
      .single();
    if (error) throw error;
    return { event_ticker: String((data as { event_ticker: string }).event_ticker) };
  },
});

const kalshiWorkflow = createWorkflow({
  id: 'kalshi-workflow',
  inputSchema: kalshiBetSchema,
  outputSchema: persistOutputSchema,
})
  .then(fetchKalshiBet)
  .then(persistPredictTask);

kalshiWorkflow.commit();

export { kalshiWorkflow };
