# TrustSwarm - Decentralized AI Prediction Agents

## Overview

TrustSwarm is a decentralized network of AI prediction agents that builds trust through demonstrable predictive skill on real-world events. The breakthrough concept combines Prophet Arena's prediction methodology with TrustSwarm's reputation system to create trust scores that are continuously validated through prediction accuracy.

Instead of traditional reputation systems that rely on subjective feedback, agents build trust through measurable performance on actual predictions across sports, finance, and crypto markets.

## 🎯 Core Innovation

**Trust Through Performance**: Our system creates objective trust scores based on:
- **Prediction Accuracy**: How often agents make correct predictions
- **Calibration**: How well probability estimates match actual outcomes
- **Confidence Management**: Appropriate confidence levels for predictions
- **Recency Weighting**: Recent performance carries more weight
- **Domain Specialization**: Trust scores per prediction category

## �� Project Structure
TrustSwarm/
├── api/
│ └── routes/
│ ├── agents.js # Agent management endpoints
│ ├── predictions.js # Prediction CRUD and analytics
│ └── trust.js # Trust scoring and rankings
├── config/
│ └── environment.js # Environment configuration
├── core/
│ ├── coral-protocol/
│ │ └── client.js # Coral Protocol MCP client
│ └── database/
│ ├── connection.js # Database connection & queries
│ ├── migrate.js # Migration system
│ └── schema.sql # Complete database schema
├── data/
│ └── scraped-data/ # Prophet Arena and market data
│ ├── finance/ # Financial market data sources
│ ├── sports/ # Sports prediction data
│ └── prophet-arena/ # Prophet Arena integration
├── agents/
│ ├── predict0-agent/ # Specialized prediction agents
│ ├── predict1-agent/
│ ├── predict2-agent/
│ └── interface/ # Agent orchestration
├── Dashboard/ # Next.js dashboard interface
├── coral-integration/ # Coral Protocol integration
├── tests/ # Test files
├── .env.example # Environment variables template
├── index.js # Main application entry point
├── package.json # Dependencies and scripts
└── README.md 

## 🛠️ Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd trustswarm

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your API keys
```

### 2. Database Setup

```bash
# Run database migrations
npm run migrate

# Or manually:
node core/database/migrate.js up
```

### 3. Start the Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start on:
- **HTTP API**: http://localhost:3000
- **WebSocket**: ws://localhost:8080
- **Dashboard**: http://localhost:3001

### 4. Health Check

Visit http://localhost:3000/health to verify all services are running.

## 🔑 Required API Keys

Configure these in your `.env` file:

- **CORAL_PROTOCOL_API_KEY** - Register at coralprotocol.org
- **MISTRAL_API_KEY** - Coral Protocol MCP uses Mistral LLM
- **DATABASE_URL** - PostgreSQL connection string
- **JWT_SECRET** - Generate a secure random string
- **REDIS_URL** - Redis instance for caching

## 📊 Trust Scoring System

### Trust Score Components

Our trust scoring algorithm combines multiple factors:

1. **Accuracy (40%)**: Binary correctness of predictions
2. **Calibration (30%)**: How well probability estimates match outcomes (Brier Score, Log Loss)
3. **Confidence (20%)**: Appropriate confidence levels for predictions
4. **Recency (10%)**: Recent performance weighted more heavily

### Database Schema

#### Core Tables
- **agents**: Agent registry with trust scores and specializations
- **predictions**: Prediction tracking with resolution and scoring
- **trust_scores**: Historical trust score calculations
- **agent_communications**: Agent-to-agent messaging
- **prediction_outcomes**: Actual event outcomes for validation

#### Performance Views
- **agent_performance_summary**: Aggregated agent statistics
- **recent_agent_activity**: Recent prediction activity
- **trust_leaderboard**: Real-time trust rankings

## �� Agent Types

### Prediction Agents
- **Sports Specialists**: NBA, NFL, MLB, Premier League predictions
- **Finance Experts**: Stock market, crypto, forex predictions
- **Generalists**: Cross-domain prediction capabilities

### Orchestration
- **Interface Agent**: Coordinates tasks across multiple agents
- **Benchmark System**: Compares multiple agents on same predictions
- **Trust Analyzer**: Calculates and updates trust scores

## 🔧 Available Scripts

```bash
npm start          # Start production server
npm run dev        # Start with nodemon (development)
npm run migrate    # Run database migrations
npm test           # Run tests
npm run lint       # Run ESLint
npm run build      # Build and lint check
```

## 📈 API Documentation

### Agent Management
- `GET /api/agents` - List agents with filtering
- `POST /api/agents` - Register new agent
- `GET /api/agents/:id` - Get agent details
- `GET /api/agents/:id/performance` - Get performance metrics

### Predictions
- `GET /api/predictions` - List predictions with filtering
- `POST /api/predictions` - Create new prediction
- `PUT /api/predictions/:id/resolve` - Resolve prediction
- `GET /api/predictions/stats/summary` - System statistics

### Trust System
- `GET /api/trust/rankings` - Trust-based agent rankings
- `GET /api/trust/scores` - Trust score history
- `PUT /api/trust/recalculate/:agent_id` - Recalculate trust score

## 🎯 Data Sources

### Prophet Arena Integration
- Historical prediction data from Prophet Arena
- Real-world event outcomes for validation
- Trust metric training data

### Market Data
- **Finance**: Binance, SEC filings, Reuters, Yahoo Finance
- **Sports**: ESPN, NBA Stats, NFL API, Premier League data
- **Crypto**: CoinGecko, CoinDesk, real-time market data

## 🚀 Key Features

- **Objective Trust Scoring**: Based on measurable prediction performance
- **Multi-Agent Benchmarking**: Compare multiple AI models simultaneously
- **Real-time Dashboard**: Live trust rankings and performance metrics
- **Coral Protocol Integration**: Seamless agent communication
- **Comprehensive Data Pipeline**: Automated data collection and validation
- **Domain Specialization**: Trust scores per prediction category

## 🔮 Future Enhancements

- [ ] Advanced calibration metrics (Brier Score, Log Loss)
- [ ] Cross-validation with external prediction markets
- [ ] Agent capability negotiation and discovery
- [ ] Distributed agent deployment
- [ ] Advanced trust visualization and analytics