const mongoose = require('mongoose');

const resourceAuditLogSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  resourceType: { type: String, required: true },
  changeType: { 
    type: String, 
    required: true,
    enum: ['manual_update', 'booking_approved', 'booking_completed', 'booking_cancelled', 'system_adjustment']
  },
  oldValue: Number,
  newValue: Number,
  quantity: { type: Number, required: true }, // Positive (release/add) or Negative (allocate/remove)
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason: String,
  notes: String,
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: { createdAt: 'timestamp', updatedAt: false } // Use timestamp as createdAt
});

// Static methods
resourceAuditLogSchema.statics.getByHospital = function(hospitalId, options = {}) {
    let query = this.find({ hospitalId });
    
    if (options.resourceType) query = query.where('resourceType').equals(options.resourceType);
    if (options.changeType) query = query.where('changeType').equals(options.changeType);
    if (options.startDate) query = query.where('timestamp').gte(new Date(options.startDate));
    if (options.endDate) query = query.where('timestamp').lte(new Date(options.endDate));
    
    query = query.sort({ timestamp: -1 })
        .populate('changedBy', 'name')
        .populate('bookingId', 'patientName');
        
    if (options.limit) query = query.limit(options.limit);
    if (options.offset) query = query.skip(options.offset);
    
    return query;
};

resourceAuditLogSchema.statics.logManualUpdate = function(hospitalId, resourceType, oldValue, newValue, changedBy, reason = null) {
    return this.create({
        hospitalId,
        resourceType,
        changeType: 'manual_update',
        oldValue,
        newValue,
        quantity: newValue - oldValue,
        changedBy,
        reason: reason || 'Manual resource quantity update'
    });
};

resourceAuditLogSchema.statics.logBookingApproval = function(hospitalId, resourceType, quantity, bookingId, approvedBy) {
    return this.create({
        hospitalId,
        resourceType,
        changeType: 'booking_approved',
        quantity: -quantity, // Allocate (reduce available)
        bookingId,
        changedBy: approvedBy,
        reason: 'Resource allocated for approved booking'
    });
};

resourceAuditLogSchema.statics.logBookingCompletion = function(hospitalId, resourceType, quantity, bookingId, completedBy) {
    return this.create({
        hospitalId,
        resourceType,
        changeType: 'booking_completed',
        quantity: quantity, // Release (increase available)
        bookingId,
        changedBy: completedBy,
        reason: 'Resource released after booking completion'
    });
};

resourceAuditLogSchema.statics.logBookingCancellation = function(hospitalId, resourceType, quantity, bookingId, cancelledBy) {
    return this.create({
        hospitalId,
        resourceType,
        changeType: 'booking_cancelled',
        quantity: quantity, // Release
        bookingId,
        changedBy: cancelledBy,
        reason: 'Resource released due to booking cancellation'
    });
};

const ResourceAuditLog = mongoose.model('ResourceAuditLog', resourceAuditLogSchema);

module.exports = ResourceAuditLog;