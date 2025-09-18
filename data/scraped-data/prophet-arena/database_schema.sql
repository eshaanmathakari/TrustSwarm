-- Prophet Arena Database Schema
-- This schema is designed to store prediction data for trust metrics analysis

-- Events table: Stores information about prediction events
CREATE TABLE IF NOT EXISTS events (
    event_id TEXT PRIMARY KEY,
    event_title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('sports', 'economics', 'crypto')),
    event_date DATE,
    resolved_date DATE,
    resolved_outcome TEXT NOT NULL,
    options TEXT NOT NULL, -- JSON array of available options
    total_predictions INTEGER DEFAULT 0,
    metadata TEXT, -- JSON object with additional metadata
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Predictions table: Stores individual model predictions
CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL,
    model_name TEXT NOT NULL,
    predicted_option TEXT NOT NULL,
    probability REAL NOT NULL CHECK (probability >= 0 AND probability <= 1),
    is_correct BOOLEAN NOT NULL,
    confidence_score REAL NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    prediction_rank INTEGER, -- Rank of this prediction among all models for this option
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events (event_id) ON DELETE CASCADE
);

-- Model performance table: Aggregated performance metrics per model
CREATE TABLE IF NOT EXISTS model_performance (
    model_name TEXT PRIMARY KEY,
    total_predictions INTEGER DEFAULT 0,
    correct_predictions INTEGER DEFAULT 0,
    accuracy REAL DEFAULT 0.0,
    average_confidence REAL DEFAULT 0.0,
    weighted_accuracy REAL DEFAULT 0.0, -- Accuracy weighted by confidence
    brier_score REAL DEFAULT 0.0, -- Calibration metric
    log_loss REAL DEFAULT 0.0, -- Another calibration metric
    category_performance TEXT, -- JSON object with per-category metrics
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trust scores table: Calculated trust scores for models
CREATE TABLE IF NOT EXISTS trust_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name TEXT NOT NULL,
    category TEXT,
    trust_score REAL NOT NULL,
    confidence_weight REAL DEFAULT 1.0,
    accuracy_weight REAL DEFAULT 1.0,
    calibration_weight REAL DEFAULT 1.0,
    recency_weight REAL DEFAULT 1.0,
    calculation_method TEXT NOT NULL,
    calculation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT, -- JSON object with calculation details
    FOREIGN KEY (model_name) REFERENCES model_performance (model_name)
);

-- Event categories table: Reference table for categories
CREATE TABLE IF NOT EXISTS categories (
    category_id TEXT PRIMARY KEY,
    category_name TEXT NOT NULL,
    description TEXT,
    weight REAL DEFAULT 1.0, -- Weight for trust score calculation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT OR IGNORE INTO categories (category_id, category_name, description, weight) VALUES
('sports', 'Sports', 'Sports predictions including games, tournaments, and championships', 1.0),
('economics', 'Economics', 'Economic predictions including market movements, indicators, and policy outcomes', 1.2),
('crypto', 'Crypto', 'Cryptocurrency predictions including price movements and market trends', 1.1);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_predictions_event_id ON predictions(event_id);
CREATE INDEX IF NOT EXISTS idx_predictions_model_name ON predictions(model_name);
CREATE INDEX IF NOT EXISTS idx_predictions_is_correct ON predictions(is_correct);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_resolved_date ON events(resolved_date);
CREATE INDEX IF NOT EXISTS idx_trust_scores_model_name ON trust_scores(model_name);
CREATE INDEX IF NOT EXISTS idx_trust_scores_category ON trust_scores(category);
CREATE INDEX IF NOT EXISTS idx_trust_scores_calculation_date ON trust_scores(calculation_date);

-- Views for common queries

-- View: Model accuracy by category
CREATE VIEW IF NOT EXISTS model_accuracy_by_category AS
SELECT 
    p.model_name,
    e.category,
    COUNT(*) as total_predictions,
    SUM(CASE WHEN p.is_correct THEN 1 ELSE 0 END) as correct_predictions,
    ROUND(AVG(CASE WHEN p.is_correct THEN 1.0 ELSE 0.0 END), 4) as accuracy,
    ROUND(AVG(p.confidence_score), 4) as avg_confidence,
    ROUND(AVG(p.probability), 4) as avg_probability
FROM predictions p
JOIN events e ON p.event_id = e.event_id
GROUP BY p.model_name, e.category;

-- View: Recent model performance (last 30 days)
CREATE VIEW IF NOT EXISTS recent_model_performance AS
SELECT 
    p.model_name,
    COUNT(*) as recent_predictions,
    SUM(CASE WHEN p.is_correct THEN 1 ELSE 0 END) as recent_correct,
    ROUND(AVG(CASE WHEN p.is_correct THEN 1.0 ELSE 0.0 END), 4) as recent_accuracy,
    ROUND(AVG(p.confidence_score), 4) as recent_avg_confidence
FROM predictions p
JOIN events e ON p.event_id = e.event_id
WHERE e.resolved_date >= date('now', '-30 days')
GROUP BY p.model_name;

-- View: Trust leaderboard
CREATE VIEW IF NOT EXISTS trust_leaderboard AS
SELECT 
    ts.model_name,
    ts.category,
    ts.trust_score,
    mp.total_predictions,
    mp.accuracy,
    mp.average_confidence,
    ts.calculation_date
FROM trust_scores ts
JOIN model_performance mp ON ts.model_name = mp.model_name
WHERE ts.calculation_date = (
    SELECT MAX(calculation_date) 
    FROM trust_scores ts2 
    WHERE ts2.model_name = ts.model_name 
    AND (ts.category IS NULL OR ts2.category = ts.category)
)
ORDER BY ts.trust_score DESC;

-- Triggers for maintaining data integrity

-- Trigger: Update model performance when new predictions are added
CREATE TRIGGER IF NOT EXISTS update_model_performance_after_insert
AFTER INSERT ON predictions
BEGIN
    INSERT OR REPLACE INTO model_performance (
        model_name,
        total_predictions,
        correct_predictions,
        accuracy,
        average_confidence,
        weighted_accuracy,
        brier_score,
        log_loss,
        last_updated
    )
    SELECT 
        NEW.model_name,
        COUNT(*),
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END),
        ROUND(AVG(CASE WHEN is_correct THEN 1.0 ELSE 0.0 END), 4),
        ROUND(AVG(confidence_score), 4),
        ROUND(SUM(CASE WHEN is_correct THEN confidence_score ELSE 0.0 END) / SUM(confidence_score), 4),
        ROUND(AVG((probability - CASE WHEN is_correct THEN 1.0 ELSE 0.0 END) * (probability - CASE WHEN is_correct THEN 1.0 ELSE 0.0 END)), 4),
        ROUND(-AVG(CASE WHEN is_correct THEN LN(probability) ELSE LN(1.0 - probability) END), 4),
        CURRENT_TIMESTAMP
    FROM predictions 
    WHERE model_name = NEW.model_name;
END;

-- Trigger: Update events prediction count
CREATE TRIGGER IF NOT EXISTS update_event_prediction_count
AFTER INSERT ON predictions
BEGIN
    UPDATE events 
    SET total_predictions = (
        SELECT COUNT(*) 
        FROM predictions 
        WHERE event_id = NEW.event_id
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE event_id = NEW.event_id;
END;

-- Trigger: Update timestamps
CREATE TRIGGER IF NOT EXISTS update_events_timestamp
AFTER UPDATE ON events
BEGIN
    UPDATE events SET updated_at = CURRENT_TIMESTAMP WHERE event_id = NEW.event_id;
END;
