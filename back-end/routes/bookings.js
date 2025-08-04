const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate, authorizeUserType, authorizePermission } = require('../middleware/auth');

// POST /api/bookings - Create new booking (authenticated users)
router.post('/', authenticate, bookingController.createBooking);

// GET /api/bookings/user - Get current user bookings
router.get('/user', authenticate, bookingController.getUserBookings);

// GET /api/bookings/my-bookings - Get current user bookings (for profile page)
router.get('/my-bookings', authenticate, bookingController.getCurrentUserBookings);

// GET /api/bookings/:id - Get specific booking (authenticated users)
router.get('/:id', authenticate, bookingController.getBookingById);

// PUT /api/bookings/:id/status - Update booking status (hospital authority)
router.put('/:id/status', authenticate, authorizePermission('update_bookings'), bookingController.updateBookingStatus);

// DELETE /api/bookings/:id - Cancel booking (authenticated users)
router.delete('/:id', authenticate, bookingController.cancelBooking);

// Booking approval endpoints for hospital authorities (must come before generic routes)
// GET /api/bookings/hospital/:hospitalId/pending - Get pending bookings for a hospital
router.get('/hospital/:hospitalId/pending', authenticate, authorizeUserType(['hospital-authority', 'admin']), bookingController.getPendingBookings);

// GET /api/bookings/hospital/:hospitalId/history - Get booking history for a hospital
router.get('/hospital/:hospitalId/history', authenticate, authorizeUserType(['hospital-authority', 'admin']), bookingController.getBookingHistory);

// PUT /api/bookings/:id/approve - Approve a booking
router.put('/:id/approve', authenticate, authorizeUserType(['hospital-authority', 'admin']), bookingController.approveBooking);

// PUT /api/bookings/:id/decline - Decline a booking
router.put('/:id/decline', authenticate, authorizeUserType(['hospital-authority', 'admin']), bookingController.declineBooking);

// GET /api/bookings - Get all bookings (hospital authority)
router.get('/', authenticate, authorizePermission('view_bookings'), bookingController.getAllBookings);

module.exports = router; 