const Booking = require('../models/Booking');
const BookingStatusHistory = require('../models/BookingStatusHistory');
const BookingNotification = require('../models/BookingNotification');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const db = require('../config/database');

class BookingService {
  /**
   * Create a new booking with validation and notifications
   * @param {Object} bookingData - Booking data
   * @returns {Object} - Created booking with reference
   */
  static create(bookingData) {
    // Use database transaction for data consistency
    const transaction = db.transaction(() => {
      // Validate booking data
      this.validateBookingData(bookingData);
      
      // Check resource availability with row-level locking
      const availability = Hospital.checkResourceAvailability(
        bookingData.hospitalId, 
        bookingData.resourceType, 
        1
      );
      
      if (!availability.available) {
        throw new Error(`Insufficient ${bookingData.resourceType} available. ${availability.message}`);
      }

      // Verify hospital is active and approved
      const hospital = Hospital.findById(bookingData.hospitalId);
      if (!hospital || !hospital.isActive || hospital.approval_status !== 'approved') {
        throw new Error('Hospital is not available for bookings');
      }

      // Verify user is active
      const user = User.findById(bookingData.userId);
      if (!user || !user.isActive) {
        throw new Error('User account is not active');
      }

      // Check for duplicate bookings (same user, hospital, resource, date)
      const duplicateCheck = db.prepare(`
        SELECT id FROM bookings 
        WHERE userId = ? AND hospitalId = ? AND resourceType = ? 
        AND DATE(scheduledDate) = DATE(?) 
        AND status IN ('pending', 'approved')
      `).get(
        bookingData.userId,
        bookingData.hospitalId,
        bookingData.resourceType,
        bookingData.scheduledDate
      );

      if (duplicateCheck) {
        throw new Error('You already have a booking for this resource on the same date');
      }
      
      // Create booking
      const result = Booking.create(bookingData);
      
      // Get the created booking with full details
      const booking = Booking.findById(result.id);
      
      // Create status history entry
      BookingStatusHistory.create({
        bookingId: booking.id,
        oldStatus: null,
        newStatus: 'pending',
        changedBy: bookingData.userId,
        reason: 'Booking created',
        notes: 'Initial booking submission'
      });

      // Create notifications (within transaction)
      this.createBookingNotifications(booking);
      
      return {
        ...booking,
        bookingReference: result.bookingReference
      };
    });

    return transaction();
  }

  /**
   * Validate booking data
   * @param {Object} bookingData - Booking data to validate
   */
  static validateBookingData(bookingData) {
    const errors = [];
    
    // Required fields validation
    if (!bookingData.userId) errors.push('User ID is required');
    if (!bookingData.hospitalId) errors.push('Hospital ID is required');
    if (!bookingData.resourceType) errors.push('Resource type is required');
    if (!bookingData.patientName?.trim()) errors.push('Patient name is required');
    if (!bookingData.patientAge || bookingData.patientAge < 1 || bookingData.patientAge > 150) {
      errors.push('Valid patient age (1-150) is required');
    }
    if (!bookingData.patientGender) errors.push('Patient gender is required');
    if (!bookingData.medicalCondition?.trim()) errors.push('Medical condition is required');
    if (!bookingData.emergencyContactName?.trim()) errors.push('Emergency contact name is required');
    if (!bookingData.emergencyContactPhone?.trim()) errors.push('Emergency contact phone is required');
    if (!bookingData.emergencyContactRelationship?.trim()) errors.push('Emergency contact relationship is required');
    if (!bookingData.scheduledDate) errors.push('Scheduled date is required');
    
    // Validate resource type
    const validResourceTypes = ['beds', 'icu', 'operationTheatres'];
    if (bookingData.resourceType && !validResourceTypes.includes(bookingData.resourceType)) {
      errors.push('Invalid resource type');
    }
    
    // Validate gender
    const validGenders = ['male', 'female', 'other'];
    if (bookingData.patientGender && !validGenders.includes(bookingData.patientGender)) {
      errors.push('Invalid patient gender');
    }
    
    // Validate urgency
    const validUrgencies = ['low', 'medium', 'high', 'critical'];
    if (bookingData.urgency && !validUrgencies.includes(bookingData.urgency)) {
      errors.push('Invalid urgency level');
    }
    
    // Validate scheduled date (must be in the future)
    const scheduledDate = new Date(bookingData.scheduledDate);
    const now = new Date();
    if (scheduledDate <= now) {
      errors.push('Scheduled date must be in the future');
    }
    
    // Validate estimated duration
    if (bookingData.estimatedDuration && (bookingData.estimatedDuration < 1 || bookingData.estimatedDuration > 168)) {
      errors.push('Estimated duration must be between 1 and 168 hours');
    }
    
    // Validate phone number format (basic validation)
    if (bookingData.emergencyContactPhone && !/^[\d\s\-\+\(\)]+$/.test(bookingData.emergencyContactPhone)) {
      errors.push('Invalid emergency contact phone number format');
    }
    
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Create notifications for new booking
   * @param {Object} booking - Booking object
   */
  static createBookingNotifications(booking) {
    try {
      // Notify patient
      BookingNotification.createBookingSubmitted(
        booking.userId,
        booking.id,
        booking.hospitalName
      );
      
      // Notify hospital authorities
      const hospitalAuthorities = User.getHospitalAuthorities(booking.hospitalId);
      hospitalAuthorities.forEach(authority => {
        BookingNotification.createNewBookingForHospital(
          authority.id,
          booking.id,
          booking.patientName,
          booking.urgency
        );
      });
    } catch (error) {
      console.error('Error creating booking notifications:', error);
      // Don't throw error as booking creation should succeed even if notifications fail
    }
  }

  /**
   * Get booking by ID with full details
   * @param {number} id - Booking ID
   * @returns {Object} - Booking object
   */
  static getById(id) {
    return Booking.findById(id);
  }

  /**
   * Get booking by reference
   * @param {string} reference - Booking reference
   * @returns {Object} - Booking object
   */
  static getByReference(reference) {
    return Booking.findByReference(reference);
  }

  /**
   * Get bookings by user ID
   * @param {number} userId - User ID
   * @returns {Array} - Array of bookings
   */
  static getByUserId(userId) {
    return Booking.findByUserId(userId);
  }

  /**
   * Get bookings by hospital ID
   * @param {number} hospitalId - Hospital ID
   * @returns {Array} - Array of bookings
   */
  static getByHospitalId(hospitalId) {
    return Booking.getByHospital(hospitalId);
  }

  /**
   * Get all bookings
   * @returns {Array} - Array of all bookings
   */
  static getAll() {
    return Booking.getAll();
  }

  /**
   * Update booking status with history tracking
   * @param {number} id - Booking ID
   * @param {string} status - New status
   * @param {number} changedBy - User who changed the status
   * @param {string} reason - Reason for change
   * @param {string} notes - Additional notes
   * @returns {boolean} - Success status
   */
  static updateStatus(id, status, changedBy = null, reason = null, notes = null) {
    return Booking.updateStatus(id, status, changedBy, reason, notes);
  }

  /**
   * Approve a booking
   * @param {number} id - Booking ID
   * @param {number} approvedBy - User who approved
   * @param {Object} approvalData - Approval data
   * @returns {Object} - Updated booking
   */
  static approve(id, approvedBy, approvalData = {}) {
    // Use database transaction for data consistency
    const transaction = db.transaction(() => {
      const booking = Booking.findById(id);
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      if (booking.status !== 'pending') {
        throw new Error('Only pending bookings can be approved');
      }

      // Verify approver has permission
      const approver = User.findById(approvedBy);
      if (!approver || !approver.isActive) {
        throw new Error('Invalid approver');
      }

      if (approver.userType === 'hospital-authority' && approver.hospital_id !== booking.hospitalId) {
        throw new Error('Approver can only approve bookings for their assigned hospital');
      }
      
      // Check resource availability before approval with row locking
      const availability = Hospital.checkResourceAvailability(
        booking.hospitalId,
        booking.resourceType,
        approvalData.resourcesAllocated || 1
      );
      
      if (!availability.available) {
        throw new Error(`Insufficient resources available for approval. ${availability.message}`);
      }

      // Verify booking hasn't been modified by another process
      const currentBooking = Booking.findById(id);
      if (currentBooking.status !== 'pending') {
        throw new Error('Booking status has changed. Please refresh and try again.');
      }
      
      // Approve booking
      Booking.approve(id, approvedBy, approvalData.notes);
      
      // Allocate resources if specified
      if (approvalData.autoAllocateResources !== false) {
        const resourcesAllocated = approvalData.resourcesAllocated || 1;
        
        // Double-check availability before allocation
        const finalAvailability = Hospital.checkResourceAvailability(
          booking.hospitalId,
          booking.resourceType,
          resourcesAllocated
        );
        
        if (!finalAvailability.available) {
          throw new Error('Resources became unavailable during approval process');
        }

        Hospital.allocateResources(
          booking.hospitalId,
          booking.resourceType,
          resourcesAllocated,
          id,
          approvedBy
        );
      }

      // Create status history entry
      BookingStatusHistory.create({
        bookingId: id,
        oldStatus: 'pending',
        newStatus: 'approved',
        changedBy: approvedBy,
        reason: 'Booking approved by hospital authority',
        notes: approvalData.notes
      });
      
      // Create approval notification
      BookingNotification.createBookingApproved(
        booking.userId,
        id,
        booking.hospitalName,
        approvalData.notes
      );
      
      return Booking.findById(id);
    });

    return transaction();
  }

  /**
   * Decline a booking
   * @param {number} id - Booking ID
   * @param {number} declinedBy - User who declined
   * @param {Object} declineData - Decline data
   * @returns {Object} - Updated booking
   */
  static decline(id, declinedBy, declineData) {
    const booking = Booking.findById(id);
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    if (booking.status !== 'pending') {
      throw new Error('Only pending bookings can be declined');
    }
    
    if (!declineData.reason) {
      throw new Error('Decline reason is required');
    }
    
    // Decline booking
    Booking.decline(id, declinedBy, declineData.reason, declineData.notes);
    
    // Create decline notification
    BookingNotification.createBookingDeclined(
      booking.userId,
      id,
      booking.hospitalName,
      declineData.reason,
      declineData.notes
    );
    
    return Booking.findById(id);
  }

  /**
   * Cancel a booking
   * @param {number} id - Booking ID
   * @param {number} cancelledBy - User who cancelled
   * @param {string} reason - Cancellation reason
   * @param {string} notes - Additional notes
   * @returns {Object} - Updated booking
   */
  static cancel(id, cancelledBy = null, reason = null, notes = null) {
    // Use database transaction for data consistency
    const transaction = db.transaction(() => {
      const booking = Booking.findById(id);
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      if (!['pending', 'approved'].includes(booking.status)) {
        throw new Error('Only pending or approved bookings can be cancelled');
      }

      const actualCancelledBy = cancelledBy || booking.userId;

      // Verify cancellation permissions
      const canceller = User.findById(actualCancelledBy);
      if (!canceller || !canceller.isActive) {
        throw new Error('Invalid user attempting cancellation');
      }

      // Users can only cancel their own bookings
      if (canceller.userType === 'user' && booking.userId !== actualCancelledBy) {
        throw new Error('Users can only cancel their own bookings');
      }

      // Hospital authorities can cancel bookings for their hospital
      if (canceller.userType === 'hospital-authority' && 
          canceller.hospital_id !== booking.hospitalId) {
        throw new Error('Hospital authorities can only cancel bookings for their assigned hospital');
      }

      // Verify booking hasn't been modified
      const currentBooking = Booking.findById(id);
      if (!['pending', 'approved'].includes(currentBooking.status)) {
        throw new Error('Booking status has changed. Please refresh and try again.');
      }
      
      // Release resources if booking was approved
      if (booking.status === 'approved') {
        Hospital.releaseResources(
          booking.hospitalId,
          booking.resourceType,
          1, // Default quantity
          id,
          actualCancelledBy,
          'cancellation'
        );
      }

      // Create status history entry
      BookingStatusHistory.create({
        bookingId: id,
        oldStatus: booking.status,
        newStatus: 'cancelled',
        changedBy: actualCancelledBy,
        reason: reason || 'Booking cancelled',
        notes: notes
      });
      
      // Cancel booking
      Booking.cancel(id, actualCancelledBy, reason, notes);
      
      // Create cancellation notification
      BookingNotification.createBookingCancelled(
        booking.userId,
        id,
        booking.hospitalName,
        reason
      );
      
      return Booking.findById(id);
    });

    return transaction();
  }

  /**
   * Complete a booking
   * @param {number} id - Booking ID
   * @param {number} completedBy - User who completed
   * @param {string} notes - Completion notes
   * @returns {Object} - Updated booking
   */
  static complete(id, completedBy, notes = null) {
    const booking = Booking.findById(id);
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    if (booking.status !== 'approved') {
      throw new Error('Only approved bookings can be completed');
    }
    
    // Release resources
    Hospital.releaseResources(
      booking.hospitalId,
      booking.resourceType,
      1, // Default quantity
      id,
      completedBy,
      'completed'
    );
    
    // Complete booking
    Booking.complete(id, completedBy, notes);
    
    // Create completion notification
    BookingNotification.createBookingCompleted(
      booking.userId,
      id,
      booking.hospitalName
    );
    
    return Booking.findById(id);
  }

  /**
   * Get booking statistics
   * @param {number} hospitalId - Hospital ID (optional)
   * @param {Object} options - Query options
   * @returns {Object} - Statistics object
   */
  static getStatistics(hospitalId = null, options = {}) {
    if (hospitalId) {
      return Booking.getStatistics(hospitalId, options);
    } else {
      // Get overall statistics
      const stmt = db.prepare(`
        SELECT 
          status,
          COUNT(*) as count,
          AVG(paymentAmount) as avgAmount,
          urgency
        FROM bookings
        GROUP BY status, urgency
        ORDER BY status, urgency
      `);
      return stmt.all();
    }
  }

  /**
   * Get bookings with status history
   * @param {number} hospitalId - Hospital ID
   * @returns {Array} - Bookings with history
   */
  static getWithHistory(hospitalId) {
    return Booking.getWithHistory(hospitalId);
  }

  /**
   * Search bookings
   * @param {Object} searchCriteria - Search criteria
   * @returns {Array} - Array of matching bookings
   */
  static search(searchCriteria) {
    let query = `
      SELECT b.*, 
             h.name as hospitalName, 
             u.name as userName,
             u.email as userEmail
      FROM bookings b
      LEFT JOIN hospitals h ON b.hospitalId = h.id
      LEFT JOIN users u ON b.userId = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (searchCriteria.patientName) {
      query += ' AND b.patientName LIKE ?';
      params.push(`%${searchCriteria.patientName}%`);
    }
    
    if (searchCriteria.bookingReference) {
      query += ' AND b.bookingReference LIKE ?';
      params.push(`%${searchCriteria.bookingReference}%`);
    }
    
    if (searchCriteria.status) {
      query += ' AND b.status = ?';
      params.push(searchCriteria.status);
    }
    
    if (searchCriteria.urgency) {
      query += ' AND b.urgency = ?';
      params.push(searchCriteria.urgency);
    }
    
    if (searchCriteria.resourceType) {
      query += ' AND b.resourceType = ?';
      params.push(searchCriteria.resourceType);
    }
    
    if (searchCriteria.hospitalId) {
      query += ' AND b.hospitalId = ?';
      params.push(searchCriteria.hospitalId);
    }
    
    if (searchCriteria.startDate) {
      query += ' AND b.scheduledDate >= ?';
      params.push(searchCriteria.startDate);
    }
    
    if (searchCriteria.endDate) {
      query += ' AND b.scheduledDate <= ?';
      params.push(searchCriteria.endDate);
    }
    
    query += ' ORDER BY b.createdAt DESC';
    
    if (searchCriteria.limit) {
      query += ' LIMIT ?';
      params.push(searchCriteria.limit);
    }
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Get pending bookings for a hospital with enhanced filtering
   * @param {number} hospitalId - Hospital ID
   * @param {Object} options - Filter options
   * @returns {Array} - Array of pending bookings
   */
  static getPendingBookings(hospitalId, options = {}) {
    return Booking.getPendingByHospital(hospitalId, options);
  }

  /**
   * Update payment status
   * @param {number} id - Booking ID
   * @param {string} paymentStatus - Payment status
   * @param {string} paymentMethod - Payment method
   * @param {string} transactionId - Transaction ID
   * @returns {boolean} - Success status
   */
  static updatePaymentStatus(id, paymentStatus, paymentMethod, transactionId) {
    return Booking.updatePaymentStatus(id, paymentStatus, paymentMethod, transactionId);
  }

  /**
   * Validate data consistency across related tables
   * @param {number} bookingId - Booking ID to validate
   * @returns {Object} - Validation result
   */
  static validateDataConsistency(bookingId) {
    const errors = [];
    const warnings = [];

    try {
      // Get booking with related data
      const booking = Booking.findById(bookingId);
      if (!booking) {
        errors.push('Booking not found');
        return { isValid: false, errors, warnings };
      }

      // Validate user exists and is active
      const user = User.findById(booking.userId);
      if (!user) {
        errors.push('Referenced user does not exist');
      } else if (!user.isActive) {
        warnings.push('Referenced user is inactive');
      }

      // Validate hospital exists and is active
      const hospital = Hospital.findById(booking.hospitalId);
      if (!hospital) {
        errors.push('Referenced hospital does not exist');
      } else {
        if (!hospital.isActive) {
          warnings.push('Referenced hospital is inactive');
        }
        if (hospital.approval_status !== 'approved') {
          warnings.push('Referenced hospital is not approved');
        }
      }

      // Validate resource allocation consistency
      if (booking.status === 'approved') {
        const resourceCheck = db.prepare(`
          SELECT * FROM hospital_resources 
          WHERE hospitalId = ? AND resourceType = ?
        `).get(booking.hospitalId, booking.resourceType);

        if (!resourceCheck) {
          errors.push('Resource type not found for hospital');
        } else {
          // Check if occupied + reserved + maintenance <= total
          const totalUsed = resourceCheck.occupied + resourceCheck.reserved + resourceCheck.maintenance;
          if (totalUsed > resourceCheck.total) {
            errors.push('Resource allocation exceeds total capacity');
          }

          // Check if available + occupied + reserved + maintenance = total
          const calculatedTotal = resourceCheck.available + resourceCheck.occupied + 
                                resourceCheck.reserved + resourceCheck.maintenance;
          if (calculatedTotal !== resourceCheck.total) {
            errors.push('Resource counts do not add up to total');
          }
        }
      }

      // Validate status history consistency
      const statusHistory = db.prepare(`
        SELECT * FROM booking_status_history 
        WHERE bookingId = ? 
        ORDER BY changedAt ASC
      `).all(bookingId);

      if (statusHistory.length > 0) {
        const lastHistoryStatus = statusHistory[statusHistory.length - 1].newStatus;
        if (lastHistoryStatus !== booking.status) {
          errors.push('Current booking status does not match latest status history entry');
        }
      }

      // Validate notification consistency
      const notifications = db.prepare(`
        SELECT COUNT(*) as count FROM booking_notifications 
        WHERE bookingId = ?
      `).get(bookingId);

      if (notifications.count === 0 && booking.status !== 'pending') {
        warnings.push('No notifications found for non-pending booking');
      }

      // Validate date consistency
      const createdAt = new Date(booking.createdAt);
      const scheduledDate = new Date(booking.scheduledDate);
      
      if (scheduledDate <= createdAt) {
        errors.push('Scheduled date is not after creation date');
      }

      if (booking.approvedAt) {
        const approvedAt = new Date(booking.approvedAt);
        if (approvedAt < createdAt) {
          errors.push('Approval date is before creation date');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        bookingId,
        checkedAt: new Date().toISOString()
      };

    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Run comprehensive data integrity checks
   * @param {Object} options - Check options
   * @returns {Object} - Integrity check results
   */
  static runIntegrityChecks(options = {}) {
    const results = {
      totalBookings: 0,
      validBookings: 0,
      invalidBookings: 0,
      warnings: 0,
      errors: [],
      summary: {},
      checkedAt: new Date().toISOString()
    };

    try {
      // Get all bookings or filter by options
      let query = 'SELECT id FROM bookings';
      const params = [];

      if (options.hospitalId) {
        query += ' WHERE hospitalId = ?';
        params.push(options.hospitalId);
      }

      if (options.status) {
        query += options.hospitalId ? ' AND' : ' WHERE';
        query += ' status = ?';
        params.push(options.status);
      }

      if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
      }

      const bookings = db.prepare(query).all(...params);
      results.totalBookings = bookings.length;

      // Check each booking
      for (const booking of bookings) {
        const validation = this.validateDataConsistency(booking.id);
        
        if (validation.isValid) {
          results.validBookings++;
        } else {
          results.invalidBookings++;
          results.errors.push({
            bookingId: booking.id,
            errors: validation.errors,
            warnings: validation.warnings
          });
        }

        results.warnings += validation.warnings.length;
      }

      // Generate summary
      results.summary = {
        validPercentage: results.totalBookings > 0 ? 
          (results.validBookings / results.totalBookings * 100).toFixed(2) : 0,
        invalidPercentage: results.totalBookings > 0 ? 
          (results.invalidBookings / results.totalBookings * 100).toFixed(2) : 0,
        totalWarnings: results.warnings
      };

      return results;

    } catch (error) {
      results.errors.push(`Integrity check failed: ${error.message}`);
      return results;
    }
  }

  /**
   * Fix common data consistency issues
   * @param {number} bookingId - Booking ID to fix
   * @returns {Object} - Fix results
   */
  static fixDataConsistencyIssues(bookingId) {
    const transaction = db.transaction(() => {
      const fixes = [];
      const errors = [];

      try {
        const booking = Booking.findById(bookingId);
        if (!booking) {
          errors.push('Booking not found');
          return { fixes, errors };
        }

        // Fix missing status history entry
        const statusHistory = db.prepare(`
          SELECT COUNT(*) as count FROM booking_status_history 
          WHERE bookingId = ?
        `).get(bookingId);

        if (statusHistory.count === 0) {
          BookingStatusHistory.create({
            bookingId,
            oldStatus: null,
            newStatus: booking.status,
            changedBy: booking.userId,
            reason: 'System fix - missing status history',
            notes: 'Automatically created missing status history entry'
          });
          fixes.push('Created missing status history entry');
        }

        // Fix resource allocation inconsistencies
        if (booking.status === 'approved') {
          const resourceCheck = db.prepare(`
            SELECT * FROM hospital_resources 
            WHERE hospitalId = ? AND resourceType = ?
          `).get(booking.hospitalId, booking.resourceType);

          if (resourceCheck) {
            const calculatedTotal = resourceCheck.available + resourceCheck.occupied + 
                                  resourceCheck.reserved + resourceCheck.maintenance;
            
            if (calculatedTotal !== resourceCheck.total) {
              // Recalculate available based on other values
              const newAvailable = resourceCheck.total - resourceCheck.occupied - 
                                 resourceCheck.reserved - resourceCheck.maintenance;
              
              if (newAvailable >= 0) {
                db.prepare(`
                  UPDATE hospital_resources 
                  SET available = ?, lastUpdated = CURRENT_TIMESTAMP 
                  WHERE hospitalId = ? AND resourceType = ?
                `).run(newAvailable, booking.hospitalId, booking.resourceType);
                
                fixes.push(`Fixed resource availability calculation for ${booking.resourceType}`);
              }
            }
          }
        }

        return { fixes, errors };

      } catch (error) {
        errors.push(`Fix failed: ${error.message}`);
        return { fixes, errors };
      }
    });

    return transaction();
  }
}

module.exports = BookingService;