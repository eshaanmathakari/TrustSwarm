#!/usr/bin/env node

/**
 * Test script for TrustSwarm Coral Integration
 * Tests the basic functionality of the Coral Protocol integration
 */

// Polyfill EventSource for Node.js
import EventSource from 'eventsource';
global.EventSource = EventSource;

import BaseCoralAgent from './base-coral-agent.js';

class TestCoralAgent extends BaseCoralAgent {
    constructor() {
        super({
            agentId: 'test-trustswarm-agent',
            description: 'Test TrustSwarm Agent for Coral Protocol integration testing'
        });
        
        this.testResults = [];
        this.startTime = Date.now();
    }

    /**
     * Run all tests
     */
    async runTests() {
        try {
            console.log('🧪 Starting TrustSwarm Coral Integration Tests...\n');
            
            // Test 1: Connection
            await this.testConnection();
            
            // Test 2: List Agents
            await this.testListAgents();
            
            // Test 3: Create Thread
            await this.testCreateThread();
            
            // Test 4: Send Message
            await this.testSendMessage();
            
            // Test 5: Wait for Mentions
            await this.testWaitForMentions();
            
            // Test 6: Agent Status
            await this.testAgentStatus();
            
            // Print results
            this.printTestResults();
            
            // Cleanup
            await this.cleanup();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Test connection to Coral Protocol
     */
    async testConnection() {
        try {
            console.log('🔌 Testing connection to Coral Protocol...');
            
            await this.connect();
            
            if (this.isConnected) {
                this.addTestResult('Connection', 'PASS', 'Successfully connected to Coral Protocol');
                console.log('✅ Connection test passed');
            } else {
                this.addTestResult('Connection', 'FAIL', 'Failed to connect to Coral Protocol');
                console.log('❌ Connection test failed');
            }
            
        } catch (error) {
            this.addTestResult('Connection', 'FAIL', `Connection error: ${error.message}`);
            console.log(`❌ Connection test failed: ${error.message}`);
        }
    }

    /**
     * Test listing agents
     */
    async testListAgents() {
        try {
            console.log('👥 Testing agent listing...');
            
            const result = await this.listAgents(true);
            
            if (result && result.content && result.content.length > 0) {
                this.addTestResult('List Agents', 'PASS', `Found agents: ${result.content[0].text}`);
                console.log('✅ List agents test passed');
            } else {
                this.addTestResult('List Agents', 'FAIL', 'No agents found or invalid response');
                console.log('❌ List agents test failed');
            }
            
        } catch (error) {
            this.addTestResult('List Agents', 'FAIL', `List agents error: ${error.message}`);
            console.log(`❌ List agents test failed: ${error.message}`);
        }
    }

    /**
     * Test creating a thread
     */
    async testCreateThread() {
        try {
            console.log('🧵 Testing thread creation...');
            
            const threadName = `Test Thread - ${Date.now()}`;
            const participants = [this.agentId]; // Self-participant for testing
            
            const result = await this.createThread(threadName, participants);
            
            if (result && result.content && result.content.length > 0) {
                this.addTestResult('Create Thread', 'PASS', `Created thread: ${result.content[0].text}`);
                console.log('✅ Create thread test passed');
                return this.extractThreadId(result.content[0].text);
            } else {
                this.addTestResult('Create Thread', 'FAIL', 'Failed to create thread');
                console.log('❌ Create thread test failed');
                return null;
            }
            
        } catch (error) {
            this.addTestResult('Create Thread', 'FAIL', `Create thread error: ${error.message}`);
            console.log(`❌ Create thread test failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Test sending a message
     */
    async testSendMessage() {
        try {
            console.log('💬 Testing message sending...');
            
            // First create a thread
            const threadId = await this.testCreateThread();
            
            if (threadId) {
                const message = `Test message from ${this.agentId} at ${new Date().toISOString()}`;
                const mentions = [this.agentId];
                
                const result = await this.sendMessage(threadId, message, mentions);
                
                if (result && result.content && result.content.length > 0) {
                    this.addTestResult('Send Message', 'PASS', `Sent message: ${result.content[0].text}`);
                    console.log('✅ Send message test passed');
                } else {
                    this.addTestResult('Send Message', 'FAIL', 'Failed to send message');
                    console.log('❌ Send message test failed');
                }
            } else {
                this.addTestResult('Send Message', 'SKIP', 'Skipped due to thread creation failure');
                console.log('⏭️ Send message test skipped');
            }
            
        } catch (error) {
            this.addTestResult('Send Message', 'FAIL', `Send message error: ${error.message}`);
            console.log(`❌ Send message test failed: ${error.message}`);
        }
    }

    /**
     * Test waiting for mentions
     */
    async testWaitForMentions() {
        try {
            console.log('👂 Testing wait for mentions...');
            
            // Wait for mentions with a short timeout
            const result = await this.waitForMentions(5000); // 5 second timeout
            
            if (result) {
                this.addTestResult('Wait for Mentions', 'PASS', `Received mentions: ${JSON.stringify(result)}`);
                console.log('✅ Wait for mentions test passed');
            } else {
                this.addTestResult('Wait for Mentions', 'PASS', 'No mentions received (expected for test)');
                console.log('✅ Wait for mentions test passed (no mentions expected)');
            }
            
        } catch (error) {
            this.addTestResult('Wait for Mentions', 'FAIL', `Wait for mentions error: ${error.message}`);
            console.log(`❌ Wait for mentions test failed: ${error.message}`);
        }
    }

    /**
     * Test agent status
     */
    async testAgentStatus() {
        try {
            console.log('📊 Testing agent status...');
            
            const status = this.getStatus();
            
            if (status && status.agentId && status.isConnected) {
                this.addTestResult('Agent Status', 'PASS', `Status: ${JSON.stringify(status)}`);
                console.log('✅ Agent status test passed');
            } else {
                this.addTestResult('Agent Status', 'FAIL', 'Invalid agent status');
                console.log('❌ Agent status test failed');
            }
            
        } catch (error) {
            this.addTestResult('Agent Status', 'FAIL', `Agent status error: ${error.message}`);
            console.log(`❌ Agent status test failed: ${error.message}`);
        }
    }

    /**
     * Add test result
     */
    addTestResult(testName, status, message) {
        this.testResults.push({
            test: testName,
            status,
            message,
            timestamp: Date.now()
        });
    }

    /**
     * Print test results
     */
    printTestResults() {
        console.log('\n📋 Test Results Summary:');
        console.log('=' .repeat(50));
        
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const skipped = this.testResults.filter(r => r.status === 'SKIP').length;
        
        console.log(`Total Tests: ${this.testResults.length}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`⏭️ Skipped: ${skipped}`);
        console.log(`⏱️ Duration: ${Date.now() - this.startTime}ms`);
        
        console.log('\n📝 Detailed Results:');
        this.testResults.forEach(result => {
            const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
            console.log(`${statusIcon} ${result.test}: ${result.message}`);
        });
        
        if (failed > 0) {
            console.log('\n❌ Some tests failed. Check the logs above for details.');
            process.exit(1);
        } else {
            console.log('\n🎉 All tests passed! TrustSwarm Coral integration is working correctly.');
        }
    }

    /**
     * Extract thread ID from thread creation response
     */
    extractThreadId(threadText) {
        const match = threadText.match(/ID:\s*([^\n]+)/);
        return match ? match[1].trim() : null;
    }

    /**
     * Cleanup after tests
     */
    async cleanup() {
        try {
            if (this.isConnected) {
                await this.disconnect();
                console.log('🧹 Cleanup completed');
            }
        } catch (error) {
            console.error('⚠️ Cleanup error:', error.message);
        }
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const testAgent = new TestCoralAgent();
    testAgent.runTests().catch(error => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    });
}

export default TestCoralAgent;
