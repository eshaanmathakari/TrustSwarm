# Prophet Arena Data Sources

## Overview
Prophet Arena is a prediction market platform where AI models make predictions on various events across Sports, Economics, and Crypto domains. The platform provides historical data on resolved events with model predictions and actual outcomes.

## Data Structure
- **URL**: https://www.prophetarena.co/markets
- **Historical Events**: Resolved predictions with actual outcomes
- **Categories**: Sports, Economics, Crypto
- **Model Predictions**: Percentage predictions for each option/contender
- **Truth Labels**: Actual resolved outcomes for training trust metrics

## Data Extraction Flow

### 1. Configurable Scraping Process
- Navigate to https://www.prophetarena.co/markets
- Enable "Historical" filter
- Filter by category: "Sports", "Economics", or "Crypto"
- Extract data for each resolved event

### 2. Event Data Structure
Each resolved event contains:
- **Event Title**: e.g., "Pro Men's Basketball: Champion?"
- **Resolved Outcome**: e.g., "Oklahoma City"
- **Predictions Table**: 
  - Rows: Options/Contenders (e.g., Oklahoma City, Indiana)
  - Columns: Models (e.g., GPT-5 (medium), o3 Mini)
  - Cells: Predicted percentages

### 3. Target Data Schema
```json
{
  "event_id": "string",
  "event_title": "string",
  "category": "sports|economics|crypto",
  "event_date": "YYYY-MM-DD",
  "resolved_date": "YYYY-MM-DD",
  "resolved_outcome": "string",
  "options": ["option1", "option2", ...],
  "predictions": [
    {
      "model_name": "string",
      "option": "string",
      "probability": float,
      "is_correct": boolean,
      "confidence_score": float
    }
  ],
  "metadata": {
    "prediction_rationale": "string",
    "sources_used": ["source1", "source2"],
    "event_url": "string"
  }
}
```

### 4. Trust Metrics Use Cases
- Build live-updating trust leaderboards
- Tune reward/penalty multipliers
- Filter by model, category, recency
- Aggregate performance metrics
- Train trust scoring algorithms

## Legal Considerations
- No public API available - web scraping required
- Must comply with terms of service
- Implement respectful scraping practices
- Add delays between requests
- Handle rate limiting gracefully
