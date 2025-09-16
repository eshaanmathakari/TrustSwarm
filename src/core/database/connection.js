const { Pool } = require('pg');
const config = require('../../config/environment');

class DatabaseConnection {
    constructor() {
        this.pool = new Pool({
            connectionString: config.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        // Handle pool errors
        this.pool.on('error', (err) => {
            console.error('Unexpected error on idle client', err);
            process.exit(-1);
        });

        // Test connection on startup
        this.testConnection();
    }

    async testConnection() {
        try {
            const client = await this.pool.connect();
            console.log('✅ Database connected successfully');
            const result = await client.query('SELECT NOW()');
            console.log('Database timestamp:', result.rows[0].now);
            client.release();
        } catch (err) {
            console.error('❌ Database connection error:', err);
            throw err;
        }
    }

    async query(text, params) {
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            if (config.LOG_LEVEL === 'debug') {
                console.log('Query executed:', { text, duration, rows: result.rowCount });
            }
            return result;
        } catch (error) {
            console.error('Database query error:', { text, params, error: error.message });
            throw error;
        }
    }

    async getClient() {
        return await this.pool.connect();
    }

    async transaction(callback) {
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

    async end() {
        await this.pool.end();
    }

    // Health check method
    async healthCheck() {
        try {
            const result = await this.query('SELECT 1 as health');
            return { status: 'healthy', timestamp: new Date() };
        } catch (error) {
            return { status: 'unhealthy', error: error.message, timestamp: new Date() };
        }
    }
}

module.exports = new DatabaseConnection();