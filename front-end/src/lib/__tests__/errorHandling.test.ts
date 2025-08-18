import {
  formatErrorForDisplay,
  validateBkashPaymentData,
  validateTakaPricing,
  validateTakaAmount,
  handleApiError,
  createRetryFunction
} from '../errorHandling';

describe('Frontend Error Handling', () => {
  describe('formatErrorForDisplay', () => {
    it('should format structured error response for Bengali', () => {
      const errorResponse = {
        success: false as const,
        error: {
          code: 'BK001',
          type: 'bkash',
          severity: 'validation',
          message: 'অবৈধ মোবাইল নম্বর',
          messageEn: 'Invalid mobile number',
          suggestion: 'সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন',
          retryable: true,
          timestamp: '2024-01-01T00:00:00Z'
        }
      };

      const formatted = formatErrorForDisplay(errorResponse, 'bn');

      expect(formatted.title).toBe('bKash পেমেন্ট ত্রুটি');
      expect(formatted.message).toBe('অবৈধ মোবাইল নম্বর');
      expect(formatted.suggestion).toBe('সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন');
      expect(formatted.code).toBe('BK001');
      expect(formatted.type).toBe('validation');
      expect(formatted.retryable).toBe(true);
    });

    it('should format structured error response for English', () => {
      const errorResponse = {
        success: false as const,
        error: {
          code: 'BK001',
          type: 'bkash',
          severity: 'validation',
          message: 'অবৈধ মোবাইল নম্বর',
          messageEn: 'Invalid mobile number',
          retryable: true,
          timestamp: '2024-01-01T00:00:00Z'
        }
      };

      const formatted = formatErrorForDisplay(errorResponse, 'en');

      expect(formatted.title).toBe('bKash Payment Error');
      expect(formatted.message).toBe('Invalid mobile number');
      expect(formatted.type).toBe('validation');
    });

    it('should handle multiple errors', () => {
      const errorResponse = {
        success: false as const,
        errors: [
          {
            success: false as const,
            error: {
              code: 'BK001',
              type: 'bkash',
              severity: 'validation',
              message: 'অবৈধ মোবাইল নম্বর',
              messageEn: 'Invalid mobile number',
              retryable: true,
              timestamp: '2024-01-01T00:00:00Z'
            }
          }
        ]
      };

      const formatted = formatErrorForDisplay(errorResponse, 'en');

      expect(formatted.title).toBe('bKash Payment Error');
      expect(formatted.message).toBe('Invalid mobile number');
    });

    it('should handle string errors', () => {
      const formatted = formatErrorForDisplay('Custom error message', 'en');

      expect(formatted.title).toBe('Error');
      expect(formatted.message).toBe('Custom error message');
      expect(formatted.type).toBe('error');
    });

    it('should handle Error objects', () => {
      const error = new Error('System error occurred');
      const formatted = formatErrorForDisplay(error, 'en');

      expect(formatted.title).toBe('System Error');
      expect(formatted.message).toBe('System error occurred');
      expect(formatted.type).toBe('error');
    });

    it('should handle null/undefined errors', () => {
      const formatted = formatErrorForDisplay(null, 'bn');

      expect(formatted.title).toBe('ত্রুটি');
      expect(formatted.message).toBe('একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।');
      expect(formatted.type).toBe('error');
    });
  });

  describe('validateBkashPaymentData', () => {
    it('should validate correct payment data', () => {
      const validData = {
        mobileNumber: '01712345678',
        pin: '12345',
        amount: 1000
      };

      const result = validateBkashPaymentData(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid mobile number', () => {
      const invalidData = {
        mobileNumber: '123456789',
        pin: '12345',
        amount: 1000
      };

      const result = validateBkashPaymentData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('BK001');
      expect(result.errors[0].message).toContain('অবৈধ মোবাইল নম্বর');
    });

    it('should reject missing mobile number', () => {
      const invalidData = {
        pin: '12345',
        amount: 1000
      };

      const result = validateBkashPaymentData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('BK001');
    });

    it('should reject invalid PIN', () => {
      const invalidData = {
        mobileNumber: '01712345678',
        pin: '123',
        amount: 1000
      };

      const result = validateBkashPaymentData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('BK002');
    });

    it('should reject missing PIN', () => {
      const invalidData = {
        mobileNumber: '01712345678',
        amount: 1000
      };

      const result = validateBkashPaymentData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('BK002');
    });

    it('should reject invalid amount', () => {
      const invalidData = {
        mobileNumber: '01712345678',
        pin: '12345',
        amount: 5
      };

      const result = validateBkashPaymentData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('BK008');
    });

    it('should reject amount above maximum', () => {
      const invalidData = {
        mobileNumber: '01712345678',
        pin: '12345',
        amount: 30000
      };

      const result = validateBkashPaymentData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('BK008');
    });
  });

  describe('validateTakaPricing', () => {
    it('should validate correct pricing data', () => {
      const validPricing = {
        resourceType: 'beds',
        baseRate: 1500,
        hourlyRate: 100,
        minimumCharge: 500,
        maximumCharge: 5000
      };

      const result = validateTakaPricing(validPricing);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid resource type', () => {
      const invalidPricing = {
        resourceType: 'invalid',
        baseRate: 1500
      };

      const result = validateTakaPricing(invalidPricing);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('PRC001');
    });

    it('should reject negative base rate', () => {
      const invalidPricing = {
        resourceType: 'beds',
        baseRate: -100
      };

      const result = validateTakaPricing(invalidPricing);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('PRC002');
    });

    it('should reject base rate too low', () => {
      const invalidPricing = {
        resourceType: 'beds',
        baseRate: 5
      };

      const result = validateTakaPricing(invalidPricing);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('PRC001');
    });

    it('should reject base rate too high', () => {
      const invalidPricing = {
        resourceType: 'beds',
        baseRate: 150000
      };

      const result = validateTakaPricing(invalidPricing);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('PRC001');
    });

    it('should reject inconsistent hourly rate', () => {
      const invalidPricing = {
        resourceType: 'beds',
        baseRate: 1000,
        hourlyRate: 1500
      };

      const result = validateTakaPricing(invalidPricing);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('PRC005');
    });

    it('should reject inconsistent min/max charges', () => {
      const invalidPricing = {
        resourceType: 'beds',
        baseRate: 1500,
        minimumCharge: 2000,
        maximumCharge: 1000
      };

      const result = validateTakaPricing(invalidPricing);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('PRC005');
    });

    it('should warn about rates too high', () => {
      const highPricing = {
        resourceType: 'beds',
        baseRate: 10000 // Very high for beds
      };

      const result = validateTakaPricing(highPricing);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('PRC003');
    });

    it('should warn about rates too low', () => {
      const lowPricing = {
        resourceType: 'icu',
        baseRate: 500 // Very low for ICU
      };

      const result = validateTakaPricing(lowPricing);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('PRC004');
    });
  });

  describe('validateTakaAmount', () => {
    it('should validate positive amounts', () => {
      const result = validateTakaAmount(1000);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedAmount).toBe(1000);
    });

    it('should validate string amounts', () => {
      const result = validateTakaAmount('1000.50');

      expect(result.isValid).toBe(true);
      expect(result.sanitizedAmount).toBe(1000.50);
    });

    it('should validate amounts with Taka symbol', () => {
      const result = validateTakaAmount('৳1000.50');

      expect(result.isValid).toBe(true);
      expect(result.sanitizedAmount).toBe(1000.50);
    });

    it('should reject empty required amounts', () => {
      const result = validateTakaAmount('', { required: true });

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('BK008');
    });

    it('should allow empty non-required amounts', () => {
      const result = validateTakaAmount('', { required: false });

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid string amounts', () => {
      const result = validateTakaAmount('invalid');

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('FIN003');
    });

    it('should reject negative amounts', () => {
      const result = validateTakaAmount(-100);

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('PRC002');
    });

    it('should respect minimum amount', () => {
      const result = validateTakaAmount(5, { minAmount: 10 });

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('BK008');
    });

    it('should respect maximum amount', () => {
      const result = validateTakaAmount(1500, { maxAmount: 1000 });

      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe('BK008');
    });

    it('should round to proper precision', () => {
      const result = validateTakaAmount(1000.999);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedAmount).toBe(1001.00);
    });
  });

  describe('handleApiError', () => {
    it('should handle network errors', () => {
      const networkError = { message: 'Network Error' };
      const formatted = handleApiError(networkError, 'en');

      expect(formatted.title).toBe('Network Error');
      expect(formatted.message).toBe('Network error. Please try again.');
      expect(formatted.type).toBe('network');
      expect(formatted.retryable).toBe(true);
      expect(formatted.code).toBe('BK006');
    });

    it('should handle 400 Bad Request', () => {
      const badRequestError = {
        response: {
          status: 400,
          data: {}
        }
      };
      const formatted = handleApiError(badRequestError, 'en');

      expect(formatted.title).toBe('Invalid Request');
      expect(formatted.type).toBe('validation');
    });

    it('should handle 401 Unauthorized', () => {
      const unauthorizedError = {
        response: {
          status: 401,
          data: {}
        }
      };
      const formatted = handleApiError(unauthorizedError, 'en');

      expect(formatted.title).toBe('Unauthorized');
      expect(formatted.message).toContain('session has expired');
    });

    it('should handle 500 Server Error', () => {
      const serverError = {
        response: {
          status: 500,
          data: {}
        }
      };
      const formatted = handleApiError(serverError, 'en');

      expect(formatted.title).toBe('Server Error');
      expect(formatted.retryable).toBe(true);
    });

    it('should handle structured API error responses', () => {
      const structuredError = {
        response: {
          status: 400,
          data: {
            success: false,
            error: {
              code: 'BK001',
              type: 'bkash',
              severity: 'validation',
              message: 'অবৈধ মোবাইল নম্বর',
              messageEn: 'Invalid mobile number',
              retryable: true,
              timestamp: '2024-01-01T00:00:00Z'
            }
          }
        }
      };
      const formatted = handleApiError(structuredError, 'en');

      expect(formatted.title).toBe('bKash Payment Error');
      expect(formatted.message).toBe('Invalid mobile number');
      expect(formatted.code).toBe('BK001');
    });
  });

  describe('createRetryFunction', () => {
    it('should retry failed functions', async () => {
      let attemptCount = 0;
      const mockFunction = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const retryFunction = createRetryFunction(mockFunction, 3, 100);
      const result = await retryFunction();

      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      const mockFunction = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      const retryFunction = createRetryFunction(mockFunction, 2, 100);

      await expect(retryFunction()).rejects.toThrow('Persistent failure');
      expect(mockFunction).toHaveBeenCalledTimes(2);
    });

    it('should succeed on first attempt', async () => {
      const mockFunction = jest.fn().mockResolvedValue('immediate success');

      const retryFunction = createRetryFunction(mockFunction, 3, 100);
      const result = await retryFunction();

      expect(result).toBe('immediate success');
      expect(mockFunction).toHaveBeenCalledTimes(1);
    });
  });
});