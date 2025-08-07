const { expect } = require('chai');
const CurrencyUtils = require('../../utils/currencyUtils');

describe('CurrencyUtils - Taka Currency Handling', () => {
  describe('formatTaka', () => {
    it('should format basic amounts correctly', () => {
      expect(CurrencyUtils.formatTaka(1000)).to.equal('৳1,000.00');
      expect(CurrencyUtils.formatTaka(1000.50)).to.equal('৳1,000.50');
      expect(CurrencyUtils.formatTaka(0)).to.equal('৳0.00');
    });

    it('should format large amounts with proper separators', () => {
      expect(CurrencyUtils.formatTaka(100000)).to.equal('৳100,000.00');
      expect(CurrencyUtils.formatTaka(1000000)).to.equal('৳1,000,000.00');
    });

    it('should handle null and undefined values', () => {
      expect(CurrencyUtils.formatTaka(null)).to.equal('৳0.00');
      expect(CurrencyUtils.formatTaka(undefined)).to.equal('৳0.00');
      expect(CurrencyUtils.formatTaka(NaN)).to.equal('৳0.00');
    });

    it('should respect showSymbol option', () => {
      expect(CurrencyUtils.formatTaka(1000, { showSymbol: false })).to.equal('1,000.00');
      expect(CurrencyUtils.formatTaka(1000, { showSymbol: true })).to.equal('৳1,000.00');
    });

    it('should respect decimalPlaces option', () => {
      expect(CurrencyUtils.formatTaka(1000.555, { decimalPlaces: 0 })).to.equal('৳1,001');
      expect(CurrencyUtils.formatTaka(1000.555, { decimalPlaces: 1 })).to.equal('৳1,000.6');
    });
  });

  describe('parseTaka', () => {
    it('should parse formatted Taka strings', () => {
      expect(CurrencyUtils.parseTaka('৳1,000.00')).to.equal(1000);
      expect(CurrencyUtils.parseTaka('1,000.50')).to.equal(1000.50);
      expect(CurrencyUtils.parseTaka('৳100,000')).to.equal(100000);
    });

    it('should handle plain numbers', () => {
      expect(CurrencyUtils.parseTaka('1000')).to.equal(1000);
      expect(CurrencyUtils.parseTaka('1000.50')).to.equal(1000.50);
    });

    it('should handle empty and invalid inputs', () => {
      expect(CurrencyUtils.parseTaka('')).to.equal(0);
      expect(CurrencyUtils.parseTaka(null)).to.equal(0);
      expect(CurrencyUtils.parseTaka(undefined)).to.equal(0);
      expect(CurrencyUtils.parseTaka('invalid')).to.equal(0);
    });

    it('should handle numeric inputs', () => {
      expect(CurrencyUtils.parseTaka(1000)).to.equal(1000);
      expect(CurrencyUtils.parseTaka(1000.50)).to.equal(1000.50);
    });
  });

  describe('isValidTakaAmount', () => {
    it('should validate positive amounts', () => {
      expect(CurrencyUtils.isValidTakaAmount(1000)).to.be.true;
      expect(CurrencyUtils.isValidTakaAmount(0.01)).to.be.true;
      expect(CurrencyUtils.isValidTakaAmount('1000.50')).to.be.true;
    });

    it('should reject negative amounts', () => {
      expect(CurrencyUtils.isValidTakaAmount(-100)).to.be.false;
      expect(CurrencyUtils.isValidTakaAmount('-100')).to.be.false;
    });

    it('should reject invalid amounts', () => {
      expect(CurrencyUtils.isValidTakaAmount(NaN)).to.be.false;
      expect(CurrencyUtils.isValidTakaAmount('invalid')).to.be.false;
      expect(CurrencyUtils.isValidTakaAmount(null)).to.be.false;
    });

    it('should respect min/max amount options', () => {
      expect(CurrencyUtils.isValidTakaAmount(50, { minAmount: 100 })).to.be.false;
      expect(CurrencyUtils.isValidTakaAmount(150, { minAmount: 100 })).to.be.true;
      expect(CurrencyUtils.isValidTakaAmount(1500, { maxAmount: 1000 })).to.be.false;
      expect(CurrencyUtils.isValidTakaAmount(500, { maxAmount: 1000 })).to.be.true;
    });
  });

  describe('roundTaka', () => {
    it('should round to 2 decimal places', () => {
      expect(CurrencyUtils.roundTaka(1000.555)).to.equal(1000.56);
      expect(CurrencyUtils.roundTaka(1000.554)).to.equal(1000.55);
      expect(CurrencyUtils.roundTaka(1000.999)).to.equal(1001.00);
    });

    it('should handle string inputs', () => {
      expect(CurrencyUtils.roundTaka('1000.555')).to.equal(1000.56);
      expect(CurrencyUtils.roundTaka('1000')).to.equal(1000.00);
    });
  });

  describe('addAmounts', () => {
    it('should add multiple amounts correctly', () => {
      expect(CurrencyUtils.addAmounts(100, 200, 300)).to.equal(600.00);
      expect(CurrencyUtils.addAmounts(100.50, 200.25, 300.75)).to.equal(601.50);
    });

    it('should handle string amounts', () => {
      expect(CurrencyUtils.addAmounts('100', '200', '300')).to.equal(600.00);
      expect(CurrencyUtils.addAmounts('৳100.50', '৳200.25')).to.equal(300.75);
    });

    it('should handle invalid amounts', () => {
      expect(CurrencyUtils.addAmounts(100, 'invalid', 200)).to.equal(300.00);
      expect(CurrencyUtils.addAmounts(100, null, 200)).to.equal(300.00);
    });
  });

  describe('subtractAmounts', () => {
    it('should subtract amounts correctly', () => {
      expect(CurrencyUtils.subtractAmounts(1000, 300)).to.equal(700.00);
      expect(CurrencyUtils.subtractAmounts(1000.75, 300.25)).to.equal(700.50);
    });

    it('should handle string amounts', () => {
      expect(CurrencyUtils.subtractAmounts('1000', '300')).to.equal(700.00);
      expect(CurrencyUtils.subtractAmounts('৳1000.50', '৳300.25')).to.equal(700.25);
    });

    it('should handle negative results', () => {
      expect(CurrencyUtils.subtractAmounts(300, 1000)).to.equal(-700.00);
    });
  });

  describe('compareAmounts', () => {
    it('should compare amounts correctly', () => {
      expect(CurrencyUtils.compareAmounts(1000, 500)).to.equal(1);
      expect(CurrencyUtils.compareAmounts(500, 1000)).to.equal(-1);
      expect(CurrencyUtils.compareAmounts(1000, 1000)).to.equal(0);
    });

    it('should handle string amounts', () => {
      expect(CurrencyUtils.compareAmounts('1000', '500')).to.equal(1);
      expect(CurrencyUtils.compareAmounts('৳500', '৳1000')).to.equal(-1);
    });
  });

  describe('areAmountsEqual', () => {
    it('should check equality with default tolerance', () => {
      expect(CurrencyUtils.areAmountsEqual(1000, 1000)).to.be.true;
      expect(CurrencyUtils.areAmountsEqual(1000, 1000.005)).to.be.true;
      expect(CurrencyUtils.areAmountsEqual(1000, 1000.02)).to.be.false;
    });

    it('should respect custom tolerance', () => {
      expect(CurrencyUtils.areAmountsEqual(1000, 1000.05, 0.1)).to.be.true;
      expect(CurrencyUtils.areAmountsEqual(1000, 1000.15, 0.1)).to.be.false;
    });

    it('should handle string amounts', () => {
      expect(CurrencyUtils.areAmountsEqual('1000', '1000.005')).to.be.true;
      expect(CurrencyUtils.areAmountsEqual('৳1000', '৳1000.005')).to.be.true;
    });
  });

  describe('validateCurrencyFormat', () => {
    it('should validate correct formats', () => {
      expect(CurrencyUtils.validateCurrencyFormat('1000')).to.be.true;
      expect(CurrencyUtils.validateCurrencyFormat('1,000')).to.be.true;
      expect(CurrencyUtils.validateCurrencyFormat('৳1000')).to.be.true;
      expect(CurrencyUtils.validateCurrencyFormat('৳1,000')).to.be.true;
      expect(CurrencyUtils.validateCurrencyFormat('1000.50')).to.be.true;
      expect(CurrencyUtils.validateCurrencyFormat('৳1,000.50')).to.be.true;
    });

    it('should reject incorrect formats', () => {
      expect(CurrencyUtils.validateCurrencyFormat('1,00')).to.be.false;
      expect(CurrencyUtils.validateCurrencyFormat('1000.555')).to.be.false;
      expect(CurrencyUtils.validateCurrencyFormat('invalid')).to.be.false;
      expect(CurrencyUtils.validateCurrencyFormat('1000.')).to.be.false;
    });
  });

  describe('Currency metadata', () => {
    it('should return correct currency symbol', () => {
      expect(CurrencyUtils.getCurrencySymbol()).to.equal('৳');
    });

    it('should return correct currency code', () => {
      expect(CurrencyUtils.getCurrencyCode()).to.equal('BDT');
    });

    it('should return correct currency name', () => {
      expect(CurrencyUtils.getCurrencyName('bn')).to.equal('বাংলাদেশী টাকা');
      expect(CurrencyUtils.getCurrencyName('en')).to.equal('Bangladeshi Taka');
    });
  });
});