-- TrustSwarm Database Schema
-- Multi-Agent Predictive Trust Network

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents table: Core agent registry
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'sports', 'politics', 'economics', 'meta'
    coral_agent_id VARCHAR(255) UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    trust_score DECIMAL(5,4) DEFAULT 0.5000,
    specialization_domains TEXT[], -- Array of domains
    voice_signature_hash VARCHAR(255), -- For voice verification
    status VARCHAR(20) DEFAULT 'active',
    total_predictions INTEGER DEFAULT 0,
    successful_predictions INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_trust_score CHECK (trust_score >= 0.0000 AND trust_score <= 1.0000),
    CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'banned', 'pending'))
);

-- Predictions table: All agent predictions
CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    event_id VARCHAR(255) NOT NULL, -- From Prophet Arena/Kalshi/Polymarket
    event_title TEXT NOT NULL,
    event_category VARCHAR(50) NOT NULL,
    event_source VARCHAR(20) NOT NULL, -- 'kalshi', 'polymarket', 'internal'
    predicted_probability DECIMAL(5,4) NOT NULL, -- 0.0000 to 1.0000
    rationale TEXT,
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    prediction_timestamp TIMESTAMP DEFAULT NOW(),
    resolution_timestamp TIMESTAMP,
    actual_outcome BOOLEAN,
    brier_score DECIMAL(5,4), -- Calculated after resolution
    was_correct BOOLEAN,
    stake_amount DECIMAL(18,8) DEFAULT 0, -- For economic incentives
    nft_certificate_id VARCHAR(255), -- Link to Crossmint NFT
    
    CONSTRAINT valid_probability CHECK (predicted_probability >= 0.0000 AND predicted_probability <= 1.0000),
    CONSTRAINT valid_confidence CHECK (confidence_score IS NULL OR (confidence_score >= 0.00 AND confidence_score <= 1.00)),
    CONSTRAINT valid_brier CHECK (brier_score IS NULL OR (brier_score >= 0.0000 AND brier_score <= 1.0000)),
    CONSTRAINT valid_source CHECK (event_source IN ('kalshi', 'polymarket', 'internal', 'prophet_arena'))
);

-- Meta-predictions table: Agents predicting other agents' accuracy
CREATE TABLE IF NOT EXISTS meta_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    predictor_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    target_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    target_prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    predicted_accuracy DECIMAL(5,4) NOT NULL, -- Predicted accuracy for target agent
    predicted_brier_score DECIMAL(5,4), -- Predicted Brier score
    rationale TEXT,
    meta_prediction_timestamp TIMESTAMP DEFAULT NOW(),
    actual_accuracy DECIMAL(5,4), -- Calculated after resolution
    meta_was_correct BOOLEAN,
    meta_accuracy_score DECIMAL(5,4), -- How accurate was this meta-prediction
    
    CONSTRAINT different_agents CHECK (predictor_agent_id != target_agent_id),
    CONSTRAINT valid_predicted_accuracy CHECK (predicted_accuracy >= 0.0000 AND predicted_accuracy <= 1.0000)
);

-- Trust scores table: Historical trust score tracking
CREATE TABLE IF NOT EXISTS trust_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    score DECIMAL(5,4) NOT NULL,
    category VARCHAR(50), -- Domain-specific scores ('sports', 'politics', 'economics', 'overall')
    calculation_method VARCHAR(50) NOT NULL, -- 'brier', 'accuracy', 'meta_prediction', 'composite'
    event_count INTEGER NOT NULL,
    score_components JSONB, -- Detailed breakdown of score calculation
    calculated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_score CHECK (score >= 0.0000 AND score <= 1.0000),
    CONSTRAINT valid_method CHECK (calculation_method IN ('brier', 'accuracy', 'meta_prediction', 'composite', 'voice_verified'))
);

-- Agent communications table: Secure message logging
CREATE TABLE IF NOT EXISTS agent_communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    to_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE, -- NULL for broadcast messages
    message_type VARCHAR(50) NOT NULL, -- 'prediction_share', 'trust_challenge', 'coordination', 'meta_prediction'
    encrypted_payload TEXT NOT NULL,
    signature_hash VARCHAR(255),
    coral_message_id VARCHAR(255), -- Reference to Coral Protocol message
    timestamp TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'sent',
    
    CONSTRAINT valid_status CHECK (status IN ('sent', 'delivered', 'acknowledged', 'failed')),
    CONSTRAINT valid_message_type CHECK (message_type IN ('prediction_share', 'trust_challenge', 'coordination', 'meta_prediction', 'consensus_request'))
);

-- Voice verifications table: Voice-based trust challenges
CREATE TABLE IF NOT EXISTS voice_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    challenge_type VARCHAR(50) NOT NULL, -- 'prediction_explanation', 'reasoning_defense', 'identity_proof'
    challenge_prompt TEXT NOT NULL,
    audio_file_url TEXT,
    transcript TEXT,
    verification_score DECIMAL(3,2),
    challenger_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    elevenlabs_request_id VARCHAR(255),
    voice_signature_match BOOLEAN,
    human_review_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    
    CONSTRAINT valid_verification_score CHECK (verification_score IS NULL OR (verification_score >= 0.00 AND verification_score <= 1.00)),
    CONSTRAINT valid_challenge_status CHECK (status IN ('pending', 'verified', 'failed', 'expired')),
    CONSTRAINT valid_challenge_type CHECK (challenge_type IN ('prediction_explanation', 'reasoning_defense', 'identity_proof', 'expertise_validation'))
);

-- Events table: External events from prediction markets
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(255) PRIMARY KEY, -- External event ID
    title TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    source VARCHAR(20) NOT NULL, -- 'kalshi', 'polymarket', 'internal'
    market_url TEXT,
    resolution_criteria TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    resolution_time TIMESTAMP,
    actual_outcome BOOLEAN,
    status VARCHAR(20) DEFAULT 'open',
    metadata JSONB, -- Additional market data
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_event_status CHECK (status IN ('open', 'closed', 'resolved', 'cancelled')),
    CONSTRAINT valid_event_source CHECK (source IN ('kalshi', 'polymarket', 'internal', 'prophet_arena'))
);

-- Agent sessions table: Track agent interaction sessions
CREATE TABLE IF NOT EXISTS agent_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    coral_session_id VARCHAR(255),
    started_at TIMESTAMP DEFAULT NOW(),
    last_activity TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    
    CONSTRAINT valid_session_status CHECK (status IN ('active', 'inactive', 'expired', 'terminated'))
);

-- NFT certificates table: Track reputation NFTs from Crossmint
CREATE TABLE IF NOT EXISTS nft_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    prediction_id UUID REFERENCES predictions(id) ON DELETE SET NULL,
    crossmint_nft_id VARCHAR(255) UNIQUE,
    token_id VARCHAR(255),
    contract_address VARCHAR(255),
    certificate_type VARCHAR(50) NOT NULL, -- 'prediction_success', 'trust_milestone', 'expertise_badge'
    achievement_data JSONB NOT NULL,
    minted_at TIMESTAMP DEFAULT NOW(),
    blockchain_tx_hash VARCHAR(255),
    metadata_uri TEXT,
    
    CONSTRAINT valid_cert_type CHECK (certificate_type IN ('prediction_success', 'trust_milestone', 'expertise_badge', 'voice_verified', 'consensus_leader'))
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_agents_coral_id ON agents(coral_agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
CREATE INDEX IF NOT EXISTS idx_agents_trust_score ON agents(trust_score DESC);

CREATE INDEX IF NOT EXISTS idx_predictions_agent_id ON predictions(agent_id);
CREATE INDEX IF NOT EXISTS idx_predictions_event_id ON predictions(event_id);
CREATE INDEX IF NOT EXISTS idx_predictions_category ON predictions(event_category);
CREATE INDEX IF NOT EXISTS idx_predictions_timestamp ON predictions(prediction_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_resolution ON predictions(resolution_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_trust_scores_agent_id ON trust_scores(agent_id);
CREATE INDEX IF NOT EXISTS idx_trust_scores_category ON trust_scores(category);
CREATE INDEX IF NOT EXISTS idx_trust_scores_calculated ON trust_scores(calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_communications_from_agent ON agent_communications(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_communications_to_agent ON agent_communications(to_agent_id);
CREATE INDEX IF NOT EXISTS idx_communications_timestamp ON agent_communications(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_resolution_time ON events(resolution_time);

CREATE INDEX IF NOT EXISTS idx_voice_verifications_agent ON voice_verifications(agent_id);
CREATE INDEX IF NOT EXISTS idx_voice_verifications_status ON voice_verifications(status);

CREATE INDEX IF NOT EXISTS idx_meta_predictions_predictor ON meta_predictions(predictor_agent_id);
CREATE INDEX IF NOT EXISTS idx_meta_predictions_target ON meta_predictions(target_agent_id);

-- Triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();