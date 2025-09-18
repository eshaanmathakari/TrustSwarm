# Prophet Arena Data Extraction System

This system provides a complete data extraction and analysis pipeline for Prophet Arena prediction data, designed to build trust metrics and model performance analysis.

## Overview

The Prophet Arena Data Extraction System scrapes historical prediction data from [Prophet Arena](https://www.prophetarena.co/markets) and processes it to calculate trust scores for AI models. This data is perfect for training trust metrics and building model performance leaderboards.

## Features

- **Automated Web Scraping**: Scrapes historical events with model predictions
- **Multi-Category Support**: Handles Sports, Economics, and Crypto predictions
- **Trust Metrics Calculation**: Comprehensive trust scoring system
- **Database Storage**: SQLite database with optimized schema
- **Report Generation**: CSV and JSON reports for analysis
- **Configurable Pipeline**: Flexible configuration for different use cases

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Install Chrome WebDriver (for Selenium):
```bash
# On macOS with Homebrew
brew install chromedriver

# Or download from https://chromedriver.chromium.org/
```

## Quick Start

### 1. Run Full Pipeline
```bash
python data_pipeline.py --action full --limit 10
```

### 2. Check Pipeline Status
```bash
python data_pipeline.py --action status
```

### 3. Scrape Data Only
```bash
python data_pipeline.py --action scrape --categories sports economics --limit 20
```

### 4. Calculate Trust Metrics
```bash
python data_pipeline.py --action metrics
```

## Configuration

Edit `config.json` to customize the pipeline:

```json
{
  "database_path": "prophet_arena.db",
  "output_dir": "output",
  "scraping": {
    "headless": true,
    "delay_range": [2, 5],
    "categories": ["sports", "economics", "crypto"],
    "limit_per_category": 50
  },
  "trust_metrics": {
    "weights": {
      "accuracy": 0.4,
      "calibration": 0.3,
      "confidence": 0.2,
      "recency": 0.1
    }
  }
}
```

## Data Structure

### Events Table
- `event_id`: Unique identifier
- `event_title`: Event description
- `category`: sports/economics/crypto
- `resolved_outcome`: Actual result
- `options`: Available choices (JSON)

### Predictions Table
- `model_name`: AI model identifier
- `predicted_option`: Model's prediction
- `probability`: Confidence percentage
- `is_correct`: Whether prediction was right
- `confidence_score`: Normalized confidence

### Trust Scores Table
- `trust_score`: Composite trust metric
- `accuracy`: Prediction accuracy
- `calibration_score`: Probability calibration
- `confidence_score`: Average confidence

## Trust Metrics

The system calculates comprehensive trust scores based on:

1. **Accuracy** (40%): How often the model is correct
2. **Calibration** (30%): How well probabilities match outcomes
3. **Confidence** (20%): Average confidence in predictions
4. **Recency** (10%): Recent performance weighting

### Calibration Metrics
- **Brier Score**: Lower is better (0 = perfect calibration)
- **Log Loss**: Lower is better (0 = perfect calibration)
- **Reliability Diagram**: Visual calibration assessment

## Usage Examples

### Basic Scraping
```python
from prophet_arena_scraper import ProphetArenaScraper

scraper = ProphetArenaScraper(headless=True)
events = scraper.scrape_all_historical_events(
    categories=['sports', 'economics'],
    limit_per_category=25
)
scraper.save_to_database(events)
scraper.close()
```

### Trust Metrics Calculation
```python
from trust_metrics import TrustMetricsCalculator

calculator = TrustMetricsCalculator()
trust_metrics = calculator.calculate_all_trust_scores()
calculator.save_trust_scores(trust_metrics)

# Get leaderboard
leaderboard = calculator.get_trust_leaderboard()
print(leaderboard)
```

### Model Analysis
```python
# Get detailed analysis for a specific model
analysis = calculator.get_model_performance_analysis("GPT-5")
print(f"Accuracy: {analysis['basic_metrics']['accuracy']}")
print(f"Total Predictions: {analysis['basic_metrics']['total_predictions']}")
```

## Output Files

The pipeline generates several output files:

- `prophet_arena_data_YYYYMMDD_HHMMSS.csv`: Raw prediction data
- `trust_leaderboard_YYYYMMDD_HHMMSS.csv`: Overall trust rankings
- `trust_leaderboard_{category}_YYYYMMDD_HHMMSS.csv`: Category-specific rankings
- `model_analysis_{model}_YYYYMMDD_HHMMSS.json`: Detailed model analysis
- `prophet_arena.db`: SQLite database with all data

## Database Queries

### Get Top Models by Trust Score
```sql
SELECT model_name, trust_score, accuracy, total_predictions
FROM trust_leaderboard
ORDER BY trust_score DESC
LIMIT 10;
```

### Model Performance by Category
```sql
SELECT model_name, category, accuracy, total_predictions
FROM model_accuracy_by_category
WHERE category = 'sports'
ORDER BY accuracy DESC;
```

### Recent Performance Analysis
```sql
SELECT model_name, recent_accuracy, recent_predictions
FROM recent_model_performance
WHERE recent_predictions >= 10
ORDER BY recent_accuracy DESC;
```

## Legal and Ethical Considerations

- **Terms of Service**: Always comply with Prophet Arena's terms of service
- **Rate Limiting**: Built-in delays prevent server overload
- **Respectful Scraping**: Implements best practices for web scraping
- **Data Usage**: Use data responsibly and ethically

## Troubleshooting

### Common Issues

1. **ChromeDriver Not Found**
   - Install ChromeDriver and ensure it's in PATH
   - Or use `webdriver-manager` for automatic management

2. **No Events Scraped**
   - Check if Prophet Arena website structure changed
   - Verify network connectivity
   - Try running with `--headless false` to see browser

3. **Database Errors**
   - Ensure write permissions in directory
   - Check if database file is locked by another process

### Debug Mode
```bash
python data_pipeline.py --action scrape --headless false
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs in `data_pipeline.log`
3. Open an issue with detailed error information
