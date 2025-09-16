# TrustSwarm - Decentralized AI Prediction Agents

## Overview

TrustSwarm is a decentralized network of AI prediction agents that use voice-based trust verification to ensure accuracy and reliability in prediction markets. The system leverages Coral Protocol for agent communication and ElevenLabs for voice verification.

## 🚀 Project Status: Task 1 - Foundation Architecture & Database Design ✅ COMPLETED

### ✅ Completed Features

#### 1. Project Structure & Core Architecture
- **Complete directory structure** following Task 1 specifications
- **Environment configuration** with all required API keys
- **Core application setup** with Express.js server
- **WebSocket support** for real-time agent communication
- **Comprehensive logging** with Winston

#### 2. Database Schema & Connection
- **PostgreSQL schema** with all required tables:
  - `agents` - Core agent registry
  - `predictions` - Agent prediction tracking
  - `trust_scores` - Historical trust score records
  - `agent_communications` - Secure message logging
  - `voice_verifications` - Voice-based trust challenges
- **Database connection pooling** with health checks
- **Migration system** with version control
- **Performance views** for analytics

#### 3. API Endpoints
- **Agent Management** (`/api/agents`)
  - Register new agents
  - Get agent details and performance
  - Update trust scores
  - List agents with filtering
- **Prediction Management** (`/api/predictions`)
  - Create and resolve predictions
  - Get prediction statistics
  - Category analysis and leaderboards
- **Trust System** (`/api/trust`)
  - Trust score tracking and history
  - Agent rankings and analytics
  - Trust recalculation endpoints

#### 4. External Service Integration
- **Coral Protocol Client** - MCP integration with Mistral LLM
  - Agent registration and communication
  - Prediction submission and enhancement
  - Trust challenge mechanisms
- **ElevenLabs Client** - Voice verification system
  - Voice generation for agent explanations
  - Voice cloning and authenticity verification
  - Challenge-based trust verification

#### 5. Security & Production Features
- **Rate limiting** and CORS protection
- **Input validation** with express-validator
- **Error handling** and logging
- **Health check endpoints**
- **Graceful shutdown handling**

## 📁 Project Structure

```
TrustSwarm/
├── api/
│   └── routes/
│       ├── agents.js         # Agent management endpoints
│       ├── predictions.js    # Prediction CRUD and analytics
│       └── trust.js          # Trust scoring and rankings
├── config/
│   └── environment.js        # Environment configuration
├── core/
│   ├── coral-protocol/
│   │   └── client.js         # Coral Protocol MCP client
│   └── database/
│       ├── connection.js     # Database connection & queries
│       ├── migrate.js        # Migration system
│       └── schema.sql        # Complete database schema
├── docs/
├── logs/                     # Application logs
├── src/
│   ├── agents/               # Agent-specific modules
│   ├── api/                  # Additional API modules
│   ├── config/               # Additional configuration
│   ├── core/                 # Core system modules
│   └── voice/                # Voice processing modules
├── tests/                    # Test files
├── voice/
│   └── elevenlabs/
│       └── client.js         # ElevenLabs voice client
├── .env.example              # Environment variables template
├── index.js                  # Main application entry point
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

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

### 4. Health Check

Visit http://localhost:3000/health to verify all services are running.

## 🔑 Required API Keys

Configure these in your `.env` file:

- **CORAL_PROTOCOL_API_KEY** - Register at coralprotocol.org
- **MISTRAL_API_KEY** - Coral Protocol MCP uses Mistral LLM
- **ELEVENLABS_API_KEY** - Sign up at elevenlabs.io
- **DATABASE_URL** - PostgreSQL connection string
- **JWT_SECRET** - Generate a secure random string
- **REDIS_URL** - Redis instance for caching

## 📊 Database Schema

### Core Tables
- **agents**: Agent registry with trust scores and specializations
- **predictions**: Prediction tracking with resolution and scoring
- **trust_scores**: Historical trust score calculations
- **agent_communications**: Encrypted agent-to-agent messaging
- **voice_verifications**: Voice-based trust challenges

### Performance Views
- **agent_performance_summary**: Aggregated agent statistics
- **recent_agent_activity**: Recent prediction activity

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

## 🎯 Key Achievements - Task 1

✅ **Complete project structure** with proper organization  
✅ **Environment configuration** ready for all services  
✅ **Database schema** implemented with all required tables  
✅ **Database connection** with pooling and health checks  
✅ **API endpoints** for agents, predictions, and trust  
✅ **Coral Protocol integration** with Mistral LLM support  
✅ **ElevenLabs integration** for voice verification  
✅ **Migration system** for database version control  
✅ **Comprehensive logging** and error handling  
✅ **Production-ready features** (rate limiting, validation, security)  

## 🚧 Next Steps (Future Tasks)

- [ ] Voice verification challenge system implementation
- [ ] Real-time agent communication via WebSocket
- [ ] Prediction market integration (Prophet Arena, Kalshi)
- [ ] Advanced trust scoring algorithms
- [ ] Agent discovery and coordination mechanisms
- [ ] Blockchain integration for stake management
- [ ] Frontend dashboard development

## 🛡️ Security Notes

- Database credentials should never be committed
- API keys are stored in environment variables
- All input validation is implemented
- Rate limiting prevents abuse
- CORS is configured for production

## 📝 Environment Variables

See `.env.example` for all required environment variables. The template includes:

- Database configuration
- API keys for all external services
- Server and security settings
- Development/testing configurations

---

**Status**: Task 1 Foundation Architecture & Database Design - ✅ **COMPLETE**

All requirements from Task 1 have been successfully implemented and are ready for development and testing.