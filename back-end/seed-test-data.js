const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

console.log('Seeding test data...');

try {
    // Create a test hospital authority user (or get existing)
    const hashedPassword = bcrypt.hashSync('password123', 10);

    let userId;
    try {
        const userResult = db.prepare(`
      INSERT INTO users (email, password, name, phone, userType, isActive)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('hospital@test.com', hashedPassword, 'Test Hospital Authority', '1234567890', 'hospital-authority', 1);
        userId = userResult.lastInsertRowid;
        console.log('✅ Created hospital authority user:', userId);
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get('hospital@test.com');
            userId = existingUser.id;
            console.log('✅ Using existing hospital authority user:', userId);
        } else {
            throw error;
        }
    }

    // Create a test hospital
    const hospitalResult = db.prepare(`
    INSERT INTO hospitals (
      name, description, type, street, city, state, zipCode, country,
      phone, email, emergency, total_beds, icu_beds, operation_theaters,
      approval_status, approved_at, submitted_at, isActive
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
  `).run(
        'Test General Hospital',
        'A comprehensive medical facility providing quality healthcare',
        'General',
        '123 Medical Center Drive',
        'Healthcare City',
        'Medical State',
        '12345',
        'USA',
        '555-0123',
        'info@testgeneralhospital.com',
        '911',
        50,  // total_beds
        10,  // icu_beds
        5,   // operation_theaters
        'approved'
    );

    const hospitalId = hospitalResult.lastInsertRowid;
    console.log('✅ Created test hospital:', hospitalId);

    // Link hospital to user
    db.prepare(`
    UPDATE users SET hospital_id = ?, can_add_hospital = 0 WHERE id = ?
  `).run(hospitalId, userId);

    // Add hospital services
    const services = ['Emergency Care', 'Surgery', 'Cardiology', 'Pediatrics', 'Radiology'];
    const serviceStmt = db.prepare(`
    INSERT INTO hospital_services (hospitalId, service) VALUES (?, ?)
  `);

    services.forEach(service => {
        serviceStmt.run(hospitalId, service);
    });
    console.log('✅ Added hospital services');

    // Add hospital resources
    const resourceStmt = db.prepare(`
    INSERT INTO hospital_resources (hospitalId, resourceType, total, available, occupied)
    VALUES (?, ?, ?, ?, ?)
  `);

    resourceStmt.run(hospitalId, 'beds', 50, 35, 15);
    resourceStmt.run(hospitalId, 'icu', 10, 7, 3);
    resourceStmt.run(hospitalId, 'operationTheatres', 5, 3, 2);
    console.log('✅ Added hospital resources');

    // Add a test surgeon
    db.prepare(`
    INSERT INTO surgeons (hospitalId, name, specialization, available, scheduleDays, scheduleHours)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
        hospitalId,
        'Dr. John Smith',
        'General Surgery',
        1,
        JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
        '9:00 AM - 5:00 PM'
    );
    console.log('✅ Added test surgeon');

    // Create a regular user for testing
    const regularUserResult = db.prepare(`
    INSERT INTO users (email, password, name, phone, userType, isActive)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('user@test.com', hashedPassword, 'Test User', '0987654321', 'user', 1);

    console.log('✅ Created regular user:', regularUserResult.lastInsertRowid);

    console.log('\n🎉 Test data seeded successfully!');
    console.log('\nTest accounts:');
    console.log('- Admin: admin@hospital.com / admin123');
    console.log('- Hospital Authority: hospital@test.com / password123');
    console.log('- Regular User: user@test.com / password123');
    console.log('\nTest hospital: Test General Hospital (approved)');

} catch (error) {
    console.error('❌ Error seeding data:', error);
} finally {
    db.close();
}