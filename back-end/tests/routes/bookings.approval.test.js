const { describe, it, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const request = require('supertest');
const app = require('../../index');
const db = require('../../config/database');
const UserService = require('../../services/userService');
const HospitalService = require('../../services/hospitalService');
const BookingService = require('../../services/bookingService');

describe('Booking Approval API Endpoints', () => {
  let hospitalAuthorityToken;
  let adminToken;
  let patientToken;
  let hospitalId;
  let hospitalAuthorityUser;
  let adminUser;
  let patientUser;
  let testBookingId;

  beforeEach(() => {
    // Clean up database - disable foreign keys temporarily
    db.exec('PRAGMA foreign_keys = OFF;');
    db.exec(`
      DELETE FROM booking_status_history;
      DELETE FROM resource_audit_log;
      DELETE FROM bookings;
      DELETE FROM hospitals;
      DELETE FROM users;
    `);
    db.exec('PRAGMA foreign_keys = ON;');

    // Create test users
    adminUser = UserService.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'password123',
      userType: 'admin'
    });

    // Create test hospital first
    const hospital = HospitalService.create({
      name: 'Test Hospital',
      address: {
        street: '123 Test St',
        city: 'Test City'
      },
      contact: {
        phone: '123-456-7890',
        email: 'test@hospital.com'
      },
      resources: {
        beds: { total: 50, available: 50, occupied: 0 },
        icu: { total: 10, available: 10, occupied: 0 },
        operationTheatres: { total: 5, available: 5, occupied: 0 }
      }
    });
    hospitalId = hospital.id;

    hospitalAuthorityUser = UserService.create({
      name: 'Hospital Authority',
      email: 'authority@test.com',
      password: 'password123',
      userType: 'hospital-authority',
      hospital_id: hospitalId
    });

    patientUser = UserService.create({
      name: 'Patient User',
      email: 'patient@test.com',
      password: 'password123',
      userType: 'user'
    });

    // Create test booking
    const booking = BookingService.create({
      userId: patientUser.id,
      hospitalId: hospitalId,
      resourceType: 'beds',
      patientName: 'Test Patient',
      patientAge: 30,
      patientGender: 'male',
      emergencyContactName: 'Emergency Contact',
      emergencyContactPhone: '123-456-7890',
      emergencyContactRelationship: 'spouse',
      medicalCondition: 'Test condition',
      urgency: 'high',
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      estimatedDuration: 24,
      notes: 'Test booking'
    });
    testBookingId = booking.id;

    // Generate tokens
    hospitalAuthorityToken = UserService.generateToken(hospitalAuthorityUser.id);
    adminToken = UserService.generateToken(adminUser.id);
    patientToken = UserService.generateToken(patientUser.id);
  });

  afterEach(() => {
    // Clean up - disable foreign keys temporarily
    db.exec('PRAGMA foreign_keys = OFF;');
    db.exec(`
      DELETE FROM booking_status_history;
      DELETE FROM resource_audit_log;
      DELETE FROM bookings;
      DELETE FROM hospitals;
      DELETE FROM users;
    `);
    db.exec('PRAGMA foreign_keys = ON;');
  });

  describe('GET /api/bookings/hospital/:hospitalId/pending', () => {
    it('should return pending bookings for hospital authority', async () => {
      const response = await request(app)
        .get(`/api/bookings/hospital/${hospitalId}/pending`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      expect(response.body.totalCount).to.exist;
      expect(response.body.summary).to.exist;
      
      // Should include our test booking
      expect(response.body.data.length).to.be.at.least(1);
      const booking = response.body.data.find(b => b.id === testBookingId);
      expect(booking).to.exist;
      expect(booking.status).to.equal('pending');
    });

    it('should filter bookings by urgency', async () => {
      const response = await request(app)
        .get(`/api/bookings/hospital/${hospitalId}/pending?urgency=high`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.filters.urgency).to.equal('high');
      
      // All returned bookings should have high urgency
      response.body.data.forEach(booking => {
        expect(booking.urgency).to.equal('high');
      });
    });

    it('should filter bookings by resource type', async () => {
      const response = await request(app)
        .get(`/api/bookings/hospital/${hospitalId}/pending?resourceType=beds`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.filters.resourceType).to.equal('beds');
      
      // All returned bookings should be for beds
      response.body.data.forEach(booking => {
        expect(booking.resourceType).to.equal('beds');
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/bookings/hospital/${hospitalId}/pending?limit=5`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.length).to.be.at.most(5);
    });

    it('should reject access from different hospital authority', async () => {
      // Create another hospital for different authority
      const otherHospital = HospitalService.create({
        name: 'Other Hospital',
        address: { street: '456 Other St', city: 'Other City' },
        contact: { phone: '987-654-3210', email: 'other@hospital.com' },
        resources: {
          beds: { total: 30, available: 30, occupied: 0 },
          icu: { total: 5, available: 5, occupied: 0 },
          operationTheatres: { total: 3, available: 3, occupied: 0 }
        }
      });

      // Create another hospital authority for different hospital
      const otherAuthority = UserService.create({
        name: 'Other Authority',
        email: 'other@test.com',
        password: 'password123',
        userType: 'hospital-authority',
        hospital_id: otherHospital.id
      });

      const otherToken = UserService.generateToken(otherAuthority.id);

      const response = await request(app)
        .get(`/api/bookings/hospital/${hospitalId}/pending`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('assigned hospital');
    });

    it('should allow admin access to any hospital', async () => {
      const response = await request(app)
        .get(`/api/bookings/hospital/${hospitalId}/pending`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get(`/api/bookings/hospital/${hospitalId}/pending`)
        .expect(401);

      expect(response.body.success).to.be.false;
    });
  });

  describe('PUT /api/bookings/:id/approve', () => {
    it('should approve booking successfully', async () => {
      const approvalData = {
        notes: 'Approved for immediate admission',
        resourcesAllocated: 1,
        autoAllocateResources: true
      };

      const response = await request(app)
        .put(`/api/bookings/${testBookingId}/approve`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send(approvalData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.booking.status).to.equal('approved');
      expect(response.body.data.approvedBy).to.equal(hospitalAuthorityUser.id);
      expect(response.body.data.notes).to.equal(approvalData.notes);
      expect(response.body.message).to.include('approved successfully');
    });

    it('should approve booking with custom resource allocation', async () => {
      const approvalData = {
        notes: 'Approved with 2 beds',
        resourcesAllocated: 2,
        autoAllocateResources: true
      };

      const response = await request(app)
        .put(`/api/bookings/${testBookingId}/approve`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send(approvalData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.resourcesAllocated).to.equal(2);
    });

    it('should approve booking with updated scheduled date', async () => {
      const newDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const approvalData = {
        notes: 'Approved for later date',
        scheduledDate: newDate.toISOString(),
        autoAllocateResources: true
      };

      const response = await request(app)
        .put(`/api/bookings/${testBookingId}/approve`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send(approvalData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(new Date(response.body.data.booking.scheduledDate).getTime())
        .to.be.closeTo(newDate.getTime(), 1000);
    });

    it('should reject approval with insufficient resources', async () => {
      // First, reduce available beds to 0
      const resourceUpdate = {
        beds: {
          total: 50,
          available: 0,
          occupied: 50,
          reserved: 0,
          maintenance: 0
        }
      };

      await request(app)
        .put(`/api/hospitals/${hospitalId}/resources`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send(resourceUpdate);

      // Now try to approve booking
      const approvalData = {
        notes: 'Should fail due to no available beds',
        autoAllocateResources: true
      };

      const response = await request(app)
        .put(`/api/bookings/${testBookingId}/approve`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send(approvalData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Insufficient');
    });

    it('should reject approval of non-existent booking', async () => {
      const approvalData = {
        notes: 'This should fail',
        autoAllocateResources: true
      };

      const response = await request(app)
        .put('/api/bookings/99999/approve')
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send(approvalData)
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('not found');
    });

    it('should reject approval from different hospital authority', async () => {
      // Create another hospital for different authority
      const otherHospital = HospitalService.create({
        name: 'Other Hospital',
        address: { street: '456 Other St', city: 'Other City' },
        contact: { phone: '987-654-3210', email: 'other@hospital.com' },
        resources: {
          beds: { total: 30, available: 30, occupied: 0 },
          icu: { total: 5, available: 5, occupied: 0 },
          operationTheatres: { total: 3, available: 3, occupied: 0 }
        }
      });

      const otherAuthority = UserService.create({
        name: 'Other Authority',
        email: 'other@test.com',
        password: 'password123',
        userType: 'hospital-authority',
        hospital_id: otherHospital.id
      });

      const otherToken = UserService.generateToken(otherAuthority.id);

      const approvalData = {
        notes: 'Should be rejected',
        autoAllocateResources: true
      };

      const response = await request(app)
        .put(`/api/bookings/${testBookingId}/approve`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send(approvalData)
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('assigned hospital');
    });

    it('should allow admin to approve any booking', async () => {
      const approvalData = {
        notes: 'Admin approval',
        autoAllocateResources: true
      };

      const response = await request(app)
        .put(`/api/bookings/${testBookingId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(approvalData)
        .expect(200);

      expect(response.body.success).to.be.true;
    });
  });

  describe('PUT /api/bookings/:id/decline', () => {
    it('should decline booking successfully', async () => {
      const declineData = {
        reason: 'No available beds',
        notes: 'Please try another hospital',
        alternativeSuggestions: [
          'City General Hospital has availability',
          'Consider scheduling for next week'
        ]
      };

      const response = await request(app)
        .put(`/api/bookings/${testBookingId}/decline`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send(declineData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.booking.status).to.equal('declined');
      expect(response.body.data.reason).to.equal(declineData.reason);
      expect(response.body.data.notes).to.equal(declineData.notes);
      expect(response.body.data.alternativeSuggestions).to.deep.equal(declineData.alternativeSuggestions);
    });

    it('should require decline reason', async () => {
      const declineData = {
        notes: 'Missing reason'
      };

      const response = await request(app)
        .put(`/api/bookings/${testBookingId}/decline`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send(declineData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('reason is required');
    });

    it('should decline booking with minimal data', async () => {
      const declineData = {
        reason: 'Resource unavailable'
      };

      const response = await request(app)
        .put(`/api/bookings/${testBookingId}/decline`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send(declineData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.reason).to.equal(declineData.reason);
    });

    it('should reject decline of non-existent booking', async () => {
      const declineData = {
        reason: 'This should fail'
      };

      const response = await request(app)
        .put('/api/bookings/99999/decline')
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send(declineData)
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('not found');
    });

    it('should reject decline from different hospital authority', async () => {
      // Create another hospital for different authority
      const otherHospital = HospitalService.create({
        name: 'Other Hospital',
        address: { street: '456 Other St', city: 'Other City' },
        contact: { phone: '987-654-3210', email: 'other@hospital.com' },
        resources: {
          beds: { total: 30, available: 30, occupied: 0 },
          icu: { total: 5, available: 5, occupied: 0 },
          operationTheatres: { total: 3, available: 3, occupied: 0 }
        }
      });

      const otherAuthority = UserService.create({
        name: 'Other Authority',
        email: 'other@test.com',
        password: 'password123',
        userType: 'hospital-authority',
        hospital_id: otherHospital.id
      });

      const otherToken = UserService.generateToken(otherAuthority.id);

      const declineData = {
        reason: 'Should be rejected'
      };

      const response = await request(app)
        .put(`/api/bookings/${testBookingId}/decline`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send(declineData)
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('assigned hospital');
    });
  });

  describe('GET /api/bookings/hospital/:hospitalId/history', () => {
    beforeEach(async () => {
      // Create some booking history by approving and declining bookings
      const booking2 = BookingService.create({
        userId: patientUser.id,
        hospitalId: hospitalId,
        resourceType: 'icu',
        patientName: 'Test Patient 2',
        patientAge: 25,
        patientGender: 'female',
        emergencyContactName: 'Emergency Contact 2',
        emergencyContactPhone: '123-456-7891',
        emergencyContactRelationship: 'parent',
        medicalCondition: 'Test condition 2',
        urgency: 'medium',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 12,
        notes: 'Test booking 2'
      });

      // Approve first booking
      await request(app)
        .put(`/api/bookings/${testBookingId}/approve`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send({
          notes: 'Approved for testing',
          autoAllocateResources: true
        });

      // Decline second booking
      await request(app)
        .put(`/api/bookings/${booking2.id}/decline`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send({
          reason: 'No ICU available',
          notes: 'Declined for testing'
        });
    });

    it('should return booking history for hospital', async () => {
      const response = await request(app)
        .get(`/api/bookings/hospital/${hospitalId}/history`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      expect(response.body.totalCount).to.exist;
      expect(response.body.data.length).to.be.at.least(2);

      // Should include both approved and declined bookings
      const statuses = response.body.data.map(b => b.status);
      expect(statuses).to.include('approved');
      expect(statuses).to.include('declined');
    });

    it('should filter history by status', async () => {
      const response = await request(app)
        .get(`/api/bookings/hospital/${hospitalId}/history?status=approved`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.filters.status).to.equal('approved');
      
      // All returned bookings should be approved
      response.body.data.forEach(booking => {
        expect(booking.status).to.equal('approved');
      });
    });

    it('should support date range filtering', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const response = await request(app)
        .get(`/api/bookings/hospital/${hospitalId}/history?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.filters.startDate).to.exist;
      expect(response.body.filters.endDate).to.exist;
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/bookings/hospital/${hospitalId}/history?limit=1&offset=0`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.length).to.equal(1);
      expect(response.body.currentPage).to.equal(1);
      expect(response.body.totalPages).to.be.at.least(1);
    });

    it('should reject access from different hospital authority', async () => {
      // Create another hospital for different authority
      const otherHospital = HospitalService.create({
        name: 'Other Hospital',
        address: { street: '456 Other St', city: 'Other City' },
        contact: { phone: '987-654-3210', email: 'other@hospital.com' },
        resources: {
          beds: { total: 30, available: 30, occupied: 0 },
          icu: { total: 5, available: 5, occupied: 0 },
          operationTheatres: { total: 3, available: 3, occupied: 0 }
        }
      });

      const otherAuthority = UserService.create({
        name: 'Other Authority',
        email: 'other@test.com',
        password: 'password123',
        userType: 'hospital-authority',
        hospital_id: otherHospital.id
      });

      const otherToken = UserService.generateToken(otherAuthority.id);

      const response = await request(app)
        .get(`/api/bookings/hospital/${hospitalId}/history`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('assigned hospital');
    });

    it('should allow admin access to any hospital history', async () => {
      const response = await request(app)
        .get(`/api/bookings/hospital/${hospitalId}/history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent hospital ID', async () => {
      const response = await request(app)
        .get('/api/bookings/hospital/99999/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('not found');
    });

    it('should handle malformed request data', async () => {
      const response = await request(app)
        .put(`/api/bookings/${testBookingId}/approve`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send('invalid json')
        .expect(400);

      expect(response.body.success).to.be.false;
    });

    it('should handle database errors gracefully', async () => {
      // Test with invalid booking ID format
      const response = await request(app)
        .put('/api/bookings/invalid/approve')
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send({
          notes: 'This should fail',
          autoAllocateResources: true
        })
        .expect(500);

      expect(response.body.success).to.be.false;
    });
  });
});