/**
 * Unit tests for currency conversion utilities
 */
import {
  convertCurrency,
  formatAmountForDisplay,
  parseAmountFromInput,
  calculatePercentageAmount,
  splitAmount,
  validateAmountRange,
  formatAmountBreakdown,
  getAmountDisplayHelpers
} from '../currency-conversion';

describe('Currency Conversion Utilities', () => {
  describe('convertCurrency', () => {
    it('should return same amount for same currency', () => {
      expect(convertCurrency(1000, { fromCurrency: 'BDT', toCurrency: 'BDT' })).toBe(1000);
    });

    it('should apply exchange rate for different currencies', () => {
      expect(convertCurrency(1000, { 
        fromCurrency: 'USD', 
        toCurrency: 'BDT', 
        exchangeRate: 110 
      })).toBe(110000);
    });

    it('should default to BDT currency', () => {
      expect(convertCurrency(1000)).toBe(1000);
    });
  });

  describe('formatAmountForDisplay', () => {
    it('should format for input context', () => {
      expect(formatAmountForDisplay(1000, 'input')).toBe('1000.00');
      expect(formatAmountForDisplay(0, 'input')).toBe('');
    });

    it('should format for display context', () => {
      expect(formatAmountForDisplay(1000, 'display')).toBe('৳1,000.00');
    });

    it('should format for compact context', () => {
      expect(formatAmountForDisplay(1500, 'compact')).toBe('৳1.5K');
      expect(formatAmountForDisplay(150000, 'compact')).toBe('৳1.5L');
      expect(formatAmountForDisplay(500, 'compact')).toBe('৳500.00');
    });

    it('should format for receipt context', () => {
      expect(formatAmountForDisplay(1000, 'receipt')).toBe('৳ 1,000.00');
      expect(formatAmountForDisplay(1000, 'receipt', { showSymbol: false })).toBe('1,000.00');
    });

    it('should handle invalid amounts', () => {
      expect(formatAmountForDisplay(NaN, 'display')).toBe('৳0.00');
      expect(formatAmountForDisplay(null as any, 'display')).toBe('৳0.00');
    });

    it('should respect precision option', () => {
      expect(formatAmountForDisplay(1000.456, 'receipt', { precision: 3 })).toBe('৳ 1,000.456');
    });
  });

  describe('parseAmountFromInput', () => {
    it('should parse user input', () => {
      expect(parseAmountFromInput('৳1,000.00', 'user-input')).toBe(1000);
      expect(parseAmountFromInput('1000', 'user-input')).toBe(1000);
    });

    it('should parse API responses', () => {
      expect(parseAmountFromInput('1000.50', 'api-response')).toBe(1000.50);
      expect(parseAmountFromInput('$1,000.50', 'api-response')).toBe(1000.50);
    });

    it('should parse calculation strings', () => {
      expect(parseAmountFromInput('1000.50', 'calculation')).toBe(1000.50);
    });

    it('should handle numeric inputs', () => {
      expect(parseAmountFromInput(1000)).toBe(1000);
      expect(parseAmountFromInput(NaN)).toBe(0);
    });

    it('should handle invalid inputs', () => {
      expect(parseAmountFromInput('')).toBe(0);
      expect(parseAmountFromInput(null as any)).toBe(0);
      expect(parseAmountFromInput('abc')).toBe(0);
    });
  });

  describe('calculatePercentageAmount', () => {
    it('should calculate percentages correctly', () => {
      expect(calculatePercentageAmount(1000, 10)).toBe(100);
      expect(calculatePercentageAmount(1500, 5)).toBe(75);
    });

    it('should handle different rounding modes', () => {
      expect(calculatePercentageAmount(1000, 10.556, 'up')).toBe(105.56);
      expect(calculatePercentageAmount(1000, 10.555, 'down')).toBe(105.55);
      expect(calculatePercentageAmount(1000, 10.556, 'nearest')).toBe(105.56);
    });

    it('should handle invalid inputs', () => {
      expect(calculatePercentageAmount(NaN, 10)).toBe(0);
      expect(calculatePercentageAmount(1000, NaN)).toBe(0);
    });
  });

  describe('splitAmount', () => {
    it('should split amount by percentages', () => {
      const splits = [
        { name: 'Service Charge', percentage: 5 },
        { name: 'Hospital Amount', percentage: 95 }
      ];
      const result = splitAmount(1000, splits);
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Service Charge');
      expect(result[0].amount).toBe(50);
      expect(result[1].name).toBe('Hospital Amount');
      expect(result[1].amount).toBe(950);
    });

    it('should handle fixed amounts', () => {
      const splits = [
        { name: 'Fixed Fee', percentage: 0, fixed: 100 },
        { name: 'Variable Fee', percentage: 10 }
      ];
      const result = splitAmount(1000, splits);
      
      expect(result[0].amount).toBe(100);
      expect(result[1].amount).toBe(100); // 10% of 1000
    });

    it('should handle zero and invalid amounts', () => {
      const splits = [{ name: 'Fee', percentage: 10 }];
      const result = splitAmount(0, splits);
      expect(result[0].amount).toBe(0);
    });
  });

  describe('validateAmountRange', () => {
    it('should validate booking amounts', () => {
      expect(validateAmountRange(500, 'booking').isValid).toBe(true);
      expect(validateAmountRange(50, 'booking').isValid).toBe(false);
      expect(validateAmountRange(50, 'booking').error).toContain('at least ৳100.00');
    });

    it('should validate payment amounts', () => {
      expect(validateAmountRange(10, 'payment').isValid).toBe(true);
      expect(validateAmountRange(0.5, 'payment').isValid).toBe(false);
    });

    it('should validate pricing amounts', () => {
      expect(validateAmountRange(100, 'pricing').isValid).toBe(true);
      expect(validateAmountRange(25, 'pricing').isValid).toBe(false);
      expect(validateAmountRange(200000, 'pricing').isValid).toBe(false);
    });

    it('should handle invalid amounts', () => {
      expect(validateAmountRange(NaN, 'booking').isValid).toBe(false);
      expect(validateAmountRange(NaN, 'booking').error).toBe('Invalid amount format');
    });

    it('should provide suggestions', () => {
      const result = validateAmountRange(50, 'booking');
      expect(result.suggestion).toContain('Minimum amount for booking');
    });
  });

  describe('formatAmountBreakdown', () => {
    it('should format breakdown correctly', () => {
      const breakdown = [
        { label: 'Base Amount', amount: 1000 },
        { label: 'Service Charge', amount: 50 },
        { label: 'Discount', amount: 100, type: 'discount' as const }
      ];
      
      const result = formatAmountBreakdown(breakdown);
      expect(result).toContain('Base Amount: +৳1,000.00');
      expect(result).toContain('Service Charge: +৳50.00');
      expect(result).toContain('Discount: -৳100.00');
      expect(result).toContain('Total: ৳950.00');
    });
  });

  describe('getAmountDisplayHelpers', () => {
    it('should provide helper functions', () => {
      const helpers = getAmountDisplayHelpers();
      
      expect(typeof helpers.formatForInput).toBe('function');
      expect(typeof helpers.formatForDisplay).toBe('function');
      expect(typeof helpers.formatCompact).toBe('function');
      expect(typeof helpers.parseUserInput).toBe('function');
      expect(typeof helpers.validateBookingAmount).toBe('function');
    });

    it('should format amounts correctly', () => {
      const helpers = getAmountDisplayHelpers();
      
      expect(helpers.formatForInput(1000)).toBe('1000.00');
      expect(helpers.formatForDisplay(1000)).toBe('৳1,000.00');
      expect(helpers.formatCompact(1500)).toBe('৳1.5K');
    });

    it('should validate amounts correctly', () => {
      const helpers = getAmountDisplayHelpers();
      
      expect(helpers.validateBookingAmount(500).isValid).toBe(true);
      expect(helpers.validateBookingAmount(50).isValid).toBe(false);
      expect(helpers.validatePaymentAmount(10).isValid).toBe(true);
    });

    it('should calculate service charges', () => {
      const helpers = getAmountDisplayHelpers();
      
      expect(helpers.calculateServiceCharge(1000)).toBe(50); // 5% default
      expect(helpers.calculateServiceCharge(1000, 10)).toBe(100); // 10% custom
    });

    it('should split revenue correctly', () => {
      const helpers = getAmountDisplayHelpers();
      const result = helpers.splitRevenue(1000, 5);
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Service Charge');
      expect(result[0].amount).toBe(50);
      expect(result[1].name).toBe('Hospital Amount');
      expect(result[1].amount).toBe(950);
    });
  });
});