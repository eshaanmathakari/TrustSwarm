# Prophet Arena Data Extraction System

A comprehensive data extraction and analysis pipeline for Prophet Arena prediction data, designed to build trust metrics for AI models based on real-world prediction performance.

## 🎯 Overview

This system scrapes historical prediction data from [Prophet Arena](https://www.prophetarena.co/markets) and processes it to calculate trust scores for AI models. The data includes:

- **Historical Events**: Sports, Economics, and Crypto predictions
- **Model Predictions**: AI model predictions with confidence percentages
- **Actual Outcomes**: Real-world results for trust metric training
- **Trust Scores**: Comprehensive scoring based on accuracy, calibration, confidence, and recency

## 🚀 Quick Start

### 1. Setup
```bash
# Navigate to the directory
cd data/scraped-data/prophet-arena

# Run setup script
./setup.sh
```

### 2. Test the System
```bash
# Check pipeline status
./run_pipeline.sh -a status

# Test with small dataset
./run_pipeline.sh -a scrape -l 5
```

### 3. Run Full Pipeline
```bash
# Scrape all categories with default settings
./run_pipeline.sh

# Or customize the scraping
./run_pipeline.sh -a scrape -c "sports economics" -l 25
```

## 📊 Data Output

All data is stored in the `output/` directory:

- **CSV Files**: `prophet_arena_data_YYYYMMDD_HHMMSS.csv`
- **Trust Leaderboards**: `trust_leaderboard_YYYYMMDD_HHMMSS.csv`
- **Database**: `prophet_arena.db` (SQLite)
- **Reports**: JSON analysis files

## 🔧 Configuration

Edit `config.json` to customize:

```json
{
  "scraping": {
    "categories": ["sports", "economics", "crypto"],
    "limit_per_category": 50,
    "headless": true
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

## 📋 Available Commands

```bash
# Pipeline Actions
./run_pipeline.sh -a scrape     # Scrape data only
./run_pipeline.sh -a metrics    # Calculate trust metrics
./run_pipeline.sh -a reports    # Generate reports
./run_pipeline.sh -a full       # Run complete pipeline
./run_pipeline.sh -a status     # Check system status

# Options
-c "sports economics"           # Specify categories
-l 25                          # Limit per category
-v                             # Visible browser (for debugging)
```

## 🗄️ Database Schema

The system creates a SQLite database with:

- **events**: Event metadata and outcomes
- **predictions**: Individual model predictions
- **model_performance**: Aggregated performance metrics
- **trust_scores**: Calculated trust scores

## 🧮 Trust Metrics

Trust scores are calculated using:

- **Accuracy (40%)**: Prediction correctness
- **Calibration (30%)**: Probability accuracy (Brier Score, Log Loss)
- **Confidence (20%)**: Average prediction confidence
- **Recency (10%)**: Recent performance weighting

## 🔗 TrustSwarm Integration

```python
# Integrate with TrustSwarm
python3 integrate_with_trustswarm.py --action full

# Get agent recommendations
python3 integrate_with_trustswarm.py --action recommend
```

## 📁 File Structure

```
prophet-arena/
├── prophet_arena_scraper.py      # Main scraper
├── trust_metrics.py              # Trust calculation
├── data_pipeline.py              # Pipeline orchestrator
├── integrate_with_trustswarm.py  # TrustSwarm integration
├── database_schema.sql           # Database schema
├── run_pipeline.sh               # Main runner script
├── setup.sh                      # Setup script
├── config.json                   # Configuration
├── requirements.txt              # Dependencies
├── output/                       # Output directory
└── README.md                     # This file
```

## 🚨 Important Notes

- **Rate Limiting**: Built-in delays prevent server overload
- **Headless Mode**: Default browser mode (use `-v` for debugging)
- **Data Storage**: All data saved to `output/` directory
- **Legal Compliance**: Respects Prophet Arena's terms of service

## 🛠️ Troubleshooting

### Common Issues

1. **Dependencies Missing**
   ```bash
   ./setup.sh  # Reinstall dependencies
   ```

2. **Browser Issues**
   ```bash
   ./run_pipeline.sh -v  # Run with visible browser
   ```

3. **Permission Errors**
   ```bash
   chmod +x *.sh  # Make scripts executable
   ```

## 📈 Example Usage

### Scrape Sports Data
```bash
./run_pipeline.sh -a scrape -c "sports" -l 20
```

### Calculate Trust Metrics
```bash
./run_pipeline.sh -a metrics
```

### View Results
```bash
# Check database
sqlite3 prophet_arena.db "SELECT * FROM trust_leaderboard LIMIT 10;"

# View CSV files
ls -la output/
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of the TrustSwarm system and follows the same licensing terms.