// core/database/migrate.js - Database Migration Script
require('dotenv').config();

const db = require('./connection');
const winston = require('winston');

// Setup logger for migrations
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

class DatabaseMigrator {
  constructor() {
    this.migrations = [];
  }

  // Add migration tracking table
  async createMigrationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    try {
      await db.query(query);
      logger.info('Migrations tracking table created');
    } catch (error) {
      logger.error('Failed to create migrations table:', error);
      throw error;
    }
  }

  // Check if migration has been applied
  async isMigrationApplied(version) {
    const query = 'SELECT version FROM schema_migrations WHERE version = $1';
    const result = await db.query(query, [version]);
    return result.rows.length > 0;
  }

  // Mark migration as applied
  async markMigrationApplied(version) {
    const query = 'INSERT INTO schema_migrations (version) VALUES ($1)';
    await db.query(query, [version]);
    logger.info(`Migration ${version} marked as applied`);
  }

  // Run initial schema migration
  async runInitialSchemaMigration() {
    const version = '001_initial_schema';
    
    if (await this.isMigrationApplied(version)) {
      logger.info(`Migration ${version} already applied, skipping`);
      return;
    }

    logger.info(`Running migration: ${version}`);
    
    try {
      await db.runMigrations();
      await this.markMigrationApplied(version);
      logger.info(`✅ Migration ${version} completed successfully`);
    } catch (error) {
      logger.error(`❌ Migration ${version} failed:`, error);
      throw error;
    }
  }

  // Add sample data for development
  async addSampleData() {
    const version = '002_sample_data';
    
    if (await this.isMigrationApplied(version)) {
      logger.info(`Migration ${version} already applied, skipping`);
      return;
    }

    logger.info(`Running migration: ${version}`);

    try {
      // Insert sample agents
      const sampleAgents = [
        {
          name: 'AlphaSeer',
          type: 'sports',
          coral_agent_id: 'coral_alpha_001',
          public_key: 'sample_public_key_alpha',
          specialization_domains: ['nfl', 'nba', 'soccer']
        },
        {
          name: 'PolicyOracle',
          type: 'politics',
          coral_agent_id: 'coral_policy_001',
          public_key: 'sample_public_key_policy',
          specialization_domains: ['elections', 'legislation', 'polls']
        },
        {
          name: 'EconoBot',
          type: 'economics',
          coral_agent_id: 'coral_econo_001',
          public_key: 'sample_public_key_econo',
          specialization_domains: ['stocks', 'crypto', 'forex']
        },
        {
          name: 'MetaAnalyzer',
          type: 'meta',
          coral_agent_id: 'coral_meta_001',
          public_key: 'sample_public_key_meta',
          specialization_domains: ['prediction_accuracy', 'trust_analysis', 'bias_detection']
        }
      ];

      for (const agent of sampleAgents) {
        await db.createAgent(agent);
        logger.info(`Created sample agent: ${agent.name}`);
      }

      await this.markMigrationApplied(version);
      logger.info(`✅ Migration ${version} completed successfully`);
    } catch (error) {
      logger.error(`❌ Migration ${version} failed:`, error);
      throw error;
    }
  }

  // Run all pending migrations
  async runAllMigrations() {
    try {
      logger.info('🚀 Starting database migrations...');
      
      // Create migrations tracking table
      await this.createMigrationsTable();
      
      // Run migrations in order
      await this.runInitialSchemaMigration();
      
      // Only add sample data in development
      if (process.env.NODE_ENV === 'development') {
        await this.addSampleData();
      }
      
      logger.info('✅ All migrations completed successfully');
    } catch (error) {
      logger.error('❌ Migration process failed:', error);
      throw error;
    }
  }

  // Reset database (use with caution!)
  async resetDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Database reset not allowed in production!');
    }

    logger.warn('⚠️  Resetting database...');
    
    try {
      // Drop all tables in reverse dependency order
      const dropQueries = [
        'DROP TABLE IF EXISTS voice_verifications CASCADE;',
        'DROP TABLE IF EXISTS agent_communications CASCADE;',
        'DROP TABLE IF EXISTS agent_private_keys CASCADE;',
        'DROP TABLE IF EXISTS trust_scores CASCADE;',
        'DROP TABLE IF EXISTS predictions CASCADE;',
        'DROP TABLE IF EXISTS agents CASCADE;',
        'DROP TABLE IF EXISTS schema_migrations CASCADE;',
        'DROP VIEW IF EXISTS agent_performance_summary CASCADE;',
        'DROP VIEW IF EXISTS recent_agent_activity CASCADE;'
      ];

      for (const query of dropQueries) {
        await db.query(query);
      }

      logger.info('Database reset completed');
      
      // Run migrations again
      await this.runAllMigrations();
    } catch (error) {
      logger.error('Database reset failed:', error);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const migrator = new DatabaseMigrator();
  const command = process.argv[2];

  try {
    switch (command) {
      case 'up':
        await migrator.runAllMigrations();
        break;
      case 'reset':
        await migrator.resetDatabase();
        break;
      case 'sample':
        await migrator.addSampleData();
        break;
      default:
        console.log('Usage: node migrate.js [up|reset|sample]');
        console.log('  up     - Run pending migrations');
        console.log('  reset  - Reset database and run migrations (dev only)');
        console.log('  sample - Add sample data (dev only)');
        process.exit(1);
    }
    
    await db.close();
    logger.info('Database connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    await db.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = DatabaseMigrator;