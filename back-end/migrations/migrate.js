const fs = require('fs');
const path = require('path');
const db = require('../config/database');

/**
 * Database Migration Runner
 * Manages and executes database migrations in order
 */

// Create migrations tracking table
const initMigrationsTable = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT UNIQUE NOT NULL,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// Get list of executed migrations
const getExecutedMigrations = () => {
  const stmt = db.prepare('SELECT filename FROM migrations ORDER BY id');
  return stmt.all().map(row => row.filename);
};

// Mark migration as executed
const markMigrationExecuted = (filename) => {
  const stmt = db.prepare('INSERT INTO migrations (filename) VALUES (?)');
  stmt.run(filename);
};

// Get all migration files
const getMigrationFiles = () => {
  const migrationsDir = __dirname;
  return fs.readdirSync(migrationsDir)
    .filter(file => file.match(/^\d+_.*\.js$/) && file !== 'migrate.js')
    .sort();
};

// Run pending migrations with production safety
const runMigrations = (options = {}) => {
  const { force = false, dryRun = false } = options;
  
  console.log('🔄 Starting database migrations...');
  
  if (dryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made');
  }
  
  try {
    // Initialize migrations table
    if (!dryRun) {
      initMigrationsTable();
    }
    
    // Get executed and available migrations
    const executedMigrations = dryRun ? [] : getExecutedMigrations();
    const migrationFiles = getMigrationFiles();
    
    // Find pending migrations
    const pendingMigrations = migrationFiles.filter(
      file => !executedMigrations.includes(file)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations found');
      return { success: true, migrationsRun: 0 };
    }
    
    console.log(`📋 Found ${pendingMigrations.length} pending migration(s):`);
    pendingMigrations.forEach(file => console.log(`  - ${file}`));
    
    // Production safety check
    if (process.env.NODE_ENV === 'production' && !force && !dryRun) {
      console.log('\n⚠️  Production environment detected');
      console.log('Migrations will run automatically. Set SKIP_MIGRATIONS=true to skip.');
      
      if (process.env.SKIP_MIGRATIONS === 'true') {
        console.log('🚫 Migrations skipped due to SKIP_MIGRATIONS=true');
        return { success: true, migrationsRun: 0, skipped: true };
      }
    }
    
    if (dryRun) {
      console.log('\n🧪 DRY RUN - Would execute these migrations:');
      pendingMigrations.forEach(file => console.log(`  ✓ ${file}`));
      return { success: true, migrationsRun: pendingMigrations.length, dryRun: true };
    }
    
    // Execute pending migrations
    let successCount = 0;
    for (const migrationFile of pendingMigrations) {
      console.log(`\n🔄 Executing migration: ${migrationFile}`);
      
      try {
        const migrationPath = path.join(__dirname, migrationFile);
        const migration = require(migrationPath);
        
        // Create a transaction for each migration
        const transaction = db.transaction(() => {
          // Execute the migration based on its exported function
          if (typeof migration.addFinancialTables === 'function') {
            migration.addFinancialTables();
          } else if (typeof migration.addResourceBookingManagement === 'function') {
            migration.addResourceBookingManagement();
          } else if (typeof migration.addNotificationSystem === 'function') {
            migration.addNotificationSystem();
          } else if (typeof migration.addBookingReference === 'function') {
            migration.addBookingReference(db);
          } else if (typeof migration.up === 'function') {
            migration.up(db);
          } else {
            throw new Error(`Migration ${migrationFile} does not export expected function`);
          }
          
          // Mark as executed
          markMigrationExecuted(migrationFile);
        });
        
        // Execute transaction
        transaction();
        
        console.log(`✅ Migration ${migrationFile} completed successfully`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Migration ${migrationFile} failed:`, error.message);
        console.error('Stack trace:', error.stack);
        
        // In production, continue with other migrations but log the failure
        if (process.env.NODE_ENV === 'production') {
          console.error(`⚠️  Continuing with remaining migrations...`);
          continue;
        } else {
          throw error;
        }
      }
    }
    
    console.log(`\n🎉 Migrations completed! ${successCount}/${pendingMigrations.length} successful`);
    
    return { 
      success: true, 
      migrationsRun: successCount, 
      totalMigrations: pendingMigrations.length 
    };
    
  } catch (error) {
    console.error('💥 Migration process failed:', error.message);
    
    if (process.env.NODE_ENV === 'production') {
      console.error('⚠️  Production migration failure - application may not function correctly');
      return { success: false, error: error.message };
    } else {
      process.exit(1);
    }
  }
};

// Rollback last migration (for development)
const rollbackLastMigration = () => {
  console.log('⚠️  Rollback functionality not implemented yet');
  console.log('For development, you can manually drop tables or restore from backup');
};

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'up':
    case undefined:
      runMigrations();
      break;
    case 'rollback':
      rollbackLastMigration();
      break;
    case 'status':
      initMigrationsTable();
      const executed = getExecutedMigrations();
      const available = getMigrationFiles();
      const pending = available.filter(file => !executed.includes(file));
      
      console.log('📊 Migration Status:');
      console.log(`  Executed: ${executed.length}`);
      console.log(`  Pending: ${pending.length}`);
      console.log(`  Total: ${available.length}`);
      
      if (pending.length > 0) {
        console.log('\n📋 Pending migrations:');
        pending.forEach(file => console.log(`  - ${file}`));
      }
      break;
    default:
      console.log('Usage: node migrate.js [up|rollback|status]');
      console.log('  up (default): Run pending migrations');
      console.log('  rollback: Rollback last migration');
      console.log('  status: Show migration status');
  }
}

module.exports = {
  runMigrations,
  rollbackLastMigration,
  getExecutedMigrations,
  getMigrationFiles
};