const request = require('supertest');
const { expect } = require('chai');
const app = require('../../index');
const db = require('../../config/database');

describe('Real-time System Integration', () => {
  let userToken, hospitalAuthorityToken;
  let userId, hospitalAuthorityId, hospitalId;
  let bookingId;

  before(async () => {
    // Clean up test data
    await db.prepare('DELETE FROM bookings WHERE patientName LIKE ?').run('%Real-time Test%');
    await db.prepare('DELETE FROM users WHERE email LIKE ?').run('%realtime-test%');
    await db.prepare('DELETE FROM hospitals WHERE name LIKE ?').run('%Real-time Test Hospital%');
    
    // Create test users
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Real-time Test User',
        email: 'user-realtime-test@example.com',
        password: 'password123',
        phone: '01234567800',
        userType: 'user'
      });
    
    userToken = userResponse.body.token;
    userId = userResponse.body.user.id;

    const hospitalAuthorityResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Real-time Test Hospital Authority',
        email: 'authority-realtime-test@example.com',
        password: 'password123',
        phone: '01234567801',
        userType: 'hospital-authority'
      });
    
    hospitalAuthorityToken = hospitalAuthorityResponse.body.token;
    hospitalAuthorityId = hospitalAuthorityResponse.body.user.id;

    // Create test hospital
    const hospitalResponse = await request(app)
      .post('/api/hospitals')
      .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
      .send({
        name: 'Real-time Test Hospital',
        address: '123 Real-time Street',
        phone: '01234567802',
        email: 'realtime-hospital@example.com',
        description: 'Test hospital for real-time testing',
        resources: {
          beds: { total: 20, available: 15 },
          icu: { total: 5, available: 3 },
          operationTheatres: { total: 3, available: 2 }
        }
      });
    
    hospitalId = hospitalResponse.body.hospital.id;

    // Associate hospital authority with hospital
    await db.prepare('UPDATE users SET hospitalId = ? WHERE id = ?').run(hospitalId, hospitalAuthorityId);

    // Approve the hospital
    await db.prepare('UPDATE hospitals SET approved = 1 WHERE id = ?').run(hospitalId);
  });

  after(async () => {
    // Clean up test data
    await db.prepare('DELETE FROM bookings WHERE patientName LIKE ?').run('%Real-time Test%');
    await db.prepare('DELETE FROM users WHERE email LIKE ?').run('%realtime-test%');
    await db.prepare('DELETE FROM hospitals WHERE name LIKE ?').run('%Real-time Test Hospital%');
  });

  describe('1. Real-time Resource Availability Updates', () => {
    it('should provide real-time hospital resource data via polling', async () => {
      const response = await request(app)
        .get('/api/polling/hospitals')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.hospitals).to.be.an('array');
      expect(response.body.timestamp).to.exist;
      expect(response.body.lastUpdate).to.exist;

      const testHospital = response.body.hospitals.find(h => h.id === hospitalId);
      expect(testHospital).to.exist;
      expect(testHospital.resources).to.exist;
      expect(testHospital.resources.beds.available).to.be.a('number');
    });

    it('should update resource availability when booking is approved', async () => {
      // Create a booking
      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          hospitalId: hospitalId,
          resourceType: 'beds',
          patientName: 'Real-time Test Patient',
          patientAge: 30,
          patientGender: 'male',
          medicalCondition: 'Test condition',
          urgency: 'medium',
          emergencyContactName: 'Test Contact',
          emergencyContactPhone: '01234567803',
          emergencyContactRelationship: 'friend',
          scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          estimatedDuration: 24
        });

      bookingId = bookingResponse.body.booking.id;

      // Get initial resource state
      const initialResponse = await request(app)
        .get('/api/polling/hospitals')
        .set('Authorization', `Bearer ${userToken}`);

      const initialHospital = initialResponse.body.hospitals.find(h => h.id === hospitalId);
      const initialAvailable = initialHospital.resources.beds.available;

      // Approve the booking
      await request(app)
        .put(`/api/bookings/${bookingId}/approve`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send({ authorityNotes: 'Approved for testing' });

      // Check updated resource state
      const updatedResponse = await request(app)
        .get('/api/polling/hospitals')
        .set('Authorization', `Bearer ${userToken}`);

      const updatedHospital = updatedResponse.body.hospitals.find(h => h.id === hospitalId);
      expect(updatedHospital.resources.beds.available).to.equal(initialAvailable - 1);
      expect(updatedHospital.resources.beds.occupied).to.equal(initialHospital.resources.beds.occupied + 1);
    });

    it('should restore resource availability when booking is completed', async () => {
      // Get current resource state
      const beforeResponse = await request(app)
        .get('/api/polling/hospitals')
        .set('Authorization', `Bearer ${userToken}`);

      const beforeHospital = beforeResponse.body.hospitals.find(h => h.id === hospitalId);
      const beforeAvailable = beforeHospital.resources.beds.available;

      // Complete the booking
      await request(app)
        .put(`/api/bookings/${bookingId}/complete`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send({ completionNotes: 'Patient discharged' });

      // Check updated resource state
      const afterResponse = await request(app)
        .get('/api/polling/hospitals')
        .set('Authorization', `Bearer ${userToken}`);

      const afterHospital = afterResponse.body.hospitals.find(h => h.id === hospitalId);
      expect(afterHospital.resources.beds.available).to.equal(beforeAvailable + 1);
      expect(afterHospital.resources.beds.occupied).to.equal(beforeHospital.resources.beds.occupied - 1);
    });
  });

  describe('2. Real-time Booking Status Updates', () => {
    let testBookingId;

    it('should provide real-time booking updates via polling', async () => {
      // Create a test booking
      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          hospitalId: hospitalId,
          resourceType: 'icu',
          patientName: 'Real-time Test Patient 2',
          patientAge: 25,
          patientGender: 'female',
          medicalCondition: 'Critical care needed',
          urgency: 'high',
          emergencyContactName: 'Test Contact 2',
          emergencyContactPhone: '01234567804',
          emergencyContactRelationship: 'parent',
          scheduledDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
          estimatedDuration: 48
        });

      testBookingId = bookingResponse.body.booking.id;

      // Get booking status via polling
      const pollingResponse = await request(app)
        .get('/api/polling/bookings')
        .set('Authorization', `Bearer ${userToken}`);

      expect(pollingResponse.status).to.equal(200);
      expect(pollingResponse.body.bookings).to.be.an('array');
      expect(pollingResponse.body.timestamp).to.exist;

      const testBooking = pollingResponse.body.bookings.find(b => b.id === testBookingId);
      expect(testBooking).to.exist;
      expect(testBooking.status).to.equal('pending');
    });

    it('should reflect status changes in real-time polling', async () => {
      // Approve the booking
      await request(app)
        .put(`/api/bookings/${testBookingId}/approve`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send({ authorityNotes: 'Approved for critical care' });

      // Check updated status via polling
      const pollingResponse = await request(app)
        .get('/api/polling/bookings')
        .set('Authorization', `Bearer ${userToken}`);

      const updatedBooking = pollingResponse.body.bookings.find(b => b.id === testBookingId);
      expect(updatedBooking.status).to.equal('approved');
      expect(updatedBooking.approvedAt).to.exist;
      expect(updatedBooking.approvedBy).to.equal(hospitalAuthorityId);
    });

    it('should provide hospital authority polling for pending bookings', async () => {
      // Create another booking
      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          hospitalId: hospitalId,
          resourceType: 'operationTheatres',
          patientName: 'Real-time Test Patient 3',
          patientAge: 40,
          patientGender: 'male',
          medicalCondition: 'Surgery required',
          urgency: 'medium',
          emergencyContactName: 'Test Contact 3',
          emergencyContactPhone: '01234567805',
          emergencyContactRelationship: 'sibling',
          scheduledDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          estimatedDuration: 6
        });

      // Hospital authority should see pending booking in polling
      const authorityPollingResponse = await request(app)
        .get('/api/polling/bookings')
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`);

      expect(authorityPollingResponse.status).to.equal(200);
      const pendingBookings = authorityPollingResponse.body.bookings.filter(b => b.status === 'pending');
      expect(pendingBookings.length).to.be.at.least(1);

      const newBooking = pendingBookings.find(b => b.id === bookingResponse.body.booking.id);
      expect(newBooking).to.exist;
    });
  });

  describe('3. Real-time Notification System', () => {
    let notificationBookingId;

    it('should create notifications in real-time when booking is submitted', async () => {
      // Create a booking
      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          hospitalId: hospitalId,
          resourceType: 'beds',
          patientName: 'Real-time Notification Test Patient',
          patientAge: 35,
          patientGender: 'male',
          medicalCondition: 'Emergency treatment',
          urgency: 'high',
          emergencyContactName: 'Notification Test Contact',
          emergencyContactPhone: '01234567806',
          emergencyContactRelationship: 'spouse',
          scheduledDate: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
          estimatedDuration: 12
        });

      notificationBookingId = bookingResponse.body.booking.id;

      // Check user notifications via polling
      const userNotificationResponse = await request(app)
        .get('/api/polling/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(userNotificationResponse.status).to.equal(200);
      expect(userNotificationResponse.body.notifications).to.be.an('array');

      const submissionNotification = userNotificationResponse.body.notifications.find(n => 
        n.type === 'booking_submitted' && n.bookingId === notificationBookingId
      );
      expect(submissionNotification).to.exist;
      expect(submissionNotification.isRead).to.be.false;

      // Check hospital authority notifications
      const authorityNotificationResponse = await request(app)
        .get('/api/polling/notifications')
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`);

      const authorityNotification = authorityNotificationResponse.body.notifications.find(n => 
        n.type === 'booking_submitted' && n.bookingId === notificationBookingId
      );
      expect(authorityNotification).to.exist;
    });

    it('should create approval notifications in real-time', async () => {
      // Approve the booking
      await request(app)
        .put(`/api/bookings/${notificationBookingId}/approve`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send({ authorityNotes: 'Approved for emergency treatment' });

      // Check for approval notification
      const notificationResponse = await request(app)
        .get('/api/polling/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      const approvalNotification = notificationResponse.body.notifications.find(n => 
        n.type === 'booking_approved' && n.bookingId === notificationBookingId
      );
      expect(approvalNotification).to.exist;
      expect(approvalNotification.title).to.include('Approved');
      expect(approvalNotification.isRead).to.be.false;
    });

    it('should create decline notifications in real-time', async () => {
      // Create another booking to decline
      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          hospitalId: hospitalId,
          resourceType: 'icu',
          patientName: 'Real-time Decline Test Patient',
          patientAge: 28,
          patientGender: 'female',
          medicalCondition: 'Non-urgent care',
          urgency: 'low',
          emergencyContactName: 'Decline Test Contact',
          emergencyContactPhone: '01234567807',
          emergencyContactRelationship: 'friend',
          scheduledDate: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          estimatedDuration: 24
        });

      const declineBookingId = bookingResponse.body.booking.id;

      // Decline the booking
      await request(app)
        .put(`/api/bookings/${declineBookingId}/decline`)
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send({ declineReason: 'Resource not available at requested time' });

      // Check for decline notification
      const notificationResponse = await request(app)
        .get('/api/polling/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      const declineNotification = notificationResponse.body.notifications.find(n => 
        n.type === 'booking_declined' && n.bookingId === declineBookingId
      );
      expect(declineNotification).to.exist;
      expect(declineNotification.title).to.include('Declined');
      expect(declineNotification.message).to.include('Resource not available');
    });

    it('should mark notifications as read and update in real-time', async () => {
      // Get unread notifications
      const beforeResponse = await request(app)
        .get('/api/polling/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      const unreadNotification = beforeResponse.body.notifications.find(n => !n.isRead);
      expect(unreadNotification).to.exist;

      // Mark notification as read
      await request(app)
        .put(`/api/notifications/${unreadNotification.id}/read`)
        .set('Authorization', `Bearer ${userToken}`);

      // Check updated notification status
      const afterResponse = await request(app)
        .get('/api/polling/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      const readNotification = afterResponse.body.notifications.find(n => n.id === unreadNotification.id);
      expect(readNotification.isRead).to.be.true;
    });
  });

  describe('4. Concurrent Real-time Updates', () => {
    it('should handle multiple simultaneous polling requests', async () => {
      // Create multiple simultaneous polling requests
      const pollingPromises = [
        request(app).get('/api/polling/hospitals').set('Authorization', `Bearer ${userToken}`),
        request(app).get('/api/polling/bookings').set('Authorization', `Bearer ${userToken}`),
        request(app).get('/api/polling/notifications').set('Authorization', `Bearer ${userToken}`),
        request(app).get('/api/polling/hospitals').set('Authorization', `Bearer ${hospitalAuthorityToken}`),
        request(app).get('/api/polling/bookings').set('Authorization', `Bearer ${hospitalAuthorityToken}`),
        request(app).get('/api/polling/notifications').set('Authorization', `Bearer ${hospitalAuthorityToken}`)
      ];

      const responses = await Promise.all(pollingPromises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).to.equal(200);
        expect(response.body.timestamp).to.exist;
      });
    });

    it('should maintain data consistency during concurrent operations', async () => {
      // Create multiple bookings simultaneously
      const bookingPromises = Array.from({ length: 3 }, (_, i) => 
        request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            hospitalId: hospitalId,
            resourceType: 'beds',
            patientName: `Concurrent Test Patient ${i + 1}`,
            patientAge: 30 + i,
            patientGender: i % 2 === 0 ? 'male' : 'female',
            medicalCondition: `Test condition ${i + 1}`,
            urgency: 'medium',
            emergencyContactName: `Test Contact ${i + 1}`,
            emergencyContactPhone: `0123456780${i}`,
            emergencyContactRelationship: 'friend',
            scheduledDate: new Date(Date.now() + (24 + i * 12) * 60 * 60 * 1000).toISOString(),
            estimatedDuration: 24
          })
      );

      const bookingResponses = await Promise.all(bookingPromises);
      const bookingIds = bookingResponses.map(r => r.body.booking.id);

      // Approve bookings simultaneously
      const approvalPromises = bookingIds.map(id => 
        request(app)
          .put(`/api/bookings/${id}/approve`)
          .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
          .send({ authorityNotes: 'Concurrent approval test' })
      );

      const approvalResponses = await Promise.all(approvalPromises);

      // Check that resource allocation is consistent
      const resourceResponse = await request(app)
        .get('/api/polling/hospitals')
        .set('Authorization', `Bearer ${userToken}`);

      const hospital = resourceResponse.body.hospitals.find(h => h.id === hospitalId);
      const successfulApprovals = approvalResponses.filter(r => r.status === 200).length;
      
      // Resource allocation should match successful approvals
      expect(hospital.resources.beds.occupied).to.be.at.least(successfulApprovals);
    });
  });

  describe('5. Performance and Scalability', () => {
    it('should handle high-frequency polling requests efficiently', async () => {
      const startTime = Date.now();
      
      // Make 10 rapid polling requests
      const rapidPollingPromises = Array.from({ length: 10 }, () => 
        request(app)
          .get('/api/polling/hospitals')
          .set('Authorization', `Bearer ${userToken}`)
      );

      const responses = await Promise.all(rapidPollingPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).to.equal(200);
      });

      // Should complete within reasonable time (less than 5 seconds)
      expect(totalTime).to.be.lessThan(5000);
    });

    it('should provide consistent timestamps across polling endpoints', async () => {
      const pollingResponses = await Promise.all([
        request(app).get('/api/polling/hospitals').set('Authorization', `Bearer ${userToken}`),
        request(app).get('/api/polling/bookings').set('Authorization', `Bearer ${userToken}`),
        request(app).get('/api/polling/notifications').set('Authorization', `Bearer ${userToken}`)
      ]);

      const timestamps = pollingResponses.map(r => new Date(r.body.timestamp).getTime());
      const maxTimeDiff = Math.max(...timestamps) - Math.min(...timestamps);

      // Timestamps should be within 1 second of each other
      expect(maxTimeDiff).to.be.lessThan(1000);
    });

    it('should handle polling with large datasets efficiently', async () => {
      // This test would be more meaningful with a larger dataset
      // For now, we'll test that the response structure is optimized
      const response = await request(app)
        .get('/api/polling/hospitals')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).to.equal(200);
      
      // Response should include only necessary fields for polling
      if (response.body.hospitals.length > 0) {
        const hospital = response.body.hospitals[0];
        expect(hospital).to.have.property('id');
        expect(hospital).to.have.property('name');
        expect(hospital).to.have.property('resources');
        expect(hospital).to.have.property('approved');
        
        // Should not include unnecessary fields that would bloat the response
        expect(hospital).to.not.have.property('description');
        expect(hospital).to.not.have.property('createdAt');
      }
    });
  });
});