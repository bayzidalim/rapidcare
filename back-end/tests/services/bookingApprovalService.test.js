const { describe, it, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const db = require('../../config/database');
const BookingApprovalService = require('../../services/bookingApprovalService');

describe('BookingApprovalService', () => {
  let testHospitalId, testUserId, testAuthorityId, testBookingId;

  beforeEach(() => {
    // Create test hospital
    const hospitalStmt = db.prepare(`
      INSERT INTO hospitals (name, city, state, country, phone, email, emergency)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const hospitalResult = hospitalStmt.run(
      'Test Hospital',
      'Test City',
      'Test State',
      'Test Country',
      '123-456-7890',
      'test@hospital.com',
      '911'
    );
    testHospitalId = hospitalResult.lastInsertRowid;

    // Create test user (patient)
    const userStmt = db.prepare(`
      INSERT INTO users (email, password, name, userType)
      VALUES (?, ?, ?, ?)
    `);
    const userResult = userStmt.run(
      'patient@test.com',
      'hashedpassword',
      'Test Patient',
      'user'
    );
    testUserId = userResult.lastInsertRowid;

    // Create hospital authority user
    const authorityResult = userStmt.run(
      'authority@test.com',
      'hashedpassword',
      'Hospital Authority',
      'hospital-authority'
    );
    testAuthorityId = authorityResult.lastInsertRowid;

    // Create hospital authority relationship
    const authorityStmt = db.prepare(`
      INSERT INTO hospital_authorities (userId, hospitalId, role, permissions)
      VALUES (?, ?, ?, ?)
    `);
    authorityStmt.run(testAuthorityId, testHospitalId, 'manager', '["manage_bookings"]');

    // Create hospital resources
    const resourceStmt = db.prepare(`
      INSERT INTO hospital_resources (hospitalId, resourceType, total, available, occupied)
      VALUES (?, ?, ?, ?, ?)
    `);
    resourceStmt.run(testHospitalId, 'beds', 50, 30, 20);
    resourceStmt.run(testHospitalId, 'icu', 10, 5, 5);
    resourceStmt.run(testHospitalId, 'operationTheatres', 5, 2, 3);

    // Create test booking
    const bookingStmt = db.prepare(`
      INSERT INTO bookings (userId, hospitalId, resourceType, patientName, patientAge, 
                           patientGender, emergencyContactName, emergencyContactPhone,
                           emergencyContactRelationship, medicalCondition, urgency,
                           scheduledDate, estimatedDuration, paymentAmount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const bookingResult = bookingStmt.run(
      testUserId,
      testHospitalId,
      'beds',
      'John Doe',
      35,
      'male',
      'Jane Doe',
      '555-0123',
      'spouse',
      'Chest pain',
      'high',
      '2024-01-01 10:00:00',
      24,
      150.00,
      'pending'
    );
    testBookingId = bookingResult.lastInsertRowid;
  });

  afterEach(() => {
    // Clean up test data
    db.exec('DELETE FROM booking_status_history');
    db.exec('DELETE FROM resource_audit_log');
    db.exec('DELETE FROM bookings');
    db.exec('DELETE FROM hospital_resources');
    db.exec('DELETE FROM hospital_authorities');
    db.exec('DELETE FROM users');
    db.exec('DELETE FROM hospitals');
  });

  describe('getPendingBookings', () => {
    it('should return pending bookings for a hospital', async () => {
      const result = await BookingApprovalService.getPendingBookings(testHospitalId);

      expect(result.success).to.be.true;
      expect(result.data.bookings).to.be.an('array');
      expect(result.data.bookings).to.have.length(1);
      expect(result.data.totalCount).to.equal(1);
      
      const booking = result.data.bookings[0];
      expect(booking.id).to.equal(testBookingId);
      expect(booking.status).to.equal('pending');
      expect(booking.userName).to.equal('Test Patient');
      expect(booking.resourceAvailability).to.be.an('object');
      expect(booking.canApprove).to.be.a('boolean');
    });

    it('should filter bookings by urgency', async () => {
      // Create another booking with different urgency
      const bookingStmt = db.prepare(`
        INSERT INTO bookings (userId, hospitalId, resourceType, patientName, patientAge, 
                             patientGender, emergencyContactName, emergencyContactPhone,
                             emergencyContactRelationship, medicalCondition, urgency,
                             scheduledDate, estimatedDuration, paymentAmount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      bookingStmt.run(
        testUserId, testHospitalId, 'icu', 'Jane Smith', 28, 'female',
        'John Smith', '555-0124', 'spouse', 'Emergency surgery', 'critical',
        '2024-01-01 12:00:00', 48, 300.00, 'pending'
      );

      const result = await BookingApprovalService.getPendingBookings(testHospitalId, {
        urgency: 'critical'
      });

      expect(result.success).to.be.true;
      expect(result.data.bookings).to.have.length(1);
      expect(result.data.bookings[0].urgency).to.equal('critical');
    });

    it('should filter bookings by resource type', async () => {
      const result = await BookingApprovalService.getPendingBookings(testHospitalId, {
        resourceType: 'beds'
      });

      expect(result.success).to.be.true;
      expect(result.data.bookings).to.have.length(1);
      expect(result.data.bookings[0].resourceType).to.equal('beds');
    });

    it('should limit results', async () => {
      // Create multiple bookings
      const bookingStmt = db.prepare(`
        INSERT INTO bookings (userId, hospitalId, resourceType, patientName, patientAge, 
                             patientGender, emergencyContactName, emergencyContactPhone,
                             emergencyContactRelationship, medicalCondition, urgency,
                             scheduledDate, estimatedDuration, paymentAmount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (let i = 0; i < 5; i++) {
        bookingStmt.run(
          testUserId, testHospitalId, 'beds', `Patient ${i}`, 30, 'male',
          'Emergency Contact', '555-0000', 'family', 'Test condition', 'medium',
          '2024-01-01 10:00:00', 24, 100.00, 'pending'
        );
      }

      const result = await BookingApprovalService.getPendingBookings(testHospitalId, {
        limit: 3
      });

      expect(result.success).to.be.true;
      expect(result.data.bookings).to.have.length(3);
    });

    it('should handle non-existent hospital', async () => {
      const result = await BookingApprovalService.getPendingBookings(99999);

      expect(result.success).to.be.false;
      expect(result.message).to.include('Hospital not found');
    });
  });

  describe('approveBooking', () => {
    it('should successfully approve a booking', async () => {
      const approvalData = {
        notes: 'Patient approved for admission',
        resourcesAllocated: 1,
        autoAllocateResources: true
      };

      const result = await BookingApprovalService.approveBooking(
        testBookingId,
        testAuthorityId,
        approvalData
      );

      expect(result.success).to.be.true;
      expect(result.data.booking.status).to.equal('approved');
      expect(result.data.booking.approvedBy).to.equal(testAuthorityId);
      expect(result.data.resourcesAllocated).to.equal(1);

      // Verify resource allocation
      const resourceStmt = db.prepare(`
        SELECT available FROM hospital_resources 
        WHERE hospitalId = ? AND resourceType = 'beds'
      `);
      const resource = resourceStmt.get(testHospitalId);
      expect(resource.available).to.equal(29); // 30 - 1
    });

    it('should fail to approve non-existent booking', async () => {
      const result = await BookingApprovalService.approveBooking(
        99999,
        testAuthorityId,
        { notes: 'Test approval' }
      );

      expect(result.success).to.be.false;
      expect(result.message).to.include('Booking not found');
    });

    it('should fail to approve already approved booking', async () => {
      // First approval
      await BookingApprovalService.approveBooking(
        testBookingId,
        testAuthorityId,
        { notes: 'First approval' }
      );

      // Second approval attempt
      const result = await BookingApprovalService.approveBooking(
        testBookingId,
        testAuthorityId,
        { notes: 'Second approval' }
      );

      expect(result.success).to.be.false;
      expect(result.message).to.include('Cannot approve booking with status: approved');
    });

    it('should fail when insufficient resources', async () => {
      // Update resources to have no availability
      const updateStmt = db.prepare(`
        UPDATE hospital_resources 
        SET available = 0 
        WHERE hospitalId = ? AND resourceType = 'beds'
      `);
      updateStmt.run(testHospitalId);

      const result = await BookingApprovalService.approveBooking(
        testBookingId,
        testAuthorityId,
        { notes: 'Test approval' }
      );

      expect(result.success).to.be.false;
      expect(result.message).to.include('Insufficient beds available');
    });

    it('should approve without auto resource allocation', async () => {
      const result = await BookingApprovalService.approveBooking(
        testBookingId,
        testAuthorityId,
        {
          notes: 'Manual resource allocation',
          autoAllocateResources: false
        }
      );

      expect(result.success).to.be.true;
      expect(result.data.booking.status).to.equal('approved');

      // Verify resources were NOT allocated
      const resourceStmt = db.prepare(`
        SELECT available FROM hospital_resources 
        WHERE hospitalId = ? AND resourceType = 'beds'
      `);
      const resource = resourceStmt.get(testHospitalId);
      expect(resource.available).to.equal(30); // Unchanged
    });
  });

  describe('declineBooking', () => {
    it('should successfully decline a booking', async () => {
      const declineData = {
        reason: 'Insufficient resources',
        notes: 'No beds available at requested time',
        alternativeSuggestions: [
          'Try City General Hospital',
          'Consider rescheduling for next week'
        ]
      };

      const result = await BookingApprovalService.declineBooking(
        testBookingId,
        testAuthorityId,
        declineData
      );

      expect(result.success).to.be.true;
      expect(result.data.booking.status).to.equal('declined');
      expect(result.data.reason).to.equal('Insufficient resources');
      expect(result.data.alternativeSuggestions).to.have.length(2);
    });

    it('should fail to decline without reason', async () => {
      const result = await BookingApprovalService.declineBooking(
        testBookingId,
        testAuthorityId,
        { notes: 'No reason provided' }
      );

      expect(result.success).to.be.false;
      expect(result.message).to.include('Decline reason is required');
    });

    it('should fail to decline non-existent booking', async () => {
      const result = await BookingApprovalService.declineBooking(
        99999,
        testAuthorityId,
        { reason: 'Test decline' }
      );

      expect(result.success).to.be.false;
      expect(result.message).to.include('Booking not found');
    });
  });

  describe('completeBooking', () => {
    beforeEach(async () => {
      // Approve the booking first
      await BookingApprovalService.approveBooking(
        testBookingId,
        testAuthorityId,
        { notes: 'Approved for testing' }
      );
    });

    it('should successfully complete a booking', async () => {
      const completionData = {
        notes: 'Patient discharged successfully',
        autoReleaseResources: true
      };

      const result = await BookingApprovalService.completeBooking(
        testBookingId,
        testAuthorityId,
        completionData
      );

      expect(result.success).to.be.true;
      expect(result.data.booking.status).to.equal('completed');

      // Verify resources were released
      const resourceStmt = db.prepare(`
        SELECT available FROM hospital_resources 
        WHERE hospitalId = ? AND resourceType = 'beds'
      `);
      const resource = resourceStmt.get(testHospitalId);
      expect(resource.available).to.equal(30); // Back to original
    });

    it('should fail to complete non-approved booking', async () => {
      // Create a pending booking
      const bookingStmt = db.prepare(`
        INSERT INTO bookings (userId, hospitalId, resourceType, patientName, patientAge, 
                             patientGender, emergencyContactName, emergencyContactPhone,
                             emergencyContactRelationship, medicalCondition, urgency,
                             scheduledDate, estimatedDuration, paymentAmount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const pendingBookingResult = bookingStmt.run(
        testUserId, testHospitalId, 'beds', 'Pending Patient', 30, 'male',
        'Contact', '555-0000', 'family', 'Test', 'medium',
        '2024-01-01 10:00:00', 24, 100.00, 'pending'
      );
      const pendingBookingId = pendingBookingResult.lastInsertRowid;

      const result = await BookingApprovalService.completeBooking(
        pendingBookingId,
        testAuthorityId,
        { notes: 'Test completion' }
      );

      expect(result.success).to.be.false;
      expect(result.message).to.include('Cannot complete booking with status: pending');
    });
  });

  describe('cancelBooking', () => {
    it('should successfully cancel a pending booking', async () => {
      const cancellationData = {
        reason: 'Patient request',
        notes: 'Patient no longer needs the service'
      };

      const result = await BookingApprovalService.cancelBooking(
        testBookingId,
        testUserId,
        cancellationData
      );

      expect(result.success).to.be.true;
      expect(result.data.booking.status).to.equal('cancelled');
      expect(result.data.reason).to.equal('Patient request');
    });

    it('should cancel approved booking and release resources', async () => {
      // Approve booking first
      await BookingApprovalService.approveBooking(
        testBookingId,
        testAuthorityId,
        { notes: 'Approved for testing' }
      );

      const cancellationData = {
        reason: 'Emergency change',
        notes: 'Patient transferred to another facility',
        autoReleaseResources: true
      };

      const result = await BookingApprovalService.cancelBooking(
        testBookingId,
        testUserId,
        cancellationData
      );

      expect(result.success).to.be.true;
      expect(result.data.booking.status).to.equal('cancelled');

      // Verify resources were released
      const resourceStmt = db.prepare(`
        SELECT available FROM hospital_resources 
        WHERE hospitalId = ? AND resourceType = 'beds'
      `);
      const resource = resourceStmt.get(testHospitalId);
      expect(resource.available).to.equal(30); // Back to original
    });
  });

  describe('validateBookingApproval', () => {
    it('should validate approvable booking', async () => {
      const result = await BookingApprovalService.validateBookingApproval(
        testBookingId,
        'beds',
        1
      );

      expect(result.valid).to.be.true;
      expect(result.message).to.equal('Booking can be approved');
    });

    it('should reject non-existent booking', async () => {
      const result = await BookingApprovalService.validateBookingApproval(
        99999,
        'beds',
        1
      );

      expect(result.valid).to.be.false;
      expect(result.message).to.include('Booking not found');
    });

    it('should reject resource type mismatch', async () => {
      const result = await BookingApprovalService.validateBookingApproval(
        testBookingId,
        'icu', // Booking is for beds
        1
      );

      expect(result.valid).to.be.false;
      expect(result.message).to.include('Resource type mismatch');
    });

    it('should reject insufficient resources', async () => {
      const result = await BookingApprovalService.validateBookingApproval(
        testBookingId,
        'beds',
        50 // More than available
      );

      expect(result.valid).to.be.false;
      expect(result.message).to.include('Insufficient resources');
    });
  });

  describe('getBookingHistory', () => {
    beforeEach(async () => {
      // Create some booking history
      await BookingApprovalService.approveBooking(
        testBookingId,
        testAuthorityId,
        { notes: 'Approved for testing' }
      );
      
      await BookingApprovalService.completeBooking(
        testBookingId,
        testAuthorityId,
        { notes: 'Completed successfully' }
      );
    });

    it('should return booking history for hospital', async () => {
      const result = await BookingApprovalService.getBookingHistory(testHospitalId);

      expect(result.success).to.be.true;
      expect(result.data.bookings).to.be.an('array');
      expect(result.data.bookings).to.have.length(1);
      expect(result.data.totalCount).to.equal(1);
      
      const booking = result.data.bookings[0];
      expect(booking.status).to.equal('completed');
      expect(booking.approvedByName).to.equal('Hospital Authority');
    });

    it('should filter history by status', async () => {
      const result = await BookingApprovalService.getBookingHistory(testHospitalId, {
        status: 'completed'
      });

      expect(result.success).to.be.true;
      expect(result.data.bookings).to.have.length(1);
      expect(result.data.bookings[0].status).to.equal('completed');
    });

    it('should paginate results', async () => {
      const result = await BookingApprovalService.getBookingHistory(testHospitalId, {
        limit: 10,
        offset: 0
      });

      expect(result.success).to.be.true;
      expect(result.data.currentPage).to.equal(1);
      expect(result.data.totalPages).to.be.a('number');
    });
  });

  describe('getBookingAnalytics', () => {
    beforeEach(async () => {
      // Create some analytics data
      await BookingApprovalService.approveBooking(
        testBookingId,
        testAuthorityId,
        { notes: 'Approved for analytics' }
      );
    });

    it('should return booking analytics', async () => {
      const result = await BookingApprovalService.getBookingAnalytics(testHospitalId);

      expect(result.success).to.be.true;
      expect(result.data.approvalStatistics).to.be.an('array');
      expect(result.data.resourceStatistics).to.be.an('array');
      expect(result.data.recentActivity).to.be.an('array');
      expect(result.data.averageResponseTime).to.be.an('object');
      expect(result.data.hospitalId).to.equal(testHospitalId);
    });

    it('should include response time analytics', async () => {
      const result = await BookingApprovalService.getBookingAnalytics(testHospitalId);

      expect(result.success).to.be.true;
      expect(result.data.averageResponseTime.hours).to.be.a('number');
      expect(result.data.averageResponseTime.totalProcessed).to.be.a('number');
    });
  });

  describe('processExpiredBookings', () => {
    beforeEach(() => {
      // Create an expired booking
      const expiredBookingStmt = db.prepare(`
        INSERT INTO bookings (userId, hospitalId, resourceType, patientName, patientAge, 
                             patientGender, emergencyContactName, emergencyContactPhone,
                             emergencyContactRelationship, medicalCondition, urgency,
                             scheduledDate, estimatedDuration, paymentAmount, status, expiresAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      expiredBookingStmt.run(
        testUserId, testHospitalId, 'beds', 'Expired Patient', 30, 'male',
        'Contact', '555-0000', 'family', 'Test', 'medium',
        '2024-01-01 10:00:00', 24, 100.00, 'pending',
        '2023-12-31 23:59:59' // Expired
      );
    });

    it('should process expired bookings for specific hospital', async () => {
      const result = await BookingApprovalService.processExpiredBookings(testHospitalId);

      expect(result.success).to.be.true;
      expect(result.data.processedCount).to.equal(1);
      expect(result.data.results).to.have.length(1);
      expect(result.data.results[0].result.success).to.be.true;
    });

    it('should process all expired bookings when no hospital specified', async () => {
      const result = await BookingApprovalService.processExpiredBookings();

      expect(result.success).to.be.true;
      expect(result.data.processedCount).to.be.a('number');
      expect(result.data.results).to.be.an('array');
    });
  });
});