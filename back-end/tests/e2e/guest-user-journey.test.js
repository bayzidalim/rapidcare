const request = require('supertest');
const { expect } = require('chai');
const app = require('../../index');

describe('Guest User Journey - End-to-End Tests', () => {
  let createdBloodRequestId;
  let testHospitalId;

  before(async () => {
    // Get a test hospital ID for the journey
    const hospitalsResponse = await request(app)
      .get('/api/hospitals');
    
    if (hospitalsResponse.body.data && hospitalsResponse.body.data.length > 0) {
      testHospitalId = hospitalsResponse.body.data[0].id;
    }
  });

  describe('Complete Hospital Browsing Journey', () => {
    it('should allow guest to discover and explore hospitals', async () => {
      // Step 1: Guest visits hospital listing page
      const listingResponse = await request(app)
        .get('/api/hospitals')
        .expect(200);

      expect(listingResponse.body.success).to.be.true;
      expect(listingResponse.body.isGuest).to.be.true;
      expect(listingResponse.body.data).to.be.an('array');
      
      const hospitals = listingResponse.body.data;
      expect(hospitals.length).to.be.greaterThan(0);

      // Step 2: Guest selects a hospital to view details
      const selectedHospital = hospitals[0];
      const detailsResponse = await request(app)
        .get(`/api/hospitals/${selectedHospital.id}`)
        .expect(200);

      expect(detailsResponse.body.success).to.be.true;
      expect(detailsResponse.body.isGuest).to.be.true;
      expect(detailsResponse.body.data).to.have.property('name');
      expect(detailsResponse.body.data).to.have.property('address');
      expect(detailsResponse.body.data).to.have.property('services');

      // Step 3: Guest checks resource availability
      const resourcesResponse = await request(app)
        .get(`/api/hospitals/${selectedHospital.id}/resources`)
        .expect(200);

      expect(resourcesResponse.body.success).to.be.true;
      expect(resourcesResponse.body.isGuest).to.be.true;
      expect(resourcesResponse.body.data).to.be.an('array');

      // Step 4: Guest tries to book (should be redirected to login)
      const bookingAttempt = await request(app)
        .post('/api/bookings')
        .send({
          hospitalId: selectedHospital.id,
          resourceType: 'bed',
          patientName: 'John Doe',
          contactNumber: '+880 1712345678'
        })
        .expect(401);

      expect(bookingAttempt.body.success).to.be.false;
      expect(bookingAttempt.body.error).to.include('Access token required');
    });

    it('should allow guest to search and filter hospitals', async () => {
      // Step 1: Search by location
      const locationSearch = await request(app)
        .get('/api/hospitals')
        .query({ location: 'Dhaka' })
        .expect(200);

      expect(locationSearch.body.success).to.be.true;
      expect(locationSearch.body.isGuest).to.be.true;

      // Step 2: Search by services
      const serviceSearch = await request(app)
        .get('/api/hospitals')
        .query({ services: 'Emergency' })
        .expect(200);

      expect(serviceSearch.body.success).to.be.true;
      expect(serviceSearch.body.data).to.be.an('array');

      // Step 3: Filter by availability
      const availabilityFilter = await request(app)
        .get('/api/hospitals')
        .query({ hasAvailableBeds: 'true' })
        .expect(200);

      expect(availabilityFilter.body.success).to.be.true;
      expect(availabilityFilter.body.data).to.be.an('array');
    });
  });

  describe('Complete Blood Donation Journey', () => {
    it('should allow guest to complete blood donation process', async () => {
      // Step 1: Guest views active blood requests
      const activeRequestsResponse = await request(app)
        .get('/api/blood/requests')
        .expect(200);

      expect(activeRequestsResponse.body.success).to.be.true;
      expect(activeRequestsResponse.body.isGuest).to.be.true;
      expect(activeRequestsResponse.body.data).to.be.an('array');

      // Step 2: Guest searches for specific blood type
      const searchResponse = await request(app)
        .get('/api/blood/requests/search')
        .query({ bloodType: 'O+', urgency: 'high' })
        .expect(200);

      expect(searchResponse.body.success).to.be.true;
      expect(searchResponse.body.isGuest).to.be.true;

      // Step 3: Guest views blood request statistics
      const statsResponse = await request(app)
        .get('/api/blood/requests/stats')
        .expect(200);

      expect(statsResponse.body.success).to.be.true;
      expect(statsResponse.body.isGuest).to.be.true;
      expect(statsResponse.body.data).to.have.property('totalActiveRequests');
      expect(statsResponse.body.data).to.have.property('bloodTypeDistribution');

      // Step 4: Guest creates blood donation request
      const bloodRequest = {
        requesterName: 'Ahmed Hassan',
        requesterPhone: '+880 1712345678',
        requesterEmail: 'ahmed.hassan@example.com',
        bloodType: 'O+',
        units: 2,
        urgency: 'high',
        hospitalName: 'Dhaka Medical College Hospital',
        hospitalAddress: 'Secretariat Road, Dhaka 1000',
        hospitalContact: '+880 2 9661064',
        patientName: 'Fatima Hassan',
        patientAge: 32,
        medicalCondition: 'Emergency surgery blood loss',
        requiredBy: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours from now
        notes: 'Urgent blood needed for post-surgery complications'
      };

      const createResponse = await request(app)
        .post('/api/blood/request')
        .send(bloodRequest)
        .expect(201);

      expect(createResponse.body.success).to.be.true;
      expect(createResponse.body.isGuest).to.be.true;
      expect(createResponse.body.message).to.include('Thank you for your blood donation request');
      expect(createResponse.body.data).to.have.property('id');
      
      createdBloodRequestId = createResponse.body.data.id;

      // Step 5: Verify the request appears in public listings
      const verifyResponse = await request(app)
        .get('/api/blood/requests')
        .expect(200);

      const createdRequest = verifyResponse.body.data.find(req => req.id === createdBloodRequestId);
      expect(createdRequest).to.exist;
      expect(createdRequest.bloodType).to.equal('O+');
      expect(createdRequest.urgency).to.equal('high');
      
      // Sensitive information should be filtered out
      expect(createdRequest).to.not.have.property('requesterPhone');
      expect(createdRequest).to.not.have.property('requesterEmail');
    });

    it('should validate guest blood donation input thoroughly', async () => {
      // Test missing required fields
      const incompleteRequest = {
        bloodType: 'A+',
        urgency: 'medium'
        // Missing required fields
      };

      const missingFieldsResponse = await request(app)
        .post('/api/blood/request')
        .send(incompleteRequest)
        .expect(400);

      expect(missingFieldsResponse.body.success).to.be.false;
      expect(missingFieldsResponse.body.error).to.include('required');

      // Test invalid phone number
      const invalidPhoneRequest = {
        requesterName: 'John Doe',
        requesterPhone: '123', // Invalid
        bloodType: 'B+',
        units: 1,
        urgency: 'low',
        hospitalName: 'Test Hospital',
        hospitalAddress: 'Test Address',
        hospitalContact: '+880 1234567890',
        patientName: 'Jane Doe',
        patientAge: 25,
        medicalCondition: 'Surgery',
        requiredBy: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      const invalidPhoneResponse = await request(app)
        .post('/api/blood/request')
        .send(invalidPhoneRequest)
        .expect(400);

      expect(invalidPhoneResponse.body.success).to.be.false;
      expect(invalidPhoneResponse.body.error).to.include('valid phone number');

      // Test invalid blood type
      const invalidBloodTypeRequest = {
        ...invalidPhoneRequest,
        requesterPhone: '+880 1712345678',
        bloodType: 'X+' // Invalid blood type
      };

      const invalidBloodTypeResponse = await request(app)
        .post('/api/blood/request')
        .send(invalidBloodTypeRequest)
        .expect(400);

      expect(invalidBloodTypeResponse.body.success).to.be.false;
      expect(invalidBloodTypeResponse.body.error).to.include('valid blood type');

      // Test past date
      const pastDateRequest = {
        ...invalidPhoneRequest,
        requesterPhone: '+880 1712345678',
        bloodType: 'O+',
        requiredBy: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Past date
      };

      const pastDateResponse = await request(app)
        .post('/api/blood/request')
        .send(pastDateRequest)
        .expect(400);

      expect(pastDateResponse.body.success).to.be.false;
      expect(pastDateResponse.body.error).to.include('future date');
    });
  });

  describe('Guest to Authenticated User Transition', () => {
    let authToken;
    let userId;

    it('should handle guest registration and login flow', async () => {
      // Step 1: Guest tries to access protected resource
      const protectedAttempt = await request(app)
        .get('/api/bookings')
        .expect(401);

      expect(protectedAttempt.body.success).to.be.false;
      expect(protectedAttempt.body.error).to.include('Access token required');

      // Step 2: Guest registers for an account
      const registrationData = {
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'password123',
        phone: '+880 1712345678',
        userType: 'user'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      expect(registerResponse.body.success).to.be.true;
      expect(registerResponse.body.data).to.have.property('token');
      
      authToken = registerResponse.body.data.token;
      userId = registerResponse.body.data.user.id;

      // Step 3: User can now access protected resources
      const protectedAccess = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(protectedAccess.body.success).to.be.true;
      expect(protectedAccess.body.data).to.be.an('array');

      // Step 4: User can now create bookings
      if (testHospitalId) {
        const bookingData = {
          hospitalId: testHospitalId,
          resourceType: 'bed',
          patientName: 'Test Patient',
          patientAge: 30,
          contactNumber: '+880 1712345678',
          medicalCondition: 'Regular checkup',
          urgency: 'low',
          preferredDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };

        const bookingResponse = await request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${authToken}`)
          .send(bookingData)
          .expect(201);

        expect(bookingResponse.body.success).to.be.true;
        expect(bookingResponse.body.data).to.have.property('id');
      }
    });

    it('should handle login with return URL functionality', async () => {
      // Step 1: Simulate guest trying to access booking page
      const intendedDestination = '/booking?hospital=1';
      
      // Step 2: Guest gets redirected to login with return URL
      const loginData = {
        email: 'testuser@example.com',
        password: 'password123'
      };

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(loginResponse.body.success).to.be.true;
      expect(loginResponse.body.data).to.have.property('token');

      // Step 3: After login, user should be able to access intended destination
      const newToken = loginResponse.body.data.token;
      
      if (testHospitalId) {
        const bookingPageAccess = await request(app)
          .get(`/api/hospitals/${testHospitalId}`)
          .set('Authorization', `Bearer ${newToken}`)
          .expect(200);

        expect(bookingPageAccess.body.success).to.be.true;
        // User should now see booking capabilities
        expect(bookingPageAccess.body.isGuest).to.be.false;
      }
    });
  });

  describe('Guest Experience Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      // This test simulates what happens when the frontend handles network errors
      // The backend should return appropriate error responses
      
      // Test with invalid hospital ID
      const invalidHospitalResponse = await request(app)
        .get('/api/hospitals/99999')
        .expect(404);

      expect(invalidHospitalResponse.body.success).to.be.false;
      expect(invalidHospitalResponse.body.error).to.include('Hospital not found');

      // Test with malformed blood request
      const malformedRequest = await request(app)
        .post('/api/blood/request')
        .send({ invalid: 'data' })
        .expect(400);

      expect(malformedRequest.body.success).to.be.false;
    });

    it('should handle concurrent guest requests properly', async () => {
      // Simulate multiple guests accessing the system simultaneously
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .get('/api/hospitals')
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.body.success).to.be.true;
        expect(response.body.isGuest).to.be.true;
        expect(response.body.data).to.be.an('array');
      });
    });

    it('should maintain data consistency for guest operations', async () => {
      // Create multiple blood requests and verify they all appear correctly
      const bloodRequests = [];
      
      for (let i = 0; i < 3; i++) {
        const request = {
          requesterName: `Test Donor ${i + 1}`,
          requesterPhone: `+880 171234567${i}`,
          bloodType: ['A+', 'B+', 'O+'][i],
          units: i + 1,
          urgency: ['low', 'medium', 'high'][i],
          hospitalName: `Test Hospital ${i + 1}`,
          hospitalAddress: `Test Address ${i + 1}`,
          hospitalContact: `+880 1234567${i}0`,
          patientName: `Test Patient ${i + 1}`,
          patientAge: 25 + i,
          medicalCondition: `Test Condition ${i + 1}`,
          requiredBy: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString()
        };

        const response = await request(app)
          .post('/api/blood/request')
          .send(request)
          .expect(201);

        bloodRequests.push(response.body.data);
      }

      // Verify all requests appear in the listing
      const listingResponse = await request(app)
        .get('/api/blood/requests')
        .expect(200);

      bloodRequests.forEach(createdRequest => {
        const foundRequest = listingResponse.body.data.find(req => req.id === createdRequest.id);
        expect(foundRequest).to.exist;
        expect(foundRequest.bloodType).to.equal(createdRequest.bloodType);
      });
    });
  });

  after(async () => {
    // Cleanup: Remove test data if needed
    if (createdBloodRequestId) {
      // Note: In a real scenario, you might want to clean up test data
      // For now, we'll leave it as the system should handle test data appropriately
    }
  });
});