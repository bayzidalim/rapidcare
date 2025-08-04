const { expect } = require('chai');
const NotificationService = require('../../services/notificationService');
const User = require('../../models/User');
const Booking = require('../../models/Booking');
const db = require('../../config/database');

describe('NotificationService', () => {
  let testUserId;
  let testBookingId;
  let testHospitalId;

  beforeEach(() => {
    // Clean up all test data first (in correct order for foreign keys)
    try {
      db.exec('PRAGMA foreign_keys = OFF');
      db.exec('DELETE FROM notification_delivery_log');
      db.exec('DELETE FROM notification_queue');
      db.exec('DELETE FROM bookings');
      db.exec('DELETE FROM hospitals');
      db.exec('DELETE FROM users');
      db.exec('PRAGMA foreign_keys = ON');
    } catch (error) {
      console.warn('Test setup cleanup warning:', error.message);
    }
    
    // Create test user with unique email
    const uniqueEmail = `test${Date.now()}@example.com`;
    testUserId = User.create({
      email: uniqueEmail,
      password: 'hashedpassword',
      name: 'Test Patient',
      phone: '+1234567890',
      userType: 'user'
    });

    // Create test hospital
    const hospitalStmt = db.prepare(`
      INSERT INTO hospitals (name, street, city, phone, email, isActive)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    testHospitalId = hospitalStmt.run(
      'Test Hospital',
      '123 Test St',
      'Test City',
      '+1234567890',
      'hospital@test.com',
      1
    ).lastInsertRowid;

    // Create test booking
    testBookingId = Booking.create({
      userId: testUserId,
      hospitalId: testHospitalId,
      resourceType: 'beds',
      patientName: 'Test Patient',
      patientAge: 30,
      patientGender: 'male',
      emergencyContactName: 'Emergency Contact',
      emergencyContactPhone: '+1234567890',
      emergencyContactRelationship: 'spouse',
      medicalCondition: 'Test condition',
      urgency: 'medium',
      scheduledDate: new Date().toISOString(),
      estimatedDuration: 24,
      paymentAmount: 1000
    });
  });

  afterEach(() => {
    // Clean up test data (disable foreign keys temporarily for cleanup)
    try {
      db.exec('PRAGMA foreign_keys = OFF');
      db.exec('DELETE FROM notification_delivery_log');
      db.exec('DELETE FROM notification_queue');
      db.exec('DELETE FROM bookings');
      db.exec('DELETE FROM hospitals');
      db.exec('DELETE FROM users');
      db.exec('PRAGMA foreign_keys = ON');
    } catch (error) {
      // Ignore cleanup errors in tests
      console.warn('Test cleanup warning:', error.message);
    }
  });

  describe('sendBookingApprovalNotification', () => {
    it('should successfully queue approval notifications', async () => {
      const approvalDetails = {
        hospitalName: 'Test Hospital',
        resourceType: 'beds',
        scheduledDate: new Date().toISOString(),
        notes: 'Approved with priority'
      };

      const result = await NotificationService.sendBookingApprovalNotification(
        testBookingId,
        testUserId,
        approvalDetails
      );

      if (!result.success) {
        console.log('Approval notification error:', result.message, result.error);
      }
      expect(result.success).to.be.true;
      expect(result.data).to.have.property('emailNotificationId');
      expect(result.data).to.have.property('smsNotificationId');
      expect(result.data.bookingId).to.equal(testBookingId);
      expect(result.data.patientId).to.equal(testUserId);

      // Verify notifications were queued
      const queuedNotifications = db.prepare(
        'SELECT * FROM notification_queue WHERE recipientId = ?'
      ).all(testUserId);

      expect(queuedNotifications).to.have.length(2);
      expect(queuedNotifications.some(n => n.channel === 'email')).to.be.true;
      expect(queuedNotifications.some(n => n.channel === 'sms')).to.be.true;
      expect(queuedNotifications.every(n => n.type === 'booking_approved')).to.be.true;
      expect(queuedNotifications.every(n => n.status === 'queued')).to.be.true;
    });

    it('should handle invalid patient ID', async () => {
      const result = await NotificationService.sendBookingApprovalNotification(
        testBookingId,
        99999, // Invalid user ID
        { hospitalName: 'Test Hospital' }
      );

      expect(result.success).to.be.false;
      expect(result.message).to.include('Patient not found');
    });

    it('should handle invalid booking ID', async () => {
      const result = await NotificationService.sendBookingApprovalNotification(
        99999, // Invalid booking ID
        testUserId,
        { hospitalName: 'Test Hospital' }
      );

      expect(result.success).to.be.false;
      expect(result.message).to.include('Booking not found');
    });
  });

  describe('sendBookingDeclineNotification', () => {
    it('should successfully queue decline notifications', async () => {
      const declineDetails = {
        hospitalName: 'Test Hospital',
        reason: 'Resource unavailable',
        notes: 'Please try alternative hospitals',
        alternativeSuggestions: ['Hospital A', 'Hospital B']
      };

      const result = await NotificationService.sendBookingDeclineNotification(
        testBookingId,
        testUserId,
        declineDetails
      );

      expect(result.success).to.be.true;
      expect(result.data).to.have.property('emailNotificationId');
      expect(result.data).to.have.property('smsNotificationId');
      expect(result.data.alternativesProvided).to.equal(2);

      // Verify notifications were queued
      const queuedNotifications = db.prepare(
        'SELECT * FROM notification_queue WHERE recipientId = ? AND type = ?'
      ).all(testUserId, 'booking_declined');

      expect(queuedNotifications).to.have.length(2);
      expect(queuedNotifications.every(n => n.priority === 'high')).to.be.true;
    });

    it('should find alternative hospitals when not provided', async () => {
      // Create additional hospitals with available resources
      const hospitalStmt = db.prepare(`
        INSERT INTO hospitals (name, street, city, phone, email, isActive, total_beds, approval_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const timestamp = Date.now();
      hospitalStmt.run(`Alternative Hospital 1 ${timestamp}`, '456 Alt St', 'Alt City 1', '+1111111111', `alt1${timestamp}@test.com`, 1, 5, 'approved');
      hospitalStmt.run(`Alternative Hospital 2 ${timestamp}`, '789 Alt St', 'Alt City 2', '+2222222222', `alt2${timestamp}@test.com`, 1, 3, 'approved');

      const declineDetails = {
        hospitalName: 'Test Hospital',
        reason: 'Resource unavailable',
        notes: 'Please try alternative hospitals'
        // No alternativeSuggestions provided
      };

      const result = await NotificationService.sendBookingDeclineNotification(
        testBookingId,
        testUserId,
        declineDetails
      );

      expect(result.success).to.be.true;
      expect(result.data.alternativesProvided).to.be.greaterThan(0);
    });
  });

  describe('sendBookingCompletionNotification', () => {
    it('should successfully queue completion notifications', async () => {
      const completionDetails = {
        hospitalName: 'Test Hospital',
        notes: 'Treatment completed successfully'
      };

      const result = await NotificationService.sendBookingCompletionNotification(
        testBookingId,
        testUserId,
        completionDetails
      );

      expect(result.success).to.be.true;
      expect(result.data).to.have.property('emailNotificationId');
      expect(result.data).to.have.property('smsNotificationId');

      // Verify notifications were queued with medium priority
      const queuedNotifications = db.prepare(
        'SELECT * FROM notification_queue WHERE recipientId = ? AND type = ?'
      ).all(testUserId, 'booking_completed');

      expect(queuedNotifications).to.have.length(2);
      expect(queuedNotifications.every(n => n.priority === 'medium')).to.be.true;
    });
  });

  describe('sendBookingCancellationNotification', () => {
    it('should successfully queue cancellation notifications', async () => {
      const cancellationDetails = {
        hospitalName: 'Test Hospital',
        reason: 'Patient request',
        notes: 'Cancelled by patient',
        refundInfo: 'Refund will be processed in 3-5 business days'
      };

      const result = await NotificationService.sendBookingCancellationNotification(
        testBookingId,
        testUserId,
        cancellationDetails
      );

      expect(result.success).to.be.true;
      expect(result.data).to.have.property('emailNotificationId');
      expect(result.data).to.have.property('smsNotificationId');

      // Verify notifications were queued
      const queuedNotifications = db.prepare(
        'SELECT * FROM notification_queue WHERE recipientId = ? AND type = ?'
      ).all(testUserId, 'booking_cancelled');

      expect(queuedNotifications).to.have.length(2);
      expect(queuedNotifications.every(n => n.priority === 'high')).to.be.true;
    });
  });

  describe('queueNotification', () => {
    it('should successfully queue a notification', async () => {
      const notificationData = {
        recipient: {
          id: testUserId,
          name: 'Test Patient',
          email: 'test@example.com',
          phone: '+1234567890'
        },
        type: 'booking_approved',
        channel: 'email',
        priority: 'high',
        content: {
          subject: 'Test Subject',
          body: 'Test Body'
        },
        booking: { id: testBookingId },
        details: { test: 'data' }
      };

      const result = await NotificationService.queueNotification(notificationData);

      expect(result.success).to.be.true;
      expect(result).to.have.property('notificationId');
      expect(result).to.have.property('queuedAt');

      // Verify notification was inserted
      const notification = db.prepare(
        'SELECT * FROM notification_queue WHERE id = ?'
      ).get(result.notificationId);

      expect(notification).to.not.be.undefined;
      expect(notification.recipientId).to.equal(testUserId);
      expect(notification.type).to.equal('booking_approved');
      expect(notification.channel).to.equal('email');
      expect(notification.priority).to.equal('high');
      expect(notification.status).to.equal('queued');
    });
  });

  describe('processNotificationQueue', () => {
    beforeEach(async () => {
      // Queue some test notifications
      const result1 = await NotificationService.queueNotification({
        recipient: { id: testUserId },
        type: 'booking_approved',
        channel: 'email',
        priority: 'high',
        content: { subject: 'Test', body: 'Test' },
        booking: { id: testBookingId },
        details: {},
        scheduledAt: new Date().toISOString() // Schedule immediately
      });

      const result2 = await NotificationService.queueNotification({
        recipient: { id: testUserId },
        type: 'booking_approved',
        channel: 'sms',
        priority: 'medium',
        content: { message: 'Test SMS' },
        booking: { id: testBookingId },
        details: {},
        scheduledAt: new Date().toISOString() // Schedule immediately
      });


    });

    it('should process queued notifications', async () => {
      const result = await NotificationService.processNotificationQueue({ limit: 10 });


      expect(result.success).to.be.true;
      expect(result.data.processedCount).to.equal(2);
      expect(result.data.results).to.have.length(2);

      // Verify notifications were processed
      const processedNotifications = db.prepare(
        'SELECT * FROM notification_queue WHERE status = ?'
      ).all('delivered');

      expect(processedNotifications).to.have.length(2);
    });

    it('should process notifications by priority', async () => {
      const result = await NotificationService.processNotificationQueue({ 
        priority: 'high',
        limit: 10 
      });

      expect(result.success).to.be.true;
      expect(result.data.processedCount).to.equal(1);

      // Verify only high priority notification was processed
      const highPriorityProcessed = db.prepare(
        'SELECT * FROM notification_queue WHERE priority = ? AND status = ?'
      ).all('high', 'delivered');

      expect(highPriorityProcessed).to.have.length(1);

      const mediumPriorityQueued = db.prepare(
        'SELECT * FROM notification_queue WHERE priority = ? AND status = ?'
      ).all('medium', 'queued');

      expect(mediumPriorityQueued).to.have.length(1);
    });

    it('should limit number of processed notifications', async () => {
      const result = await NotificationService.processNotificationQueue({ limit: 1 });

      expect(result.success).to.be.true;
      expect(result.data.processedCount).to.equal(1);

      // Verify only one notification was processed
      const processedNotifications = db.prepare(
        'SELECT * FROM notification_queue WHERE status = ?'
      ).all('delivered');

      expect(processedNotifications).to.have.length(1);

      const queuedNotifications = db.prepare(
        'SELECT * FROM notification_queue WHERE status = ?'
      ).all('queued');

      expect(queuedNotifications).to.have.length(1);
    });
  });

  describe('deliverNotification', () => {
    let testNotification;

    beforeEach(async () => {
      // Create a test notification
      const queueResult = await NotificationService.queueNotification({
        recipient: {
          id: testUserId,
          name: 'Test Patient',
          email: 'test@example.com',
          phone: '+1234567890'
        },
        type: 'booking_approved',
        channel: 'email',
        priority: 'high',
        content: {
          subject: 'Test Subject',
          body: 'Test Body'
        },
        booking: { id: testBookingId },
        details: {}
      });

      testNotification = db.prepare(
        'SELECT * FROM notification_queue WHERE id = ?'
      ).get(queueResult.notificationId);
    });

    it('should successfully deliver email notification', async () => {
      const result = await NotificationService.deliverNotification(testNotification);

      expect(result.success).to.be.true;
      expect(result.message).to.include('Email delivered successfully');

      // Verify notification status was updated
      const updatedNotification = db.prepare(
        'SELECT * FROM notification_queue WHERE id = ?'
      ).get(testNotification.id);

      expect(updatedNotification.status).to.equal('delivered');

      // Verify delivery was logged
      const deliveryLog = db.prepare(
        'SELECT * FROM notification_delivery_log WHERE notificationId = ?'
      ).get(testNotification.id);

      expect(deliveryLog).to.not.be.undefined;
      expect(deliveryLog.channel).to.equal('email');
    });

    it('should successfully deliver SMS notification', async () => {
      // Update notification to SMS channel
      db.prepare('UPDATE notification_queue SET channel = ? WHERE id = ?')
        .run('sms', testNotification.id);

      testNotification.channel = 'sms';

      const result = await NotificationService.deliverNotification(testNotification);

      expect(result.success).to.be.true;
      expect(result.message).to.include('SMS delivered successfully');

      // Verify delivery was logged
      const deliveryLog = db.prepare(
        'SELECT * FROM notification_delivery_log WHERE notificationId = ?'
      ).get(testNotification.id);

      expect(deliveryLog).to.not.be.undefined;
      expect(deliveryLog.channel).to.equal('sms');
    });

    it('should handle unsupported channel', async () => {
      // Update notification to unsupported channel
      db.prepare('UPDATE notification_queue SET channel = ? WHERE id = ?')
        .run('push', testNotification.id);

      testNotification.channel = 'push';

      const result = await NotificationService.deliverNotification(testNotification);

      expect(result.success).to.be.false;
      expect(result.message).to.include('Unsupported notification channel');

      // Verify notification status was updated to failed
      const updatedNotification = db.prepare(
        'SELECT * FROM notification_queue WHERE id = ?'
      ).get(testNotification.id);

      expect(updatedNotification.status).to.equal('failed');
    });
  });

  describe('Template Generation', () => {
    describe('generateEmailTemplate', () => {
      it('should generate booking approval email template', () => {
        const data = {
          recipient: { name: 'John Doe' },
          booking: {
            hospitalName: 'Test Hospital',
            resourceType: 'beds',
            patientName: 'John Doe',
            scheduledDate: '2024-01-15T10:00:00Z',
            resourcesAllocated: 1
          },
          details: {
            notes: 'Priority booking',
            nextSteps: ['Step 1', 'Step 2']
          }
        };

        const template = NotificationService.generateEmailTemplate('booking_approved', data);

        expect(template).to.have.property('subject');
        expect(template).to.have.property('body');
        expect(template.subject).to.include('Test Hospital');
        expect(template.body).to.include('John Doe');
        expect(template.body).to.include('beds');
        expect(template.body).to.include('Priority booking');
      });

      it('should generate booking decline email template', () => {
        const data = {
          recipient: { name: 'John Doe' },
          booking: {
            hospitalName: 'Test Hospital',
            resourceType: 'icu',
            patientName: 'John Doe',
            scheduledDate: '2024-01-15T10:00:00Z'
          },
          details: {
            reason: 'Resource unavailable',
            notes: 'Try alternative hospitals',
            alternativeSuggestions: ['Hospital A', 'Hospital B'],
            supportContact: { phone: '123-456-7890', email: 'support@test.com' }
          }
        };

        const template = NotificationService.generateEmailTemplate('booking_declined', data);

        expect(template.subject).to.include('Test Hospital');
        expect(template.body).to.include('Resource unavailable');
        expect(template.body).to.include('Hospital A');
        expect(template.body).to.include('support@test.com');
      });
    });

    describe('generateSMSTemplate', () => {
      it('should generate booking approval SMS template', () => {
        const data = {
          booking: {
            hospitalName: 'Test Hospital',
            resourceType: 'beds',
            scheduledDate: '2024-01-15T10:00:00Z'
          }
        };

        const template = NotificationService.generateSMSTemplate('booking_approved', data);

        expect(template).to.have.property('message');
        expect(template.message).to.include('APPROVED');
        expect(template.message).to.include('Test Hospital');
        expect(template.message).to.include('beds');
      });

      it('should generate booking decline SMS template', () => {
        const data = {
          booking: { hospitalName: 'Test Hospital' },
          details: { reason: 'Resource unavailable' }
        };

        const template = NotificationService.generateSMSTemplate('booking_declined', data);

        expect(template.message).to.include('DECLINED');
        expect(template.message).to.include('Resource unavailable');
      });
    });
  });

  describe('Helper Methods', () => {
    describe('getApprovalNextSteps', () => {
      it('should return correct steps for beds', () => {
        const steps = NotificationService.getApprovalNextSteps('beds');
        expect(steps).to.be.an('array');
        expect(steps.length).to.be.greaterThan(0);
        expect(steps[0]).to.include('30 minutes');
      });

      it('should return correct steps for ICU', () => {
        const steps = NotificationService.getApprovalNextSteps('icu');
        expect(steps).to.be.an('array');
        expect(steps.some(step => step.includes('medical records'))).to.be.true;
      });

      it('should return correct steps for operation theatres', () => {
        const steps = NotificationService.getApprovalNextSteps('operationTheatres');
        expect(steps).to.be.an('array');
        expect(steps.some(step => step.includes('pre-operative'))).to.be.true;
      });

      it('should return default steps for unknown resource type', () => {
        const steps = NotificationService.getApprovalNextSteps('unknown');
        expect(steps).to.be.an('array');
        expect(steps.length).to.be.greaterThan(0);
      });
    });

    describe('getFollowUpInstructions', () => {
      it('should return correct instructions for each resource type', () => {
        const bedInstructions = NotificationService.getFollowUpInstructions('beds');
        const icuInstructions = NotificationService.getFollowUpInstructions('icu');
        const otInstructions = NotificationService.getFollowUpInstructions('operationTheatres');

        expect(bedInstructions).to.be.an('array');
        expect(icuInstructions).to.be.an('array');
        expect(otInstructions).to.be.an('array');

        expect(icuInstructions.some(inst => inst.includes('ICU'))).to.be.true;
        expect(otInstructions.some(inst => inst.includes('surgical'))).to.be.true;
      });
    });

    describe('getSupportContactInfo', () => {
      it('should return support contact information', () => {
        const contact = NotificationService.getSupportContactInfo();
        expect(contact).to.have.property('phone');
        expect(contact).to.have.property('email');
        expect(contact).to.have.property('hours');
      });
    });
  });

  describe('Statistics and History', () => {
    beforeEach(async () => {
      // Create some test notifications
      await NotificationService.queueNotification({
        recipient: { id: testUserId },
        type: 'booking_approved',
        channel: 'email',
        priority: 'high',
        content: { subject: 'Test', body: 'Test' },
        booking: { id: testBookingId },
        details: {}
      });

      // Process the notification to create delivery log
      await NotificationService.processNotificationQueue({ limit: 1 });
    });

    describe('getNotificationStatistics', () => {
      it('should return notification statistics', () => {
        const result = NotificationService.getNotificationStatistics();

        expect(result.success).to.be.true;
        expect(result.data).to.be.an('array');
        expect(result.data.length).to.be.greaterThan(0);
        expect(result.data[0]).to.have.property('status');
        expect(result.data[0]).to.have.property('channel');
        expect(result.data[0]).to.have.property('count');
      });

      it('should filter statistics by date range', () => {
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        const result = NotificationService.getNotificationStatistics({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });

        expect(result.success).to.be.true;
        expect(result.data).to.be.an('array');
      });
    });

    describe('getNotificationHistory', () => {
      it('should return notification history for user', () => {
        const result = NotificationService.getNotificationHistory(testUserId);

        expect(result.success).to.be.true;
        expect(result.data).to.be.an('array');
        expect(result.data.length).to.be.greaterThan(0);
        expect(result.data[0]).to.have.property('recipientId');
        expect(result.data[0].recipientId).to.equal(testUserId);
      });

      it('should filter history by type', () => {
        const result = NotificationService.getNotificationHistory(testUserId, {
          type: 'booking_approved'
        });

        expect(result.success).to.be.true;
        expect(result.data).to.be.an('array');
        if (result.data.length > 0) {
          expect(result.data.every(n => n.type === 'booking_approved')).to.be.true;
        }
      });

      it('should limit history results', () => {
        const result = NotificationService.getNotificationHistory(testUserId, {
          limit: 1
        });

        expect(result.success).to.be.true;
        expect(result.data).to.be.an('array');
        expect(result.data.length).to.be.at.most(1);
      });
    });
  });
});