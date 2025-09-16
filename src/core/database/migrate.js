const fs = require('fs').promises;
const path = require('path');
const db = require('./connection');

async function runMigrations() {
    console.log('🚀 Starting database migration...');
    
    try {
        // Read the schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = await fs.readFile(schemaPath, 'utf8');
        
        // Split schema into individual statements
        const statements = schema
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📝 Found ${statements.length} SQL statements to execute`);
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement) {
                try {
                    await db.query(statement);
                    if (statement.includes('CREATE TABLE')) {
                        const tableName = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i)?.[1];
                        console.log(`✅ Created table: ${tableName}`);
                    } else if (statement.includes('CREATE INDEX')) {
                        const indexName = statement.match(/CREATE INDEX (?:IF NOT EXISTS )?(\w+)/i)?.[1];
                        console.log(`✅ Created index: ${indexName}`);
                    } else if (statement.includes('CREATE EXTENSION')) {
                        const extensionName = statement.match(/CREATE EXTENSION (?:IF NOT EXISTS )?"([^"]+)"/i)?.[1];
                        console.log(`✅ Created extension: ${extensionName}`);
                    } else if (statement.includes('CREATE OR REPLACE FUNCTION')) {
                        const functionName = statement.match(/CREATE OR REPLACE FUNCTION (\w+)/i)?.[1];
                        console.log(`✅ Created function: ${functionName}`);
                    } else if (statement.includes('CREATE TRIGGER')) {
                        const triggerName = statement.match(/CREATE TRIGGER (\w+)/i)?.[1];
                        console.log(`✅ Created trigger: ${triggerName}`);
                    }
                } catch (error) {
                    console.error(`❌ Error executing statement ${i + 1}:`, error.message);
                    console.error('Statement:', statement.substring(0, 100) + '...');
                }
            }
        }
        
        // Verify tables were created
        const result = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('\n📊 Database tables created:');
        result.rows.forEach(row => {
            console.log(`  • ${row.table_name}`);
        });
        
        console.log('\n🎉 Database migration completed successfully!');
        
    } catch (error) {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    }
}

// Run migration if called directly
if (require.main === module) {
    runMigrations()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Migration error:', error);
            process.exit(1);
        });
}

module.exports = { runMigrations };