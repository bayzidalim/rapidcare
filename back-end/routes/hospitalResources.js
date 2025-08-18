const express = require('express');
const router = express.Router();
const hospitalResourceController = require('../controllers/hospitalResourceController');
const { authenticate, authorizeUserType } = require('../middleware/auth');

// GET /api/hospital-resources - Get all hospitals with resources
router.get('/', hospitalResourceController.getHospitalsWithResources);

// GET /api/hospital-resources/summary - Get resource summary (admin only)
router.get('/summary', authenticate, authorizeUserType(['admin']), hospitalResourceController.getResourceSummary);

// GET /api/hospital-resources/:hospitalId - Get specific hospital resources
router.get('/:hospitalId', hospitalResourceController.getHospitalResources);

// PUT /api/hospital-resources/:hospitalId - Update hospital resources
router.put('/:hospitalId', authenticate, authorizeUserType(['hospital-authority', 'admin']), hospitalResourceController.updateHospitalResources);

// PUT /api/hospital-resources/:hospitalId/:resourceType - Update specific resource type
router.put('/:hospitalId/:resourceType', authenticate, authorizeUserType(['hospital-authority', 'admin']), hospitalResourceController.updateResourceType);

// GET /api/hospital-resources/:hospitalId/:resourceType/availability - Check resource availability
router.get('/:hospitalId/:resourceType/availability', hospitalResourceController.checkResourceAvailability);

// GET /api/hospital-resources/:hospitalId/utilization - Get resource utilization
router.get('/:hospitalId/utilization', authenticate, authorizeUserType(['hospital-authority', 'admin']), hospitalResourceController.getResourceUtilization);

// GET /api/hospital-resources/:hospitalId/audit-log - Get resource audit log
router.get('/:hospitalId/audit-log', authenticate, authorizeUserType(['hospital-authority', 'admin']), hospitalResourceController.getResourceAuditLog);

// POST /api/hospital-resources/:hospitalId/initialize - Initialize default resources
router.post('/:hospitalId/initialize', authenticate, authorizeUserType(['hospital-authority', 'admin']), hospitalResourceController.initializeHospitalResources);

module.exports = router;