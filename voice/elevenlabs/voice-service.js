// voice/elevenlabs/voice-service.js - ElevenLabs Voice Service
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const db = require('../../core/database/connection');

class ElevenLabsVoiceService {
    constructor() {
        this.apiKey = process.env.ELEVENLABS_API_KEY;
        this.baseUrl = 'https://api.elevenlabs.io/v1';
        this.defaultVoiceId = 'pNInz6obpgDQGcFmaJgB'; // Default ElevenLabs voice
    }

    async generateAgentVoiceProfile(agentId, agentName) {
        try {
            // Create a unique voice for the agent
            const voiceCreation = await axios.post(`${this.baseUrl}/voices/add`, {
                name: `Agent_${agentName}_${agentId.slice(0, 8)}`,
                description: `Voice profile for prediction agent ${agentName}`,
                settings: {
                    stability: 0.7,
                    similarity_boost: 0.8,
                    style: 0.2
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            // Store voice ID in database
            await db.query(
                'UPDATE agents SET voice_id = $1 WHERE id = $2',
                [voiceCreation.data.voice_id, agentId]
            );

            return {
                success: true,
                voice_id: voiceCreation.data.voice_id,
                agent_id: agentId
            };

        } catch (error) {
            console.error('Voice profile creation failed:', error);
            throw new Error(`Voice profile creation failed: ${error.message}`);
        }
    }

    async generatePredictionExplanation(agentId, predictionId, explanationText) {
        try {
            // Get agent's voice ID
            const agent = await db.query(
                'SELECT voice_id, name FROM agents WHERE id = $1',
                [agentId]
            );

            if (agent.rows.length === 0) {
                throw new Error('Agent not found');
            }

            const voiceId = agent.rows[0].voice_id || this.defaultVoiceId;

            // Generate speech
            const response = await axios.post(`${this.baseUrl}/text-to-speech/${voiceId}`, {
                text: explanationText,
                model_id: "eleven_monolingual_v1",
                voice_settings: {
                    stability: 0.7,
                    similarity_boost: 0.8,
                    style: 0.3,
                    use_speaker_boost: true
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                responseType: 'stream'
            });

            // Save audio file
            const fileName = `prediction_${predictionId}_${Date.now()}.mp3`;
            const filePath = `./uploads/voice/${fileName}`;
            
            // Ensure directory exists
            const dir = './uploads/voice';
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', async () => {
                    try {
                        // Store in database
                        await db.query(`
                            INSERT INTO voice_verifications 
                            (agent_id, challenge_type, audio_file_url, transcript, status)
                            VALUES ($1, $2, $3, $4, $5)
                        `, [
                            agentId,
                            'prediction_explanation',
                            filePath,
                            explanationText,
                            'generated'
                        ]);

                        resolve({
                            success: true,
                            audio_file_path: filePath,
                            file_name: fileName
                        });
                    } catch (dbError) {
                        reject(dbError);
                    }
                });

                writer.on('error', reject);
            });

        } catch (error) {
            console.error('Voice generation failed:', error);
            throw error;
        }
    }

    async generateTrustChallenge(challengerAgentId, targetAgentId, challengeType, challengeText) {
        try {
            // Generate challenge audio
            const challengeAudio = await this.generatePredictionExplanation(
                challengerAgentId,
                `challenge_${Date.now()}`,
                challengeText
            );

            // Create verification challenge record
            const challenge = await db.query(`
                INSERT INTO voice_verifications 
                (agent_id, challenge_type, audio_file_url, transcript, challenger_agent_id, status)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [
                targetAgentId,
                challengeType,
                challengeAudio.audio_file_path,
                challengeText,
                challengerAgentId,
                'pending'
            ]);

            return {
                success: true,
                challenge_id: challenge.rows[0].id,
                audio_file_path: challengeAudio.audio_file_path,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            };

        } catch (error) {
            console.error('Trust challenge creation failed:', error);
            throw error;
        }
    }

    async verifyVoiceResponse(challengeId, responseAudioFile) {
        try {
            // Get challenge details
            const challenge = await db.query(
                'SELECT * FROM voice_verifications WHERE id = $1',
                [challengeId]
            );

            if (challenge.rows.length === 0) {
                throw new Error('Challenge not found');
            }

            // Convert audio to text using ElevenLabs or external service
            const transcript = await this.speechToText(responseAudioFile);

            // Simple verification - in production, use more sophisticated analysis
            const originalText = challenge.rows[0].transcript.toLowerCase();
            const responseText = transcript.toLowerCase();
            
            // Calculate similarity score (simplified)
            const similarity = this.calculateTextSimilarity(originalText, responseText);
            const verificationScore = similarity > 0.7 ? 0.9 : similarity;

            // Update verification record
            await db.query(`
                UPDATE voice_verifications 
                SET verification_score = $1, verified_at = NOW(), status = $2
                WHERE id = $3
            `, [
                verificationScore,
                verificationScore > 0.7 ? 'verified' : 'failed',
                challengeId
            ]);

            return {
                success: true,
                verification_score: verificationScore,
                status: verificationScore > 0.7 ? 'verified' : 'failed',
                transcript: transcript
            };

        } catch (error) {
            console.error('Voice verification failed:', error);
            throw error;
        }
    }

    async speechToText(audioFilePath) {
        // This would integrate with a speech-to-text service
        // For now, return placeholder
        return "Voice response transcript placeholder";
    }

    calculateTextSimilarity(text1, text2) {
        // Simple similarity calculation - in production, use more sophisticated NLP
        const words1 = text1.split(' ');
        const words2 = text2.split(' ');
        
        const intersection = words1.filter(word => words2.includes(word));
        const union = [...new Set([...words1, ...words2])];
        
        return intersection.length / union.length;
    }
}

module.exports = ElevenLabsVoiceService;
