const express = require('express');
const router = express.Router();

// One-time setup endpoint - DEPRECATED
router.post('/seed', async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'This endpoint is deprecated. Please use the command line seeder: "npm run seed".'
  });
});

// Check database status
router.get('/status', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const Hospital = require('../models/Hospital');
    const User = require('../models/User');
    const Booking = require('../models/Booking');

    const hospitalCount = await Hospital.countDocuments();
    const userCount = await User.countDocuments();
    const bookingCount = await Booking.countDocuments();

    res.json({
      success: true,
      database: {
        hospitals: hospitalCount,
        users: userCount,
        bookings: bookingCount,
        connectionState: mongoose.connection.readyState
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
