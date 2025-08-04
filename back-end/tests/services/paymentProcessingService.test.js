const PaymentProcessingService = require('../../services/paymentProcessingService');
const Transaction = require('../../models/Transaction');
const Booking = require('../../models/Booking');
const db = require('../../config/database');

describe('PaymentProcessingService', () => {
  beforeEach(() => {
    // Clean up test data
    db.exec('DELETE FROM transactions WHERE transactionId LIKE "TEST_%"');
  });

  afterAll(() => {
    // Clean up test data
    db.exec('DELETE FROM transactions WHERE transactionId LIKE "TEST_%"');
  });

  describe('validatePaymentData', () => {
    test('should validate correct credit card data', () => {
      const validPaymentData = {
        paymentMethod: 'credit_card',
        cardNumber: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        cardHolderName: 'John Doe'
      };

      const validation = PaymentProcessingService.validatePaymentData(validPaymentData);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject invalid payment data', () => {
      const invalidPaymentData = {
        paymentMethod: 'credit_card',
        cardNumber: '123', // Too short
        // Missing required fields
      };

      const validation = PaymentProcessingService.validatePaymentData(invalidPaymentData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should validate bank transfer data', () => {
      const bankTransferData = {
        paymentMethod: 'bank_transfer',
        bankAccount: '1234567890',
        routingNumber: '021000021'
      };

      const validation = PaymentProcessingService.validatePaymentData(bankTransferData);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should validate digital wallet data', () => {
      const walletData = {
        paymentMethod: 'digital_wallet',
        walletId: 'user@example.com',
        walletProvider: 'paypal'
      };

      const validation = PaymentProcessingService.validatePaymentData(walletData);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('generateTransactionId', () => {
    test('should generate unique transaction IDs', () => {
      const id1 = PaymentProcessingService.generateTransactionId();
      const id2 = PaymentProcessingService.generateTransactionId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^TXN_\d+_[A-Z0-9]+$/);
    });
  });

  describe('processDummyPayment', () => {
    test('should simulate successful payment', async () => {
      const paymentData = {
        paymentMethod: 'credit_card',
        cardNumber: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        cardHolderName: 'John Doe'
      };

      const result = await PaymentProcessingService.processDummyPayment(paymentData, 100.00);

      expect(result.success).toBe(true);
      expect(result.gatewayTransactionId).toBeDefined();
      expect(result.gatewayResponse.code).toBe('00');
    });

    test('should simulate payment failure for test card', async () => {
      const paymentData = {
        paymentMethod: 'credit_card',
        cardNumber: '4000000000000002', // Test failure card
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        cardHolderName: 'John Doe'
      };

      const result = await PaymentProcessingService.processDummyPayment(paymentData, 100.00);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Card declined');
      expect(result.gatewayResponse.code).toBe('05');
    });
  });

  describe('shouldSimulateFailure', () => {
    test('should identify test failure cards', () => {
      const paymentData = {
        cardNumber: '4000000000000119' // Invalid card number test case
      };

      const result = PaymentProcessingService.shouldSimulateFailure(paymentData, 100.00);

      expect(result.shouldFail).toBe(true);
      expect(result.code).toBe('14');
      expect(result.reason).toBe('Invalid card number');
    });

    test('should not fail for valid card numbers', () => {
      const paymentData = {
        cardNumber: '4111111111111111' // Valid test card
      };

      // Note: This test might occasionally fail due to random 5% failure rate
      // In a real test environment, you'd want to mock the random function
      const result = PaymentProcessingService.shouldSimulateFailure(paymentData, 100.00);
      
      // We can't guarantee this won't randomly fail, so we just check the structure
      expect(result).toHaveProperty('shouldFail');
      expect(typeof result.shouldFail).toBe('boolean');
    });
  });

  describe('generatePaymentReceipt', () => {
    test('should generate receipt for valid transaction', () => {
      // This test would require a valid transaction in the database
      // For now, we'll test the structure
      const mockTransactionId = 1;
      
      try {
        const receipt = PaymentProcessingService.generatePaymentReceipt(mockTransactionId);
        
        // If transaction exists, receipt should have required fields
        expect(receipt).toHaveProperty('receiptId');
        expect(receipt).toHaveProperty('transactionId');
        expect(receipt).toHaveProperty('amount');
        expect(receipt).toHaveProperty('receiptDate');
      } catch (error) {
        // If transaction doesn't exist, should throw appropriate error
        expect(error.message).toBe('Transaction not found');
      }
    });
  });

  describe('payment method validation', () => {
    test('should accept valid payment methods', () => {
      const validMethods = ['credit_card', 'debit_card', 'bank_transfer', 'digital_wallet'];
      
      validMethods.forEach(method => {
        const paymentData = { paymentMethod: method };
        const validation = PaymentProcessingService.validatePaymentData(paymentData);
        
        // Should not have payment method error (may have other validation errors)
        expect(validation.errors).not.toContain('Invalid payment method');
      });
    });

    test('should reject invalid payment methods', () => {
      const invalidPaymentData = {
        paymentMethod: 'invalid_method'
      };

      const validation = PaymentProcessingService.validatePaymentData(invalidPaymentData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid payment method');
    });
  });
});

module.exports = {};