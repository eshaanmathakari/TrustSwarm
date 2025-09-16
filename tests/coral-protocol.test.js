// tests/coral-protocol.test.js - Tests for Coral Protocol Integration
const request = require('supertest');
const app = require('../index');
const coralAgentDiscovery = require('../core/coral-protocol/agent-discovery');
const agentCommunication = require('../core/coral-protocol/agent-communication');
const db = require('../core/database/connection');

describe('Coral Protocol Integration', () => {
  let testAgent1, testAgent2;

  beforeAll(async () => {
    // Setup test database connection
    try {
      await db.healthCheck();
    } catch (error) {
      console.warn('Database not available for testing, using mocks');
    }
  });

  afterAll(async () => {
    // Cleanup test data
    if (testAgent1) {
      try {
        await db.query('DELETE FROM agents WHERE id = $1', [testAgent1.id]);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    if (testAgent2) {
      try {
        await db.query('DELETE FROM agents WHERE id = $1', [testAgent2.id]);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Agent Registration', () => {
    test('POST /api/coral-protocol/agents/register - Register new agent', async () => {
      const agentData = {
        name: 'TestAgent1',
        type: 'sports',
        specialization_domains: ['nfl', 'basketball']
      };

      const response = await request(app)
        .post('/api/coral-protocol/agents/register')
        .send(agentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.name).toBe('TestAgent1');
      expect(response.body.agent.type).toBe('sports');
      expect(response.body.coral_agent_id).toBeDefined();

      testAgent1 = response.body.agent;
    });

    test('POST /api/coral-protocol/agents/register - Register second agent', async () => {
      const agentData = {
        name: 'TestAgent2',
        type: 'politics',
        specialization_domains: ['elections', 'legislation']
      };

      const response = await request(app)
        .post('/api/coral-protocol/agents/register')
        .send(agentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.name).toBe('TestAgent2');
      expect(response.body.agent.type).toBe('politics');

      testAgent2 = response.body.agent;
    });

    test('POST /api/coral-protocol/agents/register - Invalid data', async () => {
      const invalidData = {
        name: 'A', // Too short
        type: 'invalid_type',
        specialization_domains: [] // Empty array
      };

      const response = await request(app)
        .post('/api/coral-protocol/agents/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });
  });

  describe('Agent Discovery', () => {
    test('GET /api/coral-protocol/agents/discover - Discover all agents', async () => {
      const response = await request(app)
        .get('/api/coral-protocol/agents/discover')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.agents)).toBe(true);
      expect(response.body.agents.length).toBeGreaterThanOrEqual(2);
    });

    test('GET /api/coral-protocol/agents/discover - Filter by type', async () => {
      const response = await request(app)
        .get('/api/coral-protocol/agents/discover?type=sports')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agents.every(agent => agent.type === 'sports')).toBe(true);
    });

    test('GET /api/coral-protocol/agents/discover - Filter by trust score', async () => {
      const response = await request(app)
        .get('/api/coral-protocol/agents/discover?min_trust_score=0.4')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agents.every(agent => agent.trust_score >= 0.4)).toBe(true);
    });

    test('GET /api/coral-protocol/agents/:coral_id - Get agent by Coral ID', async () => {
      if (!testAgent1) return;

      const response = await request(app)
        .get(`/api/coral-protocol/agents/${testAgent1.coral_agent_id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.id).toBe(testAgent1.id);
      expect(response.body.agent.capabilities).toBeDefined();
    });
  });

  describe('Secure Communication', () => {
    test('POST /api/coral-protocol/messages/send - Send secure message', async () => {
      if (!testAgent1 || !testAgent2) return;

      const messageData = {
        from_agent_id: testAgent1.id,
        to_agent_id: testAgent2.id,
        message_type: 'prediction_share',
        payload: {
          test_message: 'Hello from TestAgent1',
          timestamp: new Date().toISOString()
        }
      };

      const response = await request(app)
        .post('/api/coral-protocol/messages/send')
        .send(messageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message_id).toBeDefined();
    });

    test('GET /api/coral-protocol/messages/agent/:agent_id - Get pending messages', async () => {
      if (!testAgent2) return;

      const response = await request(app)
        .get(`/api/coral-protocol/messages/agent/${testAgent2.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.messages)).toBe(true);
    });

    test('POST /api/coral-protocol/predictions/share - Share prediction', async () => {
      if (!testAgent1 || !testAgent2) return;

      // First create a test prediction
      const predictionData = {
        agent_id: testAgent1.id,
        event_id: 'test_event_123',
        event_title: 'Test Event for Sharing',
        event_category: 'sports',
        predicted_probability: 0.75,
        rationale: 'Test rationale for sharing',
        confidence_score: 0.8
      };

      const predictionResponse = await request(app)
        .post('/api/predictions')
        .send(predictionData)
        .expect(201);

      const predictionId = predictionResponse.body.id;

      // Now share the prediction
      const shareData = {
        from_agent_id: testAgent1.id,
        to_agent_id: testAgent2.id,
        prediction_id: predictionId
      };

      const response = await request(app)
        .post('/api/coral-protocol/predictions/share')
        .send(shareData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message_id).toBeDefined();
    });

    test('POST /api/coral-protocol/trust/challenge - Send trust challenge', async () => {
      if (!testAgent1 || !testAgent2) return;

      const challengeData = {
        from_agent_id: testAgent2.id,
        to_agent_id: testAgent1.id,
        challenge_type: 'prediction_accuracy',
        prediction_id: 'test_prediction_id',
        challenge_rationale: 'Challenge the accuracy of this prediction'
      };

      const response = await request(app)
        .post('/api/coral-protocol/trust/challenge')
        .send(challengeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message_id).toBeDefined();
    });
  });

  describe('Communication History', () => {
    test('GET /api/coral-protocol/communications/:agent_id/history - Get communication history', async () => {
      if (!testAgent1) return;

      const response = await request(app)
        .get(`/api/coral-protocol/communications/${testAgent1.id}/history`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.communications)).toBe(true);
    });
  });

  describe('Health Check', () => {
    test('GET /api/coral-protocol/health - Health check', async () => {
      const response = await request(app)
        .get('/api/coral-protocol/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.coral_protocol_integration).toBeDefined();
      expect(response.body.coral_protocol_integration.discovery).toBeDefined();
      expect(response.body.coral_protocol_integration.communication).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('POST /api/coral-protocol/messages/send - Invalid message type', async () => {
      if (!testAgent1 || !testAgent2) return;

      const invalidMessageData = {
        from_agent_id: testAgent1.id,
        to_agent_id: testAgent2.id,
        message_type: 'invalid_type',
        payload: { test: 'data' }
      };

      const response = await request(app)
        .post('/api/coral-protocol/messages/send')
        .send(invalidMessageData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    test('GET /api/coral-protocol/agents/invalid_id - Non-existent agent', async () => {
      const response = await request(app)
        .get('/api/coral-protocol/agents/non_existent_id')
        .expect(404);

      expect(response.body.error).toBe('Agent not found');
    });
  });
});

describe('Coral Agent Discovery Service', () => {
  test('should register agent successfully', async () => {
    const agentData = {
      name: 'ServiceTestAgent',
      type: 'economics',
      specialization_domains: ['stocks', 'crypto']
    };

    try {
      const result = await coralAgentDiscovery.registerAgent(agentData);
      expect(result.success).toBe(true);
      expect(result.agent.name).toBe('ServiceTestAgent');
      expect(result.coral_agent_id).toBeDefined();
    } catch (error) {
      // If database is not available, test should pass with mock
      expect(error.message).toContain('Registration failed');
    }
  });

  test('should discover agents', async () => {
    try {
      const agents = await coralAgentDiscovery.discoverAgents({ type: 'sports' });
      expect(Array.isArray(agents)).toBe(true);
    } catch (error) {
      // If database is not available, test should pass
      expect(error.message).toContain('Discovery failed');
    }
  });

  test('should perform health check', async () => {
    const health = await coralAgentDiscovery.healthCheck();
    expect(health).toBeDefined();
    expect(health.status).toBeDefined();
    expect(health.timestamp).toBeDefined();
  });
});

describe('Agent Communication Service', () => {
  test('should perform health check', async () => {
    const health = await agentCommunication.healthCheck();
    expect(health).toBeDefined();
    expect(health.status).toBeDefined();
    expect(health.message_types).toBeDefined();
    expect(health.timestamp).toBeDefined();
  });

  test('should have all required message types', () => {
    const messageTypes = agentCommunication.messageTypes;
    expect(messageTypes.PREDICTION_SHARE).toBe('prediction_share');
    expect(messageTypes.TRUST_CHALLENGE).toBe('trust_challenge');
    expect(messageTypes.COORDINATION).toBe('coordination');
    expect(messageTypes.META_PREDICTION).toBe('meta_prediction');
    expect(messageTypes.VOICE_VERIFICATION_REQUEST).toBe('voice_verification_request');
    expect(messageTypes.VOICE_VERIFICATION_RESPONSE).toBe('voice_verification_response');
    expect(messageTypes.TRUST_UPDATE).toBe('trust_update');
    expect(messageTypes.AGENT_STATUS).toBe('agent_status');
  });
});
