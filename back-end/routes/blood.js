const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const bloodController = require('../controllers/bloodController');
const { authenticate, authorizeUserType, authorizePermission, optionalAuth, requireAuth } = require('../middleware/auth');

// Rate limiting for guest blood donation requests
const guestBloodDonationLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 blood donation requests per hour
  message: {
    success: false,
    error: 'Too many blood donation requests. Please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Only apply to requests without authentication (guests)
  skip: (req) => !!req.user
});

// Rate limiting for guest browsing
const guestBrowsingLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour  
  max: 100, // Limit each IP to 100 requests per hour for browsing
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Only apply to requests without authentication (guests)
  skip: (req) => !!req.user
});

// POST /api/blood/request - Create blood request (public with optional auth and rate limiting)
router.post('/request', guestBloodDonationLimit, optionalAuth, bloodController.createBloodRequest);

// GET /api/blood/requests - Get all blood requests (public with optional auth and rate limiting)
router.get('/requests', guestBrowsingLimit, optionalAuth, bloodController.getAllBloodRequests);

// GET /api/blood/my-requests - Get current user's blood requests (authenticated users only)
router.get('/my-requests', requireAuth, bloodController.getCurrentUserBloodRequests);

// GET /api/blood/requests/search - Search blood requests (public with optional auth and rate limiting)
router.get('/requests/search', guestBrowsingLimit, optionalAuth, bloodController.searchBloodRequests);

// GET /api/blood/requests/:id - Get specific blood request (public with optional auth and rate limiting)
router.get('/requests/:id', guestBrowsingLimit, optionalAuth, bloodController.getBloodRequestById);

// PUT /api/blood/requests/:id/status - Update blood request status (hospital authority only)
router.put('/requests/:id/status', requireAuth, authorizePermission('update_bookings'), bloodController.updateBloodRequestStatus);

// POST /api/blood/requests/:id/match - Match donor to blood request (authenticated users only)
router.post('/requests/:id/match', requireAuth, bloodController.matchDonor);

// PUT /api/blood/requests/:id/donors/:donorId - Update donor status (authenticated users only)
router.put('/requests/:id/donors/:donorId', requireAuth, bloodController.updateDonorStatus);

module.exports = router; 