/**
 * MCP Client wrapper for Coral Protocol integration
 * Handles the low-level MCP communication with Coral Protocol
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

export class CoralMCPClient {
    constructor(config = {}) {
        this.config = {
            name: config.name || 'TrustSwarm Agent',
            version: config.version || '1.0.0',
            ...config
        };
        
        this.client = null;
        this.transport = null;
        this.isConnected = false;
        this.capabilities = {
            tools: {},
            resources: {}
        };
    }

    /**
     * Connect to Coral Protocol MCP server
     */
    async connect(connectionConfig) {
        try {
            // Create MCP client
            this.client = new Client(
                {
                    name: this.config.name,
                    version: this.config.version
                },
                this.capabilities
            );

            // Create transport based on connection type
            if (connectionConfig.type === 'sse') {
                this.transport = new SSEClientTransport(connectionConfig.url);
            } else if (connectionConfig.type === 'stdio') {
                this.transport = new StdioClientTransport({
                    command: connectionConfig.command,
                    args: connectionConfig.args || []
                });
            } else {
                throw new Error(`Unsupported transport type: ${connectionConfig.type}`);
            }

            // Connect the client
            await this.client.connect(this.transport);
            this.isConnected = true;

            console.log(`Connected to Coral Protocol via ${connectionConfig.type}`);
            return true;

        } catch (error) {
            console.error('Failed to connect to Coral Protocol:', error);
            throw error;
        }
    }

    /**
     * List available tools
     */
    async listTools() {
        if (!this.isConnected) {
            throw new Error('Client not connected');
        }

        try {
            const result = await this.client.listTools();
            return result;
        } catch (error) {
            console.error('Failed to list tools:', error);
            throw error;
        }
    }

    /**
     * Call a tool
     */
    async callTool(toolCall) {
        if (!this.isConnected) {
            throw new Error('Client not connected');
        }

        try {
            const result = await this.client.callTool(toolCall);
            return result;
        } catch (error) {
            console.error('Failed to call tool:', error);
            throw error;
        }
    }

    /**
     * List available resources
     */
    async listResources() {
        if (!this.isConnected) {
            throw new Error('Client not connected');
        }

        try {
            const result = await this.client.listResources();
            return result;
        } catch (error) {
            console.error('Failed to list resources:', error);
            throw error;
        }
    }

    /**
     * Read a resource
     */
    async readResource(uri) {
        if (!this.isConnected) {
            throw new Error('Client not connected');
        }

        try {
            const result = await this.client.readResource({ uri });
            return result;
        } catch (error) {
            console.error('Failed to read resource:', error);
            throw error;
        }
    }

    /**
     * Close the connection
     */
    async close() {
        try {
            if (this.client && this.isConnected) {
                await this.client.close();
            }
            this.isConnected = false;
            console.log('Disconnected from Coral Protocol');
        } catch (error) {
            console.error('Error during disconnect:', error);
            throw error;
        }
    }

    /**
     * Check if client is connected
     */
    get connected() {
        return this.isConnected;
    }
}

export default CoralMCPClient;
