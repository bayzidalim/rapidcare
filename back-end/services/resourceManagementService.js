const Hospital = require('../models/Hospital');
const HospitalResource = require('../models/HospitalResource');
const Booking = require('../models/Booking');
const ResourceAuditLog = require('../models/ResourceAuditLog');
const mongoose = require('mongoose');

/**
 * ResourceManagementService
 * 
 * Handles all resource management operations including:
 * - Resource quantity updates with validation
 * - Resource availability checking
 * - Resource allocation and release
 * - Audit logging for all resource changes
 */
class ResourceManagementService {
  /**
   * Update resource quantities for a hospital
   * @param {string} hospitalId - Hospital ID
   * @param {Object} resources - Resource updates
   * @param {string} updatedBy - User making the update
   * @returns {Object} Update result with success status and updated resources
   */
  static async updateResourceQuantities(hospitalId, resources, updatedBy) {
    try {
      // Validate hospital exists
      const hospital = await Hospital.findById(hospitalId);
      if (!hospital) {
        throw new Error('Hospital not found');
      }

      // Validate user permissions
      if (!updatedBy) {
        throw new Error('User ID required for resource updates');
      }

      // Validate resource data
      const validationResult = await this.validateResourceUpdate(hospitalId, resources);
      if (!validationResult.valid) {
        throw new Error(validationResult.message);
      }

      // Prepare and Execute Updates
      // We process each resource type update
      const updatedTypes = [];
      
      for (const [resourceType, resourceData] of Object.entries(resources)) {
        if (!['beds', 'icu', 'operationTheatres'].includes(resourceType)) {
          throw new Error(`Invalid resource type: ${resourceType}`);
        }

        const updateData = {
            total: resourceData.total || 0,
            available: resourceData.available || 0,
            occupied: resourceData.occupied || 0,
            reserved: resourceData.reserved || 0,
            maintenance: resourceData.maintenance || 0,
            updatedBy: updatedBy,
            updatedAt: new Date()
        };
        
        // Find and update or create
        const updatedResource = await HospitalResource.findOneAndUpdate(
            { hospitalId: hospitalId, resourceType: resourceType },
            updateData,
            { new: true, upsert: true }
        );
        updatedTypes.push(updatedResource);
        
        // Log manual update if needed?
        // Audit logging usually for specific actions. Here we just update state.
      }
      
      // Update hospital lastUpdated
      await Hospital.findByIdAndUpdate(hospitalId, { lastUpdated: new Date() });

      // Get updated resources map
      const allResources = await HospitalResource.find({ hospitalId });
      const resourceMap = {};
      allResources.forEach(r => {
          resourceMap[r.resourceType] = {
              total: r.total,
              available: r.available,
              occupied: r.occupied,
              reserved: r.reserved,
              maintenance: r.maintenance
          };
      });

      return {
        success: true,
        message: 'Resources updated successfully',
        data: {
          hospitalId,
          resources: resourceMap,
          updatedBy,
          updatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Update Resources Error:', error);
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  /**
   * Validate resource update data
   * @param {string} hospitalId - Hospital ID
   * @param {Object} resources - Resource data to validate
   * @returns {Object} Validation result
   */
  static async validateResourceUpdate(hospitalId, resources) {
    try {
      if (!hospitalId) {
        return { valid: false, message: 'Valid hospital ID is required' };
      }

      if (!resources || typeof resources !== 'object') {
        return { valid: false, message: 'Resource data is required' };
      }

      // Get current bookings to check minimum available resources
      const currentBookings = await this.getCurrentBookingsByHospital(hospitalId);
      const bookedResources = {};

      // Calculate currently booked resources
      currentBookings.forEach(booking => {
          const resourceType = booking.resourceType;
          // Only count if status implies occupancy? 
          // Previous logic said checking "approved" bookings.
          // In Mongoose check:
          const quantity = 1; // Default
          bookedResources[resourceType] = (bookedResources[resourceType] || 0) + quantity;
      });

      // Validate each resource type
      for (const [resourceType, resourceData] of Object.entries(resources)) {
        if (!['beds', 'icu', 'operationTheatres'].includes(resourceType)) {
          return { valid: false, message: `Invalid resource type: ${resourceType}` };
        }

        const total = resourceData.total || 0;
        const available = resourceData.available || 0;
        const occupied = resourceData.occupied || 0;
        const reserved = resourceData.reserved || 0;
        const maintenance = resourceData.maintenance || 0;

        // Check non-negative values
        if (total < 0 || available < 0 || occupied < 0 || reserved < 0 || maintenance < 0) {
          return { valid: false, message: `All resource quantities must be non-negative for ${resourceType}` };
        }

        // Check total capacity
        if (available + occupied + reserved + maintenance > total) {
          return { 
            valid: false, 
            message: `Sum of allocated resources (${available + occupied + reserved + maintenance}) exceeds total capacity (${total}) for ${resourceType}` 
          };
        }

        // Check against current bookings
        const currentlyBooked = bookedResources[resourceType] || 0;
        // Logic: 'available + occupied' represents physical presence?
        // Or 'occupied' represents exact bookings? 
        // If we reduce 'available', we must ensure we don't drop below what is logically needed?
        // Reuse previous logic: available + occupied < currentlyBooked
        if (available + occupied < currentlyBooked) {
          return { 
            valid: false, 
            message: `Cannot reduce ${resourceType} below currently booked quantity (${currentlyBooked})` 
          };
        }
      }

      return { valid: true, message: 'Resource data is valid' };

    } catch (error) {
      return { valid: false, message: `Validation error: ${error.message}` };
    }
  }

  /**
   * Check resource availability for booking
   * @param {string} hospitalId - Hospital ID
   * @param {string} resourceType - Resource type
   * @param {number} quantity - Required quantity
   * @param {Date} startDate - Booking start date
   * @param {Date} endDate - Booking end date
   * @returns {Object} Availability information
   */
  static async checkResourceAvailability(hospitalId, resourceType, quantity = 1, startDate = null, endDate = null) {
    try {
      // Get current resource state
      const resource = await HospitalResource.findOne({ hospitalId, resourceType });
      
      const currentAvailable = resource ? resource.available : 0;
      const isAvailable = currentAvailable >= quantity;
      
      const availability = {
          hospitalId,
          resourceType,
          quantity,
          currentAvailable,
          available: isAvailable,
          message: isAvailable ? 'Resources available' : 'Insufficient resources'
      };
      
      // If dates are provided, check for overlapping bookings
      if (startDate && endDate) {
        const overlappingBookings = await this.getOverlappingBookings(hospitalId, resourceType, startDate, endDate);
        const overlappingQuantity = overlappingBookings.length; // Assuming 1 per booking for now
        
        availability.availableForPeriod = Math.max(0, currentAvailable - overlappingQuantity);
        availability.overlappingBookings = overlappingBookings.length;
        
        // Strict check: if overlap reduces available below quantity?
        // Naively, currentAvailable reduces as bookings happen?
        // 'available' field in DB is instantaneous?
        // Ideally 'available' decreases when booking is APPROVED.
        // So overlapping checks future *pending*? Or validated logic?
        // Previous logic: availableForPeriod = currentAvailable - overlappingQuantity.
      }

      return {
        success: true,
        data: availability
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
   * Allocate resources for a booking
   * @param {string} hospitalId - Hospital ID
   * @param {string} resourceType - Resource type
   * @param {number} quantity - Quantity to allocate
   * @param {string} bookingId - Booking ID
   * @param {string} allocatedBy - User allocating resources
   * @returns {Object} Allocation result
   */
  static async allocateResources(hospitalId, resourceType, quantity, bookingId, allocatedBy) {
    try {
      // Check availability first
      const availabilityStatus = await this.checkResourceAvailability(hospitalId, resourceType, quantity);
      if (!availabilityStatus.success || !availabilityStatus.data.available) {
        throw new Error(availabilityStatus.data.message || 'Insufficient resources available');
      }

      // Allocate resources (Decrease available, Increase occupied)
      await HospitalResource.findOneAndUpdate(
          { hospitalId, resourceType },
          { $inc: { available: -quantity, occupied: quantity } }
      );
      
      // Log?
      await ResourceAuditLog.logBookingApproval(hospitalId, resourceType, quantity, bookingId, allocatedBy);

      return {
        success: true,
        message: 'Resources allocated successfully',
        data: {
          hospitalId,
          resourceType,
          quantity,
          bookingId,
          allocatedBy,
          allocatedAt: new Date().toISOString()
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
   * Release resources from a booking
   * @param {string} hospitalId - Hospital ID
   * @param {string} resourceType - Resource type
   * @param {number} quantity - Quantity to release
   * @param {string} bookingId - Booking ID
   * @param {string} releasedBy - User releasing resources
   * @param {string} reason - Reason for release
   * @returns {Object} Release result
   */
  static async releaseResources(hospitalId, resourceType, quantity, bookingId, releasedBy, reason = 'completed') {
    try {
      // Release resources (Increase available, Decrease occupied)
      await HospitalResource.findOneAndUpdate(
          { hospitalId, resourceType },
          { $inc: { available: quantity, occupied: -quantity } }
      );

      // Log
      if (reason === 'cancelled') {
        await ResourceAuditLog.logBookingCancellation(hospitalId, resourceType, quantity, bookingId, releasedBy);
      } else {
        await ResourceAuditLog.logBookingCompletion(hospitalId, resourceType, quantity, bookingId, releasedBy);
      }

      return {
        success: true,
        message: 'Resources released successfully',
        data: {
          hospitalId,
          resourceType,
          quantity,
          bookingId,
          releasedBy,
          reason,
          releasedAt: new Date().toISOString()
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
   * Get resource history for a hospital
   * @param {string} hospitalId - Hospital ID
   * @param {Object} options - Query options
   * @returns {Object} Resource history
   */
  static async getResourceHistory(hospitalId, options = {}) {
    try {
      // Use ResourceAuditLog static method which handles mongoose finding
      const history = await ResourceAuditLog.getByHospital(hospitalId, options);
      // countDocuments for total
      const totalCount = await ResourceAuditLog.countDocuments({ hospitalId });

      return {
        success: true,
        data: {
          history,
          totalCount,
          options
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

  // Helper methods

  /**
   * Get current bookings for a hospital
   * @param {string} hospitalId - Hospital ID
   * @returns {Array} Current bookings
   */
  static async getCurrentBookingsByHospital(hospitalId) {
    return Booking.find({ 
        hospitalId: hospitalId, 
        status: { $in: ['pending', 'approved'] } 
    });
  }

  /**
   * Get overlapping bookings for a time period
   * @param {string} hospitalId - Hospital ID
   * @param {string} resourceType - Resource type
   * @param {Date} startDate - Period start date
   * @param {Date} endDate - Period end date
   * @returns {Array} Overlapping bookings
   */
  static async getOverlappingBookings(hospitalId, resourceType, startDate, endDate) {
    // Mongoose query for overlapping ranges
    // booking.scheduledDate < endDate AND (booking.scheduledDate + duration) > startDate
    // Need aggregation or JS filter if duration is stored as string/number that needs adding.
    // 'estimatedDuration' is string "2 hours" or Number? In Booking.js schema it was String in old model, converted to Number in new?
    // Let's assume Mongoose query using available fields.
    // Simplifying assumption: check dates directly if `endDate` field exists on booking or computed.
    // If not, we might filter in JS.
    
    const bookings = await Booking.find({
        hospitalId,
        resourceType,
        status: 'approved',
        // Start date is before range end
        scheduledDate: { $lt: endDate }
    });
    
    // Filter end side using duration calculation in JS
    return bookings.filter(b => {
        const durationHours = parseInt(b.estimatedDuration) || 1;
        const bStart = new Date(b.scheduledDate);
        const bEnd = new Date(bStart.getTime() + durationHours * 60 * 60 * 1000);
        return bEnd > startDate;
    });
  }
}

module.exports = ResourceManagementService;