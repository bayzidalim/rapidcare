const PricingManagementService = require('../../services/pricingManagementService');
const HospitalPricing = require('../../models/HospitalPricing');
const Hospital = require('../../models/Hospital');
const db = require('../../config/database');

describe('PricingManagementService', () => {
  beforeEach(() => {
    // Clean up test data
    db.exec('DELETE FROM hospital_pricing WHERE hospitalId = 999');
  });

  afterAll(() => {
    // Clean up test data
    db.exec('DELETE FROM hospital_pricing WHERE hospitalId = 999');
  });

  describe('validatePricingData', () => {
    test('should validate correct pricing data', () => {
      const validPricingData = {
        resourceType: 'beds',
        baseRate: 150.00,
        hourlyRate: 25.00,
        minimumCharge: 100.00,
        maximumCharge: 500.00
      };

      const validation = PricingManagementService.validatePricingData(validPricingData);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject invalid pricing data', () => {
      const invalidPricingData = {
        resourceType: 'invalid',
        baseRate: -50.00
      };

      const validation = PricingManagementService.validatePricingData(invalidPricingData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('applyDemandMultiplier', () => {
    test('should apply discount for low demand', () => {
      const basePrice = 100.00;
      const lowDemandFactor = 0.7;
      
      const adjustedPrice = PricingManagementService.applyDemandMultiplier(basePrice, lowDemandFactor);
      
      expect(adjustedPrice).toBeLessThan(basePrice);
      expect(adjustedPrice).toBe(80.00); // Should cap at 0.8 multiplier
    });

    test('should apply premium for high demand', () => {
      const basePrice = 100.00;
      const highDemandFactor = 1.8;
      
      const adjustedPrice = PricingManagementService.applyDemandMultiplier(basePrice, highDemandFactor);
      
      expect(adjustedPrice).toBeGreaterThan(basePrice);
      expect(adjustedPrice).toBe(150.00); // Should cap at 1.5 multiplier
    });

    test('should not change price for normal demand', () => {
      const basePrice = 100.00;
      const normalDemandFactor = 1.0;
      
      const adjustedPrice = PricingManagementService.applyDemandMultiplier(basePrice, normalDemandFactor);
      
      expect(adjustedPrice).toBe(basePrice);
    });
  });

  describe('calculateMedian', () => {
    test('should calculate median for odd number of values', () => {
      const values = [1, 3, 5, 7, 9];
      const median = PricingManagementService.calculateMedian(values);
      
      expect(median).toBe(5);
    });

    test('should calculate median for even number of values', () => {
      const values = [1, 2, 3, 4];
      const median = PricingManagementService.calculateMedian(values);
      
      expect(median).toBe(2.5);
    });

    test('should handle single value', () => {
      const values = [42];
      const median = PricingManagementService.calculateMedian(values);
      
      expect(median).toBe(42);
    });

    test('should handle unsorted values', () => {
      const values = [9, 1, 5, 3, 7];
      const median = PricingManagementService.calculateMedian(values);
      
      expect(median).toBe(5);
    });
  });

  describe('getResourceTypes', () => {
    test('should return available resource types', () => {
      const resourceTypes = PricingManagementService.getResourceTypes();
      
      expect(Array.isArray(resourceTypes)).toBe(true);
      expect(resourceTypes).toContain('beds');
      expect(resourceTypes).toContain('icu');
      expect(resourceTypes).toContain('operationTheatres');
    });
  });

  describe('calculatePricingTrends', () => {
    test('should calculate trends from pricing history', () => {
      const pricingHistory = [
        {
          resourceType: 'beds',
          baseRate: 200.00,
          effectiveFrom: '2024-02-01T00:00:00Z'
        },
        {
          resourceType: 'beds',
          baseRate: 150.00,
          effectiveFrom: '2024-01-01T00:00:00Z'
        }
      ];

      const trends = PricingManagementService.calculatePricingTrends(pricingHistory);

      expect(trends).toHaveProperty('beds');
      expect(trends.beds.currentRate).toBe(200.00);
      expect(trends.beds.previousRate).toBe(150.00);
      expect(trends.beds.change).toBe(50.00);
      expect(trends.beds.trend).toBe('increasing');
    });

    test('should handle empty pricing history', () => {
      const pricingHistory = [];
      const trends = PricingManagementService.calculatePricingTrends(pricingHistory);
      
      expect(Object.keys(trends)).toHaveLength(0);
    });

    test('should handle single pricing record', () => {
      const pricingHistory = [
        {
          resourceType: 'beds',
          baseRate: 150.00,
          effectiveFrom: '2024-01-01T00:00:00Z'
        }
      ];

      const trends = PricingManagementService.calculatePricingTrends(pricingHistory);
      
      expect(trends).not.toHaveProperty('beds');
    });
  });

  describe('validatePricingConstraints', () => {
    test('should validate pricing constraints', () => {
      const pricingData = {
        resourceType: 'beds',
        baseRate: 150.00,
        hourlyRate: 25.00,
        minimumCharge: 100.00,
        maximumCharge: 500.00
      };

      const validation = PricingManagementService.validatePricingConstraints(pricingData);

      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');
      expect(validation).toHaveProperty('validatedAt');
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    test('should warn about high hourly rate', () => {
      const pricingData = {
        resourceType: 'beds',
        baseRate: 100.00,
        hourlyRate: 150.00, // Higher than base rate
        minimumCharge: 50.00,
        maximumCharge: 200.00
      };

      const validation = PricingManagementService.validatePricingConstraints(pricingData);

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some(w => w.includes('hourly rate'))).toBe(true);
    });

    test('should warn about large charge gap', () => {
      const pricingData = {
        resourceType: 'beds',
        baseRate: 150.00,
        minimumCharge: 10.00,
        maximumCharge: 1000.00 // 100x minimum
      };

      const validation = PricingManagementService.validatePricingConstraints(pricingData);

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some(w => w.includes('gap'))).toBe(true);
    });
  });

  describe('getPricingComparison', () => {
    test('should return pricing comparison structure', () => {
      const comparison = PricingManagementService.getPricingComparison('beds');

      expect(comparison).toHaveProperty('resourceType');
      expect(comparison).toHaveProperty('hospitals');
      expect(comparison).toHaveProperty('statistics');
      expect(comparison).toHaveProperty('generatedAt');
      expect(comparison.resourceType).toBe('beds');
      expect(Array.isArray(comparison.hospitals)).toBe(true);
    });

    test('should handle empty comparison results', () => {
      const comparison = PricingManagementService.getPricingComparison('nonexistent');

      expect(comparison.hospitals).toHaveLength(0);
      expect(comparison.statistics).toBeNull();
    });
  });

  describe('error handling', () => {
    test('should handle non-existent hospital gracefully', () => {
      expect(() => {
        PricingManagementService.getHospitalPricing(99999);
      }).toThrow('Hospital not found');
    });

    test('should handle invalid resource type', () => {
      expect(() => {
        PricingManagementService.calculateBookingAmount(1, 'invalid_resource', 24);
      }).toThrow();
    });
  });

  describe('bulkUpdatePricing', () => {
    test('should handle empty updates array', () => {
      expect(async () => {
        await PricingManagementService.bulkUpdatePricing(1, [], 1);
      }).not.toThrow();
    });
  });

  describe('analyzePricingVolumeImpact', () => {
    test('should return placeholder structure', () => {
      const impact = PricingManagementService.analyzePricingVolumeImpact(1);

      expect(impact).toHaveProperty('dataAvailable');
      expect(impact.dataAvailable).toBe(false);
      expect(impact).toHaveProperty('message');
    });
  });
});

module.exports = {};