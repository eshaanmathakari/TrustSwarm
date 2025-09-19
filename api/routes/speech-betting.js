// api/routes/speech-betting.js - Speech-to-Text and Betting Endpoints
const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const ElevenLabsClient = require('../../voice/elevenlabs/client');
const SpeechToTextService = require('../../voice/speech-to-text-service');
const TextToSpeechService = require('../../voice/text-to-speech-service');
const TrustAnalyzerAgent = require('../../coral-integration/agents/trust-analyzer');
const db = require('../../core/database/connection');

// Configure multer for audio file uploads
const upload = multer({ 
  dest: 'uploads/speech/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

// Initialize services
const elevenlabsClient = new ElevenLabsClient();
const speechToTextService = new SpeechToTextService();
const textToSpeechService = new TextToSpeechService();
const trustAnalyzer = new TrustAnalyzerAgent();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * POST /api/speech-betting/speech-to-text
 * Convert speech to text for user interaction with TrustSwarm
 */
router.post('/speech-to-text', 
  upload.single('audio'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Audio file is required'
        });
      }

      // Read the uploaded audio file
      const fs = require('fs');
      const audioBuffer = fs.readFileSync(req.file.path);
      
      // Validate audio file
      const validation = speechToTextService.validateAudioFile(audioBuffer);
      if (!validation.valid) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          error: validation.error
        });
      }
      
      // Convert speech to text using the STT service
      const sttResult = await speechToTextService.speechToText(audioBuffer, 'en', 2); // English, max 2 speakers
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      if (!sttResult.success) {
        return res.status(500).json({
          success: false,
          error: sttResult.error || 'Speech-to-text conversion failed'
        });
      }

      // Parse the transcript for betting intent
      const bettingIntent = parseBettingIntent(sttResult.transcript);
      
      res.json({
        success: true,
        transcript: sttResult.transcript,
        confidence: sttResult.confidence,
        language: sttResult.language,
        duration: sttResult.duration,
        speakers: sttResult.speakers || [],
        audio_events: sttResult.audio_events || [],
        betting_intent: bettingIntent,
        provider: sttResult.is_mock ? 'mock' : 'elevenlabs-scribe-v1',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Speech-to-text error:', error);
      res.status(500).json({
        success: false,
        error: 'Speech-to-text processing failed',
        details: error.message
      });
    }
  }
);

/**
 * POST /api/speech-betting/place-bet-with-trust
 * Place a bet based on speech input and get trust analysis from agents
 */
router.post('/place-bet-with-trust',
  [
    body('transcript').isString().withMessage('Transcript is required'),
    body('bet_amount').optional().isFloat({ min: 0 }).withMessage('Bet amount must be positive'),
    body('user_id').optional().isString().withMessage('User ID must be string')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { transcript, bet_amount = 10, user_id = 'anonymous' } = req.body;
      
      // Parse betting intent from transcript
      const bettingIntent = parseBettingIntent(transcript);
      
      if (!bettingIntent.has_betting_intent) {
        return res.status(400).json({
          success: false,
          error: 'No betting intent detected in transcript',
          transcript: transcript
        });
      }

      // Get active Kalshi bets that match the user's interest
      const activeBets = await getActiveKalshiBets(bettingIntent.category);
      
      if (activeBets.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No active bets found for the specified category',
          category: bettingIntent.category
        });
      }

      // Find the best matching bet
      const matchedBet = findBestMatchingBet(activeBets, bettingIntent);
      
      if (!matchedBet) {
        return res.status(404).json({
          success: false,
          error: 'No suitable bet found matching your criteria',
          available_bets: activeBets.map(bet => ({
            title: bet.title,
            category: bet.category,
            event_ticker: bet.event_ticker
          }))
        });
      }

      // Get predictions from all agents (0, 1, 2)
      const agentPredictions = await getAgentPredictions(matchedBet);
      
      // Get trust analysis for each agent
      const trustAnalysis = await getTrustAnalysisForAgents(agentPredictions);
      
      // Generate betting recommendation based on predictions and trust
      const recommendation = generateBettingRecommendation(agentPredictions, trustAnalysis);
      
      // Generate voice responses
      const voiceResponses = await generateVoiceResponses(recommendation, agentPredictions);
      
      // Store the bet placement request
      const betPlacementId = await storeBetPlacement({
        user_id,
        transcript,
        betting_intent: bettingIntent,
        matched_bet: matchedBet,
        bet_amount,
        agent_predictions: agentPredictions,
        trust_analysis: trustAnalysis,
        voice_responses: voiceResponses,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        bet_placement_id: betPlacementId,
        matched_bet: {
          title: matchedBet.title,
          category: matchedBet.category,
          event_ticker: matchedBet.event_ticker,
          answers: matchedBet.answers,
          settlement_sources: matchedBet.settlement_sources
        },
        agent_predictions: agentPredictions,
        trust_analysis: trustAnalysis,
        recommendation: recommendation,
        voice_responses: voiceResponses,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Bet placement error:', error);
      res.status(500).json({
        success: false,
        error: 'Bet placement failed',
        details: error.message
      });
    }
  }
);

/**
 * GET /api/speech-betting/active-bets
 * Get list of active Kalshi bets for voice interaction
 */
router.get('/active-bets', async (req, res) => {
  try {
    const { category, limit = 20 } = req.query;
    
    const activeBets = await getActiveKalshiBets(category, parseInt(limit));
    
    res.json({
      success: true,
      active_bets: activeBets,
      total: activeBets.length,
      category: category || 'all'
    });

  } catch (error) {
    console.error('Get active bets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active bets',
      details: error.message
    });
  }
});

/**
 * POST /api/speech-betting/generate-voice-response
 * Generate voice response for betting recommendation or agent prediction
 */
router.post('/generate-voice-response',
  [
    body('type').isIn(['recommendation', 'agent_prediction']).withMessage('Type must be recommendation or agent_prediction'),
    body('data').isObject().withMessage('Data object is required'),
    body('voice_id').optional().isString().withMessage('Voice ID must be string')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { type, data, voice_id } = req.body;
      
      let voiceResult;
      
      if (type === 'recommendation') {
        voiceResult = await textToSpeechService.generateBettingRecommendationVoice(data, voice_id);
      } else if (type === 'agent_prediction') {
        voiceResult = await textToSpeechService.generateAgentPredictionVoice(data, voice_id);
      }
      
      if (!voiceResult.success) {
        return res.status(500).json({
          success: false,
          error: voiceResult.error || 'Voice generation failed'
        });
      }
      
      // Convert audio buffer to base64 for JSON response
      const audioBase64 = voiceResult.audio_buffer.toString('base64');
      
      res.json({
        success: true,
        audio_base64: audioBase64,
        audio_hash: voiceResult.audio_hash,
        voice_id: voiceResult.voice_id,
        model: voiceResult.model,
        text_length: voiceResult.text_length,
        audio_size: voiceResult.audio_size,
        duration_estimate: voiceResult.duration_estimate,
        is_mock: voiceResult.is_mock,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Voice generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Voice generation failed',
        details: error.message
      });
    }
  }
);

/**
 * GET /api/speech-betting/available-voices
 * Get list of available ElevenLabs voices
 */
router.get('/available-voices', async (req, res) => {
  try {
    const voicesResult = await textToSpeechService.getAvailableVoices();
    
    if (!voicesResult.success) {
      return res.status(500).json({
        success: false,
        error: voicesResult.error || 'Failed to fetch voices'
      });
    }
    
    res.json({
      success: true,
      voices: voicesResult.voices,
      total: voicesResult.voices.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get voices error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available voices',
      details: error.message
    });
  }
});

/**
 * Parse betting intent from speech transcript
 */
function parseBettingIntent(transcript) {
  const lowerTranscript = transcript.toLowerCase();
  
  // Keywords for different categories
  const categoryKeywords = {
    sports: ['sports', 'football', 'basketball', 'baseball', 'soccer', 'tennis', 'golf', 'hockey', 'game', 'match', 'team'],
    politics: ['politics', 'election', 'president', 'senate', 'congress', 'vote', 'candidate', 'campaign'],
    financial: ['financial', 'economy', 'stock', 'market', 'inflation', 'gdp', 'unemployment', 'fed', 'interest rate'],
    weather: ['weather', 'temperature', 'rain', 'snow', 'hurricane', 'storm', 'climate']
  };
  
  // Betting intent keywords
  const bettingKeywords = ['bet', 'wager', 'predict', 'think', 'believe', 'will happen', 'going to', 'chance'];
  
  // Determine category
  let detectedCategory = 'sports'; // default
  let maxMatches = 0;
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const matches = keywords.filter(keyword => lowerTranscript.includes(keyword)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedCategory = category;
    }
  }
  
  // Check for betting intent
  const hasBettingIntent = bettingKeywords.some(keyword => lowerTranscript.includes(keyword));
  
  // Extract specific terms mentioned
  const mentionedTerms = [];
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    keywords.forEach(keyword => {
      if (lowerTranscript.includes(keyword)) {
        mentionedTerms.push(keyword);
      }
    });
  }
  
  return {
    has_betting_intent: hasBettingIntent,
    category: detectedCategory,
    confidence: maxMatches > 0 ? Math.min(0.9, maxMatches * 0.2) : 0.1,
    mentioned_terms: mentionedTerms,
    original_transcript: transcript
  };
}

/**
 * Get active Kalshi bets from database
 */
async function getActiveKalshiBets(category = null, limit = 20) {
  try {
    let query = `
      SELECT title, answers, category, event_ticker, settlement_sources, created_at
      FROM predict_tasks 
      WHERE created_at > NOW() - INTERVAL '7 days'
    `;
    const params = [];
    
    if (category) {
      query += ` AND category = $1`;
      params.push(category);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await db.query(query, params);
    return result.rows;
    
  } catch (error) {
    console.error('Error fetching active bets:', error);
    return [];
  }
}

/**
 * Find the best matching bet based on user intent
 */
function findBestMatchingBet(activeBets, bettingIntent) {
  if (activeBets.length === 0) return null;
  
  // Simple matching logic - in a real implementation, this would be more sophisticated
  const categoryMatches = activeBets.filter(bet => 
    bet.category === bettingIntent.category
  );
  
  if (categoryMatches.length > 0) {
    // Return the most recent bet in the matching category
    return categoryMatches[0];
  }
  
  // Fallback to any available bet
  return activeBets[0];
}

/**
 * Get predictions from all agents (0, 1, 2)
 */
async function getAgentPredictions(matchedBet) {
  const agentPredictions = [];
  
  // Simulate getting predictions from agents 0, 1, 2
  // In a real implementation, this would call the actual agent services
  for (let agentId = 0; agentId < 3; agentId++) {
    try {
      const prediction = await simulateAgentPrediction(agentId, matchedBet);
      agentPredictions.push({
        agent_id: agentId,
        agent_name: `Prediction Agent ${agentId}`,
        llm_model: getAgentLLMModel(agentId),
        prediction: prediction,
        confidence: Math.random() * 0.4 + 0.6, // 0.6-1.0
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error getting prediction from agent ${agentId}:`, error);
      agentPredictions.push({
        agent_id: agentId,
        agent_name: `Prediction Agent ${agentId}`,
        llm_model: getAgentLLMModel(agentId),
        prediction: null,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return agentPredictions;
}

/**
 * Simulate agent prediction (replace with actual agent calls)
 */
async function simulateAgentPrediction(agentId, matchedBet) {
  // This is a simulation - in reality, you'd call the actual agent services
  const outcomes = matchedBet.answers || ['Yes', 'No'];
  const probabilities = {};
  
  // Generate realistic probabilities that sum to 1
  const randomProbs = outcomes.map(() => Math.random());
  const sum = randomProbs.reduce((a, b) => a + b, 0);
  
  outcomes.forEach((outcome, index) => {
    probabilities[outcome] = randomProbs[index] / sum;
  });
  
  return {
    rationale: `Agent ${agentId} analysis: Based on current market conditions and historical data, this prediction reflects the agent's assessment of the most likely outcome.`,
    probabilities: probabilities
  };
}

/**
 * Get LLM model used by each agent
 */
function getAgentLLMModel(agentId) {
  const models = {
    0: 'gpt-4',
    1: 'claude-3-sonnet',
    2: 'gpt-3.5-turbo'
  };
  return models[agentId] || 'unknown';
}

/**
 * Get trust analysis for agents
 */
async function getTrustAnalysisForAgents(agentPredictions) {
  const trustAnalysis = [];
  
  for (const agentPrediction of agentPredictions) {
    try {
      // Use the trust analyzer to get trust scores
      const trustScore = await analyzeAgentTrust(agentPrediction.agent_id);
      
      trustAnalysis.push({
        agent_id: agentPrediction.agent_id,
        agent_name: agentPrediction.agent_name,
        trust_score: trustScore.score,
        trust_confidence: trustScore.confidence,
        trust_factors: trustScore.factors,
        recommendation: trustScore.recommendation,
        llm_model: agentPrediction.llm_model,
        analysis_timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error analyzing trust for agent ${agentPrediction.agent_id}:`, error);
      trustAnalysis.push({
        agent_id: agentPrediction.agent_id,
        agent_name: agentPrediction.agent_name,
        trust_score: 0.5, // default neutral score
        trust_confidence: 0.0,
        error: error.message,
        llm_model: agentPrediction.llm_model,
        analysis_timestamp: new Date().toISOString()
      });
    }
  }
  
  return trustAnalysis;
}

/**
 * Analyze trust for a specific agent
 */
async function analyzeAgentTrust(agentId) {
  // Simulate trust analysis - in reality, this would use the actual trust analyzer
  const baseScore = 0.7 + (Math.random() - 0.5) * 0.3; // 0.55-0.85 range
  const confidence = 0.8 + Math.random() * 0.2; // 0.8-1.0 range
  
  return {
    score: Math.max(0, Math.min(1, baseScore)),
    confidence: confidence,
    factors: ['historical_accuracy', 'consistency', 'peer_validation', 'response_quality'],
    recommendation: baseScore > 0.7 ? 'trustworthy' : 'requires_verification'
  };
}

/**
 * Generate voice responses for recommendation and agent predictions
 */
async function generateVoiceResponses(recommendation, agentPredictions) {
  try {
    const voiceResponses = {
      recommendation: null,
      agent_predictions: []
    };
    
    // Generate recommendation voice
    const recommendationVoice = await textToSpeechService.generateBettingRecommendationVoice(recommendation);
    if (recommendationVoice.success) {
      voiceResponses.recommendation = {
        audio_base64: recommendationVoice.audio_buffer.toString('base64'),
        audio_hash: recommendationVoice.audio_hash,
        voice_id: recommendationVoice.voice_id,
        text: recommendationVoice.recommendation_text,
        duration_estimate: recommendationVoice.duration_estimate
      };
    }
    
    // Generate agent prediction voices
    for (const prediction of agentPredictions) {
      const agentVoice = await textToSpeechService.generateAgentPredictionVoice(prediction);
      if (agentVoice.success) {
        voiceResponses.agent_predictions.push({
          agent_id: prediction.agent_id,
          agent_name: prediction.agent_name,
          audio_base64: agentVoice.audio_buffer.toString('base64'),
          audio_hash: agentVoice.audio_hash,
          voice_id: agentVoice.voice_id,
          text: agentVoice.prediction_text,
          duration_estimate: agentVoice.duration_estimate
        });
      }
    }
    
    return voiceResponses;
    
  } catch (error) {
    console.error('Error generating voice responses:', error);
    return {
      recommendation: null,
      agent_predictions: [],
      error: error.message
    };
  }
}

/**
 * Generate betting recommendation based on predictions and trust
 */
function generateBettingRecommendation(agentPredictions, trustAnalysis) {
  // Calculate weighted average prediction based on trust scores
  let totalWeight = 0;
  let weightedProbabilities = {};
  
  for (let i = 0; i < agentPredictions.length; i++) {
    const prediction = agentPredictions[i];
    const trust = trustAnalysis[i];
    
    if (prediction.prediction && prediction.prediction.probabilities) {
      const weight = trust.trust_score * prediction.confidence;
      totalWeight += weight;
      
      for (const [outcome, probability] of Object.entries(prediction.prediction.probabilities)) {
        if (!weightedProbabilities[outcome]) {
          weightedProbabilities[outcome] = 0;
        }
        weightedProbabilities[outcome] += probability * weight;
      }
    }
  }
  
  // Normalize probabilities
  if (totalWeight > 0) {
    for (const outcome in weightedProbabilities) {
      weightedProbabilities[outcome] /= totalWeight;
    }
  }
  
  // Find the outcome with highest probability
  const bestOutcome = Object.entries(weightedProbabilities)
    .reduce((a, b) => a[1] > b[1] ? a : b, ['Unknown', 0]);
  
  const averageTrust = trustAnalysis.reduce((sum, t) => sum + t.trust_score, 0) / trustAnalysis.length;
  
  return {
    recommended_outcome: bestOutcome[0],
    confidence: bestOutcome[1],
    average_trust_score: averageTrust,
    recommendation_strength: averageTrust > 0.7 ? 'strong' : averageTrust > 0.5 ? 'moderate' : 'weak',
    reasoning: `Based on ${agentPredictions.length} agent predictions with average trust score of ${averageTrust.toFixed(3)}, the recommended outcome is ${bestOutcome[0]} with ${(bestOutcome[1] * 100).toFixed(1)}% confidence.`
  };
}

/**
 * Store bet placement in database
 */
async function storeBetPlacement(betData) {
  try {
    const query = `
      INSERT INTO bet_placements (
        user_id, transcript, betting_intent, matched_bet, bet_amount,
        agent_predictions, trust_analysis, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    
    const params = [
      betData.user_id,
      betData.transcript,
      JSON.stringify(betData.betting_intent),
      JSON.stringify(betData.matched_bet),
      betData.bet_amount,
      JSON.stringify(betData.agent_predictions),
      JSON.stringify(betData.trust_analysis),
      betData.timestamp
    ];
    
    const result = await db.query(query, params);
    return result.rows[0].id;
    
  } catch (error) {
    console.error('Error storing bet placement:', error);
    // Return a temporary ID if database storage fails
    return `temp_${Date.now()}`;
  }
}

module.exports = router;
