// core/coral-protocol/client.js - Coral Protocol MCP Client
const axios = require('axios');
const config = require('../../config/environment');

class CoralProtocolClient {
  constructor() {
    this.apiKey = config.CORAL_PROTOCOL_API_KEY;
    this.mistralApiKey = config.MISTRAL_API_KEY; // MCP is powered by Mistral LLM
    this.baseUrl = 'https://api.coralprotocol.org'; // Placeholder URL
    this.mistralBaseUrl = 'https://api.mistral.ai/v1';
    
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'TrustSwarm/1.0.0'
      }
    });

    this.mistralInstance = axios.create({
      baseURL: this.mistralBaseUrl,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${this.mistralApiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Register a new agent with Coral Protocol
  async registerAgent(agentData) {
    try {
      const { name, type, publicKey, specialization_domains } = agentData;
      
      const payload = {
        name,
        type,
        public_key: publicKey,
        specialization_domains,
        capabilities: ['prediction_making', 'voice_verification', 'trust_calculation'],
        metadata: {
          created_by: 'TrustSwarm',
          version: '1.0.0'
        }
      };

      const response = await this.axiosInstance.post('/agents/register', payload);
      
      return {
        success: true,
        coral_agent_id: response.data.agent_id,
        registration_data: response.data
      };
    } catch (error) {
      console.error('Coral Protocol agent registration failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Submit a prediction through Coral Protocol MCP
  async submitPrediction(predictionData) {
    try {
      const { 
        coral_agent_id, 
        event_id, 
        event_title, 
        predicted_probability, 
        rationale,
        confidence_score 
      } = predictionData;

      // Use Mistral to enhance the rationale if needed
      let enhancedRationale = rationale;
      if (rationale && rationale.length < 100) {
        enhancedRationale = await this.enhanceRationaleWithMistral(rationale, event_title);
      }

      const payload = {
        agent_id: coral_agent_id,
        event: {
          id: event_id,
          title: event_title,
          category: predictionData.event_category
        },
        prediction: {
          probability: predicted_probability,
          confidence: confidence_score,
          rationale: enhancedRationale
        },
        timestamp: new Date().toISOString()
      };

      const response = await this.axiosInstance.post('/predictions/submit', payload);
      
      return {
        success: true,
        prediction_id: response.data.prediction_id,
        submission_data: response.data
      };
    } catch (error) {
      console.error('Coral Protocol prediction submission failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Enhance prediction rationale using Mistral LLM
  async enhanceRationaleWithMistral(originalRationale, eventTitle) {
    try {
      const prompt = `
        Event: ${eventTitle}
        
        Original rationale: ${originalRationale}
        
        Please enhance this prediction rationale by providing more detailed analysis while maintaining the core reasoning. Make it more comprehensive but keep it under 300 words. Focus on key factors that influence the outcome.
      `;

      const response = await this.mistralInstance.post('/chat/completions', {
        model: 'mistral-small-latest',
        messages: [
          {
            role: 'system',
            content: 'You are an expert prediction analyst helping to enhance prediction rationales with additional context and reasoning.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.3
      });

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Mistral rationale enhancement failed:', error);
      return originalRationale; // Return original if enhancement fails
    }
  }

  // Get agent status from Coral Protocol
  async getAgentStatus(coral_agent_id) {
    try {
      const response = await this.axiosInstance.get(`/agents/${coral_agent_id}/status`);
      
      return {
        success: true,
        status: response.data
      };
    } catch (error) {
      console.error('Coral Protocol agent status check failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get prediction results from external sources via Coral
  async getEventResults(event_id) {
    try {
      const response = await this.axiosInstance.get(`/events/${event_id}/results`);
      
      return {
        success: true,
        results: response.data
      };
    } catch (error) {
      console.error('Coral Protocol event results fetch failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Submit agent communication through MCP
  async sendAgentMessage(fromAgentId, toAgentId, messageData) {
    try {
      const payload = {
        from_agent_id: fromAgentId,
        to_agent_id: toAgentId,
        message_type: messageData.type,
        content: messageData.content,
        encrypted: messageData.encrypted || false,
        timestamp: new Date().toISOString()
      };

      const response = await this.axiosInstance.post('/agents/communicate', payload);
      
      return {
        success: true,
        message_id: response.data.message_id,
        delivery_status: response.data.status
      };
    } catch (error) {
      console.error('Coral Protocol agent communication failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Challenge agent trust using Mistral for analysis
  async challengeAgentTrust(challengerAgentId, targetAgentId, challengeData) {
    try {
      // Use Mistral to analyze the challenge
      const analysisPrompt = `
        Analyze this trust challenge scenario:
        
        Challenge Type: ${challengeData.type}
        Target Prediction: ${challengeData.prediction_text}
        Challenge Rationale: ${challengeData.challenge_rationale}
        
        Provide a brief analysis of the validity of this trust challenge and suggest verification methods.
      `;

      const mistralResponse = await this.mistralInstance.post('/chat/completions', {
        model: 'mistral-small-latest',
        messages: [
          {
            role: 'system',
            content: 'You are a trust verification analyst for AI prediction agents.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        max_tokens: 300,
        temperature: 0.2
      });

      const payload = {
        challenger_agent_id: challengerAgentId,
        target_agent_id: targetAgentId,
        challenge_type: challengeData.type,
        challenge_data: challengeData,
        ai_analysis: mistralResponse.data.choices[0].message.content,
        timestamp: new Date().toISOString()
      };

      const response = await this.axiosInstance.post('/trust/challenge', payload);
      
      return {
        success: true,
        challenge_id: response.data.challenge_id,
        analysis: mistralResponse.data.choices[0].message.content
      };
    } catch (error) {
      console.error('Coral Protocol trust challenge failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Health check for Coral Protocol connection
  async healthCheck() {
    try {
      const response = await this.axiosInstance.get('/health');
      return {
        status: 'healthy',
        coral_status: response.data.status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Mock implementation for development when API key is not available
  getMockResponse(operation, data = {}) {
    const responses = {
      registerAgent: {
        success: true,
        coral_agent_id: `mock_coral_${Date.now()}`,
        registration_data: { status: 'registered', ...data }
      },
      submitPrediction: {
        success: true,
        prediction_id: `mock_pred_${Date.now()}`,
        submission_data: { status: 'submitted', ...data }
      },
      getAgentStatus: {
        success: true,
        status: { active: true, trust_score: 0.75, ...data }
      },
      getEventResults: {
        success: true,
        results: { resolved: false, outcome: null, ...data }
      },
      challengeAgentTrust: {
        success: true,
        challenge_id: `mock_challenge_${Date.now()}`,
        analysis: 'Mock trust challenge analysis'
      }
    };

    return responses[operation] || { success: false, error: 'Mock operation not found' };
  }
}

module.exports = new CoralProtocolClient();