// voice/conversation-manager.js - Voice Conversation Manager
const ElevenLabsVoiceService = require('./elevenlabs/voice-service');
const WebSocket = require('ws');
const db = require('../core/database/connection');

class VoiceConversationManager {
    constructor() {
        this.voiceService = new ElevenLabsVoiceService();
        this.activeConversations = new Map();
    }

    async startPredictionDiscussion(agentId, eventId, initialContext) {
        try {
            // Get agent information
            const agent = await db.query(
                'SELECT name, specialization_domains, trust_score FROM agents WHERE id = $1',
                [agentId]
            );

            if (agent.rows.length === 0) {
                throw new Error('Agent not found');
            }

            const agentData = agent.rows[0];

            // Generate initial explanation based on agent's expertise
            const initialExplanation = await this.generateContextualExplanation(
                agentData,
                eventId,
                initialContext
            );

            // Convert to speech
            const audioResponse = await this.voiceService.generatePredictionExplanation(
                agentId,
                eventId,
                initialExplanation
            );

            // Store conversation session
            const conversationId = `conv_${agentId}_${eventId}_${Date.now()}`;
            this.activeConversations.set(conversationId, {
                agent_id: agentId,
                event_id: eventId,
                started_at: new Date(),
                messages: [{
                    type: 'agent_explanation',
                    text: initialExplanation,
                    audio_file: audioResponse.audio_file_path,
                    timestamp: new Date()
                }]
            });

            return {
                success: true,
                conversation_id: conversationId,
                initial_response: {
                    text: initialExplanation,
                    audio_file_path: audioResponse.audio_file_path
                }
            };

        } catch (error) {
            console.error('Prediction discussion start failed:', error);
            throw error;
        }
    }

    async handleUserQuestion(conversationId, userQuestion, userVoiceFile = null) {
        try {
            const conversation = this.activeConversations.get(conversationId);
            if (!conversation) {
                throw new Error('Conversation not found');
            }

            // Process user input (text or voice)
            let questionText = userQuestion;
            if (userVoiceFile) {
                questionText = await this.voiceService.speechToText(userVoiceFile);
            }

            // Generate agent response based on conversation context
            const agentResponse = await this.generateAgentResponse(
                conversation.agent_id,
                conversation.event_id,
                questionText,
                conversation.messages
            );

            // Convert response to speech
            const audioResponse = await this.voiceService.generatePredictionExplanation(
                conversation.agent_id,
                conversation.event_id,
                agentResponse
            );

            // Update conversation history
            conversation.messages.push(
                {
                    type: 'user_question',
                    text: questionText,
                    timestamp: new Date()
                },
                {
                    type: 'agent_response',
                    text: agentResponse,
                    audio_file: audioResponse.audio_file_path,
                    timestamp: new Date()
                }
            );

            return {
                success: true,
                response: {
                    text: agentResponse,
                    audio_file_path: audioResponse.audio_file_path
                },
                conversation_length: conversation.messages.length
            };

        } catch (error) {
            console.error('User question handling failed:', error);
            throw error;
        }
    }

    async generateContextualExplanation(agentData, eventId, context) {
        // Generate explanation based on agent specialization
        const specializations = agentData.specialization_domains.join(', ');
        const trustLevel = agentData.trust_score > 0.8 ? 'highly trusted' : 
                          agentData.trust_score > 0.6 ? 'moderately trusted' : 'developing';

        return `Hello, I'm ${agentData.name}, a ${trustLevel} prediction agent specializing in ${specializations}. 
                Regarding this ${context.category} event: ${context.title}, 
                I predict a ${(context.predicted_probability * 100).toFixed(1)}% probability of occurrence. 
                My reasoning is based on ${context.rationale}. 
                I have a confidence level of ${(context.confidence_score * 100).toFixed(0)}% in this prediction. 
                Feel free to ask me about my analysis methodology or any specific aspects of this prediction.`;
    }

    async generateAgentResponse(agentId, eventId, userQuestion, conversationHistory) {
        // In production, this would use Mistral AI to generate contextual responses
        // For now, provide structured responses based on question patterns
        
        const questionLower = userQuestion.toLowerCase();
        
        if (questionLower.includes('why') || questionLower.includes('reason')) {
            return `My prediction is based on several key factors I analyze: historical patterns, current market conditions, and relevant news sentiment. I weigh these factors according to my specialized training in this domain.`;
        }
        
        if (questionLower.includes('confidence') || questionLower.includes('sure')) {
            return `My confidence in this prediction reflects the quality and consistency of the data I analyzed. Higher confidence indicates stronger historical patterns and more reliable data sources.`;
        }
        
        if (questionLower.includes('compare') || questionLower.includes('other')) {
            return `Compared to other agents in my specialization, my approach emphasizes data-driven analysis while considering market sentiment. My track record shows consistent performance in similar event types.`;
        }
        
        return `That's an interesting question. Based on my analysis framework and the current data available, I believe my prediction methodology accounts for the key variables in this scenario. Would you like me to elaborate on any specific aspect?`;
    }

    getConversationHistory(conversationId) {
        const conversation = this.activeConversations.get(conversationId);
        return conversation ? conversation.messages : null;
    }

    endConversation(conversationId) {
        const conversation = this.activeConversations.get(conversationId);
        if (conversation) {
            // Store conversation in database for analysis
            this.storeConversationHistory(conversationId, conversation);
            this.activeConversations.delete(conversationId);
            return true;
        }
        return false;
    }

    async storeConversationHistory(conversationId, conversation) {
        try {
            await db.query(`
                INSERT INTO voice_conversations 
                (id, agent_id, event_id, started_at, ended_at, message_count, conversation_data)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                conversationId,
                conversation.agent_id,
                conversation.event_id,
                conversation.started_at,
                new Date(),
                conversation.messages.length,
                JSON.stringify(conversation.messages)
            ]);
        } catch (error) {
            console.error('Failed to store conversation history:', error);
        }
    }
}

module.exports = VoiceConversationManager;