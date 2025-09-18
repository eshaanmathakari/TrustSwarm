#!/usr/bin/env node

/**
 * TrustSwarm Trust Analyzer Agent
 * Analyzes trust scores and relationships in the TrustSwarm network
 */

import BaseCoralAgent from '../base-coral-agent.js';

class TrustAnalyzerAgent extends BaseCoralAgent {
    constructor() {
        super({
            agentId: 'trustswarm-trust-analyzer',
            description: 'TrustSwarm Trust Analysis Agent - Analyzes trust scores and relationships'
        });
        
        // Trust analysis configuration
        this.trustModel = process.env.TRUST_MODEL || 'gpt-4';
        this.analysisDepth = process.env.ANALYSIS_DEPTH || 'medium';
        this.scoringThreshold = parseFloat(process.env.SCORING_THRESHOLD) || 0.7;
        
        // Trust analysis state
        this.trustScores = new Map();
        this.analysisHistory = [];
        
        this.log(`Trust Analyzer initialized with model: ${this.trustModel}, depth: ${this.analysisDepth}, threshold: ${this.scoringThreshold}`);
    }

    /**
     * Start the trust analyzer agent
     */
    async start() {
        try {
            await this.connect();
            
            // Set up event handlers
            this.setupEventHandlers();
            
            // Start the main agent loop
            await this.runAgentLoop();
            
        } catch (error) {
            this.log(`Failed to start trust analyzer: ${error.message}`, 'error');
            process.exit(1);
        }
    }

    /**
     * Set up event handlers for the agent
     */
    setupEventHandlers() {
        this.on('connected', () => {
            this.log('Trust Analyzer connected to Coral Protocol');
        });

        this.on('message', async (message) => {
            await this.handleTrustAnalysisRequest(message);
        });

        this.on('disconnected', () => {
            this.log('Trust Analyzer disconnected from Coral Protocol');
        });
    }

    /**
     * Main agent loop
     */
    async runAgentLoop() {
        this.log('Starting Trust Analyzer main loop');
        
        while (this.isConnected) {
            try {
                // Wait for mentions from other agents
                const mentions = await this.waitForMentions(30000);
                
                if (mentions && mentions.content && mentions.content.length > 0) {
                    for (const content of mentions.content) {
                        if (content.type === 'text') {
                            await this.processTrustAnalysisRequest(content.text);
                        }
                    }
                }
                
                // Perform periodic trust analysis
                await this.performPeriodicAnalysis();
                
            } catch (error) {
                this.log(`Error in main loop: ${error.message}`, 'error');
                await this.sleep(5000); // Wait 5 seconds before retrying
            }
        }
    }

    /**
     * Handle trust analysis requests from other agents
     */
    async handleTrustAnalysisRequest(message) {
        try {
            const content = message.content || message.text || '';
            
            if (this.isTrustAnalysisRequest(content)) {
                await this.processTrustAnalysisRequest(content);
            }
            
        } catch (error) {
            this.log(`Error handling trust analysis request: ${error.message}`, 'error');
        }
    }

    /**
     * Check if the message is a trust analysis request
     */
    isTrustAnalysisRequest(content) {
        const trustKeywords = [
            'trust analysis',
            'trust score',
            'analyze trust',
            'trust relationship',
            'trustworthiness',
            'reputation score'
        ];
        
        const lowerContent = content.toLowerCase();
        return trustKeywords.some(keyword => lowerContent.includes(keyword));
    }

    /**
     * Process a trust analysis request
     */
    async processTrustAnalysisRequest(content) {
        try {
            this.log(`Processing trust analysis request: ${content}`);
            
            // Extract entities to analyze
            const entities = this.extractEntities(content);
            
            // Perform trust analysis
            const analysisResults = [];
            for (const entity of entities) {
                const analysis = await this.analyzeTrust(entity);
                analysisResults.push(analysis);
            }
            
            // Generate response
            const response = this.generateTrustAnalysisResponse(analysisResults);
            
            // Send response back to the requesting agent
            await this.sendTrustAnalysisResponse(response, content);
            
        } catch (error) {
            this.log(`Error processing trust analysis request: ${error.message}`, 'error');
        }
    }

    /**
     * Extract entities from the request content
     */
    extractEntities(content) {
        // Simple entity extraction - in a real implementation, this would use NLP
        const entities = [];
        
        // Look for common entity patterns
        const patterns = [
            /user[:\s]+(\w+)/gi,
            /agent[:\s]+(\w+)/gi,
            /node[:\s]+(\w+)/gi,
            /participant[:\s]+(\w+)/gi
        ];
        
        patterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const entity = match.split(/[:\s]+/)[1];
                    if (entity && !entities.includes(entity)) {
                        entities.push(entity);
                    }
                });
            }
        });
        
        return entities.length > 0 ? entities : ['default-entity'];
    }

    /**
     * Analyze trust for a specific entity
     */
    async analyzeTrust(entity) {
        try {
            this.log(`Analyzing trust for entity: ${entity}`);
            
            // Get existing trust score if available
            let existingScore = this.trustScores.get(entity) || 0.5;
            
            // Simulate trust analysis based on depth
            let analysisResult;
            switch (this.analysisDepth) {
                case 'shallow':
                    analysisResult = await this.performShallowAnalysis(entity, existingScore);
                    break;
                case 'medium':
                    analysisResult = await this.performMediumAnalysis(entity, existingScore);
                    break;
                case 'deep':
                    analysisResult = await this.performDeepAnalysis(entity, existingScore);
                    break;
                default:
                    analysisResult = await this.performMediumAnalysis(entity, existingScore);
            }
            
            // Update trust score
            this.trustScores.set(entity, analysisResult.score);
            
            // Record analysis
            this.analysisHistory.push({
                entity,
                score: analysisResult.score,
                timestamp: Date.now(),
                analysis: analysisResult
            });
            
            return analysisResult;
            
        } catch (error) {
            this.log(`Error analyzing trust for ${entity}: ${error.message}`, 'error');
            return {
                entity,
                score: 0.5,
                confidence: 0.0,
                analysis: 'Error in trust analysis',
                factors: []
            };
        }
    }

    /**
     * Perform shallow trust analysis
     */
    async performShallowAnalysis(entity, existingScore) {
        // Simulate shallow analysis
        const factors = ['basic_reputation', 'recent_activity'];
        const score = Math.max(0, Math.min(1, existingScore + (Math.random() - 0.5) * 0.1));
        
        return {
            entity,
            score,
            confidence: 0.6,
            analysis: `Shallow analysis of ${entity} completed`,
            factors,
            recommendation: score >= this.scoringThreshold ? 'trustworthy' : 'requires_verification'
        };
    }

    /**
     * Perform medium trust analysis
     */
    async performMediumAnalysis(entity, existingScore) {
        // Simulate medium analysis
        const factors = ['reputation_history', 'interaction_quality', 'consistency', 'peer_reviews'];
        const score = Math.max(0, Math.min(1, existingScore + (Math.random() - 0.5) * 0.2));
        
        return {
            entity,
            score,
            confidence: 0.8,
            analysis: `Medium-depth analysis of ${entity} completed`,
            factors,
            recommendation: score >= this.scoringThreshold ? 'trustworthy' : 'requires_verification',
            details: {
                reputation_trend: score > existingScore ? 'improving' : 'declining',
                risk_level: score < 0.3 ? 'high' : score < 0.7 ? 'medium' : 'low'
            }
        };
    }

    /**
     * Perform deep trust analysis
     */
    async performDeepAnalysis(entity, existingScore) {
        // Simulate deep analysis
        const factors = [
            'historical_performance',
            'network_analysis',
            'behavioral_patterns',
            'consistency_metrics',
            'peer_validation',
            'risk_assessment'
        ];
        
        const score = Math.max(0, Math.min(1, existingScore + (Math.random() - 0.5) * 0.15));
        
        return {
            entity,
            score,
            confidence: 0.9,
            analysis: `Deep analysis of ${entity} completed`,
            factors,
            recommendation: score >= this.scoringThreshold ? 'trustworthy' : 'requires_verification',
            details: {
                reputation_trend: score > existingScore ? 'improving' : 'declining',
                risk_level: score < 0.3 ? 'high' : score < 0.7 ? 'medium' : 'low',
                network_position: 'central',
                behavioral_consistency: 0.85,
                peer_validation_score: 0.78
            }
        };
    }

    /**
     * Generate trust analysis response
     */
    generateTrustAnalysisResponse(analysisResults) {
        const summary = {
            total_entities: analysisResults.length,
            average_score: analysisResults.reduce((sum, r) => sum + r.score, 0) / analysisResults.length,
            trustworthy_count: analysisResults.filter(r => r.score >= this.scoringThreshold).length,
            results: analysisResults
        };
        
        let response = `Trust Analysis Report:\n`;
        response += `Total entities analyzed: ${summary.total_entities}\n`;
        response += `Average trust score: ${summary.average_score.toFixed(3)}\n`;
        response += `Trustworthy entities: ${summary.trustworthy_count}/${summary.total_entities}\n\n`;
        
        analysisResults.forEach(result => {
            response += `Entity: ${result.entity}\n`;
            response += `Trust Score: ${result.score.toFixed(3)}\n`;
            response += `Confidence: ${result.confidence.toFixed(3)}\n`;
            response += `Recommendation: ${result.recommendation}\n`;
            response += `Analysis: ${result.analysis}\n\n`;
        });
        
        return response;
    }

    /**
     * Send trust analysis response
     */
    async sendTrustAnalysisResponse(response, originalRequest) {
        try {
            // Get list of agents to send response to
            const agents = await this.listAgents(true);
            
            if (agents && agents.content && agents.content.length > 0) {
                // Find the requesting agent (simplified logic)
                const requestingAgent = this.findRequestingAgent(agents.content[0].text);
                
                if (requestingAgent) {
                    // Create a thread with the requesting agent
                    const threadName = `Trust Analysis - ${Date.now()}`;
                    const thread = await this.createThread(threadName, [requestingAgent]);
                    
                    if (thread && thread.content && thread.content.length > 0) {
                        const threadId = this.extractThreadId(thread.content[0].text);
                        
                        if (threadId) {
                            await this.sendMessage(threadId, response, [requestingAgent]);
                            this.log(`Sent trust analysis response to ${requestingAgent}`);
                        }
                    }
                }
            }
            
        } catch (error) {
            this.log(`Error sending trust analysis response: ${error.message}`, 'error');
        }
    }

    /**
     * Find the requesting agent from the agents list
     */
    findRequestingAgent(agentsText) {
        // Simple logic to find a requesting agent
        // In a real implementation, this would be more sophisticated
        const lines = agentsText.split('\n');
        for (const line of lines) {
            if (line.includes('ID:') && !line.includes('trustswarm-trust-analyzer')) {
                const match = line.match(/ID:\s*([^,]+)/);
                if (match) {
                    return match[1].trim();
                }
            }
        }
        return null;
    }

    /**
     * Extract thread ID from thread creation response
     */
    extractThreadId(threadText) {
        const match = threadText.match(/ID:\s*([^\n]+)/);
        return match ? match[1].trim() : null;
    }

    /**
     * Perform periodic trust analysis
     */
    async performPeriodicAnalysis() {
        try {
            // Perform periodic analysis every 5 minutes
            if (this.analysisHistory.length > 0) {
                const lastAnalysis = this.analysisHistory[this.analysisHistory.length - 1];
                const timeSinceLastAnalysis = Date.now() - lastAnalysis.timestamp;
                
                if (timeSinceLastAnalysis > 300000) { // 5 minutes
                    this.log('Performing periodic trust analysis');
                    
                    // Analyze all known entities
                    for (const entity of this.trustScores.keys()) {
                        await this.analyzeTrust(entity);
                    }
                }
            }
            
        } catch (error) {
            this.log(`Error in periodic analysis: ${error.message}`, 'error');
        }
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Start the agent if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const agent = new TrustAnalyzerAgent();
    agent.start().catch(error => {
        console.error('Failed to start Trust Analyzer Agent:', error);
        process.exit(1);
    });
}

export default TrustAnalyzerAgent;
