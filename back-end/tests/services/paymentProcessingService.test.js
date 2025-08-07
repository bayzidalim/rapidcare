const PaymentProcessingService = require('../../services/paymentProcessingService');
const Transaction = require('../../models/Transaction');
const Booking = require('../../models/Booking');
const ErrorHandler = require('../../utils/errorHandler');

// Mock dependencies
jest.mock('../../models/Transaction');
jest.mock('../../models/Booking');
jest.mock('../../config/database');
jest.mock('../../services/notificationService');

describe('PaymentProcessingService - Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processBookingPayment', () => {
    test('should handle booking not found error', async () => {
      Booking.findById.mockReturnValue(null);

      const result = await PaymentProcessingService.processBookingPayment(
        999,
        { mobileNumber: '01712345678', pin: '12345' },
        1
      );

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('BK009'); // INVALID_TRANSACTION
      expect(result.error.reason).toContain('Booking not found');
    });

    test('should handle duplicate payment error', async () => {
      Booking.findById.mockReturnValue({
        id: 1,
        paymentStatus: 'paid',
        paymentAmount: 1000,
        hospitalId: 1,
        transactionId: 'TXN123'
      });

      const result = await PaymentProcessingService.processBookingPayment(
        1,
        { mobileNumber: '01712345678', pin: '12345' },
        1
      );

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('BK009'); // DUPLICATE_TRANSACTION
    });

    test('should handle cancelled booking error', async () => {
      Booking.findById.mockReturnValue({
        id: 1,
        paymentStatus: 'pending',
        status: 'cancelled',
        paymentAmount: 1000,
        hospitalId: 1
      });

      const result = await PaymentProcessingService.processBookingPayment(
        1,
        { mobileNumber: '01712345678', pin: '12345' },
        1
      );

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('BK009'); // INVALID_TRANSACTION
      expect(result.error.reason).toContain('cancelled booking');
    });

    test('should handle invalid mobile number', async () => {
      Booking.findById.mockReturnValue({
        id: 1,
        paymentStatus: 'pending',
        status: 'confirmed',
        paymentAmount: 1000,
        hospitalId: 1
      });

      const result = await PaymentProcessingService.processBookingPayment(
        1,
        { mobileNumber: '123456789', pin: '12345' }, // Invalid mobile
        1
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error.code).toBe('BK001');
    });

    test('should handle invalid PIN', async () => {
      Booking.findById.mockReturnValue({
        id: 1,
        paymentStatus: 'pending',
        status: 'confirmed',
        paymentAmount: 1000,
        hospitalId: 1
      });

      const result = await PaymentProcessingService.processBookingPayment(
        1,
        { mobileNumber: '01712345678', pin: '123' }, // Invalid PIN
        1
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error.code).toBe('BK002');
    });

    test('should handle invalid amount', async () => {
      Booking.findById.mockReturnValue({
        id: 1,
        paymentStatus: 'pending',
        status: 'confirmed',
        paymentAmount: 5, // Below minimum
        hospitalId: 1
      });

      const result = await PaymentProcessingService.processBookingPayment(
        1,
        { mobileNumber: '01712345678', pin: '12345' },
        1
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error.code).toBe('BK008');
    });

    test('should process successful payment', async () => {
      const mockBooking = {
        id: 1,
        paymentStatus: 'pending',
        status: 'confirmed',
        paymentAmount: 1000,
        hospitalId: 1,
        hospitalName: 'Test Hospital',
        resourceType: 'beds'
      };

      const mockTransaction = {
        id: 1,
        transactionId: 'TXN123',
        amount: 1000,
        serviceCharge: 50,
        hospitalAmount: 950,
        status: 'completed'
      };

      Booking.findById.mockReturnValue(mockBooking);
      Transaction.create.mockReturnValue(mockTransaction);
      Transaction.updateStatus.mockReturnValue(mockTransaction);
      Transaction.updatePaymentData.mockReturnValue(true);
      Booking.updatePaymentStatus.mockReturnValue(true);

      const result = await PaymentProcessingService.processBookingPayment(
        1,
        { mobileNumber: '01712345678', pin: '12345' },
        1
      );

      expect(result.success).toBe(true);
      expect(result.transaction).toBeDefined();
      expect(result.message).toContain('successfully');
    });
  });

  describe('processBkashPayment', () => {
    test('should simulate insufficient balance error', async () => {
      const result = await PaymentProcessingService.processBkashPayment(
        { mobileNumber: '01700000001', pin: '12345' },
        1000,
        1
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INSUFFICIENT_BALANCE');
      expect(result.bkashResponse.statusCode).toBe('2001');
    });

    test('should simulate invalid PIN error', async () => {
      const result = await PaymentProcessingService.processBkashPayment(
        { mobileNumber: '01700000002', pin: '12345' },
        1000,
        1
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_PIN');
      expect(result.bkashResponse.statusCode).toBe('2002');
    });

    test('should simulate account blocked error', async () => {
      const result = await PaymentProcessingService.processBkashPayment(
        { mobileNumber: '01700000003', pin: '12345' },
        1000,
        1
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('ACCOUNT_BLOCKED');
      expect(result.bkashResponse.statusCode).toBe('2003');
    });

    test('should simulate successful payment', async () => {
      const result = await PaymentProcessingService.processBkashPayment(
        { mobileNumber: '01712345678', pin: '12345' },
        1000,
        1
      );

      expect(result.success).toBe(true);
      expect(result.bkashTransactionId).toBeDefined();
      expect(result.amount).toBe('৳1,000.00');
      expect(result.bkashResponse.statusCode).toBe('0000');
    });
  });

  describe('generateBkashTransactionId', () => {
    test('should generate valid bKash transaction ID', () => {
      const transactionId = PaymentProcessingService.generateBkashTransactionId();
      
      expect(transactionId).toMatch(/^BK\d+[A-Z0-9]+$/);
      expect(transactionId.length).toBeGreaterThan(10);
    });

    test('should generate unique transaction IDs', () => {
      const id1 = PaymentProcessingService.generateBkashTransactionId();
      const id2 = PaymentProcessingService.generateBkashTransactionId();
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('confirmBkashPayment', () => {
    test('should confirm payment and update transaction', () => {
      const mockTransaction = {
        id: 1,
        transactionId: 'TXN123',
        paymentData: '{"mobileNumber":"01712345678"}'
      };

      Transaction.updateStatus.mockReturnValue(mockTransaction);
      Transaction.updatePaymentData.mockReturnValue(true);

      const result = PaymentProcessingService.confirmBkashPayment(1, 'BK123456');

      expect(Transaction.updateStatus).toHaveBeenCalledWith(1, 'completed', expect.any(String));
      expect(Transaction.updatePaymentData).toHaveBeenCalled();
      expect(result).toBe(mockTransaction);
    });
  });

  describe('handleBkashPaymentFailure', () => {
    test('should handle payment failure and update transaction', () => {
      const mockTransaction = {
        id: 1,
        transactionId: 'TXN123',
        paymentData: '{"mobileNumber":"01712345678"}',
        amount: 1000
      };

      Transaction.findById.mockReturnValue(mockTransaction);
      Transaction.updateStatus.mockReturnValue(mockTransaction);
      Transaction.updatePaymentData.mockReturnValue(true);

      const result = PaymentProcessingService.handleBkashPaymentFailure(
        1,
        'Insufficient balance',
        2
      );

      expect(Transaction.updateStatus).toHaveBeenCalledWith(1, 'failed');
      expect(Transaction.updatePaymentData).toHaveBeenCalled();
      expect(result).toBe(mockTransaction);
    });
  });

  describe('generateBkashPaymentReceipt', () => {
    test('should generate bKash-style receipt', () => {
      const mockTransaction = {
        id: 1,
        transactionId: 'TXN123',
        bookingId: 1,
        amount: 1000,
        serviceCharge: 50,
        hospitalAmount: 950,
        status: 'completed',
        processedAt: '2024-01-01T00:00:00Z',
        paymentData: '{"bkashTransactionId":"BK123456","mobileNumber":"01712345678"}'
      };

      const mockBooking = {
        patientName: 'John Doe',
        resourceType: 'beds',
        scheduledDate: '2024-01-02'
      };

      Transaction.findById.mockReturnValue(mockTransaction);
      Booking.findById.mockReturnValue(mockBooking);

      const receipt = PaymentProcessingService.generateBkashPaymentReceipt(1);

      expect(receipt.receiptId).toContain('BKASH_RCPT_');
      expect(receipt.transactionId).toBe('TXN123');
      expect(receipt.bkashTransactionId).toBe('BK123456');
      expect(receipt.amount).toBe('৳1,000.00');
      expect(receipt.paymentMethod).toBe('bKash');
      expect(receipt.bkashLogo).toBe(true);
      expect(receipt.currency).toBe('BDT');
      expect(receipt.currencySymbol).toBe('৳');
    });

    test('should throw error for non-existent transaction', () => {
      Transaction.findById.mockReturnValue(null);

      expect(() => {
        PaymentProcessingService.generateBkashPaymentReceipt(999);
      }).toThrow('Transaction not found');
    });
  });

  describe('Error handling with retry logic', () => {
    test('should provide retry information for retryable errors', () => {
      const error = new Error('Network timeout');
      const errorResponse = ErrorHandler.handleBkashPaymentError(error, 1);

      expect(errorResponse.error.canRetry).toBe(true);
      expect(errorResponse.error.retryAfter).toBeGreaterThan(0);
      expect(errorResponse.error.nextRetryMessage).toContain('চেষ্টা');
      expect(errorResponse.error.nextRetryMessageEn).toContain('Retry');
    });

    test('should not allow retry after max attempts', () => {
      const error = new Error('Network timeout');
      const errorResponse = ErrorHandler.handleBkashPaymentError(error, 3);

      expect(errorResponse.error.canRetry).toBe(false);
      expect(errorResponse.error.finalAttempt).toBe(true);
    });

    test('should not allow retry for non-retryable errors', () => {
      const error = new Error('Account blocked');
      error.message = 'blocked';
      const errorResponse = ErrorHandler.handleBkashPaymentError(error, 1);

      expect(errorResponse.error.canRetry).toBe(false);
      expect(errorResponse.error.retryable).toBe(false);
    });
  });
});