const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(dbPath);

console.log('🔄 Running migration: Add guest blood donation support');

try {
  // Start transaction
  db.exec('BEGIN TRANSACTION');

  // Add new columns for guest support
  console.log('📝 Adding requesterEmail column...');
  try {
    db.exec('ALTER TABLE blood_requests ADD COLUMN requesterEmail TEXT');
  } catch (error) {
    if (!error.message.includes('duplicate column name')) {
      throw error;
    }
    console.log('   Column requesterEmail already exists, skipping...');
  }

  console.log('📝 Adding isGuestRequest column...');
  try {
    db.exec('ALTER TABLE blood_requests ADD COLUMN isGuestRequest BOOLEAN DEFAULT 0');
  } catch (error) {
    if (!error.message.includes('duplicate column name')) {
      throw error;
    }
    console.log('   Column isGuestRequest already exists, skipping...');
  }

  // Modify requesterId to allow NULL for guest requests
  console.log('📝 Updating foreign key constraint to allow NULL requesterId...');
  
  // Create new table with updated schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS blood_requests_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requesterId INTEGER,
      requesterName TEXT NOT NULL,
      requesterPhone TEXT NOT NULL,
      requesterEmail TEXT,
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
      isGuestRequest BOOLEAN DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requesterId) REFERENCES users (id)
    )
  `);

  // Copy data from old table to new table
  console.log('📝 Copying existing data...');
  db.exec(`
    INSERT INTO blood_requests_new (
      id, requesterId, requesterName, requesterPhone, requesterEmail,
      bloodType, units, urgency, hospitalName, hospitalAddress, hospitalContact,
      patientName, patientAge, medicalCondition, requiredBy, status, notes,
      isGuestRequest, createdAt, updatedAt
    )
    SELECT 
      id, requesterId, requesterName, requesterPhone, 
      COALESCE(requesterEmail, '') as requesterEmail,
      bloodType, units, urgency, hospitalName, hospitalAddress, hospitalContact,
      patientName, patientAge, medicalCondition, requiredBy, status, notes,
      COALESCE(isGuestRequest, 0) as isGuestRequest,
      createdAt, updatedAt
    FROM blood_requests
  `);

  // Drop old table and rename new table
  console.log('📝 Replacing old table...');
  db.exec('DROP TABLE blood_requests');
  db.exec('ALTER TABLE blood_requests_new RENAME TO blood_requests');

  // Commit transaction
  db.exec('COMMIT');

  console.log('✅ Migration completed successfully');
  console.log('   - Added requesterEmail column for guest contact information');
  console.log('   - Added isGuestRequest column to track guest donations');
  console.log('   - Updated requesterId to allow NULL for guest requests');

} catch (error) {
  // Rollback on error
  db.exec('ROLLBACK');
  console.error('❌ Migration failed:', error.message);
  throw error;
} finally {
  db.close();
}