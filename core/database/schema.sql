-- Core Database Schema for TrustSwarm
-- Task 1: Foundation Architecture & Database Design

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- agents table: Core agent registry
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'sports', 'politics', 'economics', 'meta'
    coral_agent_id VARCHAR(255) UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    trust_score DECIMAL(5,4) DEFAULT 0.5000,
    specialization_domains TEXT[], -- Array of domains
    voice_signature_hash VARCHAR(255), -- For voice verification
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_agents_type ON agents(type);
CREATE INDEX idx_agents_trust_score ON agents(trust_score DESC);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_coral_id ON agents(coral_agent_id);

-- predictions table: All agent predictions
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    event_id VARCHAR(255) NOT NULL, -- From Prophet Arena/Kalshi
    event_title TEXT NOT NULL,
    event_category VARCHAR(50) NOT NULL,
    predicted_probability DECIMAL(5,4) NOT NULL, -- 0.0000 to 1.0000
    rationale TEXT,
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    prediction_timestamp TIMESTAMP DEFAULT NOW(),
    resolution_timestamp TIMESTAMP,
    actual_outcome BOOLEAN,
    brier_score DECIMAL(5,4), -- Calculated after resolution
    was_correct BOOLEAN,
    stake_amount DECIMAL(18,8) DEFAULT 0 -- For economic incentives
);

-- Create indexes for predictions
CREATE INDEX idx_predictions_agent_id ON predictions(agent_id);
CREATE INDEX idx_predictions_event_id ON predictions(event_id);
CREATE INDEX idx_predictions_category ON predictions(event_category);
CREATE INDEX idx_predictions_timestamp ON predictions(prediction_timestamp DESC);
CREATE INDEX idx_predictions_resolution ON predictions(resolution_timestamp);

-- trust_scores table: Historical trust score tracking
CREATE TABLE trust_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    score DECIMAL(5,4) NOT NULL,
    category VARCHAR(50), -- Domain-specific scores
    calculation_method VARCHAR(50), -- 'brier', 'accuracy', 'meta_prediction'
    event_count INTEGER NOT NULL,
    calculated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for trust_scores
CREATE INDEX idx_trust_scores_agent_id ON trust_scores(agent_id);
CREATE INDEX idx_trust_scores_category ON trust_scores(category);
CREATE INDEX idx_trust_scores_calculated_at ON trust_scores(calculated_at DESC);

-- agent_communications table: Secure message logging
CREATE TABLE agent_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    to_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    message_type VARCHAR(50), -- 'prediction_share', 'trust_challenge', 'coordination'
    encrypted_payload TEXT NOT NULL,
    signature_hash VARCHAR(255),
    timestamp TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'sent'
);

-- Create indexes for agent_communications
CREATE INDEX idx_communications_from_agent ON agent_communications(from_agent_id);
CREATE INDEX idx_communications_to_agent ON agent_communications(to_agent_id);
CREATE INDEX idx_communications_type ON agent_communications(message_type);
CREATE INDEX idx_communications_timestamp ON agent_communications(timestamp DESC);

-- voice_verifications table: Voice-based trust challenges
CREATE TABLE voice_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    challenge_type VARCHAR(50), -- 'prediction_explanation', 'reasoning_defense'
    audio_file_url TEXT,
    transcript TEXT,
    verification_score DECIMAL(3,2),
    challenger_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending'
);

-- Create indexes for voice_verifications
CREATE INDEX idx_voice_verifications_agent_id ON voice_verifications(agent_id);
CREATE INDEX idx_voice_verifications_challenger ON voice_verifications(challenger_agent_id);
CREATE INDEX idx_voice_verifications_status ON voice_verifications(status);
CREATE INDEX idx_voice_verifications_created_at ON voice_verifications(created_at DESC);

-- Add constraints and triggers for data integrity
ALTER TABLE predictions ADD CONSTRAINT chk_probability_range 
    CHECK (predicted_probability >= 0.0000 AND predicted_probability <= 1.0000);

ALTER TABLE predictions ADD CONSTRAINT chk_confidence_range 
    CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00);

ALTER TABLE trust_scores ADD CONSTRAINT chk_trust_score_range 
    CHECK (score >= 0.0000 AND score <= 1.0000);

ALTER TABLE voice_verifications ADD CONSTRAINT chk_verification_score_range 
    CHECK (verification_score >= 0.00 AND verification_score <= 1.00);

-- Create trigger to update agents.updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- agent_private_keys table: Secure storage for agent private keys
CREATE TABLE agent_private_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    encrypted_private_key TEXT NOT NULL,
    key_version VARCHAR(20) DEFAULT 'v1',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for agent_private_keys
CREATE INDEX idx_agent_private_keys_agent_id ON agent_private_keys(agent_id);
CREATE INDEX idx_agent_private_keys_created_at ON agent_private_keys(created_at DESC);

-- Views for common queries
CREATE VIEW agent_performance_summary AS
SELECT 
    a.id,
    a.name,
    a.type,
    a.trust_score,
    COUNT(p.id) as total_predictions,
    AVG(p.brier_score) as avg_brier_score,
    COUNT(CASE WHEN p.was_correct = true THEN 1 END) as correct_predictions,
    ROUND(
        COUNT(CASE WHEN p.was_correct = true THEN 1 END)::numeric / 
        NULLIF(COUNT(CASE WHEN p.actual_outcome IS NOT NULL THEN 1 END), 0) * 100, 2
    ) as accuracy_percentage
FROM agents a
LEFT JOIN predictions p ON a.id = p.agent_id
GROUP BY a.id, a.name, a.type, a.trust_score;

-- View for recent agent activity
CREATE VIEW recent_agent_activity AS
SELECT 
    a.name as agent_name,
    a.type as agent_type,
    p.event_title,
    p.predicted_probability,
    p.prediction_timestamp,
    p.was_correct,
    p.brier_score
FROM agents a
JOIN predictions p ON a.id = p.agent_id
WHERE p.prediction_timestamp >= NOW() - INTERVAL '30 days'
ORDER BY p.prediction_timestamp DESC;