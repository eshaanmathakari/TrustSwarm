require('dotenv').config();

module.exports = {
  // API Keys
  CORAL_PROTOCOL_API_KEY: process.env.CORAL_PROTOCOL_API_KEY,
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || 'sk_0d002edda7e015396b7cbd364dc90ea40a57c45370ff7d79',
  MISTRAL_AI_API_KEY: process.env.MISTRAL_AI_API_KEY,
  CROSSMINT_API_KEY: process.env.CROSSMINT_API_KEY,
  KALSHI_API_KEY: process.env.KALSHI_API_KEY,
  POLYMARKET_API_KEY: process.env.POLYMARKET_API_KEY,

  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/trustswarm',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // Server Configuration
  API_PORT: process.env.API_PORT || 3000,
  WEBSOCKET_PORT: process.env.WEBSOCKET_PORT || 8080,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Security
  JWT_SECRET: process.env.JWT_SECRET || 'trustswarm_super_secure_jwt_secret_2024_hackathon',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'trustswarm_encryption_key_32chars',

  // Blockchain Configuration
  ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL,
  PRIVATE_KEY: process.env.PRIVATE_KEY,

  // Logging & Monitoring
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  SENTRY_DSN: process.env.SENTRY_DSN,

  // Coral Protocol Configuration
  CORAL_PROTOCOL: {
    SERVER_URL: process.env.CORAL_SERVER_URL || 'http://localhost:5555',
    API_VERSION: 'v1',
    TIMEOUT: 30000
  },

  // ElevenLabs Configuration
  ELEVENLABS: {
    VOICE_ID: process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB', // Default Adam voice
    MODEL_ID: process.env.ELEVENLABS_MODEL_ID || 'eleven_monolingual_v1',
    VOICE_SETTINGS: {
      stability: 0.5,
      similarity_boost: 0.5,
      style: 0.0,
      use_speaker_boost: true
    }
  },

  // Mistral AI Configuration
  MISTRAL: {
    BASE_URL: 'https://api.mistral.ai/v1',
    MODELS: {
      SMALL: 'mistral-small-latest',
      MEDIUM: 'mistral-medium-latest',
      LARGE: 'mistral-large-latest'
    }
  },

  // Prediction Market Configuration
  PREDICTION_MARKETS: {
    KALSHI: {
      BASE_URL: 'https://trading-api.kalshi.com/trade-api/v2',
      TIMEOUT: 10000
    },
    POLYMARKET: {
      BASE_URL: 'https://api.polymarket.com',
      TIMEOUT: 10000
    }
  },

  // Trust Scoring Parameters
  TRUST_SCORING: {
    INITIAL_TRUST_SCORE: 0.5,
    MIN_PREDICTIONS_FOR_TRUST: 10,
    BRIER_WEIGHT: 0.7,
    ACCURACY_WEIGHT: 0.3,
    DECAY_RATE: 0.95, // Trust score decay over time
    RECENCY_WINDOW_DAYS: 30
  }
};