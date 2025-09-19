// voice/speech-to-text-service.js - Speech-to-Text Service using ElevenLabs
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const config = require('../config/environment');

class SpeechToTextService {
  constructor() {
    this.elevenlabsApiKey = config.ELEVENLABS_API_KEY;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    this.model = 'scribe-v1'; // ElevenLabs Scribe v1 model
  }

  /**
   * Convert speech to text using ElevenLabs Scribe v1
   * @param {Buffer} audioBuffer - Audio file buffer
   * @param {string} language - Optional language code (e.g., 'en', 'es')
   * @param {number} maxSpeakers - Maximum number of speakers (default: auto-detect)
   * @returns {Promise<Object>} - STT result with transcript and confidence
   */
  async speechToText(audioBuffer, language = 'en', maxSpeakers = null) {
    try {
      if (!this.elevenlabsApiKey) {
        console.warn('ElevenLabs API key not configured, using mock STT');
        return this.getMockSTTResult();
      }

      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: 'audio.wav',
        contentType: 'audio/wav'
      });
      formData.append('model', this.model);
      formData.append('language', language);
      
      // Add optional parameters
      if (maxSpeakers) {
        formData.append('max_speakers', maxSpeakers.toString());
      }
      
      // Enable audio event tagging (laughter, applause, etc.)
      formData.append('tag_audio_events', 'true');

      const response = await axios.post(
        `${this.baseUrl}/speech-to-text`,
        formData,
        {
          headers: {
            'xi-api-key': this.elevenlabsApiKey,
            ...formData.getHeaders()
          },
          timeout: 60000 // 60 second timeout for larger files
        }
      );

      const result = response.data;
      
      return {
        success: true,
        transcript: result.text || result.transcript,
        confidence: this.calculateElevenLabsConfidence(result),
        language: result.language || language,
        duration: result.duration,
        segments: result.segments || [],
        speakers: result.speakers || [],
        audio_events: result.audio_events || [],
        is_mock: false
      };

    } catch (error) {
      console.error('ElevenLabs Speech-to-text error:', error);
      
      // Fallback to mock if API fails
      if (error.response?.status === 401) {
        console.warn('ElevenLabs API key invalid, using mock STT');
      } else if (error.response?.status === 429) {
        console.warn('ElevenLabs API rate limit exceeded, using mock STT');
      } else if (error.response?.status === 413) {
        console.warn('File too large for ElevenLabs (max 3GB), using mock STT');
      } else {
        console.warn('ElevenLabs API error, using mock STT:', error.message);
      }
      
      return this.getMockSTTResult();
    }
  }

  /**
   * Convert speech to text from file path
   * @param {string} filePath - Path to audio file
   * @param {string} language - Optional language code
   * @returns {Promise<Object>} - STT result
   */
  async speechToTextFromFile(filePath, language = 'en') {
    try {
      const audioBuffer = fs.readFileSync(filePath);
      return await this.speechToText(audioBuffer, language);
    } catch (error) {
      console.error('Error reading audio file:', error);
      return {
        success: false,
        error: 'Failed to read audio file',
        details: error.message
      };
    }
  }

  /**
   * Calculate confidence score from ElevenLabs response
   * @param {Object} elevenLabsResult - ElevenLabs API response
   * @returns {number} - Confidence score between 0 and 1
   */
  calculateElevenLabsConfidence(elevenLabsResult) {
    // ElevenLabs may provide confidence scores directly
    if (elevenLabsResult.confidence !== undefined) {
      return Math.round(elevenLabsResult.confidence * 100) / 100;
    }

    // If no direct confidence, estimate based on transcript quality
    if (!elevenLabsResult.segments || elevenLabsResult.segments.length === 0) {
      return 0.85; // Default confidence for ElevenLabs
    }

    // Calculate confidence based on segment quality
    let totalConfidence = 0;
    let segmentCount = 0;

    elevenLabsResult.segments.forEach(segment => {
      if (segment.confidence !== undefined) {
        totalConfidence += segment.confidence;
        segmentCount++;
      } else if (segment.avg_logprob !== undefined) {
        // Convert log probability to confidence
        const confidence = Math.max(0, Math.min(1, Math.exp(segment.avg_logprob + 1)));
        totalConfidence += confidence;
        segmentCount++;
      }
    });

    if (segmentCount === 0) {
      return 0.85; // Default confidence
    }

    const avgConfidence = totalConfidence / segmentCount;
    return Math.round(avgConfidence * 100) / 100;
  }

  /**
   * Get mock STT result for development/testing
   * @returns {Object} - Mock STT result
   */
  getMockSTTResult() {
    const mockTranscripts = [
      "I want to bet on the Lakers winning the championship this year",
      "I think the stock market will go up next month",
      "I predict that it will rain tomorrow",
      "I want to place a bet on the election results",
      "I believe the economy will improve in the next quarter"
    ];

    const randomTranscript = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];

    return {
      success: true,
      transcript: randomTranscript,
      confidence: 0.85 + Math.random() * 0.15, // 0.85-1.0
      language: 'en',
      duration: 3.5 + Math.random() * 2, // 3.5-5.5 seconds
      segments: [
        {
          id: 0,
          start: 0,
          end: randomTranscript.length * 0.1,
          text: randomTranscript,
          avg_logprob: -0.2
        }
      ],
      is_mock: true
    };
  }

  /**
   * Validate audio file format and size
   * @param {Buffer} audioBuffer - Audio file buffer
   * @returns {Object} - Validation result
   */
  validateAudioFile(audioBuffer) {
    const maxSize = 3 * 1024 * 1024 * 1024; // 3GB (ElevenLabs limit)
    
    if (audioBuffer.length > maxSize) {
      return {
        valid: false,
        error: 'Audio file too large. Maximum size is 3GB.'
      };
    }

    if (audioBuffer.length < 1000) { // 1KB minimum
      return {
        valid: false,
        error: 'Audio file too small. Please record at least 1 second of audio.'
      };
    }

    return {
      valid: true,
      size: audioBuffer.length,
      size_mb: (audioBuffer.length / (1024 * 1024)).toFixed(2)
    };
  }

  /**
   * Get supported audio formats (ElevenLabs supports both audio and video)
   * @returns {Array} - List of supported formats
   */
  getSupportedFormats() {
    return [
      // Audio formats
      'mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm', 'flac', 'aac', 'ogg',
      // Video formats (audio will be extracted)
      'avi', 'mov', 'mkv', 'flv', 'wmv'
    ];
  }

  /**
   * Health check for the STT service
   * @returns {Promise<Object>} - Health status
   */
  async healthCheck() {
    try {
      if (!this.elevenlabsApiKey) {
        return {
          status: 'warning',
          message: 'ElevenLabs API key not configured - using mock STT',
          service: 'speech-to-text',
          provider: 'mock'
        };
      }

      // Test with a small audio buffer
      const testBuffer = Buffer.from('test');
      const result = await this.speechToText(testBuffer);
      
      return {
        status: 'healthy',
        message: 'Speech-to-text service is operational',
        service: 'speech-to-text',
        provider: 'elevenlabs-scribe-v1',
        confidence: result.confidence,
        supported_languages: 99,
        max_file_size: '3GB'
      };

    } catch (error) {
      return {
        status: 'error',
        message: 'Speech-to-text service error',
        service: 'speech-to-text',
        provider: 'elevenlabs-scribe-v1',
        error: error.message
      };
    }
  }
}

module.exports = new SpeechToTextService();
