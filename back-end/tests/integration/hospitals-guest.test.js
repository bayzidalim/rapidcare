const request = require('supertest');
const { expect } = require('chai');
const app = require('../../index');

describe('Hospital API - Guest Access Integration', () => {
  describe('GET /api/hospitals - Public Hospital Listing', () => {
    it('should allow guest to view all approved hospitals', async () => {
      const response = await request(app)
        .get('/api/hospitals')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.isGuest).to.be.true;
      expect(response.body.data).to.be.an('array');
      
      // All hospitals should be approved for guest viewing
      response.body.data.forEach(hospital => {
        expect(hospital.status).to.equal('approved');
        expect(hospital).to.have.property('id');
        expect(hospital).to.have.property('name');
        expect(hospital).to.have.property('address');
        expect(hospital).to.have.property('phone');
        expect(hospital).to.have.property('email');
        expect(hospital).to.have.property('services');
      });
    });

    it('should not show pending or rejected hospitals to guests', async () => {
      const response = await request(app)
        .get('/api/hospitals')
        .expect(200);

      expect(response.body.success).to.be.true;
      
      // Verify no pending or rejected hospitals are shown
      response.body.data.forEach(hospital => {
        expect(hospital.status).to.not.equal('pending');
        expect(hospital.status).to.not.equal('rejected');
      });
    });

    it('should include basic hospital information for guests', async () => {
      const response = await request(app)
        .get('/api/hospitals')
        .expect(200);

      expect(response.body.success).to.be.true;
      
      if (response.body.data.length > 0) {
        const hospital = response.body.data[0];
        expect(hospital).to.have.property('name');
        expect(hospital).to.have.property('address');
        expect(hospital).to.have.property('phone');
        expect(hospital).to.have.property('services');
        expect(hospital).to.have.property('description');
      }
    });
  });

  describe('GET /api/hospitals/:id - Public Hospital Details', () => {
    let hospitalId;

    before(async () => {
      // Get a hospital ID for testing
      const hospitalsResponse = await request(app)
        .get('/api/hospitals');
      
      if (hospitalsResponse.body.data.length > 0) {
        hospitalId = hospitalsResponse.body.data[0].id;
      }
    });

    it('should allow guest to view hospital details', async function() {
      if (!hospitalId) {
        this.skip();
      }

      const response = await request(app)
        .get(`/api/hospitals/${hospitalId}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.isGuest).to.be.true;
      expect(response.body.data).to.have.property('id', hospitalId);
      expect(response.body.data).to.have.property('name');
      expect(response.body.data).to.have.property('address');
      expect(response.body.data).to.have.property('phone');
      expect(response.body.data).to.have.property('services');
    });

    it('should include resource availability for guests', async function() {
      if (!hospitalId) {
        this.skip();
      }

      const response = await request(app)
        .get(`/api/hospitals/${hospitalId}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('resources');
      expect(response.body.data.resources).to.be.an('array');
    });

    it('should return 404 for non-existent hospital', async () => {
      const response = await request(app)
        .get('/api/hospitals/99999')
        .expect(404);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Hospital not found');
    });

    it('should not allow guest to view pending/rejected hospital details', async () => {
      // This test assumes there might be pending/rejected hospitals
      // We'll test with a known ID that might be pending/rejected
      const response = await request(app)
        .get('/api/hospitals/1000') // Assuming this might be pending/rejected
        .expect(404);

      expect(response.body.success).to.be.false;
    });
  });

  describe('GET /api/hospitals/:id/resources - Public Resource Availability', () => {
    let hospitalId;

    before(async () => {
      // Get a hospital ID for testing
      const hospitalsResponse = await request(app)
        .get('/api/hospitals');
      
      if (hospitalsResponse.body.data.length > 0) {
        hospitalId = hospitalsResponse.body.data[0].id;
      }
    });

    it('should allow guest to view resource availability', async function() {
      if (!hospitalId) {
        this.skip();
      }

      const response = await request(app)
        .get(`/api/hospitals/${hospitalId}/resources`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.isGuest).to.be.true;
      expect(response.body.data).to.be.an('array');
      
      // Check resource structure
      response.body.data.forEach(resource => {
        expect(resource).to.have.property('type');
        expect(resource).to.have.property('available');
        expect(resource).to.have.property('total');
        expect(resource).to.have.property('price');
      });
    });

    it('should show real-time availability to guests', async function() {
      if (!hospitalId) {
        this.skip();
      }

      const response = await request(app)
        .get(`/api/hospitals/${hospitalId}/resources`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      
      // Availability should be numbers
      response.body.data.forEach(resource => {
        expect(resource.available).to.be.a('number');
        expect(resource.total).to.be.a('number');
        expect(resource.available).to.be.at.most(resource.total);
      });
    });
  });

  describe('POST /api/hospitals - Protected Endpoint', () => {
    it('should require authentication for creating hospitals', async () => {
      const newHospital = {
        name: 'Test Hospital',
        address: 'Test Address',
        phone: '+880 1234567890',
        email: 'test@hospital.com',
        services: 'Emergency, Surgery',
        description: 'Test hospital description'
      };

      const response = await request(app)
        .post('/api/hospitals')
        .send(newHospital)
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Access token required');
    });
  });

  describe('PUT /api/hospitals/:id - Protected Endpoint', () => {
    it('should require authentication for updating hospitals', async () => {
      const updateData = {
        name: 'Updated Hospital Name'
      };

      const response = await request(app)
        .put('/api/hospitals/1')
        .send(updateData)
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Access token required');
    });
  });

  describe('DELETE /api/hospitals/:id - Protected Endpoint', () => {
    it('should require authentication for deleting hospitals', async () => {
      const response = await request(app)
        .delete('/api/hospitals/1')
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Access token required');
    });
  });

  describe('Hospital Search - Guest Access', () => {
    it('should allow guest to search hospitals by location', async () => {
      const response = await request(app)
        .get('/api/hospitals')
        .query({ location: 'Dhaka' })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.isGuest).to.be.true;
      expect(response.body.data).to.be.an('array');
    });

    it('should allow guest to search hospitals by services', async () => {
      const response = await request(app)
        .get('/api/hospitals')
        .query({ services: 'Emergency' })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.isGuest).to.be.true;
      expect(response.body.data).to.be.an('array');
    });

    it('should allow guest to filter hospitals by resource availability', async () => {
      const response = await request(app)
        .get('/api/hospitals')
        .query({ hasAvailableBeds: 'true' })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
    });
  });
});