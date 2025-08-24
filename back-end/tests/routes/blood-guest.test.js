const request = require('supertest');
const { expect } = require('chai');
const app = require('../../index');

describe('Blood Donation - Guest Access', () => {
  describe('POST /api/blood/request - Guest Blood Donation', () => {
    it('should allow guest to create blood request with contact information', async () => {
      const guestBloodRequest = {
        requesterName: 'John Doe',
        requesterPhone: '+880 1234 567890',
        requesterEmail: 'john.doe@example.com',
        bloodType: 'O+',
        units: 2,
        urgency: 'high',
        hospitalName: 'Dhaka Medical College Hospital',
        hospitalAddress: 'Dhaka, Bangladesh',
        hospitalContact: '+880 2 9661064',
        patientName: 'Jane Doe',
        patientAge: 35,
        medicalCondition: 'Surgery complications',
        requiredBy: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Urgent blood needed for surgery'
      };

      const response = await request(app)
        .post('/api/blood/request')
        .send(guestBloodRequest)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.isGuest).to.be.true;
      expect(response.body.message).to.include('Thank you for your blood donation request');
      expect(response.body.data).to.have.property('id');
      expect(response.body.data.requesterName).to.equal('John Doe');
      expect(response.body.data.bloodType).to.equal('O+');
    });

    it('should reject guest blood request without required contact information', async () => {
      const incompleteRequest = {
        bloodType: 'A+',
        units: 1,
        urgency: 'medium',
        hospitalName: 'Test Hospital',
        hospitalAddress: 'Test Address',
        hospitalContact: '+880 1234567890',
        requiredBy: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        // Missing requesterName and requesterPhone
      };

      const response = await request(app)
        .post('/api/blood/request')
        .send(incompleteRequest)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Name and phone number are required');
    });

    it('should reject guest blood request with invalid phone number', async () => {
      const invalidPhoneRequest = {
        requesterName: 'John Doe',
        requesterPhone: '123', // Invalid phone
        bloodType: 'B+',
        units: 1,
        urgency: 'low',
        hospitalName: 'Test Hospital',
        hospitalAddress: 'Test Address',
        hospitalContact: '+880 1234567890',
        requiredBy: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .post('/api/blood/request')
        .send(invalidPhoneRequest)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('valid phone number');
    });
  });

  describe('GET /api/blood/requests - Guest Access', () => {
    it('should allow guest to view blood requests with limited information', async () => {
      const response = await request(app)
        .get('/api/blood/requests')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.isGuest).to.be.true;
      expect(response.body.data).to.be.an('array');
      
      // Check that sensitive information is filtered out for guests
      if (response.body.data.length > 0) {
        const request = response.body.data[0];
        expect(request).to.not.have.property('requesterPhone');
        expect(request).to.not.have.property('requesterEmail');
        expect(request).to.have.property('bloodType');
        expect(request).to.have.property('urgency');
      }
    });

    it('should only show active/pending requests to guests', async () => {
      const response = await request(app)
        .get('/api/blood/requests')
        .expect(200);

      expect(response.body.success).to.be.true;
      
      // All requests should be either pending or active
      response.body.data.forEach(request => {
        expect(['pending', 'active']).to.include(request.status);
      });
    });
  });

  describe('GET /api/blood/requests/search - Guest Search', () => {
    it('should allow guest to search blood requests', async () => {
      const response = await request(app)
        .get('/api/blood/requests/search')
        .query({ bloodType: 'O+', urgency: 'high' })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.isGuest).to.be.true;
      expect(response.body.data).to.be.an('array');
    });
  });
});