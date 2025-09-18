// api/routes/agents.js - Agent Management Routes
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../../core/database/connection');
const AgentDiscovery = require('../../core/coral-protocol/agent-discovery');
const auth = require('../middleware/auth');
const router = express.Router();

const agentDiscovery = new AgentDiscovery();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// GET /agents - List all agents with filtering
router.get('/', async (req, res) => {
    try {
        const { type, specialization, min_trust_score } = req.query;
        
        let query = 'SELECT * FROM agents WHERE status = $1';
        let params = ['active'];
        let paramIndex = 2;

        if (type) {
            query += ` AND type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }

        if (specialization) {
            query += ` AND $${paramIndex} = ANY(specialization_domains)`;
            params.push(specialization);
            paramIndex++;
        }

        if (min_trust_score) {
            query += ` AND trust_score >= $${paramIndex}`;
            params.push(parseFloat(min_trust_score));
        }

        query += ' ORDER BY trust_score DESC';

        const result = await db.query(query, params);
        
        res.json({
            success: true,
            agents: result.rows,
            count: result.rows.length
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /agents/:id - Get specific agent details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const agent = await db.query(`
            SELECT a.*, 
                   COUNT(p.id) as prediction_count,
                   AVG(p.brier_score) as avg_brier_score,
                   COUNT(CASE WHEN p.was_correct = true THEN 1 END) as correct_predictions
            FROM agents a
            LEFT JOIN predictions p ON a.id = p.agent_id
            WHERE a.id = $1
            GROUP BY a.id
        `, [id]);

        if (agent.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found'
            });
        }

        res.json({
            success: true,
            agent: agent.rows[0]
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /agents - Register new agent
router.post('/', auth.validateApiKey, async (req, res) => {
    try {
        const { name, type, specialization_domains } = req.body;

        if (!name || !type || !specialization_domains) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, type, specialization_domains'
            });
        }

        const registration = await agentDiscovery.registerAgent({
            name,
            type,
            specialization_domains
        });

        res.status(201).json(registration);

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// PUT /agents/:id/trust-score - Update agent trust score
router.put('/:id/trust-score', auth.validateApiKey, async (req, res) => {
    try {
        const { id } = req.params;
        const { score, category, calculation_method, event_count } = req.body;

        // Update main trust score
        await db.query(
            'UPDATE agents SET trust_score = $1, updated_at = NOW() WHERE id = $2',
            [score, id]
        );

        // Log trust score history
        await db.query(`
            INSERT INTO trust_scores (agent_id, score, category, calculation_method, event_count)
            VALUES ($1, $2, $3, $4, $5)
        `, [id, score, category, calculation_method, event_count]);

        res.json({
            success: true,
            message: 'Trust score updated successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/agents/:id/performance - Get agent performance metrics
router.get('/:id/performance',
  param('id').isUUID().withMessage('Invalid agent ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const query = `
        SELECT * FROM agent_performance_summary 
        WHERE id = $1
      `;
      
      const result = await db.query(query, [req.params.id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching agent performance:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/agents/:id/predictions - Get agent's predictions
router.get('/:id/predictions',
  param('id').isUUID().withMessage('Invalid agent ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { limit = 20, offset = 0, resolved } = req.query;
      
      let query = `
        SELECT * FROM predictions 
        WHERE agent_id = $1
      `;
      const params = [req.params.id];
      
      if (resolved !== undefined) {
        query += ' AND actual_outcome IS ' + (resolved === 'true' ? 'NOT NULL' : 'NULL');
      }
      
      query += ' ORDER BY prediction_timestamp DESC LIMIT $2 OFFSET $3';
      params.push(parseInt(limit), parseInt(offset));
      
      const result = await db.query(query, params);
      
      res.json({
        predictions: result.rows,
        total: result.rows.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      console.error('Error fetching agent predictions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;