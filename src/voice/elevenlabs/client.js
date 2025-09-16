const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const config = require('../../config/environment');

class ElevenLabsClient {
    constructor() {
        this.apiKey = config.ELEVENLABS_API_KEY;
        this.baseURL = 'https://api.elevenlabs.io/v1';
        
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Accept': 'application/json',
                'xi-api-key': this.apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        this.setupInterceptors();
    }

    setupInterceptors() {
        this.client.interceptors.request.use(
            (config) => {
                if (process.env.LOG_LEVEL === 'debug') {
                    console.log(`🔊 ElevenLabs Request: ${config.method?.toUpperCase()} ${config.url}`);
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        this.client.interceptors.response.use(
            (response) => {
                if (process.env.LOG_LEVEL === 'debug') {
                    console.log(`✅ ElevenLabs Response: ${response.status} ${response.config.url}`);
                }
                return response;
            },
            (error) => {
                console.error('❌ ElevenLabs Error:', {
                    url: error.config?.url,
                    status: error.response?.status,
                    message: error.response?.data?.detail || error.message
                });
                return Promise.reject(error);
            }
        );
    }

    /**
     * Generate voice explanation for agent prediction
     */
    async generatePredictionExplanation(agentId, predictionData) {
        try {
            const explanationText = this.formatPredictionExplanation(predictionData);
            
            const voiceSettings = {
                stability: config.ELEVENLABS.VOICE_SETTINGS.stability,
                similarity_boost: config.ELEVENLABS.VOICE_SETTINGS.similarity_boost,
                style: config.ELEVENLABS.VOICE_SETTINGS.style,
                use_speaker_boost: config.ELEVENLABS.VOICE_SETTINGS.use_speaker_boost
            };

            const response = await this.client.post(
                `/text-to-speech/${config.ELEVENLABS.VOICE_ID}`,
                {
                    text: explanationText,
                    model_id: config.ELEVENLABS.MODEL_ID,
                    voice_settings: voiceSettings
                },
                {
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json'
                    },
                    responseType: 'arraybuffer'
                }
            );

            // Save audio file
            const audioBuffer = Buffer.from(response.data);
            const audioFilename = `prediction_${predictionData.id}_${Date.now()}.mp3`;
            const audioPath = path.join(__dirname, '../../../uploads/audio', audioFilename);
            
            // Ensure directory exists
            await fs.mkdir(path.dirname(audioPath), { recursive: true });
            await fs.writeFile(audioPath, audioBuffer);

            console.log('🎤 Generated prediction explanation audio:', {
                predictionId: predictionData.id,
                audioFile: audioFilename,
                size: audioBuffer.length
            });

            return {
                audio_file_path: audioPath,
                audio_file_url: `/audio/${audioFilename}`,
                transcript: explanationText,
                voice_id: config.ELEVENLABS.VOICE_ID,
                duration_estimate: Math.ceil(explanationText.length / 15) // Rough estimate: 15 chars per second
            };
        } catch (error) {
            console.error('Failed to generate prediction explanation:', error);
            throw new Error(`Voice explanation generation failed: ${error.message}`);
        }
    }

    /**
     * Create voice-based proof of agency challenge
     */
    async createProofOfAgencyChallenge(agentId, challengeType) {
        try {
            const challengePrompts = this.generateChallengePrompts(challengeType);
            const selectedPrompt = challengePrompts[Math.floor(Math.random() * challengePrompts.length)];
            
            const challengeText = `Agent identification challenge. ${selectedPrompt.instruction} Please respond naturally with your reasoning.`;

            console.log('🎯 Created proof of agency challenge:', {
                agentId: agentId,
                challengeType: challengeType,
                promptType: selectedPrompt.type
            });

            return {
                challenge_id: crypto.randomUUID(),
                challenge_prompt: challengeText,
                expected_elements: selectedPrompt.expectedElements,
                difficulty_level: selectedPrompt.difficulty,
                time_limit_seconds: 120,
                challenge_type: challengeType
            };
        } catch (error) {
            console.error('Failed to create proof of agency challenge:', error);
            throw new Error(`Challenge creation failed: ${error.message}`);
        }
    }

    /**
     * Process voice response to challenge
     */
    async processVoiceChallenge(challengeData, audioFile) {
        try {
            // Convert audio to text using speech-to-text (placeholder implementation)
            const transcript = await this.speechToText(audioFile);
            
            // Analyze response quality
            const analysis = await this.analyzeChallengeResponse(
                challengeData.challenge_prompt,
                transcript,
                challengeData.expected_elements
            );

            // Generate voice signature for identity verification
            const voiceSignature = await this.generateVoiceSignature(audioFile);

            console.log('🎤 Processed voice challenge:', {
                challengeId: challengeData.challenge_id,
                transcriptLength: transcript.length,
                verificationScore: analysis.verification_score
            });

            return {
                transcript: transcript,
                verification_score: analysis.verification_score,
                voice_signature_hash: voiceSignature,
                analysis_details: analysis.details,
                passed: analysis.verification_score >= 0.7,
                processed_at: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to process voice challenge:', error);
            throw new Error(`Voice challenge processing failed: ${error.message}`);
        }
    }

    /**
     * Generate voice signature for agent identity
     */
    async generateVoiceSignature(audioData) {
        try {
            // Create a hash of voice characteristics (simplified implementation)
            // In production, this would use advanced voice biometric analysis
            const hash = crypto.createHash('sha256');
            hash.update(audioData);
            const signature = hash.digest('hex').substring(0, 32);
            
            console.log('🔒 Generated voice signature');
            
            return signature;
        } catch (error) {
            console.error('Failed to generate voice signature:', error);
            throw new Error(`Voice signature generation failed: ${error.message}`);
        }
    }

    /**
     * Convert speech to text (placeholder - would integrate with speech recognition service)
     */
    async speechToText(audioFile) {
        try {
            // This is a placeholder implementation
            // In production, integrate with services like OpenAI Whisper, Google Speech-to-Text, etc.
            const audioBuffer = await fs.readFile(audioFile);
            
            // For demo purposes, return a mock transcript based on file size and duration
            const estimatedDuration = audioBuffer.length / 16000; // Rough estimate
            const mockTranscript = `I am an AI agent specialized in ${Math.random() > 0.5 ? 'sports' : 'economic'} predictions. My reasoning for this prediction is based on statistical analysis and historical data patterns. I maintain a ${(0.6 + Math.random() * 0.3).toFixed(2)} trust score through consistent accuracy.`;
            
            console.log('📝 Speech-to-text conversion completed (mock)');
            
            return mockTranscript;
        } catch (error) {
            console.error('Speech-to-text conversion failed:', error);
            throw new Error(`Speech recognition failed: ${error.message}`);
        }
    }

    /**
     * Analyze challenge response quality
     */
    async analyzeChallengeResponse(prompt, transcript, expectedElements) {
        try {
            let score = 0.5; // Base score
            const details = [];

            // Check for expected elements
            if (expectedElements) {
                for (const element of expectedElements) {
                    if (transcript.toLowerCase().includes(element.toLowerCase())) {
                        score += 0.1;
                        details.push(`✅ Contains expected element: ${element}`);
                    } else {
                        details.push(`❌ Missing expected element: ${element}`);
                    }
                }
            }

            // Check response length and coherence
            if (transcript.length > 50) {
                score += 0.1;
                details.push('✅ Adequate response length');
            }

            // Check for reasoning keywords
            const reasoningKeywords = ['because', 'analysis', 'data', 'pattern', 'evidence', 'based on'];
            const foundKeywords = reasoningKeywords.filter(keyword => 
                transcript.toLowerCase().includes(keyword)
            );
            score += foundKeywords.length * 0.05;
            
            if (foundKeywords.length > 0) {
                details.push(`✅ Contains reasoning keywords: ${foundKeywords.join(', ')}`);
            }

            // Normalize score to 0-1 range
            score = Math.min(1.0, Math.max(0.0, score));

            return {
                verification_score: parseFloat(score.toFixed(3)),
                details: details,
                transcript_length: transcript.length,
                reasoning_quality: foundKeywords.length > 2 ? 'high' : 'medium'
            };
        } catch (error) {
            console.error('Failed to analyze challenge response:', error);
            return {
                verification_score: 0.3,
                details: ['❌ Analysis failed'],
                error: error.message
            };
        }
    }

    /**
     * Format prediction explanation text
     */
    formatPredictionExplanation(predictionData) {
        return `As an AI prediction agent, I am making a forecast for the event: ${predictionData.event_title}. 
        
        My predicted probability is ${(predictionData.predicted_probability * 100).toFixed(1)} percent. 
        
        My confidence level in this prediction is ${(predictionData.confidence_score * 100).toFixed(1)} percent.
        
        ${predictionData.rationale || 'My reasoning is based on statistical analysis of historical data and current market indicators.'}
        
        This prediction is part of the TrustSwarm network, where my reputation is built through demonstrable accuracy rather than subjective ratings.`;
    }

    /**
     * Generate challenge prompts for different types
     */
    generateChallengePrompts(challengeType) {
        const prompts = {
            prediction_explanation: [
                {
                    type: 'reasoning_defense',
                    instruction: 'Explain your methodology for making predictions in your domain of expertise.',
                    expectedElements: ['methodology', 'data', 'analysis'],
                    difficulty: 'medium'
                },
                {
                    type: 'domain_knowledge',
                    instruction: 'Describe the key factors you consider when making predictions.',
                    expectedElements: ['factors', 'consider', 'important'],
                    difficulty: 'medium'
                }
            ],
            identity_proof: [
                {
                    type: 'agent_identity',
                    instruction: 'State your agent type, specialization, and current trust score.',
                    expectedElements: ['agent', 'specialization', 'trust'],
                    difficulty: 'easy'
                },
                {
                    type: 'network_participation',
                    instruction: 'Explain your role in the TrustSwarm network and how you build reputation.',
                    expectedElements: ['TrustSwarm', 'reputation', 'network'],
                    difficulty: 'medium'
                }
            ],
            expertise_validation: [
                {
                    type: 'domain_expertise',
                    instruction: 'Demonstrate your expertise by explaining a recent successful prediction.',
                    expectedElements: ['successful', 'prediction', 'expertise'],
                    difficulty: 'high'
                }
            ]
        };

        return prompts[challengeType] || prompts.identity_proof;
    }

    /**
     * Get available voices from ElevenLabs
     */
    async getAvailableVoices() {
        try {
            const response = await this.client.get('/voices');
            
            console.log(`🎵 Found ${response.data.voices.length} available voices`);
            
            return response.data.voices.map(voice => ({
                voice_id: voice.voice_id,
                name: voice.name,
                category: voice.category,
                description: voice.description,
                preview_url: voice.preview_url,
                labels: voice.labels
            }));
        } catch (error) {
            console.error('Failed to get available voices:', error);
            throw new Error(`Voice retrieval failed: ${error.message}`);
        }
    }

    /**
     * Health check for ElevenLabs API
     */
    async healthCheck() {
        try {
            const response = await this.client.get('/voices', { timeout: 5000 });
            return {
                status: 'connected',
                api_key_valid: true,
                voices_available: response.data.voices.length,
                timestamp: new Date()
            };
        } catch (error) {
            return {
                status: 'disconnected',
                api_key_valid: error.response?.status !== 401,
                error: error.message,
                timestamp: new Date()
            };
        }
    }
}

module.exports = ElevenLabsClient;