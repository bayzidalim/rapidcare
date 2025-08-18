# RapidCare Hospital Booking System - Database Schema Documentation

## Table of Contents
1. [Overview](#overview)
2. [Database Configuration](#database-configuration)
3. [Core Tables](#core-tables)
4. [Relationship Diagrams](#relationship-diagrams)
5. [Indexes and Performance](#indexes-and-performance)
6. [Data Types and Constraints](#data-types-and-constraints)
7. [Migration Scripts](#migration-scripts)
8. [Backup and Recovery](#backup-and-recovery)

## Overview

The RapidCare database uses SQLite for development and testing, with easy migration path to PostgreSQL or MySQL for production. The schema is designed to support hospital resource booking, user management, payment processing, and comprehensive audit trails.

### Database Engine
- **Development**: SQLite 3.x with better-sqlite3 driver
- **Production**: SQLite (upgradeable to PostgreSQL/MySQL)
- **Location**: `back-end/database.sqlite`

### Schema Version
Current Version: 1.10 (Migration 010)

## Database Configuration

### Connection Settings
```javascript
// config/database.js
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(dbPath);

// Enable foreign key constraints
db.pragma('foreign_keys = ON');

// Set journal mode for better performance
db.pragma('journal_mode = WAL');
```

### Performance Settings
```sql
-- Enable Write-Ahead Logging for better concurrency
PRAGMA journal_mode = WAL;

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Set cache size (in KB)
PRAGMA cache_size = 10000;

-- Set synchronous mode for better performance
PRAGMA synchronous = NORMAL;
```

## Core Tables

### Users Table
Stores user account information and authentication data.

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK(role IN ('user', 'hospital-authority', 'admin')),
  hospitalId INTEGER,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
  emailVerified BOOLEAN DEFAULT FALSE,
  phoneVerified BOOLEAN DEFAULT FALSE,
  lastLogin DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (hospitalId) REFERENCES hospitals (id)
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_hospital ON users(hospitalId);
```

### Hospitals Table
Stores hospital information and approval status.

```sql
CREATE TABLE hospitals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  website TEXT,
  description TEXT,
  specialties TEXT, -- JSON array of specialties
  facilities TEXT, -- JSON array of facilities
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'suspended')),
  approvedBy INTEGER,
  approvedAt DATETIME,
  rejectionReason TEXT,
  operatingHours TEXT, -- JSON object with operating hours
  emergencyContact TEXT,
  licenseNumber TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (approvedBy) REFERENCES users (id)
);

-- Indexes
CREATE INDEX idx_hospitals_status ON hospitals(status);
CREATE INDEX idx_hospitals_name ON hospitals(name);
CREATE INDEX idx_hospitals_approved ON hospitals(approvedBy);
```

### Hospital Resources Table
Tracks real-time resource availability for each hospital.

```sql
CREATE TABLE hospital_resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hospitalId INTEGER NOT NULL,
  resourceType TEXT NOT NULL CHECK(resourceType IN ('beds', 'icu', 'operationTheatres')),
  total INTEGER DEFAULT 0,
  available INTEGER DEFAULT 0,
  occupied INTEGER DEFAULT 0,
  reserved INTEGER DEFAULT 0,
  maintenance INTEGER DEFAULT 0,
  lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedBy INTEGER,
  
  FOREIGN KEY (hospitalId) REFERENCES hospitals (id) ON DELETE CASCADE,
  FOREIGN KEY (updatedBy) REFERENCES users (id),
  UNIQUE(hospitalId, resourceType)
);

-- Indexes
CREATE INDEX idx_resources_hospital ON hospital_resources(hospitalId);
CREATE INDEX idx_resources_type ON hospital_resources(resourceType);
CREATE INDEX idx_resources_available ON hospital_resources(available);
```

### Bookings Table
Main booking table storing all booking requests and their details.

```sql
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  hospitalId INTEGER NOT NULL,
  resourceType TEXT NOT NULL CHECK(resourceType IN ('beds', 'icu', 'operationTheatres')),
  
  -- Patient Information
  patientName TEXT NOT NULL,
  patientAge INTEGER NOT NULL,
  patientGender TEXT NOT NULL CHECK(patientGender IN ('male', 'female', 'other')),
  medicalCondition TEXT NOT NULL,
  urgency TEXT DEFAULT 'medium' CHECK(urgency IN ('low', 'medium', 'high', 'critical')),
  
  -- Emergency Contact
  emergencyContactName TEXT NOT NULL,
  emergencyContactPhone TEXT NOT NULL,
  emergencyContactRelationship TEXT NOT NULL,
  
  -- Scheduling
  scheduledDate DATETIME NOT NULL,
  estimatedDuration INTEGER DEFAULT 24, -- in hours
  
  -- Status Management
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'declined', 'cancelled', 'completed')),
  
  -- Approval Information
  approvedBy INTEGER,
  approvedAt DATETIME,
  authorityNotes TEXT,
  declineReason TEXT,
  
  -- Booking Reference
  bookingReference TEXT UNIQUE,
  
  -- Timestamps
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users (id),
  FOREIGN KEY (hospitalId) REFERENCES hospitals (id),
  FOREIGN KEY (approvedBy) REFERENCES users (id)
);

-- Indexes
CREATE INDEX idx_bookings_user ON bookings(userId);
CREATE INDEX idx_bookings_hospital ON bookings(hospitalId);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_urgency ON bookings(urgency);
CREATE INDEX idx_bookings_reference ON bookings(bookingReference);
CREATE INDEX idx_bookings_scheduled ON bookings(scheduledDate);
```

### Booking Status History Table
Tracks all status changes for complete audit trail.

```sql
CREATE TABLE booking_status_history (
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
);

-- Indexes
CREATE INDEX idx_status_history_booking ON booking_status_history(bookingId);
CREATE INDEX idx_status_history_changed ON booking_status_history(changedAt);
```

### Booking Notifications Table
Stores notifications for booking-related events.

```sql
CREATE TABLE booking_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  bookingId INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('booking_submitted', 'booking_approved', 'booking_declined', 'booking_cancelled', 'booking_completed')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  isRead BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users (id),
  FOREIGN KEY (bookingId) REFERENCES bookings (id)
);

-- Indexes
CREATE INDEX idx_notifications_user ON booking_notifications(userId);
CREATE INDEX idx_notifications_booking ON booking_notifications(bookingId);
CREATE INDEX idx_notifications_read ON booking_notifications(isRead);
CREATE INDEX idx_notifications_created ON booking_notifications(createdAt);
```

### Hospital Pricing Table
Stores pricing information for different resources.

```sql
CREATE TABLE hospital_pricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hospitalId INTEGER NOT NULL,
  resourceType TEXT NOT NULL CHECK(resourceType IN ('beds', 'icu', 'operationTheatres')),
  basePrice DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BDT',
  pricePerHour DECIMAL(10,2),
  pricePerDay DECIMAL(10,2),
  emergencyMultiplier DECIMAL(3,2) DEFAULT 1.0,
  effectiveFrom DATETIME DEFAULT CURRENT_TIMESTAMP,
  effectiveTo DATETIME,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (hospitalId) REFERENCES hospitals (id) ON DELETE CASCADE,
  UNIQUE(hospitalId, resourceType, effectiveFrom)
);

-- Indexes
CREATE INDEX idx_pricing_hospital ON hospital_pricing(hospitalId);
CREATE INDEX idx_pricing_resource ON hospital_pricing(resourceType);
CREATE INDEX idx_pricing_active ON hospital_pricing(isActive);
```

### Transactions Table
Stores payment transaction information.

```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bookingId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  hospitalId INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BDT',
  paymentMethod TEXT NOT NULL,
  paymentGateway TEXT,
  gatewayTransactionId TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
  failureReason TEXT,
  refundAmount DECIMAL(10,2),
  refundedAt DATETIME,
  platformFee DECIMAL(10,2),
  hospitalShare DECIMAL(10,2),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (bookingId) REFERENCES bookings (id),
  FOREIGN KEY (userId) REFERENCES users (id),
  FOREIGN KEY (hospitalId) REFERENCES hospitals (id)
);

-- Indexes
CREATE INDEX idx_transactions_booking ON transactions(bookingId);
CREATE INDEX idx_transactions_user ON transactions(userId);
CREATE INDEX idx_transactions_hospital ON transactions(hospitalId);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_gateway ON transactions(gatewayTransactionId);
```

### User Balance Table
Tracks user account balances and wallet functionality.

```sql
CREATE TABLE user_balance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL UNIQUE,
  balance DECIMAL(10,2) DEFAULT 0.00,
  currency TEXT DEFAULT 'BDT',
  lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_balance_user ON user_balance(userId);
```

### Balance Transactions Table
Records all balance changes for audit purposes.

```sql
CREATE TABLE balance_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  transactionId INTEGER,
  type TEXT NOT NULL CHECK(type IN ('credit', 'debit', 'refund', 'fee')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BDT',
  description TEXT,
  balanceBefore DECIMAL(10,2),
  balanceAfter DECIMAL(10,2),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users (id),
  FOREIGN KEY (transactionId) REFERENCES transactions (id)
);

-- Indexes
CREATE INDEX idx_balance_trans_user ON balance_transactions(userId);
CREATE INDEX idx_balance_trans_type ON balance_transactions(type);
CREATE INDEX idx_balance_trans_created ON balance_transactions(createdAt);
```

### Resource Audit Log Table
Tracks all resource changes for compliance and monitoring.

```sql
CREATE TABLE resource_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hospitalId INTEGER NOT NULL,
  resourceType TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('create', 'update', 'delete', 'allocate', 'release')),
  oldValues TEXT, -- JSON
  newValues TEXT, -- JSON
  changedBy INTEGER,
  reason TEXT,
  ipAddress TEXT,
  userAgent TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (hospitalId) REFERENCES hospitals (id),
  FOREIGN KEY (changedBy) REFERENCES users (id)
);

-- Indexes
CREATE INDEX idx_audit_hospital ON resource_audit_log(hospitalId);
CREATE INDEX idx_audit_resource ON resource_audit_log(resourceType);
CREATE INDEX idx_audit_action ON resource_audit_log(action);
CREATE INDEX idx_audit_created ON resource_audit_log(createdAt);
```

### Blood Requests Table
Manages blood donation requests and matching.

```sql
CREATE TABLE blood_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  patientName TEXT NOT NULL,
  bloodType TEXT NOT NULL CHECK(bloodType IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  unitsNeeded INTEGER NOT NULL,
  urgency TEXT DEFAULT 'medium' CHECK(urgency IN ('low', 'medium', 'high', 'critical')),
  hospitalId INTEGER,
  contactPhone TEXT NOT NULL,
  location TEXT NOT NULL,
  medicalCondition TEXT,
  requiredBy DATETIME,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'fulfilled', 'cancelled', 'expired')),
  notes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users (id),
  FOREIGN KEY (hospitalId) REFERENCES hospitals (id)
);

-- Indexes
CREATE INDEX idx_blood_user ON blood_requests(userId);
CREATE INDEX idx_blood_type ON blood_requests(bloodType);
CREATE INDEX idx_blood_urgency ON blood_requests(urgency);
CREATE INDEX idx_blood_status ON blood_requests(status);
CREATE INDEX idx_blood_hospital ON blood_requests(hospitalId);
```

### Payment Configuration Table
Stores payment gateway configurations.

```sql
CREATE TABLE payment_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gateway TEXT NOT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  config TEXT NOT NULL, -- JSON configuration
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_payment_config_gateway ON payment_config(gateway);
CREATE INDEX idx_payment_config_active ON payment_config(isActive);
```

## Relationship Diagrams

### Core Entity Relationships

```
Users (1) ←→ (N) Bookings
Users (1) ←→ (N) Hospitals (hospital-authority role)
Users (1) ←→ (1) UserBalance
Users (1) ←→ (N) BalanceTransactions

Hospitals (1) ←→ (N) HospitalResources
Hospitals (1) ←→ (N) Bookings
Hospitals (1) ←→ (N) HospitalPricing
Hospitals (1) ←→ (N) Transactions

Bookings (1) ←→ (N) BookingStatusHistory
Bookings (1) ←→ (N) BookingNotifications
Bookings (1) ←→ (N) Transactions

Transactions (1) ←→ (N) BalanceTransactions
```

### Booking Workflow Relationships

```
User creates Booking
  ↓
Booking creates BookingStatusHistory (status: pending)
  ↓
Booking creates BookingNotification (type: booking_submitted)
  ↓
Hospital Authority reviews Booking
  ↓
Booking status updated (approved/declined)
  ↓
BookingStatusHistory updated
  ↓
BookingNotification created (type: booking_approved/declined)
  ↓
If approved: HospitalResources updated (available count decreased)
  ↓
Transaction created for payment processing
```

## Indexes and Performance

### Primary Indexes
All tables have primary key indexes automatically created.

### Foreign Key Indexes
```sql
-- User-related indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_hospital ON users(hospitalId);

-- Hospital-related indexes
CREATE INDEX idx_hospitals_status ON hospitals(status);
CREATE INDEX idx_hospitals_name ON hospitals(name);

-- Booking-related indexes
CREATE INDEX idx_bookings_user ON bookings(userId);
CREATE INDEX idx_bookings_hospital ON bookings(hospitalId);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_urgency ON bookings(urgency);
CREATE INDEX idx_bookings_scheduled ON bookings(scheduledDate);

-- Resource-related indexes
CREATE INDEX idx_resources_hospital ON hospital_resources(hospitalId);
CREATE INDEX idx_resources_type ON hospital_resources(resourceType);
CREATE INDEX idx_resources_available ON hospital_resources(available);

-- Transaction-related indexes
CREATE INDEX idx_transactions_booking ON transactions(bookingId);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_gateway ON transactions(gatewayTransactionId);
```

### Composite Indexes
```sql
-- For efficient booking queries
CREATE INDEX idx_bookings_hospital_status ON bookings(hospitalId, status);
CREATE INDEX idx_bookings_user_status ON bookings(userId, status);

-- For resource availability queries
CREATE INDEX idx_resources_hospital_type ON hospital_resources(hospitalId, resourceType);

-- For notification queries
CREATE INDEX idx_notifications_user_read ON booking_notifications(userId, isRead);

-- For audit queries
CREATE INDEX idx_audit_hospital_date ON resource_audit_log(hospitalId, createdAt);
```

## Data Types and Constraints

### Common Data Types
- **INTEGER**: Primary keys, foreign keys, counts
- **TEXT**: String data (names, descriptions, JSON)
- **DATETIME**: Timestamps (ISO 8601 format)
- **DECIMAL(10,2)**: Currency amounts
- **BOOLEAN**: True/false flags

### Check Constraints
```sql
-- User roles
CHECK(role IN ('user', 'hospital-authority', 'admin'))

-- Booking status
CHECK(status IN ('pending', 'approved', 'declined', 'cancelled', 'completed'))

-- Resource types
CHECK(resourceType IN ('beds', 'icu', 'operationTheatres'))

-- Urgency levels
CHECK(urgency IN ('low', 'medium', 'high', 'critical'))

-- Gender options
CHECK(patientGender IN ('male', 'female', 'other'))

-- Blood types
CHECK(bloodType IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'))
```

### Foreign Key Constraints
```sql
-- Cascade deletes for dependent data
FOREIGN KEY (hospitalId) REFERENCES hospitals (id) ON DELETE CASCADE
FOREIGN KEY (bookingId) REFERENCES bookings (id) ON DELETE CASCADE

-- Restrict deletes for referenced data
FOREIGN KEY (userId) REFERENCES users (id) -- No cascade
FOREIGN KEY (approvedBy) REFERENCES users (id) -- No cascade
```

## Migration Scripts

### Migration File Structure
```
back-end/migrations/
├── 001_hospital_approval_system.js
├── 002_resource_booking_management.js
├── 003_notification_system.js
├── 005_notifications_system.js
├── 006_audit_trail_system.js
├── 008_create_reconciliation_tables.js
├── 009_add_user_balance_and_simple_pricing.js
├── 010_add_booking_reference.js
└── migrate.js
```

### Migration Runner
```javascript
// migrations/migrate.js
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

function runMigrations() {
  const db = new Database('database.sqlite');
  
  // Create migrations table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT UNIQUE NOT NULL,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Get executed migrations
  const executedMigrations = db.prepare('SELECT filename FROM migrations').all();
  const executedFiles = executedMigrations.map(m => m.filename);
  
  // Get all migration files
  const migrationFiles = fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.js') && file !== 'migrate.js')
    .sort();
  
  // Run pending migrations
  for (const file of migrationFiles) {
    if (!executedFiles.includes(file)) {
      console.log(`Running migration: ${file}`);
      const migration = require(path.join(__dirname, file));
      
      try {
        migration.up(db);
        db.prepare('INSERT INTO migrations (filename) VALUES (?)').run(file);
        console.log(`Migration ${file} completed successfully`);
      } catch (error) {
        console.error(`Migration ${file} failed:`, error);
        throw error;
      }
    }
  }
  
  db.close();
}

module.exports = { runMigrations };
```

### Sample Migration File
```javascript
// migrations/010_add_booking_reference.js
function up(db) {
  // Add booking reference column
  db.exec(`
    ALTER TABLE bookings 
    ADD COLUMN bookingReference TEXT UNIQUE
  `);
  
  // Create index for booking reference
  db.exec(`
    CREATE INDEX idx_bookings_reference ON bookings(bookingReference)
  `);
  
  // Update existing bookings with reference numbers
  const bookings = db.prepare('SELECT id FROM bookings WHERE bookingReference IS NULL').all();
  const updateStmt = db.prepare('UPDATE bookings SET bookingReference = ? WHERE id = ?');
  
  for (const booking of bookings) {
    const reference = `RC-${new Date().getFullYear()}-${String(booking.id).padStart(6, '0')}`;
    updateStmt.run(reference, booking.id);
  }
}

function down(db) {
  // Remove booking reference column
  db.exec(`
    CREATE TABLE bookings_backup AS SELECT * FROM bookings;
    DROP TABLE bookings;
    CREATE TABLE bookings AS SELECT * FROM bookings_backup;
    DROP TABLE bookings_backup;
  `);
}

module.exports = { up, down };
```

## Backup and Recovery

### Backup Strategy
```bash
#!/bin/bash
# backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"
DB_FILE="database.sqlite"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Create backup with timestamp
cp $DB_FILE "$BACKUP_DIR/database_backup_$DATE.sqlite"

# Compress backup
gzip "$BACKUP_DIR/database_backup_$DATE.sqlite"

# Keep only last 30 days of backups
find $BACKUP_DIR -name "database_backup_*.sqlite.gz" -mtime +30 -delete

echo "Database backup completed: database_backup_$DATE.sqlite.gz"
```

### Recovery Procedure
```bash
#!/bin/bash
# restore-database.sh

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

BACKUP_FILE=$1
DB_FILE="database.sqlite"

# Stop application
echo "Stopping application..."
# Add your application stop command here

# Backup current database
cp $DB_FILE "${DB_FILE}.pre_restore_$(date +%Y%m%d_%H%M%S)"

# Restore from backup
if [[ $BACKUP_FILE == *.gz ]]; then
  gunzip -c $BACKUP_FILE > $DB_FILE
else
  cp $BACKUP_FILE $DB_FILE
fi

# Verify database integrity
sqlite3 $DB_FILE "PRAGMA integrity_check;"

# Start application
echo "Starting application..."
# Add your application start command here

echo "Database restore completed from: $BACKUP_FILE"
```

### Database Maintenance
```sql
-- Regular maintenance queries

-- Analyze database for query optimization
ANALYZE;

-- Vacuum database to reclaim space
VACUUM;

-- Check database integrity
PRAGMA integrity_check;

-- Check foreign key constraints
PRAGMA foreign_key_check;

-- Get database size information
SELECT 
  page_count * page_size as size_bytes,
  page_count,
  page_size
FROM pragma_page_count(), pragma_page_size();

-- Get table sizes
SELECT 
  name,
  COUNT(*) as row_count
FROM sqlite_master 
WHERE type = 'table' 
  AND name NOT LIKE 'sqlite_%'
GROUP BY name;
```

### Performance Monitoring
```sql
-- Monitor slow queries (enable query logging)
PRAGMA query_only = ON;

-- Check index usage
EXPLAIN QUERY PLAN SELECT * FROM bookings WHERE status = 'pending';

-- Monitor database locks
SELECT * FROM pragma_database_list;

-- Check WAL file size
SELECT * FROM pragma_wal_checkpoint;
```

---

This database schema documentation provides a comprehensive overview of the RapidCare system's data structure. For additional database support or schema modifications, please contact the development team.