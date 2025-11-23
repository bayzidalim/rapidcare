const express = require('express');
const router = express.Router();
const db = require('../config/database');

// One-time setup endpoint - REMOVE AFTER FIRST USE
router.post('/seed', async (req, res) => {
  try {
    // Check if already seeded
    const hospitalCount = db.prepare('SELECT COUNT(*) as count FROM hospitals').get();
    
    if (hospitalCount.count > 0) {
      return res.json({
        success: false,
        message: 'Database already contains hospitals. Seeding skipped for safety.',
        count: hospitalCount.count
      });
    }

    // Run the seeder
    const { seedDatabase } = require('../utils/seeder');
    await seedDatabase();

    res.json({
      success: true,
      message: 'Database seeded successfully!',
      credentials: {
        admin: { email: 'admin@example.com', password: 'password123' },
        hospital: { email: 'hospital@example.com', password: 'password123' },
        user: { email: 'user@example.com', password: 'password123' }
      }
    });
  } catch (error) {
    console.error('Setup seed error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Check database status
router.get('/status', (req, res) => {
  try {
    const hospitalCount = db.prepare('SELECT COUNT(*) as count FROM hospitals').get();
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const bookingCount = db.prepare('SELECT COUNT(*) as count FROM bookings').get();

    res.json({
      success: true,
      database: {
        hospitals: hospitalCount.count,
        users: userCount.count,
        bookings: bookingCount.count
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
