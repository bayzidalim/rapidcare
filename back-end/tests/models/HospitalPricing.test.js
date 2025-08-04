const HospitalPricing = require('../../models/HospitalPricing');
const db = require('../../config/database');

describe('HospitalPricing Model', () => {
  beforeEach(() => {
    // Clean up test data
    db.exec('DELETE FROM hospital_pricing WHERE hospitalId = 999');
  });

  afterEach(() => {
    // Clean up test data
    db.exec('DELETE FROM hospital_pricing WHERE hospitalId = 999');
  });

  describe('create', () => {
    it('should create new pricing record', () => {
      const pricingData = {
        hospitalId: 999,
        resourceType: 'beds',
        baseRate: 150.00,
        hourlyRate: 25.00,
        minimumCharge: 100.00,
        maximumCharge: 500.00,
        createdBy: 1
      };

      const pricing = HospitalPricing.create(pricingData);

      expect(pricing).toBeDefined();
      expect(pricing.hospitalId).toBe(999);
      expect(pricing.resourceType).toBe('beds');
      expect(pricing.baseRate).toBe(150.00);
      expect(pricing.currency).toBe('USD');
    });

    it('should create pricing with default currency', () => {
      const pricingData = {
        hospitalId: 999,
        resourceType: 'icu',
        baseRate: 300.00,
        createdBy: 1
      };

      const pricing = HospitalPricing.create(pricingData);

      expect(pricing.currency).toBe('USD');
      expect(pricing.isActive).toBe(1);
    });
  });

  describe('getCurrentPricing', () => {
    it('should get current active pricing', () => {
      const pricingData = {
        hospitalId: 999,
        resourceType: 'operationTheatres',
        baseRate: 500.00,
        hourlyRate: 100.00,
        createdBy: 1
      };

      HospitalPricing.create(pricingData);
      const current = HospitalPricing.getCurrentPricing(999, 'operationTheatres');

      expect(current).toBeDefined();
      expect(current.resourceType).toBe('operationTheatres');
      expect(current.baseRate).toBe(500.00);
      expect(current.isActive).toBe(1);
    });

    it('should return all current pricing for hospital', () => {
      const pricingData = [
        { hospitalId: 999, resourceType: 'beds', baseRate: 150.00, createdBy: 1 },
        { hospitalId: 999, resourceType: 'icu', baseRate: 300.00, createdBy: 1 }
      ];

      pricingData.forEach(data => HospitalPricing.create(data));
      const allPricing = HospitalPricing.getCurrentPricing(999);

      expect(Array.isArray(allPricing)).toBe(true);
      expect(allPricing.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('calculateBookingAmount', () => {
    it('should calculate booking amount correctly', () => {
      const pricingData = {
        hospitalId: 999,
        resourceType: 'beds',
        baseRate: 150.00,
        hourlyRate: 25.00,
        minimumCharge: 100.00,
        maximumCharge: 500.00,
        createdBy: 1
      };

      HospitalPricing.create(pricingData);

      // Test basic calculation (24 hours)
      const calculation = HospitalPricing.calculateBookingAmount(999, 'beds', 24);
      expect(calculation.calculatedAmount).toBe(150.00);
      expect(calculation.baseRate).toBe(150.00);

      // Test with extra hours
      const calculationWithExtra = HospitalPricing.calculateBookingAmount(999, 'beds', 48);
      expect(calculationWithExtra.calculatedAmount).toBe(150.00 + (24 * 25.00)); // Base + 24 extra hours
    });

    it('should apply minimum charge constraint', () => {
      const pricingData = {
        hospitalId: 999,
        resourceType: 'beds',
        baseRate: 50.00,
        minimumCharge: 100.00,
        createdBy: 1
      };

      HospitalPricing.create(pricingData);
      const calculation = HospitalPricing.calculateBookingAmount(999, 'beds', 24);

      expect(calculation.calculatedAmount).toBe(100.00); // Should use minimum charge
    });

    it('should apply maximum charge constraint', () => {
      const pricingData = {
        hospitalId: 999,
        resourceType: 'beds',
        baseRate: 200.00,
        hourlyRate: 50.00,
        maximumCharge: 400.00,
        createdBy: 1
      };

      HospitalPricing.create(pricingData);
      const calculation = HospitalPricing.calculateBookingAmount(999, 'beds', 100); // Long duration

      expect(calculation.calculatedAmount).toBe(400.00); // Should use maximum charge
    });

    it('should throw error for non-existent pricing', () => {
      expect(() => {
        HospitalPricing.calculateBookingAmount(999, 'nonexistent', 24);
      }).toThrow();
    });
  });

  describe('updatePricing', () => {
    it('should update pricing by deactivating old and creating new', () => {
      // Create initial pricing
      const initialData = {
        hospitalId: 999,
        resourceType: 'beds',
        baseRate: 150.00,
        createdBy: 1
      };

      HospitalPricing.create(initialData);

      // Update pricing
      const updatedData = {
        baseRate: 200.00,
        hourlyRate: 30.00
      };

      const updated = HospitalPricing.updatePricing(999, 'beds', updatedData, 1);

      expect(updated.baseRate).toBe(200.00);
      expect(updated.hourlyRate).toBe(30.00);

      // Check that old pricing is deactivated
      const history = HospitalPricing.getPricingHistory(999, 'beds');
      expect(history.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('validatePricingData', () => {
    it('should validate correct pricing data', () => {
      const validData = {
        resourceType: 'beds',
        baseRate: 150.00,
        hourlyRate: 25.00,
        minimumCharge: 100.00,
        maximumCharge: 500.00
      };

      const validation = HospitalPricing.validatePricingData(validData);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid pricing data', () => {
      const invalidData = {
        resourceType: 'invalid',
        baseRate: -50.00,
        minimumCharge: 600.00,
        maximumCharge: 400.00
      };

      const validation = HospitalPricing.validatePricingData(invalidData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should reject negative rates', () => {
      const invalidData = {
        resourceType: 'beds',
        baseRate: -100.00
      };

      const validation = HospitalPricing.validatePricingData(invalidData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Base rate must be a positive number');
    });
  });

  describe('getPricingComparison', () => {
    it('should get pricing comparison for resource type', () => {
      // Create pricing for multiple hospitals
      const pricingData = [
        { hospitalId: 998, resourceType: 'beds', baseRate: 120.00, createdBy: 1 },
        { hospitalId: 999, resourceType: 'beds', baseRate: 150.00, createdBy: 1 }
      ];

      pricingData.forEach(data => HospitalPricing.create(data));

      const comparison = HospitalPricing.getPricingComparison('beds');

      expect(Array.isArray(comparison)).toBe(true);
      expect(comparison.length).toBeGreaterThanOrEqual(1);
    });
  });
});

module.exports = {};