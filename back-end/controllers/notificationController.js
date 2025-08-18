const NotificationService = require('../services/notificationService');
const BookingNotification = require('../models/BookingNotification');

// Get user notifications
exports.getUserNotifications = async (req, res) => {
  try {
    const { limit, isRead, type } = req.query;
    
    const options = {
      limit: limit ? parseInt(limit) : 50
    };
    
    if (isRead !== undefined) {
      options.isRead = isRead === 'true';
    }
    
    if (type) {
      options.type = type;
    }

    // Ensure user ID is valid
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const result = NotificationService.getUserNotifications(parseInt(req.user.id), options);

    res.json({
      success: true,
      data: result.notifications,
      unreadCount: result.unreadCount,
      totalCount: result.totalCount
    });
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
};

// Get unread notification count
exports.getUnreadCount = async (req, res) => {
  try {
    // Ensure user ID is valid
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const unreadCount = BookingNotification.getUnreadCount(parseInt(req.user.id));

    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unread count'
    });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const success = NotificationService.markNotificationAsRead(parseInt(id), req.user.id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const updatedCount = NotificationService.markAllNotificationsAsRead(req.user.id);

    res.json({
      success: true,
      message: `${updatedCount} notifications marked as read`,
      data: { updatedCount }
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notifications as read'
    });
  }
};

// Bulk mark notifications as read
exports.bulkMarkAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        error: 'Notification IDs array is required'
      });
    }

    const markedCount = NotificationService.bulkMarkAsRead(notificationIds, req.user.id);

    res.json({
      success: true,
      message: `${markedCount} notifications marked as read`,
      data: { markedCount }
    });
  } catch (error) {
    console.error('Error bulk marking notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notifications as read'
    });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const success = NotificationService.deleteNotification(parseInt(id), req.user.id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification'
    });
  }
};

// Get notification statistics
exports.getNotificationStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    const statistics = NotificationService.getNotificationStatistics(req.user.id, options);

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error fetching notification statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification statistics'
    });
  }
};

// Get hospital notifications (for hospital authorities)
exports.getHospitalNotifications = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { limit, isRead, type } = req.query;

    // Check if user has permission to view this hospital's notifications
    if (req.user.userType === 'hospital-authority' && req.user.hospital_id !== parseInt(hospitalId)) {
      return res.status(403).json({
        success: false,
        error: 'You can only view notifications for your assigned hospital'
      });
    }

    const options = {
      limit: limit ? parseInt(limit) : 50
    };
    
    if (isRead !== undefined) {
      options.isRead = isRead === 'true';
    }
    
    if (type) {
      options.type = type;
    }

    const notifications = NotificationService.getHospitalNotifications(parseInt(hospitalId), options);

    res.json({
      success: true,
      data: notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('Error fetching hospital notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hospital notifications'
    });
  }
};

// Create custom notification (admin only)
exports.createCustomNotification = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { userId, bookingId, type, title, message } = req.body;

    if (!userId || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'userId, type, title, and message are required'
      });
    }

    const notificationData = {
      userId: parseInt(userId),
      bookingId: bookingId ? parseInt(bookingId) : null,
      type,
      title,
      message
    };

    const notificationId = NotificationService.createCustomNotification(notificationData);

    res.status(201).json({
      success: true,
      data: { id: notificationId },
      message: 'Custom notification created successfully'
    });
  } catch (error) {
    console.error('Error creating custom notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create custom notification'
    });
  }
};

// Get all notifications (admin only)
exports.getAllNotifications = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { userId, type, isRead, limit } = req.query;
    
    const options = {};
    if (userId) options.userId = parseInt(userId);
    if (type) options.type = type;
    if (isRead !== undefined) options.isRead = isRead === 'true';
    if (limit) options.limit = parseInt(limit);

    const notifications = BookingNotification.getAll(options);

    res.json({
      success: true,
      data: notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
};

// Cleanup old notifications (admin only)
exports.cleanupOldNotifications = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { days } = req.query;
    const daysToKeep = days ? parseInt(days) : 30;

    const deletedCount = NotificationService.cleanupOldNotifications(daysToKeep);

    res.json({
      success: true,
      message: `${deletedCount} old notifications cleaned up`,
      data: { deletedCount, daysKept: daysToKeep }
    });
  } catch (error) {
    console.error('Error cleaning up old notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup old notifications'
    });
  }
};

// Send test notification (admin only)
exports.sendTestNotification = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { userId, title, message } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'userId, title, and message are required'
      });
    }

    const notificationData = {
      userId: parseInt(userId),
      bookingId: null,
      type: 'booking_submitted', // Use a valid type
      title,
      message
    };

    const notificationId = NotificationService.createCustomNotification(notificationData);

    res.status(201).json({
      success: true,
      data: { id: notificationId },
      message: 'Test notification sent successfully'
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
};

module.exports = exports;