const request = require('supertest');
const { expect } = require('chai');
const app = require('../../index');
const db = require('../../config/database');
const jwt = require('jsonwebtoken');

describe('Polling Endpoints', () => {
  let testHospitalId;
  let testUserId;
  let testAuthorityId;
  let testAdminId;
  let userToken;
  let authorityToken;
  let adminToken;

  beforeEach(() => {
    // Create test hospital
    const hospitalStmt = db.prepare(`
      INSERT INTO hospitals (name, street, city, state, zipCode, country, phone, email, emergency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const hospitalResult = hospitalStmt.run(
      'Test Hospital',
      '123 Test St',
      'Test City',
      'Test State',
      '12345',
      'Test Country',
      '555-0123',
      'test@hospital.com',
      1
    );
    testHospitalId = hospitalResult.lastInsertRowid;

    // Create test users
    const userStmt = db.prepare(`
      INSERT INTO users (name, email, password, userType, phone, hospital_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    // Regular user
    const userResult = userStmt.run(
      'Test User',
      'test@user.com',
      'hashedpassword',
      'user',
      '555-0124',
      null
    );
    testUserId = userResult.lastInsertRowid;

    // Hospital authority
    const authorityResult = userStmt.run(
      'Test Authority',
      'authority@hospital.com',
      'hashedpassword',
      'hospital-authority',
      '555-0125',
      testHospitalId
    );
    testAuthorityId = authorityResult.lastInsertRowid;

    // Admin user
    const adminResult = userStmt.run(
      'Test Admin',
      'admin@system.com',
      'hashedpassword',
      'admin',
      '555-0126',
      null
    );
    testAdminId = adminResult.lastInsertRowid;

    // Create JWT tokens
    userToken = jwt.sign(
      { id: testUserId, userType: 'user' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    authorityToken = jwt.sign(
      { id: testAuthorityId, userType: 'hospital-authority', hospital_id: testHospitalId },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { id: testAdminId, userType: 'admin' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test resources
    const resourceStmt = db.prepare(`
      INSERT INTO hospital_resources (hospitalId, resourceType, total, available, occupied, lastUpdated, updatedBy)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    `);
    resourceStmt.run(testHospitalId, 'beds', 100, 80, 20, testAuthorityId);
    resourceStmt.run(testHospitalId, 'icu', 20, 15, 5, testAuthorityId);

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
    bookingStmt.run(
      testUserId, testHospitalId, 'beds', 'Test Patient', 30, 'male',
      'Test Contact', '555-0127', 'spouse', 'Test condition', 'medium', 1000, 'pending',
      new Date().toISOString(), 2
    );
  });

  afterEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM bookings WHERE hospitalId = ?').run(testHospitalId);
    db.prepare('DELETE FROM hospital_resources WHERE hospitalId = ?').run(testHospitalId);
    db.prepare('DELETE FROM resource_audit_log WHERE hospitalId = ?').run(testHospitalId);
    db.prepare('DELETE FROM hospitals WHERE id = ?').run(testHospitalId);
    db.prepare('DELETE FROM users WHERE id IN (?, ?, ?)').run(testUserId, testAuthorityId, testAdminId);
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all polling endpoints', async () => {
      const endpoints = [
        '/api/polling/resources',
        '/api/polling/bookings',
        '/api/polling/combined',
        '/api/polling/changes',
        '/api/polling/config',
        '/api/polling/health'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint);
        
        expect(response.status).to.equal(401);
      }
    });

    it('should allow hospital authorities to access their hospital data', async () => {
      const response = await request(app)
        .get('/api/polling/resources')
        .set('Authorization', `Bearer ${authorityToken}`)
        .query({ hospitalId: testHospitalId });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
    });

    it('should prevent hospital authorities from accessing other hospitals', async () => {
      // Create another hospital
      const otherHospitalStmt = db.prepare(`
        INSERT INTO hospitals (name, street, city, state, zipCode, country, phone, email, emergency)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const otherHospitalResult = otherHospitalStmt.run(
        'Other Hospital', '456 Other St', 'Other City', 'Other State', '67890',
        'Other Country', '555-0128', 'other@hospital.com', 1
      );
      const otherHospitalId = otherHospitalResult.lastInsertRowid;

      const response = await request(app)
        .get('/api/polling/resources')
        .set('Authorization', `Bearer ${authorityToken}`)
        .query({ hospitalId: otherHospitalId });

      expect(response.status).to.equal(403);
      expect(response.body.error).to.include('assigned hospital');

      // Clean up
      db.prepare('DELETE FROM hospitals WHERE id = ?').run(otherHospitalId);
    });

    it('should allow admins to access all hospital data', async () => {
      const response = await request(app)
        .get('/api/polling/resources')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
    });
  });

  describe('GET /api/polling/resources', () => {
    it('should return resource updates', async () => {
      const response = await request(app)
        .get('/api/polling/resources')
        .set('Authorization', `Bearer ${authorityToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.hasChanges).to.be.true;
      expect(response.body.data.totalChanges).to.be.at.least(2);
      expect(response.body.pollingInfo).to.exist;
      expect(response.body.pollingInfo.endpoint).to.equal('system-resource-updates');
    });

    it('should filter by resource types', async () => {
      const response = await request(app)
        .get('/api/polling/resources')
        .set('Authorization', `Bearer ${authorityToken}`)
        .query({ resourceTypes: 'beds,icu' });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.changes.raw.every(r => ['beds', 'icu'].includes(r.resourceType))).to.be.true;
    });

    it('should filter by timestamp', async () => {
      const futureTimestamp = new Date(Date.now() + 60000).toISOString();
      
      const response = await request(app)
        .get('/api/polling/resources')
        .set('Authorization', `Bearer ${authorityToken}`)
        .query({ lastUpdate: futureTimestamp });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.hasChanges).to.be.false;
      expect(response.body.data.totalChanges).to.equal(0);
    });

    it('should set appropriate cache headers', async () => {
      const response = await request(app)
        .get('/api/polling/resources')
        .set('Authorization', `Bearer ${authorityToken}`);

      expect(response.headers['cache-control']).to.include('no-cache');
      expect(response.headers['pragma']).to.equal('no-cache');
      expect(response.headers['expires']).to.equal('0');
    });
  });

  describe('GET /api/polling/bookings', () => {
    it('should return booking updates', async () => {
      const response = await request(app)
        .get('/api/polling/bookings')
        .set('Authorization', `Bearer ${authorityToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.hasChanges).to.be.true;
      expect(response.body.data.totalChanges).to.be.at.least(1);
      expect(response.body.pollingInfo.endpoint).to.equal('system-booking-updates');
    });

    it('should filter by booking statuses', async () => {
      const response = await request(app)
        .get('/api/polling/bookings')
        .set('Authorization', `Bearer ${authorityToken}`)
        .query({ statuses: 'pending' });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.changes.raw.every(b => b.status === 'pending')).to.be.true;
    });
  });

  describe('GET /api/polling/combined', () => {
    it('should return combined resource and booking updates', async () => {
      const response = await request(app)
        .get('/api/polling/combined')
        .set('Authorization', `Bearer ${authorityToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.hasChanges).to.be.true;
      expect(response.body.data.resources).to.exist;
      expect(response.body.data.bookings).to.exist;
      expect(response.body.data.summary.totalChanges).to.be.at.least(3);
    });

    it('should respect filtering options', async () => {
      const response = await request(app)
        .get('/api/polling/combined')
        .set('Authorization', `Bearer ${authorityToken}`)
        .query({ 
          resourceTypes: 'beds',
          bookingStatuses: 'pending'
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.resources.totalChanges).to.be.at.least(1);
      expect(response.body.data.bookings.totalChanges).to.be.at.least(1);
    });
  });

  describe('GET /api/polling/audit', () => {
    beforeEach(() => {
      // Create audit log entry
      const auditStmt = db.prepare(`
        INSERT INTO resource_audit_log (
          hospitalId, resourceType, changeType, oldValue, newValue, 
          quantity, changedBy, reason, timestamp
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      auditStmt.run(
        testHospitalId, 'beds', 'manual_update', 80, 75, -5, testAuthorityId, 'Test update'
      );
    });

    it('should return audit log updates', async () => {
      const response = await request(app)
        .get('/api/polling/audit')
        .set('Authorization', `Bearer ${authorityToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.hasChanges).to.be.true;
      expect(response.body.data.totalChanges).to.be.at.least(1);
    });

    it('should filter by change types', async () => {
      const response = await request(app)
        .get('/api/polling/audit')
        .set('Authorization', `Bearer ${authorityToken}`)
        .query({ changeTypes: 'manual_update' });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.changes.raw.every(log => log.changeType === 'manual_update')).to.be.true;
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/polling/audit')
        .set('Authorization', `Bearer ${authorityToken}`)
        .query({ limit: 1 });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.changes.raw).to.have.length.at.most(1);
    });
  });

  describe('GET /api/polling/changes', () => {
    it('should detect changes', async () => {
      const response = await request(app)
        .get('/api/polling/changes')
        .set('Authorization', `Bearer ${authorityToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.hasChanges).to.be.true;
      expect(response.body.data.totalChanges).to.be.at.least(3);
    });

    it('should return false for future timestamps', async () => {
      const futureTimestamp = new Date(Date.now() + 60000).toISOString();
      
      const response = await request(app)
        .get('/api/polling/changes')
        .set('Authorization', `Bearer ${authorityToken}`)
        .query({ lastUpdate: futureTimestamp });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.hasChanges).to.be.false;
    });
  });

  describe('GET /api/polling/config', () => {
    it('should return polling configuration', async () => {
      const response = await request(app)
        .get('/api/polling/config')
        .set('Authorization', `Bearer ${authorityToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.recommendedInterval).to.be.a('number');
      expect(response.body.data.configuration).to.exist;
      expect(response.body.data.configuration.minInterval).to.equal(5000);
      expect(response.body.data.configuration.maxInterval).to.equal(300000);
    });
  });

  describe('GET /api/polling/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/polling/health')
        .set('Authorization', `Bearer ${authorityToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.status).to.equal('healthy');
      expect(response.body.data.endpoints).to.be.an('array');
      expect(response.body.data.userType).to.equal('hospital-authority');
    });
  });

  describe('Hospital-specific polling endpoints', () => {
    it('should return hospital-specific resource updates', async () => {
      const response = await request(app)
        .get(`/api/hospitals/${testHospitalId}/polling/resources`)
        .set('Authorization', `Bearer ${authorityToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.changes.byHospital).to.have.length(1);
      expect(response.body.data.changes.byHospital[0].hospitalId).to.equal(testHospitalId);
    });

    it('should return hospital-specific booking updates', async () => {
      const response = await request(app)
        .get(`/api/hospitals/${testHospitalId}/polling/bookings`)
        .set('Authorization', `Bearer ${authorityToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.changes.byHospital).to.have.length(1);
      expect(response.body.data.changes.byHospital[0].hospitalId).to.equal(testHospitalId);
    });

    it('should return hospital dashboard updates', async () => {
      const response = await request(app)
        .get(`/api/hospitals/${testHospitalId}/polling/dashboard`)
        .set('Authorization', `Bearer ${authorityToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.dashboard).to.exist;
      expect(response.body.data.dashboard.currentResources).to.have.length(2);
      expect(response.body.data.dashboard.pendingBookingsCount).to.equal(1);
    });

    it('should check for hospital-specific changes', async () => {
      const response = await request(app)
        .get(`/api/hospitals/${testHospitalId}/polling/changes`)
        .set('Authorization', `Bearer ${authorityToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.hasChanges).to.be.true;
    });

    it('should return hospital-specific polling config', async () => {
      const response = await request(app)
        .get(`/api/hospitals/${testHospitalId}/polling/config`)
        .set('Authorization', `Bearer ${authorityToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.hospitalId).to.equal(testHospitalId);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid hospital ID gracefully', async () => {
      const response = await request(app)
        .get('/api/hospitals/99999/polling/resources')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.hasChanges).to.be.false;
    });

    it('should handle malformed query parameters', async () => {
      const response = await request(app)
        .get('/api/polling/resources')
        .set('Authorization', `Bearer ${authorityToken}`)
        .query({ lastUpdate: 'invalid-timestamp' });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      // Should handle gracefully and return data
    });

    it('should handle missing authorization header', async () => {
      const response = await request(app)
        .get('/api/polling/resources');

      expect(response.status).to.equal(401);
    });

    it('should handle invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/polling/resources')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).to.equal(401);
    });
  });

  describe('Performance and Caching', () => {
    it('should complete requests within reasonable time', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/polling/combined')
        .set('Authorization', `Bearer ${authorityToken}`);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).to.equal(200);
      expect(duration).to.be.below(1000); // Should complete within 1 second
    });

    it('should set proper cache headers for all polling endpoints', async () => {
      const endpoints = [
        '/api/polling/resources',
        '/api/polling/bookings',
        '/api/polling/combined',
        '/api/polling/changes'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${authorityToken}`);

        expect(response.headers['cache-control']).to.include('no-cache');
        expect(response.headers['pragma']).to.equal('no-cache');
        expect(response.headers['expires']).to.equal('0');
      }
    });

    it('should handle concurrent requests efficiently', async () => {
      const requests = [];
      const startTime = Date.now();

      // Make 10 concurrent requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .get('/api/polling/resources')
            .set('Authorization', `Bearer ${authorityToken}`)
        );
      }

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
      });

      // Should handle concurrent requests efficiently
      expect(duration).to.be.below(3000); // Should complete within 3 seconds
    });
  });

  describe('Data Consistency', () => {
    it('should return consistent timestamps across endpoints', async () => {
      const resourceResponse = await request(app)
        .get('/api/polling/resources')
        .set('Authorization', `Bearer ${authorityToken}`);

      const bookingResponse = await request(app)
        .get('/api/polling/bookings')
        .set('Authorization', `Bearer ${authorityToken}`);

      expect(resourceResponse.body.data.currentTimestamp).to.be.a('string');
      expect(bookingResponse.body.data.currentTimestamp).to.be.a('string');
      
      // Timestamps should be close (within 1 second)
      const resourceTime = new Date(resourceResponse.body.data.currentTimestamp);
      const bookingTime = new Date(bookingResponse.body.data.currentTimestamp);
      const timeDiff = Math.abs(resourceTime - bookingTime);
      
      expect(timeDiff).to.be.below(1000);
    });

    it('should maintain data integrity across polling calls', async () => {
      // Get initial state
      const initialResponse = await request(app)
        .get('/api/polling/combined')
        .set('Authorization', `Bearer ${authorityToken}`);

      const initialTimestamp = initialResponse.body.data.currentTimestamp;

      // Make a change
      await request(app)
        .put(`/api/hospitals/${testHospitalId}/resources`)
        .set('Authorization', `Bearer ${authorityToken}`)
        .send({
          beds: { total: 100, available: 75, occupied: 25 }
        });

      // Poll for updates
      const updateResponse = await request(app)
        .get('/api/polling/combined')
        .set('Authorization', `Bearer ${authorityToken}`)
        .query({ lastUpdate: initialTimestamp });

      expect(updateResponse.body.success).to.be.true;
      expect(updateResponse.body.data.hasChanges).to.be.true;
      expect(updateResponse.body.data.resources.totalChanges).to.be.at.least(1);
    });
  });
});