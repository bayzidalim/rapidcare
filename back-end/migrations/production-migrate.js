#!/usr/bin/env node

/**
 * Production Database Migration Script
 * 
 * This script handles database migrations for production environments
 * with proper error handling, rollback capabilities, and logging.
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

class ProductionMigrator {
  constructor(options = {}) {
    this.dbPath = options.dbPath || path.join(__dirname, '..', 'database.sqlite');
    this.migrationsDir = options.migrationsDir || __dirname;
    this.backupDir = options.backupDir || path.join(__dirname, '..', 'backups');
    this.logFile = options.logFile || path.join(__dirname, '..', 'logs', 'migration.log');
    this.dryRun = options.dryRun || false;
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.backupDir, path.dirname(this.logFile)].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}\n`;
    
    console.log(logMessage.trim());
    fs.appendFileSync(this.logFile, logMessage);
  }

  async createBackup() {
    if (!fs.existsSync(this.dbPath)) {
      this.log('Database file does not exist, skipping backup', 'WARN');
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `database-backup-${timestamp}.sqlite`);
    
    try {
      fs.copyFileSync(this.dbPath, backupPath);
      this.log(`Database backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      this.log(`Failed to create backup: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async restoreBackup(backupPath) {
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    try {
      fs.copyFileSync(backupPath, this.dbPath);
      this.log(`Database restored from backup: ${backupPath}`);
    } catch (error) {
      this.log(`Failed to restore backup: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async initializeDatabase() {
    const db = new Database(this.dbPath);
    
    try {
      // Enable foreign key constraints
      db.pragma('foreign_keys = ON');
      
      // Set journal mode for better performance
      db.pragma('journal_mode = WAL');
      
      // Create migrations table if it doesn't exist
      db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT UNIQUE NOT NULL,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          checksum TEXT,
          execution_time INTEGER
        )
      `);
      
      this.log('Database initialized successfully');
      return db;
    } catch (error) {
      db.close();
      throw error;
    }
  }

  calculateChecksum(content) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  async getMigrationFiles() {
    const files = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.js') && !file.includes('migrate') && !file.includes('production'))
      .sort();
    
    return files.map(file => {
      const filePath = path.join(this.migrationsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      return {
        filename: file,
        path: filePath,
        checksum: this.calculateChecksum(content)
      };
    });
  }

  async getExecutedMigrations(db) {
    try {
      return db.prepare('SELECT filename, checksum FROM migrations ORDER BY id').all();
    } catch (error) {
      this.log(`Error getting executed migrations: ${error.message}`, 'ERROR');
      return [];
    }
  }

  async executeMigration(db, migration) {
    const startTime = Date.now();
    
    try {
      this.log(`Executing migration: ${migration.filename}`);
      
      if (this.dryRun) {
        this.log(`DRY RUN: Would execute ${migration.filename}`, 'INFO');
        return;
      }

      // Load and execute migration
      const migrationModule = require(migration.path);
      
      if (typeof migrationModule.up !== 'function') {
        throw new Error(`Migration ${migration.filename} does not export an 'up' function`);
      }

      // Execute migration in transaction
      const transaction = db.transaction(() => {
        migrationModule.up(db);
        
        // Record migration execution
        db.prepare(`
          INSERT INTO migrations (filename, checksum, execution_time)
          VALUES (?, ?, ?)
        `).run(
          migration.filename,
          migration.checksum,
          Date.now() - startTime
        );
      });

      transaction();
      
      const executionTime = Date.now() - startTime;
      this.log(`Migration ${migration.filename} completed in ${executionTime}ms`);
      
    } catch (error) {
      this.log(`Migration ${migration.filename} failed: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async validateMigrations(db, migrations, executedMigrations) {
    const executedMap = new Map(executedMigrations.map(m => [m.filename, m.checksum]));
    const issues = [];

    for (const migration of migrations) {
      const executedChecksum = executedMap.get(migration.filename);
      
      if (executedChecksum && executedChecksum !== migration.checksum) {
        issues.push(`Migration ${migration.filename} has been modified after execution`);
      }
    }

    if (issues.length > 0) {
      this.log('Migration validation issues found:', 'ERROR');
      issues.forEach(issue => this.log(`  - ${issue}`, 'ERROR'));
      throw new Error('Migration validation failed');
    }

    this.log('Migration validation passed');
  }

  async runMigrations(options = {}) {
    let db;
    let backupPath;

    try {
      this.log('Starting production migration process');
      
      // Create backup
      if (!options.skipBackup) {
        backupPath = await this.createBackup();
      }

      // Initialize database
      db = await this.initializeDatabase();

      // Get migration files and executed migrations
      const migrations = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations(db);

      this.log(`Found ${migrations.length} migration files`);
      this.log(`Found ${executedMigrations.length} executed migrations`);

      // Validate existing migrations
      await this.validateMigrations(db, migrations, executedMigrations);

      // Find pending migrations
      const executedFilenames = new Set(executedMigrations.map(m => m.filename));
      const pendingMigrations = migrations.filter(m => !executedFilenames.has(m.filename));

      if (pendingMigrations.length === 0) {
        this.log('No pending migrations found');
        return { success: true, migrationsRun: 0 };
      }

      this.log(`Found ${pendingMigrations.length} pending migrations`);

      // Execute pending migrations
      for (const migration of pendingMigrations) {
        await this.executeMigration(db, migration);
      }

      // Verify database integrity
      const integrityCheck = db.pragma('integrity_check');
      if (integrityCheck[0].integrity_check !== 'ok') {
        throw new Error('Database integrity check failed after migrations');
      }

      this.log('Database integrity check passed');
      this.log(`Migration process completed successfully. ${pendingMigrations.length} migrations executed.`);

      return {
        success: true,
        migrationsRun: pendingMigrations.length,
        backupPath
      };

    } catch (error) {
      this.log(`Migration process failed: ${error.message}`, 'ERROR');

      // Attempt to restore backup if available
      if (backupPath && !this.dryRun) {
        try {
          this.log('Attempting to restore from backup...');
          if (db) db.close();
          await this.restoreBackup(backupPath);
          this.log('Database restored from backup');
        } catch (restoreError) {
          this.log(`Failed to restore backup: ${restoreError.message}`, 'ERROR');
        }
      }

      throw error;
    } finally {
      if (db) {
        db.close();
      }
    }
  }

  async rollbackMigration(migrationFilename) {
    let db;
    let backupPath;

    try {
      this.log(`Starting rollback for migration: ${migrationFilename}`);
      
      // Create backup
      backupPath = await this.createBackup();

      // Initialize database
      db = await this.initializeDatabase();

      // Check if migration was executed
      const executedMigration = db.prepare(
        'SELECT * FROM migrations WHERE filename = ?'
      ).get(migrationFilename);

      if (!executedMigration) {
        throw new Error(`Migration ${migrationFilename} was not found in executed migrations`);
      }

      // Load migration file
      const migrationPath = path.join(this.migrationsDir, migrationFilename);
      if (!fs.existsSync(migrationPath)) {
        throw new Error(`Migration file not found: ${migrationPath}`);
      }

      const migrationModule = require(migrationPath);
      
      if (typeof migrationModule.down !== 'function') {
        throw new Error(`Migration ${migrationFilename} does not export a 'down' function`);
      }

      if (this.dryRun) {
        this.log(`DRY RUN: Would rollback ${migrationFilename}`, 'INFO');
        return;
      }

      // Execute rollback in transaction
      const transaction = db.transaction(() => {
        migrationModule.down(db);
        
        // Remove migration record
        db.prepare('DELETE FROM migrations WHERE filename = ?').run(migrationFilename);
      });

      transaction();

      this.log(`Migration ${migrationFilename} rolled back successfully`);

      return { success: true, backupPath };

    } catch (error) {
      this.log(`Rollback failed: ${error.message}`, 'ERROR');

      // Attempt to restore backup if available
      if (backupPath && !this.dryRun) {
        try {
          this.log('Attempting to restore from backup...');
          if (db) db.close();
          await this.restoreBackup(backupPath);
          this.log('Database restored from backup');
        } catch (restoreError) {
          this.log(`Failed to restore backup: ${restoreError.message}`, 'ERROR');
        }
      }

      throw error;
    } finally {
      if (db) {
        db.close();
      }
    }
  }

  async getStatus() {
    let db;

    try {
      db = await this.initializeDatabase();
      
      const migrations = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations(db);
      
      const executedFilenames = new Set(executedMigrations.map(m => m.filename));
      const pendingMigrations = migrations.filter(m => !executedFilenames.has(m.filename));

      return {
        totalMigrations: migrations.length,
        executedMigrations: executedMigrations.length,
        pendingMigrations: pendingMigrations.length,
        pending: pendingMigrations.map(m => m.filename),
        executed: executedMigrations.map(m => ({
          filename: m.filename,
          executed_at: m.executed_at
        }))
      };

    } finally {
      if (db) {
        db.close();
      }
    }
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const migrator = new ProductionMigrator({
    dryRun: args.includes('--dry-run')
  });

  async function main() {
    try {
      switch (command) {
        case 'migrate':
          const result = await migrator.runMigrations({
            skipBackup: args.includes('--skip-backup')
          });
          console.log('Migration completed:', result);
          break;

        case 'rollback':
          const migrationFile = args[1];
          if (!migrationFile) {
            throw new Error('Migration filename required for rollback');
          }
          await migrator.rollbackMigration(migrationFile);
          break;

        case 'status':
          const status = await migrator.getStatus();
          console.log('Migration Status:');
          console.log(`  Total migrations: ${status.totalMigrations}`);
          console.log(`  Executed: ${status.executedMigrations}`);
          console.log(`  Pending: ${status.pendingMigrations}`);
          if (status.pending.length > 0) {
            console.log('  Pending migrations:');
            status.pending.forEach(m => console.log(`    - ${m}`));
          }
          break;

        default:
          console.log('Usage:');
          console.log('  node production-migrate.js migrate [--dry-run] [--skip-backup]');
          console.log('  node production-migrate.js rollback <migration-file> [--dry-run]');
          console.log('  node production-migrate.js status');
          process.exit(1);
      }
    } catch (error) {
      console.error('Migration failed:', error.message);
      process.exit(1);
    }
  }

  main();
}

module.exports = ProductionMigrator;