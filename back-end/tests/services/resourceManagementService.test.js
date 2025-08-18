const { describe, it, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const db = require('../../config/database');
const ResourceManagementService = require('../../services/resourceManagementService');

describe('ResourceManagementService', () => {
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

    // Create hospital authority relationship
    const authorityStmt = db.prepare(`
      INSERT INTO hospital_authorities (userId, hospitalId, role, permissions)
      VALUES (?, ?, ?, ?)
    `);
    authorityStmt.run(testUserId, testHospitalId, 'manager', '["manage_resources"]');

    // Create initial resources
    const resourceStmt = db.prepare(`
      INSERT INTO hospital_resources (hospitalId, resourceType, total, available, occupied)
      VALUES (?, ?, ?, ?, ?)
    `);
    resourceStmt.run(testHospitalId, 'beds', 50, 30, 20);
    resourceStmt.run(testHospitalId, 'icu', 10, 5, 5);
    resourceStmt.run(testHospitalId, 'operationTheatres', 5, 2, 3);
  });

  afterEach(() => {
    // Clean up test data
    db.exec('DELETE FROM resource_audit_log');
    db.exec('DELETE FROM hospital_resources');
    db.exec('DELETE FROM hospital_authorities');
    db.exec('DELETE FROM bookings');
    db.exec('DELETE FROM users');
    db.exec('DELETE FROM hospitals');
  });

  describe('updateResourceQuantities', () => {
    it('should successfully update resource quantities', async () => {
      const resources = {
        beds: {
          total: 60,
          available: 35,
          occupied: 25
        },
        icu: {
          total: 12,
          available: 7,
          occupied: 5
        }
      };

      const result = await ResourceManagementService.updateResourceQuantities(
        testHospitalId,
        resources,
        testUserId
      );

      expect(result.success).to.be.true;
      expect(result.data.hospitalId).to.equal(testHospitalId);
      expect(result.data.resources).to.be.an('array');
      
      // Check that resources were actually updated
      const updatedBeds = result.data.resources.find(r => r.resourceType === 'beds');
      expect(updatedBeds.total).to.equal(60);
      expect(updatedBeds.available).to.equal(35);
    });

    it('should fail with invalid hospital ID', async () => {
      const resources = {
        beds: { total: 50, available: 30, occupied: 20 }
      };

      const result = await ResourceManagementService.updateResourceQuantities(
        99999,
        resources,
        testUserId
      );

      expect(result.success).to.be.false;
      expect(result.message).to.include('Hospital not found');
    });

    it('should fail with negative resource quantities', async () => {
      const resources = {
        beds: {
          total: 50,
          available: -5, // Invalid negative value
          occupied: 20
        }
      };

      const result = await ResourceManagementService.updateResourceQuantities(
        testHospitalId,
        resources,
        testUserId
      );

      expect(result.success).to.be.false;
      expect(result.message).to.include('cannot be negative');
    });

    it('should fail when allocated resources exceed total', async () => {
      const resources = {
        beds: {
          total: 50,
          available: 30,
          occupied: 25, // 30 + 25 = 55 > 50 total
          reserved: 0,
          maintenance: 0
        }
      };

      const result = await ResourceManagementService.updateResourceQuantities(
        testHospitalId,
        resources,
        testUserId
      );

      expect(result.success).to.be.false;
      expect(result.message).to.include('exceeds total');
    });
  });

  describe('validateResourceUpdate', () => {
    it('should validate correct resource data', () => {
      const resources = {
        beds: {
          total: 50,
          available: 30,
          occupied: 20
        }
      };

      const result = ResourceManagementService.validateResourceUpdate(testHospitalId, resources);
      expect(result.valid).to.be.true;
    });

    it('should reject invalid resource type', () => {
      const resources = {
        invalidType: {
          total: 50,
          available: 30,
          occupied: 20
        }
      };

      const result = ResourceManagementService.validateResourceUpdate(testHospitalId, resources);
      expect(result.valid).to.be.false;
      expect(result.message).to.include('Invalid resource type');
    });

    it('should reject negative quantities', () => {
      const resources = {
        beds: {
          total: 50,
          available: -10,
          occupied: 20
        }
      };

      const result = ResourceManagementService.validateResourceUpdate(testHospitalId, resources);
      expect(result.valid).to.be.false;
      expect(result.message).to.include('non-negative');
    });
  });

  describe('checkResourceAvailability', () => {
    it('should check resource availability correctly', async () => {
      const result = await ResourceManagementService.checkResourceAvailability(
        testHospitalId,
        'beds',
        5
      );

      expect(result.success).to.be.true;
      expect(result.data.available).to.be.true;
      expect(result.data.currentAvailable).to.equal(30);
      expect(result.data.requested).to.equal(5);
    });

    it('should detect insufficient resources', async () => {
      const result = await ResourceManagementService.checkResourceAvailability(
        testHospitalId,
        'beds',
        50 // More than available (30)
      );

      expect(result.success).to.be.true;
      expect(result.data.available).to.be.false;
      expect(result.data.message).to.include('Only 30 of 50');
    });

    it('should handle non-existent resource type', async () => {
      const result = await ResourceManagementService.checkResourceAvailability(
        testHospitalId,
        'nonexistent',
        1
      );

      expect(result.success).to.be.true;
      expect(result.data.available).to.be.false;
      expect(result.data.message).to.include('not found');
    });
  });

  describe('allocateResources', () => {
    beforeEach(() => {
      // Create a test booking
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

    it('should successfully allocate resources', async () => {
      const result = await ResourceManagementService.allocateResources(
        testHospitalId,
        'beds',
        2,
        testBookingId,
        testUserId
      );

      expect(result.success).to.be.true;
      expect(result.data.quantity).to.equal(2);
      expect(result.data.bookingId).to.equal(testBookingId);

      // Verify resources were actually allocated
      const availability = await ResourceManagementService.checkResourceAvailability(
        testHospitalId,
        'beds',
        1
      );
      expect(availability.data.currentAvailable).to.equal(28); // 30 - 2
    });

    it('should fail to allocate insufficient resources', async () => {
      const result = await ResourceManagementService.allocateResources(
        testHospitalId,
        'beds',
        50, // More than available
        testBookingId,
        testUserId
      );

      expect(result.success).to.be.false;
      expect(result.message).to.include('Insufficient resources');
    });
  });

  describe('releaseResources', () => {
    beforeEach(async () => {
      // Create a test booking and allocate resources
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
        'approved'
      );
      testBookingId = bookingResult.lastInsertRowid;

      // Allocate resources first
      await ResourceManagementService.allocateResources(
        testHospitalId,
        'beds',
        3,
        testBookingId,
        testUserId
      );
    });

    it('should successfully release resources', async () => {
      const result = await ResourceManagementService.releaseResources(
        testHospitalId,
        'beds',
        3,
        testBookingId,
        testUserId,
        'completed'
      );

      expect(result.success).to.be.true;
      expect(result.data.quantity).to.equal(3);
      expect(result.data.reason).to.equal('completed');

      // Verify resources were actually released
      const availability = await ResourceManagementService.checkResourceAvailability(
        testHospitalId,
        'beds',
        1
      );
      expect(availability.data.currentAvailable).to.equal(30); // Back to original
    });
  });

  describe('getResourceHistory', () => {
    beforeEach(async () => {
      // Create some resource changes to generate history
      await ResourceManagementService.updateResourceQuantities(
        testHospitalId,
        {
          beds: { total: 55, available: 35, occupied: 20 }
        },
        testUserId
      );
    });

    it('should return resource history', async () => {
      const result = await ResourceManagementService.getResourceHistory(testHospitalId);

      expect(result.success).to.be.true;
      expect(result.data.history).to.be.an('array');
      expect(result.data.totalCount).to.be.a('number');
    });

    it('should filter history by resource type', async () => {
      const result = await ResourceManagementService.getResourceHistory(testHospitalId, {
        resourceType: 'beds'
      });

      expect(result.success).to.be.true;
      expect(result.data.history).to.be.an('array');
      
      // All history entries should be for beds
      result.data.history.forEach(entry => {
        expect(entry.resourceType).to.equal('beds');
      });
    });
  });

  describe('getResourceUtilization', () => {
    it('should return resource utilization statistics', async () => {
      const result = await ResourceManagementService.getResourceUtilization(testHospitalId);

      expect(result.success).to.be.true;
      expect(result.data.current).to.be.an('array');
      expect(result.data.statistics).to.be.an('array');
      expect(result.data.hospitalId).to.equal(testHospitalId);

      // Check utilization data structure
      const bedsUtilization = result.data.current.find(r => r.resourceType === 'beds');
      expect(bedsUtilization).to.not.be.undefined;
      expect(bedsUtilization.utilizationPercentage).to.be.a('number');
    });
  });

  describe('getHospitalsWithAvailableResources', () => {
    it('should return hospitals with available resources', async () => {
      const result = await ResourceManagementService.getHospitalsWithAvailableResources('beds', 10);

      expect(result.success).to.be.true;
      expect(result.data.hospitals).to.be.an('array');
      expect(result.data.filters.resourceType).to.equal('beds');
      expect(result.data.filters.minQuantity).to.equal(10);
    });

    it('should filter by minimum quantity', async () => {
      const result = await ResourceManagementService.getHospitalsWithAvailableResources('beds', 50);

      expect(result.success).to.be.true;
      // Should return empty array since we only have 30 beds available
      expect(result.data.hospitals).to.be.an('array');
    });
  });

  describe('validateUserPermissions', () => {
    it('should validate user permissions for hospital', async () => {
      const hasPermission = await ResourceManagementService.validateUserPermissions(
        testUserId,
        testHospitalId
      );

      expect(hasPermission).to.be.true;
    });

    it('should reject user without permissions', async () => {
      // Create another user without hospital authority
      const userStmt = db.prepare(`
        INSERT INTO users (email, password, name, userType)
        VALUES (?, ?, ?, ?)
      `);
      const userResult = userStmt.run(
        'other@user.com',
        'hashedpassword',
        'Other User',
        'user'
      );
      const otherUserId = userResult.lastInsertRowid;

      const hasPermission = await ResourceManagementService.validateUserPermissions(
        otherUserId,
        testHospitalId
      );

      expect(hasPermission).to.be.false;
    });
  });

  describe('updateMaintenanceResources', () => {
    it('should update maintenance resources correctly', async () => {
      const result = await ResourceManagementService.updateMaintenanceResources(
        testHospitalId,
        'beds',
        5, // 5 beds under maintenance
        testUserId,
        'Scheduled maintenance'
      );

      expect(result.success).to.be.true;
      
      // Check that available resources were reduced
      const availability = await ResourceManagementService.checkResourceAvailability(
        testHospitalId,
        'beds',
        1
      );
      expect(availability.data.currentAvailable).to.equal(25); // 50 total - 20 occupied - 5 maintenance
    });

    it('should handle non-existent resource type', async () => {
      const result = await ResourceManagementService.updateMaintenanceResources(
        testHospitalId,
        'nonexistent',
        5,
        testUserId
      );

      expect(result.success).to.be.false;
      expect(result.message).to.include('not found');
    });
  });
});