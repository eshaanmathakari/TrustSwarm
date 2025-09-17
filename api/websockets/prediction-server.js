// api/websockets/prediction-server.js - WebSocket Server for Real-time Predictions
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const db = require('../../core/database/connection');

class PredictionWebSocketServer {
    constructor(port) {
        this.wss = new WebSocket.Server({ 
            port,
            verifyClient: this.verifyClient.bind(this)
        });
        
        this.connections = new Map(); // Store agent connections
        this.setupEventHandlers();
    }

    verifyClient(info) {
        // Extract and verify JWT token
        const url = new URL(info.req.url, 'ws://localhost');
        const token = url.searchParams.get('token');
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            info.req.user = decoded;
            return true;
        } catch (error) {
            return false;
        }
    }

    setupEventHandlers() {
        this.wss.on('connection', (ws, req) => {
            const agentId = req.user.agent_id;
            this.connections.set(agentId, ws);

            console.log(`Agent ${agentId} connected to prediction stream`);

            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data);
                    await this.handleMessage(agentId, message, ws);
                } catch (error) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: error.message
                    }));
                }
            });

            ws.on('close', () => {
                this.connections.delete(agentId);
                console.log(`Agent ${agentId} disconnected from prediction stream`);
            });

            // Send welcome message with current active predictions
            this.sendActivePredictions(ws);
        });
    }

    async handleMessage(agentId, message, ws) {
        switch (message.type) {
            case 'submit_prediction':
                await this.handlePredictionSubmission(agentId, message.data, ws);
                break;
            
            case 'request_coordination':
                await this.handleCoordinationRequest(agentId, message.data, ws);
                break;
            
            case 'meta_prediction':
                await this.handleMetaPrediction(agentId, message.data, ws);
                break;
            
            default:
                ws.send(JSON.stringify({
                    type: 'error',
                    message: `Unknown message type: ${message.type}`
                }));
        }
    }

    async handlePredictionSubmission(agentId, predictionData, ws) {
        try {
            // Store prediction in database
            const result = await db.query(`
                INSERT INTO predictions 
                (agent_id, event_id, event_title, event_category, predicted_probability, rationale, confidence_score, stake_amount)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, [
                agentId,
                predictionData.event_id,
                predictionData.event_title,
                predictionData.event_category,
                predictionData.predicted_probability,
                predictionData.rationale,
                predictionData.confidence_score,
                predictionData.stake_amount || 0
            ]);

            const prediction = result.rows[0];

            // Broadcast to all connected agents in the same category
            this.broadcastToCategory(predictionData.event_category, {
                type: 'new_prediction',
                data: {
                    prediction_id: prediction.id,
                    agent_id: agentId,
                    event_id: predictionData.event_id,
                    predicted_probability: predictionData.predicted_probability,
                    confidence_score: predictionData.confidence_score,
                    timestamp: prediction.prediction_timestamp
                }
            });

            // Send confirmation to submitting agent
            ws.send(JSON.stringify({
                type: 'prediction_confirmed',
                data: {
                    prediction_id: prediction.id,
                    status: 'submitted'
                }
            }));

        } catch (error) {
            console.error('Prediction submission error:', error);
            ws.send(JSON.stringify({
                type: 'prediction_error',
                message: error.message
            }));
        }
    }

    async handleCoordinationRequest(agentId, coordinationData, ws) {
        // Find agents with complementary specializations
        const complementaryAgents = await db.query(`
            SELECT id, name, specialization_domains, trust_score
            FROM agents 
            WHERE id != $1 
            AND status = 'active'
            AND trust_score >= $2
            AND specialization_domains && $3
            ORDER BY trust_score DESC
            LIMIT 5
        `, [
            agentId,
            coordinationData.min_trust_score || 0.6,
            coordinationData.required_specializations || []
        ]);

        // Notify potential collaboration partners
        for (const agent of complementaryAgents.rows) {
            const agentWs = this.connections.get(agent.id);
            if (agentWs && agentWs.readyState === WebSocket.OPEN) {
                agentWs.send(JSON.stringify({
                    type: 'coordination_request',
                    data: {
                        from_agent_id: agentId,
                        event_id: coordinationData.event_id,
                        collaboration_type: coordinationData.type,
                        message: coordinationData.message
                    }
                }));
            }
        }

        ws.send(JSON.stringify({
            type: 'coordination_broadcasted',
            data: {
                notified_agents: complementaryAgents.rows.length
            }
        }));
    }

    async handleMetaPrediction(agentId, metaData, ws) {
        try {
            // Store meta-prediction about other agents' predictions
            const result = await db.query(`
                INSERT INTO predictions 
                (agent_id, event_id, event_title, event_category, predicted_probability, rationale, confidence_score, stake_amount)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, [
                agentId,
                `meta_${metaData.target_prediction_id}`,
                `Meta-prediction for ${metaData.target_prediction_id}`,
                'meta_prediction',
                metaData.predicted_probability,
                metaData.rationale,
                metaData.confidence_score,
                metaData.stake_amount || 0
            ]);

            ws.send(JSON.stringify({
                type: 'meta_prediction_confirmed',
                data: {
                    prediction_id: result.rows[0].id,
                    status: 'submitted'
                }
            }));

        } catch (error) {
            console.error('Meta-prediction submission error:', error);
            ws.send(JSON.stringify({
                type: 'prediction_error',
                message: error.message
            }));
        }
    }

    broadcastToCategory(category, message) {
        this.connections.forEach((ws, agentId) => {
            if (ws.readyState === WebSocket.OPEN) {
                // Check if agent specializes in this category
                db.query(
                    'SELECT specialization_domains FROM agents WHERE id = $1',
                    [agentId]
                ).then(result => {
                    if (result.rows.length > 0 && 
                        result.rows[0].specialization_domains.includes(category)) {
                        ws.send(JSON.stringify(message));
                    }
                });
            }
        });
    }

    async sendActivePredictions(ws) {
        try {
            const activePredictions = await db.query(`
                SELECT 
                    p.id, p.event_id, p.event_title, p.event_category,
                    p.predicted_probability, p.confidence_score,
                    a.name as agent_name, a.trust_score
                FROM predictions p
                JOIN agents a ON p.agent_id = a.id
                WHERE p.resolution_timestamp IS NULL
                ORDER BY p.prediction_timestamp DESC
                LIMIT 50
            `);

            ws.send(JSON.stringify({
                type: 'active_predictions',
                data: activePredictions.rows
            }));

        } catch (error) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to load active predictions'
            }));
        }
    }
}

module.exports = PredictionWebSocketServer;