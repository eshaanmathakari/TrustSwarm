// core/database/connection.js
const { Pool } = require('pg');
const config = require('../../config/environment');

class DatabaseConnection {
    constructor() {
        this.pool = new Pool({
            connectionString: config.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            min: config.DB_POOL_MIN,
            max: config.DB_POOL_MAX,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        // Handle connection errors
        this.pool.on('error', (err, client) => {
            console.error('Unexpected error on idle client', err);
            process.exit(-1);
        });

        // Log successful connection
        this.pool.on('connect', () => {
            console.log('Connected to PostgreSQL database');
        });
    }

    async query(text, params) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(text, params);
            return result;
        } finally {
            client.release();
        }
    }

    async getClient() {
        return await this.pool.connect();
    }

    // Transaction support
    async withTransaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Health check method
    async healthCheck() {
        try {
            const result = await this.query('SELECT 1 as health');
            return { status: 'healthy', timestamp: new Date().toISOString() };
        } catch (error) {
            console.error('Database health check failed:', error);
            return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
        }
    }

    // Close all connections
    async close() {
        await this.pool.end();
    }

    // Migration runner
    async runMigrations() {
        const fs = require('fs');
        const path = require('path');
        
        try {
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            await this.query(schema);
            console.log('Database schema migrations completed successfully');
            return true;
        } catch (error) {
            console.error('Database migration failed:', error);
            throw error;
        }
    }

    // Agent-specific queries
    async createAgent(agentData) {
        const { name, type, coral_agent_id, public_key, specialization_domains } = agentData;
        const query = `
            INSERT INTO agents (name, type, coral_agent_id, public_key, specialization_domains)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await this.query(query, [name, type, coral_agent_id, public_key, specialization_domains]);
        return result.rows[0];
    }

    async getAgentById(agentId) {
        const query = 'SELECT * FROM agents WHERE id = $1';
        const result = await this.query(query, [agentId]);
        return result.rows[0];
    }

    async updateAgentTrustScore(agentId, trustScore) {
        const query = `
            UPDATE agents 
            SET trust_score = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `;
        const result = await this.query(query, [agentId, trustScore]);
        return result.rows[0];
    }

    // Prediction-specific queries
    async createPrediction(predictionData) {
        const { 
            agent_id, event_id, event_title, event_category, 
            predicted_probability, rationale, confidence_score, stake_amount 
        } = predictionData;
        
        const query = `
            INSERT INTO predictions (
                agent_id, event_id, event_title, event_category,
                predicted_probability, rationale, confidence_score, stake_amount
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        
        const result = await this.query(query, [
            agent_id, event_id, event_title, event_category,
            predicted_probability, rationale, confidence_score, stake_amount
        ]);
        
        return result.rows[0];
    }

    async resolvePrediction(predictionId, actualOutcome) {
        const query = `
            UPDATE predictions 
            SET 
                actual_outcome = $2,
                resolution_timestamp = NOW(),
                was_correct = (predicted_probability > 0.5 AND $2 = true) OR (predicted_probability <= 0.5 AND $2 = false),
                brier_score = CASE 
                    WHEN $2 = true THEN POWER(1 - predicted_probability, 2)
                    ELSE POWER(predicted_probability, 2)
                END
            WHERE id = $1
            RETURNING *
        `;
        const result = await this.query(query, [predictionId, actualOutcome]);
        return result.rows[0];
    }

    // Trust score calculation
    async calculateAgentTrustScore(agentId) {
        const query = `
            SELECT 
                AVG(brier_score) as avg_brier_score,
                COUNT(*) as prediction_count,
                COUNT(CASE WHEN was_correct = true THEN 1 END) as correct_count
            FROM predictions 
            WHERE agent_id = $1 AND actual_outcome IS NOT NULL
        `;
        
        const result = await this.query(query, [agentId]);
        const stats = result.rows[0];
        
        if (!stats.prediction_count || stats.prediction_count === 0) {
            return 0.5; // Default trust score
        }
        
        // Calculate trust score: inverse of Brier score (lower is better) + accuracy bonus
        const brierComponent = Math.max(0, 1 - (stats.avg_brier_score || 0.5));
        const accuracyComponent = (stats.correct_count || 0) / stats.prediction_count;
        const trustScore = (brierComponent * 0.7 + accuracyComponent * 0.3);
        
        return Math.min(1, Math.max(0, trustScore));
    }
}

module.exports = new DatabaseConnection();