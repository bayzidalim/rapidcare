const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate, requireRole } = require('../middleware/auth');

/**
 * @route   GET /api/bookings
 * @desc    Get all bookings (Admin only) or Hospital specific bookings
 * @access  Private (Admin/Hospital Authority)
 */
router.get('/', authenticate, requireRole(['admin', 'hospital-authority']), bookingController.getAllBookings);

/**
 * @route   GET /api/bookings/my-bookings
 * @desc    Get current user bookings (for profile page)
 * @access  Private
 */
router.get('/my-bookings', authenticate, bookingController.getCurrentUserBookings);

/**
 * @route   GET /api/bookings/user
 * @desc    Get current user bookings (Alias for my-bookings)
 * @access  Private
 */
router.get('/user', authenticate, bookingController.getUserBookings);

/**
 * @route   GET /api/bookings/hospital/:hospitalId/pending
 * @desc    Get pending bookings for a hospital
 * @access  Private (Hospital Authority/Admin)
 */
router.get('/hospital/:hospitalId/pending', authenticate, requireRole(['hospital-authority', 'admin']), bookingController.getPendingBookings);

/**
 * @route   GET /api/bookings/hospital/:hospitalId/history
 * @desc    Get booking history for a hospital
 * @access  Private (Hospital Authority/Admin)
 */
router.get('/hospital/:hospitalId/history', authenticate, requireRole(['hospital-authority', 'admin']), bookingController.getBookingHistory);

/**
 * @route   GET /api/bookings/:id
 * @desc    Get booking by ID
 * @access  Private
 */
router.get('/:id', authenticate, bookingController.getBookingById);

/**
 * @route   POST /api/bookings
 * @desc    Create new booking
 * @access  Private
 */
router.post('/', authenticate, bookingController.createBooking);

/**
 * @route   POST /api/bookings/payment
 * @desc    Process booking payment
 * @access  Private
 */
router.post('/payment', authenticate, bookingController.processBookingPayment);

/**
 * @route   PUT /api/bookings/:id/status
 * @desc    Update booking status (Hospital Authority)
 * @access  Private
 */
router.put('/:id/status', authenticate, requireRole('hospital-authority'), bookingController.updateBookingStatus);

/**
 * @route   PUT /api/bookings/:id/cancel
 * @desc    Cancel booking
 * @access  Private
 */
router.put('/:id/cancel', authenticate, bookingController.cancelBooking);

/**
 * @route   PUT /api/bookings/:id/approve
 * @desc    Approve a booking
 * @access  Private (Hospital Authority/Admin)
 */
router.put('/:id/approve', authenticate, requireRole(['hospital-authority', 'admin']), bookingController.approveBooking);

/**
 * @route   PUT /api/bookings/:id/decline
 * @desc    Decline a booking
 * @access  Private (Hospital Authority/Admin)
 */
router.put('/:id/decline', authenticate, requireRole(['hospital-authority', 'admin']), bookingController.declineBooking);

module.exports = router;