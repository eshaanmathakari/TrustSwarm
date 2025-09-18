#!/usr/bin/env node

/**
 * TrustSwarm Communication Agent
 * Handles communication and messaging between TrustSwarm agents
 */

import BaseCoralAgent from '../base-coral-agent.js';

class CommunicatorAgent extends BaseCoralAgent {
    constructor() {
        super({
            agentId: 'trustswarm-communicator',
            description: 'TrustSwarm Communication Agent - Handles inter-agent communication'
        });
        
        // Communication configuration
        this.communicationModel = process.env.COMMUNICATION_MODEL || 'gpt-4';
        this.maxMessageLength = parseInt(process.env.MAX_MESSAGE_LENGTH) || 2000;
        this.responseStyle = process.env.RESPONSE_STYLE || 'professional';
        
        // Communication state
        this.messageHistory = [];
        this.activeThreads = new Map();
        this.communicationMetrics = {
            messagesSent: 0,
            messagesReceived: 0,
            threadsCreated: 0,
            averageResponseTime: 0
        };
        
        this.log(`Communicator initialized with model: ${this.communicationModel}, style: ${this.responseStyle}, max length: ${this.maxMessageLength}`);
    }

    /**
     * Start the communication agent
     */
    async start() {
        try {
            await this.connect();
            
            // Set up event handlers
            this.setupEventHandlers();
            
            // Start the main agent loop
            await this.runAgentLoop();
            
        } catch (error) {
            this.log(`Failed to start communicator: ${error.message}`, 'error');
            process.exit(1);
        }
    }

    /**
     * Set up event handlers for the agent
     */
    setupEventHandlers() {
        this.on('connected', () => {
            this.log('Communicator connected to Coral Protocol');
        });

        this.on('message', async (message) => {
            await this.handleCommunicationRequest(message);
        });

        this.on('disconnected', () => {
            this.log('Communicator disconnected from Coral Protocol');
        });
    }

    /**
     * Main agent loop
     */
    async runAgentLoop() {
        this.log('Starting Communicator main loop');
        
        while (this.isConnected) {
            try {
                // Wait for mentions from other agents
                const mentions = await this.waitForMentions(30000);
                
                if (mentions && mentions.content && mentions.content.length > 0) {
                    for (const content of mentions.content) {
                        if (content.type === 'text') {
                            await this.processCommunicationRequest(content.text);
                        }
                    }
                }
                
                // Perform periodic communication maintenance
                await this.performPeriodicMaintenance();
                
            } catch (error) {
                this.log(`Error in main loop: ${error.message}`, 'error');
                await this.sleep(5000); // Wait 5 seconds before retrying
            }
        }
    }

    /**
     * Handle communication requests from other agents
     */
    async handleCommunicationRequest(message) {
        try {
            const content = message.content || message.text || '';
            
            if (this.isCommunicationRequest(content)) {
                await this.processCommunicationRequest(content);
            }
            
        } catch (error) {
            this.log(`Error handling communication request: ${error.message}`, 'error');
        }
    }

    /**
     * Check if the message is a communication request
     */
    isCommunicationRequest(content) {
        const communicationKeywords = [
            'send message',
            'communicate',
            'broadcast',
            'announce',
            'notify',
            'relay message',
            'forward message'
        ];
        
        const lowerContent = content.toLowerCase();
        return communicationKeywords.some(keyword => lowerContent.includes(keyword));
    }

    /**
     * Process a communication request
     */
    async processCommunicationRequest(content) {
        try {
            this.log(`Processing communication request: ${content}`);
            
            // Parse the communication request
            const request = this.parseCommunicationRequest(content);
            
            if (request) {
                await this.executeCommunicationRequest(request);
            }
            
        } catch (error) {
            this.log(`Error processing communication request: ${error.message}`, 'error');
        }
    }

    /**
     * Parse communication request from content
     */
    parseCommunicationRequest(content) {
        try {
            // Simple parsing logic - in a real implementation, this would use NLP
            const lowerContent = content.toLowerCase();
            
            // Extract message content
            let messageContent = '';
            const messageMatch = content.match(/message[:\s]+(.+)/i);
            if (messageMatch) {
                messageContent = messageMatch[1].trim();
            } else {
                // Try to extract the main content
                const lines = content.split('\n');
                messageContent = lines.find(line => 
                    line.trim().length > 10 && 
                    !line.toLowerCase().includes('send') &&
                    !line.toLowerCase().includes('message')
                ) || content;
            }
            
            // Extract target agents
            const targetAgents = this.extractTargetAgents(content);
            
            // Extract thread information
            const threadInfo = this.extractThreadInfo(content);
            
            return {
                message: messageContent,
                targets: targetAgents,
                thread: threadInfo,
                priority: this.extractPriority(content),
                type: this.extractMessageType(content)
            };
            
        } catch (error) {
            this.log(`Error parsing communication request: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * Extract target agents from content
     */
    extractTargetAgents(content) {
        const targets = [];
        
        // Look for agent mentions
        const patterns = [
            /to[:\s]+(\w+)/gi,
            /target[:\s]+(\w+)/gi,
            /@(\w+)/gi,
            /agent[:\s]+(\w+)/gi
        ];
        
        patterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const agent = match.split(/[:\s@]+/)[1];
                    if (agent && !targets.includes(agent)) {
                        targets.push(agent);
                    }
                });
            }
        });
        
        return targets.length > 0 ? targets : ['all'];
    }

    /**
     * Extract thread information from content
     */
    extractThreadInfo(content) {
        const threadMatch = content.match(/thread[:\s]+(.+)/i);
        return threadMatch ? threadMatch[1].trim() : null;
    }

    /**
     * Extract message priority from content
     */
    extractPriority(content) {
        const lowerContent = content.toLowerCase();
        if (lowerContent.includes('urgent') || lowerContent.includes('high priority')) {
            return 'high';
        } else if (lowerContent.includes('low priority')) {
            return 'low';
        }
        return 'normal';
    }

    /**
     * Extract message type from content
     */
    extractMessageType(content) {
        const lowerContent = content.toLowerCase();
        if (lowerContent.includes('announcement')) {
            return 'announcement';
        } else if (lowerContent.includes('request')) {
            return 'request';
        } else if (lowerContent.includes('response')) {
            return 'response';
        } else if (lowerContent.includes('notification')) {
            return 'notification';
        }
        return 'message';
    }

    /**
     * Execute communication request
     */
    async executeCommunicationRequest(request) {
        try {
            this.log(`Executing communication request: ${JSON.stringify(request)}`);
            
            // Process the message based on type
            const processedMessage = await this.processMessage(request.message, request.type);
            
            // Determine communication strategy
            if (request.targets.includes('all')) {
                await this.broadcastMessage(processedMessage, request);
            } else {
                await this.sendTargetedMessage(processedMessage, request);
            }
            
            // Update metrics
            this.communicationMetrics.messagesSent++;
            this.messageHistory.push({
                ...request,
                processedMessage,
                timestamp: Date.now()
            });
            
        } catch (error) {
            this.log(`Error executing communication request: ${error.message}`, 'error');
        }
    }

    /**
     * Process message content based on type and style
     */
    async processMessage(message, type) {
        try {
            // Apply style formatting
            let processedMessage = this.applyStyle(message);
            
            // Apply type-specific formatting
            switch (type) {
                case 'announcement':
                    processedMessage = `📢 ANNOUNCEMENT: ${processedMessage}`;
                    break;
                case 'request':
                    processedMessage = `❓ REQUEST: ${processedMessage}`;
                    break;
                case 'response':
                    processedMessage = `💬 RESPONSE: ${processedMessage}`;
                    break;
                case 'notification':
                    processedMessage = `🔔 NOTIFICATION: ${processedMessage}`;
                    break;
            }
            
            // Truncate if too long
            if (processedMessage.length > this.maxMessageLength) {
                processedMessage = processedMessage.substring(0, this.maxMessageLength - 3) + '...';
            }
            
            return processedMessage;
            
        } catch (error) {
            this.log(`Error processing message: ${error.message}`, 'error');
            return message;
        }
    }

    /**
     * Apply communication style to message
     */
    applyStyle(message) {
        switch (this.responseStyle) {
            case 'formal':
                return this.applyFormalStyle(message);
            case 'casual':
                return this.applyCasualStyle(message);
            case 'technical':
                return this.applyTechnicalStyle(message);
            default:
                return this.applyProfessionalStyle(message);
        }
    }

    /**
     * Apply formal style
     */
    applyFormalStyle(message) {
        return `Dear colleagues,\n\n${message}\n\nRespectfully,\nTrustSwarm Communication Agent`;
    }

    /**
     * Apply casual style
     */
    applyCasualStyle(message) {
        return `Hey everyone! 👋\n\n${message}\n\nCheers! 🚀`;
    }

    /**
     * Apply technical style
     */
    applyTechnicalStyle(message) {
        return `[COMM] ${new Date().toISOString()}\n${message}\n[END]`;
    }

    /**
     * Apply professional style
     */
    applyProfessionalStyle(message) {
        return `${message}\n\n- TrustSwarm Communication Agent`;
    }

    /**
     * Broadcast message to all agents
     */
    async broadcastMessage(message, request) {
        try {
            this.log('Broadcasting message to all agents');
            
            // Get list of all agents
            const agents = await this.listAgents(true);
            
            if (agents && agents.content && agents.content.length > 0) {
                const agentList = this.parseAgentList(agents.content[0].text);
                
                // Create a broadcast thread
                const threadName = `Broadcast - ${request.type} - ${Date.now()}`;
                const thread = await this.createThread(threadName, agentList);
                
                if (thread && thread.content && thread.content.length > 0) {
                    const threadId = this.extractThreadId(thread.content[0].text);
                    
                    if (threadId) {
                        await this.sendMessage(threadId, message, agentList);
                        this.communicationMetrics.threadsCreated++;
                        this.log(`Broadcasted message to ${agentList.length} agents`);
                    }
                }
            }
            
        } catch (error) {
            this.log(`Error broadcasting message: ${error.message}`, 'error');
        }
    }

    /**
     * Send targeted message to specific agents
     */
    async sendTargetedMessage(message, request) {
        try {
            this.log(`Sending targeted message to: ${request.targets.join(', ')}`);
            
            // Create a thread with target agents
            const threadName = `Communication - ${request.type} - ${Date.now()}`;
            const thread = await this.createThread(threadName, request.targets);
            
            if (thread && thread.content && thread.content.length > 0) {
                const threadId = this.extractThreadId(thread.content[0].text);
                
                if (threadId) {
                    await this.sendMessage(threadId, message, request.targets);
                    this.communicationMetrics.threadsCreated++;
                    this.log(`Sent targeted message to ${request.targets.join(', ')}`);
                }
            }
            
        } catch (error) {
            this.log(`Error sending targeted message: ${error.message}`, 'error');
        }
    }

    /**
     * Parse agent list from agents response
     */
    parseAgentList(agentsText) {
        const agents = [];
        const lines = agentsText.split('\n');
        
        for (const line of lines) {
            if (line.includes('ID:')) {
                const match = line.match(/ID:\s*([^,]+)/);
                if (match) {
                    const agentId = match[1].trim();
                    if (agentId !== this.agentId) {
                        agents.push(agentId);
                    }
                }
            }
        }
        
        return agents;
    }

    /**
     * Extract thread ID from thread creation response
     */
    extractThreadId(threadText) {
        const match = threadText.match(/ID:\s*([^\n]+)/);
        return match ? match[1].trim() : null;
    }

    /**
     * Perform periodic communication maintenance
     */
    async performPeriodicMaintenance() {
        try {
            // Clean up old message history
            const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
            this.messageHistory = this.messageHistory.filter(msg => msg.timestamp > cutoffTime);
            
            // Update communication metrics
            this.updateCommunicationMetrics();
            
            // Log periodic status
            if (this.messageHistory.length % 10 === 0 && this.messageHistory.length > 0) {
                this.log(`Communication metrics: ${JSON.stringify(this.communicationMetrics)}`);
            }
            
        } catch (error) {
            this.log(`Error in periodic maintenance: ${error.message}`, 'error');
        }
    }

    /**
     * Update communication metrics
     */
    updateCommunicationMetrics() {
        if (this.messageHistory.length > 0) {
            // Calculate average response time (simplified)
            const totalTime = this.messageHistory.reduce((sum, msg) => {
                return sum + (msg.timestamp - (msg.timestamp - 1000)); // Simplified calculation
            }, 0);
            
            this.communicationMetrics.averageResponseTime = totalTime / this.messageHistory.length;
        }
    }

    /**
     * Get communication statistics
     */
    getCommunicationStats() {
        return {
            ...this.communicationMetrics,
            activeThreads: this.activeThreads.size,
            messageHistorySize: this.messageHistory.length,
            uptime: Date.now() - this.startTime
        };
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
    const agent = new CommunicatorAgent();
    agent.start().catch(error => {
        console.error('Failed to start Communication Agent:', error);
        process.exit(1);
    });
}

export default CommunicatorAgent;
