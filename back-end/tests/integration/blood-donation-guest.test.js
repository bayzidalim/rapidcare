const request = require('supertest');
const { expect } = require('chai');
const app = require('../../index');

describe('Blood Donation API - Guest Access Integration', () => {
  describe('GET /api/blood/requests - Public Blood Request Listing', () => {
    it('should allow guest to view active blood requests', async () => {
      const response = await request(app)
        .get('/api/blood/requests')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.isGuest).to.be.true;
      expect(response.body.data).to.be.an('array');
      
      // Check that only active/pending requests are shown
      response.body.data.forEach(request => {
        expect(['pending', 'active']).to.include(request.status);
        expect(request).to.have.property('bloodType');
        expect(request).to.have.property('urgency');
        expect(request).to.have.property('hospitalName');
        expect(request).to.have.property('requiredBy');
        
        // Sensitive information should be filtered out for guests
        expect(request).to.not.have.property('requesterPhone');
        expect(request).to.not.have.property('requesterEmail');
      });
    });

    it('should not show completed or cancelled requests to guests', async () => {
      const response = await request(app)
        .get('/api/blood/requests')
        .expect(200);

      expect(response.body.success).to.be.true;
      
      // Verify no completed or cancelled requests are shown
      response.body.data.forEach(request => {
        expect(request.status).to.not.equal('completed');
        expect(request.status).to.not.equal('cancelled');
      });
    });

    it('should include pagination for guest requests', async () => {
      const response = await request(app)
        .get('/api/blood/requests')
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      expect(response.body.data.length).to.be.at.most(5);
    });
  });

  describe('POST /api/blood/request - Guest Blood Donation', () => {
    it('should allow guest to create blood donation request with complete information', async () => {
      const guestBloodRequest = {
        requesterName: 'Ahmed Rahman',
        requesterPhone: '+880 1712345678',
        requesterEmail: 'ahmed.rahman@example.com',
        bloodType: 'A+',
        units: 2,
        urgency: 'high',
        hospitalName: 'Dhaka Medical College Hospital',
        hospitalAddress: 'Secretariat Road, Dhaka 1000',
        hospitalContact: '+880 2 9661064',
        patientName: 'Fatima Rahman',
        patientAge: 28,
        medicalCondition: 'Post-surgery blood loss',
        requiredBy: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours from now
        notes: 'Patient needs blood urgently after surgery complications'
      };

      const response = await request(app)
        .post('/api/blood/request')
        .send(guestBloodRequest)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.isGuest).to.be.true;
      expect(response.body.message).to.include('Thank you for your blood donation request');
      expect(response.body.data).to.have.property('id');
      expect(response.body.data.requesterName).to.equal('Ahmed Rahman');
      expect(response.body.data.bloodType).to.equal('A+');
      expect(response.body.data.urgency).to.equal('high');
      expect(response.body.data.status).to.equal('pending');
    });

    it('should validate required fields for guest blood donation', async () => {
      const incompleteRequest = {
        bloodType: 'B+',
        units: 1,
        urgency: 'medium'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/blood/request')
        .send(incompleteRequest)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('required');
    });

    it('should validate phone number format for guest requests', async () => {
      const invalidPhoneRequest = {
        requesterName: 'John Doe',
        requesterPhone: '123', // Invalid phone format
        bloodType: 'O-',
        units: 1,
        urgency: 'low',
        hospitalName: 'Test Hospital',
        hospitalAddress: 'Test Address',
        hospitalContact: '+880 1234567890',
        patientName: 'Jane Doe',
        patientAge: 30,
        medicalCondition: 'Emergency',
        requiredBy: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .post('/api/blood/request')
        .send(invalidPhoneRequest)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('valid phone number');
    });

    it('should validate blood type for guest requests', async () => {
      const invalidBloodTypeRequest = {
        requesterName: 'John Doe',
        requesterPhone: '+880 1712345678',
        bloodType: 'X+', // Invalid blood type
        units: 1,
        urgency: 'medium',
        hospitalName: 'Test Hospital',
        hospitalAddress: 'Test Address',
        hospitalContact: '+880 1234567890',
        patientName: 'Jane Doe',
        patientAge: 25,
        medicalCondition: 'Surgery',
        requiredBy: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .post('/api/blood/request')
        .send(invalidBloodTypeRequest)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('valid blood type');
    });

    it('should validate urgency level for guest requests', async () => {
      const invalidUrgencyRequest = {
        requesterName: 'John Doe',
        requesterPhone: '+880 1712345678',
        bloodType: 'AB+',
        units: 1,
        urgency: 'super-urgent', // Invalid urgency level
        hospitalName: 'Test Hospital',
        hospitalAddress: 'Test Address',
        hospitalContact: '+880 1234567890',
        patientName: 'Jane Doe',
        patientAge: 35,
        medicalCondition: 'Emergency',
        requiredBy: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .post('/api/blood/request')
        .send(invalidUrgencyRequest)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('valid urgency level');
    });

    it('should validate required by date is in the future', async () => {
      const pastDateRequest = {
        requesterName: 'John Doe',
        requesterPhone: '+880 1712345678',
        bloodType: 'O+',
        units: 2,
        urgency: 'high',
        hospitalName: 'Test Hospital',
        hospitalAddress: 'Test Address',
        hospitalContact: '+880 1234567890',
        patientName: 'Jane Doe',
        patientAge: 40,
        medicalCondition: 'Surgery',
        requiredBy: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Past date
      };

      const response = await request(app)
        .post('/api/blood/request')
        .send(pastDateRequest)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('future date');
    });
  });

  describe('GET /api/blood/requests/search - Guest Blood Request Search', () => {
    it('should allow guest to search by blood type', async () => {
      const response = await request(app)
        .get('/api/blood/requests/search')
        .query({ bloodType: 'O+' })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.isGuest).to.be.true;
      expect(response.body.data).to.be.an('array');
      
      // All results should match the blood type
      response.body.data.forEach(request => {
        expect(request.bloodType).to.equal('O+');
      });
    });

    it('should allow guest to search by urgency level', async () => {
      const response = await request(app)
        .get('/api/blood/requests/search')
        .query({ urgency: 'high' })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      
      // All results should match the urgency level
      response.body.data.forEach(request => {
        expect(request.urgency).to.equal('high');
      });
    });

    it('should allow guest to search by hospital', async () => {
      const response = await request(app)
        .get('/api/blood/requests/search')
        .query({ hospital: 'Dhaka Medical' })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      
      // All results should contain the hospital name
      response.body.data.forEach(request => {
        expect(request.hospitalName.toLowerCase()).to.include('dhaka medical');
      });
    });

    it('should allow guest to combine search filters', async () => {
      const response = await request(app)
        .get('/api/blood/requests/search')
        .query({ 
          bloodType: 'A+',
          urgency: 'high',
          hospital: 'Medical'
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      
      // All results should match all filters
      response.body.data.forEach(request => {
        expect(request.bloodType).to.equal('A+');
        expect(request.urgency).to.equal('high');
        expect(request.hospitalName.toLowerCase()).to.include('medical');
      });
    });
  });

  describe('GET /api/blood/requests/stats - Guest Blood Request Statistics', () => {
    it('should allow guest to view blood request statistics', async () => {
      const response = await request(app)
        .get('/api/blood/requests/stats')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.isGuest).to.be.true;
      expect(response.body.data).to.have.property('totalActiveRequests');
      expect(response.body.data).to.have.property('urgentRequests');
      expect(response.body.data).to.have.property('bloodTypeDistribution');
      expect(response.body.data.bloodTypeDistribution).to.be.an('object');
    });

    it('should show blood type distribution for guests', async () => {
      const response = await request(app)
        .get('/api/blood/requests/stats')
        .expect(200);

      expect(response.body.success).to.be.true;
      const distribution = response.body.data.bloodTypeDistribution;
      
      // Should have counts for different blood types
      expect(distribution).to.be.an('object');
      Object.keys(distribution).forEach(bloodType => {
        expect(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).to.include(bloodType);
        expect(distribution[bloodType]).to.be.a('number');
      });
    });
  });

  describe('Protected Blood Request Endpoints', () => {
    it('should require authentication for updating blood requests', async () => {
      const response = await request(app)
        .put('/api/blood/requests/1')
        .send({ status: 'completed' })
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Access token required');
    });

    it('should require authentication for deleting blood requests', async () => {
      const response = await request(app)
        .delete('/api/blood/requests/1')
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Access token required');
    });

    it('should require authentication for viewing detailed blood request info', async () => {
      const response = await request(app)
        .get('/api/blood/requests/1/details')
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Access token required');
    });
  });
});