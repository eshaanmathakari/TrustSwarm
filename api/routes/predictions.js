// api/routes/predictions.js - Prediction Management Routes
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

// GET /api/predictions - List predictions
router.get('/', 
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be >= 0'),
    query('category').optional().isString(),
    query('agent_id').optional().isUUID(),
    query('resolved').optional().isBoolean()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { 
        limit = 20, 
        offset = 0, 
        category, 
        agent_id, 
        resolved,
        sort_by = 'prediction_timestamp',
        sort_order = 'DESC'
      } = req.query;

      let query = `
        SELECT p.*, a.name as agent_name, a.type as agent_type
        FROM predictions p
        JOIN agents a ON p.agent_id = a.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      if (category) {
        paramCount++;
        query += ` AND p.event_category = $${paramCount}`;
        params.push(category);
      }

      if (agent_id) {
        paramCount++;
        query += ` AND p.agent_id = $${paramCount}`;
        params.push(agent_id);
      }

      if (resolved !== undefined) {
        query += ` AND p.actual_outcome IS ${resolved === 'true' ? 'NOT NULL' : 'NULL'}`;
      }

      const validSortColumns = ['prediction_timestamp', 'predicted_probability', 'confidence_score', 'brier_score'];
      const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'prediction_timestamp';
      const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      query += ` ORDER BY p.${sortColumn} ${sortDirection}`;
      
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(parseInt(limit));
      
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(parseInt(offset));

      const result = await db.query(query, params);

      res.json({
        predictions: result.rows,
        total: result.rows.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      console.error('Error fetching predictions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/predictions/:id - Get prediction by ID
router.get('/:id',
  param('id').isUUID().withMessage('Invalid prediction ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const query = `
        SELECT p.*, a.name as agent_name, a.type as agent_type
        FROM predictions p
        JOIN agents a ON p.agent_id = a.id
        WHERE p.id = $1
      `;
      
      const result = await db.query(query, [req.params.id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Prediction not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching prediction:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/predictions - Create new prediction
router.post('/',
  [
    body('agent_id').isUUID().withMessage('Valid agent ID required'),
    body('event_id').isLength({ min: 1 }).withMessage('Event ID required'),
    body('event_title').isLength({ min: 5, max: 500 }).withMessage('Event title must be 5-500 characters'),
    body('event_category').isLength({ min: 1 }).withMessage('Event category required'),
    body('predicted_probability').isFloat({ min: 0, max: 1 }).withMessage('Probability must be 0-1'),
    body('rationale').optional().isLength({ max: 2000 }).withMessage('Rationale max 2000 characters'),
    body('confidence_score').optional().isFloat({ min: 0, max: 1 }).withMessage('Confidence must be 0-1'),
    body('stake_amount').optional().isFloat({ min: 0 }).withMessage('Stake amount must be >= 0')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Verify agent exists
      const agent = await db.getAgentById(req.body.agent_id);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      const prediction = await db.createPrediction(req.body);
      res.status(201).json(prediction);
    } catch (error) {
      console.error('Error creating prediction:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/predictions/:id/resolve - Resolve a prediction
router.put('/:id/resolve',
  [
    param('id').isUUID().withMessage('Invalid prediction ID'),
    body('actual_outcome').isBoolean().withMessage('Actual outcome must be true or false')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const resolvedPrediction = await db.resolvePrediction(
        req.params.id, 
        req.body.actual_outcome
      );

      if (!resolvedPrediction) {
        return res.status(404).json({ error: 'Prediction not found' });
      }

      // Update agent's trust score based on this prediction
      const newTrustScore = await db.calculateAgentTrustScore(resolvedPrediction.agent_id);
      await db.updateAgentTrustScore(resolvedPrediction.agent_id, newTrustScore);

      res.json({
        ...resolvedPrediction,
        updated_trust_score: newTrustScore
      });
    } catch (error) {
      console.error('Error resolving prediction:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/predictions/stats/summary - Get prediction statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_predictions,
        COUNT(CASE WHEN actual_outcome IS NOT NULL THEN 1 END) as resolved_predictions,
        COUNT(CASE WHEN was_correct = true THEN 1 END) as correct_predictions,
        AVG(predicted_probability) as avg_predicted_probability,
        AVG(CASE WHEN actual_outcome IS NOT NULL THEN brier_score END) as avg_brier_score,
        COUNT(DISTINCT agent_id) as active_agents,
        COUNT(DISTINCT event_category) as categories_covered
      FROM predictions
      WHERE prediction_timestamp >= NOW() - INTERVAL '30 days'
    `;

    const result = await db.query(query);
    const stats = result.rows[0];

    // Calculate accuracy percentage
    const accuracy = stats.resolved_predictions > 0 
      ? (stats.correct_predictions / stats.resolved_predictions * 100).toFixed(2)
      : 0;

    res.json({
      ...stats,
      accuracy_percentage: parseFloat(accuracy),
      total_predictions: parseInt(stats.total_predictions),
      resolved_predictions: parseInt(stats.resolved_predictions),
      correct_predictions: parseInt(stats.correct_predictions),
      active_agents: parseInt(stats.active_agents),
      categories_covered: parseInt(stats.categories_covered),
      avg_predicted_probability: parseFloat(stats.avg_predicted_probability || 0).toFixed(4),
      avg_brier_score: parseFloat(stats.avg_brier_score || 0).toFixed(4)
    });
  } catch (error) {
    console.error('Error fetching prediction stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/predictions/leaderboard - Get prediction accuracy leaderboard
router.get('/leaderboard/accuracy', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const query = `
      SELECT * FROM agent_performance_summary
      WHERE total_predictions >= 5
      ORDER BY accuracy_percentage DESC, avg_brier_score ASC
      LIMIT $1
    `;

    const result = await db.query(query, [parseInt(limit)]);
    
    res.json({
      leaderboard: result.rows,
      minimum_predictions: 5,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/predictions/categories - Get prediction categories with stats
router.get('/categories/stats', async (req, res) => {
  try {
    const query = `
      SELECT 
        event_category,
        COUNT(*) as total_predictions,
        COUNT(CASE WHEN actual_outcome IS NOT NULL THEN 1 END) as resolved_predictions,
        COUNT(CASE WHEN was_correct = true THEN 1 END) as correct_predictions,
        AVG(CASE WHEN actual_outcome IS NOT NULL THEN brier_score END) as avg_brier_score,
        COUNT(DISTINCT agent_id) as unique_agents
      FROM predictions
      GROUP BY event_category
      ORDER BY total_predictions DESC
    `;

    const result = await db.query(query);
    
    const categories = result.rows.map(row => ({
      ...row,
      total_predictions: parseInt(row.total_predictions),
      resolved_predictions: parseInt(row.resolved_predictions),
      correct_predictions: parseInt(row.correct_predictions),
      unique_agents: parseInt(row.unique_agents),
      accuracy_percentage: row.resolved_predictions > 0 
        ? ((row.correct_predictions / row.resolved_predictions) * 100).toFixed(2)
        : 0,
      avg_brier_score: parseFloat(row.avg_brier_score || 0).toFixed(4)
    }));

    res.json({ categories });
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;