/**
 * Base Coral Agent for TrustSwarm
 * Provides the foundation for TrustSwarm agents to integrate with Coral Protocol
 */

import { EventEmitter } from 'events';

class BaseCoralAgent extends EventEmitter {
    constructor(config = {}) {
        super();
        
        // Agent configuration
        this.agentId = config.agentId || process.env.CORAL_AGENT_ID || 'trustswarm-agent';
        this.description = config.description || 'TrustSwarm Agent';
        this.coralConnectionUrl = config.coralConnectionUrl || process.env.CORAL_CONNECTION_URL;
        this.sessionId = config.sessionId || process.env.CORAL_SESSION_ID;
        this.orchestrationRuntime = config.orchestrationRuntime || process.env.CORAL_ORCHESTRATION_RUNTIME;
        
        // Agent state
        this.isConnected = false;
        this.isListening = false;
        this.mcpClient = null;
        this.tools = new Map();
        
        // Default devmode URL for local testing
        if (!this.coralConnectionUrl) {
            this.coralConnectionUrl = `http://localhost:5555/devmode/trustswarm/privkey/session1/sse?agentId=${this.agentId}`;
        }
        
        this.log(`Initialized TrustSwarm Coral Agent: ${this.agentId}`);
    }

    /**
     * Connect to Coral Protocol MCP server
     */
    async connect() {
        try {
            this.log(`Connecting to Coral Protocol at: ${this.coralConnectionUrl}`);
            
            // Import MCP client and transport dynamically
            const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
            const { SSEClientTransport } = await import('@modelcontextprotocol/sdk/client/sse.js');
            
            // Create MCP client configuration
            const clientConfig = {
                name: 'TrustSwarm Agent',
                version: '1.0.0'
            };
            
            // Initialize MCP client
            this.mcpClient = new Client(clientConfig, {
                capabilities: {
                    tools: {},
                    resources: {}
                }
            });
            
            // Create SSE transport
            const transport = new SSEClientTransport(this.coralConnectionUrl);
            
            // Connect to Coral server
            await this.mcpClient.connect(transport);
            
            this.isConnected = true;
            this.log('Successfully connected to Coral Protocol');
            
            // Initialize tools
            await this.initializeTools();
            
            // Start listening for messages
            await this.startListening();
            
            this.emit('connected');
            
        } catch (error) {
            this.log(`Failed to connect to Coral Protocol: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Initialize Coral Protocol tools
     */
    async initializeTools() {
        try {
            // List available tools from Coral
            const tools = await this.mcpClient.listTools();
            
            this.log(`Available Coral tools: ${tools.tools.map(t => t.name).join(', ')}`);
            
            // Store tools for later use
            tools.tools.forEach(tool => {
                this.tools.set(tool.name, tool);
            });
            
            this.emit('toolsInitialized', tools.tools);
            
        } catch (error) {
            this.log(`Failed to initialize tools: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Start listening for messages from other agents
     */
    async startListening() {
        if (!this.isConnected) {
            throw new Error('Agent must be connected before listening');
        }
        
        this.isListening = true;
        this.log('Started listening for messages from other agents');
        
        // Set up message handling
        this.mcpClient.on('message', (message) => {
            this.handleMessage(message);
        });
        
        this.emit('listening');
    }

    /**
     * Handle incoming messages from other agents
     */
    async handleMessage(message) {
        this.log(`Received message: ${JSON.stringify(message)}`);
        this.emit('message', message);
    }

    /**
     * List all registered agents in the session
     */
    async listAgents(includeDetails = true) {
        try {
            const result = await this.mcpClient.callTool({
                name: 'list_agents',
                arguments: {
                    includeDetails
                }
            });
            
            this.log(`Listed agents: ${JSON.stringify(result)}`);
            return result;
            
        } catch (error) {
            this.log(`Failed to list agents: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Create a new thread with specified participants
     */
    async createThread(threadName, participantIds) {
        try {
            const result = await this.mcpClient.callTool({
                name: 'create_thread',
                arguments: {
                    threadName,
                    participantIds
                }
            });
            
            this.log(`Created thread: ${threadName} with participants: ${participantIds.join(', ')}`);
            return result;
            
        } catch (error) {
            this.log(`Failed to create thread: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Send a message to a thread
     */
    async sendMessage(threadId, content, mentions = []) {
        try {
            const result = await this.mcpClient.callTool({
                name: 'send_message',
                arguments: {
                    threadId,
                    content,
                    mentions
                }
            });
            
            this.log(`Sent message to thread ${threadId}: ${content}`);
            return result;
            
        } catch (error) {
            this.log(`Failed to send message: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Wait for mentions from other agents
     */
    async waitForMentions(timeoutMs = 30000) {
        try {
            const result = await this.mcpClient.callTool({
                name: 'wait_for_mentions',
                arguments: {
                    timeoutMs
                }
            });
            
            this.log(`Received mentions: ${JSON.stringify(result)}`);
            return result;
            
        } catch (error) {
            this.log(`Failed to wait for mentions: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Add a participant to a thread
     */
    async addParticipant(threadId, participantId) {
        try {
            const result = await this.mcpClient.callTool({
                name: 'add_participant',
                arguments: {
                    threadId,
                    participantId
                }
            });
            
            this.log(`Added participant ${participantId} to thread ${threadId}`);
            return result;
            
        } catch (error) {
            this.log(`Failed to add participant: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Remove a participant from a thread
     */
    async removeParticipant(threadId, participantId) {
        try {
            const result = await this.mcpClient.callTool({
                name: 'remove_participant',
                arguments: {
                    threadId,
                    participantId
                }
            });
            
            this.log(`Removed participant ${participantId} from thread ${threadId}`);
            return result;
            
        } catch (error) {
            this.log(`Failed to remove participant: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Close a thread with a summary
     */
    async closeThread(threadId, summary) {
        try {
            const result = await this.mcpClient.callTool({
                name: 'close_thread',
                arguments: {
                    threadId,
                    summary
                }
            });
            
            this.log(`Closed thread ${threadId} with summary: ${summary}`);
            return result;
            
        } catch (error) {
            this.log(`Failed to close thread: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Disconnect from Coral Protocol
     */
    async disconnect() {
        try {
            if (this.mcpClient) {
                await this.mcpClient.close();
                this.mcpClient = null;
            }
            
            this.isConnected = false;
            this.isListening = false;
            
            this.log('Disconnected from Coral Protocol');
            this.emit('disconnected');
            
        } catch (error) {
            this.log(`Error during disconnect: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Logging utility
     */
    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${this.agentId}]`;
        
        switch (level) {
            case 'error':
                console.error(`${prefix} ERROR: ${message}`);
                break;
            case 'warn':
                console.warn(`${prefix} WARN: ${message}`);
                break;
            default:
                console.log(`${prefix} INFO: ${message}`);
        }
    }

    /**
     * Get agent status
     */
    getStatus() {
        return {
            agentId: this.agentId,
            description: this.description,
            isConnected: this.isConnected,
            isListening: this.isListening,
            sessionId: this.sessionId,
            orchestrationRuntime: this.orchestrationRuntime,
            toolsCount: this.tools.size
        };
    }
}

export default BaseCoralAgent;
