// api/routes/index.js - Main API Router
const express = require('express');
const router = express.Router();

// Import route modules
const agentsRouter = require('./agents');
const predictionsRouter = require('./predictions');
const trustScoreRouter = require('./trust');
const voiceRouter = require('./voice');
const communicationsRouter = require('./communications');

// API versioning
router.use('/v1/agents', agentsRouter);
router.use('/v1/predictions', predictionsRouter);
router.use('/v1/trust-scores', trustScoreRouter);
router.use('/v1/voice', voiceRouter);
router.use('/v1/communications', communicationsRouter);

module.exports = router;