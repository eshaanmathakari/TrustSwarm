const express = require('express');
const router = express.Router();
const db = require('../../core/database/connection');
const CoralProtocolClient = require('../../core/coral-protocol/client');

const coralClient = new CoralProtocolClient();

/**
 * GET /api/agents
 * List all agents with optional filtering
 */
router.get('/', async (req, res) => {
    try {
        const { type, status, limit = 50, offset = 0 } = req.query;
        
        let query = 'SELECT * FROM agents';
        const params = [];
        const conditions = [];
        
        if (type) {
            conditions.push(`type = $${params.length + 1}`);
            params.push(type);
        }
        
        if (status) {
            conditions.push(`status = $${params.length + 1}`);
            params.push(status);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ` ORDER BY trust_score DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await db.query(query, params);
        
        res.json({
            agents: result.rows,
            total: result.rowCount,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
    } catch (error) {
        console.error('Error fetching agents:', error);
        res.status(500).json({ error: 'Failed to fetch agents' });
    }
});

/**
 * POST /api/agents
 * Register a new agent
 */
router.post('/', async (req, res) => {
    try {
        const { name, type, specialization_domains, public_key } = req.body;
        
        // Validate required fields
        if (!name || !type || !public_key) {
            return res.status(400).json({ 
                error: 'Missing required fields: name, type, public_key' 
            });
        }
        
        // Register with Coral Protocol first
        const coralRegistration = await coralClient.registerAgent({
            name,
            type,
            specialization_domains,
            public_key
        });
        
        // Insert into local database
        const insertQuery = `
            INSERT INTO agents (name, type, coral_agent_id, public_key, specialization_domains)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        
        const result = await db.query(insertQuery, [
            name,
            type,
            coralRegistration.coral_agent_id,
            public_key,
            specialization_domains || []
        ]);
        
        res.status(201).json({
            agent: result.rows[0],
            coral_registration: coralRegistration
        });
        
    } catch (error) {
        console.error('Error registering agent:', error);
        res.status(500).json({ error: 'Failed to register agent' });
    }
});

/**
 * GET /api/agents/:id
 * Get agent details by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT a.*, 
                   COUNT(p.id) as total_predictions,
                   AVG(p.brier_score) as avg_brier_score,
                   COUNT(CASE WHEN p.was_correct = true THEN 1 END) as successful_predictions
            FROM agents a
            LEFT JOIN predictions p ON a.id = p.agent_id
            WHERE a.id = $1
            GROUP BY a.id
        `;
        
        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Agent not found' });
        }
        
        res.json({ agent: result.rows[0] });
        
    } catch (error) {
        console.error('Error fetching agent:', error);
        res.status(500).json({ error: 'Failed to fetch agent' });
    }
});

module.exports = router;