const { describe, it, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const db = require('../../config/database');
const BookingStatusHistory = require('../../models/BookingStatusHistory');

describe('BookingStatusHistory Model', () => {
  let testHospitalId, testUserId, testBookingId;

  beforeEach(() => {
    // Create test data
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

    const userStmt = db.prepare(`
      INSERT INTO users (email, password, name, userType)
      VALUES (?, ?, ?, ?)
    `);
    const userResult = userStmt.run(
      'test@user.com',
      'hashedpassword',
      'Test User',
      'hospital-authority'
    );
    testUserId = userResult.lastInsertRowid;

    const bookingStmt = db.prepare(`
      INSERT INTO bookings (userId, hospitalId, resourceType, patientName, patientAge, 
                           patientGender, medicalCondition, scheduledDate, paymentAmount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const bookingResult = bookingStmt.run(
      testUserId,
      testHospitalId,
      'beds',
      'Test Patient',
      30,
      'male',
      'Test condition',
      '2024-01-01 10:00:00',
      100.00,
      'pending'
    );
    testBookingId = bookingResult.lastInsertRowid;
  });

  afterEach(() => {
    // Clean up test data
    db.exec('DELETE FROM booking_status_history');
    db.exec('DELETE FROM bookings');
    db.exec('DELETE FROM users');
    db.exec('DELETE FROM hospitals');
  });

  describe('create', () => {
    it('should create a new status history entry', () => {
      const historyData = {
        bookingId: testBookingId,
        oldStatus: 'pending',
        newStatus: 'approved',
        changedBy: testUserId,
        reason: 'Booking approved by hospital authority',
        notes: 'Patient meets all requirements'
      };

      const historyId = BookingStatusHistory.create(historyData);
      expect(historyId).to.be.a('number');
      expect(historyId).to.be.greaterThan(0);

      // Verify the history was created
      const history = BookingStatusHistory.findById(historyId);
      expect(history).to.not.be.null;
      expect(history.bookingId).to.equal(testBookingId);
      expect(history.oldStatus).to.equal('pending');
      expect(history.newStatus).to.equal('approved');
      expect(history.changedBy).to.equal(testUserId);
      expect(history.reason).to.equal('Booking approved by hospital authority');
      expect(history.notes).to.equal('Patient meets all requirements');
    });

    it('should create history entry without optional fields', () => {
      const historyData = {
        bookingId: testBookingId,
        oldStatus: 'pending',
        newStatus: 'declined',
        changedBy: testUserId
      };

      const historyId = BookingStatusHistory.create(historyData);
      const history = BookingStatusHistory.findById(historyId);
      
      expect(history.reason).to.be.null;
      expect(history.notes).to.be.null;
    });
  });

  describe('findById', () => {
    it('should return status history with related data', () => {
      const historyId = BookingStatusHistory.create({
        bookingId: testBookingId,
        oldStatus: 'pending',
        newStatus: 'approved',
        changedBy: testUserId,
        reason: 'Test approval'
      });

      const history = BookingStatusHistory.findById(historyId);
      expect(history).to.not.be.null;
      expect(history.changedByName).to.equal('Test User');
      expect(history.patientName).to.equal('Test Patient');
      expect(history.hospitalName).to.equal('Test Hospital');
    });

    it('should return null for non-existent history', () => {
      const history = BookingStatusHistory.findById(99999);
      expect(history).to.be.null;
    });
  });

  describe('getByBooking', () => {
    beforeEach(() => {
      // Create multiple status changes for the booking
      BookingStatusHistory.create({
        bookingId: testBookingId,
        oldStatus: null,
        newStatus: 'pending',
        changedBy: testUserId,
        reason: 'Booking created'
      });

      BookingStatusHistory.create({
        bookingId: testBookingId,
        oldStatus: 'pending',
        newStatus: 'approved',
        changedBy: testUserId,
        reason: 'Booking approved'
      });

      BookingStatusHistory.create({
        bookingId: testBookingId,
        oldStatus: 'approved',
        newStatus: 'completed',
        changedBy: testUserId,
        reason: 'Booking completed'
      });
    });

    it('should return all status changes for a booking in chronological order', () => {
      const history = BookingStatusHistory.getByBooking(testBookingId);
      expect(history).to.be.an('array');
      expect(history).to.have.length(3);
      
      // Should be ordered by timestamp ASC
      expect(history[0].newStatus).to.equal('pending');
      expect(history[1].newStatus).to.equal('approved');
      expect(history[2].newStatus).to.equal('completed');
    });

    it('should include user information', () => {
      const history = BookingStatusHistory.getByBooking(testBookingId);
      expect(history[0].changedByName).to.equal('Test User');
      expect(history[0].changedByType).to.equal('hospital-authority');
    });
  });

  describe('getByHospital', () => {
    let testBookingId2;

    beforeEach(() => {
      // Create another booking
      const bookingStmt = db.prepare(`
        INSERT INTO bookings (userId, hospitalId, resourceType, patientName, patientAge, 
                             patientGender, medicalCondition, scheduledDate, paymentAmount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const bookingResult = bookingStmt.run(
        testUserId,
        testHospitalId,
        'icu',
        'Another Patient',
        25,
        'female',
        'Another condition',
        '2024-01-02 10:00:00',
        200.00,
        'pending'
      );
      testBookingId2 = bookingResult.lastInsertRowid;

      // Create status histories
      BookingStatusHistory.create({
        bookingId: testBookingId,
        oldStatus: 'pending',
        newStatus: 'approved',
        changedBy: testUserId,
        reason: 'First booking approved'
      });

      BookingStatusHistory.create({
        bookingId: testBookingId2,
        oldStatus: 'pending',
        newStatus: 'declined',
        changedBy: testUserId,
        reason: 'Second booking declined'
      });
    });

    it('should return all status changes for a hospital', () => {
      const history = BookingStatusHistory.getByHospital(testHospitalId);
      expect(history).to.be.an('array');
      expect(history).to.have.length(2);
    });

    it('should filter by status', () => {
      const approvedHistory = BookingStatusHistory.getByHospital(testHospitalId, {
        status: 'approved'
      });
      expect(approvedHistory).to.have.length(1);
      expect(approvedHistory[0].newStatus).to.equal('approved');

      const declinedHistory = BookingStatusHistory.getByHospital(testHospitalId, {
        status: 'declined'
      });
      expect(declinedHistory).to.have.length(1);
      expect(declinedHistory[0].newStatus).to.equal('declined');
    });

    it('should limit results', () => {
      const history = BookingStatusHistory.getByHospital(testHospitalId, {
        limit: 1
      });
      expect(history).to.have.length(1);
    });
  });

  describe('logApproval', () => {
    it('should create approval log entry', () => {
      const historyId = BookingStatusHistory.logApproval(
        testBookingId,
        testUserId,
        'Patient approved for admission'
      );

      const history = BookingStatusHistory.findById(historyId);
      expect(history.oldStatus).to.equal('pending');
      expect(history.newStatus).to.equal('approved');
      expect(history.reason).to.equal('Booking approved by hospital authority');
      expect(history.notes).to.equal('Patient approved for admission');
    });
  });

  describe('logDecline', () => {
    it('should create decline log entry', () => {
      const historyId = BookingStatusHistory.logDecline(
        testBookingId,
        testUserId,
        'Insufficient resources',
        'No beds available at requested time'
      );

      const history = BookingStatusHistory.findById(historyId);
      expect(history.oldStatus).to.equal('pending');
      expect(history.newStatus).to.equal('declined');
      expect(history.reason).to.equal('Insufficient resources');
      expect(history.notes).to.equal('No beds available at requested time');
    });
  });

  describe('getApprovalStatistics', () => {
    beforeEach(() => {
      // Create multiple bookings and approvals for statistics
      const booking2Stmt = db.prepare(`
        INSERT INTO bookings (userId, hospitalId, resourceType, patientName, patientAge, 
                             patientGender, medicalCondition, scheduledDate, paymentAmount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const booking2Result = booking2Stmt.run(
        testUserId, testHospitalId, 'icu', 'Patient 2', 35, 'male',
        'Condition 2', '2024-01-02 10:00:00', 150.00, 'pending'
      );
      const testBookingId2 = booking2Result.lastInsertRowid;

      // Create approval/decline history
      BookingStatusHistory.create({
        bookingId: testBookingId,
        oldStatus: 'pending',
        newStatus: 'approved',
        changedBy: testUserId,
        reason: 'Approved'
      });

      BookingStatusHistory.create({
        bookingId: testBookingId2,
        oldStatus: 'pending',
        newStatus: 'declined',
        changedBy: testUserId,
        reason: 'Declined'
      });
    });

    it('should return approval statistics', () => {
      const stats = BookingStatusHistory.getApprovalStatistics(testHospitalId);
      expect(stats).to.be.an('array');
      expect(stats.length).to.equal(2);

      const approvedStats = stats.find(s => s.newStatus === 'approved');
      const declinedStats = stats.find(s => s.newStatus === 'declined');

      expect(approvedStats.statusCount).to.equal(1);
      expect(declinedStats.statusCount).to.equal(1);
    });
  });

  describe('getRecentChanges', () => {
    beforeEach(() => {
      // Create multiple status changes
      for (let i = 0; i < 15; i++) {
        BookingStatusHistory.create({
          bookingId: testBookingId,
          oldStatus: 'pending',
          newStatus: 'approved',
          changedBy: testUserId,
          reason: `Change ${i}`
        });
      }
    });

    it('should return recent changes with default limit', () => {
      const recent = BookingStatusHistory.getRecentChanges(testHospitalId);
      expect(recent).to.be.an('array');
      expect(recent).to.have.length(10); // Default limit
    });

    it('should return recent changes with custom limit', () => {
      const recent = BookingStatusHistory.getRecentChanges(testHospitalId, 5);
      expect(recent).to.have.length(5);
    });
  });

  describe('count', () => {
    beforeEach(() => {
      BookingStatusHistory.create({
        bookingId: testBookingId,
        oldStatus: 'pending',
        newStatus: 'approved',
        changedBy: testUserId,
        reason: 'Test approval'
      });
    });

    it('should return total count for hospital', () => {
      const count = BookingStatusHistory.count(testHospitalId);
      expect(count).to.equal(1);
    });

    it('should return filtered count', () => {
      const count = BookingStatusHistory.count(testHospitalId, {
        status: 'approved'
      });
      expect(count).to.equal(1);

      const countDeclined = BookingStatusHistory.count(testHospitalId, {
        status: 'declined'
      });
      expect(countDeclined).to.equal(0);
    });
  });
});