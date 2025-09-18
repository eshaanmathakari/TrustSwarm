#!/usr/bin/env node

/**
 * TrustSwarm Coordinator Agent
 * Coordinates tasks and manages workflow between TrustSwarm agents
 */

import BaseCoralAgent from '../base-coral-agent.js';

class CoordinatorAgent extends BaseCoralAgent {
    constructor() {
        super({
            agentId: 'trustswarm-coordinator',
            description: 'TrustSwarm Coordinator Agent - Manages task coordination and workflow'
        });
        
        // Coordination configuration
        this.coordinationModel = process.env.COORDINATION_MODEL || 'gpt-4';
        this.maxConcurrentTasks = parseInt(process.env.MAX_CONCURRENT_TASKS) || 5;
        this.taskTimeout = parseInt(process.env.TASK_TIMEOUT) || 300; // 5 minutes
        
        // Coordination state
        this.activeTasks = new Map();
        this.taskQueue = [];
        this.agentCapabilities = new Map();
        this.workflowHistory = [];
        this.coordinationMetrics = {
            tasksCompleted: 0,
            tasksFailed: 0,
            averageTaskTime: 0,
            agentUtilization: new Map()
        };
        
        this.log(`Coordinator initialized with model: ${this.coordinationModel}, max concurrent: ${this.maxConcurrentTasks}, timeout: ${this.taskTimeout}s`);
    }

    /**
     * Start the coordinator agent
     */
    async start() {
        try {
            await this.connect();
            
            // Set up event handlers
            this.setupEventHandlers();
            
            // Initialize agent capabilities
            await this.initializeAgentCapabilities();
            
            // Start the main agent loop
            await this.runAgentLoop();
            
        } catch (error) {
            this.log(`Failed to start coordinator: ${error.message}`, 'error');
            process.exit(1);
        }
    }

    /**
     * Set up event handlers for the agent
     */
    setupEventHandlers() {
        this.on('connected', () => {
            this.log('Coordinator connected to Coral Protocol');
        });

        this.on('message', async (message) => {
            await this.handleCoordinationRequest(message);
        });

        this.on('disconnected', () => {
            this.log('Coordinator disconnected from Coral Protocol');
        });
    }

    /**
     * Initialize agent capabilities
     */
    async initializeAgentCapabilities() {
        try {
            const agents = await this.listAgents(true);
            
            if (agents && agents.content && agents.content.length > 0) {
                const agentList = this.parseAgentList(agents.content[0].text);
                
                for (const agentId of agentList) {
                    this.agentCapabilities.set(agentId, {
                        id: agentId,
                        capabilities: this.inferCapabilities(agentId),
                        status: 'available',
                        currentTasks: 0,
                        totalTasks: 0
                    });
                }
                
                this.log(`Initialized capabilities for ${agentList.length} agents`);
            }
            
        } catch (error) {
            this.log(`Error initializing agent capabilities: ${error.message}`, 'error');
        }
    }

    /**
     * Infer agent capabilities based on agent ID
     */
    inferCapabilities(agentId) {
        const capabilities = [];
        
        if (agentId.includes('trust')) {
            capabilities.push('trust_analysis', 'reputation_scoring');
        }
        if (agentId.includes('communicat')) {
            capabilities.push('messaging', 'broadcasting', 'notification');
        }
        if (agentId.includes('predict')) {
            capabilities.push('prediction', 'forecasting', 'trend_analysis');
        }
        if (agentId.includes('voice')) {
            capabilities.push('voice_synthesis', 'audio_processing');
        }
        if (agentId.includes('coordinator')) {
            capabilities.push('task_coordination', 'workflow_management');
        }
        
        return capabilities.length > 0 ? capabilities : ['general'];
    }

    /**
     * Main agent loop
     */
    async runAgentLoop() {
        this.log('Starting Coordinator main loop');
        
        while (this.isConnected) {
            try {
                // Wait for mentions from other agents
                const mentions = await this.waitForMentions(30000);
                
                if (mentions && mentions.content && mentions.content.length > 0) {
                    for (const content of mentions.content) {
                        if (content.type === 'text') {
                            await this.processCoordinationRequest(content.text);
                        }
                    }
                }
                
                // Process task queue
                await this.processTaskQueue();
                
                // Perform periodic coordination maintenance
                await this.performPeriodicMaintenance();
                
            } catch (error) {
                this.log(`Error in main loop: ${error.message}`, 'error');
                await this.sleep(5000); // Wait 5 seconds before retrying
            }
        }
    }

    /**
     * Handle coordination requests from other agents
     */
    async handleCoordinationRequest(message) {
        try {
            const content = message.content || message.text || '';
            
            if (this.isCoordinationRequest(content)) {
                await this.processCoordinationRequest(content);
            }
            
        } catch (error) {
            this.log(`Error handling coordination request: ${error.message}`, 'error');
        }
    }

    /**
     * Check if the message is a coordination request
     */
    isCoordinationRequest(content) {
        const coordinationKeywords = [
            'coordinate',
            'assign task',
            'delegate',
            'workflow',
            'orchestrate',
            'manage task',
            'schedule',
            'plan'
        ];
        
        const lowerContent = content.toLowerCase();
        return coordinationKeywords.some(keyword => lowerContent.includes(keyword));
    }

    /**
     * Process a coordination request
     */
    async processCoordinationRequest(content) {
        try {
            this.log(`Processing coordination request: ${content}`);
            
            // Parse the coordination request
            const request = this.parseCoordinationRequest(content);
            
            if (request) {
                await this.executeCoordinationRequest(request);
            }
            
        } catch (error) {
            this.log(`Error processing coordination request: ${error.message}`, 'error');
        }
    }

    /**
     * Parse coordination request from content
     */
    parseCoordinationRequest(content) {
        try {
            const lowerContent = content.toLowerCase();
            
            // Extract task description
            let taskDescription = '';
            const taskMatch = content.match(/task[:\s]+(.+)/i);
            if (taskMatch) {
                taskDescription = taskMatch[1].trim();
            } else {
                // Try to extract the main content
                const lines = content.split('\n');
                taskDescription = lines.find(line => 
                    line.trim().length > 10 && 
                    !line.toLowerCase().includes('coordinate') &&
                    !line.toLowerCase().includes('assign')
                ) || content;
            }
            
            // Extract required capabilities
            const requiredCapabilities = this.extractRequiredCapabilities(content);
            
            // Extract priority
            const priority = this.extractPriority(content);
            
            // Extract deadline
            const deadline = this.extractDeadline(content);
            
            return {
                id: `task_${Date.now()}`,
                description: taskDescription,
                requiredCapabilities,
                priority,
                deadline,
                status: 'pending',
                createdAt: Date.now(),
                assignedAgent: null
            };
            
        } catch (error) {
            this.log(`Error parsing coordination request: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * Extract required capabilities from content
     */
    extractRequiredCapabilities(content) {
        const capabilities = [];
        const lowerContent = content.toLowerCase();
        
        const capabilityMap = {
            'trust': 'trust_analysis',
            'communication': 'messaging',
            'prediction': 'prediction',
            'voice': 'voice_synthesis',
            'analysis': 'analysis',
            'broadcast': 'broadcasting',
            'notify': 'notification'
        };
        
        Object.entries(capabilityMap).forEach(([keyword, capability]) => {
            if (lowerContent.includes(keyword)) {
                capabilities.push(capability);
            }
        });
        
        return capabilities.length > 0 ? capabilities : ['general'];
    }

    /**
     * Extract priority from content
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
     * Extract deadline from content
     */
    extractDeadline(content) {
        const deadlineMatch = content.match(/deadline[:\s]+(.+)/i);
        if (deadlineMatch) {
            return deadlineMatch[1].trim();
        }
        return null;
    }

    /**
     * Execute coordination request
     */
    async executeCoordinationRequest(request) {
        try {
            this.log(`Executing coordination request: ${JSON.stringify(request)}`);
            
            // Add task to queue
            this.taskQueue.push(request);
            
            // Sort queue by priority
            this.taskQueue.sort((a, b) => {
                const priorityOrder = { 'high': 3, 'normal': 2, 'low': 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            });
            
            this.log(`Added task to queue. Queue size: ${this.taskQueue.length}`);
            
        } catch (error) {
            this.log(`Error executing coordination request: ${error.message}`, 'error');
        }
    }

    /**
     * Process task queue
     */
    async processTaskQueue() {
        try {
            // Check if we can assign more tasks
            const availableSlots = this.maxConcurrentTasks - this.activeTasks.size;
            
            if (availableSlots > 0 && this.taskQueue.length > 0) {
                const tasksToAssign = this.taskQueue.splice(0, availableSlots);
                
                for (const task of tasksToAssign) {
                    await this.assignTask(task);
                }
            }
            
            // Check for completed or failed tasks
            await this.checkTaskStatus();
            
        } catch (error) {
            this.log(`Error processing task queue: ${error.message}`, 'error');
        }
    }

    /**
     * Assign task to appropriate agent
     */
    async assignTask(task) {
        try {
            // Find best agent for the task
            const bestAgent = this.findBestAgent(task);
            
            if (bestAgent) {
                // Assign task to agent
                task.assignedAgent = bestAgent.id;
                task.status = 'assigned';
                task.assignedAt = Date.now();
                
                this.activeTasks.set(task.id, task);
                
                // Update agent status
                const agent = this.agentCapabilities.get(bestAgent.id);
                if (agent) {
                    agent.status = 'busy';
                    agent.currentTasks++;
                    agent.totalTasks++;
                }
                
                // Send task assignment message
                await this.sendTaskAssignment(task, bestAgent);
                
                this.log(`Assigned task ${task.id} to agent ${bestAgent.id}`);
                
            } else {
                this.log(`No suitable agent found for task ${task.id}`, 'warn');
                task.status = 'failed';
                this.coordinationMetrics.tasksFailed++;
            }
            
        } catch (error) {
            this.log(`Error assigning task: ${error.message}`, 'error');
        }
    }

    /**
     * Find best agent for a task
     */
    findBestAgent(task) {
        let bestAgent = null;
        let bestScore = -1;
        
        for (const [agentId, agent] of this.agentCapabilities) {
            if (agent.status === 'available' || agent.currentTasks < 2) {
                const score = this.calculateAgentScore(agent, task);
                if (score > bestScore) {
                    bestScore = score;
                    bestAgent = agent;
                }
            }
        }
        
        return bestAgent;
    }

    /**
     * Calculate agent score for a task
     */
    calculateAgentScore(agent, task) {
        let score = 0;
        
        // Capability match score
        const capabilityMatches = task.requiredCapabilities.filter(cap => 
            agent.capabilities.includes(cap)
        ).length;
        score += capabilityMatches * 10;
        
        // Availability score
        if (agent.status === 'available') {
            score += 5;
        }
        
        // Workload score (prefer less busy agents)
        score += Math.max(0, 5 - agent.currentTasks);
        
        // Experience score
        score += Math.min(agent.totalTasks / 10, 5);
        
        return score;
    }

    /**
     * Send task assignment to agent
     */
    async sendTaskAssignment(task, agent) {
        try {
            const message = this.formatTaskAssignment(task);
            
            // Create a thread with the assigned agent
            const threadName = `Task Assignment - ${task.id}`;
            const thread = await this.createThread(threadName, [agent.id]);
            
            if (thread && thread.content && thread.content.length > 0) {
                const threadId = this.extractThreadId(thread.content[0].text);
                
                if (threadId) {
                    await this.sendMessage(threadId, message, [agent.id]);
                    this.log(`Sent task assignment to ${agent.id}`);
                }
            }
            
        } catch (error) {
            this.log(`Error sending task assignment: ${error.message}`, 'error');
        }
    }

    /**
     * Format task assignment message
     */
    formatTaskAssignment(task) {
        let message = `🎯 TASK ASSIGNMENT\n\n`;
        message += `Task ID: ${task.id}\n`;
        message += `Description: ${task.description}\n`;
        message += `Priority: ${task.priority}\n`;
        message += `Required Capabilities: ${task.requiredCapabilities.join(', ')}\n`;
        
        if (task.deadline) {
            message += `Deadline: ${task.deadline}\n`;
        }
        
        message += `\nPlease confirm receipt and provide status updates.`;
        
        return message;
    }

    /**
     * Check task status
     */
    async checkTaskStatus() {
        try {
            const currentTime = Date.now();
            
            for (const [taskId, task] of this.activeTasks) {
                // Check for timeout
                if (currentTime - task.assignedAt > this.taskTimeout * 1000) {
                    this.log(`Task ${taskId} timed out`, 'warn');
                    await this.handleTaskTimeout(task);
                }
            }
            
        } catch (error) {
            this.log(`Error checking task status: ${error.message}`, 'error');
        }
    }

    /**
     * Handle task timeout
     */
    async handleTaskTimeout(task) {
        try {
            task.status = 'timeout';
            this.activeTasks.delete(task.id);
            this.coordinationMetrics.tasksFailed++;
            
            // Update agent status
            const agent = this.agentCapabilities.get(task.assignedAgent);
            if (agent) {
                agent.currentTasks = Math.max(0, agent.currentTasks - 1);
                if (agent.currentTasks === 0) {
                    agent.status = 'available';
                }
            }
            
            // Send timeout notification
            await this.sendTaskTimeoutNotification(task);
            
        } catch (error) {
            this.log(`Error handling task timeout: ${error.message}`, 'error');
        }
    }

    /**
     * Send task timeout notification
     */
    async sendTaskTimeoutNotification(task) {
        try {
            const message = `⏰ TASK TIMEOUT\n\nTask ${task.id} has timed out. Please provide status update or request extension.`;
            
            // Create a thread with the assigned agent
            const threadName = `Task Timeout - ${task.id}`;
            const thread = await this.createThread(threadName, [task.assignedAgent]);
            
            if (thread && thread.content && thread.content.length > 0) {
                const threadId = this.extractThreadId(thread.content[0].text);
                
                if (threadId) {
                    await this.sendMessage(threadId, message, [task.assignedAgent]);
                }
            }
            
        } catch (error) {
            this.log(`Error sending timeout notification: ${error.message}`, 'error');
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
     * Perform periodic coordination maintenance
     */
    async performPeriodicMaintenance() {
        try {
            // Update coordination metrics
            this.updateCoordinationMetrics();
            
            // Log periodic status
            if (this.activeTasks.size > 0 || this.taskQueue.length > 0) {
                this.log(`Coordination status: ${this.activeTasks.size} active tasks, ${this.taskQueue.length} queued tasks`);
            }
            
        } catch (error) {
            this.log(`Error in periodic maintenance: ${error.message}`, 'error');
        }
    }

    /**
     * Update coordination metrics
     */
    updateCoordinationMetrics() {
        // Calculate average task time
        if (this.workflowHistory.length > 0) {
            const totalTime = this.workflowHistory.reduce((sum, task) => {
                return sum + (task.completedAt - task.assignedAt);
            }, 0);
            
            this.coordinationMetrics.averageTaskTime = totalTime / this.workflowHistory.length;
        }
        
        // Update agent utilization
        for (const [agentId, agent] of this.agentCapabilities) {
            this.coordinationMetrics.agentUtilization.set(agentId, {
                utilization: agent.currentTasks / 2, // Assuming max 2 tasks per agent
                totalTasks: agent.totalTasks,
                status: agent.status
            });
        }
    }

    /**
     * Get coordination statistics
     */
    getCoordinationStats() {
        return {
            ...this.coordinationMetrics,
            activeTasks: this.activeTasks.size,
            queuedTasks: this.taskQueue.length,
            agentCapabilities: Object.fromEntries(this.agentCapabilities),
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
    const agent = new CoordinatorAgent();
    agent.start().catch(error => {
        console.error('Failed to start Coordinator Agent:', error);
        process.exit(1);
    });
}

export default CoordinatorAgent;
