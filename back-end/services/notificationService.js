const db = require('../config/database');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');
const UserBalance = require('../models/UserBalance');
const BalanceTransaction = require('../models/BalanceTransaction');

/**
 * NotificationService
 * 
 * Handles all notification operations including:
 * - Booking status notifications (approval, decline, completion, cancellation)
 * - Email and SMS notification templates
 * - Notification queue system with retry logic
 * - Notification logging and delivery tracking
 * - Template management and customization
 */
class NotificationService {
  
  /**
   * Send booking approval notification to patient
   * @param {number} bookingId - Booking ID
   * @param {number} patientId - Patient user ID
   * @param {Object} approvalDetails - Approval details
   * @param {string} approvalDetails.hospitalName - Hospital name
   * @param {string} approvalDetails.resourceType - Resource type
   * @param {string} approvalDetails.scheduledDate - Scheduled date
   * @param {string} approvalDetails.notes - Approval notes
   * @returns {Object} Notification result
   */
  static async sendBookingApprovalNotification(bookingId, patientId, approvalDetails) {
    try {
      // Get patient details
      const patient = User.findById(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Get booking details
      const booking = Booking.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Prepare notification data
      const notificationData = {
        type: 'booking_approved',
        recipient: {
          id: patientId,
          name: patient.name,
          email: patient.email,
          phone: patient.phone
        },
        booking: {
          id: bookingId,
          patientName: booking.patientName,
          resourceType: booking.resourceType,
          hospitalName: approvalDetails.hospitalName,
          scheduledDate: approvalDetails.scheduledDate,
          resourcesAllocated: booking.resourcesAllocated || 1
        },
        details: {
          approvedAt: new Date().toISOString(),
          notes: approvalDetails.notes,
          nextSteps: this.getApprovalNextSteps(booking.resourceType)
        }
      };

      // Generate notification content
      const emailContent = this.generateEmailTemplate('booking_approved', notificationData);
      const smsContent = this.generateSMSTemplate('booking_approved', notificationData);

      // Queue notifications
      const emailResult = await this.queueNotification({
        ...notificationData,
        channel: 'email',
        content: emailContent,
        priority: 'high'
      });

      const smsResult = await this.queueNotification({
        ...notificationData,
        channel: 'sms',
        content: smsContent,
        priority: 'high'
      });

      return {
        success: true,
        message: 'Booking approval notifications queued successfully',
        data: {
          emailNotificationId: emailResult.notificationId,
          smsNotificationId: smsResult.notificationId,
          bookingId,
          patientId
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
   * Send booking decline notification to patient
   * @param {number} bookingId - Booking ID
   * @param {number} patientId - Patient user ID
   * @param {Object} declineDetails - Decline details
   * @param {string} declineDetails.hospitalName - Hospital name
   * @param {string} declineDetails.reason - Decline reason
   * @param {string} declineDetails.notes - Additional notes
   * @param {Array} declineDetails.alternativeSuggestions - Alternative suggestions
   * @returns {Object} Notification result
   */
  static async sendBookingDeclineNotification(bookingId, patientId, declineDetails) {
    try {
      // Get patient details
      const patient = User.findById(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Get booking details
      const booking = Booking.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Get alternative hospitals if not provided
      let alternatives = declineDetails.alternativeSuggestions || [];
      if (alternatives.length === 0) {
        alternatives = await this.findAlternativeHospitals(
          booking.resourceType, 
          booking.resourcesAllocated || 1
        );
      }

      // Prepare notification data
      const notificationData = {
        type: 'booking_declined',
        recipient: {
          id: patientId,
          name: patient.name,
          email: patient.email,
          phone: patient.phone
        },
        booking: {
          id: bookingId,
          patientName: booking.patientName,
          resourceType: booking.resourceType,
          hospitalName: declineDetails.hospitalName,
          scheduledDate: booking.scheduledDate
        },
        details: {
          declinedAt: new Date().toISOString(),
          reason: declineDetails.reason,
          notes: declineDetails.notes,
          alternativeSuggestions: alternatives,
          supportContact: this.getSupportContactInfo()
        }
      };

      // Generate notification content
      const emailContent = this.generateEmailTemplate('booking_declined', notificationData);
      const smsContent = this.generateSMSTemplate('booking_declined', notificationData);

      // Queue notifications
      const emailResult = await this.queueNotification({
        ...notificationData,
        channel: 'email',
        content: emailContent,
        priority: 'high'
      });

      const smsResult = await this.queueNotification({
        ...notificationData,
        channel: 'sms',
        content: smsContent,
        priority: 'high'
      });

      return {
        success: true,
        message: 'Booking decline notifications queued successfully',
        data: {
          emailNotificationId: emailResult.notificationId,
          smsNotificationId: smsResult.notificationId,
          bookingId,
          patientId,
          alternativesProvided: alternatives.length
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
   * Send booking completion notification to patient
   * @param {number} bookingId - Booking ID
   * @param {number} patientId - Patient user ID
   * @param {Object} completionDetails - Completion details
   * @returns {Object} Notification result
   */
  static async sendBookingCompletionNotification(bookingId, patientId, completionDetails) {
    try {
      // Get patient details
      const patient = User.findById(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Get booking details
      const booking = Booking.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Prepare notification data
      const notificationData = {
        type: 'booking_completed',
        recipient: {
          id: patientId,
          name: patient.name,
          email: patient.email,
          phone: patient.phone
        },
        booking: {
          id: bookingId,
          patientName: booking.patientName,
          resourceType: booking.resourceType,
          hospitalName: completionDetails.hospitalName,
          scheduledDate: booking.scheduledDate
        },
        details: {
          completedAt: new Date().toISOString(),
          notes: completionDetails.notes,
          followUpInstructions: this.getFollowUpInstructions(booking.resourceType),
          feedbackRequest: true
        }
      };

      // Generate notification content
      const emailContent = this.generateEmailTemplate('booking_completed', notificationData);
      const smsContent = this.generateSMSTemplate('booking_completed', notificationData);

      // Queue notifications (lower priority for completion)
      const emailResult = await this.queueNotification({
        ...notificationData,
        channel: 'email',
        content: emailContent,
        priority: 'medium'
      });

      const smsResult = await this.queueNotification({
        ...notificationData,
        channel: 'sms',
        content: smsContent,
        priority: 'medium'
      });

      return {
        success: true,
        message: 'Booking completion notifications queued successfully',
        data: {
          emailNotificationId: emailResult.notificationId,
          smsNotificationId: smsResult.notificationId,
          bookingId,
          patientId
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
   * Send booking cancellation notification to patient
   * @param {number} bookingId - Booking ID
   * @param {number} patientId - Patient user ID
   * @param {Object} cancellationDetails - Cancellation details
   * @returns {Object} Notification result
   */
  static async sendBookingCancellationNotification(bookingId, patientId, cancellationDetails) {
    try {
      // Get patient details
      const patient = User.findById(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Get booking details
      const booking = Booking.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Prepare notification data
      const notificationData = {
        type: 'booking_cancelled',
        recipient: {
          id: patientId,
          name: patient.name,
          email: patient.email,
          phone: patient.phone
        },
        booking: {
          id: bookingId,
          patientName: booking.patientName,
          resourceType: booking.resourceType,
          hospitalName: cancellationDetails.hospitalName,
          scheduledDate: booking.scheduledDate
        },
        details: {
          cancelledAt: new Date().toISOString(),
          reason: cancellationDetails.reason,
          notes: cancellationDetails.notes,
          refundInfo: cancellationDetails.refundInfo,
          rebookingAllowed: true
        }
      };

      // Generate notification content
      const emailContent = this.generateEmailTemplate('booking_cancelled', notificationData);
      const smsContent = this.generateSMSTemplate('booking_cancelled', notificationData);

      // Queue notifications
      const emailResult = await this.queueNotification({
        ...notificationData,
        channel: 'email',
        content: emailContent,
        priority: 'high'
      });

      const smsResult = await this.queueNotification({
        ...notificationData,
        channel: 'sms',
        content: smsContent,
        priority: 'high'
      });

      return {
        success: true,
        message: 'Booking cancellation notifications queued successfully',
        data: {
          emailNotificationId: emailResult.notificationId,
          smsNotificationId: smsResult.notificationId,
          bookingId,
          patientId
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
   * Send payment confirmation notification to user
   * @param {number} transactionId - Transaction ID
   * @param {number} userId - User ID
   * @param {Object} paymentDetails - Payment details
   * @returns {Object} Notification result
   */
  static async sendPaymentConfirmationNotification(transactionId, userId, paymentDetails) {
    try {
      // Get user details
      const user = User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get transaction details
      const transaction = Transaction.findById(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Get booking details
      const booking = Booking.findById(transaction.bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Prepare notification data
      const notificationData = {
        type: 'payment_confirmed',
        recipient: {
          id: userId,
          name: user.name,
          email: user.email,
          phone: user.phone
        },
        transaction: {
          id: transactionId,
          transactionId: transaction.transactionId,
          amount: transaction.amount,
          paymentMethod: transaction.paymentMethod,
          processedAt: transaction.processedAt
        },
        booking: {
          id: booking.id,
          patientName: booking.patientName,
          resourceType: booking.resourceType,
          hospitalName: paymentDetails.hospitalName,
          scheduledDate: booking.scheduledDate
        },
        details: {
          receiptId: `RCPT_${transaction.transactionId}`,
          serviceCharge: transaction.serviceCharge,
          hospitalAmount: transaction.hospitalAmount,
          paymentDate: transaction.processedAt
        }
      };

      // Generate notification content
      const emailContent = this.generateEmailTemplate('payment_confirmed', notificationData);
      const smsContent = this.generateSMSTemplate('payment_confirmed', notificationData);

      // Queue notifications
      const emailResult = await this.queueNotification({
        ...notificationData,
        channel: 'email',
        content: emailContent,
        priority: 'high'
      });

      const smsResult = await this.queueNotification({
        ...notificationData,
        channel: 'sms',
        content: smsContent,
        priority: 'high'
      });

      return {
        success: true,
        message: 'Payment confirmation notifications queued successfully',
        data: {
          emailNotificationId: emailResult.notificationId,
          smsNotificationId: smsResult.notificationId,
          transactionId,
          userId
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
   * Send revenue notification to hospital authority
   * @param {number} hospitalId - Hospital ID
   * @param {number} authorityUserId - Hospital authority user ID
   * @param {Object} revenueDetails - Revenue details
   * @returns {Object} Notification result
   */
  static async sendRevenueNotification(hospitalId, authorityUserId, revenueDetails) {
    try {
      // Get hospital authority details
      const authority = User.findById(authorityUserId);
      if (!authority) {
        throw new Error('Hospital authority not found');
      }

      // Prepare notification data
      const notificationData = {
        type: 'revenue_received',
        recipient: {
          id: authorityUserId,
          name: authority.name,
          email: authority.email,
          phone: authority.phone
        },
        revenue: {
          hospitalId,
          hospitalName: revenueDetails.hospitalName,
          amount: revenueDetails.amount,
          transactionId: revenueDetails.transactionId,
          bookingId: revenueDetails.bookingId,
          resourceType: revenueDetails.resourceType,
          patientName: revenueDetails.patientName
        },
        details: {
          receivedAt: new Date().toISOString(),
          serviceChargeDeducted: revenueDetails.serviceCharge,
          totalBookingAmount: revenueDetails.totalAmount,
          currentBalance: revenueDetails.currentBalance
        }
      };

      // Generate notification content
      const emailContent = this.generateEmailTemplate('revenue_received', notificationData);
      const smsContent = this.generateSMSTemplate('revenue_received', notificationData);

      // Queue notifications
      const emailResult = await this.queueNotification({
        ...notificationData,
        channel: 'email',
        content: emailContent,
        priority: 'medium'
      });

      const smsResult = await this.queueNotification({
        ...notificationData,
        channel: 'sms',
        content: smsContent,
        priority: 'medium'
      });

      return {
        success: true,
        message: 'Revenue notifications queued successfully',
        data: {
          emailNotificationId: emailResult.notificationId,
          smsNotificationId: smsResult.notificationId,
          hospitalId,
          authorityUserId
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
   * Send admin alert for financial anomalies
   * @param {Object} anomalyDetails - Anomaly details
   * @returns {Object} Notification result
   */
  static async sendFinancialAnomalyAlert(anomalyDetails) {
    try {
      // Get admin users
      const admins = db.prepare(`
        SELECT id, name, email, phone 
        FROM users 
        WHERE userType = 'admin'
      `).all();

      if (admins.length === 0) {
        throw new Error('No admin users found');
      }

      const results = [];

      for (const admin of admins) {
        // Prepare notification data
        const notificationData = {
          type: 'financial_anomaly',
          recipient: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            phone: admin.phone
          },
          anomaly: {
            type: anomalyDetails.type,
            severity: anomalyDetails.severity,
            description: anomalyDetails.description,
            affectedTransactions: anomalyDetails.affectedTransactions || [],
            detectedAt: new Date().toISOString(),
            recommendedAction: anomalyDetails.recommendedAction
          },
          details: {
            hospitalId: anomalyDetails.hospitalId,
            hospitalName: anomalyDetails.hospitalName,
            amount: anomalyDetails.amount,
            discrepancy: anomalyDetails.discrepancy,
            investigationRequired: true
          }
        };

        // Generate notification content
        const emailContent = this.generateEmailTemplate('financial_anomaly', notificationData);
        const smsContent = this.generateSMSTemplate('financial_anomaly', notificationData);

        // Queue notifications with urgent priority
        const emailResult = await this.queueNotification({
          ...notificationData,
          channel: 'email',
          content: emailContent,
          priority: 'urgent'
        });

        const smsResult = await this.queueNotification({
          ...notificationData,
          channel: 'sms',
          content: smsContent,
          priority: 'urgent'
        });

        results.push({
          adminId: admin.id,
          emailNotificationId: emailResult.notificationId,
          smsNotificationId: smsResult.notificationId
        });
      }

      return {
        success: true,
        message: 'Financial anomaly alerts queued successfully',
        data: {
          alertsSent: results.length,
          results
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
   * Send balance threshold notification
   * @param {number} userId - User ID
   * @param {Object} balanceDetails - Balance details
   * @returns {Object} Notification result
   */
  static async sendBalanceThresholdNotification(userId, balanceDetails) {
    try {
      // Get user details
      const user = User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Prepare notification data
      const notificationData = {
        type: 'balance_threshold',
        recipient: {
          id: userId,
          name: user.name,
          email: user.email,
          phone: user.phone
        },
        balance: {
          currentBalance: balanceDetails.currentBalance,
          threshold: balanceDetails.threshold,
          hospitalId: balanceDetails.hospitalId,
          hospitalName: balanceDetails.hospitalName,
          userType: user.userType
        },
        details: {
          alertTriggeredAt: new Date().toISOString(),
          recommendedAction: balanceDetails.currentBalance <= 0 
            ? 'Immediate attention required - negative balance'
            : 'Consider reviewing recent transactions',
          lastTransaction: balanceDetails.lastTransaction
        }
      };

      // Generate notification content
      const emailContent = this.generateEmailTemplate('balance_threshold', notificationData);
      const smsContent = this.generateSMSTemplate('balance_threshold', notificationData);

      // Queue notifications
      const priority = balanceDetails.currentBalance <= 0 ? 'urgent' : 'high';
      
      const emailResult = await this.queueNotification({
        ...notificationData,
        channel: 'email',
        content: emailContent,
        priority
      });

      const smsResult = await this.queueNotification({
        ...notificationData,
        channel: 'sms',
        content: smsContent,
        priority
      });

      return {
        success: true,
        message: 'Balance threshold notifications queued successfully',
        data: {
          emailNotificationId: emailResult.notificationId,
          smsNotificationId: smsResult.notificationId,
          userId,
          currentBalance: balanceDetails.currentBalance
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
   * Generate and send payment receipt
   * @param {number} transactionId - Transaction ID
   * @param {number} userId - User ID
   * @returns {Object} Receipt generation result
   */
  static async generateAndSendReceipt(transactionId, userId) {
    try {
      // Get transaction details
      const transaction = Transaction.findById(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Get user details
      const user = User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get booking details
      const booking = Booking.findById(transaction.bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Generate receipt data
      const receiptData = {
        receiptId: `RCPT_${transaction.transactionId}`,
        transactionId: transaction.transactionId,
        bookingId: transaction.bookingId,
        patientName: booking.patientName,
        hospitalName: transaction.hospitalName,
        resourceType: booking.resourceType,
        scheduledDate: booking.scheduledDate,
        amount: transaction.amount,
        serviceCharge: transaction.serviceCharge,
        hospitalAmount: transaction.hospitalAmount,
        paymentMethod: transaction.paymentMethod,
        paymentDate: transaction.processedAt,
        status: transaction.status,
        receiptDate: new Date().toISOString()
      };

      // Prepare notification data for receipt
      const notificationData = {
        type: 'payment_receipt',
        recipient: {
          id: userId,
          name: user.name,
          email: user.email,
          phone: user.phone
        },
        receipt: receiptData,
        details: {
          generatedAt: new Date().toISOString(),
          downloadAvailable: true
        }
      };

      // Generate email content with receipt
      const emailContent = this.generateEmailTemplate('payment_receipt', notificationData);

      // Queue email notification (receipts are typically sent via email)
      const emailResult = await this.queueNotification({
        ...notificationData,
        channel: 'email',
        content: emailContent,
        priority: 'medium'
      });

      return {
        success: true,
        message: 'Payment receipt generated and queued for delivery',
        data: {
          receiptId: receiptData.receiptId,
          emailNotificationId: emailResult.notificationId,
          receiptData
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
  /**
   * Queue a notification for delivery
   * @param {Object} notificationData - Notification data
   * @returns {Object} Queue result
   */
  static async queueNotification(notificationData) {
    try {
      // Insert notification into queue
      const stmt = db.prepare(`
        INSERT INTO notification_queue (
          recipientId, type, channel, priority, content, 
          metadata, status, scheduledAt, createdAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      const result = stmt.run(
        notificationData.recipient.id,
        notificationData.type,
        notificationData.channel,
        notificationData.priority || 'medium',
        JSON.stringify(notificationData.content),
        JSON.stringify({
          booking: notificationData.booking,
          details: notificationData.details,
          recipient: notificationData.recipient
        }),
        'queued',
        notificationData.scheduledAt || new Date().toISOString()
      );

      return {
        success: true,
        notificationId: result.lastInsertRowid,
        queuedAt: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }  /**

   * Process notification queue
   * @param {Object} options - Processing options
   * @param {number} options.limit - Maximum notifications to process
   * @param {string} options.priority - Priority filter
   * @returns {Object} Processing result
   */
  static async processNotificationQueue(options = {}) {
    try {
      // Get queued notifications
      let query = `
        SELECT * FROM notification_queue 
        WHERE status = 'queued' 
        AND datetime(scheduledAt) <= datetime('now')
      `;
      
      const params = [];
      
      if (options.priority) {
        query += ' AND priority = ?';
        params.push(options.priority);
      }
      
      query += ' ORDER BY priority DESC, createdAt ASC';
      
      if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
      }
      
      const stmt = db.prepare(query);
      const notifications = stmt.all(...params);

      const results = [];
      
      for (const notification of notifications) {
        const result = await this.deliverNotification(notification);
        results.push({
          notificationId: notification.id,
          result
        });
      }

      return {
        success: true,
        message: `Processed ${results.length} notifications`,
        data: {
          processedCount: results.length,
          results
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
   * Deliver a single notification
   * @param {Object} notification - Notification record
   * @returns {Object} Delivery result
   */
  static async deliverNotification(notification) {
    try {
      // Update status to processing
      this.updateNotificationStatus(notification.id, 'processing');

      let deliveryResult;
      
      // Deliver based on channel
      switch (notification.channel) {
        case 'email':
          deliveryResult = await this.deliverEmail(notification);
          break;
        case 'sms':
          deliveryResult = await this.deliverSMS(notification);
          break;
        default:
          throw new Error(`Unsupported notification channel: ${notification.channel}`);
      }

      // Update status based on delivery result
      if (deliveryResult.success) {
        this.updateNotificationStatus(notification.id, 'delivered', {
          deliveredAt: new Date().toISOString(),
          deliveryDetails: deliveryResult.details
        });
      } else {
        // Handle retry logic
        const retryResult = await this.handleNotificationRetry(notification, deliveryResult.error);
        if (!retryResult.shouldRetry) {
          this.updateNotificationStatus(notification.id, 'failed', {
            failedAt: new Date().toISOString(),
            error: deliveryResult.error,
            retryCount: notification.retryCount || 0
          });
        }
      }

      return deliveryResult;

    } catch (error) {
      // Update status to failed
      this.updateNotificationStatus(notification.id, 'failed', {
        failedAt: new Date().toISOString(),
        error: error.message
      });

      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  /**
   * Deliver email notification (mock implementation)
   * @param {Object} notification - Notification record
   * @returns {Object} Delivery result
   */
  static async deliverEmail(notification) {
    try {
      // Parse notification content and metadata
      const content = JSON.parse(notification.content);
      const metadata = JSON.parse(notification.metadata);

      // Mock email delivery (in real implementation, use email service like SendGrid, AWS SES, etc.)
      console.log(`[EMAIL DELIVERY] To: ${metadata.recipient.email}`);
      console.log(`[EMAIL DELIVERY] Subject: ${content.subject}`);
      console.log(`[EMAIL DELIVERY] Body: ${content.body.substring(0, 100)}...`);

      // Simulate delivery delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Log successful delivery
      this.logNotificationDelivery(notification.id, 'email', {
        recipient: metadata.recipient.email,
        subject: content.subject,
        deliveredAt: new Date().toISOString(),
        provider: 'mock-email-service'
      });

      return {
        success: true,
        message: 'Email delivered successfully',
        details: {
          recipient: metadata.recipient.email,
          deliveredAt: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        success: false,
        message: 'Email delivery failed',
        error: error.message
      };
    }
  }

  /**
   * Deliver SMS notification (mock implementation)
   * @param {Object} notification - Notification record
   * @returns {Object} Delivery result
   */
  static async deliverSMS(notification) {
    try {
      // Parse notification content and metadata
      const content = JSON.parse(notification.content);
      const metadata = JSON.parse(notification.metadata);

      // Mock SMS delivery (in real implementation, use SMS service like Twilio, AWS SNS, etc.)
      console.log(`[SMS DELIVERY] To: ${metadata.recipient.phone}`);
      console.log(`[SMS DELIVERY] Message: ${content.message}`);

      // Simulate delivery delay
      await new Promise(resolve => setTimeout(resolve, 50));

      // Log successful delivery
      this.logNotificationDelivery(notification.id, 'sms', {
        recipient: metadata.recipient.phone,
        message: content.message,
        deliveredAt: new Date().toISOString(),
        provider: 'mock-sms-service'
      });

      return {
        success: true,
        message: 'SMS delivered successfully',
        details: {
          recipient: metadata.recipient.phone,
          deliveredAt: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        success: false,
        message: 'SMS delivery failed',
        error: error.message
      };
    }
  }

  /**
   * Handle notification retry logic
   * @param {Object} notification - Notification record
   * @param {string} error - Error message
   * @returns {Object} Retry decision
   */
  static async handleNotificationRetry(notification, error) {
    const maxRetries = 3;
    const retryCount = notification.retryCount || 0;
    
    if (retryCount >= maxRetries) {
      return { shouldRetry: false, reason: 'Max retries exceeded' };
    }

    // Calculate retry delay (exponential backoff)
    const retryDelay = Math.pow(2, retryCount) * 60 * 1000; // 1min, 2min, 4min
    const nextRetryAt = new Date(Date.now() + retryDelay);

    // Update notification for retry
    const stmt = db.prepare(`
      UPDATE notification_queue 
      SET status = 'queued',
          retryCount = ?,
          scheduledAt = ?,
          lastError = ?,
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(retryCount + 1, nextRetryAt.toISOString(), error, notification.id);

    return {
      shouldRetry: true,
      nextRetryAt: nextRetryAt.toISOString(),
      retryCount: retryCount + 1
    };
  }

  /**
   * Update notification status
   * @param {number} notificationId - Notification ID
   * @param {string} status - New status
   * @param {Object} additionalData - Additional data to store
   */
  static updateNotificationStatus(notificationId, status, additionalData = {}) {
    const stmt = db.prepare(`
      UPDATE notification_queue 
      SET status = ?, 
          deliveryDetails = ?,
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(status, JSON.stringify(additionalData), notificationId);
  }

  /**
   * Log notification delivery
   * @param {number} notificationId - Notification ID
   * @param {string} channel - Delivery channel
   * @param {Object} deliveryDetails - Delivery details
   */
  static logNotificationDelivery(notificationId, channel, deliveryDetails) {
    const stmt = db.prepare(`
      INSERT INTO notification_delivery_log (
        notificationId, channel, deliveryDetails, deliveredAt
      )
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(notificationId, channel, JSON.stringify(deliveryDetails));
  }

  /**
   * Generate email template
   * @param {string} templateType - Template type
   * @param {Object} data - Template data
   * @returns {Object} Email content
   */
  static generateEmailTemplate(templateType, data) {
    const templates = {
      booking_approved: {
        subject: `RapidCare: Your Booking Has Been Confirmed - ${data.booking.hospitalName}`,
        body: `
Dear ${data.recipient.name},

Excellent news! Your emergency care booking has been confirmed through RapidCare.

Booking Details:
- Hospital: ${data.booking.hospitalName}
- Resource: ${data.booking.resourceType}
- Patient: ${data.booking.patientName}
- Scheduled Date: ${new Date(data.booking.scheduledDate).toLocaleDateString()}
- Resources Allocated: ${data.booking.resourcesAllocated}

${data.details.notes ? `Hospital Notes: ${data.details.notes}` : ''}

Next Steps:
${(data.details.nextSteps || []).join('\n')}

Please arrive at the hospital 30 minutes before your scheduled time with valid identification and insurance documents.

If you have any questions, please contact the hospital directly or reach out to our RapidCare support team.

Best regards,
The RapidCare Team
Emergency Care, Delivered Fast
        `.trim()
      },

      booking_declined: {
        subject: `RapidCare: Alternative Options Available - ${data.booking.hospitalName}`,
        body: `
Dear ${data.recipient.name},

We understand this is a critical time for you. Unfortunately, your booking request at ${data.booking.hospitalName} is not available, but RapidCare is here to help you find immediate alternatives.

Original Request Details:
- Hospital: ${data.booking.hospitalName}
- Resource: ${data.booking.resourceType}
- Patient: ${data.booking.patientName}
- Requested Date: ${new Date(data.booking.scheduledDate).toLocaleDateString()}

Reason: ${data.details.reason}
${data.details.notes ? `Additional Information: ${data.details.notes}` : ''}

${(data.details.alternativeSuggestions || []).length > 0 ? `
IMMEDIATE ALTERNATIVES AVAILABLE:
${(data.details.alternativeSuggestions || []).map(alt => `• ${alt}`).join('\n')}
` : ''}

Don't worry - RapidCare's network has many options. You can instantly search for alternative hospitals on our platform or contact our emergency support team for immediate assistance.

Emergency Support: ${data.details.supportContact?.phone || '+1-800-RAPIDCARE'} | ${data.details.supportContact?.email || 'emergency@rapidcare.com'}

When every second counts, we're here to help.

Best regards,
The RapidCare Team
Your Emergency Care Partner
        `.trim()
      },

      booking_completed: {
        subject: `RapidCare: Care Completed Successfully - ${data.booking.hospitalName}`,
        body: `
Dear ${data.recipient.name},

We're pleased to confirm that your emergency care has been successfully completed through RapidCare.

Care Summary:
- Hospital: ${data.booking.hospitalName}
- Service: ${data.booking.resourceType}
- Patient: ${data.booking.patientName}
- Completed: ${new Date(data.details.completedAt).toLocaleDateString()}

${data.details.notes ? `Medical Team Notes: ${data.details.notes}` : ''}

Important Follow-up Instructions:
${(data.details.followUpInstructions || []).join('\n')}

We hope you received excellent care during this critical time. Your feedback helps us improve RapidCare's network and assists other patients in emergency situations.

If you need any assistance with follow-up care or have questions about your treatment, please don't hesitate to contact us.

Wishing you a swift recovery,
The RapidCare Team
Emergency Care, Delivered Fast
        `.trim()
      },

      booking_cancelled: {
        subject: `RapidCare: Booking Cancelled - Immediate Rebooking Available`,
        body: `
Dear ${data.recipient.name},

We understand that cancellations during medical emergencies can be concerning. Your RapidCare booking has been cancelled, but we're here to help you find immediate alternatives.

Cancelled Booking Details:
- Hospital: ${data.booking.hospitalName}
- Resource: ${data.booking.resourceType}
- Patient: ${data.booking.patientName}
- Original Date: ${new Date(data.booking.scheduledDate).toLocaleDateString()}

Cancellation Reason: ${data.details.reason}
${data.details.notes ? 'Additional Information: ' + data.details.notes : ''}

${data.details.refundInfo ? 'Refund Processing: ' + data.details.refundInfo : ''}

${data.details.rebookingAllowed ? 'IMMEDIATE ACTION AVAILABLE: You can search and book alternative emergency care right now through RapidCare. Our network is ready to help when every second counts.' : ''}

For immediate assistance finding alternative care or if you have any questions, please contact our emergency support team.

We're committed to ensuring you get the care you need.

Best regards,
The RapidCare Team
When Every Second Counts
        `.trim()
      },

      payment_confirmed: {
        subject: `RapidCare: Payment Processed - Your Care is Secured`,
        body: `
Dear ${data.recipient.name},

Your payment has been successfully processed through RapidCare's secure system. Your emergency care booking is now fully confirmed and protected.

Payment Details:
- Transaction ID: ${data.transaction.transactionId}
- Amount Paid: $${data.transaction.amount.toFixed(2)}
- Payment Method: ${data.transaction.paymentMethod}
- Payment Date: ${new Date(data.transaction.processedAt).toLocaleDateString()}

Booking Details:
- Hospital: ${data.booking.hospitalName}
- Resource: ${data.booking.resourceType}
- Patient: ${data.booking.patientName}
- Scheduled Date: ${new Date(data.booking.scheduledDate).toLocaleDateString()}

Receipt Information:
- Receipt ID: ${data.details.receiptId}
- Service Charge: $${data.details.serviceCharge.toFixed(2)}
- Hospital Amount: $${data.details.hospitalAmount.toFixed(2)}

Your booking is now confirmed. Please arrive at the hospital 30 minutes before your scheduled time.

If you need to download your receipt or have any questions, please log into your account or contact our support team.

Thank you for trusting RapidCare with your emergency care needs.

Best regards,
The RapidCare Team
Fast Access to Critical Care
        `.trim()
      }
    };

    const template = templates[templateType];
    if (!template) {
      console.log('Template not found for type:', templateType);
      console.log('Available templates:', Object.keys(templates));
    }
    
    return template || {
      subject: 'Important Update from RapidCare',
      body: 'You have a new notification regarding your emergency care. Please check your RapidCare account for details.'
    };
  }

  /**
   * Generate SMS template
   * @param {string} templateType - Template type
   * @param {Object} data - Template data
   * @returns {Object} SMS content
   */
  static generateSMSTemplate(templateType, data) {
    const templates = {
      booking_approved: {
        message: `RapidCare CONFIRMED: Your emergency care at ${data.booking.hospitalName} for ${data.booking.resourceType} on ${new Date(data.booking.scheduledDate).toLocaleDateString()} is confirmed. Arrive 30 min early with ID. Emergency Care, Delivered Fast.`
      },

      booking_declined: {
        message: `RapidCare ALERT: ${data.booking.hospitalName} unavailable. Reason: ${data.details?.reason || 'Not specified'}. IMMEDIATE alternatives available - check email or call emergency support. When Every Second Counts.`
      },

      booking_completed: {
        message: `RapidCare SUCCESS: Your emergency care at ${data.booking.hospitalName} is complete. Check email for follow-up instructions. Wishing you swift recovery. - RapidCare Team`
      },

      booking_cancelled: {
        message: `RapidCare CANCELLED: ${data.booking.hospitalName} booking cancelled. Reason: ${data.details?.reason || 'Not specified'}. Search alternatives NOW on RapidCare. Emergency support available 24/7.`
      },

      payment_confirmed: {
        message: `RapidCare SECURED: $${data.transaction.amount.toFixed(2)} processed. Your care at ${data.booking.hospitalName} is confirmed for ${new Date(data.booking.scheduledDate).toLocaleDateString()}. ID: ${data.transaction.transactionId}. Fast Access to Critical Care.`
      }
    };

    return templates[templateType] || {
      message: 'RapidCare ALERT: You have a new notification regarding your emergency care. Check your account immediately.'
    };
  }

  // Helper methods

  /**
   * Get approval next steps based on resource type
   * @param {string} resourceType - Resource type
   * @returns {Array} Next steps
   */
  static getApprovalNextSteps(resourceType) {
    const steps = {
      beds: [
        '1. Arrive at the hospital 30 minutes before your scheduled time',
        '2. Bring valid ID and insurance documents',
        '3. Complete admission paperwork at the reception',
        '4. Follow hospital guidelines for visitors'
      ],
      icu: [
        '1. Arrive at the hospital immediately or at scheduled time',
        '2. Bring all medical records and current medications list',
        '3. Complete ICU admission forms',
        '4. Prepare for restricted visiting hours',
        '5. Ensure emergency contact availability'
      ],
      operationTheatres: [
        '1. Follow pre-operative instructions provided by the hospital',
        '2. Arrive at the specified time for pre-op preparation',
        '3. Bring all required medical documents and test results',
        '4. Arrange for post-operative care and transportation',
        '5. Ensure fasting requirements are met if applicable'
      ]
    };

    return steps[resourceType] || [
      '1. Contact the hospital for specific instructions',
      '2. Arrive at the scheduled time',
      '3. Bring necessary documents and identification'
    ];
  }

  /**
   * Get follow-up instructions based on resource type
   * @param {string} resourceType - Resource type
   * @returns {Array} Follow-up instructions
   */
  static getFollowUpInstructions(resourceType) {
    const instructions = {
      beds: [
        '1. Follow discharge instructions provided by medical staff',
        '2. Schedule follow-up appointments as recommended',
        '3. Take prescribed medications as directed',
        '4. Contact hospital if you experience any complications'
      ],
      icu: [
        '1. Continue monitoring as advised by ICU team',
        '2. Follow all post-ICU care instructions',
        '3. Attend all scheduled follow-up appointments',
        '4. Keep emergency contact information updated',
        '5. Report any concerning symptoms immediately'
      ],
      operationTheatres: [
        '1. Follow post-operative care instructions carefully',
        '2. Take prescribed medications and pain management',
        '3. Attend all follow-up surgical appointments',
        '4. Monitor surgical site for signs of infection',
        '5. Gradually resume activities as advised by surgeon'
      ]
    };

    return instructions[resourceType] || [
      '1. Follow all medical advice provided',
      '2. Schedule follow-up appointments as needed',
      '3. Contact healthcare provider with any concerns'
    ];
  }

  /**
   * Get support contact information
   * @returns {Object} Support contact details
   */
  static getSupportContactInfo() {
    return {
      phone: '+1-800-RAPIDCARE',
      email: 'emergency@rapidcare.com',
      hours: '24/7 Emergency Support - When Every Second Counts'
    };
  }

  /**
   * Find alternative hospitals for declined bookings
   * @param {string} resourceType - Resource type
   * @param {number} quantity - Required quantity
   * @returns {Array} Alternative hospital suggestions
   */
  static async findAlternativeHospitals(resourceType, quantity) {
    try {
      const stmt = db.prepare(`
        SELECT h.name, 
               COALESCE(h.street || ', ' || h.city, h.street, h.city, 'Address not available') as address,
               h.phone,
               CASE 
                 WHEN ? = 'beds' THEN h.total_beds
                 WHEN ? = 'icu' THEN h.icu_beds
                 WHEN ? = 'operationTheatres' THEN h.operation_theatres
                 ELSE 0
               END as available_resources
        FROM hospitals h
        WHERE CASE 
                WHEN ? = 'beds' THEN h.total_beds >= ?
                WHEN ? = 'icu' THEN h.icu_beds >= ?
                WHEN ? = 'operationTheatres' THEN h.operation_theatres >= ?
                ELSE 0
              END
        ORDER BY available_resources DESC
        LIMIT 3
      `);

      const alternatives = stmt.all(
        resourceType, resourceType, resourceType,
        resourceType, quantity,
        resourceType, quantity,
        resourceType, quantity
      );

      return alternatives.map(hospital => 
        `${hospital.name} - ${hospital.address} (${hospital.phone})`
      );

    } catch (error) {
      console.error('Error finding alternative hospitals:', error);
      return [];
    }
  }

  /**
   * Get unread notification count for a user
   * @param {number} userId - User ID
   * @returns {Object} Count result
   */
  static getUnreadNotificationCount(userId) {
    try {
      const stmt = db.prepare(`
        SELECT COUNT(*) as count
        FROM notification_queue 
        WHERE recipientId = ? 
        AND status IN ('queued', 'processing')
      `);
      
      const result = stmt.get(userId);
      
      return {
        success: true,
        count: result.count || 0
      };
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return {
        success: false,
        message: 'Failed to get unread notification count',
        error: error
      };
    }
  }

  /**
   * Get notification history for a user
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @param {string} options.type - Notification type filter
   * @param {string} options.status - Status filter
   * @param {number} options.limit - Limit number of results
   * @returns {Object} History result
   */
  static getNotificationHistory(userId, options = {}) {
    try {
      const { type, status, limit = 20 } = options;
      
      let query = `
        SELECT 
          id,
          type,
          channel,
          priority,
          content,
          status,
          retryCount,
          scheduledAt,
          createdAt,
          updatedAt,
          lastError
        FROM notification_queue 
        WHERE recipientId = ?
      `;
      
      const params = [userId];
      
      if (type) {
        query += ' AND type = ?';
        params.push(type);
      }
      
      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY createdAt DESC LIMIT ?';
      params.push(limit);
      
      const stmt = db.prepare(query);
      const notifications = stmt.all(...params);
      
      // Parse content JSON for each notification
      const parsedNotifications = notifications.map(notification => ({
        ...notification,
        content: JSON.parse(notification.content || '{}')
      }));
      
      return {
        success: true,
        data: parsedNotifications
      };
    } catch (error) {
      console.error('Error getting notification history:', error);
      return {
        success: false,
        message: 'Failed to get notification history',
        error: error
      };
    }
  }
}

module.exports = NotificationService;