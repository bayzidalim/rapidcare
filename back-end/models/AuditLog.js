const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  eventType: {
    type: String, // mapped from event_type
    required: true,
    index: true
  },
  entityType: {
    type: String, // mapped from entity_type
    required: true,
    index: true
  },
  entityId: {
    type: String, // mapped from entity_id
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId, // mapped from user_id
    ref: 'User',
    index: true
  },
  changes: {
    type: mongoose.Schema.Types.Mixed, // Stores JSON
    default: {}
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed, // Stores JSON
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes for common queries
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
