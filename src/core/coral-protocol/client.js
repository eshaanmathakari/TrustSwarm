const axios = require('axios');
const crypto = require('crypto');
const config = require('../../config/environment');

class CoralProtocolClient {
    constructor() {
        this.baseURL = config.CORAL_PROTOCOL.SERVER_URL;
        this.apiKey = config.CORAL_PROTOCOL_API_KEY;
        this.timeout = config.CORAL_PROTOCOL.TIMEOUT;
        
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
            }
        });

        this.setupInterceptors();
    }

    setupInterceptors() {
        // Request interceptor for logging
        this.client.interceptors.request.use(
            (config) => {
                if (process.env.LOG_LEVEL === 'debug') {
                    console.log(`🔄 Coral Protocol Request: ${config.method?.toUpperCase()} ${config.url}`);
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => {
                if (process.env.LOG_LEVEL === 'debug') {
                    console.log(`✅ Coral Protocol Response: ${response.status} ${response.config.url}`);
                }
                return response;
            },
            (error) => {
                console.error('❌ Coral Protocol Error:', {
                    url: error.config?.url,
                    status: error.response?.status,
                    message: error.response?.data?.message || error.message
                });
                return Promise.reject(error);
            }
        );
    }

    /**
     * Register a new agent with the Coral Protocol network
     */
    async registerAgent(agentData) {
        try {
            const registrationPayload = {
                name: agentData.name,
                type: agentData.type,
                capabilities: agentData.specialization_domains || [],
                publicKey: agentData.public_key,
                metadata: {
                    trustScore: agentData.trust_score || 0.5,
                    specializations: agentData.specialization_domains,
                    voiceEnabled: !!agentData.voice_signature_hash,
                    predictionFocus: agentData.type,
                    version: '1.0.0'
                }
            };

            const response = await this.client.post('/agents/register', registrationPayload);
            
            console.log('🎯 Agent registered with Coral Protocol:', {
                agentId: response.data.agentId,
                name: agentData.name,
                type: agentData.type
            });

            return {
                coral_agent_id: response.data.agentId,
                registration_token: response.data.token,
                status: response.data.status
            };
        } catch (error) {
            console.error('Failed to register agent with Coral Protocol:', error);
            throw new Error(`Coral Protocol registration failed: ${error.message}`);
        }
    }

    /**
     * Discover available agents in the network
     */
    async discoverAgents(filters = {}) {
        try {
            const params = {
                type: filters.type,
                capabilities: filters.capabilities,
                trustScore: filters.minTrustScore,
                limit: filters.limit || 50
            };

            const response = await this.client.get('/agents/discover', { params });
            
            console.log(`🔍 Discovered ${response.data.agents.length} agents`);
            
            return response.data.agents.map(agent => ({
                coral_agent_id: agent.id,
                name: agent.name,
                type: agent.type,
                capabilities: agent.capabilities,
                trust_score: agent.metadata?.trustScore || 0.5,
                status: agent.status,
                last_seen: agent.lastSeen
            }));
        } catch (error) {
            console.error('Failed to discover agents:', error);
            throw new Error(`Agent discovery failed: ${error.message}`);
        }
    }

    /**
     * Send a secure message to another agent
     */
    async sendMessage(fromAgentId, toAgentId, message) {
        try {
            const messagePayload = {
                from: fromAgentId,
                to: toAgentId,
                type: message.type,
                payload: this.encryptMessage(message.payload),
                signature: this.signMessage(message.payload, message.privateKey),
                timestamp: new Date().toISOString()
            };

            const response = await this.client.post('/messages/send', messagePayload);
            
            console.log('📨 Message sent via Coral Protocol:', {
                messageId: response.data.messageId,
                from: fromAgentId,
                to: toAgentId,
                type: message.type
            });

            return {
                message_id: response.data.messageId,
                status: response.data.status,
                delivered_at: response.data.deliveredAt
            };
        } catch (error) {
            console.error('Failed to send message:', error);
            throw new Error(`Message sending failed: ${error.message}`);
        }
    }

    /**
     * Listen for incoming messages for an agent
     */
    async listenForMessages(agentId, callback) {
        try {
            // This would typically use WebSocket or Server-Sent Events
            // For now, implement polling with long polling support
            const pollMessages = async () => {
                try {
                    const response = await this.client.get(`/messages/poll/${agentId}`, {
                        timeout: 30000 // Long polling
                    });
                    
                    if (response.data.messages && response.data.messages.length > 0) {
                        for (const message of response.data.messages) {
                            const decryptedMessage = {
                                ...message,
                                payload: this.decryptMessage(message.payload)
                            };
                            await callback(decryptedMessage);
                        }
                    }
                } catch (error) {
                    if (error.code !== 'ECONNRESET' && error.code !== 'ETIMEDOUT') {
                        console.error('Error polling messages:', error);
                    }
                }
                
                // Continue polling
                setTimeout(pollMessages, 1000);
            };

            pollMessages();
            console.log(`👂 Started listening for messages for agent: ${agentId}`);
        } catch (error) {
            console.error('Failed to setup message listener:', error);
            throw new Error(`Message listener setup failed: ${error.message}`);
        }
    }

    /**
     * Create a prediction coordination session
     */
    async createPredictionSession(organizerAgentId, eventData) {
        try {
            const sessionPayload = {
                organizer: organizerAgentId,
                event: {
                    id: eventData.id,
                    title: eventData.title,
                    category: eventData.category,
                    deadline: eventData.deadline
                },
                coordination: {
                    type: 'prediction_swarm',
                    consensus_required: true,
                    min_participants: 3,
                    max_participants: 20
                }
            };

            const response = await this.client.post('/sessions/create', sessionPayload);
            
            console.log('🎪 Prediction session created:', {
                sessionId: response.data.sessionId,
                event: eventData.title
            });

            return {
                session_id: response.data.sessionId,
                join_token: response.data.joinToken,
                expires_at: response.data.expiresAt
            };
        } catch (error) {
            console.error('Failed to create prediction session:', error);
            throw new Error(`Session creation failed: ${error.message}`);
        }
    }

    /**
     * Join a prediction session
     */
    async joinPredictionSession(agentId, sessionId, joinToken) {
        try {
            const joinPayload = {
                agent_id: agentId,
                session_id: sessionId,
                join_token: joinToken
            };

            const response = await this.client.post('/sessions/join', joinPayload);
            
            console.log('🤝 Joined prediction session:', {
                sessionId: sessionId,
                agentId: agentId,
                role: response.data.role
            });

            return {
                role: response.data.role,
                participants: response.data.participants,
                status: response.data.status
            };
        } catch (error) {
            console.error('Failed to join session:', error);
            throw new Error(`Session join failed: ${error.message}`);
        }
    }

    /**
     * Submit a prediction within a coordination session
     */
    async submitSessionPrediction(sessionId, agentId, prediction) {
        try {
            const predictionPayload = {
                session_id: sessionId,
                agent_id: agentId,
                prediction: {
                    probability: prediction.probability,
                    confidence: prediction.confidence,
                    rationale: prediction.rationale
                },
                signature: this.signMessage(prediction, prediction.privateKey)
            };

            const response = await this.client.post('/sessions/predict', predictionPayload);
            
            console.log('🎯 Prediction submitted to session:', {
                sessionId: sessionId,
                predictionId: response.data.predictionId,
                probability: prediction.probability
            });

            return {
                prediction_id: response.data.predictionId,
                consensus_status: response.data.consensusStatus,
                participant_count: response.data.participantCount
            };
        } catch (error) {
            console.error('Failed to submit prediction:', error);
            throw new Error(`Prediction submission failed: ${error.message}`);
        }
    }

    /**
     * Helper methods for encryption and signing
     */
    encryptMessage(payload) {
        // Simple encryption for demo - in production use proper encryption
        const cipher = crypto.createCipher('aes256', config.ENCRYPTION_KEY);
        let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }

    decryptMessage(encryptedPayload) {
        try {
            const decipher = crypto.createDecipher('aes256', config.ENCRYPTION_KEY);
            let decrypted = decipher.update(encryptedPayload, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Failed to decrypt message:', error);
            return null;
        }
    }

    signMessage(payload, privateKey) {
        // Simple signing for demo - in production use proper digital signatures
        const hash = crypto.createHash('sha256');
        hash.update(JSON.stringify(payload));
        return hash.digest('hex');
    }

    /**
     * Health check for Coral Protocol connection
     */
    async healthCheck() {
        try {
            const response = await this.client.get('/health');
            return {
                status: 'connected',
                server_version: response.data.version,
                timestamp: new Date()
            };
        } catch (error) {
            return {
                status: 'disconnected',
                error: error.message,
                timestamp: new Date()
            };
        }
    }
}

module.exports = CoralProtocolClient;