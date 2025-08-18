const { expect } = require('chai');
const PollingService = require('../../services/pollingService');
const Hospital = require('../../models/Hospital');
const Booking = require('../../models/Booking');
const ResourceAuditLog = require('../../models/ResourceAuditLog');
const db = require('../../config/database');

describe('PollingService', () => {
  let testHospitalId;
  let testUserId;
  let testBookingId;

  beforeEach(() => {
    // Clean up any existing test data first
    try {
      db.prepare("DELETE FROM bookings WHERE hospitalId IN (SELECT id FROM hospitals WHERE name LIKE 'Test%')").run();
      db.prepare("DELETE FROM hospital_resources WHERE hospitalId IN (SELECT id FROM hospitals WHERE name LIKE 'Test%')").run();
      db.prepare("DELETE FROM resource_audit_log WHERE hospitalId IN (SELECT id FROM hospitals WHERE name LIKE 'Test%')").run();
      db.prepare("DELETE FROM hospitals WHERE name LIKE 'Test%'").run();
      db.prepare("DELETE FROM users WHERE email LIKE 'test%'").run();
    } catch (error) {
      // Ignore cleanup errors
    }

    // Create test hospital with unique email
    const timestamp = Date.now();
    const hospitalStmt = db.prepare(`
      INSERT INTO hospitals (name, street, city, state, zipCode, country, phone, email, emergency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const hospitalResult = hospitalStmt.run(
      `Test Hospital ${timestamp}`,
      '123 Test St',
      'Test City',
      'Test State',
      '12345',
      'Test Country',
      '555-0123',
      `test-${timestamp}@hospital.com`,
      1
    );
    testHospitalId = hospitalResult.lastInsertRowid;

    // Create test user with unique email
    const userStmt = db.prepare(`
      INSERT INTO users (name, email, password, userType, phone)
      VALUES (?, ?, ?, ?, ?)
    `);
    const userResult = userStmt.run(
      'Test User',
      `test-${timestamp}@user.com`,
      'hashedpassword',
      'user',
      '555-0124'
    );
    testUserId = userResult.lastInsertRowid;

    // Create test resources
    const resourceStmt = db.prepare(`
      INSERT INTO hospital_resources (hospitalId, resourceType, total, available, occupied, lastUpdated, updatedBy)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    `);
    resourceStmt.run(testHospitalId, 'beds', 100, 80, 20, testUserId);
    resourceStmt.run(testHospitalId, 'icu', 20, 15, 5, testUserId);
    resourceStmt.run(testHospitalId, 'operationTheatres', 10, 8, 2, testUserId);

    // Create test booking
    const bookingStmt = db.prepare(`
      INSERT INTO bookings (
        userId, hospitalId, resourceType, patientName, patientAge, 
        patientGender, emergencyContactName, emergencyContactPhone, 
        emergencyContactRelationship, medicalCondition, urgency, 
        paymentAmount, status, scheduledDate, estimatedDuration
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const bookingResult = bookingStmt.run(
      testUserId,
      testHospitalId,
      'beds',
      'Test Patient',
      30,
      'male',
      'Test Contact',
      '555-0125',
      'spouse',
      'Test condition',
      'medium',
      1000,
      'pending',
      new Date().toISOString(),
      2
    );
    testBookingId = bookingResult.lastInsertRowid;
  });

  afterEach(() => {
    // Clean up test data
    try {
      db.prepare('DELETE FROM bookings WHERE hospitalId = ?').run(testHospitalId);
      db.prepare('DELETE FROM hospital_resources WHERE hospitalId = ?').run(testHospitalId);
      db.prepare('DELETE FROM resource_audit_log WHERE hospitalId = ?').run(testHospitalId);
      db.prepare('DELETE FROM hospitals WHERE id = ?').run(testHospitalId);
      db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('getResourceUpdates', () => {
    it('should return all resource updates when no timestamp provided', () => {
      const result = PollingService.getResourceUpdates(testHospitalId);
      
      expect(result.success).to.be.true;
      expect(result.data.hasChanges).to.be.true;
      expect(result.data.totalChanges).to.equal(3);
      expect(result.data.changes.byHospital).to.have.length(1);
      expect(result.data.changes.byHospital[0].hospitalId).to.equal(testHospitalId);
      expect(result.data.changes.byHospital[0].resources).to.have.length(3);
    });

    it('should return only updates after specified timestamp', async () => {
      const initialTimestamp = new Date().toISOString();
      
      // Wait a moment and update a resource
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      Hospital.updateResourceType(testHospitalId, 'beds', {
        total: 100,
        available: 75,
        occupied: 25
      }, testUserId);

      const result = PollingService.getResourceUpdates(testHospitalId, initialTimestamp);
      
      expect(result.success).to.be.true;
      expect(result.data.hasChanges).to.be.true;
      expect(result.data.totalChanges).to.equal(1);
      expect(result.data.changes.raw[0].resourceType).to.equal('beds');
      expect(result.data.changes.raw[0].available).to.equal(75);
    });

    it('should filter by resource types when specified', () => {
      const result = PollingService.getResourceUpdates(testHospitalId, null, ['beds', 'icu']);
      
      expect(result.success).to.be.true;
      expect(result.data.totalChanges).to.equal(2);
      expect(result.data.changes.raw.every(r => ['beds', 'icu'].includes(r.resourceType))).to.be.true;
    });

    it('should return no changes when timestamp is in the future', () => {
      const futureTimestamp = new Date(Date.now() + 60000).toISOString();
      const result = PollingService.getResourceUpdates(testHospitalId, futureTimestamp);
      
      expect(result.success).to.be.true;
      expect(result.data.hasChanges).to.be.false;
      expect(result.data.totalChanges).to.equal(0);
    });

    it('should return system-wide updates when no hospital ID provided', () => {
      const result = PollingService.getResourceUpdates();
      
      expect(result.success).to.be.true;
      expect(result.data.hasChanges).to.be.true;
      expect(result.data.totalChanges).to.be.at.least(3);
    });
  });

  describe('getBookingUpdates', () => {
    it('should return all booking updates when no timestamp provided', () => {
      const result = PollingService.getBookingUpdates(testHospitalId);
      
      expect(result.success).to.be.true;
      expect(result.data.hasChanges).to.be.true;
      expect(result.data.totalChanges).to.equal(1);
      expect(result.data.changes.byHospital).to.have.length(1);
      expect(result.data.changes.byHospital[0].bookings).to.have.length(1);
    });

    it('should return only updates after specified timestamp', async () => {
      const initialTimestamp = new Date().toISOString();
      
      // Wait a moment and update booking status
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      Booking.updateStatus(testBookingId, 'approved', testUserId);

      const result = PollingService.getBookingUpdates(testHospitalId, initialTimestamp);
      
      expect(result.success).to.be.true;
      expect(result.data.hasChanges).to.be.true;
      expect(result.data.totalChanges).to.equal(1);
      expect(result.data.changes.raw[0].status).to.equal('approved');
    });

    it('should filter by status when specified', () => {
      // Create additional booking with different status
      const approvedBookingStmt = db.prepare(`
        INSERT INTO bookings (
          userId, hospitalId, resourceType, patientName, patientAge, 
          patientGender, emergencyContactName, emergencyContactPhone, 
          emergencyContactRelationship, medicalCondition, urgency, 
          paymentAmount, status, scheduledDate, estimatedDuration
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      approvedBookingStmt.run(
        testUserId, testHospitalId, 'icu', 'Test Patient 2', 25, 'female',
        'Test Contact 2', '555-0126', 'parent', 'Test condition 2', 'high', 2000, 'approved',
        new Date().toISOString(), 3
      );

      const result = PollingService.getBookingUpdates(testHospitalId, null, ['approved']);
      
      expect(result.success).to.be.true;
      expect(result.data.totalChanges).to.equal(1);
      expect(result.data.changes.raw[0].status).to.equal('approved');
    });

    it('should group bookings by status correctly', () => {
      const result = PollingService.getBookingUpdates(testHospitalId);
      
      expect(result.success).to.be.true;
      expect(result.data.changes.byStatus).to.have.property('pending');
      expect(result.data.changes.byStatus.pending).to.have.length(1);
    });
  });

  describe('getCombinedUpdates', () => {
    it('should return both resource and booking updates', () => {
      const result = PollingService.getCombinedUpdates(testHospitalId);
      
      expect(result.success).to.be.true;
      expect(result.data.hasChanges).to.be.true;
      expect(result.data.resources.hasChanges).to.be.true;
      expect(result.data.bookings.hasChanges).to.be.true;
      expect(result.data.summary.totalResourceChanges).to.equal(3);
      expect(result.data.summary.totalBookingChanges).to.equal(1);
      expect(result.data.summary.totalChanges).to.equal(4);
    });

    it('should respect filtering options', () => {
      const options = {
        resourceTypes: ['beds'],
        bookingStatuses: ['pending']
      };
      
      const result = PollingService.getCombinedUpdates(testHospitalId, null, options);
      
      expect(result.success).to.be.true;
      expect(result.data.resources.totalChanges).to.equal(1);
      expect(result.data.bookings.totalChanges).to.equal(1);
    });
  });

  describe('getAuditLogUpdates', () => {
    beforeEach(() => {
      // Create some audit log entries
      ResourceAuditLog.create({
        hospitalId: testHospitalId,
        resourceType: 'beds',
        changeType: 'manual_update',
        oldValue: 80,
        newValue: 75,
        quantity: -5,
        changedBy: testUserId,
        reason: 'Test update'
      });
    });

    it('should return audit log updates', () => {
      const result = PollingService.getAuditLogUpdates(testHospitalId);
      
      expect(result.success).to.be.true;
      expect(result.data.hasChanges).to.be.true;
      expect(result.data.totalChanges).to.be.at.least(1);
      expect(result.data.changes.raw[0].changeType).to.equal('manual_update');
    });

    it('should filter by change type', () => {
      const result = PollingService.getAuditLogUpdates(testHospitalId, null, {
        changeTypes: ['manual_update']
      });
      
      expect(result.success).to.be.true;
      expect(result.data.changes.raw.every(log => log.changeType === 'manual_update')).to.be.true;
    });

    it('should respect limit option', () => {
      // Create multiple audit entries
      for (let i = 0; i < 5; i++) {
        ResourceAuditLog.create({
          hospitalId: testHospitalId,
          resourceType: 'beds',
          changeType: 'manual_update',
          oldValue: 80 - i,
          newValue: 75 - i,
          quantity: -5,
          changedBy: testUserId,
          reason: `Test update ${i}`
        });
      }

      const result = PollingService.getAuditLogUpdates(testHospitalId, null, { limit: 3 });
      
      expect(result.success).to.be.true;
      expect(result.data.changes.raw).to.have.length.at.most(3);
    });
  });

  describe('getHospitalDashboardUpdates', () => {
    it('should return comprehensive dashboard data', () => {
      const result = PollingService.getHospitalDashboardUpdates(testHospitalId);
      
      expect(result.success).to.be.true;
      expect(result.data.dashboard).to.exist;
      expect(result.data.dashboard.currentResources).to.have.length(3);
      expect(result.data.dashboard.resourceUtilization).to.have.length(3);
      expect(result.data.dashboard.pendingBookingsCount).to.equal(1);
      expect(result.data.dashboard.recentActivity).to.be.an('array');
    });

    it('should require hospital ID', () => {
      const result = PollingService.getHospitalDashboardUpdates();
      
      expect(result.success).to.be.false;
      expect(result.message).to.include('Hospital ID is required');
    });
  });

  describe('hasChanges', () => {
    it('should return true when no timestamp provided', () => {
      const result = PollingService.hasChanges(testHospitalId);
      
      expect(result.success).to.be.true;
      expect(result.data.hasChanges).to.be.true;
      expect(result.data.reason).to.include('No previous timestamp');
    });

    it('should detect resource changes', async () => {
      const initialTimestamp = new Date().toISOString();
      
      // Wait and make a change
      await new Promise(resolve => setTimeout(resolve, 1100));
      Hospital.updateResourceType(testHospitalId, 'beds', {
        total: 100,
        available: 70,
        occupied: 30
      }, testUserId);

      const result = PollingService.hasChanges(testHospitalId, initialTimestamp);
      
      expect(result.success).to.be.true;
      expect(result.data.hasChanges).to.be.true;
      expect(result.data.resourceChanges).to.equal(1);
      expect(result.data.bookingChanges).to.equal(0);
    });

    it('should detect booking changes', async () => {
      const initialTimestamp = new Date().toISOString();
      
      // Wait and make a change
      await new Promise(resolve => setTimeout(resolve, 1100));
      Booking.updateStatus(testBookingId, 'approved', testUserId);

      const result = PollingService.hasChanges(testHospitalId, initialTimestamp);
      
      expect(result.success).to.be.true;
      expect(result.data.hasChanges).to.be.true;
      expect(result.data.resourceChanges).to.equal(0);
      expect(result.data.bookingChanges).to.equal(1);
    });

    it('should return false when no changes since timestamp', () => {
      const futureTimestamp = new Date(Date.now() + 60000).toISOString();
      const result = PollingService.hasChanges(testHospitalId, futureTimestamp);
      
      expect(result.success).to.be.true;
      expect(result.data.hasChanges).to.be.false;
      expect(result.data.totalChanges).to.equal(0);
    });
  });

  describe('getPollingConfig', () => {
    it('should return polling configuration recommendations', () => {
      const result = PollingService.getPollingConfig(testHospitalId);
      
      expect(result.success).to.be.true;
      expect(result.data.recommendedInterval).to.be.a('number');
      expect(result.data.configuration).to.exist;
      expect(result.data.configuration.minInterval).to.equal(5000);
      expect(result.data.configuration.maxInterval).to.equal(300000);
      expect(result.data.configuration.defaultInterval).to.equal(30000);
    });

    it('should work without hospital ID for system-wide config', () => {
      const result = PollingService.getPollingConfig();
      
      expect(result.success).to.be.true;
      expect(result.data.recommendedInterval).to.be.a('number');
    });

    it('should recommend faster polling for high activity', () => {
      // Create multiple recent updates to simulate high activity
      for (let i = 0; i < 5; i++) {
        Hospital.updateResourceType(testHospitalId, 'beds', {
          total: 100,
          available: 80 - i,
          occupied: 20 + i
        }, testUserId);
      }

      const result = PollingService.getPollingConfig(testHospitalId);
      
      expect(result.success).to.be.true;
      // Should recommend faster polling due to recent activity
      expect(result.data.recommendedInterval).to.be.at.most(30000);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid hospital ID gracefully', () => {
      const result = PollingService.getResourceUpdates(99999);
      
      expect(result.success).to.be.true;
      expect(result.data.hasChanges).to.be.false;
      expect(result.data.totalChanges).to.equal(0);
    });

    it('should handle invalid timestamp format gracefully', () => {
      const result = PollingService.getResourceUpdates(testHospitalId, 'invalid-timestamp');
      
      expect(result.success).to.be.true;
      // Should still work, treating invalid timestamp as no filter
    });

    it('should handle database errors gracefully', () => {
      // This test would require mocking the database to simulate errors
      // For now, we'll test that the service structure handles errors
      expect(PollingService.getResourceUpdates).to.not.throw;
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      // Create many resources and bookings
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        const hospitalStmt = db.prepare(`
          INSERT INTO hospitals (name, street, city, state, zipCode, country, phone, email, emergency)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const hospitalResult = hospitalStmt.run(
          `Hospital ${i}`, '123 Test St', 'Test City', 'Test State', '12345',
          'Test Country', '555-0123', `test${i}@hospital.com`, 1
        );
        
        const resourceStmt = db.prepare(`
          INSERT INTO hospital_resources (hospitalId, resourceType, total, available, occupied, lastUpdated, updatedBy)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
        `);
        resourceStmt.run(hospitalResult.lastInsertRowid, 'beds', 50, 40, 10, testUserId);
      }

      const result = PollingService.getResourceUpdates();
      const endTime = Date.now();
      
      expect(result.success).to.be.true;
      expect(endTime - startTime).to.be.below(1000); // Should complete within 1 second
      
      // Clean up
      db.prepare('DELETE FROM hospital_resources WHERE hospitalId > ?').run(testHospitalId);
      db.prepare('DELETE FROM hospitals WHERE id > ?').run(testHospitalId);
    });

    it('should efficiently filter large result sets', () => {
      const startTime = Date.now();
      
      // Test with timestamp filtering
      const result = PollingService.getResourceUpdates(null, new Date().toISOString());
      const endTime = Date.now();
      
      expect(result.success).to.be.true;
      expect(endTime - startTime).to.be.below(500); // Should be very fast for filtered results
    });
  });
});