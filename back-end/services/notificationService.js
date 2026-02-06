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
}
module.exports = NotificationService;