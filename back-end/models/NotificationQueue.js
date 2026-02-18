const mongoose = require('mongoose');

const notificationQueueSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, required: true }, // e.g., 'email', 'sms', 'push'
  channel: { type: String, enum: ['email', 'sms', 'push', 'in-app'], default: 'email' },
  recipient: { type: String, required: true }, // email address or phone number
  subject: { type: String },
  content: { type: String, required: true },
  metadata: { type: Object },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  status: { type: String, enum: ['queued', 'processing', 'delivered', 'failed'], default: 'queued' },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  scheduledFor: { type: Date, default: Date.now },
  processedAt: { type: Date },
  error: { type: String }
}, {
  timestamps: true
});

// Index for efficient polling
notificationQueueSchema.index({ status: 1, scheduledFor: 1, priority: 1 });

module.exports = mongoose.model('NotificationQueue', notificationQueueSchema);
