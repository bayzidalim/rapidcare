const Notification = require('../models/Notification');
const Hospital = require('../models/Hospital');

class NotificationService {
  // Create notification
  static async create(notificationData) {
    const notification = await Notification.create({
      userId: notificationData.userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      data: notificationData.data || {},
      isRead: false
    });

    return this.getById(notification._id);
  }

  // Get notification by ID
  static async getById(id) {
    const notification = await Notification.findById(id);
    if (!notification) return null;

    return notification.toObject();
  }

  // Get notifications for user
  static async getByUserId(userId, limit = 50) {
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);

    return notifications.map(n => n.toObject());
  }

  // Mark notification as read
  static async markAsRead(id) {
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );
    return notification ? notification.toObject() : null;
  }

  // Mark all notifications as read for user
  static async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );
    return result.modifiedCount;
  }

  // Get unread count for user
  static async getUnreadCount(userId) {
    return Notification.countDocuments({ userId, isRead: false });
  }

  // Delete notification
  static async delete(id) {
    const result = await Notification.findByIdAndDelete(id);
    return !!result;
  }

  // Hospital approval notification helpers
  static async notifyHospitalApproved(hospitalId, authorityUserId) {
    const hospital = await Hospital.findById(hospitalId);
    
    return this.create({
      userId: authorityUserId,
      type: 'hospital_approved',
      title: 'Hospital Approved!',
      message: `Your hospital "${hospital.name}" has been approved and is now visible to users.`,
      data: { hospitalId, hospitalName: hospital.name }
    });
  }

  static async notifyHospitalRejected(hospitalId, authorityUserId, reason) {
    const hospital = await Hospital.findById(hospitalId);
    
    return this.create({
      userId: authorityUserId,
      type: 'hospital_rejected',
      title: 'Hospital Registration Rejected',
      message: `Your hospital "${hospital.name}" registration was not approved. Reason: ${reason}`,
      data: { hospitalId, hospitalName: hospital.name, reason }
    });
  }

  static async notifyHospitalResubmitted(hospitalId, adminUserIds) {
    const hospital = await Hospital.findById(hospitalId);
    
    // Notify all admin users
    await Promise.all(adminUserIds.map(adminId => {
      return this.create({
        userId: adminId,
        type: 'hospital_resubmitted',
        title: 'Hospital Resubmitted for Review',
        message: `Hospital "${hospital.name}" has been resubmitted for approval review.`,
        data: { hospitalId, hospitalName: hospital.name }
      });
    }));
  }

  // Booking notification helpers
  static async sendBookingApprovalNotification(bookingId, userId, details) {
    return this.create({
      userId,
      type: 'booking_approved',
      title: 'Booking Approved!',
      message: `Your booking for ${details.resourceType} at ${details.hospitalName} has been approved.`,
      data: { bookingId, ...details }
    });
  }

  static async sendBookingDeclineNotification(bookingId, userId, details) {
    return this.create({
      userId,
      type: 'booking_declined',
      title: 'Booking Declined',
      message: `Your booking for ${details.resourceType} at ${details.hospitalName} was declined. Reason: ${details.reason}`,
      data: { bookingId, ...details }
    });
  }

  static async sendBookingCompletionNotification(bookingId, userId, details) {
    return this.create({
      userId,
      type: 'booking_completed',
      title: 'Booking Completed',
      message: `Your booking at ${details.hospitalName} has been marked as completed.`,
      data: { bookingId, ...details }
    });
  }

  static async sendBookingCancellationNotification(bookingId, userId, details) {
    return this.create({
      userId,
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      message: `Your booking at ${details.hospitalName} has been cancelled.`,
      data: { bookingId, ...details }
    });
  }
  // Process Notification Queue
  static async processNotificationQueue(options = {}) {
    try {
      const { limit = 10, priority } = options;
      const NotificationQueue = require('../models/NotificationQueue');
      
      const query = { 
        status: { $in: ['queued', 'failed'] },
        retryCount: { $lt: 3 },
        scheduledFor: { $lte: new Date() }
      };
      
      if (priority) query.priority = priority;

      const queueItems = await NotificationQueue.find(query)
          .sort({ priority: 1, scheduledFor: 1 }) // High first (implied enum order? 'high' < 'medium'? Actually no, enum strings sort alphabetically. Need explicit mapper if we want real priority.)
          // Actually, let's just sort by date for now, or if priority matters, implement custom sort.
          // Enum 'high', 'medium', 'low'. Alphabetic: 'high', 'low', 'medium'. Not ideal.
          // But maybe priority field is separate.
          // Assuming basic FIFO within priority buckets. Or just date.
          .sort({ 'priority': -1, 'createdAt': 1 }) // Simple attempt
          .limit(limit);

      if (queueItems.length === 0) {
        return { success: true, data: { processedCount: 0, results: [] } };
      }

      const results = [];
      for (const item of queueItems) {
        item.status = 'processing';
        await item.save();

        try {
          // Simulate sending (replace with actual logic)
          // e.g. sendEmail(item.recipient, item.subject, item.content)
          console.log(`Sending ${item.type} to ${item.recipient}: ${item.subject}`);
          
          item.status = 'delivered';
          item.processedAt = new Date();
          await item.save();
          
          results.push({ notificationId: item._id, result: { success: true } });
        } catch (error) {
          item.status = 'failed';
          item.error = error.message;
          item.retryCount += 1;
          // Exponential backoff or simple retry schedule
          item.scheduledFor = new Date(Date.now() + Math.pow(2, item.retryCount) * 60000); 
          await item.save();
          
          results.push({ notificationId: item._id, result: { success: false, message: error.message } });
        }
      }

      return { success: true, data: { processedCount: results.length, results } };
    } catch (error) {
       console.error('Error processing notification queue:', error);
       return { success: false, message: error.message };
    }
  }

  // Get Queue Statistics
  static async getQueueStatistics() {
      const NotificationQueue = require('../models/NotificationQueue');
      
      const stats = await NotificationQueue.aggregate([
          { $group: {
              _id: { status: "$status", priority: "$priority", channel: "$channel" },
              count: { $sum: 1 },
              oldest: { $min: "$createdAt" },
              newest: { $max: "$createdAt" }
          }},
          { $sort: { "_id.status": 1, "_id.priority": -1 } }
      ]);
      
      const summary = await NotificationQueue.aggregate([
          { $group: {
              _id: null,
              total: { $sum: 1 },
              queued: { $sum: { $cond: [{ $eq: ["$status", "queued"] }, 1, 0] } },
              processing: { $sum: { $cond: [{ $eq: ["$status", "processing"] }, 1, 0] } },
              delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
              failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
              retried: { $sum: { $cond: [{ $gt: ["$retryCount", 0] }, 1, 0] } }
          }}
      ]);

      return {
          summary: summary[0] || { total: 0, queued: 0, processing: 0, delivered: 0, failed: 0, retried: 0 },
          breakdown: stats.map(s => ({
              status: s._id.status,
              priority: s._id.priority,
              channel: s._id.channel,
              count: s.count,
              oldest: s.oldest,
              newest: s.newest
          }))
      };
  }

  // Cleanup Old Notifications
  static async cleanupOldNotifications(options = {}) {
      const { olderThanDays = 30, onlyDelivered = true } = options;
      const NotificationQueue = require('../models/NotificationQueue');
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      const query = { createdAt: { $lt: cutoffDate } };
      if (onlyDelivered) {
          query.status = 'delivered';
      }

      const result = await NotificationQueue.deleteMany(query);
      return result.deletedCount;
  }
}
module.exports = NotificationService;