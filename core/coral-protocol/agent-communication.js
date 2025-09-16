// core/coral-protocol/agent-communication.js
const crypto = require('crypto');
const axios = require('axios');
const db = require('../database/connection');
const config = require('../../config/environment');

class AgentCommunication {
    constructor() {
        this.messageTypes = {
            PREDICTION_SHARE: 'prediction_share',
            TRUST_CHALLENGE: 'trust_challenge',
            COORDINATION: 'coordination',
            META_PREDICTION: 'meta_prediction',
            VOICE_VERIFICATION_REQUEST: 'voice_verification_request',
            VOICE_VERIFICATION_RESPONSE: 'voice_verification_response',
            TRUST_UPDATE: 'trust_update',
            AGENT_STATUS: 'agent_status'
        };

        this.coralApiKey = config.CORAL_PROTOCOL_API_KEY;
        this.baseUrl = 'https://api.coralprotocol.org/v1';
        
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

    async sendSecureMessage(fromAgentId, toAgentId, messageType, payload) {
        try {
            console.log(`Sending secure message from ${fromAgentId} to ${toAgentId}, type: ${messageType}`);
            
            // Validate message type
            if (!Object.values(this.messageTypes).includes(messageType)) {
                throw new Error(`Invalid message type: ${messageType}`);
            }

            // Get recipient's public key and Coral ID
            const recipient = await db.query(
                'SELECT public_key, coral_agent_id, name FROM agents WHERE id = $1',
                [toAgentId]
            );

            if (recipient.rows.length === 0) {
                throw new Error('Recipient agent not found');
            }

            // Get sender's information
            const sender = await db.query(
                'SELECT coral_agent_id, name FROM agents WHERE id = $1',
                [fromAgentId]
            );

            if (sender.rows.length === 0) {
                throw new Error('Sender agent not found');
            }

            // Prepare message payload
            const messagePayload = {
                ...payload,
                from_agent_id: fromAgentId,
                from_coral_id: sender.rows[0].coral_agent_id,
                from_agent_name: sender.rows[0].name,
                message_type: messageType,
                timestamp: new Date().toISOString(),
                nonce: crypto.randomBytes(16).toString('hex')
            };

            // Encrypt message with recipient's public key
            const encryptedPayload = crypto.publicEncrypt(
                {
                    key: recipient.rows[0].public_key,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256'
                },
                Buffer.from(JSON.stringify(messagePayload))
            ).toString('base64');

            // Sign message with sender's private key
            const senderPrivateKey = await this.getAgentPrivateKey(fromAgentId);
            const signature = crypto.sign('sha256', Buffer.from(encryptedPayload), {
                key: senderPrivateKey,
                padding: crypto.constants.RSA_PKCS1_PSS_PADDING
            });
            const signatureHash = signature.toString('base64');

            // Store in communications log
            const communicationRecord = await db.query(`
                INSERT INTO agent_communications 
                (from_agent_id, to_agent_id, message_type, encrypted_payload, signature_hash, status)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [fromAgentId, toAgentId, messageType, encryptedPayload, signatureHash, 'sent']);

            // Send via Coral Protocol
            try {
                await this.sendViaCoral(
                    recipient.rows[0].coral_agent_id,
                    messageType,
                    encryptedPayload,
                    signatureHash,
                    communicationRecord.rows[0].id
                );
                
                // Update status to delivered
                await db.query(
                    'UPDATE agent_communications SET status = $2 WHERE id = $1',
                    [communicationRecord.rows[0].id, 'delivered']
                );
            } catch (error) {
                console.warn('Coral Protocol delivery failed, message stored locally:', error.message);
                // Update status to failed but keep message for retry
                await db.query(
                    'UPDATE agent_communications SET status = $2 WHERE id = $1',
                    [communicationRecord.rows[0].id, 'failed']
                );
            }

            console.log(`Secure message sent successfully: ${communicationRecord.rows[0].id}`);

            return {
                success: true,
                message_id: communicationRecord.rows[0].id,
                encrypted: true,
                status: 'sent'
            };

        } catch (error) {
            console.error('Secure message sending failed:', error);
            throw error;
        }
    }

    async receiveMessage(messageId) {
        try {
            console.log(`Receiving message: ${messageId}`);
            
            const message = await db.query(
                'SELECT * FROM agent_communications WHERE id = $1',
                [messageId]
            );

            if (message.rows.length === 0) {
                throw new Error('Message not found');
            }

            const messageData = message.rows[0];
            
            // Get sender's public key for verification
            const senderPublicKey = await this.getAgentPublicKey(messageData.from_agent_id);
            
            // Verify signature
            const isValid = crypto.verify(
                'sha256',
                Buffer.from(messageData.encrypted_payload),
                {
                    key: senderPublicKey,
                    padding: crypto.constants.RSA_PKCS1_PSS_PADDING
                },
                Buffer.from(messageData.signature_hash, 'base64')
            );

            if (!isValid) {
                throw new Error('Message signature verification failed');
            }

            // Decrypt with recipient's private key
            const recipientPrivateKey = await this.getAgentPrivateKey(messageData.to_agent_id);
            const decryptedPayload = crypto.privateDecrypt(
                {
                    key: recipientPrivateKey,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256'
                },
                Buffer.from(messageData.encrypted_payload, 'base64')
            );

            const payload = JSON.parse(decryptedPayload.toString());

            // Update message status to received
            await db.query(
                'UPDATE agent_communications SET status = $2 WHERE id = $1',
                [messageId, 'received']
            );

            console.log(`Message received and decrypted successfully: ${messageId}`);

            return {
                success: true,
                message_id: messageId,
                from_agent_id: messageData.from_agent_id,
                message_type: messageData.message_type,
                payload: payload,
                timestamp: messageData.timestamp,
                verified: true
            };

        } catch (error) {
            console.error('Message decryption failed:', error);
            throw error;
        }
    }

    async sendViaCoral(recipientCoralId, messageType, encryptedPayload, signature, messageId) {
        try {
            const payload = {
                to: recipientCoralId,
                type: messageType,
                encrypted_data: encryptedPayload,
                signature: signature,
                message_id: messageId,
                timestamp: new Date().toISOString()
            };

            await this.axiosInstance.post('/messages/send', payload);
            console.log(`Message sent via Coral Protocol: ${messageId}`);
        } catch (error) {
            console.warn('Coral Protocol message sending failed:', error.message);
            // Don't throw error - message is stored locally for retry
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

    async getAgentPublicKey(agentId) {
        try {
            const result = await db.query(
                'SELECT public_key FROM agents WHERE id = $1',
                [agentId]
            );
            
            if (result.rows.length === 0) {
                throw new Error('Agent not found');
            }
            
            return result.rows[0].public_key;
        } catch (error) {
            console.error('Failed to retrieve public key:', error);
            throw error;
        }
    }

    async getPendingMessages(agentId, limit = 50) {
        try {
            const result = await db.query(`
                SELECT * FROM agent_communications 
                WHERE to_agent_id = $1 AND status IN ('sent', 'delivered')
                ORDER BY timestamp DESC
                LIMIT $2
            `, [agentId, limit]);
            
            return result.rows;
        } catch (error) {
            console.error('Failed to get pending messages:', error);
            throw error;
        }
    }

    async markMessageAsRead(messageId) {
        try {
            await db.query(
                'UPDATE agent_communications SET status = $2 WHERE id = $1',
                [messageId, 'read']
            );
        } catch (error) {
            console.error('Failed to mark message as read:', error);
            throw error;
        }
    }

    async sendPredictionShare(fromAgentId, toAgentId, predictionData) {
        try {
            const payload = {
                prediction_id: predictionData.id,
                event_title: predictionData.event_title,
                predicted_probability: predictionData.predicted_probability,
                rationale: predictionData.rationale,
                confidence_score: predictionData.confidence_score,
                event_category: predictionData.event_category,
                prediction_timestamp: predictionData.prediction_timestamp
            };

            return await this.sendSecureMessage(
                fromAgentId,
                toAgentId,
                this.messageTypes.PREDICTION_SHARE,
                payload
            );
        } catch (error) {
            console.error('Failed to send prediction share:', error);
            throw error;
        }
    }

    async sendTrustChallenge(fromAgentId, toAgentId, challengeData) {
        try {
            const payload = {
                challenge_type: challengeData.type,
                target_prediction_id: challengeData.prediction_id,
                challenge_rationale: challengeData.rationale,
                requested_verification: challengeData.verification_type,
                deadline: challengeData.deadline
            };

            return await this.sendSecureMessage(
                fromAgentId,
                toAgentId,
                this.messageTypes.TRUST_CHALLENGE,
                payload
            );
        } catch (error) {
            console.error('Failed to send trust challenge:', error);
            throw error;
        }
    }

    async sendVoiceVerificationRequest(fromAgentId, toAgentId, verificationData) {
        try {
            const payload = {
                verification_type: verificationData.type,
                challenge_text: verificationData.challenge_text,
                expected_duration: verificationData.expected_duration,
                deadline: verificationData.deadline,
                verification_id: verificationData.verification_id
            };

            return await this.sendSecureMessage(
                fromAgentId,
                toAgentId,
                this.messageTypes.VOICE_VERIFICATION_REQUEST,
                payload
            );
        } catch (error) {
            console.error('Failed to send voice verification request:', error);
            throw error;
        }
    }

    async sendCoordinationMessage(fromAgentId, toAgentId, coordinationData) {
        try {
            const payload = {
                coordination_type: coordinationData.type,
                target_event: coordinationData.event_id,
                proposed_action: coordinationData.action,
                reasoning: coordinationData.reasoning,
                deadline: coordinationData.deadline
            };

            return await this.sendSecureMessage(
                fromAgentId,
                toAgentId,
                this.messageTypes.COORDINATION,
                payload
            );
        } catch (error) {
            console.error('Failed to send coordination message:', error);
            throw error;
        }
    }

    async getCommunicationHistory(agentId, limit = 100, offset = 0) {
        try {
            const result = await db.query(`
                SELECT 
                    ac.*,
                    fa.name as from_agent_name,
                    ta.name as to_agent_name
                FROM agent_communications ac
                JOIN agents fa ON ac.from_agent_id = fa.id
                JOIN agents ta ON ac.to_agent_id = ta.id
                WHERE ac.from_agent_id = $1 OR ac.to_agent_id = $1
                ORDER BY ac.timestamp DESC
                LIMIT $2 OFFSET $3
            `, [agentId, limit, offset]);
            
            return result.rows;
        } catch (error) {
            console.error('Failed to get communication history:', error);
            throw error;
        }
    }

    async healthCheck() {
        try {
            // Test database connection
            const dbHealth = await db.healthCheck();
            
            // Test Coral Protocol connection
            let coralStatus = 'unavailable';
            try {
                const response = await this.axiosInstance.get('/health');
                coralStatus = response.data.status || 'healthy';
            } catch (error) {
                coralStatus = 'unavailable';
            }

            return {
                status: 'healthy',
                database: dbHealth.status,
                coral_protocol: coralStatus,
                message_types: Object.keys(this.messageTypes).length,
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

module.exports = new AgentCommunication();
