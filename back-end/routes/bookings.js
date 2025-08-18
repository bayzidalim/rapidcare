const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { 
  authenticate, 
  authorizeUserType, 
  authorizePermission,
  authorizeBookingAccess,
  authorizeHospitalBookingManagement
} = require('../middleware/auth');

// POST /api/bookings - Create new booking (authenticated users)
router.post('/', authenticate, bookingController.createBooking);

// POST /api/bookings/payment - Process booking payment (authenticated users)
router.post('/payment', authenticate, bookingController.processBookingPayment);

// GET /api/bookings/user - Get current user bookings
router.get('/user', authenticate, bookingController.getUserBookings);

// GET /api/bookings/my-bookings - Get current user bookings (for profile page)
router.get('/my-bookings', authenticate, bookingController.getCurrentUserBookings);

// GET /api/bookings/:id - Get specific booking (authenticated users with access control)
router.get('/:id', authenticate, authorizeBookingAccess, bookingController.getBookingById);

// PUT /api/bookings/:id/status - Update booking status (hospital authority with access control)
router.put('/:id/status', authenticate, authorizeBookingAccess, authorizePermission('update_bookings'), bookingController.updateBookingStatus);

// DELETE /api/bookings/:id - Cancel booking (authenticated users with access control)
router.delete('/:id', authenticate, authorizeBookingAccess, bookingController.cancelBooking);

// Booking approval endpoints for hospital authorities (must come before generic routes)
// GET /api/bookings/hospital/:hospitalId/pending - Get pending bookings for a hospital
router.get('/hospital/:hospitalId/pending', authenticate, authorizeHospitalBookingManagement, bookingController.getPendingBookings);

// GET /api/bookings/hospital/:hospitalId/history - Get booking history for a hospital
router.get('/hospital/:hospitalId/history', authenticate, authorizeHospitalBookingManagement, bookingController.getBookingHistory);

// PUT /api/bookings/:id/approve - Approve a booking
router.put('/:id/approve', authenticate, authorizeBookingAccess, authorizeUserType(['hospital-authority', 'admin']), bookingController.approveBooking);

// PUT /api/bookings/:id/decline - Decline a booking
router.put('/:id/decline', authenticate, authorizeBookingAccess, authorizeUserType(['hospital-authority', 'admin']), bookingController.declineBooking);

// PUT /api/bookings/:id/complete - Complete a booking
router.put('/:id/complete', authenticate, authorizeBookingAccess, authorizeUserType(['hospital-authority', 'admin']), bookingController.completeBooking);

// GET /api/bookings/reference/:reference - Get booking by reference
router.get('/reference/:reference', authenticate, bookingController.getBookingByReference);

// GET /api/bookings/hospital/:hospitalId/statistics - Get booking statistics
router.get('/hospital/:hospitalId/statistics', authenticate, authorizeHospitalBookingManagement, bookingController.getBookingStatistics);

// GET /api/bookings/search - Search bookings
router.get('/search', authenticate, bookingController.searchBookings);

// GET /api/bookings/notifications - Get user notifications
router.get('/notifications', authenticate, bookingController.getUserNotifications);

// PUT /api/bookings/notifications/:id/read - Mark notification as read
router.put('/notifications/:id/read', authenticate, bookingController.markNotificationAsRead);

// PUT /api/bookings/notifications/read-all - Mark all notifications as read
router.put('/notifications/read-all', authenticate, bookingController.markAllNotificationsAsRead);

// GET /api/bookings - Get all bookings (hospital authority)
router.get('/', authenticate, authorizePermission('view_bookings'), bookingController.getAllBookings);

module.exports = router; 