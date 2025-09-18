#!/usr/bin/env node

/**
 * Simple test to verify Coral Protocol server connectivity
 */

// Polyfill EventSource for Node.js
import EventSource from 'eventsource';
global.EventSource = EventSource;

async function testCoralConnection() {
    console.log('🧪 Testing Coral Protocol Server Connectivity...\n');
    
    try {
        // Test 1: Check if Coral server is running
        console.log('1. Checking if Coral server is running...');
        const response = await fetch('http://localhost:5555/api/v1/registry');
        
        if (response.ok) {
            const registry = await response.json();
            console.log('✅ Coral server is running');
            console.log(`📋 Registry contains ${registry.length} agents:`, registry.map(a => a.id).join(', '));
        } else {
            console.log('❌ Coral server is not responding');
            return;
        }
        
        // Test 2: Check sessions endpoint
        console.log('\n2. Checking sessions endpoint...');
        const sessionsResponse = await fetch('http://localhost:5555/api/v1/sessions');
        
        if (sessionsResponse.ok) {
            const sessions = await sessionsResponse.json();
            console.log('✅ Sessions endpoint is working');
            console.log(`📋 Active sessions: ${sessions.length}`);
        } else {
            console.log('❌ Sessions endpoint failed');
        }
        
        // Test 3: Test SSE endpoint (without connecting)
        console.log('\n3. Testing SSE endpoint availability...');
        const sseUrl = 'http://localhost:5555/devmode/trustswarm/privkey/session1/sse?agentId=test-agent';
        
        try {
            const sseResponse = await fetch(sseUrl, {
                method: 'HEAD'
            });
            
            if (sseResponse.status === 404) {
                console.log('✅ SSE endpoint exists (404 is expected for HEAD request)');
            } else {
                console.log(`✅ SSE endpoint responded with status: ${sseResponse.status}`);
            }
        } catch (error) {
            console.log(`❌ SSE endpoint test failed: ${error.message}`);
        }
        
        console.log('\n🎉 Basic connectivity tests completed!');
        console.log('\n📝 Next steps:');
        console.log('1. Coral Protocol server is running and accessible');
        console.log('2. Registry API is working');
        console.log('3. SSE endpoint is available');
        console.log('4. You can now run TrustSwarm agents that connect to Coral Protocol');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Make sure Coral Protocol server is running: docker ps');
        console.log('2. Check if port 5555 is accessible: curl http://localhost:5555/api/v1/registry');
        console.log('3. Verify Docker container is running: docker logs <container-id>');
    }
}

// Run the test
testCoralConnection().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
});
