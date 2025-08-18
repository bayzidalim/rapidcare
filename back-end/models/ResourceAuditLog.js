const db = require('../config/database');

class ResourceAuditLog {
  /**
   * Create a new resource audit log entry
   * @param {Object} logData - Audit log data
   * @returns {number} - Inserted row ID
   */
  static create(logData) {
    const stmt = db.prepare(`
      INSERT INTO resource_audit_log (
        hospitalId, resourceType, actionType, oldValue, newValue, 
        quantity, bookingId, performedBy, reason
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      logData.hospitalId,
      logData.resourceType,
      logData.actionType,
      logData.oldValue,
      logData.newValue,
      logData.quantity,
      logData.bookingId,
      logData.performedBy,
      logData.reason
    );
    
    return result.lastInsertRowid;
  }

  /**
   * Log manual resource update
   * @param {number} hospitalId - Hospital ID
   * @param {string} resourceType - Resource type
   * @param {number} oldValue - Old resource count
   * @param {number} newValue - New resource count
   * @param {number} performedBy - User who performed the update
   * @param {string} reason - Reason for update
   */
  static logManualUpdate(hospitalId, resourceType, oldValue, newValue, performedBy, reason) {
    return this.create({
      hospitalId,
      resourceType,
      actionType: 'manual_update',
      oldValue,
      newValue,
      quantity: newValue - oldValue,
      bookingId: null,
      performedBy,
      reason
    });
  }

  /**
   * Log resource allocation for booking approval
   * @param {number} hospitalId - Hospital ID
   * @param {string} resourceType - Resource type
   * @param {number} quantity - Quantity allocated
   * @param {number} bookingId - Booking ID
   * @param {number} performedBy - User who approved the booking
   */
  static logBookingApproval(hospitalId, resourceType, quantity, bookingId, performedBy) {
    return this.create({
      hospitalId,
      resourceType,
      actionType: 'booking_approval',
      oldValue: null,
      newValue: null,
      quantity: -quantity, // Negative because resources are being allocated
      bookingId,
      performedBy,
      reason: `Resources allocated for booking approval`
    });
  }

  /**
   * Log resource release for booking completion
   * @param {number} hospitalId - Hospital ID
   * @param {string} resourceType - Resource type
   * @param {number} quantity - Quantity released
   * @param {number} bookingId - Booking ID
   * @param {number} performedBy - User who completed the booking
   */
  static logBookingCompletion(hospitalId, resourceType, quantity, bookingId, performedBy) {
    return this.create({
      hospitalId,
      resourceType,
      actionType: 'booking_completion',
      oldValue: null,
      newValue: null,
      quantity: quantity, // Positive because resources are being released
      bookingId,
      performedBy,
      reason: `Resources released after booking completion`
    });
  }

  /**
   * Log resource release for booking cancellation
   * @param {number} hospitalId - Hospital ID
   * @param {string} resourceType - Resource type
   * @param {number} quantity - Quantity released
   * @param {number} bookingId - Booking ID
   * @param {number} performedBy - User who cancelled the booking
   */
  static logBookingCancellation(hospitalId, resourceType, quantity, bookingId, performedBy) {
    return this.create({
      hospitalId,
      resourceType,
      actionType: 'booking_cancellation',
      oldValue: null,
      newValue: null,
      quantity: quantity, // Positive because resources are being released
      bookingId,
      performedBy,
      reason: `Resources released due to booking cancellation`
    });
  }

  /**
   * Get audit log entries for a hospital
   * @param {number} hospitalId - Hospital ID
   * @param {Object} options - Query options
   * @returns {Array} - Array of audit log entries
   */
  static getByHospital(hospitalId, options = {}) {
    let query = `
      SELECT ral.*, u.name as performedByName, b.bookingReference, b.patientName
      FROM resource_audit_log ral
      LEFT JOIN users u ON ral.performedBy = u.id
      LEFT JOIN bookings b ON ral.bookingId = b.id
      WHERE ral.hospitalId = ?
    `;
    
    const params = [hospitalId];
    
    if (options.resourceType) {
      query += ' AND ral.resourceType = ?';
      params.push(options.resourceType);
    }
    
    if (options.actionType) {
      query += ' AND ral.actionType = ?';
      params.push(options.actionType);
    }
    
    if (options.startDate) {
      query += ' AND ral.createdAt >= ?';
      params.push(options.startDate);
    }
    
    if (options.endDate) {
      query += ' AND ral.createdAt <= ?';
      params.push(options.endDate);
    }
    
    query += ' ORDER BY ral.createdAt DESC';
    
    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Get audit log entries for a specific booking
   * @param {number} bookingId - Booking ID
   * @returns {Array} - Array of audit log entries
   */
  static getByBooking(bookingId) {
    const stmt = db.prepare(`
      SELECT ral.*, u.name as performedByName, h.name as hospitalName
      FROM resource_audit_log ral
      LEFT JOIN users u ON ral.performedBy = u.id
      LEFT JOIN hospitals h ON ral.hospitalId = h.id
      WHERE ral.bookingId = ?
      ORDER BY ral.createdAt ASC
    `);
    return stmt.all(bookingId);
  }

  /**
   * Get resource utilization statistics
   * @param {number} hospitalId - Hospital ID
   * @param {Object} options - Query options
   * @returns {Object} - Utilization statistics
   */
  static getUtilizationStats(hospitalId, options = {}) {
    let query = `
      SELECT 
        resourceType,
        actionType,
        SUM(quantity) as totalQuantity,
        COUNT(*) as actionCount,
        DATE(createdAt) as date
      FROM resource_audit_log
      WHERE hospitalId = ?
    `;
    
    const params = [hospitalId];
    
    if (options.startDate) {
      query += ' AND createdAt >= ?';
      params.push(options.startDate);
    }
    
    if (options.endDate) {
      query += ' AND createdAt <= ?';
      params.push(options.endDate);
    }
    
    query += ' GROUP BY resourceType, actionType, DATE(createdAt) ORDER BY date DESC';
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Delete audit log entries older than specified days
   * @param {number} days - Number of days to keep
   * @returns {number} - Number of deleted rows
   */
  static cleanup(days = 365) {
    const stmt = db.prepare(`
      DELETE FROM resource_audit_log 
      WHERE createdAt < datetime('now', '-' || ? || ' days')
    `);
    return stmt.run(days).changes;
  }

  /**
   * Get all audit log entries with optional filtering
   * @param {Object} options - Query options
   * @returns {Array} - Array of audit log entries
   */
  static getAll(options = {}) {
    let query = `
      SELECT ral.*, u.name as performedByName, h.name as hospitalName, b.bookingReference
      FROM resource_audit_log ral
      LEFT JOIN users u ON ral.performedBy = u.id
      LEFT JOIN hospitals h ON ral.hospitalId = h.id
      LEFT JOIN bookings b ON ral.bookingId = b.id
    `;
    
    const params = [];
    const conditions = [];
    
    if (options.hospitalId) {
      conditions.push('ral.hospitalId = ?');
      params.push(options.hospitalId);
    }
    
    if (options.resourceType) {
      conditions.push('ral.resourceType = ?');
      params.push(options.resourceType);
    }
    
    if (options.actionType) {
      conditions.push('ral.actionType = ?');
      params.push(options.actionType);
    }
    
    if (options.performedBy) {
      conditions.push('ral.performedBy = ?');
      params.push(options.performedBy);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY ral.createdAt DESC';
    
    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }
}

module.exports = ResourceAuditLog;