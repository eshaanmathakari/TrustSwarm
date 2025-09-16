// config/environment.js
module.exports = {
  CORAL_PROTOCOL_API_KEY: process.env.CORAL_PROTOCOL_API_KEY,
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  WEBSOCKET_PORT: process.env.WEBSOCKET_PORT || 8080,
  API_PORT: process.env.API_PORT || 3000,
  REDIS_URL: process.env.REDIS_URL, // For caching and pub/sub
  
  // Additional configurations for production readiness
  NODE_ENV: process.env.NODE_ENV || 'development',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Database connection pool settings
  DB_POOL_MIN: parseInt(process.env.DB_POOL_MIN) || 2,
  DB_POOL_MAX: parseInt(process.env.DB_POOL_MAX) || 20,
  
  // Mistral API key for Coral Protocol MCP
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
  
  // Key encryption for secure storage
  KEY_ENCRYPTION_SECRET: process.env.KEY_ENCRYPTION_SECRET,
  
  // Security settings
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
}