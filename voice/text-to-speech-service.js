// voice/text-to-speech-service.js - Text-to-Speech Service using ElevenLabs
const axios = require('axios');
const crypto = require('crypto');
const config = require('../config/environment');

class TextToSpeechService {
  constructor() {
    this.elevenlabsApiKey = config.ELEVENLABS_API_KEY;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    this.defaultModel = 'eleven_multilingual_v2'; // Latest multilingual model
    this.defaultVoiceSettings = {
      stability: 0.7,
      similarity_boost: 0.8,
      style: 0.5,
      use_speaker_boost: true
    };
  }

  /**
   * Convert text to speech using ElevenLabs
   * @param {string} text - Text to convert to speech
   * @param {Object} options - TTS options
   * @returns {Promise<Object>} - TTS result with audio buffer
   */
  async textToSpeech(text, options = {}) {
    try {
      if (!this.elevenlabsApiKey) {
        console.warn('ElevenLabs API key not configured, using mock TTS');
        return this.getMockTTSResult(text);
      }

      const {
        voiceId = this.getDefaultVoiceId(),
        model = this.defaultModel,
        voiceSettings = this.defaultVoiceSettings,
        outputFormat = 'mp3_44100_128'
      } = options;

      const payload = {
        text: text,
        model_id: model,
        voice_settings: voiceSettings,
        output_format: outputFormat
      };

      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        payload,
        {
          headers: {
            'xi-api-key': this.elevenlabsApiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          responseType: 'arraybuffer',
          timeout: 30000
        }
      );

      const audioBuffer = Buffer.from(response.data);
      const audioHash = crypto.createHash('sha256').update(audioBuffer).digest('hex');

      return {
        success: true,
        audio_buffer: audioBuffer,
        audio_hash: audioHash,
        voice_id: voiceId,
        model: model,
        text_length: text.length,
        audio_size: audioBuffer.length,
        duration_estimate: this.estimateDuration(text),
        is_mock: false
      };

    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      
      // Fallback to mock if API fails
      if (error.response?.status === 401) {
        console.warn('ElevenLabs API key invalid, using mock TTS');
      } else if (error.response?.status === 429) {
        console.warn('ElevenLabs API rate limit exceeded, using mock TTS');
      } else {
        console.warn('ElevenLabs API error, using mock TTS:', error.message);
      }
      
      return this.getMockTTSResult(text);
    }
  }

  /**
   * Generate betting recommendation voice response
   * @param {Object} recommendation - Betting recommendation data
   * @param {string} voiceId - Voice ID to use
   * @returns {Promise<Object>} - Voice response with audio
   */
  async generateBettingRecommendationVoice(recommendation, voiceId = null) {
    try {
      const text = this.formatBettingRecommendation(recommendation);
      
      const options = {
        voiceId: voiceId || this.getRecommendationVoiceId(),
        voiceSettings: {
          stability: 0.8, // Higher stability for professional recommendations
          similarity_boost: 0.9,
          style: 0.3, // Lower style for more neutral delivery
          use_speaker_boost: true
        }
      };

      const result = await this.textToSpeech(text, options);
      
      if (result.success) {
        return {
          ...result,
          recommendation_text: text,
          recommendation_data: recommendation
        };
      }
      
      return result;

    } catch (error) {
      console.error('Error generating betting recommendation voice:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate agent prediction voice explanation
   * @param {Object} agentPrediction - Agent prediction data
   * @param {string} voiceId - Voice ID to use
   * @returns {Promise<Object>} - Voice explanation with audio
   */
  async generateAgentPredictionVoice(agentPrediction, voiceId = null) {
    try {
      const text = this.formatAgentPrediction(agentPrediction);
      
      const options = {
        voiceId: voiceId || this.getAgentVoiceId(agentPrediction.agent_id),
        voiceSettings: {
          stability: 0.7,
          similarity_boost: 0.8,
          style: 0.4,
          use_speaker_boost: true
        }
      };

      const result = await this.textToSpeech(text, options);
      
      if (result.success) {
        return {
          ...result,
          prediction_text: text,
          agent_data: agentPrediction
        };
      }
      
      return result;

    } catch (error) {
      console.error('Error generating agent prediction voice:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format betting recommendation into natural speech
   * @param {Object} recommendation - Recommendation data
   * @returns {string} - Formatted text for speech
   */
  formatBettingRecommendation(recommendation) {
    const { recommended_outcome, confidence, average_trust_score, recommendation_strength, reasoning } = recommendation;
    
    let text = `Based on our analysis, I recommend betting on "${recommended_outcome}". `;
    
    text += `The confidence level is ${Math.round(confidence * 100)} percent. `;
    
    if (average_trust_score > 0.8) {
      text += `Our agents have a very high trust score of ${Math.round(average_trust_score * 100)} percent. `;
    } else if (average_trust_score > 0.6) {
      text += `Our agents have a good trust score of ${Math.round(average_trust_score * 100)} percent. `;
    } else {
      text += `Our agents have a moderate trust score of ${Math.round(average_trust_score * 100)} percent. `;
    }
    
    if (recommendation_strength === 'strong') {
      text += `This is a strong recommendation. `;
    } else if (recommendation_strength === 'moderate') {
      text += `This is a moderate recommendation. `;
    } else {
      text += `This is a cautious recommendation. `;
    }
    
    // Add reasoning if available
    if (reasoning) {
      text += `The reasoning is: ${reasoning}`;
    }
    
    return text;
  }

  /**
   * Format agent prediction into natural speech
   * @param {Object} agentPrediction - Agent prediction data
   * @returns {string} - Formatted text for speech
   */
  formatAgentPrediction(agentPrediction) {
    const { agent_name, prediction, confidence } = agentPrediction;
    
    let text = `This is ${agent_name}. `;
    
    if (prediction && prediction.probabilities) {
      const outcomes = Object.entries(prediction.probabilities);
      if (outcomes.length > 0) {
        const topOutcome = outcomes.reduce((a, b) => a[1] > b[1] ? a : b);
        text += `I predict "${topOutcome[0]}" with ${Math.round(topOutcome[1] * 100)} percent probability. `;
      }
    }
    
    if (prediction && prediction.rationale) {
      text += `My reasoning is: ${prediction.rationale}`;
    }
    
    text += ` My confidence in this prediction is ${Math.round(confidence * 100)} percent.`;
    
    return text;
  }

  /**
   * Get available voices from ElevenLabs
   * @returns {Promise<Object>} - Available voices
   */
  async getAvailableVoices() {
    try {
      if (!this.elevenlabsApiKey) {
        return {
          success: false,
          error: 'ElevenLabs API key not configured'
        };
      }

      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.elevenlabsApiKey
        }
      });

      return {
        success: true,
        voices: response.data.voices.map(voice => ({
          voice_id: voice.voice_id,
          name: voice.name,
          category: voice.category,
          description: voice.description,
          labels: voice.labels,
          is_cloned: voice.category === 'cloned'
        }))
      };

    } catch (error) {
      console.error('Error fetching available voices:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message
      };
    }
  }

  /**
   * Get default voice ID for general use
   * @returns {string} - Default voice ID
   */
  getDefaultVoiceId() {
    // Professional, clear voice for betting recommendations
    return '21m00Tcm4TlvDq8ikWAM'; // Rachel - clear, professional female voice
  }

  /**
   * Get voice ID for betting recommendations
   * @returns {string} - Recommendation voice ID
   */
  getRecommendationVoiceId() {
    // Authoritative voice for recommendations
    return 'VR6AewLTigWG4xSOukaG'; // Arnold - deep, authoritative male voice
  }

  /**
   * Get voice ID for specific agent
   * @param {number} agentId - Agent ID
   * @returns {string} - Agent voice ID
   */
  getAgentVoiceId(agentId) {
    const voiceIds = [
      '21m00Tcm4TlvDq8ikWAM', // Rachel - Agent 0
      'AZnzlk1XvdvUeBnXmlld', // Domi - Agent 1
      'EXAVITQu4vr4xnSDxMaL'  // Bella - Agent 2
    ];
    
    const index = agentId % voiceIds.length;
    return voiceIds[index];
  }

  /**
   * Estimate audio duration based on text length
   * @param {string} text - Text to estimate duration for
   * @returns {number} - Estimated duration in seconds
   */
  estimateDuration(text) {
    // Rough estimate: ~150 words per minute, ~5 characters per word
    const wordsPerMinute = 150;
    const charsPerWord = 5;
    const words = text.length / charsPerWord;
    const minutes = words / wordsPerMinute;
    return Math.ceil(minutes * 60); // Convert to seconds
  }

  /**
   * Get mock TTS result for development/testing
   * @param {string} text - Text that would be converted
   * @returns {Object} - Mock TTS result
   */
  getMockTTSResult(text) {
    const mockAudioBuffer = Buffer.from(`mock_audio_${text.substring(0, 50)}_${Date.now()}`);
    const audioHash = crypto.createHash('sha256').update(mockAudioBuffer).digest('hex');
    
    return {
      success: true,
      audio_buffer: mockAudioBuffer,
      audio_hash: audioHash,
      voice_id: 'mock_voice_id',
      model: 'mock_model',
      text_length: text.length,
      audio_size: mockAudioBuffer.length,
      duration_estimate: this.estimateDuration(text),
      is_mock: true
    };
  }

  /**
   * Health check for the TTS service
   * @returns {Promise<Object>} - Health status
   */
  async healthCheck() {
    try {
      if (!this.elevenlabsApiKey) {
        return {
          status: 'warning',
          message: 'ElevenLabs API key not configured - using mock TTS',
          service: 'text-to-speech',
          provider: 'mock'
        };
      }

      // Test with a short text
      const result = await this.textToSpeech('Hello, this is a test.');
      
      return {
        status: 'healthy',
        message: 'Text-to-speech service is operational',
        service: 'text-to-speech',
        provider: 'elevenlabs',
        model: this.defaultModel,
        test_result: result.success
      };

    } catch (error) {
      return {
        status: 'error',
        message: 'Text-to-speech service error',
        service: 'text-to-speech',
        provider: 'elevenlabs',
        error: error.message
      };
    }
  }
}

module.exports = new TextToSpeechService();
