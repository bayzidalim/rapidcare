const { expect } = require('chai');
const sinon = require('sinon');
const request = require('supertest');
const express = require('express');
const bookingController = require('../../controllers/bookingController');
const BookingService = require('../../services/bookingService');
const ValidationService = require('../../services/validationService');
const SecurityUtils = require('../../utils/securityUtils');
const AuditService = require('../../services/auditService');

describe('BookingController', () => {
  let app;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Create Express app for testing
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = { id: 1, userType: 'user', hospital_id: null };
      req.ip = '127.0.0.1';
      next();
    });
    
    // Add routes
    app.post('/bookings', bookingController.createBooking);
    app.get('/bookings/:id', bookingController.getBookingById);
    app.put('/bookings/:id/status', bookingController.updateBookingStatus);
    app.put('/bookings/:id/approve', bookingController.approveBooking);
    app.put('/bookings/:id/decline', bookingController.declineBooking);
    app.delete('/bookings/:id', bookingController.cancelBooking);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('POST /bookings', () => {
    it('should create booking with valid data', async () => {
      const bookingData = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'John Doe',
        patientAge: 30,
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 48
      };

      const mockBooking = { id: 1, ...bookingData, bookingReference: 'BK-20241201-ABC123' };

      // Mock rate limiting
      sandbox.stub(SecurityUtils, 'checkRateLimit').returns({ allowed: true, remaining: 2 });
      
      // Mock validation
      sandbox.stub(ValidationService, 'validateAndSanitizeBooking').returns({
        isValid: true,
        data: bookingData
      });
      
      sandbox.stub(ValidationService, 'validateHospitalBookingAccess').returns({ isValid: true });
      sandbox.stub(ValidationService, 'validateResourceAvailability').returns({ isValid: true });
      
      // Mock security checks
      sandbox.stub(SecurityUtils, 'detectSuspiciousActivity').returns({
        isSuspicious: false,
        indicators: [],
        riskLevel: 'low'
      });
      
      sandbox.stub(SecurityUtils, 'generateBookingReference').returns('BK-20241201-ABC123');
      
      // Mock service
      sandbox.stub(BookingService, 'create').returns(mockBooking);
      
      // Mock audit logging
      sandbox.stub(AuditService, 'logBookingSecurityEvent').returns({ success: true });

      const response = await request(app)
        .post('/bookings')
        .send(bookingData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('id', 1);
      expect(response.body.data).to.have.property('bookingReference');
    });

    it('should reject booking when rate limited', async () => {
      const bookingData = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'John Doe',
        patientAge: 30,
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 48
      };

      // Mock rate limiting exceeded
      sandbox.stub(SecurityUtils, 'checkRateLimit').returns({ 
        allowed: false, 
        retryAfter: 300,
        remaining: 0
      });
      
      sandbox.stub(AuditService, 'logRateLimitEvent').returns({ success: true });

      const response = await request(app)
        .post('/bookings')
        .send(bookingData)
        .expect(429);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Too many booking requests');
      expect(response.body.retryAfter).to.equal(300);
    });

    it('should reject booking with validation errors', async () => {
      const invalidBookingData = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: '', // Invalid
        patientAge: 30,
        patientGender: 'male'
      };

      sandbox.stub(SecurityUtils, 'checkRateLimit').returns({ allowed: true, remaining: 2 });
      
      // Mock validation failure
      sandbox.stub(ValidationService, 'validateAndSanitizeBooking').returns({
        isValid: false,
        errors: ['Patient name is required']
      });
      
      sandbox.stub(AuditService, 'logBookingSecurityEvent').returns({ success: true });

      const response = await request(app)
        .post('/bookings')
        .send(invalidBookingData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Validation failed');
      expect(response.body.details).to.include('Patient name is required');
    });

    it('should reject booking for inactive hospital', async () => {
      const bookingData = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'John Doe',
        patientAge: 30,
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 48
      };

      sandbox.stub(SecurityUtils, 'checkRateLimit').returns({ allowed: true, remaining: 2 });
      
      sandbox.stub(ValidationService, 'validateAndSanitizeBooking').returns({
        isValid: true,
        data: bookingData
      });
      
      // Mock hospital access failure
      sandbox.stub(ValidationService, 'validateHospitalBookingAccess').returns({
        isValid: false,
        error: 'Hospital is currently inactive'
      });

      const response = await request(app)
        .post('/bookings')
        .send(bookingData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Hospital is currently inactive');
    });

    it('should reject booking when resources unavailable', async () => {
      const bookingData = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'John Doe',
        patientAge: 30,
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 48
      };

      sandbox.stub(SecurityUtils, 'checkRateLimit').returns({ allowed: true, remaining: 2 });
      
      sandbox.stub(ValidationService, 'validateAndSanitizeBooking').returns({
        isValid: true,
        data: bookingData
      });
      
      sandbox.stub(ValidationService, 'validateHospitalBookingAccess').returns({ isValid: true });
      
      // Mock resource unavailability
      sandbox.stub(ValidationService, 'validateResourceAvailability').returns({
        isValid: false,
        error: 'No beds available'
      });

      const response = await request(app)
        .post('/bookings')
        .send(bookingData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('No beds available');
    });

    it('should reject high-risk suspicious booking', async () => {
      const bookingData = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'John Doe',
        patientAge: 30,
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 48
      };

      sandbox.stub(SecurityUtils, 'checkRateLimit').returns({ allowed: true, remaining: 2 });
      
      sandbox.stub(ValidationService, 'validateAndSanitizeBooking').returns({
        isValid: true,
        data: bookingData
      });
      
      sandbox.stub(ValidationService, 'validateHospitalBookingAccess').returns({ isValid: true });
      sandbox.stub(ValidationService, 'validateResourceAvailability').returns({ isValid: true });
      
      // Mock high-risk suspicious activity
      sandbox.stub(SecurityUtils, 'detectSuspiciousActivity').returns({
        isSuspicious: true,
        indicators: ['Rapid booking attempts', 'Suspicious data patterns'],
        riskLevel: 'high'
      });
      
      sandbox.stub(AuditService, 'logSuspiciousBookingActivity').returns({ success: true });

      const response = await request(app)
        .post('/bookings')
        .send(bookingData)
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('flagged for security review');
    });
  });

  describe('PUT /bookings/:id/status', () => {
    beforeEach(() => {
      // Mock hospital authority user
      app.use((req, res, next) => {
        req.user = { id: 2, userType: 'hospital-authority', hospital_id: 1 };
        next();
      });
    });

    it('should update booking status with valid transition', async () => {
      const mockBooking = { id: 1, status: 'pending', hospitalId: 1 };
      const mockUpdatedBooking = { id: 1, status: 'approved', hospitalId: 1 };

      sandbox.stub(BookingService, 'getById')
        .onFirstCall().returns(mockBooking)
        .onSecondCall().returns(mockUpdatedBooking);
      
      sandbox.stub(ValidationService, 'validateBookingStatusTransition').returns(true);
      sandbox.stub(SecurityUtils, 'sanitizeInput').returns('Approved for admission');
      sandbox.stub(BookingService, 'updateStatus').returns(true);
      sandbox.stub(AuditService, 'logBookingSecurityEvent').returns({ success: true });

      const response = await request(app)
        .put('/bookings/1/status')
        .send({ status: 'approved', notes: 'Approved for admission' })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.status).to.equal('approved');
    });

    it('should reject invalid status transition', async () => {
      const mockBooking = { id: 1, status: 'completed', hospitalId: 1 };

      sandbox.stub(BookingService, 'getById').returns(mockBooking);
      sandbox.stub(ValidationService, 'validateBookingStatusTransition').returns(false);
      sandbox.stub(AuditService, 'logBookingSecurityEvent').returns({ success: true });

      const response = await request(app)
        .put('/bookings/1/status')
        .send({ status: 'pending' })
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Invalid status transition');
    });

    it('should return 404 for non-existent booking', async () => {
      sandbox.stub(BookingService, 'getById').returns(null);

      const response = await request(app)
        .put('/bookings/999/status')
        .send({ status: 'approved' })
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Booking not found');
    });
  });

  describe('PUT /bookings/:id/approve', () => {
    beforeEach(() => {
      // Mock hospital authority user
      app.use((req, res, next) => {
        req.user = { id: 2, userType: 'hospital-authority', hospital_id: 1 };
        next();
      });
    });

    it('should approve booking successfully', async () => {
      const mockBooking = { id: 1, status: 'pending', hospitalId: 1 };
      const mockApprovedBooking = { id: 1, status: 'approved', hospitalId: 1 };

      sandbox.stub(BookingService, 'getById').returns(mockBooking);
      sandbox.stub(SecurityUtils, 'sanitizeInput').returns('Approved for admission');
      sandbox.stub(ValidationService, 'validateResourceAvailability').returns({ isValid: true });
      sandbox.stub(BookingService, 'approve').returns(mockApprovedBooking);
      sandbox.stub(AuditService, 'logBookingAccess').returns({ success: true });
      sandbox.stub(AuditService, 'logBookingSecurityEvent').returns({ success: true });

      const response = await request(app)
        .put('/bookings/1/approve')
        .send({ notes: 'Approved for admission', resourcesAllocated: 1 })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.status).to.equal('approved');
    });

    it('should reject approval of non-pending booking', async () => {
      const mockBooking = { id: 1, status: 'approved', hospitalId: 1 };

      sandbox.stub(BookingService, 'getById').returns(mockBooking);
      sandbox.stub(AuditService, 'logBookingAccess').returns({ success: true });

      const response = await request(app)
        .put('/bookings/1/approve')
        .send({ notes: 'Approved for admission' })
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Invalid status: approved');
    });

    it('should reject approval by unauthorized hospital authority', async () => {
      const mockBooking = { id: 1, status: 'pending', hospitalId: 2 }; // Different hospital

      // Mock user from different hospital
      app.use((req, res, next) => {
        req.user = { id: 2, userType: 'hospital-authority', hospital_id: 1 };
        next();
      });

      sandbox.stub(BookingService, 'getById').returns(mockBooking);
      sandbox.stub(AuditService, 'logBookingAccess').returns({ success: true });

      const response = await request(app)
        .put('/bookings/1/approve')
        .send({ notes: 'Approved for admission' })
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('You can only approve bookings for your assigned hospital');
    });

    it('should reject approval when resources become unavailable', async () => {
      const mockBooking = { id: 1, status: 'pending', hospitalId: 1 };

      sandbox.stub(BookingService, 'getById').returns(mockBooking);
      sandbox.stub(SecurityUtils, 'sanitizeInput').returns('Approved for admission');
      
      // Mock resource unavailability
      sandbox.stub(ValidationService, 'validateResourceAvailability').returns({
        isValid: false,
        error: 'Resources no longer available'
      });

      const response = await request(app)
        .put('/bookings/1/approve')
        .send({ notes: 'Approved for admission' })
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Resources no longer available');
    });
  });

  describe('PUT /bookings/:id/decline', () => {
    beforeEach(() => {
      // Mock hospital authority user
      app.use((req, res, next) => {
        req.user = { id: 2, userType: 'hospital-authority', hospital_id: 1 };
        next();
      });
    });

    it('should decline booking with reason', async () => {
      const mockBooking = { id: 1, status: 'pending', hospitalId: 1 };
      const mockDeclinedBooking = { id: 1, status: 'declined', hospitalId: 1 };

      sandbox.stub(BookingService, 'getById').returns(mockBooking);
      sandbox.stub(BookingService, 'decline').returns(mockDeclinedBooking);

      const response = await request(app)
        .put('/bookings/1/decline')
        .send({ reason: 'No beds available', notes: 'All beds occupied' })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.status).to.equal('declined');
    });

    it('should reject decline without reason', async () => {
      const mockBooking = { id: 1, status: 'pending', hospitalId: 1 };

      sandbox.stub(BookingService, 'getById').returns(mockBooking);

      const response = await request(app)
        .put('/bookings/1/decline')
        .send({ notes: 'All beds occupied' }) // Missing reason
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Decline reason is required');
    });
  });

  describe('DELETE /bookings/:id', () => {
    it('should cancel own booking as user', async () => {
      const mockBooking = { id: 1, userId: 1, status: 'pending', hospitalName: 'Test Hospital' };
      const mockCancelledBooking = { id: 1, status: 'cancelled' };

      // Mock regular user
      app.use((req, res, next) => {
        req.user = { id: 1, userType: 'user' };
        next();
      });

      sandbox.stub(BookingService, 'cancel').returns(mockCancelledBooking);

      const response = await request(app)
        .delete('/bookings/1')
        .send({ reason: 'Change of plans' })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.status).to.equal('cancelled');
    });

    it('should handle booking service errors', async () => {
      // Mock regular user
      app.use((req, res, next) => {
        req.user = { id: 1, userType: 'user' };
        next();
      });

      sandbox.stub(BookingService, 'cancel').throws(new Error('Booking not found'));
      sandbox.stub(AuditService, 'logBookingSecurityEvent').returns({ success: true });

      const response = await request(app)
        .delete('/bookings/1')
        .send({ reason: 'Change of plans' })
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Booking not found');
    });
  });

  describe('GET /bookings/:id', () => {
    it('should return booking details', async () => {
      const mockBooking = { 
        id: 1, 
        userId: 1, 
        patientName: 'John Doe',
        status: 'pending',
        hospitalName: 'Test Hospital'
      };

      sandbox.stub(BookingService, 'getById').returns(mockBooking);

      const response = await request(app)
        .get('/bookings/1')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.deep.equal(mockBooking);
    });

    it('should return 404 for non-existent booking', async () => {
      sandbox.stub(BookingService, 'getById').returns(null);

      const response = await request(app)
        .get('/bookings/999')
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Booking not found');
    });
  });
});