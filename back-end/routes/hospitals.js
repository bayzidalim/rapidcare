const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');
const { 
  authenticate, 
  authorizeUserType, 
  authorizePermission, 
  requireAdmin, 
  requireHospitalAuthority, 
  requireOwnHospital,
  optionalAuth,
  requireAuth
} = require('../middleware/auth');

// GET /api/hospitals - Get all hospitals (public with optional auth)
router.get('/', optionalAuth, hospitalController.getAllHospitals);

// GET /api/hospitals/search - Search hospitals (public with optional auth)
router.get('/search', optionalAuth, hospitalController.searchHospitals);

// GET /api/hospitals/resources - Get hospitals with available resources (public with optional auth)
router.get('/resources', optionalAuth, hospitalController.getHospitalsWithResources);

// GET /api/hospitals/my-hospitals - Get hospitals managed by current user (admin only for management)
router.get('/my-hospitals', requireAuth, requireAdmin, hospitalController.getMyHospitals);

// GET /api/hospitals/my-hospital - Get current user's hospital (for hospital authorities)
router.get('/my-hospital', requireAuth, requireHospitalAuthority, hospitalController.getMyHospital);

// PUT /api/hospitals/my-hospital - Resubmit hospital information (hospital authority)
router.put('/my-hospital', requireAuth, requireHospitalAuthority, hospitalController.resubmitMyHospital);

// GET /api/hospitals/:id - Get specific hospital (public with optional auth)
router.get('/:id', optionalAuth, hospitalController.getHospitalById);

// POST /api/hospitals - Create new hospital (hospital authority only)
router.post('/', requireAuth, authorizeUserType(['hospital-authority']), hospitalController.createHospital);

// PUT /api/hospitals/my-hospital/resources - Update own hospital resources (hospital authority)
router.put('/my-hospital/resources', requireAuth, requireHospitalAuthority, hospitalController.updateMyHospitalResources);

// PUT /api/hospitals/:id/resources - Update hospital resources (hospital authority own hospital only)
router.put('/:id/resources', requireAuth, requireHospitalAuthority, requireOwnHospital, hospitalController.updateHospitalResources);

// GET /api/hospitals/:id/resources/history - Get resource audit history (hospital authority own hospital only)
router.get('/:id/resources/history', requireAuth, requireHospitalAuthority, requireOwnHospital, hospitalController.getResourceHistory);

// POST /api/hospitals/:id/resources/validate - Validate resource update data (hospital authority own hospital only)
router.post('/:id/resources/validate', requireAuth, requireHospitalAuthority, requireOwnHospital, hospitalController.validateResourceUpdate);

// PUT /api/hospitals/:id - Update hospital (hospital authority own hospital only)
router.put('/:id', requireAuth, requireHospitalAuthority, requireOwnHospital, hospitalController.updateHospital);

// DELETE /api/hospitals/:id - Delete hospital (admin only)
router.delete('/:id', requireAuth, requireAdmin, hospitalController.deleteHospital);

// Booking approval endpoints for hospital authorities
// GET /api/hospitals/:id/bookings/pending - Get pending bookings for a hospital
router.get('/:id/bookings/pending', requireAuth, authorizeUserType(['hospital-authority', 'admin']), hospitalController.getPendingBookings);

// GET /api/hospitals/:id/bookings/history - Get booking history for a hospital
router.get('/:id/bookings/history', requireAuth, authorizeUserType(['hospital-authority', 'admin']), hospitalController.getBookingHistory);

// Polling endpoints for real-time updates
// GET /api/hospitals/:id/polling/resources - Get resource updates since last poll
router.get('/:id/polling/resources', requireAuth, authorizeUserType(['hospital-authority', 'admin']), hospitalController.getResourceUpdates);

// GET /api/hospitals/:id/polling/bookings - Get booking updates since last poll
router.get('/:id/polling/bookings', requireAuth, authorizeUserType(['hospital-authority', 'admin']), hospitalController.getBookingUpdates);

// GET /api/hospitals/:id/polling/dashboard - Get combined dashboard updates since last poll
router.get('/:id/polling/dashboard', requireAuth, authorizeUserType(['hospital-authority', 'admin']), hospitalController.getDashboardUpdates);

// GET /api/hospitals/:id/polling/changes - Check for changes without returning full data
router.get('/:id/polling/changes', requireAuth, authorizeUserType(['hospital-authority', 'admin']), hospitalController.checkForChanges);

// GET /api/hospitals/:id/polling/config - Get polling configuration recommendations
router.get('/:id/polling/config', requireAuth, authorizeUserType(['hospital-authority', 'admin']), hospitalController.getPollingConfig);

// Analytics endpoints for hospital authorities
// GET /api/hospitals/:id/analytics/dashboard - Get comprehensive analytics dashboard
router.get('/:id/analytics/dashboard', requireAuth, authorizeUserType(['hospital-authority', 'admin']), hospitalController.getAnalyticsDashboard);

// GET /api/hospitals/:id/analytics/resource-utilization - Get resource utilization analytics
router.get('/:id/analytics/resource-utilization', requireAuth, authorizeUserType(['hospital-authority', 'admin']), hospitalController.getResourceUtilizationAnalytics);

// GET /api/hospitals/:id/analytics/booking-history - Get booking history analytics
router.get('/:id/analytics/booking-history', requireAuth, authorizeUserType(['hospital-authority', 'admin']), hospitalController.getBookingHistoryAnalytics);

// GET /api/hospitals/:id/analytics/usage-patterns - Get resource usage patterns
router.get('/:id/analytics/usage-patterns', requireAuth, authorizeUserType(['hospital-authority', 'admin']), hospitalController.getResourceUsagePatterns);

// GET /api/hospitals/:id/analytics/performance - Get performance metrics
router.get('/:id/analytics/performance', requireAuth, authorizeUserType(['hospital-authority', 'admin']), hospitalController.getPerformanceMetrics);

module.exports = router; 