const db = require('../config/database');

class BookingStatusHistory {
  /**
   * Create a new status history entry
   * @param {Object} historyData - Status history data
   * @returns {number} - Inserted row ID
   */
  static create(historyData) {
    const stmt = db.prepare(`
      INSERT INTO booking_status_history (
        bookingId, oldStatus, newStatus, changedBy, reason, notes
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      historyData.bookingId,
      historyData.oldStatus,
      historyData.newStatus,
      historyData.changedBy,
      historyData.reason,
      historyData.notes
    );
    
    return result.lastInsertRowid;
  }

  /**
   * Get status history for a specific booking
   * @param {number} bookingId - Booking ID
   * @returns {Array} - Array of status history entries
   */
  static getByBooking(bookingId) {
    const stmt = db.prepare(`
      SELECT bsh.*, u.name as changedByName
      FROM booking_status_history bsh
      LEFT JOIN users u ON bsh.changedBy = u.id
      WHERE bsh.bookingId = ?
      ORDER BY bsh.changedAt ASC
    `);
    return stmt.all(bookingId);
  }

  /**
   * Get all status history entries
   * @param {Object} options - Query options
   * @returns {Array} - Array of status history entries
   */
  static getAll(options = {}) {
    let query = `
      SELECT bsh.*, u.name as changedByName, b.bookingReference, b.patientName
      FROM booking_status_history bsh
      LEFT JOIN users u ON bsh.changedBy = u.id
      LEFT JOIN bookings b ON bsh.bookingId = b.id
    `;
    
    const params = [];
    const conditions = [];
    
    if (options.hospitalId) {
      conditions.push('b.hospitalId = ?');
      params.push(options.hospitalId);
    }
    
    if (options.userId) {
      conditions.push('bsh.changedBy = ?');
      params.push(options.userId);
    }
    
    if (options.startDate) {
      conditions.push('bsh.changedAt >= ?');
      params.push(options.startDate);
    }
    
    if (options.endDate) {
      conditions.push('bsh.changedAt <= ?');
      params.push(options.endDate);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY bsh.changedAt DESC';
    
    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Log booking approval
   * @param {number} bookingId - Booking ID
   * @param {number} approvedBy - User who approved
   * @param {string} notes - Approval notes
   */
  static logApproval(bookingId, approvedBy, notes = null) {
    return this.create({
      bookingId,
      oldStatus: 'pending',
      newStatus: 'approved',
      changedBy: approvedBy,
      reason: 'Booking approved by hospital authority',
      notes
    });
  }

  /**
   * Log booking decline
   * @param {number} bookingId - Booking ID
   * @param {number} declinedBy - User who declined
   * @param {string} reason - Decline reason
   * @param {string} notes - Additional notes
   */
  static logDecline(bookingId, declinedBy, reason, notes = null) {
    return this.create({
      bookingId,
      oldStatus: 'pending',
      newStatus: 'declined',
      changedBy: declinedBy,
      reason: reason || 'Booking declined by hospital authority',
      notes
    });
  }

  /**
   * Log booking completion
   * @param {number} bookingId - Booking ID
   * @param {number} completedBy - User who completed
   * @param {string} notes - Completion notes
   */
  static logCompletion(bookingId, completedBy, notes = null) {
    return this.create({
      bookingId,
      oldStatus: 'approved',
      newStatus: 'completed',
      changedBy: completedBy,
      reason: 'Booking completed',
      notes
    });
  }

  /**
   * Log booking cancellation
   * @param {number} bookingId - Booking ID
   * @param {number} cancelledBy - User who cancelled
   * @param {string} reason - Cancellation reason
   * @param {string} notes - Additional notes
   */
  static logCancellation(bookingId, cancelledBy, reason, notes = null) {
    return this.create({
      bookingId,
      oldStatus: null, // Will be determined by current booking status
      newStatus: 'cancelled',
      changedBy: cancelledBy,
      reason: reason || 'Booking cancelled',
      notes
    });
  }

  /**
   * Delete status history for a booking
   * @param {number} bookingId - Booking ID
   * @returns {number} - Number of deleted rows
   */
  static deleteByBooking(bookingId) {
    const stmt = db.prepare('DELETE FROM booking_status_history WHERE bookingId = ?');
    return stmt.run(bookingId).changes;
  }

  /**
   * Get status history statistics
   * @param {Object} options - Query options
   * @returns {Object} - Statistics object
   */
  static getStatistics(options = {}) {
    let query = `
      SELECT 
        newStatus,
        COUNT(*) as count,
        DATE(changedAt) as date
      FROM booking_status_history bsh
    `;
    
    const params = [];
    const conditions = [];
    
    if (options.hospitalId) {
      query += ' LEFT JOIN bookings b ON bsh.bookingId = b.id';
      conditions.push('b.hospitalId = ?');
      params.push(options.hospitalId);
    }
    
    if (options.startDate) {
      conditions.push('bsh.changedAt >= ?');
      params.push(options.startDate);
    }
    
    if (options.endDate) {
      conditions.push('bsh.changedAt <= ?');
      params.push(options.endDate);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' GROUP BY newStatus, DATE(changedAt) ORDER BY date DESC';
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }
}

module.exports = BookingStatusHistory;