const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate, authorizeUserType } = require('../middleware/auth');

// GET /api/notifications - Get user notifications
router.get('/', authenticate, notificationController.getUserNotifications);

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', authenticate, notificationController.getUnreadCount);

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', authenticate, notificationController.markAsRead);

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/read-all', authenticate, notificationController.markAllAsRead);

// PUT /api/notifications/bulk-read - Bulk mark notifications as read
router.put('/bulk-read', authenticate, notificationController.bulkMarkAsRead);

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', authenticate, notificationController.deleteNotification);

// GET /api/notifications/statistics - Get notification statistics
router.get('/statistics', authenticate, notificationController.getNotificationStatistics);

// GET /api/notifications/hospital/:hospitalId - Get hospital notifications
router.get('/hospital/:hospitalId', authenticate, authorizeUserType(['hospital-authority', 'admin']), notificationController.getHospitalNotifications);

// Admin only routes
// POST /api/notifications/custom - Create custom notification
router.post('/custom', authenticate, authorizeUserType(['admin']), notificationController.createCustomNotification);

// GET /api/notifications/admin/all - Get all notifications
router.get('/admin/all', authenticate, authorizeUserType(['admin']), notificationController.getAllNotifications);

// POST /api/notifications/admin/cleanup - Cleanup old notifications
router.post('/admin/cleanup', authenticate, authorizeUserType(['admin']), notificationController.cleanupOldNotifications);

// POST /api/notifications/admin/test - Send test notification
router.post('/admin/test', authenticate, authorizeUserType(['admin']), notificationController.sendTestNotification);

module.exports = router;