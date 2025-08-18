const request = require('supertest');
const express = require('express');
const pricingRoutes = require('../../routes/pricing');
const { authenticate, requireOwnHospital } = require('../../middleware/auth');
const db = require('../../config/database');

// Mock the auth middleware for testing
jest.mock('../../middleware/auth', () => {
  return {
    authenticate: (req, res, next) => {
      req.user = {
        id: 1,
        userType: 'hospital-authority',
        hospital_id: 1,
        email: 'hospital@example.com'
      };
      next();
    },
    requireOwnHospital: (req, res, next) => {
      const hospitalId = parseInt(req.params.id);
      if (req.user.hospital_id === hospitalId || req.user.userType === 'admin') {
        next();
      } else {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
    }
  };
});

// Create test app
const app = express();
app.use(express.json());
app.use('/api/pricing', pricingRoutes);

describe('Pricing Routes', () => {
  beforeEach(() => {
    // Clean up test data
    db.exec('DELETE FROM hospital_pricing WHERE hospitalId = 999');
  });

  afterAll(() => {
    // Clean up test data
    db.exec('DELETE FROM hospital_pricing WHERE hospitalId = 999');
  });

  describe('GET /api/pricing/hospitals/:id/pricing', () => {
    test('should get hospital pricing', async () => {
      const response = await request(app)
        .get('/api/pricing/hospitals/1/pricing');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('hospitalId');
      expect(response.body.data).toHaveProperty('pricing');
    });

    test('should return error for invalid hospital ID', async () => {
      const response = await request(app)
        .get('/api/pricing/hospitals/invalid/pricing');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid hospital ID');
    });

    test('should handle non-existent hospital', async () => {
      const response = await request(app)
        .get('/api/pricing/hospitals/99999/pricing');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/pricing/calculate', () => {
    test('should calculate booking amount', async () => {
      const requestData = {
        hospitalId: 1,
        resourceType: 'beds',
        duration: 24
      };

      const response = await request(app)
        .post('/api/pricing/calculate')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('calculatedAmount');
      expect(response.body.data).toHaveProperty('baseRate');
    });

    test('should return error when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/pricing/calculate')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Hospital ID and resource type are required');
    });

    test('should handle calculation with options', async () => {
      const requestData = {
        hospitalId: 1,
        resourceType: 'beds',
        duration: 48,
        options: {
          discountPercentage: 10
        }
      };

      const response = await request(app)
        .post('/api/pricing/calculate')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('finalAmount');
      expect(response.body.data).toHaveProperty('discount');
    });
  });

  describe('GET /api/pricing/comparison', () => {
    test('should get pricing comparison', async () => {
      const response = await request(app)
        .get('/api/pricing/comparison?resourceType=beds');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('resourceType');
      expect(response.body.data).toHaveProperty('hospitals');
      expect(Array.isArray(response.body.data.hospitals)).toBe(true);
    });

    test('should return error when resource type is missing', async () => {
      const response = await request(app)
        .get('/api/pricing/comparison');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Resource type is required');
    });

    test('should handle city filtering', async () => {
      const response = await request(app)
        .get('/api/pricing/comparison?resourceType=beds&city=TestCity');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.city).toBe('TestCity');
    });

    test('should handle sorting options', async () => {
      const response = await request(app)
        .get('/api/pricing/comparison?resourceType=beds&sortBy=baseRate&sortOrder=desc');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/pricing/resource-types', () => {
    test('should get available resource types', async () => {
      const response = await request(app)
        .get('/api/pricing/resource-types');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toContain('beds');
      expect(response.body.data).toContain('icu');
      expect(response.body.data).toContain('operationTheatres');
    });
  });

  describe('POST /api/pricing/validate', () => {
    test('should validate pricing data', async () => {
      const pricingData = {
        resourceType: 'beds',
        baseRate: 150.00,
        hourlyRate: 25.00,
        minimumCharge: 100.00,
        maximumCharge: 500.00
      };

      const response = await request(app)
        .post('/api/pricing/validate')
        .send({ pricingData });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('validation');
      expect(response.body.data).toHaveProperty('constraints');
      expect(response.body.data.validation.isValid).toBe(true);
    });

    test('should return error when pricing data is missing', async () => {
      const response = await request(app)
        .post('/api/pricing/validate')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Pricing data is required');
    });

    test('should validate invalid pricing data', async () => {
      const pricingData = {
        resourceType: 'invalid',
        baseRate: -50.00
      };

      const response = await request(app)
        .post('/api/pricing/validate')
        .send({ pricingData });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.validation.isValid).toBe(false);
      expect(response.body.data.validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/pricing/hospitals/:id/pricing', () => {
    test('should update hospital pricing', async () => {
      const pricingData = {
        resourceType: 'beds',
        baseRate: 200.00,
        hourlyRate: 30.00,
        minimumCharge: 150.00,
        maximumCharge: 600.00
      };

      const response = await request(app)
        .put('/api/pricing/hospitals/1/pricing')
        .send(pricingData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('pricing');
      expect(response.body.message).toBe('Pricing updated successfully');
    });

    test('should return error for invalid hospital ID', async () => {
      const pricingData = {
        resourceType: 'beds',
        baseRate: 200.00
      };

      const response = await request(app)
        .put('/api/pricing/hospitals/invalid/pricing')
        .send(pricingData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid hospital ID');
    });

    test('should return error when required fields are missing', async () => {
      const response = await request(app)
        .put('/api/pricing/hospitals/1/pricing')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Resource type and base rate are required');
    });
  });

  describe('GET /api/pricing/hospitals/:id/pricing/history', () => {
    test('should get pricing history', async () => {
      const response = await request(app)
        .get('/api/pricing/hospitals/1/pricing/history');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('history');
      expect(Array.isArray(response.body.data.history)).toBe(true);
    });

    test('should handle resource type filtering', async () => {
      const response = await request(app)
        .get('/api/pricing/hospitals/1/pricing/history?resourceType=beds');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle limit parameter', async () => {
      const response = await request(app)
        .get('/api/pricing/hospitals/1/pricing/history?limit=5');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/pricing/hospitals/:id/pricing/bulk', () => {
    test('should perform bulk pricing update', async () => {
      const pricingUpdates = [
        {
          resourceType: 'beds',
          baseRate: 180.00,
          hourlyRate: 28.00
        },
        {
          resourceType: 'icu',
          baseRate: 350.00,
          hourlyRate: 55.00
        }
      ];

      const response = await request(app)
        .post('/api/pricing/hospitals/1/pricing/bulk')
        .send({ pricingUpdates });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('results');
      expect(response.body.message).toBe('Bulk pricing update completed successfully');
    });

    test('should return error when pricing updates array is missing', async () => {
      const response = await request(app)
        .post('/api/pricing/hospitals/1/pricing/bulk')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Pricing updates array is required');
    });
  });

  describe('Error handling', () => {
    test('should handle server errors gracefully', async () => {
      const response = await request(app)
        .get('/api/pricing/hospitals/99999/pricing');

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
    });
  });
});

module.exports = {};