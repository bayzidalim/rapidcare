const Hospital = require('../models/Hospital');
const Booking = require('../models/Booking');
const HospitalResource = require('../models/HospitalResource');
const ResourceAuditLog = require('../models/ResourceAuditLog');
const mongoose = require('mongoose');

/**
 * PollingService
 * 
 * Handles polling-based real-time updates for resource status and booking changes.
 * Provides efficient data change detection and timestamp-based filtering.
 */
class PollingService {
  /**
   * Get resource updates since a specific timestamp
   * @param {number} hospitalId - Hospital ID (optional, for specific hospital)
   * @param {string} lastUpdate - ISO timestamp of last update
   * @param {Array} resourceTypes - Array of resource types to filter
   * @returns {Object} Resource updates with change detection
   */
  static async getResourceUpdates(hospitalId = null, lastUpdate = null, resourceTypes = null) {
    try {
      const query = {};
      
      // Filter by timestamp if specified
      if (lastUpdate) {
        query.lastUpdated = { $gt: new Date(lastUpdate) };
      }

      // Filter by resource types if specified
      if (resourceTypes && resourceTypes.length > 0) {
        query.resourceType = { $in: resourceTypes };
      }

      // Filter by hospital if specified (convert to ObjectId)
      if (hospitalId) {
        query.hospitalId = new mongoose.Types.ObjectId(hospitalId);
      } else {
        // If no hospitalId, we need to ensure we only get resources for active hospitals
        // This requires a lookup or separate query. Use separate query for efficiency.
        const activeHospitals = await Hospital.find({ isActive: true }).select('_id');
        const activeHospitalIds = activeHospitals.map(h => h._id);
        query.hospitalId = { $in: activeHospitalIds };
      }

      const resources = await HospitalResource.find(query)
        .populate('hospitalId', 'name')
        .sort({ lastUpdated: -1 });

      // Get current timestamp for next polling
      const currentTimestamp = new Date().toISOString();
      
      // Calculate change indicators
      const hasChanges = resources.length > 0;
      const changesByHospital = {};
      const changesByResourceType = {};
      
      resources.forEach(resource => {
        const hospId = resource.hospitalId._id.toString();
        const hospName = resource.hospitalId.name;

        // Group by hospital
        if (!changesByHospital[hospId]) {
          changesByHospital[hospId] = {
            hospitalId: hospId,
            hospitalName: hospName,
            resources: [],
            lastUpdated: resource.lastUpdated
          };
        }
        changesByHospital[hospId].resources.push({
          resourceType: resource.resourceType,
          total: resource.total,
          available: resource.available,
          occupied: resource.occupied,
          reserved: resource.reserved || 0,
          maintenance: resource.maintenance || 0,
          lastUpdated: resource.lastUpdated,
          updatedBy: resource.updatedBy
        });
        
        // Group by resource type
        if (!changesByResourceType[resource.resourceType]) {
          changesByResourceType[resource.resourceType] = [];
        }
        changesByResourceType[resource.resourceType].push({
          hospitalId: hospId,
          hospitalName: hospName,
          total: resource.total,
          available: resource.available,
          occupied: resource.occupied,
          reserved: resource.reserved || 0,
          maintenance: resource.maintenance || 0,
          lastUpdated: resource.lastUpdated
        });
      });
      
      return {
        success: true,
        data: {
          hasChanges,
          totalChanges: resources.length,
          currentTimestamp,
          lastPolled: lastUpdate,
          changes: {
            byHospital: Object.values(changesByHospital),
            byResourceType: changesByResourceType,
            raw: resources
          }
        }
      };
      
    } catch (error) {
      console.error('Error in getResourceUpdates:', error);
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  /**
   * Get booking status updates since a specific timestamp
   * @param {number} hospitalId - Hospital ID (optional, for specific hospital)
   * @param {string} lastUpdate - ISO timestamp of last update
   * @param {Array} statuses - Array of statuses to filter
   * @returns {Object} Booking updates with change detection
   */
  static async getBookingUpdates(hospitalId = null, lastUpdate = null, statuses = null) {
    try {
      const query = {};
      
      // Filter by timestamp if specified
      if (lastUpdate) {
        query.updatedAt = { $gt: new Date(lastUpdate) };
      }

      // Filter by statuses if specified
      if (statuses && statuses.length > 0) {
        query.status = { $in: statuses };
      }
      
      // Filter by hospital if specified
      if (hospitalId) {
         query.hospitalId = new mongoose.Types.ObjectId(hospitalId);
      } else {
        // Only active hospitals
        const activeHospitals = await Hospital.find({ isActive: true }).select('_id');
        const activeHospitalIds = activeHospitals.map(h => h._id);
        query.hospitalId = { $in: activeHospitalIds };
      }

      const bookings = await Booking.find(query)
          .populate('hospitalId', 'name')
          .populate('userId', 'name')
          .populate('approvedBy', 'name')
          .sort({ updatedAt: -1 });

      // Get current timestamp for next polling
      const currentTimestamp = new Date().toISOString();
      
      // Calculate change indicators
      const hasChanges = bookings.length > 0;
      const changesByHospital = {};
      const changesByStatus = {};
      const changesByUrgency = {};
      
      bookings.forEach(booking => {
        // Determine hospital ID/Name safely (in case population fails)
        const hospId = booking.hospitalId ? booking.hospitalId._id.toString() : 'unknown';
        const hospName = booking.hospitalId ? booking.hospitalId.name : 'Unknown Hospital';
        const userName = booking.userId ? booking.userId.name : 'Unknown User';
        const approverName = booking.approvedBy ? booking.approvedBy.name : null;

        const bookingObj = booking.toObject();
        bookingObj.hospitalName = hospName;
        bookingObj.userName = userName;
        bookingObj.approverName = approverName;

        // Group by hospital
        if (!changesByHospital[hospId]) {
          changesByHospital[hospId] = {
            hospitalId: hospId,
            hospitalName: hospName,
            bookings: []
          };
        }
        changesByHospital[hospId].bookings.push(bookingObj);
        
        // Group by status
        if (!changesByStatus[booking.status]) {
          changesByStatus[booking.status] = [];
        }
        changesByStatus[booking.status].push(bookingObj);
        
        // Group by urgency
        if (!changesByUrgency[booking.urgency]) {
          changesByUrgency[booking.urgency] = [];
        }
        changesByUrgency[booking.urgency].push(bookingObj);
      });
      
      return {
        success: true,
        data: {
          hasChanges,
          totalChanges: bookings.length,
          currentTimestamp,
          lastPolled: lastUpdate,
          changes: {
            byHospital: Object.values(changesByHospital),
            byStatus: changesByStatus,
            byUrgency: changesByUrgency,
            raw: bookings // note: returns mongoose documents or POJOs if mapped
          }
        }
      };
      
    } catch (error) {
       console.error('Error in getBookingUpdates:', error);
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  /**
   * Get combined resource and booking updates
   * @param {number} hospitalId - Hospital ID (optional, for specific hospital)
   * @param {string} lastUpdate - ISO timestamp of last update
   * @param {Object} options - Additional filtering options
   * @returns {Object} Combined updates with change detection
   */
  static async getCombinedUpdates(hospitalId = null, lastUpdate = null, options = {}) {
    try {
      const [resourceUpdates, bookingUpdates] = await Promise.all([
        this.getResourceUpdates(hospitalId, lastUpdate, options.resourceTypes),
        this.getBookingUpdates(hospitalId, lastUpdate, options.bookingStatuses)
      ]);
      
      if (!resourceUpdates.success || !bookingUpdates.success) {
        throw new Error('Failed to fetch updates');
      }
      
      const hasChanges = resourceUpdates.data.hasChanges || bookingUpdates.data.hasChanges;
      const currentTimestamp = new Date().toISOString();
      
      return {
        success: true,
        data: {
          hasChanges,
          currentTimestamp,
          lastPolled: lastUpdate,
          resources: resourceUpdates.data,
          bookings: bookingUpdates.data,
          summary: {
            totalResourceChanges: resourceUpdates.data.totalChanges,
            totalBookingChanges: bookingUpdates.data.totalChanges,
            totalChanges: resourceUpdates.data.totalChanges + bookingUpdates.data.totalChanges
          }
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
   * Get resource audit log updates since a specific timestamp
   * @param {number} hospitalId - Hospital ID (optional, for specific hospital)
   * @param {string} lastUpdate - ISO timestamp of last update
   * @param {Object} options - Additional filtering options
   * @returns {Object} Audit log updates
   */
  static async getAuditLogUpdates(hospitalId = null, lastUpdate = null, options = {}) {
    try {
      const query = {};

      if (lastUpdate) {
        query.timestamp = { $gt: new Date(lastUpdate) };
      }
      
      if (hospitalId) {
        query.hospitalId = new mongoose.Types.ObjectId(hospitalId);
      } else {
         const activeHospitals = await Hospital.find({ isActive: true }).select('_id');
         query.hospitalId = { $in: activeHospitals.map(h => h._id) };
      }

      if (options.changeTypes && options.changeTypes.length > 0) {
        query.changeType = { $in: options.changeTypes };
      }
      
      if (options.resourceTypes && options.resourceTypes.length > 0) {
        query.resourceType = { $in: options.resourceTypes };
      }
      
      const limit = options.limit ? parseInt(options.limit) : 0;
      
      const auditLogQuery = ResourceAuditLog.find(query)
          .populate('hospitalId', 'name')
          .populate('changedBy', 'name')
          .sort({ timestamp: -1 });
          
      if (limit > 0) {
          auditLogQuery.limit(limit);
      }
      
      const auditLogs = await auditLogQuery.exec();
      
      const currentTimestamp = new Date().toISOString();
      const hasChanges = auditLogs.length > 0;
      
      // Group by change type for analysis
      const changesByType = {};
      const enhancedLogs = auditLogs.map(log => {
          const l = log.toObject();
          l.hospitalName = log.hospitalId ? log.hospitalId.name : 'Unknown';
          l.changedByName = log.changedBy ? log.changedBy.name : 'Unknown';
          
          if (!changesByType[log.changeType]) {
            changesByType[log.changeType] = [];
          }
          changesByType[log.changeType].push(l);
          return l;
      });
      
      return {
        success: true,
        data: {
          hasChanges,
          totalChanges: auditLogs.length,
          currentTimestamp,
          lastPolled: lastUpdate,
          changes: {
            byType: changesByType,
            raw: enhancedLogs
          }
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
   * Get hospital-specific dashboard updates
   * @param {number} hospitalId - Hospital ID
   * @param {string} lastUpdate - ISO timestamp of last update
   * @param {Object} options - Additional options
   * @returns {Object} Hospital dashboard updates
   */
  static async getHospitalDashboardUpdates(hospitalId, lastUpdate = null, options = {}) {
    try {
      if (!hospitalId) {
        throw new Error('Hospital ID is required');
      }
      
      // Get combined updates for this hospital
      const combinedUpdates = await this.getCombinedUpdates(hospitalId, lastUpdate, options);
      
      if (!combinedUpdates.success) {
        throw new Error('Failed to fetch hospital updates');
      }
      
      // Get current resource status (Using Hospital.getWithResources logic or simpler find)
      // Hospital.getResources is likely not implemented as static.
      // We can fetch hospital and its resources manually.
      const hospitalResources = await HospitalResource.find({ hospitalId: hospitalId });
      const currentResources = {};
      hospitalResources.forEach(r => {
          currentResources[r.resourceType] = {
              total: r.total,
              available: r.available,
              occupied: r.occupied
          };
      });
      
      // Resource utilization
      const resourceUtilization = {}; // Calculate from currentResources
      for(const type in currentResources) {
          const res = currentResources[type];
          resourceUtilization[type] = res.total > 0 ? (res.occupied / res.total) * 100 : 0;
      }
      
      // Get pending bookings count
      const pendingBookingsCount = await Booking.countDocuments({ 
          hospitalId: hospitalId, 
          status: 'pending' 
      });
      
      // Get recent activity summary (Aggregation)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const recentBookingActivity = await Booking.aggregate([
          { $match: { 
              hospitalId: new mongoose.Types.ObjectId(hospitalId), 
              updatedAt: { $gt: oneHourAgo } 
          }},
          { $group: {
              _id: "$status",
              count: { $sum: 1 },
              lastActivity: { $max: "$updatedAt" }
          }}
      ]);
      
      const recentResourceActivity = await ResourceAuditLog.aggregate([
          { $match: { 
              hospitalId: new mongoose.Types.ObjectId(hospitalId), 
              timestamp: { $gt: oneHourAgo } 
          }},
          { $group: {
              _id: "$changeType",
              count: { $sum: 1 },
              lastActivity: { $max: "$timestamp" }
          }}
      ]);

      const formattedActivity = [
          ...recentBookingActivity.map(a => ({ type: 'booking', subtype: a._id, count: a.count, lastActivity: a.lastActivity })),
          ...recentResourceActivity.map(a => ({ type: 'resource', subtype: a._id, count: a.count, lastActivity: a.lastActivity }))
      ];
      
      return {
        success: true,
        data: {
          ...combinedUpdates.data,
          dashboard: {
            currentResources,
            resourceUtilization,
            pendingBookingsCount,
            recentActivity: formattedActivity,
            lastUpdated: new Date().toISOString()
          }
        }
      };
      
    } catch (error) {
      console.error('Error in getHospitalDashboardUpdates:', error);
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  /**
   * Check if there are any changes since last update
   * @param {number} hospitalId - Hospital ID (optional)
   * @param {string} lastUpdate - ISO timestamp of last update
   * @returns {Object} Change detection result
   */
  static async hasChanges(hospitalId = null, lastUpdate = null) {
    try {
      if (!lastUpdate) {
        return {
          success: true,
          data: {
            hasChanges: true,
            reason: 'No previous timestamp provided'
          }
        };
      }
      
      const rQuery = { lastUpdated: { $gt: new Date(lastUpdate) } };
      const bQuery = { updatedAt: { $gt: new Date(lastUpdate) } };
      
      if (hospitalId) {
          const hId = new mongoose.Types.ObjectId(hospitalId);
          rQuery.hospitalId = hId;
          bQuery.hospitalId = hId;
      } else {
        const activeHospitals = await Hospital.find({ isActive: true }).select('_id');
        const ids = activeHospitals.map(h => h._id);
        rQuery.hospitalId = { $in: ids };
        bQuery.hospitalId = { $in: ids };
      }
      
      const [resourceChanges, bookingChanges] = await Promise.all([
          HospitalResource.countDocuments(rQuery),
          Booking.countDocuments(bQuery)
      ]);
      
      const hasChanges = resourceChanges > 0 || bookingChanges > 0;
      
      return {
        success: true,
        data: {
          hasChanges,
          resourceChanges,
          bookingChanges,
          totalChanges: resourceChanges + bookingChanges,
          lastChecked: new Date().toISOString()
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
   * Get polling configuration recommendations
   * @param {number} hospitalId - Hospital ID (optional)
   * @param {Object} options - Configuration options
   * @returns {Object} Polling configuration recommendations
   */
  static async getPollingConfig(hospitalId = null, options = {}) {
    try {
      // Analyze activity patterns
      const match = hospitalId ? { hospitalId: new mongoose.Types.ObjectId(hospitalId) } : {};
      
      // This is a simplified "last update" check across all resources to guess activity
      // A proper avgMinutesSinceUpdate requires a history log analysis which might be heavy.
      // Let's us ResourceAuditLog instead? Or just HospitalResource lastUpdated stats.
      
      // Let's try to get average time since last update (current time - lastUpdated)
      const aggregation = await HospitalResource.aggregate([
          { $match: match },
          { $group: {
              _id: null,
              totalChanges: { $sum: 1 }, 
              // Avg minutes since last update for *current state* (not strictly freq, but proxy)
              avgGap: { $avg: { $subtract: [new Date(), "$lastUpdated"] } },
              oldestUpdate: { $min: "$lastUpdated" },
              newestUpdate: { $max: "$lastUpdated" }
          }}
      ]);
      
      let activity = aggregation[0];
      let avgMinutesSinceUpdate = activity ? activity.avgGap / (1000 * 60) : null;

      // Recommend polling interval based on activity
      let recommendedInterval = 30000; // Default 30 seconds
      
      if (avgMinutesSinceUpdate !== null) {
        if (avgMinutesSinceUpdate < 5) {
          recommendedInterval = 10000; // High activity: 10 seconds
        } else if (avgMinutesSinceUpdate < 15) {
          recommendedInterval = 20000; // Medium activity: 20 seconds
        } else if (avgMinutesSinceUpdate > 60) {
          recommendedInterval = 60000; // Low activity: 1 minute
        }
      }
      
      return {
        success: true,
        data: {
          recommendedInterval,
          activityAnalysis: {
             totalChanges: activity ? activity.totalChanges : 0,
             avgMinutesSinceUpdate,
             oldestUpdate: activity ? activity.oldestUpdate : null,
             newestUpdate: activity ? activity.newestUpdate : null
          },
          configuration: {
            minInterval: 5000,   // Minimum 5 seconds
            maxInterval: 300000, // Maximum 5 minutes
            defaultInterval: 30000,
            adaptivePolling: true
          }
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
}

module.exports = PollingService;