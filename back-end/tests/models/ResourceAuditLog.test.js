const { describe, it, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const db = require('../../config/database');
const ResourceAuditLog = require('../../models/ResourceAuditLog');

describe('ResourceAuditLog Model', () => {
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
                           patientGender, medicalCondition, scheduledDate, paymentAmount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      100.00
    );
    testBookingId = bookingResult.lastInsertRowid;
  });

  afterEach(() => {
    // Clean up test data
    db.exec('DELETE FROM resource_audit_log');
    db.exec('DELETE FROM bookings');
    db.exec('DELETE FROM users');
    db.exec('DELETE FROM hospitals');
  });

  describe('create', () => {
    it('should create a new audit log entry', () => {
      const logData = {
        hospitalId: testHospitalId,
        resourceType: 'beds',
        changeType: 'manual_update',
        oldValue: 10,
        newValue: 15,
        quantity: 5,
        changedBy: testUserId,
        reason: 'Test update'
      };

      const logId = ResourceAuditLog.create(logData);
      expect(logId).to.be.a('number');
      expect(logId).to.be.greaterThan(0);

      // Verify the log was created
      const log = ResourceAuditLog.findById(logId);
      expect(log).to.not.be.null;
      expect(log.hospitalId).to.equal(testHospitalId);
      expect(log.resourceType).to.equal('beds');
      expect(log.changeType).to.equal('manual_update');
      expect(log.oldValue).to.equal(10);
      expect(log.newValue).to.equal(15);
      expect(log.quantity).to.equal(5);
      expect(log.changedBy).to.equal(testUserId);
      expect(log.reason).to.equal('Test update');
    });

    it('should create audit log with booking reference', () => {
      const logData = {
        hospitalId: testHospitalId,
        resourceType: 'beds',
        changeType: 'booking_approved',
        oldValue: null,
        newValue: null,
        quantity: -1,
        bookingId: testBookingId,
        changedBy: testUserId,
        reason: 'Booking approved'
      };

      const logId = ResourceAuditLog.create(logData);
      const log = ResourceAuditLog.findById(logId);
      
      expect(log.bookingId).to.equal(testBookingId);
      expect(log.bookingPatientName).to.equal('Test Patient');
    });
  });

  describe('findById', () => {
    it('should return audit log with related data', () => {
      const logId = ResourceAuditLog.create({
        hospitalId: testHospitalId,
        resourceType: 'icu',
        changeType: 'manual_update',
        oldValue: 5,
        newValue: 8,
        quantity: 3,
        changedBy: testUserId,
        reason: 'ICU expansion'
      });

      const log = ResourceAuditLog.findById(logId);
      expect(log).to.not.be.null;
      expect(log.hospitalName).to.equal('Test Hospital');
      expect(log.changedByName).to.equal('Test User');
    });

    it('should return null for non-existent log', () => {
      const log = ResourceAuditLog.findById(99999);
      expect(log).to.be.null;
    });
  });

  describe('getByHospital', () => {
    beforeEach(() => {
      // Create multiple audit logs
      ResourceAuditLog.create({
        hospitalId: testHospitalId,
        resourceType: 'beds',
        changeType: 'manual_update',
        oldValue: 10,
        newValue: 12,
        quantity: 2,
        changedBy: testUserId,
        reason: 'Beds added'
      });

      ResourceAuditLog.create({
        hospitalId: testHospitalId,
        resourceType: 'icu',
        changeType: 'booking_approved',
        oldValue: null,
        newValue: null,
        quantity: -1,
        bookingId: testBookingId,
        changedBy: testUserId,
        reason: 'ICU booking approved'
      });
    });

    it('should return all logs for a hospital', () => {
      const logs = ResourceAuditLog.getByHospital(testHospitalId);
      expect(logs).to.be.an('array');
      expect(logs).to.have.length(2);
      expect(logs[0].hospitalId).to.equal(testHospitalId);
      expect(logs[1].hospitalId).to.equal(testHospitalId);
    });

    it('should filter by resource type', () => {
      const logs = ResourceAuditLog.getByHospital(testHospitalId, {
        resourceType: 'beds'
      });
      expect(logs).to.have.length(1);
      expect(logs[0].resourceType).to.equal('beds');
    });

    it('should filter by change type', () => {
      const logs = ResourceAuditLog.getByHospital(testHospitalId, {
        changeType: 'booking_approved'
      });
      expect(logs).to.have.length(1);
      expect(logs[0].changeType).to.equal('booking_approved');
    });

    it('should limit results', () => {
      const logs = ResourceAuditLog.getByHospital(testHospitalId, {
        limit: 1
      });
      expect(logs).to.have.length(1);
    });
  });

  describe('logManualUpdate', () => {
    it('should create manual update log entry', () => {
      const logId = ResourceAuditLog.logManualUpdate(
        testHospitalId,
        'operationTheatres',
        3,
        5,
        testUserId,
        'Added new operation theatres'
      );

      const log = ResourceAuditLog.findById(logId);
      expect(log.changeType).to.equal('manual_update');
      expect(log.resourceType).to.equal('operationTheatres');
      expect(log.oldValue).to.equal(3);
      expect(log.newValue).to.equal(5);
      expect(log.quantity).to.equal(2);
      expect(log.reason).to.equal('Added new operation theatres');
    });
  });

  describe('logBookingApproval', () => {
    it('should create booking approval log entry', () => {
      const logId = ResourceAuditLog.logBookingApproval(
        testHospitalId,
        'beds',
        1,
        testBookingId,
        testUserId
      );

      const log = ResourceAuditLog.findById(logId);
      expect(log.changeType).to.equal('booking_approved');
      expect(log.quantity).to.equal(-1); // Negative for allocation
      expect(log.bookingId).to.equal(testBookingId);
    });
  });

  describe('getChangeStatistics', () => {
    beforeEach(() => {
      // Create various audit logs for statistics
      ResourceAuditLog.create({
        hospitalId: testHospitalId,
        resourceType: 'beds',
        changeType: 'manual_update',
        oldValue: 10,
        newValue: 12,
        quantity: 2,
        changedBy: testUserId
      });

      ResourceAuditLog.create({
        hospitalId: testHospitalId,
        resourceType: 'beds',
        changeType: 'booking_approved',
        oldValue: null,
        newValue: null,
        quantity: -1,
        changedBy: testUserId
      });

      ResourceAuditLog.create({
        hospitalId: testHospitalId,
        resourceType: 'icu',
        changeType: 'manual_update',
        oldValue: 5,
        newValue: 3,
        quantity: -2,
        changedBy: testUserId
      });
    });

    it('should return change statistics grouped by resource and change type', () => {
      const stats = ResourceAuditLog.getChangeStatistics(testHospitalId);
      expect(stats).to.be.an('array');
      expect(stats.length).to.be.greaterThan(0);
      
      const bedsManualUpdate = stats.find(s => 
        s.resourceType === 'beds' && s.changeType === 'manual_update'
      );
      expect(bedsManualUpdate).to.not.be.undefined;
      expect(bedsManualUpdate.changeCount).to.equal(1);
      expect(bedsManualUpdate.totalIncreases).to.equal(2);
    });
  });

  describe('count', () => {
    beforeEach(() => {
      ResourceAuditLog.create({
        hospitalId: testHospitalId,
        resourceType: 'beds',
        changeType: 'manual_update',
        oldValue: 10,
        newValue: 12,
        quantity: 2,
        changedBy: testUserId
      });
    });

    it('should return total count for hospital', () => {
      const count = ResourceAuditLog.count(testHospitalId);
      expect(count).to.equal(1);
    });

    it('should return filtered count', () => {
      const count = ResourceAuditLog.count(testHospitalId, {
        resourceType: 'beds'
      });
      expect(count).to.equal(1);

      const countIcu = ResourceAuditLog.count(testHospitalId, {
        resourceType: 'icu'
      });
      expect(countIcu).to.equal(0);
    });
  });
});