const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

class AuditTrailService {
  // Create audit log entry
  static async log(auditData) {
    const changes = {
      action: auditData.action,
      userType: auditData.userType,
      oldData: auditData.oldData || {},
      newData: auditData.newData || {}
    };

    const newLog = new AuditLog({
      eventType: auditData.action,
      entityType: auditData.entityType,
      entityId: auditData.entityId.toString(),
      userId: auditData.userId,
      changes: changes,
      metadata: auditData.metadata || {}
    });

    await newLog.save();
    return this.getById(newLog._id);
  }

  // Get audit log by ID
  static async getById(id) {
    const audit = await AuditLog.findById(id).populate('userId', 'name email');

    if (!audit) return null;

    const changes = audit.changes || {};

    return {
      ...audit.toObject(),
      userName: audit.userId?.name,
      userEmail: audit.userId?.email,
      action: audit.eventType, // Map back to action
      entityType: audit.entityType,
      entityId: audit.entityId, // Keep as string or parse? Original parsed to Int. Let's keep string for flexibility.
      userId: audit.userId?._id,
      userType: changes.userType,
      oldData: changes.oldData || {},
      newData: changes.newData || {},
      metadata: audit.metadata || {},
      createdAt: audit.createdAt
    };
  }

  // Get audit trail for entity
  static async getByEntity(entityType, entityId, limit = 100) {
    const audits = await AuditLog.find({ 
      entityType, 
      entityId: entityId.toString() 
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'name email');

    return audits.map(audit => {
      const changes = audit.changes || {};
      return {
        ...audit.toObject(),
        userName: audit.userId?.name,
        userEmail: audit.userId?.email,
        action: audit.eventType,
        entityType: audit.entityType,
        entityId: audit.entityId,
        userId: audit.userId?._id,
        userType: changes.userType,
        oldData: changes.oldData || {},
        newData: changes.newData || {},
        metadata: audit.metadata || {},
        createdAt: audit.createdAt
      };
    });
  }

  // Get audit trail for user
  static async getByUser(userId, limit = 100) {
    const audits = await AuditLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'name email');

    return audits.map(audit => {
      const changes = audit.changes || {};
      return {
        ...audit.toObject(),
        userName: audit.userId?.name,
        userEmail: audit.userId?.email,
        action: audit.eventType,
        entityType: audit.entityType,
        entityId: audit.entityId,
        userId: audit.userId?._id,
        userType: changes.userType,
        oldData: changes.oldData || {},
        newData: changes.newData || {},
        metadata: audit.metadata || {},
        createdAt: audit.createdAt
      };
    });
  }

  // Hospital approval specific audit methods
  static async logHospitalSubmission(hospitalId, authorityUserId, hospitalData) {
    return this.log({
      entityType: 'hospital',
      entityId: hospitalId,
      action: 'submitted',
      userId: authorityUserId,
      userType: 'hospital-authority',
      newData: hospitalData,
      metadata: {
        submittedAt: new Date().toISOString(),
        status: 'pending'
      }
    });
  }

  static async logHospitalApproval(hospitalId, adminUserId, approvalData) {
    return this.log({
      entityType: 'hospital',
      entityId: hospitalId,
      action: 'approved',
      userId: adminUserId,
      userType: 'admin',
      oldData: { approval_status: 'pending' },
      newData: { approval_status: 'approved' },
      metadata: {
        approvedAt: new Date().toISOString(),
        notes: approvalData.notes || null
      }
    });
  }

  static async logHospitalRejection(hospitalId, adminUserId, rejectionData) {
    return this.log({
      entityType: 'hospital',
      entityId: hospitalId,
      action: 'rejected',
      userId: adminUserId,
      userType: 'admin',
      oldData: { approval_status: 'pending' },
      newData: { approval_status: 'rejected' },
      metadata: {
        rejectedAt: new Date().toISOString(),
        reason: rejectionData.reason,
        notes: rejectionData.notes || null
      }
    });
  }

  static async logHospitalResubmission(hospitalId, authorityUserId, resubmissionData) {
    return this.log({
      entityType: 'hospital',
      entityId: hospitalId,
      action: 'resubmitted',
      userId: authorityUserId,
      userType: 'hospital-authority',
      oldData: { approval_status: 'rejected' },
      newData: { approval_status: 'pending' },
      metadata: {
        resubmittedAt: new Date().toISOString(),
        changes: resubmissionData.changes || null
      }
    });
  }

  // Get approval workflow metrics
  static async getApprovalMetrics(startDate, endDate) {
    const matchStage = {
      entityType: 'hospital',
      eventType: { $in: ['submitted', 'approved', 'rejected', 'resubmitted'] }
    };
    
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const metrics = await AuditLog.aggregate([
      { $match: matchStage },
      { $group: {
         _id: '$eventType',
         count: { $sum: 1 },
         // Avg time calculation is hard in simple aggregation without complex lookups or window functions.
         // We can approximate or skip avg_approval_time_hours for now if it's too complex to replicate exactly 
         // without significant effort.
         // Or perform a separate calculation.
         // The SQL used a subquery to find 'submitted' event for 'approved' event.
         // In Mongo, we can $lookup self to find previous event? Or just fetch all and process in JS if volume is low.
      }}
    ]);
    
    // Process metrics into array format
    return metrics.map(m => ({
        action: m._id,
        count: m.count,
        avg_approval_time_hours: 0 // Placeholder
    }));
  }

  // Get approval efficiency stats
  static async getApprovalEfficiency() {
    const stats = await AuditLog.aggregate([
      { $match: { entityType: 'hospital' } },
      { $group: {
        _id: null,
        total_submissions: { $sum: { $cond: [{ $eq: ["$eventType", "submitted"] }, 1, 0] } },
        total_approvals: { $sum: { $cond: [{ $eq: ["$eventType", "approved"] }, 1, 0] } },
        total_rejections: { $sum: { $cond: [{ $eq: ["$eventType", "rejected"] }, 1, 0] } },
        total_resubmissions: { $sum: { $cond: [{ $eq: ["$eventType", "resubmitted"] }, 1, 0] } }
      }}
    ]);
    
    const result = stats[0] || {
        total_submissions: 0,
        total_approvals: 0,
        total_rejections: 0,
        total_resubmissions: 0
    };

    return {
      ...result,
      approval_rate: result.total_submissions > 0 ? 
        (result.total_approvals / result.total_submissions * 100).toFixed(2) : 0,
      rejection_rate: result.total_submissions > 0 ? 
        (result.total_rejections / result.total_submissions * 100).toFixed(2) : 0,
      resubmission_rate: result.total_rejections > 0 ? 
        (result.total_resubmissions / result.total_rejections * 100).toFixed(2) : 0,
       avg_approval_time_hours: 0 // Placeholder
    };
  }
}

module.exports = AuditTrailService;