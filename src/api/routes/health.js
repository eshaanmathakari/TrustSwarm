const express = require('express');
const router = express.Router();
const db = require('../../core/database/connection');
const CoralProtocolClient = require('../../core/coral-protocol/client');
const ElevenLabsClient = require('../../voice/elevenlabs/client');

// Initialize clients for health checks
const coralClient = new CoralProtocolClient();
const elevenlabsClient = new ElevenLabsClient();

/**
 * GET /api/health
 * System health check endpoint
 */
router.get('/', async (req, res) => {
    try {
        const startTime = Date.now();
        
        // Check database health
        const dbHealth = await db.healthCheck();
        
        // Check Coral Protocol health
        const coralHealth = await coralClient.healthCheck();
        
        // Check ElevenLabs health
        const elevenLabsHealth = await elevenlabsClient.healthCheck();
        
        // System metrics
        const memoryUsage = process.memoryUsage();
        const uptime = process.uptime();
        const responseTime = Date.now() - startTime;
        
        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            uptime: {
                seconds: uptime,
                human: formatUptime(uptime)
            },
            response_time_ms: responseTime,
            memory: {
                used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
                total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
                external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
            },
            services: {
                database: {
                    status: dbHealth.status,
                    ...(dbHealth.error && { error: dbHealth.error })
                },
                coral_protocol: {
                    status: coralHealth.status,
                    ...(coralHealth.error && { error: coralHealth.error })
                },
                elevenlabs: {
                    status: elevenLabsHealth.status,
                    api_key_valid: elevenLabsHealth.api_key_valid,
                    ...(elevenLabsHealth.error && { error: elevenLabsHealth.error })
                }
            }
        };

        // Determine overall health status
        const serviceStatuses = Object.values(healthStatus.services).map(s => s.status);
        const unhealthyServices = serviceStatuses.filter(status => status !== 'connected' && status !== 'healthy');
        
        if (unhealthyServices.length > 0) {
            healthStatus.status = 'degraded';
            if (dbHealth.status !== 'healthy') {
                healthStatus.status = 'unhealthy';
            }
        }

        const httpStatus = healthStatus.status === 'healthy' ? 200 : 
                          healthStatus.status === 'degraded' ? 207 : 503;

        res.status(httpStatus).json(healthStatus);
        
    } catch (error) {
        console.error('Health check error:', error);
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/health/detailed
 * Detailed health check with component-specific metrics
 */
router.get('/detailed', async (req, res) => {
    try {
        const startTime = Date.now();
        
        // Database detailed health
        const dbResult = await db.query('SELECT COUNT(*) as agent_count FROM agents');
        const predictionResult = await db.query('SELECT COUNT(*) as prediction_count FROM predictions');
        
        // Get system statistics
        const agentCount = parseInt(dbResult.rows[0].agent_count);
        const predictionCount = parseInt(predictionResult.rows[0].prediction_count);
        
        const detailedHealth = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            response_time_ms: Date.now() - startTime,
            statistics: {
                total_agents: agentCount,
                total_predictions: predictionCount,
                active_connections: global.activeConnections || 0
            },
            database: {
                status: 'connected',
                connection_pool: {
                    total: db.pool.totalCount,
                    idle: db.pool.idleCount,
                    waiting: db.pool.waitingCount
                }
            },
            api: {
                rate_limit_status: 'normal',
                last_request_time: new Date().toISOString()
            }
        };

        res.json(detailedHealth);
        
    } catch (error) {
        console.error('Detailed health check error:', error);
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/health/readiness
 * Kubernetes-style readiness probe
 */
router.get('/readiness', async (req, res) => {
    try {
        // Quick database connectivity check
        await db.query('SELECT 1');
        
        res.status(200).json({
            status: 'ready',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(503).json({
            status: 'not ready',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/health/liveness
 * Kubernetes-style liveness probe
 */
router.get('/liveness', (req, res) => {
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Helper function to format uptime
function formatUptime(uptime) {
    const days = Math.floor(uptime / (24 * 60 * 60));
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptime % (60 * 60)) / 60);
    const seconds = Math.floor(uptime % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    
    return parts.join(' ');
}

module.exports = router;