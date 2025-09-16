// voice/elevenlabs/client.js - ElevenLabs Voice Client for Trust Verification
const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');
const config = require('../../config/environment');

class ElevenLabsClient {
  constructor() {
    this.apiKey = config.ELEVENLABS_API_KEY;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 60000, // Voice processing can take time
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  // Generate voice for agent's prediction explanation
  async generateVoiceExplanation(agentId, text, voiceSettings = {}) {
    try {
      // Use a consistent voice ID for each agent (hash-based)
      const voiceId = this.getAgentVoiceId(agentId);
      
      const payload = {
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: voiceSettings.stability || 0.7,
          similarity_boost: voiceSettings.similarity_boost || 0.8,
          style: voiceSettings.style || 0.5,
          use_speaker_boost: voiceSettings.use_speaker_boost !== false
        }
      };

      const response = await this.axiosInstance.post(
        `/text-to-speech/${voiceId}`,
        payload,
        {
          responseType: 'arraybuffer',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json'
          }
        }
      );

      // Generate audio file hash for verification
      const audioBuffer = Buffer.from(response.data);
      const audioHash = crypto.createHash('sha256').update(audioBuffer).digest('hex');

      return {
        success: true,
        audio_buffer: audioBuffer,
        audio_hash: audioHash,
        voice_id: voiceId,
        text_length: text.length,
        audio_size: audioBuffer.length
      };
    } catch (error) {
      console.error('ElevenLabs voice generation failed:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message
      };
    }
  }

  // Clone voice from agent's initial voice sample
  async cloneAgentVoice(agentId, voiceName, audioFiles) {
    try {
      const form = new FormData();
      form.append('name', voiceName);
      
      // Add audio files
      audioFiles.forEach((file, index) => {
        form.append('files', file.buffer, {
          filename: file.filename || `sample_${index}.mp3`,
          contentType: file.mimetype || 'audio/mpeg'
        });
      });

      // Description for the voice
      form.append('description', `Voice clone for TrustSwarm agent ${agentId}`);
      
      // Labels for better organization
      form.append('labels', JSON.stringify({
        agent_id: agentId,
        created_by: 'TrustSwarm',
        use_case: 'trust_verification'
      }));

      const response = await this.axiosInstance.post('/voices/add', form, {
        headers: {
          ...form.getHeaders(),
          'xi-api-key': this.apiKey
        }
      });

      return {
        success: true,
        voice_id: response.data.voice_id,
        voice_data: response.data
      };
    } catch (error) {
      console.error('ElevenLabs voice cloning failed:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message
      };
    }
  }

  // Convert speech to text for voice verification
  async speechToText(audioBuffer) {
    try {
      // Note: ElevenLabs doesn't have STT, this would integrate with another service
      // For now, return a mock implementation
      console.warn('Speech-to-text not implemented - would integrate with Whisper or similar');
      
      return {
        success: true,
        transcript: '[Speech-to-text not implemented]',
        confidence: 0.0,
        is_mock: true
      };
    } catch (error) {
      return {
        success: false,
        error: 'Speech-to-text service not available'
      };
    }
  }

  // Verify voice authenticity by comparing with stored voice signature
  async verifyVoiceAuthenticity(agentId, audioBuffer, expectedText) {
    try {
      // Generate audio hash
      const audioHash = crypto.createHash('sha256').update(audioBuffer).digest('hex');
      
      // Get stored voice signature for this agent (from database)
      const db = require('../../core/database/connection');
      const agent = await db.getAgentById(agentId);
      
      if (!agent || !agent.voice_signature_hash) {
        return {
          success: false,
          error: 'No voice signature found for agent'
        };
      }

      // Basic verification - in production, this would use more sophisticated voice matching
      const verification_score = await this.calculateVoiceMatchScore(
        audioBuffer,
        agent.voice_signature_hash,
        expectedText
      );

      return {
        success: true,
        verification_score,
        audio_hash: audioHash,
        is_authentic: verification_score > 0.7,
        confidence: verification_score
      };
    } catch (error) {
      console.error('Voice verification failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Calculate voice matching score (mock implementation)
  async calculateVoiceMatchScore(audioBuffer, storedVoiceHash, expectedText) {
    try {
      // This is a simplified mock - real implementation would use voice biometrics
      const audioHash = crypto.createHash('sha256').update(audioBuffer).digest('hex');
      
      // Basic checks
      let score = 0.5; // Base score
      
      // Check if audio is not empty
      if (audioBuffer.length > 1000) {
        score += 0.2;
      }
      
      // Check text length correlation (longer explanations typically indicate more effort)
      if (expectedText && expectedText.length > 100) {
        score += 0.1;
      }
      
      // Add some randomization to simulate real voice matching
      const randomFactor = (Math.random() - 0.5) * 0.4; // ±0.2
      score += randomFactor;
      
      // Ensure score is between 0 and 1
      return Math.max(0, Math.min(1, score));
    } catch (error) {
      console.error('Voice match calculation failed:', error);
      return 0.1; // Very low score on error
    }
  }

  // Generate consistent voice ID for each agent based on agent ID
  getAgentVoiceId(agentId) {
    // Available ElevenLabs voice IDs (these are examples)
    const voiceIds = [
      '21m00Tcm4TlvDq8ikWAM', // Rachel
      'AZnzlk1XvdvUeBnXmlld', // Domi
      'EXAVITQu4vr4xnSDxMaL', // Bella
      'ErXwobaYiN019PkySvjV', // Antoni
      'MF3mGyEYCl7XYWbV9V6O', // Elli
      'TxGEqnHWrfWFTfGW9XjX', // Josh
      'VR6AewLTigWG4xSOukaG', // Arnold
      'pNInz6obpgDQGcFmaJgB', // Adam
      'yoZ06aMxZJJ28mfd3POQ', // Sam
      'pqHfZKP75CvOlQylNhV4'  // Bill
    ];
    
    // Create deterministic voice selection based on agent ID
    const hash = crypto.createHash('md5').update(agentId).digest('hex');
    const index = parseInt(hash.substr(0, 8), 16) % voiceIds.length;
    
    return voiceIds[index];
  }

  // Create voice challenge for agent trust verification
  async createVoiceChallenge(challengeType, challengeText) {
    try {
      const challengeData = {
        id: crypto.randomBytes(16).toString('hex'),
        type: challengeType,
        text: challengeText,
        expected_duration: Math.ceil(challengeText.length * 0.1), // Rough estimate in seconds
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
      };

      return {
        success: true,
        challenge: challengeData
      };
    } catch (error) {
      console.error('Voice challenge creation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get available voices from ElevenLabs
  async getAvailableVoices() {
    try {
      const response = await this.axiosInstance.get('/voices');
      
      return {
        success: true,
        voices: response.data.voices.map(voice => ({
          voice_id: voice.voice_id,
          name: voice.name,
          category: voice.category,
          description: voice.description,
          is_cloned: voice.category === 'cloned'
        }))
      };
    } catch (error) {
      console.error('Failed to fetch available voices:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message
      };
    }
  }

  // Health check for ElevenLabs API
  async healthCheck() {
    try {
      // Try to get user info as a health check
      const response = await this.axiosInstance.get('/user');
      
      return {
        status: 'healthy',
        user_info: {
          character_count: response.data.subscription?.character_count || 0,
          character_limit: response.data.subscription?.character_limit || 0
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.response?.data?.detail || error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Mock responses for development when API key is not available
  getMockVoiceGeneration(text) {
    const mockAudioBuffer = Buffer.from('mock_audio_data_' + text.substring(0, 50));
    const audioHash = crypto.createHash('sha256').update(mockAudioBuffer).digest('hex');
    
    return {
      success: true,
      audio_buffer: mockAudioBuffer,
      audio_hash: audioHash,
      voice_id: 'mock_voice_id',
      text_length: text.length,
      audio_size: mockAudioBuffer.length,
      is_mock: true
    };
  }
}

module.exports = new ElevenLabsClient();