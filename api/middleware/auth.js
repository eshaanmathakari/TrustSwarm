// api/middleware/auth.js - JWT Authentication & Authorization Middleware
const jwt = require('jsonwebtoken');
const db = require('../../core/database/connection');

class AuthMiddleware {
    static generateToken(agentId, permissions = []) {
        return jwt.sign(
            { 
                agent_id: agentId, 
                permissions,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
            },
            process.env.JWT_SECRET
        );
    }

    static async validateToken(req, res, next) {
        try {
            const token = req.header('Authorization')?.replace('Bearer ', '');
            
            if (!token) {
                return res.status(401).json({
                    success: false,
                    error: 'Access token required'
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Verify agent still exists and is active
            const agent = await db.query(
                'SELECT id, name, status FROM agents WHERE id = $1',
                [decoded.agent_id]
            );

            if (agent.rows.length === 0 || agent.rows[0].status !== 'active') {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid or inactive agent'
                });
            }

            req.user = {
                agent_id: decoded.agent_id,
                permissions: decoded.permissions,
                agent_data: agent.rows[0]
            };

            next();

        } catch (error) {
            res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }
    }

    static validateApiKey(req, res, next) {
        const apiKey = req.header('X-API-Key');
        
        if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
            return res.status(401).json({
                success: false,
                error: 'Valid API key required'
            });
        }
        
        next();
    }

    static requirePermission(permission) {
        return (req, res, next) => {
            if (!req.user || !req.user.permissions.includes(permission)) {
                return res.status(403).json({
                    success: false,
                    error: `Permission required: ${permission}`
                });
            }
            next();
        };
    }
}

module.exports = AuthMiddleware;
