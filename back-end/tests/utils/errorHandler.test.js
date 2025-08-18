const { expect } = require('chai');
const ErrorHandler = require('../../utils/errorHandler');
const { formatTaka } = require('../../utils/currencyUtils');

describe('ErrorHandler', () => {
  describe('bKash Payment Error Handling', () => {
    it('should validate bKash payment data correctly', () => {
      const validPaymentData = {
        mobileNumber: '01712345678',
        pin: '12345',
        amount: 1000
      };

      const validation = ErrorHandler.validateBkashPaymentData(validPaymentData);
      expect(validation.isValid).to.be.true;
      expect(validation.errors).to.have.lengthOf(0);
    });

    it('should reject invalid mobile number', () => {
      const invalidPaymentData = {
        mobileNumber: '123456789', // Invalid format
        pin: '12345',
        amount: 1000
      };

      const validation = ErrorHandler.validateBkashPaymentData(invalidPaymentData);
      expect(validation.isValid).to.be.false;
      expect(validation.errors).to.have.lengthOf(1);
      expect(validation.errors[0].error.code).to.equal('BK001');
    });

    test('should reject invalid PIN', () => {
      const invalidPaymentData = {
        mobileNumber: '01712345678',
        pin: '123', // Too short
        amount: 1000
      };

      const validation = ErrorHandler.validateBkashPaymentData(invalidPaymentData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].error.code).toBe('BK002');
    });

    test('should reject invalid amount', () => {
      const invalidPaymentData = {
        mobileNumber: '01712345678',
        pin: '12345',
        amount: 5 // Below minimum
      };

      const validation = ErrorHandler.validateBkashPaymentData(invalidPaymentData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].error.code).toBe('BK008');
    });

    test('should handle bKash payment errors with retry logic', () => {
      const error = new Error('Network timeout');
      const errorResponse = ErrorHandler.handleBkashPaymentError(error, 1);

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe('BK010');
      expect(errorResponse.error.retryable).toBe(true);
      expect(errorResponse.error.canRetry).toBe(true);
      expect(errorResponse.error.retryAfter).toBeGreaterThan(0);
    });

    test('should not allow retry after max attempts', () => {
      const error = new Error('Network timeout');
      const errorResponse = ErrorHandler.handleBkashPaymentError(error, 3);

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.canRetry).toBe(false);
      expect(errorResponse.error.finalAttempt).toBe(true);
    });
  });

  describe('Revenue Distribution Error Handling', () => {
    test('should handle revenue distribution errors with rollback', () => {
      const error = new Error('Balance update failed');
      const transactionData = {
        transactionId: 'TXN123',
        hospitalId: 1,
        amount: 1000
      };

      const errorResponse = ErrorHandler.handleRevenueDistributionError(error, transactionData);

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe('REV001');
      expect(errorResponse.error.rollbackRequired).toBe(true);
      expect(errorResponse.error.recoveryInstructions).toBeDefined();
    });

    test('should handle service charge calculation errors', () => {
      const error = new Error('Service charge calculation failed');
      const transactionData = {
        transactionId: 'TXN123',
        hospitalId: 1,
        amount: 1000
      };

      const errorResponse = ErrorHandler.handleRevenueDistributionError(error, transactionData);

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.type).toBe('revenue');
      expect(errorResponse.error.rollbackRequired).toBe(true);
    });
  });

  describe('Pricing Validation Error Handling', () => {
    test('should validate Taka pricing correctly', () => {
      const validPricing = {
        resourceType: 'beds',
        baseRate: 1500,
        hourlyRate: 100,
        minimumCharge: 500,
        maximumCharge: 5000
      };

      const validation = ErrorHandler.validateTakaPricing(validPricing);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject negative pricing', () => {
      const invalidPricing = {
        resourceType: 'beds',
        baseRate: -100
      };

      const validation = ErrorHandler.validateTakaPricing(invalidPricing);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].error.code).toBe('PRC002');
    });

    test('should reject inconsistent pricing', () => {
      const invalidPricing = {
        resourceType: 'beds',
        baseRate: 1000,
        hourlyRate: 1500 // Higher than base rate
      };

      const validation = ErrorHandler.validateTakaPricing(invalidPricing);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].error.code).toBe('PRC005');
    });

    test('should warn about rates too high', () => {
      const highPricing = {
        resourceType: 'beds',
        baseRate: 10000 // Very high for beds
      };

      const validation = ErrorHandler.validateTakaPricing(highPricing);
      expect(validation.warnings).toHaveLength(1);
      expect(validation.warnings[0].error.code).toBe('PRC003');
    });

    test('should warn about rates too low', () => {
      const lowPricing = {
        resourceType: 'icu',
        baseRate: 500 // Very low for ICU
      };

      const validation = ErrorHandler.validateTakaPricing(lowPricing);
      expect(validation.warnings).toHaveLength(1);
      expect(validation.warnings[0].error.code).toBe('PRC004');
    });
  });

  describe('Financial Data Consistency Error Handling', () => {
    test('should handle balance mismatch errors', () => {
      const error = new Error('Balance mismatch detected');
      const financialData = {
        expected: 1000,
        actual: 950,
        difference: 50,
        affectedTransactions: ['TXN123']
      };

      const errorResponse = ErrorHandler.handleFinancialConsistencyError(error, financialData);

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe('FIN001');
      expect(errorResponse.error.expected).toBe(formatTaka(1000));
      expect(errorResponse.error.actual).toBe(formatTaka(950));
      expect(errorResponse.error.correctionInstructions).toBeDefined();
    });

    test('should handle transaction integrity errors', () => {
      const error = new Error('Transaction integrity check failed');
      const financialData = {
        affectedTransactions: ['TXN123', 'TXN124']
      };

      const errorResponse = ErrorHandler.handleFinancialConsistencyError(error, financialData);

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe('FIN002');
      expect(errorResponse.error.affectedTransactions).toHaveLength(2);
    });
  });

  describe('Taka Amount Validation', () => {
    test('should validate valid Taka amounts', () => {
      const validation = ErrorHandler.validateTakaAmount(1000.50);
      expect(validation.isValid).toBe(true);
      expect(validation.sanitizedAmount).toBe(1000.50);
    });

    test('should sanitize string amounts', () => {
      const validation = ErrorHandler.validateTakaAmount('1000.75');
      expect(validation.isValid).toBe(true);
      expect(validation.sanitizedAmount).toBe(1000.75);
    });

    test('should round to proper precision', () => {
      const validation = ErrorHandler.validateTakaAmount(1000.999);
      expect(validation.isValid).toBe(true);
      expect(validation.sanitizedAmount).toBe(1001.00);
    });

    test('should reject negative amounts', () => {
      const validation = ErrorHandler.validateTakaAmount(-100);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].error.code).toBe('PRC002');
    });

    test('should reject invalid amounts', () => {
      const validation = ErrorHandler.validateTakaAmount('invalid');
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].error.code).toBe('FIN003');
    });

    test('should respect minimum amount constraints', () => {
      const validation = ErrorHandler.validateTakaAmount(5, { minAmount: 10 });
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].error.code).toBe('BK008');
    });

    test('should respect maximum amount constraints', () => {
      const validation = ErrorHandler.validateTakaAmount(30000, { maxAmount: 25000 });
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].error.code).toBe('BK008');
    });
  });

  describe('Error Display Formatting', () => {
    test('should format error for Bengali display', () => {
      const error = ErrorHandler.createError('bkash', 'INVALID_MOBILE');
      const formatted = ErrorHandler.formatErrorForDisplay(error, 'bn');

      expect(formatted.title).toBe('bKash পেমেন্ট ত্রুটি');
      expect(formatted.message).toContain('অবৈধ মোবাইল নম্বর');
      expect(formatted.type).toBe('validation');
      expect(formatted.retryable).toBe(true);
    });

    test('should format error for English display', () => {
      const error = ErrorHandler.createError('bkash', 'INVALID_MOBILE');
      const formatted = ErrorHandler.formatErrorForDisplay(error, 'en');

      expect(formatted.title).toBe('bKash Payment Error');
      expect(formatted.message).toContain('Invalid mobile number');
      expect(formatted.type).toBe('validation');
      expect(formatted.retryable).toBe(true);
    });

    test('should handle missing error gracefully', () => {
      const formatted = ErrorHandler.formatErrorForDisplay(null, 'bn');

      expect(formatted.title).toBe('ত্রুটি');
      expect(formatted.message).toContain('অপ্রত্যাশিত ত্রুটি');
      expect(formatted.type).toBe('error');
    });
  });

  describe('Error Logging', () => {
    test('should log error with context', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const error = ErrorHandler.createError('bkash', 'NETWORK_ERROR');
      const context = { transactionId: 'TXN123', userId: 1 };
      
      const logEntry = ErrorHandler.logError(error, context);

      expect(logEntry.timestamp).toBeDefined();
      expect(logEntry.context).toEqual(context);
      expect(logEntry.severity).toBe('network');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test('should handle critical errors with alerts', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const error = ErrorHandler.createError('financial', 'BALANCE_MISMATCH');
      const logEntry = ErrorHandler.logError(error);

      expect(logEntry.severity).toBe('critical');
      expect(consoleSpy).toHaveBeenCalledWith('CRITICAL ERROR ALERT:', logEntry);

      consoleSpy.mockRestore();
    });
  });

  describe('Generic Error Creation', () => {
    test('should create generic error with custom message', () => {
      const error = ErrorHandler.createGenericError('Custom error message');

      expect(error.success).toBe(false);
      expect(error.error.code).toBe('GEN001');
      expect(error.error.type).toBe('generic');
      expect(error.error.messageEn).toBe('Custom error message');
      expect(error.error.retryable).toBe(true);
    });

    test('should create generic error with default message', () => {
      const error = ErrorHandler.createGenericError();

      expect(error.success).toBe(false);
      expect(error.error.message).toContain('অপ্রত্যাশিত ত্রুটি');
      expect(error.error.messageEn).toContain('unexpected error');
    });
  });
});