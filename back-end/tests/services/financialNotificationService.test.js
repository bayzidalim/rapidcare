const { expect } = require('chai');
const db = require('../../config/database');
const NotificationService = require('../../services/notificationService');
const Transaction = require('../../models/Transaction');
const User = require('../../models/User');
const Booking = require('../../models/Booking');
const Hospital = require('../../models/Hospital');
const UserBalance = require('../../models/UserBalance');

describe('Financial Notification Service', () => {
  let testUserId, testHospitalId, testBookingId, testTransactionId;
  let testAdminId, testAuthorityId;

  beforeEach(async () => {
    // Clean up database
    try {
      db.exec('PRAGMA foreign_keys = OFF');
      db.exec('DELETE FROM notification_delivery_log');
      db.exec('DELETE FROM notification_queue');
      db.exec('DELETE FROM balance_transactions');
      db.exec('DELETE FROM user_balances');
      db.exec('DELETE FROM transactions');
      db.exec('DELETE FROM bookings');
      db.exec('DELETE FROM hospitals');
      db.exec('DELETE FROM users');
      db.exec('PRAGMA foreign_keys = ON');
    } catch (error) {
      console.error('Cleanup error:', error);
    }

    // Create test data
    testUserId = User.create({
      name: 'Test Patient',
      email: 'patient@test.com',
      phone: '+1234567890',
      password: 'hashedpassword',
      userType: 'user'
    });

    testAdminId = User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      phone: '+1234567891',
      password: 'hashedpassword',
      userType: 'admin'
    });

    testHospitalId = Hospital.create({
      name: 'Test Hospital',
      street: '123 Test St',
      city: 'Test City',
      state: 'Test State',
      zipCode: '12345',
      country: 'Test Country',
      phone: '+1234567892',
      email: 'hospital@test.com',
      emergency: '+1234567892'
    });

    testAuthorityId = User.create({
      name: 'Test Authority',
      email: 'authority@test.com',
      phone: '+1234567893',
      password: 'hashedpassword',
      userType: 'hospital-authority',
      hospital_id: testHospitalId
    });

    testBookingId = Booking.create({
      userId: testUserId,
      hospitalId: testHospitalId,
      resourceType: 'beds',
      patientName: 'Test Patient',
      patientAge: 30,
      patientGender: 'male',
      emergencyContactName: 'Emergency Contact',
      emergencyContactPhone: '+1234567891',
      emergencyContactRelationship: 'spouse',
      medicalCondition: 'None',
      urgency: 'medium',
      surgeonId: null,
      scheduledDate: new Date().toISOString(),
      estimatedDuration: 24,
      paymentAmount: 500.00
    });

    testTransactionId = Transaction.create({
      bookingId: testBookingId,
      userId: testUserId,
      hospitalId: testHospitalId,
      amount: 500.00,
      serviceCharge: 25.00,
      hospitalAmount: 475.00,
      paymentMethod: 'credit_card',
      transactionId: 'TXN_TEST_123',
      status: 'completed',
      processedAt: new Date().toISOString()
    }).id;

    // Create user balances
    UserBalance.create({
      userId: testAuthorityId,
      userType: 'hospital-authority',
      hospitalId: testHospitalId,
      currentBalance: 1000.00,
      totalEarnings: 1000.00
    });

    UserBalance.create({
      userId: testAdminId,
      userType: 'admin',
      currentBalance: 500.00,
      totalEarnings: 500.00
    });
  });

  afterEach(() => {
    // Clean up after each test
    try {
      db.exec('PRAGMA foreign_keys = OFF');
      db.exec('DELETE FROM notification_delivery_log');
      db.exec('DELETE FROM notification_queue');
      db.exec('DELETE FROM balance_transactions');
      db.exec('DELETE FROM user_balances');
      db.exec('DELETE FROM transactions');
      db.exec('DELETE FROM bookings');
      db.exec('DELETE FROM hospitals');
      db.exec('DELETE FROM users');
      db.exec('PRAGMA foreign_keys = ON');
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('sendPaymentConfirmationNotification', () => {
    it('should successfully queue payment confirmation notifications', async () => {
      const result = await NotificationService.sendPaymentConfirmationNotification(
        testTransactionId,
        testUserId,
        {
          hospitalName: 'Test Hospital',
          paymentMethod: 'credit_card'
        }
      );


      expect(result.success).to.be.true;
      expect(result.message).to.equal('Payment confirmation notifications queued successfully');
      expect(result.data.emailNotificationId).to.be.a('number');
      expect(result.data.smsNotificationId).to.be.a('number');

      // Verify notifications were queued
      const queuedNotifications = db.prepare(
        'SELECT * FROM notification_queue WHERE recipientId = ? AND type = ?'
      ).all(testUserId, 'payment_confirmed');

      expect(queuedNotifications).to.have.length(2); // Email and SMS
      expect(queuedNotifications[0].priority).to.equal('high');
    });

    it('should handle invalid transaction ID', async () => {
      const result = await NotificationService.sendPaymentConfirmationNotification(
        99999,
        testUserId,
        { hospitalName: 'Test Hospital' }
      );

      expect(result.success).to.be.false;
      expect(result.message).to.equal('Transaction not found');
    });

    it('should handle invalid user ID', async () => {
      const result = await NotificationService.sendPaymentConfirmationNotification(
        testTransactionId,
        99999,
        { hospitalName: 'Test Hospital' }
      );

      expect(result.success).to.be.false;
      expect(result.message).to.equal('User not found');
    });
  });

  describe('sendRevenueNotification', () => {
    it('should successfully queue revenue notifications', async () => {
      const result = await NotificationService.sendRevenueNotification(
        testHospitalId,
        testAuthorityId,
        {
          hospitalName: 'Test Hospital',
          amount: 475.00,
          transactionId: 'TXN_TEST_123',
          bookingId: testBookingId,
          resourceType: 'beds',
          patientName: 'Test Patient',
          serviceCharge: 25.00,
          totalAmount: 500.00,
          currentBalance: 1475.00
        }
      );

      expect(result.success).to.be.true;
      expect(result.message).to.equal('Revenue notifications queued successfully');
      expect(result.data.emailNotificationId).to.be.a('number');
      expect(result.data.smsNotificationId).to.be.a('number');

      // Verify notifications were queued
      const queuedNotifications = db.prepare(
        'SELECT * FROM notification_queue WHERE recipientId = ? AND type = ?'
      ).all(testAuthorityId, 'revenue_received');

      expect(queuedNotifications).to.have.length(2); // Email and SMS
      expect(queuedNotifications[0].priority).to.equal('medium');
    });

    it('should handle invalid hospital authority ID', async () => {
      const result = await NotificationService.sendRevenueNotification(
        testHospitalId,
        99999,
        {
          hospitalName: 'Test Hospital',
          amount: 475.00,
          transactionId: 'TXN_TEST_123'
        }
      );

      expect(result.success).to.be.false;
      expect(result.message).to.equal('Hospital authority not found');
    });
  });

  describe('sendFinancialAnomalyAlert', () => {
    it('should successfully queue financial anomaly alerts for all admins', async () => {
      const result = await NotificationService.sendFinancialAnomalyAlert({
        type: 'Large Transaction Amount',
        severity: 'high',
        description: 'Transaction amount exceeds normal threshold',
        affectedTransactions: ['TXN_TEST_123'],
        hospitalId: testHospitalId,
        hospitalName: 'Test Hospital',
        amount: 10000.00,
        discrepancy: 0,
        recommendedAction: 'Review transaction details'
      });

      expect(result.success).to.be.true;
      expect(result.message).to.equal('Financial anomaly alerts queued successfully');
      expect(result.data.alertsSent).to.equal(1); // One admin user
      expect(result.data.results).to.have.length(1);

      // Verify notifications were queued with urgent priority
      const queuedNotifications = db.prepare(
        'SELECT * FROM notification_queue WHERE recipientId = ? AND type = ?'
      ).all(testAdminId, 'financial_anomaly');

      expect(queuedNotifications).to.have.length(2); // Email and SMS
      expect(queuedNotifications[0].priority).to.equal('urgent');
    });

    it('should handle case when no admin users exist', async () => {
      // Delete admin user
      db.prepare('DELETE FROM users WHERE userType = ?').run('admin');

      const result = await NotificationService.sendFinancialAnomalyAlert({
        type: 'Test Anomaly',
        severity: 'high',
        description: 'Test description',
        recommendedAction: 'Test action'
      });

      expect(result.success).to.be.false;
      expect(result.message).to.equal('No admin users found');
    });
  });

  describe('sendBalanceThresholdNotification', () => {
    it('should successfully queue balance threshold notifications', async () => {
      const result = await NotificationService.sendBalanceThresholdNotification(
        testAuthorityId,
        {
          currentBalance: 50.00,
          threshold: 100.00,
          hospitalId: testHospitalId,
          hospitalName: 'Test Hospital'
        }
      );

      expect(result.success).to.be.true;
      expect(result.message).to.equal('Balance threshold notifications queued successfully');
      expect(result.data.emailNotificationId).to.be.a('number');
      expect(result.data.smsNotificationId).to.be.a('number');

      // Verify notifications were queued
      const queuedNotifications = db.prepare(
        'SELECT * FROM notification_queue WHERE recipientId = ? AND type = ?'
      ).all(testAuthorityId, 'balance_threshold');

      expect(queuedNotifications).to.have.length(2); // Email and SMS
      expect(queuedNotifications[0].priority).to.equal('high');
    });

    it('should use urgent priority for negative balance', async () => {
      const result = await NotificationService.sendBalanceThresholdNotification(
        testAuthorityId,
        {
          currentBalance: -50.00,
          threshold: 100.00,
          hospitalId: testHospitalId,
          hospitalName: 'Test Hospital'
        }
      );

      expect(result.success).to.be.true;

      // Verify urgent priority for negative balance
      const queuedNotifications = db.prepare(
        'SELECT * FROM notification_queue WHERE recipientId = ? AND type = ?'
      ).all(testAuthorityId, 'balance_threshold');

      expect(queuedNotifications[0].priority).to.equal('urgent');
    });

    it('should handle invalid user ID', async () => {
      const result = await NotificationService.sendBalanceThresholdNotification(
        99999,
        {
          currentBalance: 50.00,
          threshold: 100.00
        }
      );

      expect(result.success).to.be.false;
      expect(result.message).to.equal('User not found');
    });
  });

  describe('generateAndSendReceipt', () => {
    it('should successfully generate and queue receipt notification', async () => {
      const result = await NotificationService.generateAndSendReceipt(
        testTransactionId,
        testUserId
      );

      expect(result.success).to.be.true;
      expect(result.message).to.equal('Payment receipt generated and queued for delivery');
      expect(result.data.receiptId).to.equal('RCPT_TXN_TEST_123');
      expect(result.data.emailNotificationId).to.be.a('number');
      expect(result.data.receiptData).to.be.an('object');

      // Verify receipt data structure
      const receiptData = result.data.receiptData;
      expect(receiptData.transactionId).to.equal('TXN_TEST_123');
      expect(receiptData.amount).to.equal(500.00);
      expect(receiptData.serviceCharge).to.equal(25.00);
      expect(receiptData.hospitalAmount).to.equal(475.00);

      // Verify notification was queued
      const queuedNotifications = db.prepare(
        'SELECT * FROM notification_queue WHERE recipientId = ? AND type = ?'
      ).all(testUserId, 'payment_receipt');

      expect(queuedNotifications).to.have.length(1); // Email only for receipts
      expect(queuedNotifications[0].priority).to.equal('medium');
    });

    it('should handle invalid transaction ID', async () => {
      const result = await NotificationService.generateAndSendReceipt(
        99999,
        testUserId
      );

      expect(result.success).to.be.false;
      expect(result.message).to.equal('Transaction not found');
    });
  });

  describe('Email Template Generation', () => {
    it('should generate payment confirmation email template', () => {
      const testData = {
        recipient: { name: 'Test User' },
        transaction: {
          transactionId: 'TXN_123',
          amount: 500.00,
          paymentMethod: 'credit_card',
          processedAt: new Date().toISOString()
        },
        booking: {
          hospitalName: 'Test Hospital',
          resourceType: 'beds',
          patientName: 'Test Patient',
          scheduledDate: new Date().toISOString()
        },
        details: {
          receiptId: 'RCPT_TXN_123',
          serviceCharge: 25.00,
          hospitalAmount: 475.00
        }
      };

      const template = NotificationService.generateEmailTemplate('payment_confirmed', testData);

      expect(template.subject).to.include('Payment Confirmed');
      expect(template.subject).to.include('TXN_123');
      expect(template.body).to.include('Test User');
      expect(template.body).to.include('$500.00');
      expect(template.body).to.include('Test Hospital');
      expect(template.body).to.include('RCPT_TXN_123');
    });

    it('should generate revenue notification email template', () => {
      const testData = {
        recipient: { name: 'Hospital Authority' },
        revenue: {
          hospitalName: 'Test Hospital',
          amount: 475.00,
          transactionId: 'TXN_123',
          resourceType: 'beds',
          patientName: 'Test Patient'
        },
        details: {
          totalBookingAmount: 500.00,
          serviceChargeDeducted: 25.00,
          currentBalance: 1475.00
        }
      };

      const template = NotificationService.generateEmailTemplate('revenue_received', testData);

      expect(template.subject).to.include('Revenue Received');
      expect(template.subject).to.include('Test Hospital');
      expect(template.body).to.include('Hospital Authority');
      expect(template.body).to.include('$475.00');
      expect(template.body).to.include('$1,475.00');
    });

    it('should generate financial anomaly alert email template', () => {
      const testData = {
        anomaly: {
          type: 'Large Transaction',
          severity: 'high',
          description: 'Unusual transaction amount',
          detectedAt: new Date().toISOString(),
          recommendedAction: 'Review immediately',
          affectedTransactions: ['TXN_123']
        },
        details: {
          hospitalName: 'Test Hospital',
          amount: 10000.00
        }
      };

      const template = NotificationService.generateEmailTemplate('financial_anomaly', testData);

      expect(template.subject).to.include('URGENT');
      expect(template.subject).to.include('Financial Anomaly');
      expect(template.body).to.include('Large Transaction');
      expect(template.body).to.include('high');
      expect(template.body).to.include('$10,000.00');
      expect(template.body).to.include('IMMEDIATE INVESTIGATION REQUIRED');
    });
  });

  describe('SMS Template Generation', () => {
    it('should generate payment confirmation SMS template', () => {
      const testData = {
        transaction: {
          transactionId: 'TXN_123',
          amount: 500.00
        },
        booking: {
          hospitalName: 'Test Hospital',
          scheduledDate: new Date().toISOString()
        }
      };

      const template = NotificationService.generateSMSTemplate('payment_confirmed', testData);

      expect(template.message).to.include('PAYMENT CONFIRMED');
      expect(template.message).to.include('$500.00');
      expect(template.message).to.include('TXN_123');
      expect(template.message).to.include('Test Hospital');
    });

    it('should generate balance threshold SMS template', () => {
      const testData = {
        balance: {
          currentBalance: 50.00,
          threshold: 100.00
        }
      };

      const template = NotificationService.generateSMSTemplate('balance_threshold', testData);

      expect(template.message).to.include('BALANCE ALERT');
      expect(template.message).to.include('$50.00');
      expect(template.message).to.include('$100.00');
    });

    it('should generate urgent SMS for negative balance', () => {
      const testData = {
        balance: {
          currentBalance: -25.00,
          threshold: 100.00
        }
      };

      const template = NotificationService.generateSMSTemplate('balance_threshold', testData);

      expect(template.message).to.include('URGENT: Negative balance!');
    });
  });
});