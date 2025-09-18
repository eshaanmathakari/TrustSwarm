# Sports Data Sources

## API-Based Sources
1. **API-Sports.io** – Real-time sports data covering 2,000+ competitions with 15+ years of historical data, live scores updated every 15 seconds.
2. **SportsData.io** – Live sports data provider for NFL, NBA, MLB, NHL, PGA Golf with real-time scores, odds, projections.
3. **Sportradar API** – World leader in sports data, covering 80+ sports, 500+ leagues, 750,000+ events yearly.
4. **LSports API** – Real-time data covering 30+ sports, 40K monthly events with live scores, fixtures, standings.
5. **MySportsFeeds** – Real-time sports data API, free for non-commercial use, available in XML, JSON, CSV.

## Scraping-Based Sources
6. **ESPN** – Comprehensive sports coverage with scores, schedules, statistics. ParseHub can scrape without coding.
7. **Yahoo Sports** – Fantasy football projections, live game data accessible via scraping.
8. **SerpApi Google Sports** – Real-time sports results via Google Sports API with team names, scores, tournaments.
9. **Broadage Sports API** – Real-time data from 100+ leagues in 20+ languages, 500+ sports events.
10. **LiveScore** – Real-time scores and live game tracking data.

## Prompt Template
```python
sports_scraping_prompt = """
Extract the following sports data from [SOURCE_URL]:
- Match results and live scores
- Team statistics (wins, losses, rankings) 
- Player performance metrics (goals, assists, points)
- Schedule information (upcoming fixtures, dates, venues)
- Historical match data and head-to-head records
- League standings and tournament brackets

Format the extracted data as structured JSON with the following schema:
{
  "sport": "string",
  "league": "string", 
  "matches": [
    {
      "date": "YYYY-MM-DD",
      "teams": {"home": "string", "away": "string"},
      "score": {"home": int, "away": int},
      "venue": "string",
      "status": "live/finished/scheduled"
    }
  ],
  "teams": [
    {
      "name": "string",
      "ranking": int,
      "wins": int,
      "losses": int,
      "points": int
    }
  ]
}
"""
```
