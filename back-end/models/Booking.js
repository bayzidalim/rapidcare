const db = require('../config/database');
const BookingStatusHistory = require('./BookingStatusHistory');
const BookingNotification = require('./BookingNotification');
const { v4: uuidv4 } = require('uuid');

class Booking {
  static create(bookingData) {
    const transaction = db.transaction(() => {
      // Generate unique booking reference
      const bookingReference = this.generateBookingReference();
      
      const stmt = db.prepare(`
        INSERT INTO bookings (
          userId, hospitalId, resourceType, patientName, patientAge, 
          patientGender, emergencyContactName, emergencyContactPhone, 
          emergencyContactRelationship, medicalCondition, urgency, 
          scheduledDate, estimatedDuration, bookingReference, paymentAmount, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        bookingData.userId,
        bookingData.hospitalId,
        bookingData.resourceType,
        bookingData.patientName,
        bookingData.patientAge,
        bookingData.patientGender,
        bookingData.emergencyContactName,
        bookingData.emergencyContactPhone,
        bookingData.emergencyContactRelationship,
        bookingData.medicalCondition,
        bookingData.urgency || 'medium',
        bookingData.scheduledDate,
        bookingData.estimatedDuration || 24,
        bookingReference,
        bookingData.paymentAmount || 0,
        bookingData.notes
      );
      
      const bookingId = result.lastInsertRowid;
      
      // Log initial status
      BookingStatusHistory.create({
        bookingId,
        oldStatus: null,
        newStatus: 'pending',
        changedBy: bookingData.userId,
        reason: 'Booking created',
        notes: 'Initial booking submission'
      });
      
      return { id: bookingId, bookingReference };
    });
    
    return transaction();
  }

  /**
   * Generate unique booking reference
   * @returns {string} - Unique booking reference
   */
  static generateBookingReference() {
    const prefix = 'BK';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  static findById(id) {
    const stmt = db.prepare(`
      SELECT b.*, 
             h.name as hospitalName, 
             h.phone as hospitalPhone,
             h.email as hospitalEmail,
             u.name as userName,
             u.email as userEmail,
             u.phone as userPhone,
             approver.name as approvedByName
      FROM bookings b
      LEFT JOIN hospitals h ON b.hospitalId = h.id
      LEFT JOIN users u ON b.userId = u.id
      LEFT JOIN users approver ON b.approvedBy = approver.id
      WHERE b.id = ?
    `);
    return stmt.get(id);
  }

  /**
   * Find booking by reference number
   * @param {string} bookingReference - Booking reference
   * @returns {Object} - Booking object
   */
  static findByReference(bookingReference) {
    const stmt = db.prepare(`
      SELECT b.*, 
             h.name as hospitalName, 
             h.phone as hospitalPhone,
             h.email as hospitalEmail,
             u.name as userName,
             u.email as userEmail,
             u.phone as userPhone,
             approver.name as approvedByName
      FROM bookings b
      LEFT JOIN hospitals h ON b.hospitalId = h.id
      LEFT JOIN users u ON b.userId = u.id
      LEFT JOIN users approver ON b.approvedBy = approver.id
      WHERE b.bookingReference = ?
    `);
    return stmt.get(bookingReference);
  }

  static findByUserId(userId) {
    const stmt = db.prepare(`
      SELECT b.*, h.name as hospitalName
      FROM bookings b
      LEFT JOIN hospitals h ON b.hospitalId = h.id
      WHERE b.userId = ?
      ORDER BY b.createdAt DESC
    `);
    return stmt.all(userId);
  }

  static getAll() {
    const stmt = db.prepare(`
      SELECT b.*, h.name as hospitalName, u.name as userName
      FROM bookings b
      LEFT JOIN hospitals h ON b.hospitalId = h.id
      LEFT JOIN users u ON b.userId = u.id
      ORDER BY b.createdAt DESC
    `);
    return stmt.all();
  }

  static updateStatus(id, status, changedBy = null, reason = null, notes = null) {
    const transaction = db.transaction(() => {
      // Get current booking to track old status
      const currentBooking = this.findById(id);
      if (!currentBooking) {
        throw new Error('Booking not found');
      }

      // Update booking status
      const stmt = db.prepare(`
        UPDATE bookings 
        SET status = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(status, id);

      // Log status change if changedBy is provided
      if (changedBy) {
        BookingStatusHistory.create({
          bookingId: id,
          oldStatus: currentBooking.status,
          newStatus: status,
          changedBy,
          reason,
          notes
        });
      }
    });

    transaction();
    return true;
  }

  static updatePaymentStatus(id, paymentStatus, paymentMethod, transactionId) {
    const stmt = db.prepare(`
      UPDATE bookings 
      SET paymentStatus = ?, paymentMethod = ?, transactionId = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(paymentStatus, paymentMethod, transactionId, id);
  }

  static delete(id) {
    const stmt = db.prepare('DELETE FROM bookings WHERE id = ?');
    return stmt.run(id);
  }

  static getByHospital(hospitalId) {
    const stmt = db.prepare(`
      SELECT b.*, u.name as userName
      FROM bookings b
      LEFT JOIN users u ON b.userId = u.id
      WHERE b.hospitalId = ?
      ORDER BY b.createdAt DESC
    `);
    return stmt.all(hospitalId);
  }

  static getByStatus(status) {
    const stmt = db.prepare(`
      SELECT b.*, h.name as hospitalName, u.name as userName
      FROM bookings b
      LEFT JOIN hospitals h ON b.hospitalId = h.id
      LEFT JOIN users u ON b.userId = u.id
      WHERE b.status = ?
      ORDER BY b.createdAt DESC
    `);
    return stmt.all(status);
  }

  /**
   * Get pending bookings for a hospital
   * @param {number} hospitalId - Hospital ID
   * @param {Object} options - Query options
   * @returns {Array} Array of pending bookings
   */
  static getPendingByHospital(hospitalId, options = {}) {
    let query = `
      SELECT b.*, 
             u.name as userName,
             u.phone as userPhone,
             h.name as hospitalName
      FROM bookings b
      LEFT JOIN users u ON b.userId = u.id
      LEFT JOIN hospitals h ON b.hospitalId = h.id
      WHERE b.hospitalId = ? AND b.status = 'pending'
    `;
    
    const params = [hospitalId];
    
    // Add urgency filter
    if (options.urgency) {
      query += ' AND b.urgency = ?';
      params.push(options.urgency);
    }
    
    // Add resource type filter
    if (options.resourceType) {
      query += ' AND b.resourceType = ?';
      params.push(options.resourceType);
    }
    
    // Order by urgency and creation date
    query += ` 
      ORDER BY 
        CASE b.urgency 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        b.createdAt ASC
    `;
    
    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Approve a booking
   * @param {number} id - Booking ID
   * @param {number} approvedBy - User who approved the booking
   * @param {string} notes - Approval notes
   * @returns {boolean} Success status
   */
  static approve(id, approvedBy, notes = null) {
    const transaction = db.transaction(() => {
      // Get current booking
      const booking = this.findById(id);
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      if (booking.status !== 'pending') {
        throw new Error('Only pending bookings can be approved');
      }

      // Update booking
      const stmt = db.prepare(`
        UPDATE bookings 
        SET status = 'approved', 
            approvedBy = ?, 
            approvedAt = CURRENT_TIMESTAMP,
            authorityNotes = ?,
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(approvedBy, notes, id);

      // Log the approval
      BookingStatusHistory.logApproval(id, approvedBy, notes);
    });

    transaction();
    return true;
  }

  /**
   * Decline a booking
   * @param {number} id - Booking ID
   * @param {number} declinedBy - User who declined the booking
   * @param {string} reason - Reason for decline
   * @param {string} notes - Additional notes
   * @returns {boolean} Success status
   */
  static decline(id, declinedBy, reason, notes = null) {
    const transaction = db.transaction(() => {
      // Get current booking
      const booking = this.findById(id);
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      if (booking.status !== 'pending') {
        throw new Error('Only pending bookings can be declined');
      }

      // Update booking
      const stmt = db.prepare(`
        UPDATE bookings 
        SET status = 'declined', 
            approvedBy = ?, 
            approvedAt = CURRENT_TIMESTAMP,
            declineReason = ?,
            authorityNotes = ?,
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(declinedBy, reason, notes, id);

      // Log the decline
      BookingStatusHistory.logDecline(id, declinedBy, reason, notes);
    });

    transaction();
    return true;
  }

  /**
   * Complete a booking
   * @param {number} id - Booking ID
   * @param {number} completedBy - User who completed the booking
   * @param {string} notes - Completion notes
   * @returns {boolean} Success status
   */
  static complete(id, completedBy, notes = null) {
    const transaction = db.transaction(() => {
      // Get current booking
      const booking = this.findById(id);
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      if (booking.status !== 'approved') {
        throw new Error('Only approved bookings can be completed');
      }

      // Update booking
      const stmt = db.prepare(`
        UPDATE bookings 
        SET status = 'completed', 
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(id);

      // Log the completion
      BookingStatusHistory.logCompletion(id, completedBy, notes);
    });

    transaction();
    return true;
  }

  /**
   * Cancel a booking
   * @param {number} id - Booking ID
   * @param {number} cancelledBy - User who cancelled the booking
   * @param {string} reason - Reason for cancellation
   * @param {string} notes - Additional notes
   * @returns {boolean} Success status
   */
  static cancel(id, cancelledBy, reason, notes = null) {
    const transaction = db.transaction(() => {
      // Get current booking
      const booking = this.findById(id);
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      if (!['pending', 'approved'].includes(booking.status)) {
        throw new Error('Only pending or approved bookings can be cancelled');
      }

      // Update booking
      const stmt = db.prepare(`
        UPDATE bookings 
        SET status = 'cancelled', 
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(id);

      // Log the cancellation
      BookingStatusHistory.logCancellation(id, cancelledBy, reason, notes);
    });

    transaction();
    return true;
  }

  /**
   * Get booking statistics for a hospital
   * @param {number} hospitalId - Hospital ID
   * @param {Object} options - Query options
   * @returns {Object} Booking statistics
   */
  static getStatistics(hospitalId, options = {}) {
    let query = `
      SELECT 
        status,
        COUNT(*) as count,
        AVG(paymentAmount) as avgAmount
      FROM bookings
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
    
    query += ' GROUP BY status';
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Get bookings with status history
   * @param {number} hospitalId - Hospital ID
   * @param {Object} options - Query options
   * @returns {Array} Bookings with their status history
   */
  static getWithHistory(hospitalId, options = {}) {
    const bookings = this.getByHospital(hospitalId);
    
    return bookings.map(booking => ({
      ...booking,
      statusHistory: BookingStatusHistory.getByBooking(booking.id)
    }));
  }

  /**
   * Set booking expiration
   * @param {number} id - Booking ID
   * @param {Date} expiresAt - Expiration date
   * @returns {boolean} Success status
   */
  static setExpiration(id, expiresAt) {
    const stmt = db.prepare(`
      UPDATE bookings 
      SET expiresAt = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    // Convert Date object to ISO string for SQLite
    const expirationString = expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt;
    stmt.run(expirationString, id);
    return true;
  }

  /**
   * Get expired bookings
   * @returns {Array} Array of expired bookings
   */
  static getExpired() {
    const stmt = db.prepare(`
      SELECT b.*, h.name as hospitalName, u.name as userName
      FROM bookings b
      LEFT JOIN hospitals h ON b.hospitalId = h.id
      LEFT JOIN users u ON b.userId = u.id
      WHERE b.expiresAt IS NOT NULL 
      AND b.expiresAt < CURRENT_TIMESTAMP
      AND b.status IN ('pending', 'approved')
    `);
    return stmt.all();
  }

  static count(options = {}) {
    let query = 'SELECT COUNT(*) as count FROM bookings';
    const params = [];
    if (options && options.where) {
      const conditions = [];
      Object.keys(options.where).forEach(key => {
        const value = options.where[key];
        if (
          typeof value === 'number' ||
          typeof value === 'string' ||
          typeof value === 'bigint' ||
          value === null
        ) {
          conditions.push(`${key} = ?`);
          params.push(value);
        }
      });
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
    }
    const stmt = db.prepare(query);
    const result = stmt.get(...params);
    return result.count;
  }
}

module.exports = Booking; 