// api/routes/agents.js - Agent Management Routes
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../../core/database/connection');
const router = express.Router();

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

// GET /api/agents - List all agents
router.get('/', async (req, res) => {
  try {
    const { type, limit = 20, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM agents WHERE status = $1';
    const params = ['active'];
    
    if (type) {
      query += ' AND type = $2';
      params.push(type);
    }
    
    query += ' ORDER BY trust_score DESC, created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await db.query(query, params);
    
    res.json({
      agents: result.rows,
      total: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/agents/:id - Get agent by ID
router.get('/:id', 
  param('id').isUUID().withMessage('Invalid agent ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const agent = await db.getAgentById(req.params.id);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      res.json(agent);
    } catch (error) {
      console.error('Error fetching agent:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/agents - Create new agent
router.post('/',
  [
    body('name').isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
    body('type').isIn(['sports', 'politics', 'economics', 'meta']).withMessage('Invalid agent type'),
    body('coral_agent_id').isLength({ min: 5 }).withMessage('Coral agent ID required'),
    body('public_key').isLength({ min: 10 }).withMessage('Public key required'),
    body('specialization_domains').isArray({ min: 1 }).withMessage('At least one specialization domain required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, type, coral_agent_id, public_key, specialization_domains } = req.body;
      
      // Check if coral_agent_id already exists
      const existingAgent = await db.query(
        'SELECT id FROM agents WHERE coral_agent_id = $1',
        [coral_agent_id]
      );
      
      if (existingAgent.rows.length > 0) {
        return res.status(409).json({ error: 'Agent with this Coral ID already exists' });
      }
      
      const newAgent = await db.createAgent({
        name,
        type,
        coral_agent_id,
        public_key,
        specialization_domains
      });
      
      res.status(201).json(newAgent);
    } catch (error) {
      console.error('Error creating agent:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/agents/:id/trust-score - Update agent trust score
router.put('/:id/trust-score',
  [
    param('id').isUUID().withMessage('Invalid agent ID'),
    body('trust_score').isFloat({ min: 0, max: 1 }).withMessage('Trust score must be between 0 and 1')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const updatedAgent = await db.updateAgentTrustScore(req.params.id, req.body.trust_score);
      
      if (!updatedAgent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      res.json(updatedAgent);
    } catch (error) {
      console.error('Error updating trust score:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

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