/**
 * Unit tests for Taka currency utilities
 */
import {
  formatTaka,
  formatTakaWithOptions,
  parseTakaInput,
  validateTakaAmount,
  createTakaAmount,
  calculateTakaPercentage,
  addTakaAmounts,
  subtractTakaAmounts,
  formatTakaForInput,
  getTakaCurrencyInfo
} from '../currency';

describe('Currency Utilities', () => {
  describe('formatTaka', () => {
    it('should format positive amounts correctly', () => {
      expect(formatTaka(1000)).toBe('৳1,000.00');
      expect(formatTaka(1234.56)).toBe('৳1,234.56');
      expect(formatTaka(100000)).toBe('৳100,000.00');
    });

    it('should format zero correctly', () => {
      expect(formatTaka(0)).toBe('৳0.00');
    });

    it('should handle negative amounts', () => {
      expect(formatTaka(-500)).toBe('৳-500.00');
    });

    it('should handle invalid inputs', () => {
      expect(formatTaka(NaN)).toBe('৳0.00');
      expect(formatTaka(null as any)).toBe('৳0.00');
      expect(formatTaka(undefined as any)).toBe('৳0.00');
    });

    it('should format large amounts with proper separators', () => {
      expect(formatTaka(1000000)).toBe('৳1,000,000.00');
      expect(formatTaka(12345678.90)).toBe('৳12,345,678.90');
    });
  });

  describe('formatTakaWithOptions', () => {
    it('should respect showSymbol option', () => {
      expect(formatTakaWithOptions(1000, { showSymbol: false })).toBe('1,000.00');
      expect(formatTakaWithOptions(1000, { showSymbol: true })).toBe('৳1,000.00');
    });

    it('should respect decimalPlaces option', () => {
      expect(formatTakaWithOptions(1000, { decimalPlaces: 0 })).toBe('৳1,000');
      expect(formatTakaWithOptions(1000.456, { decimalPlaces: 3 })).toBe('৳1,000.456');
    });

    it('should respect showZero option', () => {
      expect(formatTakaWithOptions(0, { showZero: false })).toBe('');
      expect(formatTakaWithOptions(0, { showZero: true })).toBe('৳0.00');
    });
  });

  describe('parseTakaInput', () => {
    it('should parse clean numeric strings', () => {
      expect(parseTakaInput('1000')).toBe(1000);
      expect(parseTakaInput('1234.56')).toBe(1234.56);
    });

    it('should parse strings with Taka symbol', () => {
      expect(parseTakaInput('৳1000')).toBe(1000);
      expect(parseTakaInput('৳1,234.56')).toBe(1234.56);
    });

    it('should parse strings with commas', () => {
      expect(parseTakaInput('1,000')).toBe(1000);
      expect(parseTakaInput('100,000.50')).toBe(100000.50);
    });

    it('should handle invalid inputs', () => {
      expect(parseTakaInput('')).toBe(0);
      expect(parseTakaInput('abc')).toBe(0);
      expect(parseTakaInput(null as any)).toBe(0);
      expect(parseTakaInput(undefined as any)).toBe(0);
    });

    it('should handle mixed format strings', () => {
      expect(parseTakaInput('৳ 1,000.00')).toBe(1000);
      expect(parseTakaInput(' ৳1,234.56 ')).toBe(1234.56);
    });
  });

  describe('validateTakaAmount', () => {
    it('should validate positive amounts', () => {
      const result = validateTakaAmount(1000);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(1000);
    });

    it('should validate string inputs', () => {
      const result = validateTakaAmount('৳1,000.00');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(1000);
    });

    it('should reject negative amounts by default', () => {
      const result = validateTakaAmount(-500);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount cannot be negative');
    });

    it('should allow negative amounts when specified', () => {
      const result = validateTakaAmount(-500, { allowNegative: true });
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(-500);
    });

    it('should reject zero when not allowed', () => {
      const result = validateTakaAmount(0, { allowZero: false });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount cannot be zero');
    });

    it('should validate minimum amounts', () => {
      const result = validateTakaAmount(50, { min: 100 });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount must be at least ৳100.00');
    });

    it('should validate maximum amounts', () => {
      const result = validateTakaAmount(2000, { max: 1000 });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount cannot exceed ৳1,000.00');
    });

    it('should handle invalid input types', () => {
      const result = validateTakaAmount({} as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid input type');
    });
  });

  describe('createTakaAmount', () => {
    it('should create TakaAmount object', () => {
      const amount = createTakaAmount(1000);
      expect(amount.value).toBe(1000);
      expect(amount.formatted).toBe('৳1,000.00');
      expect(amount.symbol).toBe('৳');
    });
  });

  describe('calculateTakaPercentage', () => {
    it('should calculate percentages correctly', () => {
      expect(calculateTakaPercentage(1000, 10)).toBe(100);
      expect(calculateTakaPercentage(1500, 5)).toBe(75);
    });

    it('should handle invalid inputs', () => {
      expect(calculateTakaPercentage(NaN, 10)).toBe(0);
      expect(calculateTakaPercentage(1000, NaN)).toBe(0);
    });
  });

  describe('addTakaAmounts', () => {
    it('should add amounts correctly', () => {
      expect(addTakaAmounts(1000, 500)).toBe(1500);
      expect(addTakaAmounts(1234.56, 765.44)).toBe(2000);
    });

    it('should handle floating point precision', () => {
      expect(addTakaAmounts(0.1, 0.2)).toBe(0.3);
    });

    it('should handle invalid inputs', () => {
      expect(addTakaAmounts(NaN, 500)).toBe(500);
      expect(addTakaAmounts(1000, NaN)).toBe(1000);
    });
  });

  describe('subtractTakaAmounts', () => {
    it('should subtract amounts correctly', () => {
      expect(subtractTakaAmounts(1000, 300)).toBe(700);
      expect(subtractTakaAmounts(2000, 1234.56)).toBe(765.44);
    });

    it('should handle floating point precision', () => {
      expect(subtractTakaAmounts(0.3, 0.1)).toBe(0.2);
    });

    it('should handle invalid inputs', () => {
      expect(subtractTakaAmounts(NaN, 500)).toBe(-500);
      expect(subtractTakaAmounts(1000, NaN)).toBe(1000);
    });
  });

  describe('formatTakaForInput', () => {
    it('should format for input fields', () => {
      expect(formatTakaForInput(1000)).toBe('1000');
      expect(formatTakaForInput(1234.56)).toBe('1234.56');
    });

    it('should handle zero and invalid inputs', () => {
      expect(formatTakaForInput(0)).toBe('');
      expect(formatTakaForInput(NaN)).toBe('');
    });
  });

  describe('getTakaCurrencyInfo', () => {
    it('should return correct currency info', () => {
      const info = getTakaCurrencyInfo();
      expect(info.symbol).toBe('৳');
      expect(info.code).toBe('BDT');
      expect(info.name).toBe('Bangladeshi Taka');
      expect(info.locale).toBe('en-BD');
      expect(info.decimalPlaces).toBe(2);
    });
  });
});