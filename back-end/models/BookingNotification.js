const db = require('../config/database');

class BookingNotification {
  /**
   * Create a new booking notification
   * @param {Object} notificationData - Notification data
   * @returns {number} - Inserted row ID
   */
  static create(notificationData) {
    const stmt = db.prepare(`
      INSERT INTO booking_notifications (
        userId, bookingId, type, title, message
      )
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      notificationData.userId,
      notificationData.bookingId,
      notificationData.type,
      notificationData.title,
      notificationData.message
    );
    
    return result.lastInsertRowid;
  }

  /**
   * Get notifications for a user
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} - Array of notifications
   */
  static getByUser(userId, options = {}) {
    // Validate userId
    if (!userId || typeof userId !== 'number') {
      throw new Error('Valid userId is required');
    }

    let query = `
      SELECT bn.*, b.bookingReference, b.patientName, h.name as hospitalName
      FROM booking_notifications bn
      LEFT JOIN bookings b ON bn.bookingId = b.id
      LEFT JOIN hospitals h ON b.hospitalId = h.id
      WHERE bn.userId = ?
    `;
    
    const params = [userId];
    
    if (options.isRead !== undefined) {
      query += ' AND bn.isRead = ?';
      params.push(options.isRead ? 1 : 0);
    }
    
    if (options.type) {
      query += ' AND bn.type = ?';
      params.push(options.type);
    }
    
    query += ' ORDER BY bn.createdAt DESC';
    
    if (options.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(options.limit));
    }
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Get unread notification count for a user
   * @param {number} userId - User ID
   * @returns {number} - Unread notification count
   */
  static getUnreadCount(userId) {
    // Validate userId
    if (!userId || typeof userId !== 'number') {
      throw new Error('Valid userId is required');
    }

    const stmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM booking_notifications 
      WHERE userId = ? AND isRead = 0
    `);
    const result = stmt.get(userId);
    return result.count;
  }

  /**
   * Mark notification as read
   * @param {number} notificationId - Notification ID
   * @param {number} userId - User ID (for security)
   * @returns {boolean} - Success status
   */
  static markAsRead(notificationId, userId) {
    // Validate parameters
    if (!notificationId || typeof notificationId !== 'number') {
      throw new Error('Valid notificationId is required');
    }
    if (!userId || typeof userId !== 'number') {
      throw new Error('Valid userId is required');
    }

    const stmt = db.prepare(`
      UPDATE booking_notifications 
      SET isRead = 1 
      WHERE id = ? AND userId = ?
    `);
    const result = stmt.run(notificationId, userId);
    return result.changes > 0;
  }

  /**
   * Mark all notifications as read for a user
   * @param {number} userId - User ID
   * @returns {number} - Number of updated notifications
   */
  static markAllAsRead(userId) {
    // Validate userId
    if (!userId || typeof userId !== 'number') {
      throw new Error('Valid userId is required');
    }

    const stmt = db.prepare(`
      UPDATE booking_notifications 
      SET isRead = 1 
      WHERE userId = ? AND isRead = 0
    `);
    const result = stmt.run(userId);
    return result.changes;
  }

  /**
   * Create booking submitted notification
   * @param {number} userId - User ID (patient)
   * @param {number} bookingId - Booking ID
   * @param {string} hospitalName - Hospital name
   */
  static createBookingSubmitted(userId, bookingId, hospitalName) {
    return this.create({
      userId,
      bookingId,
      type: 'booking_submitted',
      title: 'Booking Request Submitted',
      message: `Your booking request has been submitted to ${hospitalName}. You will be notified once the hospital reviews your request.`
    });
  }

  /**
   * Create booking approved notification
   * @param {number} userId - User ID (patient)
   * @param {number} bookingId - Booking ID
   * @param {string} hospitalName - Hospital name
   * @param {string} notes - Approval notes
   */
  static createBookingApproved(userId, bookingId, hospitalName, notes = null) {
    const message = notes 
      ? `Your booking request at ${hospitalName} has been approved. Notes: ${notes}`
      : `Your booking request at ${hospitalName} has been approved. Please prepare for your scheduled appointment.`;
    
    return this.create({
      userId,
      bookingId,
      type: 'booking_approved',
      title: 'Booking Request Approved',
      message
    });
  }

  /**
   * Create booking declined notification
   * @param {number} userId - User ID (patient)
   * @param {number} bookingId - Booking ID
   * @param {string} hospitalName - Hospital name
   * @param {string} reason - Decline reason
   * @param {string} notes - Additional notes
   */
  static createBookingDeclined(userId, bookingId, hospitalName, reason, notes = null) {
    let message = `Your booking request at ${hospitalName} has been declined. Reason: ${reason}`;
    if (notes) {
      message += `. Additional notes: ${notes}`;
    }
    
    return this.create({
      userId,
      bookingId,
      type: 'booking_declined',
      title: 'Booking Request Declined',
      message
    });
  }

  /**
   * Create booking cancelled notification
   * @param {number} userId - User ID (patient)
   * @param {number} bookingId - Booking ID
   * @param {string} hospitalName - Hospital name
   * @param {string} reason - Cancellation reason
   */
  static createBookingCancelled(userId, bookingId, hospitalName, reason = null) {
    const message = reason 
      ? `Your booking at ${hospitalName} has been cancelled. Reason: ${reason}`
      : `Your booking at ${hospitalName} has been cancelled.`;
    
    return this.create({
      userId,
      bookingId,
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      message
    });
  }

  /**
   * Create booking completed notification
   * @param {number} userId - User ID (patient)
   * @param {number} bookingId - Booking ID
   * @param {string} hospitalName - Hospital name
   */
  static createBookingCompleted(userId, bookingId, hospitalName) {
    return this.create({
      userId,
      bookingId,
      type: 'booking_completed',
      title: 'Booking Completed',
      message: `Your booking at ${hospitalName} has been completed. Thank you for using our service.`
    });
  }

  /**
   * Create new booking notification for hospital authority
   * @param {number} userId - Hospital authority user ID
   * @param {number} bookingId - Booking ID
   * @param {string} patientName - Patient name
   * @param {string} urgency - Booking urgency
   */
  static createNewBookingForHospital(userId, bookingId, patientName, urgency) {
    const urgencyText = urgency === 'critical' ? ' (CRITICAL)' : urgency === 'high' ? ' (HIGH PRIORITY)' : '';
    
    return this.create({
      userId,
      bookingId,
      type: 'booking_submitted',
      title: `New Booking Request${urgencyText}`,
      message: `A new booking request has been submitted by ${patientName}. Please review and respond promptly.`
    });
  }

  /**
   * Delete notification
   * @param {number} notificationId - Notification ID
   * @param {number} userId - User ID (for security)
   * @returns {boolean} - Success status
   */
  static delete(notificationId, userId) {
    const stmt = db.prepare(`
      DELETE FROM booking_notifications 
      WHERE id = ? AND userId = ?
    `);
    const result = stmt.run(notificationId, userId);
    return result.changes > 0;
  }

  /**
   * Delete old notifications
   * @param {number} days - Number of days to keep
   * @returns {number} - Number of deleted notifications
   */
  static cleanup(days = 30) {
    const stmt = db.prepare(`
      DELETE FROM booking_notifications 
      WHERE createdAt < datetime('now', '-' || ? || ' days')
    `);
    return stmt.run(days).changes;
  }

  /**
   * Get notification statistics
   * @param {Object} options - Query options
   * @returns {Object} - Statistics object
   */
  static getStatistics(options = {}) {
    let query = `
      SELECT 
        type,
        isRead,
        COUNT(*) as count,
        DATE(createdAt) as date
      FROM booking_notifications
    `;
    
    const params = [];
    const conditions = [];
    
    if (options.userId) {
      conditions.push('userId = ?');
      params.push(options.userId);
    }
    
    if (options.startDate) {
      conditions.push('createdAt >= ?');
      params.push(options.startDate);
    }
    
    if (options.endDate) {
      conditions.push('createdAt <= ?');
      params.push(options.endDate);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' GROUP BY type, isRead, DATE(createdAt) ORDER BY date DESC';
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Get all notifications with optional filtering
   * @param {Object} options - Query options
   * @returns {Array} - Array of notifications
   */
  static getAll(options = {}) {
    let query = `
      SELECT bn.*, b.bookingReference, b.patientName, h.name as hospitalName, u.name as userName
      FROM booking_notifications bn
      LEFT JOIN bookings b ON bn.bookingId = b.id
      LEFT JOIN hospitals h ON b.hospitalId = h.id
      LEFT JOIN users u ON bn.userId = u.id
    `;
    
    const params = [];
    const conditions = [];
    
    if (options.userId) {
      conditions.push('bn.userId = ?');
      params.push(options.userId);
    }
    
    if (options.type) {
      conditions.push('bn.type = ?');
      params.push(options.type);
    }
    
    if (options.isRead !== undefined) {
      conditions.push('bn.isRead = ?');
      params.push(options.isRead ? 1 : 0);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY bn.createdAt DESC';
    
    if (options.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(options.limit));
    }
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }
}

module.exports = BookingNotification;