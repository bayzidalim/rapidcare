const BookingNotification = require('../models/BookingNotification');
const User = require('../models/User');

class NotificationService {
  /**
   * Create notification for booking submission
   * @param {Object} booking - Booking object
   */
  static async createBookingSubmittedNotifications(booking) {
    try {
      // Notify patient
      await BookingNotification.createBookingSubmitted(
        booking.userId,
        booking.id,
        booking.hospitalName
      );

      // Notify hospital authorities
      const hospitalAuthorities = User.getHospitalAuthorities(booking.hospitalId);
      for (const authority of hospitalAuthorities) {
        await BookingNotification.createNewBookingForHospital(
          authority.id,
          booking.id,
          booking.patientName,
          booking.urgency
        );
      }

      console.log(`Booking submission notifications created for booking ${booking.id}`);
    } catch (error) {
      console.error('Error creating booking submission notifications:', error);
    }
  }

  /**
   * Create notification for booking approval
   * @param {Object} booking - Booking object
   * @param {string} notes - Approval notes
   */
  static async createBookingApprovedNotifications(booking, notes = null) {
    try {
      await BookingNotification.createBookingApproved(
        booking.userId,
        booking.id,
        booking.hospitalName,
        notes
      );

      console.log(`Booking approval notification created for booking ${booking.id}`);
    } catch (error) {
      console.error('Error creating booking approval notification:', error);
    }
  }

  /**
   * Create notification for booking decline
   * @param {Object} booking - Booking object
   * @param {string} reason - Decline reason
   * @param {string} notes - Additional notes
   */
  static async createBookingDeclinedNotifications(booking, reason, notes = null) {
    try {
      await BookingNotification.createBookingDeclined(
        booking.userId,
        booking.id,
        booking.hospitalName,
        reason,
        notes
      );

      console.log(`Booking decline notification created for booking ${booking.id}`);
    } catch (error) {
      console.error('Error creating booking decline notification:', error);
    }
  }

  /**
   * Create notification for booking cancellation
   * @param {Object} booking - Booking object
   * @param {string} reason - Cancellation reason
   */
  static async createBookingCancelledNotifications(booking, reason = null) {
    try {
      await BookingNotification.createBookingCancelled(
        booking.userId,
        booking.id,
        booking.hospitalName,
        reason
      );

      // Also notify hospital authorities about the cancellation
      const hospitalAuthorities = User.getHospitalAuthorities(booking.hospitalId);
      for (const authority of hospitalAuthorities) {
        await BookingNotification.create({
          userId: authority.id,
          bookingId: booking.id,
          type: 'booking_cancelled',
          title: 'Booking Cancelled',
          message: `Booking for ${booking.patientName} has been cancelled. ${reason ? `Reason: ${reason}` : ''}`
        });
      }

      console.log(`Booking cancellation notifications created for booking ${booking.id}`);
    } catch (error) {
      console.error('Error creating booking cancellation notifications:', error);
    }
  }

  /**
   * Create notification for booking completion
   * @param {Object} booking - Booking object
   */
  static async createBookingCompletedNotifications(booking) {
    try {
      await BookingNotification.createBookingCompleted(
        booking.userId,
        booking.id,
        booking.hospitalName
      );

      console.log(`Booking completion notification created for booking ${booking.id}`);
    } catch (error) {
      console.error('Error creating booking completion notification:', error);
    }
  }

  /**
   * Get notifications for a user
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} Notifications and metadata
   */
  static getUserNotifications(userId, options = {}) {
    const notifications = BookingNotification.getByUser(userId, options);
    const unreadCount = BookingNotification.getUnreadCount(userId);

    return {
      notifications,
      unreadCount,
      totalCount: notifications.length
    };
  }

  /**
   * Mark notification as read
   * @param {number} notificationId - Notification ID
   * @param {number} userId - User ID
   * @returns {boolean} Success status
   */
  static markNotificationAsRead(notificationId, userId) {
    return BookingNotification.markAsRead(notificationId, userId);
  }

  /**
   * Mark all notifications as read for a user
   * @param {number} userId - User ID
   * @returns {number} Number of notifications marked as read
   */
  static markAllNotificationsAsRead(userId) {
    return BookingNotification.markAllAsRead(userId);
  }

  /**
   * Delete notification
   * @param {number} notificationId - Notification ID
   * @param {number} userId - User ID
   * @returns {boolean} Success status
   */
  static deleteNotification(notificationId, userId) {
    return BookingNotification.delete(notificationId, userId);
  }

  /**
   * Get notification statistics for a user
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} Statistics array
   */
  static getNotificationStatistics(userId, options = {}) {
    return BookingNotification.getStatistics({ userId, ...options });
  }

  /**
   * Clean up old notifications
   * @param {number} days - Number of days to keep (default: 30)
   * @returns {number} Number of notifications deleted
   */
  static cleanupOldNotifications(days = 30) {
    try {
      const deletedCount = BookingNotification.cleanup(days);
      console.log(`Cleaned up ${deletedCount} old notifications`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      return 0;
    }
  }

  /**
   * Send urgent notification for critical bookings
   * @param {Object} booking - Booking object
   */
  static async sendUrgentNotification(booking) {
    if (booking.urgency !== 'critical') {
      return;
    }

    try {
      // Get all hospital authorities for immediate notification
      const hospitalAuthorities = User.getHospitalAuthorities(booking.hospitalId);
      
      for (const authority of hospitalAuthorities) {
        await BookingNotification.create({
          userId: authority.id,
          bookingId: booking.id,
          type: 'booking_submitted',
          title: '🚨 CRITICAL BOOKING REQUEST',
          message: `URGENT: Critical booking request from ${booking.patientName}. Immediate attention required for ${booking.resourceType}.`
        });
      }

      console.log(`Urgent notifications sent for critical booking ${booking.id}`);
    } catch (error) {
      console.error('Error sending urgent notification:', error);
    }
  }

  /**
   * Get notifications for hospital authorities
   * @param {number} hospitalId - Hospital ID
   * @param {Object} options - Query options
   * @returns {Array} Notifications for hospital authorities
   */
  static getHospitalNotifications(hospitalId, options = {}) {
    try {
      const hospitalAuthorities = User.getHospitalAuthorities(hospitalId);
      const authorityIds = hospitalAuthorities.map(auth => auth.id);

      if (authorityIds.length === 0) {
        return [];
      }

      // Get notifications for all hospital authorities
      let allNotifications = [];
      authorityIds.forEach(userId => {
        const userNotifications = BookingNotification.getByUser(userId, options);
        allNotifications = allNotifications.concat(userNotifications);
      });

      // Sort by creation date (newest first)
      allNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply limit if specified
      if (options.limit) {
        allNotifications = allNotifications.slice(0, options.limit);
      }

      return allNotifications;
    } catch (error) {
      console.error('Error getting hospital notifications:', error);
      return [];
    }
  }

  /**
   * Create custom notification
   * @param {Object} notificationData - Notification data
   * @returns {number} Created notification ID
   */
  static createCustomNotification(notificationData) {
    return BookingNotification.create(notificationData);
  }

  /**
   * Bulk mark notifications as read
   * @param {Array} notificationIds - Array of notification IDs
   * @param {number} userId - User ID
   * @returns {number} Number of notifications marked as read
   */
  static bulkMarkAsRead(notificationIds, userId) {
    let markedCount = 0;
    
    notificationIds.forEach(id => {
      if (BookingNotification.markAsRead(id, userId)) {
        markedCount++;
      }
    });

    return markedCount;
  }

  /**
   * Get unread notification count for multiple users
   * @param {Array} userIds - Array of user IDs
   * @returns {Object} Object with userId as key and unread count as value
   */
  static getUnreadCountsForUsers(userIds) {
    const counts = {};
    
    userIds.forEach(userId => {
      counts[userId] = BookingNotification.getUnreadCount(userId);
    });

    return counts;
  }

  /**
   * Create reminder notification for pending bookings
   * @param {Object} booking - Booking object
   * @param {number} hoursWaiting - Hours the booking has been waiting
   */
  static async createPendingBookingReminder(booking, hoursWaiting) {
    try {
      if (hoursWaiting < 24) return; // Only remind after 24 hours

      const hospitalAuthorities = User.getHospitalAuthorities(booking.hospitalId);
      
      for (const authority of hospitalAuthorities) {
        await BookingNotification.create({
          userId: authority.id,
          bookingId: booking.id,
          type: 'booking_submitted',
          title: '⏰ Pending Booking Reminder',
          message: `Booking request from ${booking.patientName} has been pending for ${Math.floor(hoursWaiting)} hours. Please review and respond.`
        });
      }

      console.log(`Reminder notifications sent for pending booking ${booking.id}`);
    } catch (error) {
      console.error('Error creating pending booking reminder:', error);
    }
  }
}

module.exports = NotificationService;