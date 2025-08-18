const { expect } = require('chai');
const ErrorHandler = require('../../utils/errorHandler');
const { formatTaka } = require('../../utils/currencyUtils');

describe('ErrorHandler - Comprehensive Error Handling', () => {
  describe('bKash Payment Validation', () => {
    it('should validate correct bKash payment data', () => {
      const validData = {
        mobileNumber: '01712345678',
        pin: '12345',
        amount: 1000
      };

      const result = ErrorHandler.validateBkashPaymentData(validData);
      expect(result.isValid).to.be.true;
      expect(result.errors).to.have.lengthOf(0);
    });

    it('should reject invalid mobile number', () => {
      const invalidData = {
        mobileNumber: '123456789',
        pin: '12345',
        amount: 1000
      };

      const result = ErrorHandler.validateBkashPaymentData(invalidData);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.have.lengthOf(1);
      expect(result.errors[0].error.code).to.equal('BK001');
    });

    it('should reject invalid PIN', () => {
      const invalidData = {
        mobileNumber: '01712345678',
        pin: '123',
        amount: 1000
      };

      const result = ErrorHandler.validateBkashPaymentData(invalidData);
      expect(result.isValid).to.be.false;
      expect(result.errors[0].error.code).to.equal('BK002');
    });

    it('should reject invalid amount', () => {
      const invalidData = {
        mobileNumber: '01712345678',
        pin: '12345',
        amount: 5 // Below minimum
      };

      const result = ErrorHandler.validateBkashPaymentData(invalidData);
      expect(result.isValid).to.be.false;
      expect(result.errors[0].error.code).to.equal('BK008');
    });
  });

  describe('Taka Pricing Validation', () => {
    it('should validate correct pricing data', () => {
      const validPricing = {
        resourceType: 'beds',
        baseRate: 1500,
        hourlyRate: 100
      };

      const result = ErrorHandler.validateTakaPricing(validPricing);
      expect(result.isValid).to.be.true;
      expect(result.errors).to.have.lengthOf(0);
    });

    it('should reject negative pricing', () => {
      const invalidPricing = {
        resourceType: 'beds',
        baseRate: -100
      };

      const result = ErrorHandler.validateTakaPricing(invalidPricing);
      expect(result.isValid).to.be.false;
      expect(result.errors[0].error.code).to.equal('PRC002');
    });

    it('should reject inconsistent pricing', () => {
      const invalidPricing = {
        resourceType: 'beds',
        baseRate: 1000,
        hourlyRate: 1500 // Higher than base rate
      };

      const result = ErrorHandler.validateTakaPricing(invalidPricing);
      expect(result.isValid).to.be.false;
      expect(result.errors[0].error.code).to.equal('PRC005');
    });
  });

  describe('Taka Amount Validation', () => {
    it('should validate positive amounts', () => {
      const result = ErrorHandler.validateTakaAmount(1000.50);
      expect(result.isValid).to.be.true;
      expect(result.sanitizedAmount).to.equal(1000.50);
    });

    it('should sanitize string amounts', () => {
      const result = ErrorHandler.validateTakaAmount('1000.75');
      expect(result.isValid).to.be.true;
      expect(result.sanitizedAmount).to.equal(1000.75);
    });

    it('should reject negative amounts', () => {
      const result = ErrorHandler.validateTakaAmount(-100);
      expect(result.isValid).to.be.false;
      expect(result.errors[0].error.code).to.equal('PRC002');
    });

    it('should respect minimum amount constraints', () => {
      const result = ErrorHandler.validateTakaAmount(5, { minAmount: 10 });
      expect(result.isValid).to.be.false;
      expect(result.errors[0].error.code).to.equal('BK008');
    });
  });

  describe('Error Creation and Formatting', () => {
    it('should create bKash error with correct structure', () => {
      const error = ErrorHandler.createError('bkash', 'INVALID_MOBILE');
      
      expect(error.success).to.be.false;
      expect(error.error.code).to.equal('BK001');
      expect(error.error.type).to.equal('bkash');
      expect(error.error.message).to.include('মোবাইল নম্বর');
      expect(error.error.messageEn).to.include('mobile number');
    });

    it('should format error for Bengali display', () => {
      const error = ErrorHandler.createError('bkash', 'INVALID_MOBILE');
      const formatted = ErrorHandler.formatErrorForDisplay(error, 'bn');

      expect(formatted.title).to.equal('bKash পেমেন্ট ত্রুটি');
      expect(formatted.message).to.include('অবৈধ মোবাইল নম্বর');
      expect(formatted.type).to.equal('validation');
    });

    it('should format error for English display', () => {
      const error = ErrorHandler.createError('bkash', 'INVALID_MOBILE');
      const formatted = ErrorHandler.formatErrorForDisplay(error, 'en');

      expect(formatted.title).to.equal('bKash Payment Error');
      expect(formatted.message).to.include('Invalid mobile number');
      expect(formatted.type).to.equal('validation');
    });
  });

  describe('Payment Error Handling with Retry Logic', () => {
    it('should provide retry information for retryable errors', () => {
      const error = new Error('Network timeout');
      const errorResponse = ErrorHandler.handleBkashPaymentError(error, 1);

      expect(errorResponse.success).to.be.false;
      expect(errorResponse.error.retryable).to.be.true;
      expect(errorResponse.error.canRetry).to.be.true;
      expect(errorResponse.error.retryAfter).to.be.greaterThan(0);
    });

    it('should not allow retry after max attempts', () => {
      const error = new Error('Network timeout');
      const errorResponse = ErrorHandler.handleBkashPaymentError(error, 3);

      expect(errorResponse.error.canRetry).to.be.false;
      expect(errorResponse.error.finalAttempt).to.be.true;
    });
  });

  describe('Revenue Distribution Error Handling', () => {
    it('should handle revenue distribution errors with rollback', () => {
      const error = new Error('Balance update failed');
      const transactionData = {
        transactionId: 'TXN123',
        hospitalId: 1,
        amount: 1000
      };

      const errorResponse = ErrorHandler.handleRevenueDistributionError(error, transactionData);

      expect(errorResponse.success).to.be.false;
      expect(errorResponse.error.rollbackRequired).to.be.true;
      expect(errorResponse.error.recoveryInstructions).to.exist;
    });
  });

  describe('Financial Consistency Error Handling', () => {
    it('should handle balance mismatch errors', () => {
      const error = new Error('Balance mismatch detected');
      const financialData = {
        expected: 1000,
        actual: 950,
        difference: 50
      };

      const errorResponse = ErrorHandler.handleFinancialConsistencyError(error, financialData);

      expect(errorResponse.success).to.be.false;
      expect(errorResponse.error.expected).to.equal(formatTaka(1000));
      expect(errorResponse.error.actual).to.equal(formatTaka(950));
      expect(errorResponse.error.correctionInstructions).to.exist;
    });
  });
});