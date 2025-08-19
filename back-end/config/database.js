const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database configuration
const getDatabasePath = () => {
  // Use environment variable if provided, otherwise default path
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
    return process.env.DATABASE_URL;
  }
  return path.join(__dirname, '..', 'database.sqlite');
};

const dbPath = getDatabasePath();

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`📁 Created database directory: ${dbDir}`);
}

// Database connection with retry logic
const createDatabaseConnection = (retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Attempting database connection (attempt ${attempt}/${retries})`);
      
      const db = new Database(dbPath, {
        verbose: process.env.NODE_ENV === 'development' ? console.log : null,
        fileMustExist: false
      });

      // Configure database for production
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
      db.pragma('synchronous = NORMAL');
      db.pragma('cache_size = 1000');
      db.pragma('temp_store = memory');
      
      // Test connection
      db.prepare('SELECT 1').get();
      
      console.log(`✅ Database connected successfully: ${dbPath}`);
      return db;
      
    } catch (error) {
      console.error(`❌ Database connection attempt ${attempt} failed:`, error.message);
      
      if (attempt === retries) {
        console.error('💥 All database connection attempts failed');
        throw new Error(`Failed to connect to database after ${retries} attempts: ${error.message}`);
      }
      
      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      
      // Synchronous delay for simplicity
      const start = Date.now();
      while (Date.now() - start < delay) {
        // Busy wait
      }
    }
  }
};

// Initialize database connection
const db = createDatabaseConnection();

// Add connection monitoring
db.on = db.on || function() {}; // Fallback for older versions

// Graceful shutdown handler
process.on('SIGINT', () => {
  console.log('🔄 Closing database connection...');
  try {
    db.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database:', error.message);
  }
});

process.on('SIGTERM', () => {
  console.log('🔄 Closing database connection...');
  try {
    db.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database:', error.message);
  }
});

// Create tables if they don't exist
const initDatabase = () => {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      userType TEXT NOT NULL CHECK(userType IN ('user', 'hospital-authority', 'admin')),
      hospital_id INTEGER,
      can_add_hospital BOOLEAN DEFAULT 1,
      isActive BOOLEAN DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (hospital_id) REFERENCES hospitals (id)
    )
  `);

  // Hospital authorities table (extends users)
  db.exec(`
    CREATE TABLE IF NOT EXISTS hospital_authorities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      hospitalId INTEGER,
      role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'staff')),
      permissions TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (hospitalId) REFERENCES hospitals (id) ON DELETE CASCADE
    )
  `);

  // Hospitals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS hospitals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'General',
      street TEXT,
      city TEXT,
      state TEXT,
      zipCode TEXT,
      country TEXT,
      phone TEXT,
      email TEXT,
      emergency TEXT,
      total_beds INTEGER DEFAULT 0,
      icu_beds INTEGER DEFAULT 0,
      operation_theaters INTEGER DEFAULT 0,
      approval_status TEXT DEFAULT 'pending' CHECK(approval_status IN ('pending', 'approved', 'rejected')),
      approved_by INTEGER,
      approved_at DATETIME,
      rejection_reason TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      rating REAL DEFAULT 0,
      isActive BOOLEAN DEFAULT 1,
      lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (approved_by) REFERENCES users (id)
    )
  `);

  // Surgeons table
  db.exec(`
    CREATE TABLE IF NOT EXISTS surgeons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hospitalId INTEGER,
      name TEXT NOT NULL,
      specialization TEXT,
      available BOOLEAN DEFAULT 1,
      scheduleDays TEXT,
      scheduleHours TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (hospitalId) REFERENCES hospitals (id) ON DELETE CASCADE
    )
  `);

  // Enhanced Hospital resources table
  db.exec(`
    CREATE TABLE IF NOT EXISTS hospital_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hospitalId INTEGER NOT NULL,
      resourceType TEXT NOT NULL CHECK(resourceType IN ('beds', 'icu', 'operationTheatres')),
      total INTEGER DEFAULT 0 CHECK(total >= 0),
      available INTEGER DEFAULT 0 CHECK(available >= 0),
      occupied INTEGER DEFAULT 0 CHECK(occupied >= 0),
      reserved INTEGER DEFAULT 0 CHECK(reserved >= 0),
      maintenance INTEGER DEFAULT 0 CHECK(maintenance >= 0),
      lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedBy INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (hospitalId) REFERENCES hospitals (id) ON DELETE CASCADE,
      FOREIGN KEY (updatedBy) REFERENCES users (id),
      UNIQUE(hospitalId, resourceType),
      CHECK(total >= (occupied + reserved + maintenance))
    )
  `);

  // Hospital services table
  db.exec(`
    CREATE TABLE IF NOT EXISTS hospital_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hospitalId INTEGER,
      service TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (hospitalId) REFERENCES hospitals (id) ON DELETE CASCADE
    )
  `);

  // Enhanced Bookings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      hospitalId INTEGER NOT NULL,
      resourceType TEXT NOT NULL CHECK(resourceType IN ('beds', 'icu', 'operationTheatres')),
      
      -- Patient Information
      patientName TEXT NOT NULL,
      patientAge INTEGER NOT NULL CHECK(patientAge > 0 AND patientAge <= 150),
      patientGender TEXT NOT NULL CHECK(patientGender IN ('male', 'female', 'other')),
      medicalCondition TEXT NOT NULL,
      urgency TEXT DEFAULT 'medium' CHECK(urgency IN ('low', 'medium', 'high', 'critical')),
      
      -- Emergency Contact
      emergencyContactName TEXT NOT NULL,
      emergencyContactPhone TEXT NOT NULL,
      emergencyContactRelationship TEXT NOT NULL,
      
      -- Scheduling
      scheduledDate DATETIME NOT NULL,
      estimatedDuration INTEGER DEFAULT 24 CHECK(estimatedDuration > 0),
      
      -- Status Management
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'declined', 'cancelled', 'completed')),
      
      -- Approval Information
      approvedBy INTEGER,
      approvedAt DATETIME,
      authorityNotes TEXT,
      declineReason TEXT,
      
      -- Booking Reference
      bookingReference TEXT UNIQUE,
      
      -- Payment Information (simplified for university project)
      paymentAmount REAL DEFAULT 0,
      paymentStatus TEXT DEFAULT 'pending' CHECK(paymentStatus IN ('pending', 'paid', 'refunded')),
      paymentMethod TEXT,
      transactionId TEXT,
      
      -- Additional Notes
      notes TEXT,
      
      -- Timestamps
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (userId) REFERENCES users (id),
      FOREIGN KEY (hospitalId) REFERENCES hospitals (id),
      FOREIGN KEY (approvedBy) REFERENCES users (id)
    )
  `);

  // Blood requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS blood_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requesterId INTEGER NOT NULL,
      requesterName TEXT NOT NULL,
      requesterPhone TEXT NOT NULL,
      bloodType TEXT NOT NULL,
      units INTEGER NOT NULL,
      urgency TEXT DEFAULT 'medium',
      hospitalName TEXT,
      hospitalAddress TEXT,
      hospitalContact TEXT,
      patientName TEXT,
      patientAge INTEGER,
      medicalCondition TEXT,
      requiredBy DATETIME NOT NULL,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requesterId) REFERENCES users (id)
    )
  `);

  // Matched donors table
  db.exec(`
    CREATE TABLE IF NOT EXISTS matched_donors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bloodRequestId INTEGER,
      donorId INTEGER NOT NULL,
      donorName TEXT NOT NULL,
      donorPhone TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      matchedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bloodRequestId) REFERENCES blood_requests (id) ON DELETE CASCADE,
      FOREIGN KEY (donorId) REFERENCES users (id)
    )
  `);

  // Financial Tables

  // Transactions table for payment processing
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bookingId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      hospitalId INTEGER NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      serviceCharge DECIMAL(10,2) NOT NULL,
      hospitalAmount DECIMAL(10,2) NOT NULL,
      paymentMethod TEXT NOT NULL,
      transactionId TEXT UNIQUE,
      status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'failed', 'refunded')),
      paymentData TEXT,
      processedAt DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bookingId) REFERENCES bookings (id),
      FOREIGN KEY (userId) REFERENCES users (id),
      FOREIGN KEY (hospitalId) REFERENCES hospitals (id)
    )
  `);

  // Hospital pricing table for resource rate management
  db.exec(`
    CREATE TABLE IF NOT EXISTS hospital_pricing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hospitalId INTEGER NOT NULL,
      resourceType TEXT NOT NULL CHECK(resourceType IN ('beds', 'icu', 'operationTheatres')),
      baseRate DECIMAL(10,2) NOT NULL,
      hourlyRate DECIMAL(10,2),
      minimumCharge DECIMAL(10,2),
      maximumCharge DECIMAL(10,2),
      currency TEXT DEFAULT 'USD',
      effectiveFrom DATETIME DEFAULT CURRENT_TIMESTAMP,
      effectiveTo DATETIME,
      isActive BOOLEAN DEFAULT 1,
      createdBy INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (hospitalId) REFERENCES hospitals (id) ON DELETE CASCADE,
      FOREIGN KEY (createdBy) REFERENCES users (id),
      UNIQUE(hospitalId, resourceType, effectiveFrom)
    )
  `);

  // User balances table for revenue tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      userType TEXT NOT NULL CHECK(userType IN ('hospital-authority', 'admin')),
      hospitalId INTEGER,
      currentBalance DECIMAL(12,2) DEFAULT 0.00,
      totalEarnings DECIMAL(12,2) DEFAULT 0.00,
      totalWithdrawals DECIMAL(12,2) DEFAULT 0.00,
      pendingAmount DECIMAL(12,2) DEFAULT 0.00,
      lastTransactionAt DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (hospitalId) REFERENCES hospitals (id),
      UNIQUE(userId, hospitalId)
    )
  `);

  // Balance transactions table for audit trails
  db.exec(`
    CREATE TABLE IF NOT EXISTS balance_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      balanceId INTEGER NOT NULL,
      transactionId INTEGER,
      transactionType TEXT NOT NULL CHECK(transactionType IN ('payment_received', 'service_charge', 'refund_processed', 'withdrawal', 'adjustment')),
      amount DECIMAL(10,2) NOT NULL,
      balanceBefore DECIMAL(12,2) NOT NULL,
      balanceAfter DECIMAL(12,2) NOT NULL,
      description TEXT,
      referenceId TEXT,
      processedBy INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (balanceId) REFERENCES user_balances (id) ON DELETE CASCADE,
      FOREIGN KEY (transactionId) REFERENCES transactions (id),
      FOREIGN KEY (processedBy) REFERENCES users (id)
    )
  `);

  // Payment configuration table for hospital policies
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hospitalId INTEGER,
      serviceChargeRate DECIMAL(5,4) DEFAULT 0.0500,
      cancellationWindow INTEGER DEFAULT 24,
      refundPercentage DECIMAL(5,4) DEFAULT 0.8000,
      minimumBookingAmount DECIMAL(10,2) DEFAULT 10.00,
      paymentMethods TEXT,
      cancellationPolicy TEXT,
      refundPolicy TEXT,
      isActive BOOLEAN DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (hospitalId) REFERENCES hospitals (id)
    )
  `);

  // Booking Status History table for audit trail
  db.exec(`
    CREATE TABLE IF NOT EXISTS booking_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bookingId INTEGER NOT NULL,
      oldStatus TEXT,
      newStatus TEXT NOT NULL,
      changedBy INTEGER,
      reason TEXT,
      notes TEXT,
      changedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (bookingId) REFERENCES bookings (id) ON DELETE CASCADE,
      FOREIGN KEY (changedBy) REFERENCES users (id)
    )
  `);

  // Booking Notifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS booking_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      bookingId INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('booking_submitted', 'booking_approved', 'booking_declined', 'booking_cancelled', 'booking_completed')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      isRead BOOLEAN DEFAULT FALSE,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (userId) REFERENCES users (id),
      FOREIGN KEY (bookingId) REFERENCES bookings (id) ON DELETE CASCADE
    )
  `);

  // Resource Audit Log table
  db.exec(`
    CREATE TABLE IF NOT EXISTS resource_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hospitalId INTEGER NOT NULL,
      resourceType TEXT NOT NULL,
      actionType TEXT NOT NULL CHECK(actionType IN ('manual_update', 'booking_approval', 'booking_completion', 'booking_cancellation')),
      oldValue INTEGER,
      newValue INTEGER,
      quantity INTEGER,
      bookingId INTEGER,
      performedBy INTEGER NOT NULL,
      reason TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (hospitalId) REFERENCES hospitals (id),
      FOREIGN KEY (bookingId) REFERENCES bookings (id),
      FOREIGN KEY (performedBy) REFERENCES users (id)
    )
  `);

  // Create indexes for better performance
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(userId);
      CREATE INDEX IF NOT EXISTS idx_bookings_hospital_id ON bookings(hospitalId);
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
      CREATE INDEX IF NOT EXISTS idx_bookings_urgency ON bookings(urgency);
      CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_date ON bookings(scheduledDate);
      CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking_id ON booking_status_history(bookingId);
      CREATE INDEX IF NOT EXISTS idx_booking_notifications_user_id ON booking_notifications(userId);
      CREATE INDEX IF NOT EXISTS idx_booking_notifications_booking_id ON booking_notifications(bookingId);
      CREATE INDEX IF NOT EXISTS idx_booking_notifications_is_read ON booking_notifications(isRead);
      CREATE INDEX IF NOT EXISTS idx_hospital_resources_hospital_id ON hospital_resources(hospitalId);
      CREATE INDEX IF NOT EXISTS idx_hospital_resources_type ON hospital_resources(resourceType);
      CREATE INDEX IF NOT EXISTS idx_resource_audit_log_hospital_id ON resource_audit_log(hospitalId);
      CREATE INDEX IF NOT EXISTS idx_resource_audit_log_booking_id ON resource_audit_log(bookingId);
    `);
    
    // Create bookingReference index
    db.exec(`CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(bookingReference);`);
  } catch (error) {
    console.error('Error creating indexes:', error.message);
  }

  console.log('Database tables and indexes created successfully');
};

// Database health check function
const checkDatabaseHealth = () => {
  try {
    // Test basic connectivity
    const result = db.prepare('SELECT 1 as test').get();
    
    // Check integrity
    const integrity = db.pragma('integrity_check');
    
    // Get database info
    const info = {
      connected: !!result,
      integrity: integrity[0]?.integrity_check === 'ok',
      path: dbPath,
      size: fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0,
      mode: db.pragma('journal_mode', { simple: true }),
      foreign_keys: db.pragma('foreign_keys', { simple: true })
    };
    
    return info;
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      path: dbPath
    };
  }
};

// Database backup function (for production)
const createBackup = (backupPath) => {
  try {
    if (!backupPath) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      backupPath = path.join(path.dirname(dbPath), `database-backup-${timestamp}.sqlite`);
    }
    
    console.log(`🔄 Creating database backup: ${backupPath}`);
    
    // Use SQLite backup API
    const backup = db.backup(backupPath);
    
    console.log(`✅ Database backup created: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error('❌ Database backup failed:', error.message);
    throw error;
  }
};

// Initialize database on module load
try {
  initDatabase();
  
  // Log database status
  const health = checkDatabaseHealth();
  if (health.connected && health.integrity) {
    console.log('✅ Database initialized and healthy');
  } else {
    console.warn('⚠️  Database initialized but health check failed:', health);
  }
  
  // Create backup in production on startup
  if (process.env.NODE_ENV === 'production' && process.env.CREATE_STARTUP_BACKUP === 'true') {
    try {
      createBackup();
    } catch (error) {
      console.warn('⚠️  Startup backup failed:', error.message);
    }
  }
  
} catch (error) {
  console.error('💥 Database initialization failed:', error.message);
  throw error;
}

// Export database and utility functions
module.exports = {
  db,
  checkDatabaseHealth,
  createBackup,
  dbPath
};

// For backward compatibility, also export db as default
module.exports.default = db; 