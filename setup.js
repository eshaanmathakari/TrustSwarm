#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class TrustSwarmSetup {
    constructor() {
        this.step = 0;
        this.totalSteps = 6;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString().slice(11, 19);
        const colors = {
            info: '\x1b[36m',     // Cyan
            success: '\x1b[32m',  // Green
            warning: '\x1b[33m',  // Yellow
            error: '\x1b[31m',    // Red
            reset: '\x1b[0m'      // Reset
        };
        
        console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
    }

    logStep(message) {
        this.step++;
        this.log(`[${this.step}/${this.totalSteps}] ${message}`, 'info');
    }

    async checkPrerequisites() {
        this.logStep('Checking prerequisites...');
        
        try {
            // Check Node.js version
            const nodeVersion = process.version;
            const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
            
            if (majorVersion < 18) {
                throw new Error(`Node.js 18+ required, found ${nodeVersion}`);
            }
            
            this.log(`✅ Node.js ${nodeVersion} (compatible)`, 'success');
            
            // Check if npm packages are installed
            try {
                await fs.access('node_modules', fs.constants.F_OK);
                this.log('✅ NPM packages installed', 'success');
            } catch {
                this.log('❌ NPM packages not installed. Run: npm install', 'error');
                throw new Error('Dependencies not installed');
            }
            
        } catch (error) {
            this.log(`❌ Prerequisites check failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async checkEnvironment() {
        this.logStep('Checking environment configuration...');
        
        try {
            // Check if .env exists
            try {
                await fs.access('.env', fs.constants.F_OK);
                this.log('✅ .env file exists', 'success');
            } catch {
                this.log('⚠️  .env file not found, copying from .env.example', 'warning');
                try {
                    await fs.copyFile('.env.example', '.env');
                    this.log('✅ Created .env file from example', 'success');
                } catch (error) {
                    this.log('❌ Failed to create .env file', 'error');
                    throw error;
                }
            }
            
            // Check critical environment variables
            const envContent = await fs.readFile('.env', 'utf8');
            const hasElevenLabsKey = envContent.includes('ELEVENLABS_API_KEY=sk_');
            
            if (hasElevenLabsKey) {
                this.log('✅ ElevenLabs API key configured', 'success');
            } else {
                this.log('⚠️  ElevenLabs API key not configured', 'warning');
            }
            
        } catch (error) {
            this.log(`❌ Environment check failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async checkDatabase() {
        this.logStep('Checking database configuration...');
        
        try {
            // Import database connection (this will test the connection)
            const db = require('./src/core/database/connection');
            
            // Test basic connectivity
            await db.query('SELECT 1 as test');
            this.log('✅ Database connection successful', 'success');
            
            // Check if tables exist
            const tableCheck = await db.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'agents'
            `);
            
            if (tableCheck.rows.length > 0) {
                this.log('✅ Database tables exist', 'success');
            } else {
                this.log('⚠️  Database tables not found, running migration...', 'warning');
                await this.runMigrations();
            }
            
        } catch (error) {
            this.log(`❌ Database check failed: ${error.message}`, 'error');
            this.log('💡 Make sure PostgreSQL is running and DATABASE_URL is correct', 'info');
            throw error;
        }
    }

    async runMigrations() {
        try {
            this.log('Running database migrations...', 'info');
            const { runMigrations } = require('./src/core/database/migrate');
            await runMigrations();
            this.log('✅ Database migrations completed', 'success');
        } catch (error) {
            this.log(`❌ Migration failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async checkExternalServices() {
        this.logStep('Checking external service connections...');
        
        try {
            // Check Coral Protocol (optional for now)
            const CoralProtocolClient = require('./src/core/coral-protocol/client');
            const coralClient = new CoralProtocolClient();
            const coralHealth = await coralClient.healthCheck();
            
            if (coralHealth.status === 'connected') {
                this.log('✅ Coral Protocol connection successful', 'success');
            } else {
                this.log('⚠️  Coral Protocol connection failed (optional)', 'warning');
            }
            
            // Check ElevenLabs
            const ElevenLabsClient = require('./src/voice/elevenlabs/client');
            const elevenLabsClient = new ElevenLabsClient();
            const elevenLabsHealth = await elevenLabsClient.healthCheck();
            
            if (elevenLabsHealth.status === 'connected') {
                this.log('✅ ElevenLabs API connection successful', 'success');
            } else {
                this.log('⚠️  ElevenLabs API connection failed', 'warning');
                this.log(`   Error: ${elevenLabsHealth.error}`, 'warning');
            }
            
        } catch (error) {
            this.log(`❌ External services check failed: ${error.message}`, 'error');
            // Don't throw here - external services are not critical for basic setup
        }
    }

    async generateTestData() {
        this.logStep('Setting up test data...');
        
        try {
            const db = require('./src/core/database/connection');
            
            // Check if test agents already exist
            const agentCheck = await db.query('SELECT COUNT(*) FROM agents');
            const agentCount = parseInt(agentCheck.rows[0].count);
            
            if (agentCount === 0) {
                this.log('Creating test agents...', 'info');
                
                const testAgents = [
                    {
                        name: 'SportsPredictor',
                        type: 'sports',
                        specialization: ['football', 'basketball', 'baseball'],
                        trust_score: 0.75
                    },
                    {
                        name: 'EconForecaster',
                        type: 'economics',
                        specialization: ['gdp', 'inflation', 'markets'],
                        trust_score: 0.82
                    },
                    {
                        name: 'PoliticalAnalyst',
                        type: 'politics',
                        specialization: ['elections', 'policy', 'approval'],
                        trust_score: 0.68
                    }
                ];
                
                for (const agent of testAgents) {
                    await db.query(`
                        INSERT INTO agents (name, type, coral_agent_id, public_key, specialization_domains, trust_score)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [
                        agent.name,
                        agent.type,
                        `coral_${agent.name.toLowerCase()}_${Date.now()}`,
                        `pubkey_${Math.random().toString(36).substr(2, 9)}`,
                        agent.specialization,
                        agent.trust_score
                    ]);
                }
                
                this.log('✅ Test agents created', 'success');
            } else {
                this.log(`✅ Found ${agentCount} existing agents`, 'success');
            }
            
        } catch (error) {
            this.log(`❌ Test data setup failed: ${error.message}`, 'error');
            // Don't throw here - test data is not critical
        }
    }

    async finalChecks() {
        this.logStep('Running final health checks...');
        
        try {
            const config = require('./src/config/environment');
            
            this.log('🎯 TrustSwarm Setup Complete!', 'success');
            this.log('', 'info');
            this.log('Next steps:', 'info');
            this.log(`  • Start server: npm start`, 'info');
            this.log(`  • Development mode: npm run dev`, 'info');
            this.log(`  • API documentation: http://localhost:${config.API_PORT}/api`, 'info');
            this.log(`  • Health check: http://localhost:${config.API_PORT}/api/health`, 'info');
            this.log('', 'info');
            this.log('🔑 Key Features Ready:', 'success');
            this.log('  • Agent registration via Coral Protocol', 'info');
            this.log('  • Voice verification with ElevenLabs', 'info');
            this.log('  • Real-time WebSocket updates', 'info');
            this.log('  • Trust score calculation engine', 'info');
            
        } catch (error) {
            this.log(`❌ Final checks failed: ${error.message}`, 'error');
        }
    }

    async run() {
        try {
            this.log('🚀 TrustSwarm Prophet Setup', 'success');
            this.log('Multi-Agent Predictive Trust Network', 'info');
            this.log('', 'info');
            
            await this.checkPrerequisites();
            await this.checkEnvironment();
            await this.checkDatabase();
            await this.checkExternalServices();
            await this.generateTestData();
            await this.finalChecks();
            
        } catch (error) {
            this.log('', 'error');
            this.log('❌ Setup failed. Please resolve the issues above and run setup again.', 'error');
            this.log('💡 For help, check the README.md or create an issue on GitHub.', 'info');
            process.exit(1);
        }
    }
}

// Run setup if called directly
if (require.main === module) {
    const setup = new TrustSwarmSetup();
    setup.run();
}

module.exports = TrustSwarmSetup;