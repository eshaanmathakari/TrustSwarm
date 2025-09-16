// api/routes/coral-protocol.js - Coral Protocol Integration Routes
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const coralAgentDiscovery = require('../../core/coral-protocol/agent-discovery');
const agentCommunication = require('../../core/coral-protocol/agent-communication');
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

// POST /api/coral-protocol/agents/register - Register new agent with Coral Protocol
router.post('/agents/register',
  [
    body('name').isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
    body('type').isIn(['sports', 'politics', 'economics', 'meta']).withMessage('Invalid agent type'),
    body('specialization_domains').isArray({ min: 1 }).withMessage('At least one specialization domain required'),
    body('specialization_domains.*').isString().withMessage('Each specialization domain must be a string')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, type, specialization_domains } = req.body;
      
      const registrationResult = await coralAgentDiscovery.registerAgent({
        name,
        type,
        specialization_domains
      });

      res.status(201).json({
        success: true,
        message: 'Agent registered successfully with Coral Protocol',
        agent: registrationResult.agent,
        coral_agent_id: registrationResult.coral_agent_id,
        registration_data: registrationResult.registration_data
      });
    } catch (error) {
      console.error('Agent registration failed:', error);
      res.status(500).json({
        error: 'Agent registration failed',
        details: error.message
      });
    }
  }
);

// GET /api/coral-protocol/agents/discover - Discover agents via Coral Protocol
router.get('/agents/discover',
  [
    query('type').optional().isIn(['sports', 'politics', 'economics', 'meta']).withMessage('Invalid agent type'),
    query('min_trust_score').optional().isFloat({ min: 0, max: 1 }).withMessage('Trust score must be 0-1'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('specialization_domains').optional().isString().withMessage('Specialization domains must be comma-separated string')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { type, min_trust_score, limit, specialization_domains } = req.query;
      
      const criteria = {
        type,
        min_trust_score: min_trust_score ? parseFloat(min_trust_score) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        specialization_domains: specialization_domains ? specialization_domains.split(',') : undefined
      };

      const discoveredAgents = await coralAgentDiscovery.discoverAgents(criteria);

      res.json({
        success: true,
        agents: discoveredAgents,
        total: discoveredAgents.length,
        criteria: criteria
      });
    } catch (error) {
      console.error('Agent discovery failed:', error);
      res.status(500).json({
        error: 'Agent discovery failed',
        details: error.message
      });
    }
  }
);

// GET /api/coral-protocol/agents/:coral_id - Get agent by Coral Protocol ID
router.get('/agents/:coral_id',
  param('coral_id').isString().withMessage('Coral agent ID must be a string'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const agent = await coralAgentDiscovery.getAgentByCoralId(req.params.coral_id);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      const capabilities = await coralAgentDiscovery.getAgentCapabilities(agent.id);

      res.json({
        success: true,
        agent: {
          ...agent,
          capabilities
        }
      });
    } catch (error) {
      console.error('Failed to get agent by Coral ID:', error);
      res.status(500).json({
        error: 'Failed to retrieve agent',
        details: error.message
      });
    }
  }
);

// POST /api/coral-protocol/messages/send - Send secure message between agents
router.post('/messages/send',
  [
    body('from_agent_id').isUUID().withMessage('Valid from agent ID required'),
    body('to_agent_id').isUUID().withMessage('Valid to agent ID required'),
    body('message_type').isIn([
      'prediction_share',
      'trust_challenge',
      'coordination',
      'meta_prediction',
      'voice_verification_request',
      'voice_verification_response',
      'trust_update',
      'agent_status'
    ]).withMessage('Invalid message type'),
    body('payload').isObject().withMessage('Payload must be an object')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { from_agent_id, to_agent_id, message_type, payload } = req.body;
      
      const result = await agentCommunication.sendSecureMessage(
        from_agent_id,
        to_agent_id,
        message_type,
        payload
      );

      res.status(201).json({
        success: true,
        message: 'Secure message sent successfully',
        message_id: result.message_id,
        status: result.status
      });
    } catch (error) {
      console.error('Message sending failed:', error);
      res.status(500).json({
        error: 'Message sending failed',
        details: error.message
      });
    }
  }
);

// GET /api/coral-protocol/messages/:message_id - Receive and decrypt message
router.get('/messages/:message_id',
  param('message_id').isUUID().withMessage('Valid message ID required'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const message = await agentCommunication.receiveMessage(req.params.message_id);
      
      res.json({
        success: true,
        message: message
      });
    } catch (error) {
      console.error('Message retrieval failed:', error);
      res.status(500).json({
        error: 'Message retrieval failed',
        details: error.message
      });
    }
  }
);

// GET /api/coral-protocol/messages/agent/:agent_id - Get pending messages for agent
router.get('/messages/agent/:agent_id',
  [
    param('agent_id').isUUID().withMessage('Valid agent ID required'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { agent_id } = req.params;
      const { limit = 50 } = req.query;
      
      const messages = await agentCommunication.getPendingMessages(agent_id, parseInt(limit));

      res.json({
        success: true,
        messages: messages,
        total: messages.length
      });
    } catch (error) {
      console.error('Failed to get pending messages:', error);
      res.status(500).json({
        error: 'Failed to retrieve messages',
        details: error.message
      });
    }
  }
);

// POST /api/coral-protocol/messages/:message_id/read - Mark message as read
router.post('/messages/:message_id/read',
  param('message_id').isUUID().withMessage('Valid message ID required'),
  handleValidationErrors,
  async (req, res) => {
    try {
      await agentCommunication.markMessageAsRead(req.params.message_id);
      
      res.json({
        success: true,
        message: 'Message marked as read'
      });
    } catch (error) {
      console.error('Failed to mark message as read:', error);
      res.status(500).json({
        error: 'Failed to mark message as read',
        details: error.message
      });
    }
  }
);

// POST /api/coral-protocol/predictions/share - Share prediction with another agent
router.post('/predictions/share',
  [
    body('from_agent_id').isUUID().withMessage('Valid from agent ID required'),
    body('to_agent_id').isUUID().withMessage('Valid to agent ID required'),
    body('prediction_id').isUUID().withMessage('Valid prediction ID required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { from_agent_id, to_agent_id, prediction_id } = req.body;
      
      // Get prediction data
      const db = require('../../core/database/connection');
      const prediction = await db.query(
        'SELECT * FROM predictions WHERE id = $1',
        [prediction_id]
      );

      if (prediction.rows.length === 0) {
        return res.status(404).json({ error: 'Prediction not found' });
      }

      const result = await agentCommunication.sendPredictionShare(
        from_agent_id,
        to_agent_id,
        prediction.rows[0]
      );

      res.status(201).json({
        success: true,
        message: 'Prediction shared successfully',
        message_id: result.message_id
      });
    } catch (error) {
      console.error('Prediction sharing failed:', error);
      res.status(500).json({
        error: 'Prediction sharing failed',
        details: error.message
      });
    }
  }
);

// POST /api/coral-protocol/trust/challenge - Send trust challenge to another agent
router.post('/trust/challenge',
  [
    body('from_agent_id').isUUID().withMessage('Valid from agent ID required'),
    body('to_agent_id').isUUID().withMessage('Valid to agent ID required'),
    body('challenge_type').isString().withMessage('Challenge type required'),
    body('prediction_id').isUUID().withMessage('Valid prediction ID required'),
    body('challenge_rationale').isString().withMessage('Challenge rationale required')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { from_agent_id, to_agent_id, challenge_type, prediction_id, challenge_rationale } = req.body;
      
      const challengeData = {
        type: challenge_type,
        prediction_id,
        rationale: challenge_rationale,
        verification_type: 'voice_verification',
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };

      const result = await agentCommunication.sendTrustChallenge(
        from_agent_id,
        to_agent_id,
        challengeData
      );

      res.status(201).json({
        success: true,
        message: 'Trust challenge sent successfully',
        message_id: result.message_id
      });
    } catch (error) {
      console.error('Trust challenge failed:', error);
      res.status(500).json({
        error: 'Trust challenge failed',
        details: error.message
      });
    }
  }
);

// GET /api/coral-protocol/communications/:agent_id/history - Get communication history
router.get('/communications/:agent_id/history',
  [
    param('agent_id').isUUID().withMessage('Valid agent ID required'),
    query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('Limit must be 1-200'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be >= 0')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { agent_id } = req.params;
      const { limit = 100, offset = 0 } = req.query;
      
      const history = await agentCommunication.getCommunicationHistory(
        agent_id,
        parseInt(limit),
        parseInt(offset)
      );

      res.json({
        success: true,
        communications: history,
        total: history.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      console.error('Failed to get communication history:', error);
      res.status(500).json({
        error: 'Failed to retrieve communication history',
        details: error.message
      });
    }
  }
);

// GET /api/coral-protocol/health - Health check for Coral Protocol integration
router.get('/health', async (req, res) => {
  try {
    const discoveryHealth = await coralAgentDiscovery.healthCheck();
    const communicationHealth = await agentCommunication.healthCheck();
    
    res.json({
      success: true,
      coral_protocol_integration: {
        discovery: discoveryHealth,
        communication: communicationHealth,
        overall_status: discoveryHealth.status === 'healthy' && communicationHealth.status === 'healthy' ? 'healthy' : 'degraded'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Coral Protocol health check failed:', error);
    res.status(503).json({
      error: 'Coral Protocol integration unhealthy',
      details: error.message
    });
  }
});

module.exports = router;
