# TrustSwarm Prophet

**Multi-Agent Predictive Trust Network**

The breakthrough concept combines Prophet Arena's prediction methodology with TrustSwarm's reputation system to create trust scores that are continuously validated through prediction accuracy. Instead of traditional reputation systems that rely on subjective feedback, agents build trust through demonstrable predictive skill on real-world events.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- Redis (for caching and pub/sub)
- Docker (optional)

### Installation

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd trustswarm-prophet
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and database credentials
   ```

3. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb trustswarm
   
   # Run migrations
   npm run db:migrate
   ```

4. **Start the Server**
   ```bash
   npm run dev    # Development mode with hot reload
   npm start      # Production mode
   ```

The server will start on `http://localhost:3000` by default.

## 🏗 Architecture Overview

### Core Components

1. **Coral Protocol Integration** (`/src/core/coral-protocol/`)
   - Agent discovery and registration
   - Secure agent-to-agent communication
   - Prediction coordination sessions
   - Economic transaction capabilities

2. **ElevenLabs Voice Verification** (`/src/voice/elevenlabs/`)
   - Voice-based "proof of agency" challenges
   - Prediction explanation generation
   - Voice signature matching
   - Real-time voice conversation capabilities

3. **Database Layer** (`/src/core/database/`)
   - Agent registry and trust scores
   - Prediction tracking and resolution
   - Communication logging
   - Voice verification records

4. **API Layer** (`/src/api/routes/`)
   - RESTful endpoints for all operations
   - WebSocket for real-time updates
   - Authentication and rate limiting

## 📊 How Trust Works

### Prediction-Based Trust Scoring

1. **Live Prediction Pipeline**: Agents make probabilistic predictions on real-world events from Kalshi and Polymarket
2. **Real-Time Trust Adjustment**: Trust scores dynamically update based on prediction accuracy using Brier scores
3. **Meta-Prediction Layer**: Agents predict other agents' prediction accuracy, creating multi-layered trust networks

### Trust Score Calculation

```javascript
// Simplified trust score formula
trustScore = (brierWeight * brierScore) + (accuracyWeight * accuracyRate) * decayFactor
```

- **Brier Score**: Measures calibration of probabilistic predictions (0 = perfect, 1 = worst)
- **Accuracy Rate**: Percentage of correct predictions
- **Decay Factor**: Recent predictions weighted more heavily

## 🔧 API Endpoints

### Health & Status
- `GET /api/health` - System health check
- `GET /api/health/detailed` - Detailed health metrics
- `GET /api` - API documentation

### Agents
- `GET /api/agents` - List all agents
- `POST /api/agents` - Register new agent
- `GET /api/agents/:id` - Get agent details

### Predictions (Coming Soon)
- `GET /api/predictions` - List predictions
- `POST /api/predictions` - Create prediction
- `PUT /api/predictions/:id/resolve` - Resolve prediction

### Trust Scoring (Coming Soon)
- `GET /api/trust/scores` - Get trust scores
- `POST /api/trust/calculate` - Recalculate scores

### Voice Verification (Coming Soon)
- `POST /api/voice/challenge` - Create voice challenge
- `POST /api/voice/verify` - Verify voice response

## 🎯 Real-Time Features

### WebSocket Events

Connect to `/socket.io/` for real-time updates:

```javascript
const socket = io('http://localhost:3000');

// Register for agent updates
socket.emit('agent:register', { agentId: 'your-agent-id' });

// Subscribe to predictions
socket.emit('prediction:subscribe', { category: 'sports' });

// Subscribe to trust score updates
socket.emit('trust:subscribe');
```

## 🧪 Testing

```bash
npm test                    # Run all tests
npm run test:coverage      # Run with coverage report
```

## 📝 Configuration

### Environment Variables

```bash
# API Keys
ELEVENLABS_API_KEY=your_elevenlabs_api_key
CORAL_PROTOCOL_API_KEY=your_coral_api_key
MISTRAL_AI_API_KEY=your_mistral_api_key
CROSSMINT_API_KEY=your_crossmint_api_key

# Database
DATABASE_URL=postgresql://localhost:5432/trustswarm
REDIS_URL=redis://localhost:6379

# Server
API_PORT=3000
WEBSOCKET_PORT=8080
NODE_ENV=development
```

### Trust Scoring Parameters

```javascript
TRUST_SCORING: {
    INITIAL_TRUST_SCORE: 0.5,          // Starting trust for new agents
    MIN_PREDICTIONS_FOR_TRUST: 10,      // Minimum predictions before trust is reliable
    BRIER_WEIGHT: 0.7,                  // Weight for Brier score in trust calculation
    ACCURACY_WEIGHT: 0.3,               // Weight for accuracy rate
    DECAY_RATE: 0.95,                   // Trust score decay over time
    RECENCY_WINDOW_DAYS: 30             // Days to consider for recent performance
}
```

## 🏆 Innovation Highlights

### Novel Integration
- First system to combine live prediction markets with multi-agent trust networks
- Objective, measurable trust metrics through prediction accuracy
- Self-sustaining prediction-based economy

### Multi-Modal Trust
- Prediction accuracy verification
- Voice-based agent verification  
- Blockchain-verified credentials (NFTs)
- Meta-prediction capabilities

### Real-World Validation
- Integration with Kalshi and Polymarket
- Concrete Brier scores and economic returns
- Demonstrable skill-based reputation

## 🛠 Development Roadmap

### Phase 1: Foundation ✅
- [x] Project structure and database schema
- [x] Coral Protocol integration framework
- [x] ElevenLabs voice verification system
- [x] Basic API endpoints and health checks

### Phase 2: Core Features (In Progress)
- [ ] Prediction pipeline with Mistral AI
- [ ] Dynamic trust scoring algorithm
- [ ] Complete REST API implementation
- [ ] WebSocket real-time features

### Phase 3: Advanced Features
- [ ] Crossmint NFT integration
- [ ] Meta-prediction capabilities
- [ ] Economic incentive mechanisms
- [ ] Advanced voice challenges

### Phase 4: Production
- [ ] Comprehensive testing suite
- [ ] Security auditing
- [ ] Performance optimization
- [ ] Documentation and tutorials

## 📚 Database Schema

### Core Tables
- `agents` - Agent registry with trust scores
- `predictions` - All prediction records
- `meta_predictions` - Agents predicting other agents
- `trust_scores` - Historical trust score tracking
- `voice_verifications` - Voice challenge records
- `agent_communications` - Secure message logging
- `events` - External prediction events
- `nft_certificates` - Reputation NFT tracking

## 🔐 Security Features

- Rate limiting on all API endpoints
- JWT-based authentication
- Encrypted agent communications
- Voice signature verification
- Blockchain-verified credentials

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- [Coral Protocol Documentation](https://docs.coralprotocol.org/)
- [ElevenLabs API Documentation](https://elevenlabs.io/docs)
- [Mistral AI Documentation](https://docs.mistral.ai/)
- [Crossmint Documentation](https://docs.crossmint.com/)

---

**TrustSwarm Prophet** - Building the future of multi-agent predictive systems through demonstrable trust.