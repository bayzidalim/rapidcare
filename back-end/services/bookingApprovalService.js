const Booking = require('../models/Booking');
const BookingStatusHistory = require('../models/BookingStatusHistory');
const Hospital = require('../models/Hospital');
const ResourceManagementService = require('./resourceManagementService');
const NotificationService = require('./notificationService');
const mongoose = require('mongoose');

/**
 * BookingApprovalService
 * 
 * Handles all booking approval workflow operations including:
 * - Retrieving pending bookings for hospital authorities
 * - Approving bookings with resource allocation
 * - Declining bookings with reason tracking
 * - Booking validation and resource availability checking
 * - Automatic resource quantity adjustments
 * - Booking history and analytics
 */
class BookingApprovalService {
  /**
   * Get pending bookings for a hospital
   * @param {string} hospitalId - Hospital ID
   * @param {Object} options - Query options
   * @returns {Object} Pending bookings with metadata
   */
  static async getPendingBookings(hospitalId, options = {}) {
    try {
      // Validate hospital exists
      // Using Hospital model
      const hospital = await Hospital.findOne({ _id: hospitalId, isActive: true });
      if (!hospital) {
        throw new Error('Hospital not found or inactive');
      }

      // Build Query
      const query = { 
          hospitalId: hospitalId, 
          status: 'pending' 
      };

      if (options.urgency) {
        query.urgency = options.urgency;
      }
      
      if (options.resourceType) {
        query.resourceType = options.resourceType;
      }

      // Sorting
      let sort = {};
      const sortBy = options.sortBy || 'urgency';
      const sortOrder = options.sortOrder === 'desc' ? -1 : 1;
      
      if (sortBy === 'urgency') {
          // Custom sort for urgency is hard in pure Mongo find without Custom Order.
          // We can fetch and sort in memory if payload is small, or use aggregation.
          // Let's use aggregation for weighted urgency.
      } else if (sortBy === 'date') {
        sort.createdAt = sortOrder;
      } else if (sortBy === 'patient') {
        sort.patientName = sortOrder;
      } else if (sortBy === 'amount') {
        sort.paymentAmount = sortOrder;
      } else {
        sort.createdAt = 1;
      }

      // If urgency sort needed, improved aggregation or post-sort.
      // For simplicity, let's fetch pending bookings (usually not millions) and sort in JS if needed,
      // or just sort by createdAt for now and rely on frontend to reorder.
      // BUT, urgency is critical.
      // Define urgency weights: critical=1, high=2, medium=3, low=4
      
      let bookings = await Booking.find(query)
        .populate('userId', 'name phone email')
        .populate('hospitalId', 'name')
        .sort(sort);

      // Manual sort for urgency if requested
      if (sortBy === 'urgency') {
          const weights = { critical: 1, high: 2, medium: 3, low: 4 };
          bookings.sort((a, b) => {
             const wa = weights[a.urgency] || 5;
             const wb = weights[b.urgency] || 5;
             return sortOrder === 1 ? wa - wb : wb - wa;
          });
      }

      // Limit
      if (options.limit && options.limit > 0) {
          bookings = bookings.slice(0, parseInt(options.limit));
      }

      // Enhance bookings with resource availability info
      const enhancedBookings = await Promise.all(
        bookings.map(async (booking) => {
          const b = booking.toObject();
          
          const resourceAvailability = await ResourceManagementService.checkResourceAvailability(
            hospitalId,
            b.resourceType,
            b.resourcesAllocated || 1
          );

          // Calculate days since created
          const daysSinceCreated = (new Date() - new Date(b.createdAt)) / (1000 * 60 * 60 * 24);

          return {
            ...b,
            userName: b.userId ? b.userId.name : 'Unknown',
            userPhone: b.userId ? b.userId.phone : '',
            userEmail: b.userId ? b.userId.email : '',
            hospitalName: b.hospitalId ? b.hospitalId.name : '',
            resourceAvailability: resourceAvailability.data,
            canApprove: resourceAvailability.success && resourceAvailability.data.available,
            waitingTime: Math.round(daysSinceCreated * 24), // hours
            estimatedCompletionDate: new Date(
              new Date(b.scheduledDate).getTime() + 
              (b.estimatedDuration || 24) * 60 * 60 * 1000
            ).toISOString()
          };
        })
      );

      // Get summary statistics
      const summaryStats = await this.getPendingBookingsSummary(hospitalId);

      return {
        success: true,
        data: {
          bookings: enhancedBookings,
          totalCount: enhancedBookings.length,
          summary: summaryStats,
          filters: options
        }
      };

    } catch (error) {
      console.error('Pending bookings error:', error);
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  // Helper for summary
  static async getPendingBookingsSummary(hospitalId) {
      // Aggregation for stats
      const result = await Booking.aggregate([
          { $match: { hospitalId: new mongoose.Types.ObjectId(hospitalId), status: 'pending' } },
          { $group: {
              _id: null,
              totalPending: { $sum: 1 },
              criticalPending: { $sum: { $cond: [{ $eq: ["$urgency", "critical"] }, 1, 0] } },
              highPending: { $sum: { $cond: [{ $eq: ["$urgency", "high"] }, 1, 0] } }
          }}
      ]);
      
      if (result.length > 0) {
          return {
              total: result[0].totalPending,
              critical: result[0].criticalPending,
              high: result[0].highPending
          };
      }
      return { total: 0, critical: 0, high: 0 };
  }

  /**
   * Approve a booking
   * @param {string} bookingId - Booking ID
   * @param {string} approvedBy - User ID of approver
   * @param {Object} approvalData - Approval data
   * @returns {Object} Approval result
   */
  static async approveBooking(bookingId, approvedBy, approvalData = {}) {
    try {
      // Get booking details
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.status !== 'pending') {
        throw new Error(`Cannot approve booking with status: ${booking.status}`);
      }

      // Validate booking approval
      const validationResult = await this.validateBookingApproval(
        bookingId, 
        booking.resourceType, 
        approvalData.resourcesAllocated || booking.resourcesAllocated || 1
      );

      if (!validationResult.valid) {
        throw new Error(validationResult.message);
      }

      // Check resource availability
      // ... already checked in validation mostly, but valid check:
      const resourcesNeeded = approvalData.resourcesAllocated || booking.resourcesAllocated || 1;
      
      // Allocate resources if auto-allocation is enabled (default: true)
      if (approvalData.autoAllocateResources !== false) {
        const allocationResult = await ResourceManagementService.allocateResources(
          booking.hospitalId,
          booking.resourceType,
          resourcesNeeded,
          bookingId,
          approvedBy
        );

        if (!allocationResult.success) {
          throw new Error(`Resource allocation failed: ${allocationResult.message}`);
        }
      }

      // Update booking
      booking.status = 'approved';
      booking.approvedBy = approvedBy;
      booking.approvedAt = new Date();
      if (approvalData.notes) booking.notes = approvalData.notes; // Or authorityNotes
      if (approvalData.resourcesAllocated) booking.resourcesAllocated = approvalData.resourcesAllocated;
      if (approvalData.scheduledDate) booking.scheduledDate = approvalData.scheduledDate;
      
      // Set expiration
      if (!booking.expiresAt) {
          const expirationDate = new Date();
          expirationDate.setHours(expirationDate.getHours() + (booking.estimatedDuration || 24));
          booking.expiresAt = expirationDate;
      }
      
      await booking.save();
      
      // Log Status History
      await BookingStatusHistory.create({
          bookingId,
          oldStatus: 'pending',
          newStatus: 'approved',
          changedBy: approvedBy,
          reason: 'Booking Approved',
          notes: approvalData.notes
      });

      // Notify
      try {
        // Need hospitalName for notification
        const hospital = await Hospital.findById(booking.hospitalId);
        
        const notificationResult = await NotificationService.sendBookingApprovalNotification(
          bookingId,
          booking.userId,
          {
            hospitalName: hospital ? hospital.name : 'Hospital',
            resourceType: booking.resourceType,
            scheduledDate: booking.scheduledDate,
            notes: approvalData.notes
          }
        );
      } catch (notificationError) {
        console.error('Error sending approval notification:', notificationError);
      }

      return {
        success: true,
        message: 'Booking approved successfully',
        data: {
          booking: booking.toObject(),
          resourcesAllocated: resourcesNeeded,
          approvedBy,
          approvedAt: booking.approvedAt,
          notes: approvalData.notes
        }
      };

    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  /**
   * Decline a booking
   * @param {string} bookingId - Booking ID
   * @param {string} declinedBy - User ID of decliner
   * @param {Object} declineData - Decline data
   * @returns {Object} Decline result
   */
  static async declineBooking(bookingId, declinedBy, declineData) {
    try {
      if (!declineData.reason) {
        throw new Error('Decline reason is required');
      }

      const booking = await Booking.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.status !== 'pending') {
        throw new Error(`Cannot decline booking with status: ${booking.status}`);
      }

      // Update Booking
      booking.status = 'declined';
      // booking.declinedBy = declinedBy; // If field exists
      // booking.declinedAt = new Date();
      // Store suggestion in authorityNotes
      if (declineData.alternativeSuggestions && declineData.alternativeSuggestions.length > 0) {
          const notesWithSuggestions = [
              declineData.notes || '',
              'Alternative suggestions:',
              ...declineData.alternativeSuggestions
          ].filter(Boolean).join('\n');
          booking.authorityNotes = notesWithSuggestions;
      } else if (declineData.notes) {
          booking.authorityNotes = declineData.notes;
      }
      
      await booking.save();
      
      // Log History
      await BookingStatusHistory.create({
          bookingId,
          oldStatus: 'pending',
          newStatus: 'declined',
          changedBy: declinedBy,
          reason: declineData.reason,
          notes: declineData.notes
      });

      // Notify
      try {
        const hospital = await Hospital.findById(booking.hospitalId);
        await NotificationService.sendBookingDeclineNotification(
          bookingId,
          booking.userId,
          {
            hospitalName: hospital ? hospital.name : 'Hospital',
            reason: declineData.reason,
            notes: declineData.notes,
            alternativeSuggestions: declineData.alternativeSuggestions
          }
        );
      } catch (e) { console.error(e); }

      return {
        success: true,
        message: 'Booking declined successfully',
        data: {
          booking: booking.toObject(),
          reason: declineData.reason,
          declinedBy,
          declinedAt: new Date().toISOString(),
          notes: declineData.notes,
          alternativeSuggestions: declineData.alternativeSuggestions || []
        }
      };

    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  /**
   * Complete a booking
   * @param {string} bookingId - Booking ID
   * @param {string} completedBy - User ID of completer
   * @param {Object} completionData - Completion data
   * @returns {Object} Completion result
   */
  static async completeBooking(bookingId, completedBy, completionData = {}) {
    try {
        const booking = await Booking.findById(bookingId);
        if (!booking) {
          throw new Error('Booking not found');
        }

        if (booking.status !== 'approved') {
          throw new Error(`Cannot complete booking with status: ${booking.status}`);
        }

        // Release resources
        if (completionData.autoReleaseResources !== false) {
          const resourcesAllocated = booking.resourcesAllocated || 1;
          const releaseResult = await ResourceManagementService.releaseResources(
            booking.hospitalId,
            booking.resourceType,
            resourcesAllocated,
            bookingId,
            completedBy,
            'completed'
          );

          if (!releaseResult.success) {
            throw new Error(`Resource release failed: ${releaseResult.message}`);
          }
        }

        // Update Status
        booking.status = 'completed';
        await booking.save();
        
        // Log History
        await BookingStatusHistory.create({
            bookingId,
            oldStatus: 'approved',
            newStatus: 'completed',
            changedBy: completedBy,
            reason: 'Booking Completed',
            notes: completionData.notes
        });

        // Notify
        try {
            const hospital = await Hospital.findById(booking.hospitalId);
            await NotificationService.sendBookingCompletionNotification(
                bookingId, 
                booking.userId, 
                { hospitalName: hospital ? hospital.name : 'Hospital', notes: completionData.notes }
            );
        } catch (e) { console.error(e); }

        return {
          success: true,
          message: 'Booking completed successfully',
          data: {
            booking: booking.toObject(),
            completedBy,
            completedAt: new Date().toISOString(),
            notes: completionData.notes
          }
        };

    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  /**
   * Cancel a booking
   * @param {string} bookingId - Booking ID
   * @param {string} cancelledBy - User ID of canceller
   * @param {Object} cancellationData - Cancellation data
   * @returns {Object} Cancellation result
   */
  static async cancelBooking(bookingId, cancelledBy, cancellationData) {
    try {
        const booking = await Booking.findById(bookingId);
        if (!booking) {
          throw new Error('Booking not found');
        }

        if (!['pending', 'approved'].includes(booking.status)) {
          throw new Error(`Cannot cancel booking with status: ${booking.status}`);
        }
        
        const oldStatus = booking.status;

        // Release resources if approved
        if (booking.status === 'approved' && cancellationData.autoReleaseResources !== false) {
          const resourcesAllocated = booking.resourcesAllocated || 1;
          const releaseResult = await ResourceManagementService.releaseResources(
            booking.hospitalId,
            booking.resourceType,
            resourcesAllocated,
            bookingId,
            cancelledBy,
            'cancelled'
          );

          if (!releaseResult.success) {
            throw new Error(`Resource release failed: ${releaseResult.message}`);
          }
        }

        // Update Status
        booking.status = 'cancelled';
        booking.cancellationReason = cancellationData.reason; // If schema supports
        await booking.save();
        
        // Log
        await BookingStatusHistory.create({
            bookingId,
            oldStatus: oldStatus,
            newStatus: 'cancelled',
            changedBy: cancelledBy,
            reason: cancellationData.reason,
            notes: cancellationData.notes
        });

        // Notify
        try {
            const hospital = await Hospital.findById(booking.hospitalId);
            await NotificationService.sendBookingCancellationNotification(
                bookingId,
                booking.userId,
                {
                    hospitalName: hospital ? hospital.name : 'Hospital',
                    reason: cancellationData.reason,
                    notes: cancellationData.notes
                }
            );
        } catch (e) {}

        return {
          success: true,
          message: 'Booking cancelled successfully',
          data: {
            booking: booking.toObject(),
            cancelledBy,
            cancelledAt: new Date().toISOString(),
            reason: cancellationData.reason,
            notes: cancellationData.notes
          }
        };

    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  /**
   * Validate booking approval
   * @param {string} bookingId - Booking ID
   * @param {string} resourceType - Resource type
   * @param {number} quantity - Quantity needed
   * @returns {Object} Validation result
   */
  static async validateBookingApproval(bookingId, resourceType, quantity) {
    try {
      // Get booking details
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return { valid: false, message: 'Booking not found' };
      }

      if (booking.status !== 'pending') {
        return { valid: false, message: `Booking status is ${booking.status}, not pending` };
      }

      // Check if booking is expired
      if (booking.expiresAt && new Date(booking.expiresAt) < new Date()) {
        return { valid: false, message: 'Booking has expired' };
      }

      // Validate resource type matches
      if (booking.resourceType !== resourceType) {
        return { valid: false, message: 'Resource type mismatch' };
      }

      // Validate quantity
      if (quantity <= 0) {
        return { valid: false, message: 'Quantity must be positive' };
      }

      // Check resource availability
      const availability = await ResourceManagementService.checkResourceAvailability(
        booking.hospitalId,
        resourceType,
        quantity
      );

      if (!availability.success || !availability.data.available) {
        return { 
          valid: false, 
          message: `Insufficient resources: ${availability.data.message}` 
        };
      }

      return { valid: true, message: 'Booking can be approved' };

    } catch (error) {
      return { valid: false, message: `Validation error: ${error.message}` };
    }
  }

  /**
   * Get booking history for a hospital
   * @param {string} hospitalId - Hospital ID
   * @param {Object} options - Query options
   * @returns {Object} Booking history
   */
  static async getBookingHistory(hospitalId, options = {}) {
    try {
      const query = { hospitalId };

      if (options.status) {
        query.status = options.status;
      }
      
      if (options.startDate) {
        query.createdAt = { ...query.createdAt, $gte: options.startDate };
      }
      
      if (options.endDate) {
        query.createdAt = { ...query.createdAt || {}, $lte: options.endDate };
      }
      
      const limit = options.limit ? parseInt(options.limit) : 10;
      const offset = options.offset ? parseInt(options.offset) : 0;
      
      const bookings = await Booking.find(query)
          .populate('userId', 'name phone')
          .populate('approvedBy', 'name')
          .sort({ updatedAt: -1 })
          .limit(limit)
          .skip(offset);
          
      const totalCount = await Booking.countDocuments(query);

      // Enhance with status history info (last change) if needed
      // Map basic fields
      const enhancedBookings = bookings.map(b => {
          const obj = b.toObject();
          return {
              ...obj,
              userName: b.userId ? b.userId.name : 'Unknown',
              userPhone: b.userId ? b.userId.phone : '',
              approvedByName: b.approvedBy ? b.approvedBy.name : null
          };
      });

      return {
        success: true,
        data: {
          bookings: enhancedBookings,
          totalCount,
          currentPage: Math.floor(offset / limit) + 1,
          totalPages: Math.ceil(totalCount / limit),
          filters: options
        }
      };

    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  /**
   * Get booking approval analytics
   * @param {string} hospitalId - Hospital ID
   * @param {Object} options - Query options
   * @returns {Object} Approval analytics
   */
  static async getBookingAnalytics(hospitalId, options = {}) {
     // Implement using BookingStatusHistory Mongoose Statics or aggregations
     // Stub for now or strictly implement if critical
     return { success: true, data: {} };
  }
}

module.exports = BookingApprovalService;