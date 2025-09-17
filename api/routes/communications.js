// api/routes/communications.js - Agent Communications Routes
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../../core/database/connection');
const auth = require('../middleware/auth');
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

// GET /communications - List agent communications
router.get('/', auth.validateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, message_type } = req.query;
    const agentId = req.user.agent_id;
    
    let query = `
      SELECT ac.*, 
             fa.name as from_agent_name,
             ta.name as to_agent_name
      FROM agent_communications ac
      JOIN agents fa ON ac.from_agent_id = fa.id
      JOIN agents ta ON ac.to_agent_id = ta.id
      WHERE (ac.from_agent_id = $1 OR ac.to_agent_id = $1)
    `;
    const params = [agentId];
    let paramIndex = 2;

    if (message_type) {
      query += ` AND ac.message_type = $${paramIndex}`;
      params.push(message_type);
      paramIndex++;
    }

    query += ` ORDER BY ac.timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);
    
    res.json({
      success: true,
      communications: result.rows,
      total: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /communications - Send message to another agent
router.post('/', 
  [
    body('to_agent_id').isUUID().withMessage('Valid target agent ID required'),
    body('message_type').isIn(['prediction_share', 'trust_challenge', 'coordination']).withMessage('Invalid message type'),
    body('encrypted_payload').isLength({ min: 1 }).withMessage('Message payload required')
  ],
  handleValidationErrors,
  auth.validateToken,
  async (req, res) => {
    try {
      const { to_agent_id, message_type, encrypted_payload, signature_hash } = req.body;
      const from_agent_id = req.user.agent_id;

      // Verify target agent exists
      const targetAgent = await db.query(
        'SELECT id, name FROM agents WHERE id = $1 AND status = $2',
        [to_agent_id, 'active']
      );

      if (targetAgent.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Target agent not found or inactive'
        });
      }

      // Create communication record
      const result = await db.query(`
        INSERT INTO agent_communications 
        (from_agent_id, to_agent_id, message_type, encrypted_payload, signature_hash)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [from_agent_id, to_agent_id, message_type, encrypted_payload, signature_hash]);

      res.status(201).json({
        success: true,
        communication: result.rows[0],
        message: 'Communication sent successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// GET /communications/:id - Get specific communication
router.get('/:id',
  param('id').isUUID().withMessage('Invalid communication ID'),
  handleValidationErrors,
  auth.validateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const agentId = req.user.agent_id;

      const result = await db.query(`
        SELECT ac.*, 
               fa.name as from_agent_name,
               ta.name as to_agent_name
        FROM agent_communications ac
        JOIN agents fa ON ac.from_agent_id = fa.id
        JOIN agents ta ON ac.to_agent_id = ta.id
        WHERE ac.id = $1 AND (ac.from_agent_id = $2 OR ac.to_agent_id = $2)
      `, [id, agentId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Communication not found or access denied'
        });
      }

      res.json({
        success: true,
        communication: result.rows[0]
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// PUT /communications/:id/status - Update communication status
router.put('/:id/status',
  [
    param('id').isUUID().withMessage('Invalid communication ID'),
    body('status').isIn(['sent', 'delivered', 'read', 'responded']).withMessage('Invalid status')
  ],
  handleValidationErrors,
  auth.validateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const agentId = req.user.agent_id;

      // Verify ownership
      const communication = await db.query(
        'SELECT * FROM agent_communications WHERE id = $1 AND (from_agent_id = $2 OR to_agent_id = $2)',
        [id, agentId]
      );

      if (communication.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Communication not found or access denied'
        });
      }

      // Update status
      const result = await db.query(
        'UPDATE agent_communications SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );

      res.json({
        success: true,
        communication: result.rows[0],
        message: 'Status updated successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;