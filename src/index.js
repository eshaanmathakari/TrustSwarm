const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import configuration and core modules
const config = require('./config/environment');
const db = require('./core/database/connection');
const CoralProtocolClient = require('./core/coral-protocol/client');
const ElevenLabsClient = require('./voice/elevenlabs/client');

// Import API routes (to be created)
const agentRoutes = require('./api/routes/agents');
const predictionRoutes = require('./api/routes/predictions');
const trustRoutes = require('./api/routes/trust');
const voiceRoutes = require('./api/routes/voice');
const healthRoutes = require('./api/routes/health');

class TrustSwarmServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: process.env.NODE_ENV === 'production' ? false : '*',
                methods: ['GET', 'POST']
            }
        });
        
        // Initialize clients
        this.coralClient = new CoralProtocolClient();
        this.elevenlabsClient = new ElevenLabsClient();
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocketHandlers();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: false // Disable for development
        }));
        
        // CORS
        this.app.use(cors({
            origin: process.env.NODE_ENV === 'production' ? 
                process.env.ALLOWED_ORIGINS?.split(',') || [] : 
                true,
            credentials: true
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: process.env.NODE_ENV === 'production' ? 100 : 1000, // requests per window
            message: 'Too many requests from this IP, please try again later.',
            standardHeaders: true,
            legacyHeaders: false,
        });
        this.app.use('/api/', limiter);

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Static files
        this.app.use('/audio', express.static(path.join(__dirname, '../uploads/audio')));
        this.app.use('/docs', express.static(path.join(__dirname, '../docs')));

        // Request logging
        this.app.use((req, res, next) => {
            if (config.LOG_LEVEL === 'debug') {
                console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
            }
            next();
        });
    }

    setupRoutes() {
        // API Routes
        this.app.use('/api/agents', agentRoutes);
        this.app.use('/api/predictions', predictionRoutes);
        this.app.use('/api/trust', trustRoutes);
        this.app.use('/api/voice', voiceRoutes);
        this.app.use('/api/health', healthRoutes);

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                name: 'TrustSwarm Prophet',
                version: '1.0.0',
                description: 'Multi-Agent Predictive Trust Network',
                status: 'operational',
                timestamp: new Date().toISOString(),
                endpoints: {
                    agents: '/api/agents',
                    predictions: '/api/predictions',
                    trust: '/api/trust',
                    voice: '/api/voice',
                    health: '/api/health',
                    websocket: '/socket.io/',
                    docs: '/docs'
                }
            });
        });

        // API documentation endpoint
        this.app.get('/api', (req, res) => {
            res.json({
                title: 'TrustSwarm API Documentation',
                version: '1.0.0',
                description: 'REST API for multi-agent predictive trust network',
                baseUrl: `${req.protocol}://${req.get('host')}/api`,
                endpoints: {
                    'GET /agents': 'List all agents',
                    'POST /agents': 'Register new agent',
                    'GET /agents/:id': 'Get agent details',
                    'PUT /agents/:id/trust': 'Update agent trust score',
                    'GET /predictions': 'List predictions',
                    'POST /predictions': 'Create new prediction',
                    'GET /predictions/:id': 'Get prediction details',
                    'PUT /predictions/:id/resolve': 'Resolve prediction',
                    'GET /trust/scores': 'Get trust scores',
                    'POST /trust/calculate': 'Recalculate trust scores',
                    'POST /voice/challenge': 'Create voice challenge',
                    'POST /voice/verify': 'Verify voice response',
                    'GET /health': 'System health status'
                }
            });
        });

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Endpoint ${req.method} ${req.path} not found`,
                timestamp: new Date().toISOString()
            });
        });
    }

    setupWebSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔌 Client connected: ${socket.id}`);

            // Agent registration for real-time updates
            socket.on('agent:register', async (data) => {
                try {
                    socket.join(`agent:${data.agentId}`);
                    socket.emit('agent:registered', { 
                        status: 'success',
                        agentId: data.agentId,
                        timestamp: new Date().toISOString()
                    });
                    console.log(`🤖 Agent ${data.agentId} registered for real-time updates`);
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Prediction updates
            socket.on('prediction:subscribe', (data) => {
                socket.join(`predictions:${data.category || 'all'}`);
                console.log(`📊 Client subscribed to predictions: ${data.category || 'all'}`);
            });

            // Trust score updates
            socket.on('trust:subscribe', (data) => {
                socket.join('trust:updates');
                console.log('🏆 Client subscribed to trust score updates');
            });

            // Voice verification sessions
            socket.on('voice:session:start', async (data) => {
                try {
                    const sessionId = `voice:${Date.now()}:${socket.id}`;
                    socket.join(sessionId);
                    socket.emit('voice:session:started', { 
                        sessionId,
                        agentId: data.agentId 
                    });
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Disconnection handling
            socket.on('disconnect', () => {
                console.log(`🔌 Client disconnected: ${socket.id}`);
            });
        });

        // Broadcast system events
        setInterval(() => {
            this.io.emit('system:heartbeat', { 
                timestamp: new Date().toISOString(),
                activeConnections: this.io.engine.clientsCount
            });
        }, 30000); // Every 30 seconds
    }

    setupErrorHandling() {
        // Global error handler
        this.app.use((err, req, res, next) => {
            console.error('💥 Global error handler:', err);
            
            res.status(err.status || 500).json({
                error: err.name || 'Internal Server Error',
                message: process.env.NODE_ENV === 'production' ? 
                    'Something went wrong!' : 
                    err.message,
                timestamp: new Date().toISOString(),
                ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
            });
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('💥 Uncaught Exception:', error);
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('🛑 SIGTERM received, shutting down gracefully...');
            this.shutdown();
        });

        process.on('SIGINT', () => {
            console.log('🛑 SIGINT received, shutting down gracefully...');
            this.shutdown();
        });
    }

    async shutdown() {
        console.log('🔄 Shutting down TrustSwarm server...');
        
        // Close server
        this.server.close(() => {
            console.log('✅ HTTP server closed');
        });

        // Close database connections
        try {
            await db.end();
            console.log('✅ Database connections closed');
        } catch (error) {
            console.error('❌ Error closing database connections:', error);
        }

        process.exit(0);
    }

    async start() {
        try {
            // Test database connection
            const dbHealth = await db.healthCheck();
            if (dbHealth.status !== 'healthy') {
                throw new Error('Database health check failed');
            }
            console.log('✅ Database connection verified');

            // Test external services
            const coralHealth = await this.coralClient.healthCheck();
            console.log('🪸 Coral Protocol status:', coralHealth.status);

            const elevenLabsHealth = await this.elevenlabsClient.healthCheck();
            console.log('🔊 ElevenLabs status:', elevenLabsHealth.status);

            // Start server
            const port = config.API_PORT;
            this.server.listen(port, () => {
                console.log('🚀 TrustSwarm Prophet Server started successfully!');
                console.log(`📡 API Server: http://localhost:${port}`);
                console.log(`🔌 WebSocket Server: ws://localhost:${port}/socket.io/`);
                console.log(`📚 API Documentation: http://localhost:${port}/api`);
                console.log(`🏥 Health Check: http://localhost:${port}/api/health`);
                console.log(`🌟 Environment: ${config.NODE_ENV}`);
                console.log('='.repeat(60));
            });

        } catch (error) {
            console.error('💥 Failed to start TrustSwarm server:', error);
            process.exit(1);
        }
    }
}

// Start the server
const server = new TrustSwarmServer();
server.start();

module.exports = server;