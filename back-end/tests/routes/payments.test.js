const request = require('supertest');
const express = require('express');
const paymentRoutes = require('../../routes/payments');
const auth = require('../../middleware/auth');
const db = require('../../config/database');

// Mock the auth middleware for testing
jest.mock('../../middleware/auth', () => {
  return (req, res, next) => {
    req.user = {
      id: 1,
      userType: 'user',
      email: 'test@example.com'
    };
    next();
  };
});

// Create test app
const app = express();
app.use(express.json());
app.use('/api/payments', paymentRoutes);

describe('Payment Routes', () => {
  beforeEach(() => {
    // Clean up test data
    db.exec('DELETE FROM transactions WHERE transactionId LIKE "TEST_%"');
  });

  afterAll(() => {
    // Clean up test data
    db.exec('DELETE FROM transactions WHERE transactionId LIKE "TEST_%"');
  });

  describe('POST /api/payments/validate', () => {
    test('should validate correct payment data', async () => {
      const paymentData = {
        paymentMethod: 'credit_card',
        cardNumber: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        cardHolderName: 'John Doe'
      };

      const response = await request(app)
        .post('/api/payments/validate')
        .send({ paymentData });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.errors).toHaveLength(0);
    });

    test('should reject invalid payment data', async () => {
      const paymentData = {
        paymentMethod: 'credit_card',
        cardNumber: '123', // Too short
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/payments/validate')
        .send({ paymentData });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors.length).toBeGreaterThan(0);
    });

    test('should return error when payment data is missing', async () => {
      const response = await request(app)
        .post('/api/payments/validate')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Payment data is required');
    });
  });

  describe('GET /api/payments/history', () => {
    test('should return payment history for current user', async () => {
      const response = await request(app)
        .get('/api/payments/history');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('count');
    });

    test('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/payments/history?limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/payments/history/:userId', () => {
    test('should return payment history for specified user (same user)', async () => {
      const response = await request(app)
        .get('/api/payments/history/1'); // Same as mocked user ID

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should deny access to other user history', async () => {
      const response = await request(app)
        .get('/api/payments/history/999'); // Different user ID

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('GET /api/payments/:id/receipt', () => {
    test('should return 404 for non-existent transaction', async () => {
      const response = await request(app)
        .get('/api/payments/99999/receipt');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Transaction not found');
    });
  });

  describe('GET /api/payments/transaction/:transactionId', () => {
    test('should return 404 for non-existent transaction', async () => {
      const response = await request(app)
        .get('/api/payments/transaction/NONEXISTENT_TXN');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Transaction not found');
    });
  });

  describe('POST /api/payments/process', () => {
    test('should return error when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/payments/process')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Booking ID and payment data are required');
    });

    test('should return error for invalid booking ID', async () => {
      const paymentData = {
        paymentMethod: 'credit_card',
        cardNumber: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        cardHolderName: 'John Doe'
      };

      const response = await request(app)
        .post('/api/payments/process')
        .send({
          bookingId: 99999, // Non-existent booking
          paymentData
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/payments/:id/refund', () => {
    test('should deny access to non-admin/non-hospital-authority users', async () => {
      const response = await request(app)
        .post('/api/payments/1/refund')
        .send({
          refundAmount: 100.00,
          reason: 'Test refund'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Only admins and hospital authorities can process refunds');
    });

    test('should return error when required fields are missing', async () => {
      // Mock admin user
      const originalAuth = auth;
      jest.doMock('../../middleware/auth', () => {
        return (req, res, next) => {
          req.user = {
            id: 1,
            userType: 'admin',
            email: 'admin@example.com'
          };
          next();
        };
      });

      const response = await request(app)
        .post('/api/payments/1/refund')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Refund amount and reason are required');
    });
  });

  describe('POST /api/payments/:id/retry', () => {
    test('should return error when payment data is missing', async () => {
      const response = await request(app)
        .post('/api/payments/1/retry')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Payment data is required');
    });
  });

  describe('Error handling', () => {
    test('should handle server errors gracefully', async () => {
      // This test would require mocking services to throw errors
      // For now, we just verify the error response structure
      const response = await request(app)
        .get('/api/payments/transaction/INVALID');

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
    });
  });
});

module.exports = {};