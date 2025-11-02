const { expect } = require('chai');
const sinon = require('sinon');
const request = require('supertest');
const app = require('../../index');
const db = require('../../config/database');
const ValidationService = require('../../services/validationService');
const BookingService = require('../../services/bookingService');
const User = require('../../models/User');
const HospitalPricing = require('../../models/HospitalPricing');
const UserService = require('../../services/userService');
const jwt = require('jsonwebtoken');

describe('Rapid Assistance Payment Security Tests', () => {
  let authToken, testUser;
  let validationServiceStub, bookingServiceStub, userStub, hospitalPricingStub;

  before(async () => {
    // Clean up any existing test users
    db.prepare('DELETE FROM users WHERE email LIKE ?').run('test%@rapidassistance.payment.test');
    
    // Create a test user for authentication
    const userResult = await UserService.register({
      name: 'Test User Payment Security',
      email: 'testuser@rapidassistance.payment.test',
      password: 'password123',
      userType: 'user'
    });
    testUser = userResult;
    
    // Generate a valid auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testuser@rapidassistance.payment.test',
        password: 'password123'
      });
    authToken = loginResponse.body.token;
  });

  after(() => {
    // Clean up test users
    db.prepare('DELETE FROM users WHERE email LIKE ?').run('test%@rapidassistance.payment.test');
  });

  beforeEach(() => {
    // Stub services
    validationServiceStub = {
      validateRapidAssistanceEligibility: sinon.stub(),
      calculateRapidAssistanceCharge: sinon.stub()
    };
    sinon.stub(ValidationService, 'validateRapidAssistanceEligibility').callsFake(validationServiceStub.validateRapidAssistanceEligibility);
    sinon.stub(ValidationService, 'calculateRapidAssistanceCharge').callsFake(validationServiceStub.calculateRapidAssistanceCharge);

    bookingServiceStub = {
      getById: sinon.stub(),
      updateRapidAssistance: sinon.stub(),
      updatePaymentStatus: sinon.stub()
    };
    sinon.stub(BookingService, 'getById').callsFake(bookingServiceStub.getById);
    sinon.stub(BookingService, 'updateRapidAssistance').callsFake(bookingServiceStub.updateRapidAssistance);
    sinon.stub(BookingService, 'updatePaymentStatus').callsFake(bookingServiceStub.updatePaymentStatus);

    userStub = {
      hasSufficientBalance: sinon.stub(),
      getBalance: sinon.stub(),
      processPayment: sinon.stub()
    };
    sinon.stub(User, 'hasSufficientBalance').callsFake(userStub.hasSufficientBalance);
    sinon.stub(User, 'getBalance').callsFake(userStub.getBalance);
    sinon.stub(User, 'processPayment').callsFake(userStub.processPayment);

    hospitalPricingStub = {
      calculateBookingCost: sinon.stub()
    };
    sinon.stub(HospitalPricing, 'calculateBookingCost').callsFake(hospitalPricingStub.calculateBookingCost);
    
    // Stub the Booking model findById method directly
    const BookingModel = require('../../models/Booking');
    sinon.stub(BookingModel, 'findById');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Payment Amount Manipulation Prevention', () => {
    it('should reject payment when client sends incorrect amount with rapid assistance', async () => {
      // Configure the stub to return a valid booking
      const BookingModel = require('../../models/Booking');
      BookingModel.findById.returns({
        id: 1,
        userId: testUser.id, // Use actual test user ID
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 65,
        estimatedDuration: 24,
        paymentStatus: 'pending',
        rapidAssistance: 0
      });

      // Mock existing booking for eligible patient
      bookingServiceStub.getById.returns({
        id: 1,
        userId: testUser.id, // Use actual test user ID
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 65,
        estimatedDuration: 24,
        paymentStatus: 'pending',
        rapidAssistance: 0
      });

      // Mock hospital pricing
      hospitalPricingStub.calculateBookingCost.returns({
        total_cost: 1000,
        base_price: 800,
        service_charge_percentage: 25,
        service_charge_amount: 200,
        hospital_share: 800,
        duration_days: 1
      });

      // Mock rapid assistance validation
      validationServiceStub.validateRapidAssistanceEligibility.returns({
        isValid: true,
        errors: []
      });
      validationServiceStub.calculateRapidAssistanceCharge.returns(200);

      // Client tries to pay base amount only while requesting rapid assistance
      const maliciousPayload = {
        bookingId: 1,
        transactionId: 'TXN123456',
        amount: 1000, // Should be 1200 with rapid assistance
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousPayload);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Payment amount mismatch');
      expect(userStub.processPayment.called).to.be.false;
    });

    it('should reject payment when client sends excessive amount', async () => {
      // Configure the stub to return a valid booking
      const BookingModel = require('../../models/Booking');
      BookingModel.findById.returns({
        id: 1,
        userId: testUser.id, // Use actual test user ID
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 65,
        estimatedDuration: 24,
        paymentStatus: 'pending',
        rapidAssistance: 0
      });

      // Mock existing booking for eligible patient
      bookingServiceStub.getById.returns({
        id: 1,
        userId: testUser.id, // Use actual test user ID
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 65,
        estimatedDuration: 24,
        paymentStatus: 'pending',
        rapidAssistance: 0
      });

      // Mock hospital pricing
      hospitalPricingStub.calculateBookingCost.returns({
        total_cost: 1000,
        base_price: 800,
        service_charge_percentage: 25,
        service_charge_amount: 200,
        hospital_share: 800,
        duration_days: 1
      });

      // Mock rapid assistance validation
      validationServiceStub.validateRapidAssistanceEligibility.returns({
        isValid: true,
        errors: []
      });
      validationServiceStub.calculateRapidAssistanceCharge.returns(200);

      // Client tries to pay excessive amount
      const maliciousPayload = {
        bookingId: 1,
        transactionId: 'TXN123456',
        amount: 5000, // Excessive amount
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousPayload);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Payment amount mismatch');
      expect(userStub.processPayment.called).to.be.false;
    });

    it('should reject payment with negative amounts', async () => {
      // Configure the stub to return a valid booking
      const BookingModel = require('../../models/Booking');
      BookingModel.findById.returns({
        id: 1,
        userId: testUser.id, // Use actual test user ID
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 65,
        estimatedDuration: 24,
        paymentStatus: 'pending',
        rapidAssistance: 0
      });

      const negativeAmountPayload = {
        bookingId: 1,
        transactionId: 'TXN123456',
        amount: -200,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(negativeAmountPayload);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(userStub.processPayment.called).to.be.false;
    });

    it('should reject payment with zero amounts when rapid assistance is requested', async () => {
      // Configure the stub to return a valid booking
      const BookingModel = require('../../models/Booking');
      BookingModel.findById.returns({
        id: 1,
        userId: testUser.id, // Use actual test user ID
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 65,
        estimatedDuration: 24,
        paymentStatus: 'pending',
        rapidAssistance: 0
      });

      const zeroAmountPayload = {
        bookingId: 1,
        transactionId: 'TXN123456',
        amount: 0,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(zeroAmountPayload);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(userStub.processPayment.called).to.be.false;
    });
  });

  describe('Rapid Assistance Charge Manipulation Prevention', () => {
    it('should prevent client from setting custom rapid assistance charge', async () => {
      // Configure the stub to return a valid booking
      const BookingModel = require('../../models/Booking');
      BookingModel.findById.returns({
        id: 1,
        userId: testUser.id, // Use actual test user ID
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 65,
        estimatedDuration: 24,
        paymentStatus: 'pending',
        rapidAssistance: 0
      });

      // Mock existing booking for eligible patient
      bookingServiceStub.getById.returns({
        id: 1,
        userId: testUser.id, // Use actual test user ID
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 65,
        estimatedDuration: 24,
        paymentStatus: 'pending',
        rapidAssistance: 0
      });

      // Mock hospital pricing
      hospitalPricingStub.calculateBookingCost.returns({
        total_cost: 1000,
        base_price: 800,
        service_charge_percentage: 25,
        service_charge_amount: 200,
        hospital_share: 800,
        duration_days: 1
      });

      // Mock rapid assistance validation
      validationServiceStub.validateRapidAssistanceEligibility.returns({
        isValid: true,
        errors: []
      });
      validationServiceStub.calculateRapidAssistanceCharge.returns(200); // Server calculates 200

      // Client tries to set custom charge
      const maliciousPayload = {
        bookingId: 1,
        transactionId: 'TXN123456',
        amount: 1050, // Base + custom charge of 50
        rapidAssistance: true,
        rapidAssistanceCharge: 50 // Client tries to set custom charge
      };

      const response = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousPayload);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Payment amount mismatch');
      expect(userStub.processPayment.called).to.be.false;
    });

    it('should prevent double charging for rapid assistance', async () => {
      // Configure the stub to return a booking that already has rapid assistance
      const BookingModel = require('../../models/Booking');
      BookingModel.findById.returns({
        id: 1,
        userId: testUser.id, // Use actual test user ID
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 65,
        estimatedDuration: 24,
        paymentStatus: 'pending',
        rapidAssistance: 1, // Already has rapid assistance
        rapidAssistanceCharge: 200
      });

      // Mock existing booking that already has rapid assistance
      bookingServiceStub.getById.returns({
        id: 1,
        userId: testUser.id, // Use actual test user ID
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 65,
        estimatedDuration: 24,
        paymentStatus: 'pending',
        rapidAssistance: 1, // Already has rapid assistance
        rapidAssistanceCharge: 200
      });

      // Mock hospital pricing
      hospitalPricingStub.calculateBookingCost.returns({
        total_cost: 1000,
        base_price: 800,
        service_charge_percentage: 25,
        service_charge_amount: 200,
        hospital_share: 800,
        duration_days: 1
      });

      // Client tries to add rapid assistance again
      const doubleChargePayload = {
        bookingId: 1,
        transactionId: 'TXN123456',
        amount: 1400, // Base + double rapid assistance charge
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(doubleChargePayload);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(userStub.processPayment.called).to.be.false;
    });
  });

  describe('Transaction Security', () => {
    it('should reject payments with invalid transaction IDs', async () => {
      // Configure the stub to return a valid booking
      const BookingModel = require('../../models/Booking');
      BookingModel.findById.returns({
        id: 1,
        userId: testUser.id, // Use actual test user ID
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 65,
        estimatedDuration: 24,
        paymentStatus: 'pending',
        rapidAssistance: 0
      });

      const invalidTransactionIds = [
        '', // Empty string
        null, // Null
        undefined, // Undefined
        123, // Number instead of string
        [], // Array
        {}, // Object
        'TXN', // Too short
        'A'.repeat(1000) // Too long
      ];

      for (const invalidTxnId of invalidTransactionIds) {
        const payload = {
          bookingId: 1,
          transactionId: invalidTxnId,
          amount: 1200,
          rapidAssistance: true
        };

        const response = await request(app)
          .post('/api/bookings/payment')
          .set('Authorization', `Bearer ${authToken}`)
          .send(payload);

        expect(response.status).to.equal(400);
        expect(response.body.success).to.be.false;
        expect(userStub.processPayment.called).to.be.false;
      }
    });

    it('should reject payments with duplicate transaction IDs', async () => {
      // Configure the stub to return a valid booking
      const BookingModel = require('../../models/Booking');
      BookingModel.findById.returns({
        id: 1,
        userId: testUser.id, // Use actual test user ID
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 65,
        estimatedDuration: 24,
        paymentStatus: 'pending',
        rapidAssistance: 0
      });

      // Mock existing booking
      bookingServiceStub.getById.returns({
        id: 1,
        userId: testUser.id, // Use actual test user ID
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 65,
        estimatedDuration: 24,
        paymentStatus: 'pending',
        rapidAssistance: 0
      });

      // Mock hospital pricing
      hospitalPricingStub.calculateBookingCost.returns({
        total_cost: 1000,
        base_price: 800,
        service_charge_percentage: 25,
        service_charge_amount: 200,
        hospital_share: 800,
        duration_days: 1
      });

      // Mock rapid assistance validation
      validationServiceStub.validateRapidAssistanceEligibility.returns({
        isValid: true,
        errors: []
      });
      validationServiceStub.calculateRapidAssistanceCharge.returns(200);

      // Mock user balance
      userStub.hasSufficientBalance.returns(true);
      userStub.processPayment.onFirstCall().returns({
        previousBalance: 2000,
        newBalance: 800
      });
      userStub.processPayment.onSecondCall().throws(new Error('Duplicate transaction ID'));

      const duplicatePayload = {
        bookingId: 1,
        transactionId: 'TXN123456',
        amount: 1200,
        rapidAssistance: true
      };

      // First payment should succeed
      const firstResponse = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicatePayload);

      expect(firstResponse.status).to.equal(200);

      // Second payment with same transaction ID should fail
      const secondResponse = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicatePayload);

      expect(secondResponse.status).to.equal(400);
      expect(secondResponse.body.success).to.be.false;
      expect(secondResponse.body.error).to.include('Duplicate transaction ID');
    });
  });

  describe('Booking Security Validation', () => {
    it('should reject payment for non-existent booking', async () => {
      // Configure the stub to return null for this test
      const BookingModel = require('../../models/Booking');
      BookingModel.findById.returns(null);

      const payload = {
        bookingId: 999,
        transactionId: 'TXN123456',
        amount: 1200,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(response.status).to.equal(404);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Booking not found');
      expect(userStub.processPayment.called).to.be.false;
    });

    it('should reject payment for booking belonging to different user', async () => {
      // Configure the stub to return a booking with different user ID
      const BookingModel = require('../../models/Booking');
      BookingModel.findById.returns({
        id: 1,
        userId: 999, // Different user ID (this should not exist in the database)
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 65,
        estimatedDuration: 24,
        paymentStatus: 'pending',
        rapidAssistance: 0
      });

      const payload = {
        bookingId: 1,
        transactionId: 'TXN123456',
        amount: 1200,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(response.status).to.equal(403);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Access denied');
      expect(userStub.processPayment.called).to.be.false;
    });

    it('should reject payment for already paid booking', async () => {
      // Configure the stub to return an already paid booking
      const BookingModel = require('../../models/Booking');
      BookingModel.findById.returns({
        id: 1,
        userId: testUser.id, // Use actual test user ID
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 65,
        estimatedDuration: 24,
        paymentStatus: 'paid', // Already paid
        rapidAssistance: 0
      });

      const payload = {
        bookingId: 1,
        transactionId: 'TXN123456',
        amount: 1200,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('already been paid');
      expect(userStub.processPayment.called).to.be.false;
    });

    it('should reject payment for cancelled booking', async () => {
      // Configure the stub to return a cancelled booking
      const BookingModel = require('../../models/Booking');
      BookingModel.findById.returns({
        id: 1,
        userId: testUser.id, // Use actual test user ID
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 65,
        estimatedDuration: 24,
        paymentStatus: 'cancelled', // Cancelled booking
        rapidAssistance: 0
      });

      const payload = {
        bookingId: 1,
        transactionId: 'TXN123456',
        amount: 1200,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('cancelled');
      expect(userStub.processPayment.called).to.be.false;
    });
  });

  describe('Input Validation Security', () => {
    it('should reject payments with malformed JSON', async () => {
      const response = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{"bookingId": 1, "amount": 1200, "rapidAssistance": true'); // Malformed JSON

      // When body-parser fails to parse JSON, it returns a 400 error
      // We need to check that our application handles this gracefully
      expect([400, 500]).to.include(response.status); // Accept either 400 or 500
      expect(userStub.processPayment.called).to.be.false;
    });

    it('should reject payments with SQL injection attempts', async () => {
      const sqlInjectionPayload = {
        bookingId: "1; DROP TABLE bookings; --",
        transactionId: "TXN'; DELETE FROM users; --",
        amount: 1200,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sqlInjectionPayload);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(userStub.processPayment.called).to.be.false;
    });

    it('should reject payments with XSS attempts', async () => {
      const xssPayload = {
        bookingId: 1,
        transactionId: '<script>alert("xss")</script>',
        amount: 1200,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(xssPayload);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(userStub.processPayment.called).to.be.false;
    });
  });

  describe('Rate Limiting and Abuse Prevention', () => {
    it('should handle multiple rapid payment attempts gracefully', async () => {
      // Configure the stub to return a pending booking
      const BookingModel = require('../../models/Booking');
      BookingModel.findById.returns({
        id: 1,
        userId: testUser.id, // Use actual test user ID
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 65,
        estimatedDuration: 24,
        paymentStatus: 'pending',
        rapidAssistance: 0
      });

      // Mock existing booking
      bookingServiceStub.getById.returns({
        id: 1,
        userId: testUser.id, // Use actual test user ID
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 65,
        estimatedDuration: 24,
        paymentStatus: 'pending',
        rapidAssistance: 0
      });

      // Mock hospital pricing
      hospitalPricingStub.calculateBookingCost.returns({
        total_cost: 1000,
        base_price: 800,
        service_charge_percentage: 25,
        service_charge_amount: 200,
        hospital_share: 800,
        duration_days: 1
      });

      // Mock rapid assistance validation
      validationServiceStub.validateRapidAssistanceEligibility.returns({
        isValid: true,
        errors: []
      });
      validationServiceStub.calculateRapidAssistanceCharge.returns(200);

      // Mock user balance
      userStub.hasSufficientBalance.returns(true);
      userStub.processPayment.onFirstCall().returns({
        previousBalance: 2000,
        newBalance: 800
      });
      userStub.processPayment.onSecondCall().throws(new Error('Payment already processed'));

      const payload = {
        bookingId: 1,
        transactionId: 'TXN123456',
        amount: 1200,
        rapidAssistance: true
      };

      // Send multiple rapid requests
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          request(app)
            .post('/api/bookings/payment')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ ...payload, transactionId: `TXN12345${i}` })
        );
      }

      const responses = await Promise.all(promises);

      // Only one should succeed, others should fail
      const successCount = responses.filter(r => r.status === 200).length;
      const failureCount = responses.filter(r => r.status !== 200).length;

      expect(successCount).to.equal(1);
      expect(failureCount).to.equal(2);
    });
  });
});