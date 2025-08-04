const { describe, it, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const request = require('supertest');
const app = require('../../index');
const db = require('../../config/database');
const UserService = require('../../services/userService');
const HospitalService = require('../../services/hospitalService');

describe('Hospital Resource Management API Endpoints', () => {
  let hospitalAuthorityToken;
  let adminToken;
  let hospitalId;
  let hospitalAuthorityUser;
  let adminUser;

  beforeEach(() => {
    // Clean up database
    db.exec(`
      DELETE FROM resource_audit_log;
      DELETE FROM bookings;
      DELETE FROM hospitals;
      DELETE FROM users;
    `);

    // Create test users
    adminUser = UserService.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'password123',
      userType: 'admin'
    });

    hospitalAuthorityUser = UserService.create({
      name: 'Hospital Authority',
      email: 'authority@test.com',
      password: 'password123',
      userType: 'hospital-authority'
    });

    // Create test hospital
    const hospital = HospitalService.create({
      name: 'Test Hospital',
      address: '123 Test St',
      city: 'Test City',
      phone: '123-456-7890',
      email: 'test@hospital.com',
      beds: 50,
      icu: 10,
      operationTheatres: 5
    });
    hospitalId = hospital.id;

    // Assign hospital to authority
    db.prepare(`
      UPDATE users SET hospital_id = ? WHERE id = ?
    `).run(hospitalId, hospitalAuthorityUser.id);

    // Generate tokens
    hospitalAuthorityToken = UserService.generateToken(hospitalAuthorityUser.id);
    adminToken = UserService.generateToken(adminUser.id);
  });

  afterEach(() => {
    // Clean up
    db.exec(`
      DELETE FROM resource_audit_log;
      DELETE FROM bookings;
      DELETE FROM hospitals;
      DELETE FROM users;
    `);
  });

  describe('PUT /api/hospitals/:id/resources', () => {
    it('should update hospital resources successfully', async () => {
      const resourceUpdate = {
        beds: {
          total: 60,
          available: 45,
          occupied: 10,
          reserved: 3,
          maintenance: 2
        },
        icu: {
          total: 12,
          available: 8,
          occupied: 3,
          reserved: 1,
          maintenance: 0
        }
      };

      const response = await request(app)
        .put(`/api/hospitals/${hospitalId}/resources`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send(resourceUpdate)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.exist;
      expect(response.body.data.hospitalId).to.equal(hospitalId);
      expect(response.body.message).to.include('updated successfully');
    });

    it('should reject invalid resource data', async () => {
      const invalidUpdate = {
        beds: {
          total: 50,
          available: 60, // More available than total
          occupied: 10,
          reserved: 0,
          maintenance: 0
        }
      };

      const response = await request(app)
        .put(`/api/hospitals/${hospitalId}/resources`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('exceeds total');
    });

    it('should reject negative resource quantities', async () => {
      const invalidUpdate = {
        beds: {
          total: 50,
          available: -5, // Negative value
          occupied: 10,
          reserved: 0,
          maintenance: 0
        }
      };

      const response = await request(app)
        .put(`/api/hospitals/${hospitalId}/resources`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('negative');
    });

    it('should reject unauthorized access from different hospital authority', async () => {
      // Create another hospital authority for different hospital
      const otherAuthority = UserService.create({
        name: 'Other Authority',
        email: 'other@test.com',
        password: 'password123',
        userType: 'hospital-authority',
        hospital_id: 999 // Different hospital
      });

      const otherToken = UserService.generateToken(otherAuthority.id);

      const resourceUpdate = {
        beds: {
          total: 50,
          available: 40,
          occupied: 10,
          reserved: 0,
          maintenance: 0
        }
      };

      const response = await request(app)
        .put(`/api/hospitals/${hospitalId}/resources`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send(resourceUpdate)
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('assigned hospital');
    });

    it('should reject unauthenticated requests', async () => {
      const resourceUpdate = {
        beds: {
          total: 50,
          available: 40,
          occupied: 10,
          reserved: 0,
          maintenance: 0
        }
      };

      const response = await request(app)
        .put(`/api/hospitals/${hospitalId}/resources`)
        .send(resourceUpdate)
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('token required');
    });
  });

  describe('GET /api/hospitals/:id/resources/history', () => {
    beforeEach(async () => {
      // Create some resource history by making updates
      const resourceUpdate = {
        beds: {
          total: 55,
          available: 40,
          occupied: 12,
          reserved: 2,
          maintenance: 1
        }
      };

      await request(app)
        .put(`/api/hospitals/${hospitalId}/resources`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send(resourceUpdate);
    });

    it('should return resource history successfully', async () => {
      const response = await request(app)
        .get(`/api/hospitals/${hospitalId}/resources/history`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.exist;
      expect(response.body.data).to.be.an('array');
      expect(response.body.totalCount).to.exist;
      expect(response.body.pagination).to.exist;
    });

    it('should filter history by resource type', async () => {
      const response = await request(app)
        .get(`/api/hospitals/${hospitalId}/resources/history?resourceType=beds`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.filters.resourceType).to.equal('beds');
      
      // All returned records should be for beds
      response.body.data.forEach(record => {
        expect(record.resourceType).to.equal('beds');
      });
    });

    it('should filter history by change type', async () => {
      const response = await request(app)
        .get(`/api/hospitals/${hospitalId}/resources/history?changeType=manual_update`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.filters.changeType).to.equal('manual_update');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/hospitals/${hospitalId}/resources/history?limit=5&offset=0`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.pagination.limit).to.equal(5);
      expect(response.body.pagination.offset).to.equal(0);
      expect(response.body.data.length).to.be.at.most(5);
    });

    it('should reject unauthorized access', async () => {
      const response = await request(app)
        .get(`/api/hospitals/${hospitalId}/resources/history`)
        .expect(401);

      expect(response.body.success).to.be.false;
    });
  });

  describe('POST /api/hospitals/:id/resources/validate', () => {
    it('should validate correct resource data', async () => {
      const resourceData = {
        resources: {
          beds: {
            total: 50,
            available: 35,
            occupied: 10,
            reserved: 3,
            maintenance: 2
          },
          icu: {
            total: 10,
            available: 7,
            occupied: 2,
            reserved: 1,
            maintenance: 0
          }
        }
      };

      const response = await request(app)
        .post(`/api/hospitals/${hospitalId}/resources/validate`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send(resourceData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.valid).to.be.true;
      expect(response.body.availabilityChecks).to.exist;
      expect(response.body.recommendations).to.exist;
    });

    it('should reject invalid resource data', async () => {
      const invalidData = {
        resources: {
          beds: {
            total: 50,
            available: 60, // More than total
            occupied: 10,
            reserved: 0,
            maintenance: 0
          }
        }
      };

      const response = await request(app)
        .post(`/api/hospitals/${hospitalId}/resources/validate`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.valid).to.be.false;
      expect(response.body.error).to.include('exceeds total');
    });

    it('should reject negative quantities', async () => {
      const invalidData = {
        resources: {
          beds: {
            total: 50,
            available: -10, // Negative
            occupied: 10,
            reserved: 0,
            maintenance: 0
          }
        }
      };

      const response = await request(app)
        .post(`/api/hospitals/${hospitalId}/resources/validate`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.valid).to.be.false;
      expect(response.body.error).to.include('non-negative');
    });

    it('should reject invalid resource types', async () => {
      const invalidData = {
        resources: {
          invalidType: {
            total: 50,
            available: 40,
            occupied: 10,
            reserved: 0,
            maintenance: 0
          }
        }
      };

      const response = await request(app)
        .post(`/api/hospitals/${hospitalId}/resources/validate`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.valid).to.be.false;
      expect(response.body.error).to.include('Invalid resource type');
    });

    it('should require resource data', async () => {
      const response = await request(app)
        .post(`/api/hospitals/${hospitalId}/resources/validate`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Resource data is required');
    });

    it('should reject unauthorized access', async () => {
      const resourceData = {
        resources: {
          beds: {
            total: 50,
            available: 40,
            occupied: 10,
            reserved: 0,
            maintenance: 0
          }
        }
      };

      const response = await request(app)
        .post(`/api/hospitals/${hospitalId}/resources/validate`)
        .send(resourceData)
        .expect(401);

      expect(response.body.success).to.be.false;
    });
  });

  describe('Authorization and Security', () => {
    it('should allow admin access to any hospital resources', async () => {
      const resourceUpdate = {
        beds: {
          total: 45,
          available: 35,
          occupied: 8,
          reserved: 2,
          maintenance: 0
        }
      };

      const response = await request(app)
        .put(`/api/hospitals/${hospitalId}/resources`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(resourceUpdate)
        .expect(200);

      expect(response.body.success).to.be.true;
    });

    it('should reject regular user access', async () => {
      const regularUser = UserService.create({
        name: 'Regular User',
        email: 'user@test.com',
        password: 'password123',
        userType: 'user'
      });

      const userToken = UserService.generateToken(regularUser.id);

      const resourceUpdate = {
        beds: {
          total: 50,
          available: 40,
          occupied: 10,
          reserved: 0,
          maintenance: 0
        }
      };

      const response = await request(app)
        .put(`/api/hospitals/${hospitalId}/resources`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(resourceUpdate)
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Hospital authority');
    });

    it('should validate JWT token format', async () => {
      const response = await request(app)
        .get(`/api/hospitals/${hospitalId}/resources/history`)
        .set('Authorization', 'InvalidToken')
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('token required');
    });

    it('should reject expired or invalid tokens', async () => {
      const response = await request(app)
        .get(`/api/hospitals/${hospitalId}/resources/history`)
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Invalid token');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent hospital ID', async () => {
      const resourceUpdate = {
        beds: {
          total: 50,
          available: 40,
          occupied: 10,
          reserved: 0,
          maintenance: 0
        }
      };

      const response = await request(app)
        .put('/api/hospitals/99999/resources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(resourceUpdate)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('not found');
    });

    it('should handle malformed request data', async () => {
      const response = await request(app)
        .put(`/api/hospitals/${hospitalId}/resources`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send('invalid json')
        .expect(400);

      expect(response.body.success).to.be.false;
    });

    it('should handle database errors gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll test with invalid hospital ID which should trigger error handling
      const response = await request(app)
        .get('/api/hospitals/invalid/resources/history')
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .expect(500);

      expect(response.body.success).to.be.false;
    });
  });
});