const { expect } = require('chai');
const request = require('supertest');
const app = require('../../index');
const db = require('../../config/database');
const User = require('../../models/User');
const UserService = require('../../services/userService');
const BookingService = require('../../services/bookingService');
const HospitalService = require('../../services/hospitalService');

describe('Rapid Assistance Booking Flow - Integration Tests', () => {
  let testUser, testHospital, authToken;
  let testUserUnder60, authTokenUnder60;

  before(async () => {
    // Clean up any existing test data in correct order (child tables first)
    db.prepare('DELETE FROM bookings WHERE patientName LIKE ?').run('Test Patient%');
    db.prepare('DELETE FROM hospital_services WHERE hospitalId IN (SELECT id FROM hospitals WHERE name LIKE ?)').run('Test Hospital%');
    db.prepare('DELETE FROM hospital_resources WHERE hospitalId IN (SELECT id FROM hospitals WHERE name LIKE ?)').run('Test Hospital%');
    db.prepare('DELETE FROM hospitals WHERE name LIKE ?').run('Test Hospital%');
    db.prepare('DELETE FROM simple_transactions WHERE user_id IN (SELECT id FROM users WHERE email LIKE ?)').run('test%@rapidassistance.test');
    db.prepare('DELETE FROM users WHERE email LIKE ?').run('test%@rapidassistance.test');

    // Create test user (eligible for rapid assistance)
    const userResult = await UserService.register({
      name: 'Test User Senior',
      email: 'testsenior@rapidassistance.test',
      password: 'password123',
      userType: 'user'
    });
    testUser = User.findById(userResult.userId);
    
    // Add balance for payment testing
    User.updateBalance(testUser.id, 5000, 'add', 'Test balance'); // Add 5000৳ balance

    // Create test user under 60 (ineligible for rapid assistance)
    const userUnder60Result = await UserService.register({
      name: 'Test User Young',
      email: 'testyoung@rapidassistance.test',
      password: 'password123',
      userType: 'user'
    });
    testUserUnder60 = User.findById(userUnder60Result.userId);
    
    // Add balance for payment testing
    User.updateBalance(testUserUnder60.id, 5000, 'add', 'Test balance');

    // Create test hospital
    testHospital = HospitalService.create({
      name: 'Test Hospital Rapid Assistance',
      description: 'Test hospital for rapid assistance integration tests',
      type: 'General',
      address: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'Bangladesh'
      },
      contact: {
        phone: '+8801234567890',
        email: 'test@hospital.com',
        emergency: '+8801234567891'
      },
      services: ['Emergency Care', 'ICU'],
      resources: {
        beds: { total: 100, available: 50, occupied: 50 },
        icu: { total: 20, available: 10, occupied: 10 },
        operationTheatres: { total: 5, available: 3, occupied: 2 }
      }
    });
    
    // Approve the hospital
    HospitalService.approveHospital(testHospital.id, testUser.id);

    // Get auth tokens
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testsenior@rapidassistance.test',
        password: 'password123'
      });
    authToken = loginResponse.body.token;

    const loginResponseUnder60 = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testyoung@rapidassistance.test',
        password: 'password123'
      });
    authTokenUnder60 = loginResponseUnder60.body.token;
  });

  after(() => {
    // Clean up test data in correct order (child tables first)
    db.prepare('DELETE FROM bookings WHERE patientName LIKE ?').run('Test Patient%');
    db.prepare('DELETE FROM hospital_services WHERE hospitalId IN (SELECT id FROM hospitals WHERE name LIKE ?)').run('Test Hospital%');
    db.prepare('DELETE FROM hospital_resources WHERE hospitalId IN (SELECT id FROM hospitals WHERE name LIKE ?)').run('Test Hospital%');
    db.prepare('DELETE FROM hospitals WHERE name LIKE ?').run('Test Hospital%');
    db.prepare('DELETE FROM simple_transactions WHERE user_id IN (SELECT id FROM users WHERE email LIKE ?)').run('test%@rapidassistance.test');
    db.prepare('DELETE FROM users WHERE email LIKE ?').run('test%@rapidassistance.test');
  });

  describe('End-to-End Booking Process with Rapid Assistance', () => {
    it('should complete full booking flow with rapid assistance for eligible patient (age 65)', async () => {
      // Step 1: Create booking with rapid assistance
      const bookingData = {
        hospitalId: testHospital.id,
        resourceType: 'beds',
        patientName: 'Test Patient Senior 65',
        patientAge: 65,
        patientGender: 'male',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'son',
        medicalCondition: 'Test condition requiring assistance',
        urgency: 'medium',
        estimatedDuration: 24,
        rapidAssistance: true
      };

      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData)
        .expect(201);

      expect(bookingResponse.body.success).to.be.true;
      expect(bookingResponse.body.data.rapidAssistance).to.equal(1);
      expect(bookingResponse.body.data.rapidAssistanceCharge).to.equal(200);
      expect(bookingResponse.body.data.rapidAssistantName).to.be.a('string');
      expect(bookingResponse.body.data.rapidAssistantPhone).to.be.a('string');
      expect(bookingResponse.body.data.rapidAssistantPhone).to.match(/^\+880\d{10}$/);

      const bookingId = bookingResponse.body.data.id;

      // Step 2: Process payment with rapid assistance charges
      const paymentData = {
        bookingId: bookingId,
        transactionId: `TXN_RA_${Date.now()}`,
        rapidAssistance: true
      };

      const paymentResponse = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(200);

      expect(paymentResponse.body.success).to.be.true;
      expect(paymentResponse.body.data.payment.cost_breakdown.rapid_assistance_charge).to.equal(200);
      expect(paymentResponse.body.data.payment.cost_breakdown.total_amount).to.be.greaterThan(200);
      expect(paymentResponse.body.data.payment.rapid_assistance.requested).to.be.true;
      expect(paymentResponse.body.data.payment.rapid_assistance.charge).to.equal(200);
      expect(paymentResponse.body.data.payment.rapid_assistance.assistant_name).to.be.a('string');
      expect(paymentResponse.body.data.payment.rapid_assistance.assistant_phone).to.be.a('string');

      // Verify itemized breakdown includes rapid assistance
      const breakdown = paymentResponse.body.data.payment.cost_breakdown;
      const rapidAssistanceItem = breakdown.breakdown_items.find(item => 
        item.item === 'Rapid Assistance Service'
      );
      expect(rapidAssistanceItem).to.exist;
      expect(rapidAssistanceItem.amount).to.equal(200);
      expect(rapidAssistanceItem.description).to.include('Senior citizen escort service');

      // Step 3: Verify booking confirmation shows assistant details
      const confirmationResponse = await request(app)
        .get(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(confirmationResponse.body.success).to.be.true;
      expect(confirmationResponse.body.data.rapidAssistance).to.equal(1);
      expect(confirmationResponse.body.data.rapidAssistanceCharge).to.equal(200);
      expect(confirmationResponse.body.data.rapidAssistantName).to.be.a('string');
      expect(confirmationResponse.body.data.rapidAssistantPhone).to.be.a('string');
      expect(confirmationResponse.body.data.paymentStatus).to.equal('paid');
    });

    it('should complete full booking flow with rapid assistance for exactly 60 years old patient', async () => {
      // Test edge case: exactly 60 years old
      const bookingData = {
        hospitalId: testHospital.id,
        resourceType: 'icu',
        patientName: 'Test Patient Exactly 60',
        patientAge: 60,
        patientGender: 'female',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'daughter',
        medicalCondition: 'ICU care with assistance',
        urgency: 'high',
        estimatedDuration: 48,
        rapidAssistance: true
      };

      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData)
        .expect(201);

      expect(bookingResponse.body.success).to.be.true;
      expect(bookingResponse.body.data.rapidAssistance).to.equal(1);
      expect(bookingResponse.body.data.rapidAssistanceCharge).to.equal(200);

      const bookingId = bookingResponse.body.data.id;

      // Process payment
      const paymentResponse = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bookingId: bookingId,
          transactionId: `TXN_RA_60_${Date.now()}`,
          rapidAssistance: true
        })
        .expect(200);

      expect(paymentResponse.body.success).to.be.true;
      expect(paymentResponse.body.data.payment.rapid_assistance.charge).to.equal(200);
    });

    it('should complete booking flow without rapid assistance for eligible patient when not requested', async () => {
      const bookingData = {
        hospitalId: testHospital.id,
        resourceType: 'beds',
        patientName: 'Test Patient Senior No RA',
        patientAge: 70,
        patientGender: 'male',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'son',
        medicalCondition: 'Standard care without assistance',
        urgency: 'low',
        estimatedDuration: 24,
        rapidAssistance: false
      };

      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData)
        .expect(201);

      expect(bookingResponse.body.success).to.be.true;
      expect(bookingResponse.body.data.rapidAssistance).to.equal(0);
      expect(bookingResponse.body.data.rapidAssistanceCharge).to.equal(0);
      expect(bookingResponse.body.data.rapidAssistantName).to.be.null;
      expect(bookingResponse.body.data.rapidAssistantPhone).to.be.null;

      const bookingId = bookingResponse.body.data.id;

      // Process payment without rapid assistance
      const paymentResponse = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bookingId: bookingId,
          transactionId: `TXN_NO_RA_${Date.now()}`,
          rapidAssistance: false
        })
        .expect(200);

      expect(paymentResponse.body.success).to.be.true;
      expect(paymentResponse.body.data.payment.cost_breakdown.rapid_assistance_charge).to.equal(0);
      expect(paymentResponse.body.data.payment.rapid_assistance.requested).to.be.false;
      expect(paymentResponse.body.data.payment.rapid_assistance.charge).to.equal(0);

      // Verify no rapid assistance item in breakdown
      const breakdown = paymentResponse.body.data.payment.cost_breakdown;
      const rapidAssistanceItem = breakdown.breakdown_items.find(item => 
        item.item === 'Rapid Assistance Service'
      );
      expect(rapidAssistanceItem).to.be.undefined;
    });
  });

  describe('Payment Processing with Rapid Assistance Charges', () => {
    let testBookingId;

    beforeEach(async () => {
      // Create a test booking for payment tests
      const bookingData = {
        hospitalId: testHospital.id,
        resourceType: 'beds',
        patientName: 'Test Patient Payment',
        patientAge: 65,
        patientGender: 'female',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'daughter',
        medicalCondition: 'Payment test condition',
        urgency: 'medium',
        estimatedDuration: 24,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData);

      testBookingId = response.body.data.id;
    });

    it('should process payment with correct rapid assistance charge calculation', async () => {
      const paymentResponse = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bookingId: testBookingId,
          transactionId: `TXN_CALC_${Date.now()}`,
          rapidAssistance: true
        })
        .expect(200);

      expect(paymentResponse.body.success).to.be.true;
      
      const costBreakdown = paymentResponse.body.data.payment.cost_breakdown;
      expect(costBreakdown.rapid_assistance_charge).to.equal(200);
      expect(costBreakdown.total_amount).to.equal(
        costBreakdown.base_booking_cost + costBreakdown.rapid_assistance_charge
      );

      // Verify platform revenue includes rapid assistance
      expect(costBreakdown.platform_revenue).to.equal(
        costBreakdown.service_charge_amount + costBreakdown.rapid_assistance_charge
      );
    });

    it('should reject payment with rapid assistance for ineligible patient', async () => {
      // Create booking for under-60 patient
      const bookingData = {
        hospitalId: testHospital.id,
        resourceType: 'beds',
        patientName: 'Test Patient Young Payment',
        patientAge: 25,
        patientGender: 'male',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'brother',
        medicalCondition: 'Young patient test',
        urgency: 'medium',
        estimatedDuration: 24,
        rapidAssistance: false // Initially false
      };

      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authTokenUnder60}`)
        .send(bookingData);

      const youngBookingId = bookingResponse.body.data.id;

      // Try to pay with rapid assistance (should fail)
      const paymentResponse = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authTokenUnder60}`)
        .send({
          bookingId: youngBookingId,
          transactionId: `TXN_INVALID_${Date.now()}`,
          rapidAssistance: true // Try to add rapid assistance during payment
        })
        .expect(400);

      expect(paymentResponse.body.success).to.be.false;
      expect(paymentResponse.body.error).to.include('Rapid Assistance is only available for patients aged 60 and above');
    });

    it('should handle payment amount validation with rapid assistance', async () => {
      // Get the expected total amount first
      const booking = BookingService.getById(testBookingId);
      const expectedTotal = booking.paymentAmount; // Should include rapid assistance charge

      // Try to pay with incorrect amount
      const paymentResponse = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bookingId: testBookingId,
          transactionId: `TXN_MISMATCH_${Date.now()}`,
          amount: expectedTotal - 50, // Incorrect amount
          rapidAssistance: true
        })
        .expect(400);

      expect(paymentResponse.body.success).to.be.false;
      expect(paymentResponse.body.error).to.include('Payment amount mismatch');
    });

    it('should handle insufficient balance for payment with rapid assistance', async () => {
      // Create user with insufficient balance
      const poorUserResult = await UserService.register({
        name: 'Poor User',
        email: 'poor@rapidassistance.test',
        password: 'password123',
        userType: 'user'
      });
      const poorUser = User.findById(poorUserResult.userId);
      
      // Add minimal balance (less than booking cost)
      User.updateBalance(poorUser.id, 50, 'add', 'Test balance');

      // Get auth token for poor user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'poor@rapidassistance.test',
          password: 'password123'
        });
      const poorAuthToken = loginResponse.body.token;

      // Create booking
      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${poorAuthToken}`)
        .send({
          hospitalId: testHospital.id,
          resourceType: 'beds',
          patientName: 'Test Patient Poor',
          patientAge: 65,
          patientGender: 'male',
          emergencyContactName: 'Emergency Contact',
          emergencyContactPhone: '+8801234567890',
          emergencyContactRelationship: 'son',
          medicalCondition: 'Insufficient balance test',
          urgency: 'medium',
          estimatedDuration: 24,
          rapidAssistance: true
        });

      const poorBookingId = bookingResponse.body.data.id;

      // Try to pay (should fail due to insufficient balance)
      const paymentResponse = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${poorAuthToken}`)
        .send({
          bookingId: poorBookingId,
          transactionId: `TXN_POOR_${Date.now()}`,
          rapidAssistance: true
        })
        .expect(400);

      expect(paymentResponse.body.success).to.be.false;
      expect(paymentResponse.body.error).to.include('Insufficient balance');
      expect(paymentResponse.body.data.required_amount).to.be.greaterThan(50);
      expect(paymentResponse.body.data.current_balance).to.equal(50);

      // Clean up
      db.prepare('DELETE FROM simple_transactions WHERE user_id = ?').run(poorUser.id);
      db.prepare('DELETE FROM users WHERE email = ?').run('poor@rapidassistance.test');
    });
  });

  describe('Booking Confirmation with Assistant Details Display', () => {
    let confirmedBookingId;

    before(async () => {
      // Create and pay for a booking to test confirmation display
      const bookingData = {
        hospitalId: testHospital.id,
        resourceType: 'icu',
        patientName: 'Test Patient Confirmation',
        patientAge: 68,
        patientGender: 'female',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'daughter',
        medicalCondition: 'Confirmation test condition',
        urgency: 'high',
        estimatedDuration: 48,
        rapidAssistance: true
      };

      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData);

      confirmedBookingId = bookingResponse.body.data.id;

      // Process payment
      await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bookingId: confirmedBookingId,
          transactionId: `TXN_CONFIRM_${Date.now()}`,
          rapidAssistance: true
        });
    });

    it('should display complete assistant details in booking confirmation', async () => {
      const response = await request(app)
        .get(`/api/bookings/${confirmedBookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      
      const booking = response.body.data;
      expect(booking.rapidAssistance).to.equal(1);
      expect(booking.rapidAssistanceCharge).to.equal(200);
      expect(booking.rapidAssistantName).to.be.a('string');
      expect(booking.rapidAssistantName).to.have.length.greaterThan(5);
      expect(booking.rapidAssistantPhone).to.be.a('string');
      expect(booking.rapidAssistantPhone).to.match(/^\+880\d{10}$/);
      expect(booking.paymentStatus).to.equal('paid');
    });

    it('should show rapid assistance status in user booking history', async () => {
      const response = await request(app)
        .get('/api/bookings/user')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      
      const rapidAssistanceBooking = response.body.data.find(
        booking => booking.id === confirmedBookingId
      );
      
      expect(rapidAssistanceBooking).to.exist;
      expect(rapidAssistanceBooking.rapidAssistance).to.equal(1);
      expect(rapidAssistanceBooking.rapidAssistanceCharge).to.equal(200);
      expect(rapidAssistanceBooking.rapidAssistantName).to.be.a('string');
      expect(rapidAssistanceBooking.rapidAssistantPhone).to.be.a('string');
    });

    it('should not show assistant details for bookings without rapid assistance', async () => {
      // Create booking without rapid assistance
      const bookingData = {
        hospitalId: testHospital.id,
        resourceType: 'beds',
        patientName: 'Test Patient No Assistant',
        patientAge: 65,
        patientGender: 'male',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'son',
        medicalCondition: 'No assistance needed',
        urgency: 'low',
        estimatedDuration: 24,
        rapidAssistance: false
      };

      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData);

      const noAssistanceBookingId = bookingResponse.body.data.id;

      const response = await request(app)
        .get(`/api/bookings/${noAssistanceBookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      
      const booking = response.body.data;
      expect(booking.rapidAssistance).to.equal(0);
      expect(booking.rapidAssistanceCharge).to.equal(0);
      expect(booking.rapidAssistantName).to.be.null;
      expect(booking.rapidAssistantPhone).to.be.null;
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should reject booking creation with rapid assistance for patient under 60', async () => {
      const bookingData = {
        hospitalId: testHospital.id,
        resourceType: 'beds',
        patientName: 'Test Patient Young',
        patientAge: 25,
        patientGender: 'male',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'brother',
        medicalCondition: 'Young patient test',
        urgency: 'medium',
        estimatedDuration: 24,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authTokenUnder60}`)
        .send(bookingData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Rapid Assistance is only available for patients aged 60 and above');
    });

    it('should handle missing patient age when rapid assistance is requested', async () => {
      const bookingData = {
        hospitalId: testHospital.id,
        resourceType: 'beds',
        patientName: 'Test Patient No Age',
        // patientAge is missing
        patientGender: 'female',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'sister',
        medicalCondition: 'Missing age test',
        urgency: 'medium',
        estimatedDuration: 24,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Patient age is required to determine Rapid Assistance eligibility');
    });

    it('should handle invalid age type when rapid assistance is requested', async () => {
      const bookingData = {
        hospitalId: testHospital.id,
        resourceType: 'beds',
        patientName: 'Test Patient Invalid Age',
        patientAge: 'sixty-five', // Invalid type
        patientGender: 'male',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'son',
        medicalCondition: 'Invalid age test',
        urgency: 'medium',
        estimatedDuration: 24,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Patient age is required to determine Rapid Assistance eligibility');
    });

    it('should handle payment for non-existent booking', async () => {
      const response = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bookingId: 99999, // Non-existent booking
          transactionId: `TXN_NONEXISTENT_${Date.now()}`,
          rapidAssistance: true
        })
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Booking not found');
    });

    it('should prevent payment for booking owned by different user', async () => {
      // Create booking with one user
      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hospitalId: testHospital.id,
          resourceType: 'beds',
          patientName: 'Test Patient Ownership',
          patientAge: 65,
          patientGender: 'male',
          emergencyContactName: 'Emergency Contact',
          emergencyContactPhone: '+8801234567890',
          emergencyContactRelationship: 'son',
          medicalCondition: 'Ownership test',
          urgency: 'medium',
          estimatedDuration: 24,
          rapidAssistance: true
        });

      const bookingId = bookingResponse.body.data.id;

      // Try to pay with different user
      const response = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authTokenUnder60}`)
        .send({
          bookingId: bookingId,
          transactionId: `TXN_OWNERSHIP_${Date.now()}`,
          rapidAssistance: true
        })
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('You can only pay for your own bookings');
    });
  });
});