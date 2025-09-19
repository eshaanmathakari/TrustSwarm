#!/usr/bin/env node

/**
 * Test script for Speech-to-Text and Betting Endpoints
 * This script demonstrates how to use the new endpoints
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1/speech-betting';
const TEST_AUDIO_FILE = path.join(__dirname, 'test-audio.wav');

// Create a simple test audio file (silence for testing)
function createTestAudioFile() {
  // This creates a minimal WAV file with 1 second of silence
  const wavHeader = Buffer.from([
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    0x24, 0x00, 0x00, 0x00, // File size - 8
    0x57, 0x41, 0x56, 0x45, // "WAVE"
    0x66, 0x6D, 0x74, 0x20, // "fmt "
    0x10, 0x00, 0x00, 0x00, // Format chunk size
    0x01, 0x00,             // Audio format (PCM)
    0x01, 0x00,             // Number of channels
    0x44, 0xAC, 0x00, 0x00, // Sample rate (44100)
    0x88, 0x58, 0x01, 0x00, // Byte rate
    0x02, 0x00,             // Block align
    0x10, 0x00,             // Bits per sample
    0x64, 0x61, 0x74, 0x61, // "data"
    0x00, 0x00, 0x00, 0x00  // Data size (0 for silence)
  ]);
  
  fs.writeFileSync(TEST_AUDIO_FILE, wavHeader);
  console.log(`Created test audio file: ${TEST_AUDIO_FILE}`);
}

// Test 1: Speech-to-Text endpoint
async function testSpeechToText() {
  console.log('\n=== Testing Speech-to-Text Endpoint ===');
  
  try {
    // Create test audio file if it doesn't exist
    if (!fs.existsSync(TEST_AUDIO_FILE)) {
      createTestAudioFile();
    }
    
    const formData = new FormData();
    formData.append('audio', fs.createReadStream(TEST_AUDIO_FILE));
    
    const response = await axios.post(`${BASE_URL}/speech-to-text`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000
    });
    
    console.log('✅ Speech-to-Text Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data.transcript;
    
  } catch (error) {
    console.error('❌ Speech-to-Text Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    return null;
  }
}

// Test 2: Place bet with trust analysis
async function testPlaceBetWithTrust(transcript) {
  console.log('\n=== Testing Place Bet with Trust Analysis ===');
  
  try {
    const requestData = {
      transcript: transcript || "I want to bet on the Lakers winning the championship this year",
      bet_amount: 25.00,
      user_id: "test_user_123"
    };
    
    const response = await axios.post(`${BASE_URL}/place-bet-with-trust`, requestData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('✅ Place Bet Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Place Bet Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    return null;
  }
}

// Test 3: Get active bets
async function testGetActiveBets() {
  console.log('\n=== Testing Get Active Bets ===');
  
  try {
    const response = await axios.get(`${BASE_URL}/active-bets?category=sports&limit=5`, {
      timeout: 10000
    });
    
    console.log('✅ Active Bets Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Get Active Bets Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    return null;
  }
}

// Test 4: Health check
async function testHealthCheck() {
  console.log('\n=== Testing Health Check ===');
  
  try {
    const response = await axios.get('http://localhost:3000/api/health', {
      timeout: 5000
    });
    
    console.log('✅ Health Check Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Health Check Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Speech-to-Text and Betting Endpoint Tests');
  console.log('=' .repeat(60));
  
  // Check if server is running
  const healthCheck = await testHealthCheck();
  if (!healthCheck) {
    console.log('\n❌ Server is not running. Please start the server first:');
    console.log('   npm start');
    console.log('   or');
    console.log('   node index.js');
    return;
  }
  
  // Run tests in sequence
  const transcript = await testSpeechToText();
  await testPlaceBetWithTrust(transcript);
  await testGetActiveBets();
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ All tests completed!');
  
  // Clean up test file
  if (fs.existsSync(TEST_AUDIO_FILE)) {
    fs.unlinkSync(TEST_AUDIO_FILE);
    console.log('🧹 Cleaned up test audio file');
  }
}

// Example usage documentation
function printUsageExamples() {
  console.log('\n📖 Usage Examples:');
  console.log('=' .repeat(40));
  
  console.log('\n1. Speech-to-Text:');
  console.log('curl -X POST http://localhost:3000/api/v1/speech-betting/speech-to-text \\');
  console.log('  -F "audio=@your-audio-file.wav"');
  
  console.log('\n2. Place Bet with Trust Analysis:');
  console.log('curl -X POST http://localhost:3000/api/v1/speech-betting/place-bet-with-trust \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"transcript": "I want to bet on the Lakers winning", "bet_amount": 25}\'');
  
  console.log('\n3. Get Active Bets:');
  console.log('curl http://localhost:3000/api/v1/speech-betting/active-bets?category=sports');
  
  console.log('\n4. JavaScript/Node.js:');
  console.log(`
const FormData = require('form-data');
const fs = require('fs');

// Speech-to-Text
const formData = new FormData();
formData.append('audio', fs.createReadStream('audio.wav'));

const sttResponse = await fetch('http://localhost:3000/api/v1/speech-betting/speech-to-text', {
  method: 'POST',
  body: formData
});

// Place Bet
const betResponse = await fetch('http://localhost:3000/api/v1/speech-betting/place-bet-with-trust', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transcript: "I want to bet on the Lakers winning",
    bet_amount: 25,
    user_id: "user123"
  })
});
  `);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
  
  // Print usage examples after a delay
  setTimeout(printUsageExamples, 2000);
}

module.exports = {
  testSpeechToText,
  testPlaceBetWithTrust,
  testGetActiveBets,
  testHealthCheck,
  runTests
};
