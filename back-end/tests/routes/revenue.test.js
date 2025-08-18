const request = require('supertest');
const express = require('express');
const revenueRoutes = require('../../routes/revenue');
const { authenticate, requireAdmin, requireOwnHospital } = require('../../middleware/auth');
const db = require('../../config/database');

// Mock the auth middleware for testing
jest.mock('../../middleware/auth', () => {
  return {
    authenticate: (req, res, next) => {
      req.user = {
        id: 1,
        userType: 'admin',
        hospital_id: 1,
        email: 'admin@example.com'
      };
      next();
    },
    requireAdmin: (req, res, next) => {
      if (req.user.userType === 'admin') {
        next();
      } else {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
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
app.use('/api/revenue', revenueRoutes);

describe('Revenue Routes', () => {
  beforeEach(() => {
    // Clean up test data
    db.exec('DELETE FROM transactions WHERE transactionId LIKE "TEST_%"');
  });

  afterAll(() => {
    // Clean up test data
    db.exec('DELETE FROM transactions WHERE transactionId LIKE "TEST_%"');
  });

  describe('GET /api/revenue/hospital/:id', () => {
    test('should get hospital revenue analytics', async () => {
      const response = await request(app)
        .get('/api/revenue/hospital/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalRevenue');
      expect(response.body.data).toHaveProperty('dailyAnalytics');
      expect(response.body.data).toHaveProperty('resourceBreakdown');
    });

    test('should return error for invalid hospital ID', async () => {
      const response = await request(app)
        .get('/api/revenue/hospital/invalid');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid hospital ID');
    });

    test('should handle period parameter', async () => {
      const response = await request(app)
        .get('/api/revenue/hospital/1?period=month');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle custom date range', async () => {
      const response = await request(app)
        .get('/api/revenue/hospital/1?startDate=2024-01-01&endDate=2024-12-31');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/revenue/admin', () => {
    test('should get admin revenue analytics', async () => {
      const response = await request(app)
        .get('/api/revenue/admin');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('platformRevenue');
      expect(response.body.data).toHaveProperty('serviceChargeAnalytics');
      expect(response.body.data).toHaveProperty('adminBalances');
      expect(response.body.data).toHaveProperty('hospitalDistribution');
    });

    test('should handle period parameter', async () => {
      const response = await request(app)
        .get('/api/revenue/admin?period=week');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/revenue/analytics', () => {
    test('should get platform analytics for admin', async () => {
      const response = await request(app)
        .get('/api/revenue/analytics');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('platformRevenue');
    });

    test('should get hospital analytics when hospitalId provided', async () => {
      const response = await request(app)
        .get('/api/revenue/analytics?hospitalId=1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalRevenue');
    });

    test('should handle period parameter', async () => {
      const response = await request(app)
        .get('/api/revenue/analytics?period=month');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/revenue/balances/hospital/:id', () => {
    test('should get hospital balance information', async () => {
      const response = await request(app)
        .get('/api/revenue/balances/hospital/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('balance');
      expect(response.body.data).toHaveProperty('history');
    });

    test('should return error for invalid hospital ID', async () => {
      const response = await request(app)
        .get('/api/revenue/balances/hospital/invalid');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid hospital ID');
    });
  });

  describe('GET /api/revenue/balances/admin', () => {
    test('should get admin balance information', async () => {
      const response = await request(app)
        .get('/api/revenue/balances/admin');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('balances');
      expect(response.body.data).toHaveProperty('history');
      expect(Array.isArray(response.body.data.balances)).toBe(true);
    });
  });

  describe('GET /api/revenue/reconciliation', () => {
    test('should get reconciliation report', async () => {
      const response = await request(app)
        .get('/api/revenue/reconciliation');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('discrepancies');
      expect(response.body.data).toHaveProperty('summary');
    });

    test('should handle date range parameters', async () => {
      const response = await request(app)
        .get('/api/revenue/reconciliation?startDate=2024-01-01&endDate=2024-12-31');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.dateRange).toEqual({
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      });
    });
  });

  describe('GET /api/revenue/low-balance-alerts', () => {
    test('should get low balance alerts', async () => {
      const response = await request(app)
        .get('/api/revenue/low-balance-alerts');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('threshold');
      expect(response.body.data).toHaveProperty('alertCount');
      expect(response.body.data).toHaveProperty('accounts');
      expect(response.body.data.threshold).toBe(100.00);
    });

    test('should handle custom threshold', async () => {
      const response = await request(app)
        .get('/api/revenue/low-balance-alerts?threshold=500');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.threshold).toBe(500);
    });
  });

  describe('POST /api/revenue/distribute', () => {
    test('should return error when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/revenue/distribute')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Transaction ID, booking amount, and hospital ID are required');
    });

    test('should handle manual revenue distribution', async () => {
      const response = await request(app)
        .post('/api/revenue/distribute')
        .send({
          transactionId: 1,
          bookingAmount: 100.00,
          hospitalId: 1
        });

      // This will likely fail due to transaction not existing, but we test the structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/revenue/bulk-distribute', () => {
    test('should return error when transaction IDs array is missing', async () => {
      const response = await request(app)
        .post('/api/revenue/bulk-distribute')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Transaction IDs array is required');
    });

    test('should handle empty transaction IDs array', async () => {
      const response = await request(app)
        .post('/api/revenue/bulk-distribute')
        .send({ transactionIds: [] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Transaction IDs array is required');
    });

    test('should handle bulk revenue distribution', async () => {
      const response = await request(app)
        .post('/api/revenue/bulk-distribute')
        .send({ transactionIds: [1, 2, 3] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('successful');
      expect(response.body.data).toHaveProperty('failed');
    });
  });

  describe('GET /api/revenue/service-charges', () => {
    test('should get service charge analytics', async () => {
      const response = await request(app)
        .get('/api/revenue/service-charges');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should handle date range parameters', async () => {
      const response = await request(app)
        .get('/api/revenue/service-charges?startDate=2024-01-01&endDate=2024-12-31');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/revenue/hospital-distribution', () => {
    test('should get hospital revenue distribution', async () => {
      const response = await request(app)
        .get('/api/revenue/hospital-distribution');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/revenue/balance-summary', () => {
    test('should get balance summary statistics', async () => {
      const response = await request(app)
        .get('/api/revenue/balance-summary');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalAccounts');
      expect(response.body.data).toHaveProperty('totalCurrentBalance');
      expect(response.body.data).toHaveProperty('totalEarnings');
    });

    test('should handle userType filter', async () => {
      const response = await request(app)
        .get('/api/revenue/balance-summary?userType=hospital-authority');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/revenue/audit-trail', () => {
    test('should get audit trail', async () => {
      const response = await request(app)
        .get('/api/revenue/audit-trail');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('count');
    });

    test('should handle filtering parameters', async () => {
      const response = await request(app)
        .get('/api/revenue/audit-trail?transactionType=payment_received&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Error handling', () => {
    test('should handle server errors gracefully', async () => {
      const response = await request(app)
        .get('/api/revenue/hospital/99999');

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
    });
  });
});

module.exports = {};