const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorizeUserType } = require('../middleware/auth');

// Apply authentication and admin authorization to all admin routes
router.use(authenticate);
router.use(authorizeUserType(['admin']));

// Admin routes
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

router.get('/hospitals', adminController.getAllHospitals);
router.get('/hospitals/pending', adminController.getPendingHospitals);
router.get('/hospitals/approval-stats', adminController.getHospitalApprovalStats);
router.get('/hospitals/:id', adminController.getHospitalById);
router.post('/hospitals', adminController.createHospital);
router.put('/hospitals/:id', adminController.updateHospital);
router.put('/hospitals/:id/approve', adminController.approveHospital);
router.put('/hospitals/:id/reject', adminController.rejectHospital);
router.delete('/hospitals/:id', adminController.deleteHospital);

router.get('/bookings', adminController.getAllBookings);
router.get('/bookings/:id', adminController.getBookingById);
router.put('/bookings/:id', adminController.updateBooking);
router.delete('/bookings/:id', adminController.deleteBooking);

router.get('/blood-requests', adminController.getAllBloodRequests);
router.get('/blood-requests/:id', adminController.getBloodRequestById);
router.put('/blood-requests/:id', adminController.updateBloodRequest);
router.delete('/blood-requests/:id', adminController.deleteBloodRequest);

router.get('/stats', adminController.getStats);

module.exports = router; 