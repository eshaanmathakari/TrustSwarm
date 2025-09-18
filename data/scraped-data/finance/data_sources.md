# Finance Data Sources

## API-Based Sources
1. **Alpha Vantage** – Free tier with 500 requests/day, real-time and historical market data, 50+ technical indicators.
2. **Polygon.io** – Comprehensive US stock market data, real-time prices, WebSocket streams, free tier available.
3. **Marketstack** – Free stock market API with 100 requests/month, 30,000+ tickers, 15+ years historical data.
4. **Financial Modeling Prep (FMP)** – 250 requests/day free tier, comprehensive financial statements, fundamental data.
5. **EODHD** – 20 requests/day free, covers global markets including EU, fundamental and historical data.

## Historical/Research Sources
6. **Quandl** – 2 million financial datasets including 85 global stock indices, commodities, currencies.
7. **Yahoo Finance API** – 500 requests/month via RapidAPI, global market coverage.
8. **IEX Cloud** – Free tier available, stock prices, company financials, news.
9. **Twelve Data** – Real-time and historical data for stocks, forex, crypto with technical indicators.
10. **Finnhub** – Free tier with real-time data, earnings reports, insider transactions, AI sentiment.

## Prompt Template
```python
finance_scraping_prompt = """
Extract the following financial market data from [SOURCE_URL]:
- Real-time stock prices (open, high, low, close, volume)
- Market indices and their movements
- Company financial statements (revenue, profit, debt)
- Economic indicators (inflation, GDP, unemployment)
- Currency exchange rates and forex data
- Commodity prices (gold, oil, agricultural products)
- Market news and analyst ratings

Format as structured JSON:
{
  "timestamp": "ISO-8601",
  "market": "string",
  "securities": [
    {
      "symbol": "string",
      "name": "string", 
      "price": {
        "current": float,
        "open": float,
        "high": float,
        "low": float,
        "volume": int,
        "change_percent": float
      },
      "fundamentals": {
        "market_cap": float,
        "pe_ratio": float,
        "dividend_yield": float
      }
    }
  ],
  "indices": [
    {
      "name": "string",
      "value": float,
      "change": float,
      "change_percent": float
    }
  ]
}
"""
```
