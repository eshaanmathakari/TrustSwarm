// api/routes/voice.js - Voice API Endpoints
const express = require('express');
const multer = require('multer');
const router = express.Router();
const VoiceConversationManager = require('../../voice/conversation-manager');
const ElevenLabsVoiceService = require('../../voice/elevenlabs/voice-service');
const auth = require('../middleware/auth');

const upload = multer({ dest: 'uploads/voice/' });
const conversationManager = new VoiceConversationManager();
const voiceService = new ElevenLabsVoiceService();

// POST /voice/start-discussion - Start voice discussion about a prediction
router.post('/start-discussion', auth.validateToken, async (req, res) => {
    try {
        const { event_id, context } = req.body;
        const agentId = req.user.agent_id;

        const discussion = await conversationManager.startPredictionDiscussion(
            agentId,
            event_id,
            context
        );

        res.json(discussion);

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /voice/ask-question - Ask agent a question in conversation
router.post('/ask-question', upload.single('voice_file'), async (req, res) => {
    try {
        const { conversation_id, question } = req.body;
        const voiceFile = req.file;

        const response = await conversationManager.handleUserQuestion(
            conversation_id,
            question,
            voiceFile?.path
        );

        res.json(response);

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /voice/create-challenge - Create voice-based trust challenge
router.post('/create-challenge', auth.validateToken, async (req, res) => {
    try {
        const { target_agent_id, challenge_type, challenge_text } = req.body;
        const challengerAgentId = req.user.agent_id;

        const challenge = await voiceService.generateTrustChallenge(
            challengerAgentId,
            target_agent_id,
            challenge_type,
            challenge_text
        );

        res.json(challenge);

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /voice/respond-challenge/:challengeId - Respond to voice challenge
router.post('/respond-challenge/:challengeId', 
    auth.validateToken, 
    upload.single('response_audio'), 
    async (req, res) => {
    try {
        const { challengeId } = req.params;
        const responseAudio = req.file;

        if (!responseAudio) {
            return res.status(400).json({
                success: false,
                error: 'Voice response file required'
            });
        }

        const verification = await voiceService.verifyVoiceResponse(
            challengeId,
            responseAudio.path
        );

        res.json(verification);

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /voice/conversations/:id - Get conversation history
router.get('/conversations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const history = conversationManager.getConversationHistory(id);

        if (!history) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        res.json({
            success: true,
            conversation_history: history
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /voice/generate-profile - Generate voice profile for agent
router.post('/generate-profile', auth.validateToken, async (req, res) => {
    try {
        const agentId = req.user.agent_id;
        const agentName = req.user.agent_data.name;

        const voiceProfile = await voiceService.generateAgentVoiceProfile(agentId, agentName);

        res.json(voiceProfile);

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /voice/end-conversation/:id - End a conversation
router.post('/end-conversation/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const ended = conversationManager.endConversation(id);

        if (!ended) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        res.json({
            success: true,
            message: 'Conversation ended and stored'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;