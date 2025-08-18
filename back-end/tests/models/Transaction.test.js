const Transaction = require('../../models/Transaction');
const db = require('../../config/database');

describe('Transaction Model', () => {
  beforeEach(() => {
    // Clean up test data
    db.exec('DELETE FROM transactions WHERE transactionId LIKE "TEST_%"');
  });

  afterEach(() => {
    // Clean up test data
    db.exec('DELETE FROM transactions WHERE transactionId LIKE "TEST_%"');
  });

  describe('create', () => {
    it('should create a new transaction', () => {
      const transactionData = {
        bookingId: 1,
        userId: 1,
        hospitalId: 1,
        amount: 200.00,
        serviceCharge: 10.00,
        hospitalAmount: 190.00,
        paymentMethod: 'credit_card',
        transactionId: 'TEST_TXN_001',
        status: 'pending',
        paymentData: { cardLast4: '1234', cardType: 'visa' },
        processedAt: new Date().toISOString()
      };

      const transaction = Transaction.create(transactionData);

      expect(transaction).toBeDefined();
      expect(transaction.transactionId).toBe('TEST_TXN_001');
      expect(transaction.amount).toBe(200.00);
      expect(transaction.status).toBe('pending');
      expect(transaction.paymentData).toEqual({ cardLast4: '1234', cardType: 'visa' });
    });

    it('should create transaction with default status', () => {
      const transactionData = {
        bookingId: 1,
        userId: 1,
        hospitalId: 1,
        amount: 150.00,
        serviceCharge: 7.50,
        hospitalAmount: 142.50,
        paymentMethod: 'debit_card',
        transactionId: 'TEST_TXN_002'
      };

      const transaction = Transaction.create(transactionData);

      expect(transaction.status).toBe('pending');
    });
  });

  describe('findById', () => {
    it('should find transaction by id with related data', () => {
      const transactionData = {
        bookingId: 1,
        userId: 1,
        hospitalId: 1,
        amount: 300.00,
        serviceCharge: 15.00,
        hospitalAmount: 285.00,
        paymentMethod: 'bank_transfer',
        transactionId: 'TEST_TXN_003',
        status: 'completed'
      };

      const created = Transaction.create(transactionData);
      const found = Transaction.findById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.amount).toBe(300.00);
    });

    it('should return null for non-existent transaction', () => {
      const found = Transaction.findById(99999);
      expect(found).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update transaction status', () => {
      const transactionData = {
        bookingId: 1,
        userId: 1,
        hospitalId: 1,
        amount: 100.00,
        serviceCharge: 5.00,
        hospitalAmount: 95.00,
        paymentMethod: 'credit_card',
        transactionId: 'TEST_TXN_004',
        status: 'pending'
      };

      const created = Transaction.create(transactionData);
      const updated = Transaction.updateStatus(created.id, 'completed');

      expect(updated.status).toBe('completed');
      expect(updated.processedAt).toBeDefined();
    });
  });

  describe('findByTransactionId', () => {
    it('should find transaction by transaction ID', () => {
      const transactionData = {
        bookingId: 1,
        userId: 1,
        hospitalId: 1,
        amount: 250.00,
        serviceCharge: 12.50,
        hospitalAmount: 237.50,
        paymentMethod: 'digital_wallet',
        transactionId: 'TEST_TXN_005',
        status: 'completed'
      };

      Transaction.create(transactionData);
      const found = Transaction.findByTransactionId('TEST_TXN_005');

      expect(found).toBeDefined();
      expect(found.transactionId).toBe('TEST_TXN_005');
      expect(found.amount).toBe(250.00);
    });
  });

  describe('getRevenueAnalytics', () => {
    it('should return revenue analytics', () => {
      // Create test transactions
      const transactions = [
        {
          bookingId: 1, userId: 1, hospitalId: 1, amount: 100.00, serviceCharge: 5.00,
          hospitalAmount: 95.00, paymentMethod: 'credit_card', transactionId: 'TEST_ANALYTICS_001', status: 'completed'
        },
        {
          bookingId: 2, userId: 2, hospitalId: 1, amount: 200.00, serviceCharge: 10.00,
          hospitalAmount: 190.00, paymentMethod: 'debit_card', transactionId: 'TEST_ANALYTICS_002', status: 'completed'
        }
      ];

      transactions.forEach(txn => Transaction.create(txn));

      const analytics = Transaction.getRevenueAnalytics(1);
      expect(analytics).toBeDefined();
      expect(Array.isArray(analytics)).toBe(true);
    });
  });

  describe('validation', () => {
    it('should handle invalid data gracefully', () => {
      expect(() => {
        Transaction.create({
          // Missing required fields
          amount: 100.00
        });
      }).toThrow();
    });
  });
});

module.exports = {};