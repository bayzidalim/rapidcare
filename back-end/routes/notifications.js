const express = require('express');
const router = express.Router();
const NotificationService = require('../services/notificationService');
const { authenticate } = require('../middleware/auth');

/**
 * Process notification queue
 * POST /api/notifications/process-queue
 * Admin only endpoint to manually trigger notification processing
 */
router.post('/process-queue', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { limit, priority } = req.body;
    
    const result = await NotificationService.processNotificationQueue({
      limit: limit || 50,
      priority
    });

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error?.message
      });
    }

  } catch (error) {
    console.error('Error processing notification queue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process notification queue',
      error: error.message
    });
  }
});

/**
 * Get notification statistics
 * GET /api/notifications/statistics
 * Admin only endpoint for notification analytics
 */
router.get('/statistics', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { startDate, endDate } = req.query;
    
    const result = NotificationService.getNotificationStatistics({
      startDate,
      endDate
    });

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error?.message
      });
    }

  } catch (error) {
    console.error('Error getting notification statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification statistics',
      error: error.message
    });
  }
});

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 * Get count of unread notifications for the authenticated user
 */
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const result = NotificationService.getUnreadNotificationCount(req.user.id);

    if (result.success) {
      res.json({
        success: true,
        data: {
          unreadCount: result.count
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error?.message
      });
    }

  } catch (error) {
    console.error('Error getting unread notification count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread notification count',
      error: error.message
    });
  }
});

/**
 * Get user notification history
 * GET /api/notifications/history
 * Get notification history for the authenticated user
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const { type, status, limit } = req.query;
    
    const result = NotificationService.getNotificationHistory(req.user.id, {
      type,
      status,
      limit: limit ? parseInt(limit) : 20
    });

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error?.message
      });
    }

  } catch (error) {
    console.error('Error getting notification history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification history',
      error: error.message
    });
  }
});

/**
 * Test notification endpoint
 * POST /api/notifications/test
 * Admin only endpoint to test notification delivery
 */
router.post('/test', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { recipientId, type, channel } = req.body;

    if (!recipientId || !type || !channel) {
      return res.status(400).json({
        success: false,
        message: 'recipientId, type, and channel are required'
      });
    }

    // Queue a test notification
    const result = await NotificationService.queueNotification({
      recipient: { id: recipientId },
      type: type,
      channel: channel,
      priority: 'medium',
      content: {
        subject: 'Test Notification',
        body: 'This is a test notification from the admin panel.',
        message: 'Test notification from admin panel.'
      },
      booking: { id: 0 },
      details: {
        notes: 'Test notification sent by admin',
        supportContact: NotificationService.getSupportContactInfo()
      }
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Test notification queued successfully',
        data: {
          notificationId: result.notificationId,
          queuedAt: result.queuedAt
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error?.message
      });
    }

  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message
    });
  }
});

module.exports = router;