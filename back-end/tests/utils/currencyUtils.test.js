const CurrencyUtils = require('../../utils/currencyUtils');

describe('CurrencyUtils', () => {
  describe('formatTaka', () => {
    test('should format basic amount correctly', () => {
      expect(CurrencyUtils.formatTaka(1000)).toBe('৳1,000.00');
      expect(CurrencyUtils.formatTaka(1000.50)).toBe('৳1,000.50');
      expect(CurrencyUtils.formatTaka(0)).toBe('৳0.00');
    });

    test('should format large amounts with proper separators', () => {
      expect(CurrencyUtils.formatTaka(100000)).toBe('৳100,000.00');
      expect(CurrencyUtils.formatTaka(1000000)).toBe('৳1,000,000.00');
    });

    test('should handle null and undefined values', () => {
      expect(CurrencyUtils.formatTaka(null)).toBe('৳0.00');
      expect(CurrencyUtils.formatTaka(undefined)).toBe('৳0.00');
      expect(CurrencyUtils.formatTaka(NaN)).toBe('৳0.00');
    });

    test('should respect showSymbol option', () => {
      expect(CurrencyUtils.formatTaka(1000, { showSymbol: false })).toBe('1,000.00');
      expect(CurrencyUtils.formatTaka(1000, { showSymbol: true })).toBe('৳1,000.00');
    });

    test('should respect decimalPlaces option', () => {
      expect(CurrencyUtils.formatTaka(1000.555, { decimalPlaces: 0 })).toBe('৳1,001');
      expect(CurrencyUtils.formatTaka(1000.555, { decimalPlaces: 1 })).toBe('৳1,000.6');
      expect(CurrencyUtils.formatTaka(1000.555, { decimalPlaces: 3 })).toBe('৳1,000.555');
    });
  });

  describe('parseTaka', () => {
    test('should parse formatted Taka strings', () => {
      expect(CurrencyUtils.parseTaka('৳1,000.00')).toBe(1000);
      expect(CurrencyUtils.parseTaka('1,000.50')).toBe(1000.50);
      expect(CurrencyUtils.parseTaka('৳100,000')).toBe(100000);
    });

    test('should handle plain numbers', () => {
      expect(CurrencyUtils.parseTaka('1000')).toBe(1000);
      expect(CurrencyUtils.parseTaka('1000.50')).toBe(1000.50);
    });

    test('should handle empty and invalid inputs', () => {
      expect(CurrencyUtils.parseTaka('')).toBe(0);
      expect(CurrencyUtils.parseTaka(null)).toBe(0);
      expect(CurrencyUtils.parseTaka(undefined)).toBe(0);
      expect(CurrencyUtils.parseTaka('invalid')).toBe(0);
    });

    test('should handle numeric inputs', () => {
      expect(CurrencyUtils.parseTaka(1000)).toBe(1000);
      expect(CurrencyUtils.parseTaka(1000.50)).toBe(1000.50);
    });
  });

  describe('isValidTakaAmount', () => {
    test('should validate positive amounts', () => {
      expect(CurrencyUtils.isValidTakaAmount(1000)).toBe(true);
      expect(CurrencyUtils.isValidTakaAmount(0.01)).toBe(true);
      expect(CurrencyUtils.isValidTakaAmount('1000.50')).toBe(true);
    });

    test('should reject negative amounts', () => {
      expect(CurrencyUtils.isValidTakaAmount(-100)).toBe(false);
      expect(CurrencyUtils.isValidTakaAmount('-100')).toBe(false);
    });

    test('should reject invalid amounts', () => {
      expect(CurrencyUtils.isValidTakaAmount(NaN)).toBe(false);
      expect(CurrencyUtils.isValidTakaAmount('invalid')).toBe(false);
      expect(CurrencyUtils.isValidTakaAmount(null)).toBe(false);
    });

    test('should respect min/max amount options', () => {
      expect(CurrencyUtils.isValidTakaAmount(50, { minAmount: 100 })).toBe(false);
      expect(CurrencyUtils.isValidTakaAmount(150, { minAmount: 100 })).toBe(true);
      expect(CurrencyUtils.isValidTakaAmount(1500, { maxAmount: 1000 })).toBe(false);
      expect(CurrencyUtils.isValidTakaAmount(500, { maxAmount: 1000 })).toBe(true);
    });
  });

  describe('roundTaka', () => {
    test('should round to 2 decimal places', () => {
      expect(CurrencyUtils.roundTaka(1000.555)).toBe(1000.56);
      expect(CurrencyUtils.roundTaka(1000.554)).toBe(1000.55);
      expect(CurrencyUtils.roundTaka(1000.999)).toBe(1001.00);
    });

    test('should handle string inputs', () => {
      expect(CurrencyUtils.roundTaka('1000.555')).toBe(1000.56);
      expect(CurrencyUtils.roundTaka('1000')).toBe(1000.00);
    });
  });

  describe('toPaisa and fromPaisa', () => {
    test('should convert Taka to paisa correctly', () => {
      expect(CurrencyUtils.toPaisa(10.50)).toBe(1050);
      expect(CurrencyUtils.toPaisa(1)).toBe(100);
      expect(CurrencyUtils.toPaisa(0.01)).toBe(1);
    });

    test('should convert paisa to Taka correctly', () => {
      expect(CurrencyUtils.fromPaisa(1050)).toBe(10.50);
      expect(CurrencyUtils.fromPaisa(100)).toBe(1.00);
      expect(CurrencyUtils.fromPaisa(1)).toBe(0.01);
    });

    test('should handle round-trip conversion', () => {
      const original = 123.45;
      const paisa = CurrencyUtils.toPaisa(original);
      const converted = CurrencyUtils.fromPaisa(paisa);
      expect(converted).toBe(original);
    });
  });

  describe('formatForDisplay', () => {
    test('should format for different contexts', () => {
      const amount = 1000.50;
      
      expect(CurrencyUtils.formatForDisplay(amount, 'receipt')).toBe('৳1,000.50');
      expect(CurrencyUtils.formatForDisplay(amount, 'dashboard')).toBe('৳1,001');
      expect(CurrencyUtils.formatForDisplay(amount, 'input')).toBe('1,000.50');
      expect(CurrencyUtils.formatForDisplay(amount, 'api')).toBe('1,000.50');
      expect(CurrencyUtils.formatForDisplay(amount, 'default')).toBe('৳1,000.50');
    });

    test('should handle unknown context', () => {
      expect(CurrencyUtils.formatForDisplay(1000, 'unknown')).toBe('৳1,000.00');
    });
  });

  describe('calculatePercentage', () => {
    test('should calculate percentage correctly', () => {
      expect(CurrencyUtils.calculatePercentage(1000, 5)).toBe(50.00);
      expect(CurrencyUtils.calculatePercentage(1000, 10.5)).toBe(105.00);
      expect(CurrencyUtils.calculatePercentage('1000', 5)).toBe(50.00);
    });

    test('should handle zero and negative percentages', () => {
      expect(CurrencyUtils.calculatePercentage(1000, 0)).toBe(0.00);
      expect(CurrencyUtils.calculatePercentage(1000, -5)).toBe(-50.00);
    });
  });

  describe('addAmounts', () => {
    test('should add multiple amounts correctly', () => {
      expect(CurrencyUtils.addAmounts(100, 200, 300)).toBe(600.00);
      expect(CurrencyUtils.addAmounts(100.50, 200.25, 300.75)).toBe(601.50);
    });

    test('should handle string amounts', () => {
      expect(CurrencyUtils.addAmounts('100', '200', '300')).toBe(600.00);
      expect(CurrencyUtils.addAmounts('৳100.50', '৳200.25')).toBe(300.75);
    });

    test('should handle invalid amounts', () => {
      expect(CurrencyUtils.addAmounts(100, 'invalid', 200)).toBe(300.00);
      expect(CurrencyUtils.addAmounts(100, null, 200)).toBe(300.00);
    });
  });

  describe('subtractAmounts', () => {
    test('should subtract amounts correctly', () => {
      expect(CurrencyUtils.subtractAmounts(1000, 300)).toBe(700.00);
      expect(CurrencyUtils.subtractAmounts(1000.75, 300.25)).toBe(700.50);
    });

    test('should handle string amounts', () => {
      expect(CurrencyUtils.subtractAmounts('1000', '300')).toBe(700.00);
      expect(CurrencyUtils.subtractAmounts('৳1000.50', '৳300.25')).toBe(700.25);
    });

    test('should handle negative results', () => {
      expect(CurrencyUtils.subtractAmounts(300, 1000)).toBe(-700.00);
    });
  });

  describe('compareAmounts', () => {
    test('should compare amounts correctly', () => {
      expect(CurrencyUtils.compareAmounts(1000, 500)).toBe(1);
      expect(CurrencyUtils.compareAmounts(500, 1000)).toBe(-1);
      expect(CurrencyUtils.compareAmounts(1000, 1000)).toBe(0);
    });

    test('should handle string amounts', () => {
      expect(CurrencyUtils.compareAmounts('1000', '500')).toBe(1);
      expect(CurrencyUtils.compareAmounts('৳500', '৳1000')).toBe(-1);
    });
  });

  describe('areAmountsEqual', () => {
    test('should check equality with default tolerance', () => {
      expect(CurrencyUtils.areAmountsEqual(1000, 1000)).toBe(true);
      expect(CurrencyUtils.areAmountsEqual(1000, 1000.005)).toBe(true);
      expect(CurrencyUtils.areAmountsEqual(1000, 1000.02)).toBe(false);
    });

    test('should respect custom tolerance', () => {
      expect(CurrencyUtils.areAmountsEqual(1000, 1000.05, 0.1)).toBe(true);
      expect(CurrencyUtils.areAmountsEqual(1000, 1000.15, 0.1)).toBe(false);
    });

    test('should handle string amounts', () => {
      expect(CurrencyUtils.areAmountsEqual('1000', '1000.005')).toBe(true);
      expect(CurrencyUtils.areAmountsEqual('৳1000', '৳1000.005')).toBe(true);
    });
  });

  describe('amountInWords', () => {
    test('should convert to Bengali words', () => {
      expect(CurrencyUtils.amountInWords(0, 'bn')).toBe('শূন্য টাকা');
      expect(CurrencyUtils.amountInWords(100, 'bn')).toBe('100 টাকা');
      expect(CurrencyUtils.amountInWords(100.50, 'bn')).toBe('100 টাকা 50 পয়সা');
    });

    test('should convert to English words', () => {
      expect(CurrencyUtils.amountInWords(0, 'en')).toBe('Zero Taka');
      expect(CurrencyUtils.amountInWords(100, 'en')).toBe('100 Taka');
      expect(CurrencyUtils.amountInWords(100.50, 'en')).toBe('100 Taka 50 Paisa');
    });

    test('should default to Bengali', () => {
      expect(CurrencyUtils.amountInWords(100)).toBe('100 টাকা');
    });
  });

  describe('validateCurrencyFormat', () => {
    test('should validate correct formats', () => {
      expect(CurrencyUtils.validateCurrencyFormat('1000')).toBe(true);
      expect(CurrencyUtils.validateCurrencyFormat('1,000')).toBe(true);
      expect(CurrencyUtils.validateCurrencyFormat('৳1000')).toBe(true);
      expect(CurrencyUtils.validateCurrencyFormat('৳1,000')).toBe(true);
      expect(CurrencyUtils.validateCurrencyFormat('1000.50')).toBe(true);
      expect(CurrencyUtils.validateCurrencyFormat('৳1,000.50')).toBe(true);
    });

    test('should reject incorrect formats', () => {
      expect(CurrencyUtils.validateCurrencyFormat('1,00')).toBe(false);
      expect(CurrencyUtils.validateCurrencyFormat('1000.555')).toBe(false);
      expect(CurrencyUtils.validateCurrencyFormat('invalid')).toBe(false);
      expect(CurrencyUtils.validateCurrencyFormat('1000.')).toBe(false);
    });
  });

  describe('Currency metadata', () => {
    test('should return correct currency symbol', () => {
      expect(CurrencyUtils.getCurrencySymbol()).toBe('৳');
    });

    test('should return correct currency code', () => {
      expect(CurrencyUtils.getCurrencyCode()).toBe('BDT');
    });

    test('should return correct currency name', () => {
      expect(CurrencyUtils.getCurrencyName('bn')).toBe('বাংলাদেশী টাকা');
      expect(CurrencyUtils.getCurrencyName('en')).toBe('Bangladeshi Taka');
    });
  });
});