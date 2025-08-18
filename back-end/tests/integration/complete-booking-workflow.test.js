const request = require('supertest');
const { expect } = require('chai');
const app = require('../../index');
const db = require('../../config/database');

describe('Complete Booking Workflow Integration', () => {
  let userToken, hospitalAuthorityToken, adminToken;
  let userId, hospitalAuthorityId, hospitalId, bookingId;
  let bookingReference;

  before(async () => {
    // Clean up test data
    await db.prepare('DELETE FROM bookings WHERE patientName LIKE ?').run('%Test Patient%');
    await db.prepare('DELETE FROM users WHERE email LIKE ?').run('%test-integration%');
    await db.prepare('DELETE FROM hospitals WHERE name LIKE ?').run('%Test Integration Hospital%');
    
    // Create test users
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User Integration',
        email: 'user-test-integration@example.com',
        password: 'password123',
        phone: '01234567890',
        userType: 'user'
      });
    
    expect(userResponse.status).to.equal(201);
    userId = userResponse.body.data.user ? userResponse.body.data.user.id : userResponse.body.data.id;

    // Login to get token
    const userLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user-test-integration@example.com',
        password: 'password123'
      });
    
    expect(userLoginResponse.status).to.equal(200);
    userToken = userLoginResponse.body.data.token;

    const hospitalAuthorityResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Hospital Authority Integration',
        email: 'authority-test-integration@example.com',
        password: 'password123',
        phone: '01234567891',
        userType: 'hospital-authority',
        hospital: {
          name: 'Test Integration Hospital',
          type: 'general',
          address: {
            street: '123 Test Street',
            city: 'Test City',
            state: 'Test State',
            zipCode: '12345',
            country: 'Bangladesh'
          },
          contact: {
            phone: '01234567893',
            email: 'hospital-integration@example.com',
            emergency: '999'
          },
          capacity: {
            totalBeds: 50,
            icuBeds: 10,
            operationTheaters: 5
          }
        }
      });
    
    expect(hospitalAuthorityResponse.status).to.equal(201);
    hospitalAuthorityId = hospitalAuthorityResponse.body.data.user ? hospitalAuthorityResponse.body.data.user.id : hospitalAuthorityResponse.body.data.id;

    // Login to get token
    const authorityLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'authority-test-integration@example.com',
        password: 'password123'
      });
    
    expect(authorityLoginResponse.status).to.equal(200);
    hospitalAuthorityToken = authorityLoginResponse.body.data.token;

    // Get hospital ID from the hospital authority registration
    hospitalId = hospitalAuthorityResponse.body.data.hospital ? hospitalAuthorityResponse.body.data.hospital.id : null;
    
    if (!hospitalId) {
      // If hospital wasn't created during registration, create it manually
      const hospitalResponse = await request(app)
        .post('/api/hospitals')
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send({
          name: 'Test Integration Hospital',
          address: '123 Test Street, Test City',
          phone: '01234567893',
          email: 'hospital-integration@example.com',
          description: 'Test hospital for integration testing',
          resources: {
            beds: { total: 50, available: 30 },
            icu: { total: 10, available: 5 },
            operationTheatres: { total: 5, available: 2 }
          }
        });
      
      if (hospitalResponse.status === 201) {
        hospitalId = hospitalResponse.body.hospital.id;
      }
    }

    // Associate hospital authority with hospital if not already done
    await db.prepare('UPDATE users SET hospital_id = ? WHERE id = ?').run(hospitalId, hospitalAuthorityId);

    // Approve the hospital
    await db.prepare('UPDATE hospitals SET approval_status = ? WHERE id = ?').run('approved', hospitalId);
  });

  after(async () => {
    // Clean up test data
    await db.prepare('DELETE FROM bookings WHERE patientName LIKE ?').run('%Test Patient%');
    await db.prepare('DELETE FROM users WHERE email LIKE ?').run('%test-integration%');
    await db.prepare('DELETE FROM hospitals WHERE name LIKE ?').run('%Test Integration Hospital%');
  });

  describe('1. Hospital Discovery and Resource Availability', () => {
    it('should display available hospitals with real-time resource information', async () => {
      const response = await request(app)
        .get('/api/hospitals')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.hospitals).to.be.an('array');
      
      const testHospital = response.body.hospitals.find(h => h.name === 'Test Integration Hospital');
      expect(testHospital).to.exist;
      expect(testHospital.resources).to.exist;
      expect(testHospital.resources.beds.available).to.be.a('number');
      expect(testHospital.resources.icu.available).to.be.a('number');
      expect(testHospital.resources.operationTheatres.available).to.be.a('number');
    });

    it('should show detailed hospital information with resource availability', async () => {
      const response = await request(app)
        .get(`/api/hospitals/${hospitalId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.hospital.name).to.equal('Test Integration Hospital');
      expect(response.body.hospital.resources).to.exist;
      expect(response.body.hospital.approved).to.be.true;
    });
  });

  describe('2. Booking Request Creation', () => {
    it('should create a new booking request with all required information', async () => {
      const bookingData = {
        hospitalId: hospitalId,
        resourceType: 'beds',
        patientName: 'Test Patient Integration',
        patientAge: 35,
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'high',
        emergencyContactName: 'Test Emergency Contact',
        emergencyContactPhone: '01234567894',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 48
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(bookingData);

      expect(response.status).to.equal(201);
      expect(response.body.booking).to.exist;
      expect(response.body.booking.status).to.equal('pending');
      expect(response.body.booking.bookingReference).to.exist;
      expect(response.body.booking.patientName).to.equal('Test Patient Integration');
      
      bookingId = response.body.booking.id;
      bookingReference = response.body.booking.bookingReference;
    });

    it('should validate required fields and prevent invalid bookings', async () => {
      const invalidBookingData = {
        hospitalId: hospitalId,
        resourceType: 'beds',
        // Missing required fields
        patientName: '',
        patientAge: -1,
        urgency: 'invalid'
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidBookingData);

      expect(response.status).to.equal(400);
      expect(response.body.error).to.exist;
    });

    it('should generate unique booking reference numbers', async () => {
      const bookingData = {
        hospitalId: hospitalId,
        resourceType: 'icu',
        patientName: 'Test Patient Integration 2',
        patientAge: 45,
        patientGender: 'female',
        medicalCondition: 'Critical care needed',
        urgency: 'critical',
        emergencyContactName: 'Test Emergency Contact 2',
        emergencyContactPhone: '01234567895',
        emergencyContactRelationship: 'parent',
        scheduledDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 72
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(bookingData);

      expect(response.status).to.equal(201);
      expect(response.body.booking.bookingReference).to.exist;
      expect(response.body.booking.bookingReference).to.not.equal(bookingReference);
    });
  });

  describe('3. Real-time Notifications', () => {
    it('should create notification when booking is submitted', async () => {
      // Check user notifications
      const userNotificationsResponse = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(userNotificationsResponse.status).to.equal(200);
      const userNotifications = userNotificationsResponse.body.notifications;
      const bookingNotification = userNotifications.find(n => 
        n.type === 'booking_submitted' && n.bookingId === bookingId
      );
      expect(bookingNotification).to.exist;

      // Check hospital authority notifications
      const authorityNotificationsResponse = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`);

      expect(authorityNotificationsResponse.status).to.equal(200);
      const authorityNotifications = authorityNotificationsResponse.body.notifications;
      const newBookingNotification = authorityNotifications.find(n => 
        n.type === 'booking_submitted' && n.bookingId === bookingId
      );
      expect(newBookingNotification).to.exist;
    });
  });

  describe('4. Hospital Authority Booking Management', () => {
    it('should display pending bookings for hospital authority', async () => {
      const response = await request(app)
        .get(`/api/bookings/hospital/${hospitalId}/pending`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.bookings).to.be.an('array');
      
      const pendingBooking = response.body.bookings.find(b => b.id === bookingId);
      expect(pendingBooking).to.exist;
      expect(pendingBooking.status).to.equal('pending');
      expect(pendingBooking.patientName).to.equal('Test Patient Integration');
    });

    it('should allow hospital authority to approve booking', async () => {
      const response = await request(app)
        .put(`/api/bookings/${bookingId}/approve`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send({
          authorityNotes: 'Approved for emergency treatment'
        });

      expect(response.status).to.equal(200);
      expect(response.body.booking.status).to.equal('approved');
      expect(response.body.booking.authorityNotes).to.equal('Approved for emergency treatment');
      expect(response.body.booking.approvedBy).to.equal(hospitalAuthorityId);
      expect(response.body.booking.approvedAt).to.exist;
    });

    it('should update resource availability after approval', async () => {
      const response = await request(app)
        .get(`/api/hospitals/${hospitalId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).to.equal(200);
      // Available beds should be reduced by 1
      expect(response.body.hospital.resources.beds.available).to.equal(29);
      expect(response.body.hospital.resources.beds.occupied).to.equal(21);
    });

    it('should create approval notification for user', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).to.equal(200);
      const notifications = response.body.notifications;
      const approvalNotification = notifications.find(n => 
        n.type === 'booking_approved' && n.bookingId === bookingId
      );
      expect(approvalNotification).to.exist;
      expect(approvalNotification.isRead).to.be.false;
    });
  });

  describe('5. Booking Status Tracking', () => {
    it('should show updated booking status in user dashboard', async () => {
      const response = await request(app)
        .get('/api/bookings/user')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).to.equal(200);
      const userBooking = response.body.bookings.find(b => b.id === bookingId);
      expect(userBooking).to.exist;
      expect(userBooking.status).to.equal('approved');
      expect(userBooking.approvedAt).to.exist;
    });

    it('should retrieve booking by reference number', async () => {
      const response = await request(app)
        .get(`/api/bookings/reference/${bookingReference}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.booking.id).to.equal(bookingId);
      expect(response.body.booking.status).to.equal('approved');
    });

    it('should show booking history with status changes', async () => {
      const response = await request(app)
        .get(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.booking.statusHistory).to.be.an('array');
      expect(response.body.booking.statusHistory.length).to.be.at.least(2);
      
      const statusChanges = response.body.booking.statusHistory;
      expect(statusChanges.some(s => s.newStatus === 'pending')).to.be.true;
      expect(statusChanges.some(s => s.newStatus === 'approved')).to.be.true;
    });
  });

  describe('6. Concurrent Booking Scenarios', () => {
    it('should handle resource conflicts when multiple users book same resource', async () => {
      // Create another user
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User 2 Integration',
          email: 'user2-test-integration@example.com',
          password: 'password123',
          phone: '01234567896',
          userType: 'user'
        });
      
      const user2Token = user2Response.body.token;

      // Both users try to book the last available ICU bed
      const bookingData = {
        hospitalId: hospitalId,
        resourceType: 'icu',
        patientName: 'Test Patient Concurrent',
        patientAge: 30,
        patientGender: 'male',
        medicalCondition: 'Emergency care needed',
        urgency: 'high',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '01234567897',
        emergencyContactRelationship: 'friend',
        scheduledDate: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 24
      };

      // Create multiple bookings simultaneously
      const promises = [
        request(app).post('/api/bookings').set('Authorization', `Bearer ${userToken}`).send(bookingData),
        request(app).post('/api/bookings').set('Authorization', `Bearer ${user2Token}`).send(bookingData),
        request(app).post('/api/bookings').set('Authorization', `Bearer ${userToken}`).send(bookingData)
      ];

      const responses = await Promise.all(promises);
      
      // All should be created as pending (resource allocation happens on approval)
      responses.forEach(response => {
        expect(response.status).to.equal(201);
        expect(response.body.booking.status).to.equal('pending');
      });
    });

    it('should prevent over-allocation of resources during approval', async () => {
      // Get all pending ICU bookings
      const pendingResponse = await request(app)
        .get(`/api/bookings/hospital/${hospitalId}/pending`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`);

      const icuBookings = pendingResponse.body.bookings.filter(b => b.resourceType === 'icu');
      
      if (icuBookings.length > 0) {
        // Try to approve more bookings than available resources
        const approvalPromises = icuBookings.slice(0, 10).map(booking => 
          request(app)
            .put(`/api/bookings/${booking.id}/approve`)
            .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
            .send({ authorityNotes: 'Approved' })
        );

        const approvalResponses = await Promise.all(approvalPromises);
        
        // Some should succeed, others should fail due to resource constraints
        const successfulApprovals = approvalResponses.filter(r => r.status === 200);
        const failedApprovals = approvalResponses.filter(r => r.status !== 200);
        
        expect(successfulApprovals.length).to.be.at.most(5); // Max available ICU beds
        if (icuBookings.length > 5) {
          expect(failedApprovals.length).to.be.at.least(1);
        }
      }
    });
  });

  describe('7. Booking Completion and Resource Release', () => {
    it('should allow hospital authority to complete booking', async () => {
      const response = await request(app)
        .put(`/api/bookings/${bookingId}/complete`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send({
          completionNotes: 'Patient discharged successfully'
        });

      expect(response.status).to.equal(200);
      expect(response.body.booking.status).to.equal('completed');
    });

    it('should release resources when booking is completed', async () => {
      const response = await request(app)
        .get(`/api/hospitals/${hospitalId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).to.equal(200);
      // Available beds should be back to 30 after completion
      expect(response.body.hospital.resources.beds.available).to.equal(30);
      expect(response.body.hospital.resources.beds.occupied).to.equal(20);
    });

    it('should create completion notification for user', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).to.equal(200);
      const notifications = response.body.notifications;
      const completionNotification = notifications.find(n => 
        n.type === 'booking_completed' && n.bookingId === bookingId
      );
      expect(completionNotification).to.exist;
    });
  });

  describe('8. Booking Decline Workflow', () => {
    let declineBookingId;

    it('should create a booking for decline testing', async () => {
      const bookingData = {
        hospitalId: hospitalId,
        resourceType: 'operationTheatres',
        patientName: 'Test Patient Decline',
        patientAge: 40,
        patientGender: 'female',
        medicalCondition: 'Non-emergency procedure',
        urgency: 'low',
        emergencyContactName: 'Test Contact',
        emergencyContactPhone: '01234567898',
        emergencyContactRelationship: 'sibling',
        scheduledDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 12
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(bookingData);

      expect(response.status).to.equal(201);
      declineBookingId = response.body.booking.id;
    });

    it('should allow hospital authority to decline booking with reason', async () => {
      const response = await request(app)
        .put(`/api/bookings/${declineBookingId}/decline`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send({
          declineReason: 'Resource not available at requested time'
        });

      expect(response.status).to.equal(200);
      expect(response.body.booking.status).to.equal('declined');
      expect(response.body.booking.declineReason).to.equal('Resource not available at requested time');
    });

    it('should not affect resource availability when booking is declined', async () => {
      const response = await request(app)
        .get(`/api/hospitals/${hospitalId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).to.equal(200);
      // Operation theatre availability should remain unchanged
      expect(response.body.hospital.resources.operationTheatres.available).to.equal(2);
    });

    it('should create decline notification for user', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).to.equal(200);
      const notifications = response.body.notifications;
      const declineNotification = notifications.find(n => 
        n.type === 'booking_declined' && n.bookingId === declineBookingId
      );
      expect(declineNotification).to.exist;
    });
  });

  describe('9. Booking Cancellation', () => {
    let cancelBookingId;

    it('should create a booking for cancellation testing', async () => {
      const bookingData = {
        hospitalId: hospitalId,
        resourceType: 'beds',
        patientName: 'Test Patient Cancel',
        patientAge: 25,
        patientGender: 'male',
        medicalCondition: 'Routine check-up',
        urgency: 'low',
        emergencyContactName: 'Test Contact',
        emergencyContactPhone: '01234567899',
        emergencyContactRelationship: 'parent',
        scheduledDate: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 6
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(bookingData);

      expect(response.status).to.equal(201);
      cancelBookingId = response.body.booking.id;
    });

    it('should allow user to cancel their own booking', async () => {
      const response = await request(app)
        .delete(`/api/bookings/${cancelBookingId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.message).to.include('cancelled');
    });

    it('should update booking status to cancelled', async () => {
      const response = await request(app)
        .get(`/api/bookings/${cancelBookingId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.booking.status).to.equal('cancelled');
    });
  });

  describe('10. Error Handling and Recovery', () => {
    it('should handle invalid booking IDs gracefully', async () => {
      const response = await request(app)
        .get('/api/bookings/99999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).to.equal(404);
      expect(response.body.error).to.exist;
    });

    it('should prevent unauthorized access to other users bookings', async () => {
      // Create another user
      const user3Response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User 3 Integration',
          email: 'user3-test-integration@example.com',
          password: 'password123',
          phone: '01234567800',
          userType: 'user'
        });
      
      const user3Token = user3Response.body.token;

      // Try to access another user's booking
      const response = await request(app)
        .get(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${user3Token}`);

      expect(response.status).to.equal(403);
      expect(response.body.error).to.include('access');
    });

    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll test that the API responds appropriately to malformed requests
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          // Malformed data that might cause database errors
          hospitalId: 'invalid',
          resourceType: 'invalid_resource'
        });

      expect(response.status).to.be.oneOf([400, 500]);
      expect(response.body.error).to.exist;
    });
  });

  describe('11. Analytics and Reporting', () => {
    it('should provide booking statistics for hospital authority', async () => {
      const response = await request(app)
        .get(`/api/bookings/hospital/${hospitalId}/statistics`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.statistics).to.exist;
      expect(response.body.statistics.totalBookings).to.be.a('number');
      expect(response.body.statistics.approvedBookings).to.be.a('number');
      expect(response.body.statistics.declinedBookings).to.be.a('number');
      expect(response.body.statistics.completedBookings).to.be.a('number');
    });

    it('should provide booking history with filtering options', async () => {
      const response = await request(app)
        .get(`/api/bookings/hospital/${hospitalId}/history`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .query({
          status: 'completed',
          resourceType: 'beds',
          limit: 10
        });

      expect(response.status).to.equal(200);
      expect(response.body.bookings).to.be.an('array');
      
      if (response.body.bookings.length > 0) {
        response.body.bookings.forEach(booking => {
          expect(booking.status).to.equal('completed');
          expect(booking.resourceType).to.equal('beds');
        });
      }
    });
  });

  describe('12. Real-time Polling Integration', () => {
    it('should provide polling endpoint for real-time updates', async () => {
      const response = await request(app)
        .get('/api/polling/bookings')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.bookings).to.be.an('array');
      expect(response.body.timestamp).to.exist;
    });

    it('should provide hospital resource polling endpoint', async () => {
      const response = await request(app)
        .get('/api/polling/hospitals')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.hospitals).to.be.an('array');
      expect(response.body.timestamp).to.exist;
    });

    it('should provide notification polling endpoint', async () => {
      const response = await request(app)
        .get('/api/polling/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.notifications).to.be.an('array');
      expect(response.body.timestamp).to.exist;
    });
  });
});