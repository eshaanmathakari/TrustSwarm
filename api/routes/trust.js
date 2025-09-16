// api/routes/trust.js - Trust Score Management Routes
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
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

// GET /api/trust/scores - Get trust scores with filtering
router.get('/scores',
  [
    query('agent_id').optional().isUUID().withMessage('Invalid agent ID'),
    query('category').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be >= 0')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { agent_id, category, limit = 20, offset = 0 } = req.query;
      
      let query = `
        SELECT ts.*, a.name as agent_name, a.type as agent_type
        FROM trust_scores ts
        JOIN agents a ON ts.agent_id = a.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      if (agent_id) {
        paramCount++;
        query += ` AND ts.agent_id = $${paramCount}`;
        params.push(agent_id);
      }

      if (category) {
        paramCount++;
        query += ` AND ts.category = $${paramCount}`;
        params.push(category);
      }

      query += ` ORDER BY ts.calculated_at DESC`;
      
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(parseInt(limit));
      
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(parseInt(offset));

      const result = await db.query(query, params);
      
      res.json({
        trust_scores: result.rows,
        total: result.rows.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      console.error('Error fetching trust scores:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/trust/rankings - Get agent trust rankings
router.get('/rankings', 
  [
    query('type').optional().isIn(['sports', 'politics', 'economics', 'meta']).withMessage('Invalid agent type'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { type, limit = 50 } = req.query;
      
      let query = `
        SELECT 
          a.*,
          RANK() OVER (ORDER BY a.trust_score DESC) as rank,
          COUNT(p.id) as total_predictions,
          COUNT(CASE WHEN p.actual_outcome IS NOT NULL THEN 1 END) as resolved_predictions,
          AVG(CASE WHEN p.actual_outcome IS NOT NULL THEN p.brier_score END) as avg_brier_score
        FROM agents a
        LEFT JOIN predictions p ON a.id = p.agent_id
        WHERE a.status = 'active'
      `;
      const params = [];

      if (type) {
        query += ` AND a.type = $1`;
        params.push(type);
      }

      query += `
        GROUP BY a.id
        ORDER BY a.trust_score DESC, total_predictions DESC
        LIMIT $${params.length + 1}
      `;
      params.push(parseInt(limit));

      const result = await db.query(query, params);
      
      const rankings = result.rows.map(row => ({
        ...row,
        rank: parseInt(row.rank),
        total_predictions: parseInt(row.total_predictions),
        resolved_predictions: parseInt(row.resolved_predictions),
        avg_brier_score: parseFloat(row.avg_brier_score || 0).toFixed(4),
        trust_score: parseFloat(row.trust_score).toFixed(4)
      }));

      res.json({
        rankings,
        filter_type: type || 'all',
        total_agents: rankings.length
      });
    } catch (error) {
      console.error('Error fetching trust rankings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/trust/scores/:agent_id - Record new trust score calculation
router.post('/scores/:agent_id',
  [
    param('agent_id').isUUID().withMessage('Invalid agent ID'),
    body('category').optional().isString().withMessage('Category must be a string'),
    body('calculation_method').isIn(['brier', 'accuracy', 'meta_prediction']).withMessage('Invalid calculation method'),
    body('event_count').isInt({ min: 1 }).withMessage('Event count must be >= 1')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { agent_id } = req.params;
      const { category, calculation_method, event_count } = req.body;

      // Verify agent exists
      const agent = await db.getAgentById(agent_id);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Calculate trust score
      const trustScore = await db.calculateAgentTrustScore(agent_id);

      // Record the trust score calculation
      const query = `
        INSERT INTO trust_scores (agent_id, score, category, calculation_method, event_count)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const result = await db.query(query, [
        agent_id,
        trustScore,
        category || null,
        calculation_method,
        event_count
      ]);

      // Update agent's current trust score
      await db.updateAgentTrustScore(agent_id, trustScore);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error recording trust score:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/trust/history/:agent_id - Get trust score history for an agent
router.get('/history/:agent_id',
  [
    param('agent_id').isUUID().withMessage('Invalid agent ID'),
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be 1-365'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { agent_id } = req.params;
      const { days = 30, limit = 50 } = req.query;

      // Verify agent exists
      const agent = await db.getAgentById(agent_id);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      const query = `
        SELECT *
        FROM trust_scores
        WHERE agent_id = $1 AND calculated_at >= NOW() - INTERVAL '${parseInt(days)} days'
        ORDER BY calculated_at DESC
        LIMIT $2
      `;

      const result = await db.query(query, [agent_id, parseInt(limit)]);
      
      res.json({
        agent_id,
        agent_name: agent.name,
        trust_history: result.rows,
        days_covered: parseInt(days),
        total_records: result.rows.length
      });
    } catch (error) {
      console.error('Error fetching trust history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/trust/analytics - Get trust system analytics
router.get('/analytics', async (req, res) => {
  try {
    const analyticsQuery = `
      SELECT 
        COUNT(DISTINCT a.id) as total_agents,
        AVG(a.trust_score) as avg_trust_score,
        MIN(a.trust_score) as min_trust_score,
        MAX(a.trust_score) as max_trust_score,
        COUNT(CASE WHEN a.trust_score >= 0.7 THEN 1 END) as high_trust_agents,
        COUNT(CASE WHEN a.trust_score >= 0.5 AND a.trust_score < 0.7 THEN 1 END) as medium_trust_agents,
        COUNT(CASE WHEN a.trust_score < 0.5 THEN 1 END) as low_trust_agents,
        COUNT(ts.id) as total_trust_calculations
      FROM agents a
      LEFT JOIN trust_scores ts ON a.id = ts.agent_id AND ts.calculated_at >= NOW() - INTERVAL '30 days'
      WHERE a.status = 'active'
    `;

    const categoryQuery = `
      SELECT 
        a.type,
        COUNT(*) as agent_count,
        AVG(a.trust_score) as avg_trust_score,
        MIN(a.trust_score) as min_trust_score,
        MAX(a.trust_score) as max_trust_score
      FROM agents a
      WHERE a.status = 'active'
      GROUP BY a.type
      ORDER BY avg_trust_score DESC
    `;

    const [analyticsResult, categoryResult] = await Promise.all([
      db.query(analyticsQuery),
      db.query(categoryQuery)
    ]);

    const analytics = analyticsResult.rows[0];
    const categoryBreakdown = categoryResult.rows;

    res.json({
      overview: {
        total_agents: parseInt(analytics.total_agents),
        avg_trust_score: parseFloat(analytics.avg_trust_score || 0).toFixed(4),
        min_trust_score: parseFloat(analytics.min_trust_score || 0).toFixed(4),
        max_trust_score: parseFloat(analytics.max_trust_score || 0).toFixed(4),
        total_trust_calculations: parseInt(analytics.total_trust_calculations)
      },
      distribution: {
        high_trust: parseInt(analytics.high_trust_agents), // >= 0.7
        medium_trust: parseInt(analytics.medium_trust_agents), // 0.5 - 0.7
        low_trust: parseInt(analytics.low_trust_agents) // < 0.5
      },
      by_category: categoryBreakdown.map(cat => ({
        type: cat.type,
        agent_count: parseInt(cat.agent_count),
        avg_trust_score: parseFloat(cat.avg_trust_score).toFixed(4),
        min_trust_score: parseFloat(cat.min_trust_score).toFixed(4),
        max_trust_score: parseFloat(cat.max_trust_score).toFixed(4)
      })),
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching trust analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/trust/recalculate/:agent_id - Force recalculation of agent trust score
router.put('/recalculate/:agent_id',
  param('agent_id').isUUID().withMessage('Invalid agent ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { agent_id } = req.params;

      // Verify agent exists
      const agent = await db.getAgentById(agent_id);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Recalculate trust score
      const newTrustScore = await db.calculateAgentTrustScore(agent_id);
      
      // Update agent's trust score
      const updatedAgent = await db.updateAgentTrustScore(agent_id, newTrustScore);

      // Record the recalculation
      const eventCountQuery = `
        SELECT COUNT(*) as count 
        FROM predictions 
        WHERE agent_id = $1 AND actual_outcome IS NOT NULL
      `;
      const eventCountResult = await db.query(eventCountQuery, [agent_id]);
      const eventCount = parseInt(eventCountResult.rows[0].count);

      if (eventCount > 0) {
        await db.query(
          'INSERT INTO trust_scores (agent_id, score, calculation_method, event_count) VALUES ($1, $2, $3, $4)',
          [agent_id, newTrustScore, 'recalculation', eventCount]
        );
      }

      res.json({
        agent_id,
        agent_name: agent.name,
        previous_trust_score: parseFloat(agent.trust_score).toFixed(4),
        new_trust_score: parseFloat(newTrustScore).toFixed(4),
        based_on_events: eventCount,
        recalculated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error recalculating trust score:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;