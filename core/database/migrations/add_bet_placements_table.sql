-- Migration: Add bet_placements table for speech-to-text betting functionality
-- This table stores bet placement requests from voice interactions

-- bet_placements table: Store bet placement requests from speech-to-text
CREATE TABLE bet_placements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    transcript TEXT NOT NULL,
    betting_intent JSONB NOT NULL, -- Store parsed betting intent
    matched_bet JSONB NOT NULL, -- Store matched Kalshi bet data
    bet_amount DECIMAL(18,8) DEFAULT 0,
    agent_predictions JSONB, -- Store predictions from all agents
    trust_analysis JSONB, -- Store trust analysis for each agent
    recommendation JSONB, -- Store final betting recommendation
    voice_responses JSONB, -- Store voice responses (audio data)
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'placed', 'cancelled'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for bet_placements
CREATE INDEX idx_bet_placements_user_id ON bet_placements(user_id);
CREATE INDEX idx_bet_placements_status ON bet_placements(status);
CREATE INDEX idx_bet_placements_created_at ON bet_placements(created_at DESC);
CREATE INDEX idx_bet_placements_betting_intent ON bet_placements USING GIN (betting_intent);
CREATE INDEX idx_bet_placements_matched_bet ON bet_placements USING GIN (matched_bet);
CREATE INDEX idx_bet_placements_voice_responses ON bet_placements USING GIN (voice_responses);

-- Add constraint for bet amount
ALTER TABLE bet_placements ADD CONSTRAINT chk_bet_amount_positive 
    CHECK (bet_amount >= 0);

-- Add constraint for status values
ALTER TABLE bet_placements ADD CONSTRAINT chk_bet_placement_status 
    CHECK (status IN ('pending', 'placed', 'cancelled', 'expired'));

-- Create trigger to update updated_at automatically
CREATE TRIGGER update_bet_placements_updated_at BEFORE UPDATE ON bet_placements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE bet_placements IS 'Stores bet placement requests from speech-to-text interactions with TrustSwarm';
COMMENT ON COLUMN bet_placements.betting_intent IS 'JSON object containing parsed betting intent from speech transcript';
COMMENT ON COLUMN bet_placements.matched_bet IS 'JSON object containing matched Kalshi bet data';
COMMENT ON COLUMN bet_placements.agent_predictions IS 'JSON array containing predictions from all agents (0, 1, 2)';
COMMENT ON COLUMN bet_placements.trust_analysis IS 'JSON array containing trust analysis for each agent';
COMMENT ON COLUMN bet_placements.recommendation IS 'JSON object containing final betting recommendation';
COMMENT ON COLUMN bet_placements.voice_responses IS 'JSON object containing voice responses with audio data';
