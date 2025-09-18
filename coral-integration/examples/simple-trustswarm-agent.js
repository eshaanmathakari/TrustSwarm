#!/usr/bin/env node

/**
 * Simple TrustSwarm Agent Example
 * Demonstrates basic Coral Protocol integration
 */

// Polyfill EventSource for Node.js
import EventSource from 'eventsource';
global.EventSource = EventSource;

import BaseCoralAgent from '../base-coral-agent.js';

class SimpleTrustSwarmAgent extends BaseCoralAgent {
    constructor() {
        super({
            agentId: 'simple-trustswarm-agent',
            description: 'Simple TrustSwarm Agent - Basic Coral Protocol integration example'
        });
        
        this.messageCount = 0;
        this.startTime = Date.now();
    }

    /**
     * Start the simple agent
     */
    async start() {
        try {
            console.log('🚀 Starting Simple TrustSwarm Agent...\n');
            
            await this.connect();
            
            // Set up event handlers
            this.setupEventHandlers();
            
            // Start the main agent loop
            await this.runAgentLoop();
            
        } catch (error) {
            console.error('❌ Failed to start agent:', error.message);
            process.exit(1);
        }
    }

    /**
     * Set up event handlers
     */
    setupEventHandlers() {
        this.on('connected', () => {
            console.log('✅ Connected to Coral Protocol');
        });

        this.on('message', async (message) => {
            await this.handleMessage(message);
        });

        this.on('disconnected', () => {
            console.log('👋 Disconnected from Coral Protocol');
        });
    }

    /**
     * Main agent loop
     */
    async runAgentLoop() {
        console.log('🔄 Starting main agent loop...\n');
        
        while (this.isConnected) {
            try {
                // Wait for mentions from other agents
                const mentions = await this.waitForMentions(30000);
                
                if (mentions && mentions.content && mentions.content.length > 0) {
                    for (const content of mentions.content) {
                        if (content.type === 'text') {
                            await this.processMessage(content.text);
                        }
                    }
                }
                
                // Send periodic status updates
                await this.sendPeriodicStatus();
                
            } catch (error) {
                console.error('❌ Error in main loop:', error.message);
                await this.sleep(5000);
            }
        }
    }

    /**
     * Handle incoming messages
     */
    async handleMessage(message) {
        try {
            const content = message.content || message.text || '';
            console.log(`📨 Received message: ${content}`);
            
            await this.processMessage(content);
            
        } catch (error) {
            console.error('❌ Error handling message:', error.message);
        }
    }

    /**
     * Process a message
     */
    async processMessage(content) {
        try {
            this.messageCount++;
            
            // Simple message processing
            if (content.toLowerCase().includes('hello') || content.toLowerCase().includes('hi')) {
                await this.sendGreetingResponse();
            } else if (content.toLowerCase().includes('status')) {
                await this.sendStatusResponse();
            } else if (content.toLowerCase().includes('help')) {
                await this.sendHelpResponse();
            } else {
                await this.sendDefaultResponse(content);
            }
            
        } catch (error) {
            console.error('❌ Error processing message:', error.message);
        }
    }

    /**
     * Send greeting response
     */
    async sendGreetingResponse() {
        const response = `👋 Hello! I'm the Simple TrustSwarm Agent. I've received ${this.messageCount} messages so far.`;
        await this.broadcastMessage(response);
    }

    /**
     * Send status response
     */
    async sendStatusResponse() {
        const uptime = Date.now() - this.startTime;
        const response = `📊 Agent Status:
- Agent ID: ${this.agentId}
- Messages processed: ${this.messageCount}
- Uptime: ${Math.floor(uptime / 1000)} seconds
- Status: Running and healthy ✅`;
        
        await this.broadcastMessage(response);
    }

    /**
     * Send help response
     */
    async sendHelpResponse() {
        const response = `❓ Simple TrustSwarm Agent Help:
- Say "hello" or "hi" for a greeting
- Say "status" for agent status
- Say "help" for this help message
- I can process any message and respond accordingly

I'm a basic example of TrustSwarm agent integration with Coral Protocol!`;
        
        await this.broadcastMessage(response);
    }

    /**
     * Send default response
     */
    async sendDefaultResponse(originalMessage) {
        const response = `💬 I received your message: "${originalMessage}"
This is message #${this.messageCount} I've processed.
I'm a simple TrustSwarm agent demonstrating Coral Protocol integration!`;
        
        await this.broadcastMessage(response);
    }

    /**
     * Send periodic status updates
     */
    async sendPeriodicStatus() {
        const uptime = Date.now() - this.startTime;
        
        // Send status every 5 minutes
        if (uptime % (5 * 60 * 1000) < 1000) {
            const status = `🔄 Periodic Status Update:
- Agent: ${this.agentId}
- Uptime: ${Math.floor(uptime / 1000)} seconds
- Messages: ${this.messageCount}
- Status: Active and monitoring`;
            
            await this.broadcastMessage(status);
        }
    }

    /**
     * Broadcast message to all agents
     */
    async broadcastMessage(message) {
        try {
            // Get list of agents
            const agents = await this.listAgents(true);
            
            if (agents && agents.content && agents.content.length > 0) {
                const agentList = this.parseAgentList(agents.content[0].text);
                
                if (agentList.length > 0) {
                    // Create a thread
                    const threadName = `Simple Agent Message - ${Date.now()}`;
                    const thread = await this.createThread(threadName, agentList);
                    
                    if (thread && thread.content && thread.content.length > 0) {
                        const threadId = this.extractThreadId(thread.content[0].text);
                        
                        if (threadId) {
                            await this.sendMessage(threadId, message, agentList);
                            console.log(`📤 Broadcasted message to ${agentList.length} agents`);
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ Error broadcasting message:', error.message);
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
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Start the agent if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const agent = new SimpleTrustSwarmAgent();
    agent.start().catch(error => {
        console.error('❌ Failed to start Simple TrustSwarm Agent:', error);
        process.exit(1);
    });
}

export default SimpleTrustSwarmAgent;
