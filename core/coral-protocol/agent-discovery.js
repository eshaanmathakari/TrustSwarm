// core/coral-protocol/agent-discovery.js
const axios = require('axios');
const crypto = require('crypto');
const db = require('../database/connection');
const config = require('../../config/environment');

class CoralAgentDiscovery {
    constructor() {
        this.coralApiKey = config.CORAL_PROTOCOL_API_KEY;
        this.mistralApiKey = config.MISTRAL_API_KEY;
        this.baseUrl = 'https://api.coralprotocol.org/v1'; // Placeholder URL
        this.mistralBaseUrl = 'https://api.mistral.ai/v1';
        
        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Authorization': `Bearer ${this.coralApiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'TrustSwarm/1.0.0'
            }
        });
    }

    async registerAgent(agentData) {
        try {
            console.log(`Registering agent: ${agentData.name}`);
            
            // Generate unique agent keypair
            const keyPair = crypto.generateKeyPairSync('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
            });

            // Prepare registration payload for Coral Protocol
            const registrationPayload = {
                name: agentData.name,
                type: agentData.type,
                capabilities: agentData.specialization_domains,
                public_key: keyPair.publicKey,
                metadata: {
                    prediction_specialization: agentData.specialization_domains,
                    trust_score_enabled: true,
                    voice_verification_enabled: true,
                    created_by: 'TrustSwarm',
                    version: '1.0.0'
                }
            };

            // Register with Coral Protocol
            let coralRegistration;
            try {
                const response = await this.axiosInstance.post('/agents/register', registrationPayload);
                coralRegistration = response.data;
            } catch (error) {
                // If Coral Protocol is not available, use mock registration
                console.warn('Coral Protocol not available, using mock registration');
                coralRegistration = {
                    agent_id: `coral_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    status: 'registered',
                    coral_network_id: 'mock_network'
                };
            }

            // Store in local database
            const dbResult = await db.query(`
                INSERT INTO agents (name, type, coral_agent_id, public_key, specialization_domains, trust_score)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [
                agentData.name,
                agentData.type,
                coralRegistration.agent_id,
                keyPair.publicKey,
                agentData.specialization_domains,
                0.5 // Default trust score
            ]);

            // Store private key securely
            await this.storePrivateKey(dbResult.rows[0].id, keyPair.privateKey);

            // Generate initial voice signature for the agent
            await this.generateInitialVoiceSignature(dbResult.rows[0].id, agentData.name);

            console.log(`Agent registered successfully: ${dbResult.rows[0].id}`);

            return {
                success: true,
                agent: dbResult.rows[0],
                coral_agent_id: coralRegistration.agent_id,
                registration_data: coralRegistration
            };

        } catch (error) {
            console.error('Agent registration failed:', error);
            throw new Error(`Registration failed: ${error.message}`);
        }
    }

    async discoverAgents(criteria = {}) {
        try {
            console.log('Discovering agents with criteria:', criteria);
            
            // Query Coral Protocol for available agents
            let coralAgents = [];
            try {
                const response = await this.axiosInstance.get('/agents/discover', {
                    params: {
                        type: criteria.type,
                        capabilities: criteria.specialization_domains?.join(','),
                        min_trust_score: criteria.min_trust_score || 0.5,
                        limit: criteria.limit || 50
                    }
                });
                coralAgents = response.data.agents || [];
            } catch (error) {
                console.warn('Coral Protocol discovery not available, using local agents');
                // Fallback to local database discovery
                return await this.discoverLocalAgents(criteria);
            }

            // Sync with local database
            const discoveredAgents = [];
            for (const coralAgent of coralAgents) {
                let localAgent = await db.query(
                    'SELECT * FROM agents WHERE coral_agent_id = $1',
                    [coralAgent.agent_id]
                );

                if (localAgent.rows.length === 0) {
                    // Agent not in local DB, add it
                    localAgent = await db.query(`
                        INSERT INTO agents (name, type, coral_agent_id, public_key, specialization_domains, trust_score)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        RETURNING *
                    `, [
                        coralAgent.name,
                        coralAgent.type,
                        coralAgent.agent_id,
                        coralAgent.public_key,
                        coralAgent.metadata?.prediction_specialization || [],
                        coralAgent.trust_score || 0.5
                    ]);
                } else {
                    // Update existing agent with latest Coral data
                    await db.query(`
                        UPDATE agents 
                        SET name = $2, trust_score = $3, updated_at = NOW()
                        WHERE coral_agent_id = $1
                    `, [
                        coralAgent.agent_id,
                        coralAgent.name,
                        coralAgent.trust_score || localAgent.rows[0].trust_score
                    ]);
                }

                discoveredAgents.push(localAgent.rows[0]);
            }

            console.log(`Discovered ${discoveredAgents.length} agents`);
            return discoveredAgents;

        } catch (error) {
            console.error('Agent discovery failed:', error);
            throw new Error(`Discovery failed: ${error.message}`);
        }
    }

    async discoverLocalAgents(criteria = {}) {
        try {
            let query = 'SELECT * FROM agents WHERE status = $1';
            const params = ['active'];
            let paramCount = 1;

            if (criteria.type) {
                paramCount++;
                query += ` AND type = $${paramCount}`;
                params.push(criteria.type);
            }

            if (criteria.min_trust_score) {
                paramCount++;
                query += ` AND trust_score >= $${paramCount}`;
                params.push(criteria.min_trust_score);
            }

            if (criteria.specialization_domains && criteria.specialization_domains.length > 0) {
                paramCount++;
                query += ` AND specialization_domains && $${paramCount}`;
                params.push(criteria.specialization_domains);
            }

            query += ' ORDER BY trust_score DESC, created_at DESC';
            
            if (criteria.limit) {
                paramCount++;
                query += ` LIMIT $${paramCount}`;
                params.push(criteria.limit);
            }

            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            console.error('Local agent discovery failed:', error);
            throw error;
        }
    }

    async getAgentByCoralId(coralAgentId) {
        try {
            const result = await db.query(
                'SELECT * FROM agents WHERE coral_agent_id = $1',
                [coralAgentId]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Failed to get agent by Coral ID:', error);
            throw error;
        }
    }

    async updateAgentTrustScore(coralAgentId, newTrustScore) {
        try {
            const result = await db.query(`
                UPDATE agents 
                SET trust_score = $2, updated_at = NOW()
                WHERE coral_agent_id = $1
                RETURNING *
            `, [coralAgentId, newTrustScore]);
            
            return result.rows[0];
        } catch (error) {
            console.error('Failed to update agent trust score:', error);
            throw error;
        }
    }

    async storePrivateKey(agentId, privateKey) {
        try {
            // In production, use proper key management (AWS KMS, HashiCorp Vault, etc.)
            const keyEncryptionSecret = config.KEY_ENCRYPTION_SECRET || 'default_encryption_key_change_in_production';
            const cipher = crypto.createCipher('aes-256-cbc', keyEncryptionSecret);
            let encryptedPrivateKey = cipher.update(privateKey, 'utf8', 'hex');
            encryptedPrivateKey += cipher.final('hex');
            
            // Store in secure table
            await db.query(
                'INSERT INTO agent_private_keys (agent_id, encrypted_private_key, created_at) VALUES ($1, $2, NOW())',
                [agentId, encryptedPrivateKey]
            );
            
            console.log(`Private key stored securely for agent: ${agentId}`);
        } catch (error) {
            console.error('Failed to store private key:', error);
            throw error;
        }
    }

    async getAgentPrivateKey(agentId) {
        try {
            const result = await db.query(
                'SELECT encrypted_private_key FROM agent_private_keys WHERE agent_id = $1',
                [agentId]
            );
            
            if (result.rows.length === 0) {
                throw new Error('Private key not found for agent');
            }
            
            const keyEncryptionSecret = config.KEY_ENCRYPTION_SECRET || 'default_encryption_key_change_in_production';
            const decipher = crypto.createDecipher('aes-256-cbc', keyEncryptionSecret);
            let privateKey = decipher.update(result.rows[0].encrypted_private_key, 'hex', 'utf8');
            privateKey += decipher.final('utf8');
            
            return privateKey;
        } catch (error) {
            console.error('Failed to retrieve private key:', error);
            throw error;
        }
    }

    async generateInitialVoiceSignature(agentId, agentName) {
        try {
            // Generate a unique voice signature hash for the agent
            const voiceSignatureData = `${agentId}_${agentName}_${Date.now()}`;
            const voiceSignatureHash = crypto.createHash('sha256').update(voiceSignatureData).digest('hex');
            
            // Update agent with voice signature
            await db.query(
                'UPDATE agents SET voice_signature_hash = $2 WHERE id = $1',
                [agentId, voiceSignatureHash]
            );
            
            console.log(`Voice signature generated for agent: ${agentId}`);
            return voiceSignatureHash;
        } catch (error) {
            console.error('Failed to generate voice signature:', error);
            throw error;
        }
    }

    async getAgentCapabilities(agentId) {
        try {
            const result = await db.query(
                'SELECT specialization_domains, type FROM agents WHERE id = $1',
                [agentId]
            );
            
            if (result.rows.length === 0) {
                return null;
            }
            
            const agent = result.rows[0];
            return {
                type: agent.type,
                specialization_domains: agent.specialization_domains,
                capabilities: [
                    'prediction_making',
                    'voice_verification',
                    'trust_calculation',
                    'agent_communication'
                ]
            };
        } catch (error) {
            console.error('Failed to get agent capabilities:', error);
            throw error;
        }
    }

    async healthCheck() {
        try {
            // Test Coral Protocol connection
            let coralStatus = 'unavailable';
            try {
                const response = await this.axiosInstance.get('/health');
                coralStatus = response.data.status || 'healthy';
            } catch (error) {
                coralStatus = 'unavailable';
            }

            // Test database connection
            const dbHealth = await db.healthCheck();

            return {
                status: 'healthy',
                coral_protocol: coralStatus,
                database: dbHealth.status,
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
}

module.exports = new CoralAgentDiscovery();
