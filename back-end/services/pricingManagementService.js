const HospitalPricing = require('../models/HospitalPricing');
const Hospital = require('../models/Hospital');
const db = require('../config/database');

class PricingManagementService {
  /**
   * Update hospital pricing for a specific resource type
   */
  static updateHospitalPricing(hospitalId, pricingData, userId) {
    try {
      // Validate hospital exists
      const hospital = Hospital.findById(hospitalId);
      if (!hospital) {
        throw new Error('Hospital not found');
      }

      // Validate pricing data
      const validation = HospitalPricing.validatePricingData(pricingData);
      if (!validation.isValid) {
        throw new Error(`Pricing validation failed: ${validation.errors.join(', ')}`);
      }

      // Update pricing (this will deactivate old pricing and create new)
      const updatedPricing = HospitalPricing.updatePricing(
        hospitalId,
        pricingData.resourceType,
        pricingData,
        userId
      );

      return {
        success: true,
        pricing: updatedPricing,
        message: `Pricing updated successfully for ${pricingData.resourceType}`,
        updatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Pricing update error:', error);
      throw error;
    }
  }

  /**
   * Get current pricing for a hospital
   */
  static getHospitalPricing(hospitalId) {
    try {
      const hospital = Hospital.findById(hospitalId);
      if (!hospital) {
        throw new Error('Hospital not found');
      }

      const currentPricing = HospitalPricing.getCurrentPricing(hospitalId);
      
      // Organize pricing by resource type
      const pricingByResource = {};
      const resourceTypes = ['beds', 'icu', 'operationTheatres'];

      resourceTypes.forEach(resourceType => {
        const resourcePricing = currentPricing.find(p => p.resourceType === resourceType);
        pricingByResource[resourceType] = resourcePricing || null;
      });

      return {
        hospitalId,
        hospitalName: hospital.name,
        pricing: pricingByResource,
        lastUpdated: currentPricing.length > 0 ? 
          Math.max(...currentPricing.map(p => new Date(p.updatedAt).getTime())) : null
      };

    } catch (error) {
      console.error('Get pricing error:', error);
      throw error;
    }
  }

  /**
   * Calculate booking amount based on hospital pricing
   */
  static calculateBookingAmount(hospitalId, resourceType, duration = 24, options = {}) {
    try {
      const calculation = HospitalPricing.calculateBookingAmount(hospitalId, resourceType, duration);
      
      // Apply any additional options
      let finalAmount = calculation.calculatedAmount;
      
      // Apply discounts if specified
      if (options.discountPercentage && options.discountPercentage > 0) {
        const discount = finalAmount * (options.discountPercentage / 100);
        finalAmount = finalAmount - discount;
        calculation.discount = discount;
        calculation.discountPercentage = options.discountPercentage;
      }

      // Apply surcharges if specified
      if (options.surchargeAmount && options.surchargeAmount > 0) {
        finalAmount = finalAmount + options.surchargeAmount;
        calculation.surcharge = options.surchargeAmount;
      }

      calculation.finalAmount = finalAmount;
      calculation.calculatedAt = new Date().toISOString();

      return calculation;

    } catch (error) {
      console.error('Booking amount calculation error:', error);
      throw error;
    }
  }

  /**
   * Validate pricing data before update
   */
  static validatePricingData(pricingData) {
    return HospitalPricing.validatePricingData(pricingData);
  }

  /**
   * Get pricing history for a hospital
   */
  static getPricingHistory(hospitalId, resourceType = null, limit = 10) {
    try {
      const hospital = Hospital.findById(hospitalId);
      if (!hospital) {
        throw new Error('Hospital not found');
      }

      const history = HospitalPricing.getPricingHistory(hospitalId, resourceType, limit);

      return {
        hospitalId,
        hospitalName: hospital.name,
        resourceType,
        history,
        totalRecords: history.length
      };

    } catch (error) {
      console.error('Pricing history error:', error);
      throw error;
    }
  }

  /**
   * Apply dynamic pricing based on demand
   */
  static applyDynamicPricing(hospitalId, resourceType, demandFactor = 1.0) {
    try {
      const currentPricing = HospitalPricing.getCurrentPricing(hospitalId, resourceType);
      if (!currentPricing) {
        throw new Error(`No pricing found for ${resourceType} at hospital ${hospitalId}`);
      }

      // Calculate dynamic pricing based on demand
      const basePricing = {
        baseRate: currentPricing.baseRate,
        hourlyRate: currentPricing.hourlyRate,
        minimumCharge: currentPricing.minimumCharge,
        maximumCharge: currentPricing.maximumCharge
      };

      const dynamicPricing = {
        baseRate: this.applyDemandMultiplier(basePricing.baseRate, demandFactor),
        hourlyRate: basePricing.hourlyRate ? 
          this.applyDemandMultiplier(basePricing.hourlyRate, demandFactor) : null,
        minimumCharge: basePricing.minimumCharge,
        maximumCharge: basePricing.maximumCharge,
        demandFactor,
        originalPricing: basePricing,
        appliedAt: new Date().toISOString()
      };

      return dynamicPricing;

    } catch (error) {
      console.error('Dynamic pricing error:', error);
      throw error;
    }
  }

  /**
   * Apply demand multiplier to pricing
   */
  static applyDemandMultiplier(basePrice, demandFactor) {
    // Demand factor ranges:
    // 0.5 - 0.8: Low demand (discount)
    // 0.8 - 1.2: Normal demand (no change)
    // 1.2 - 2.0: High demand (premium)

    let multiplier = 1.0;

    if (demandFactor < 0.8) {
      // Low demand - apply discount (up to 20% off)
      multiplier = Math.max(0.8, demandFactor);
    } else if (demandFactor > 1.2) {
      // High demand - apply premium (up to 50% increase)
      multiplier = Math.min(1.5, demandFactor);
    }

    return Math.round(basePrice * multiplier * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get pricing comparison across hospitals
   */
  static getPricingComparison(resourceType, city = null, options = {}) {
    try {
      const comparison = HospitalPricing.getPricingComparison(resourceType, city);
      
      if (comparison.length === 0) {
        return {
          resourceType,
          city,
          hospitals: [],
          statistics: null
        };
      }

      // Calculate statistics
      const rates = comparison.map(h => h.baseRate);
      const statistics = {
        count: rates.length,
        average: rates.reduce((sum, rate) => sum + rate, 0) / rates.length,
        minimum: Math.min(...rates),
        maximum: Math.max(...rates),
        median: this.calculateMedian(rates)
      };

      // Sort by criteria
      const sortBy = options.sortBy || 'baseRate';
      const sortOrder = options.sortOrder || 'asc';
      
      comparison.sort((a, b) => {
        const aVal = a[sortBy] || 0;
        const bVal = b[sortBy] || 0;
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });

      return {
        resourceType,
        city,
        hospitals: comparison,
        statistics,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Pricing comparison error:', error);
      throw error;
    }
  }

  /**
   * Calculate median value
   */
  static calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 !== 0 
      ? sorted[mid] 
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Bulk update pricing for multiple resource types
   */
  static bulkUpdatePricing(hospitalId, pricingUpdates, userId) {
    const results = [];
    const errors = [];

    try {
      // Begin transaction for atomicity
      db.exec('BEGIN TRANSACTION');

      for (const update of pricingUpdates) {
        try {
          const result = this.updateHospitalPricing(hospitalId, update, userId);
          results.push({
            resourceType: update.resourceType,
            success: true,
            pricing: result.pricing
          });
        } catch (error) {
          errors.push({
            resourceType: update.resourceType,
            success: false,
            error: error.message
          });
        }
      }

      // If any errors occurred, rollback
      if (errors.length > 0) {
        db.exec('ROLLBACK');
        throw new Error(`Bulk update failed: ${errors.length} errors occurred`);
      }

      // Commit if all successful
      db.exec('COMMIT');

      return {
        success: true,
        results,
        totalUpdated: results.length,
        updatedAt: new Date().toISOString()
      };

    } catch (error) {
      db.exec('ROLLBACK');
      console.error('Bulk pricing update error:', error);
      throw error;
    }
  }

  /**
   * Get pricing recommendations based on market analysis
   */
  static getPricingRecommendations(hospitalId, resourceType) {
    try {
      const hospital = Hospital.findById(hospitalId);
      if (!hospital) {
        throw new Error('Hospital not found');
      }

      // Get current pricing
      const currentPricing = HospitalPricing.getCurrentPricing(hospitalId, resourceType);
      
      // Get market comparison
      const marketComparison = this.getPricingComparison(resourceType, hospital.city);
      
      if (!marketComparison.statistics || marketComparison.hospitals.length < 2) {
        return {
          hospitalId,
          resourceType,
          recommendations: [],
          message: 'Insufficient market data for recommendations'
        };
      }

      const recommendations = [];
      const currentRate = currentPricing ? currentPricing.baseRate : 0;
      const marketAverage = marketComparison.statistics.average;
      const marketMedian = marketComparison.statistics.median;

      // Price positioning recommendations
      if (currentRate > marketAverage * 1.2) {
        recommendations.push({
          type: 'price_reduction',
          priority: 'high',
          message: 'Your pricing is significantly above market average',
          suggestedRate: Math.round(marketAverage * 1.1 * 100) / 100,
          impact: 'May improve booking volume'
        });
      } else if (currentRate < marketAverage * 0.8) {
        recommendations.push({
          type: 'price_increase',
          priority: 'medium',
          message: 'Your pricing is below market average',
          suggestedRate: Math.round(marketMedian * 100) / 100,
          impact: 'Potential revenue increase opportunity'
        });
      }

      // Competitive positioning
      const competitorCount = marketComparison.hospitals.length;
      const position = marketComparison.hospitals.findIndex(h => h.hospitalName === hospital.name) + 1;
      
      if (position > 0) {
        recommendations.push({
          type: 'market_position',
          priority: 'info',
          message: `You rank #${position} out of ${competitorCount} hospitals in pricing`,
          suggestedAction: position > competitorCount / 2 ? 
            'Consider competitive pricing strategy' : 
            'Maintain competitive advantage'
        });
      }

      return {
        hospitalId,
        resourceType,
        currentPricing,
        marketAnalysis: marketComparison.statistics,
        recommendations,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Pricing recommendations error:', error);
      throw error;
    }
  }

  /**
   * Get resource types available for pricing
   */
  static getResourceTypes() {
    return HospitalPricing.getResourceTypes();
  }

  /**
   * Validate pricing constraints
   */
  static validatePricingConstraints(pricingData) {
    const errors = [];
    const warnings = [];

    // Business rule validations
    if (pricingData.baseRate && pricingData.hourlyRate) {
      if (pricingData.hourlyRate > pricingData.baseRate) {
        warnings.push('Hourly rate is higher than base rate - this may result in high costs for extended stays');
      }
    }

    if (pricingData.minimumCharge && pricingData.maximumCharge) {
      const ratio = pricingData.maximumCharge / pricingData.minimumCharge;
      if (ratio > 10) {
        warnings.push('Large gap between minimum and maximum charges may confuse patients');
      }
    }

    // Market-based validations (if market data available)
    try {
      const marketData = this.getPricingComparison(pricingData.resourceType);
      if (marketData.statistics) {
        const marketAverage = marketData.statistics.average;
        
        if (pricingData.baseRate > marketAverage * 2) {
          warnings.push('Pricing is significantly above market average');
        } else if (pricingData.baseRate < marketAverage * 0.5) {
          warnings.push('Pricing is significantly below market average');
        }
      }
    } catch (error) {
      // Market data not available - skip market validation
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      validatedAt: new Date().toISOString()
    };
  }

  /**
   * Get pricing analytics for a hospital
   */
  static getPricingAnalytics(hospitalId, dateRange = {}) {
    try {
      const hospital = Hospital.findById(hospitalId);
      if (!hospital) {
        throw new Error('Hospital not found');
      }

      // Get current pricing
      const currentPricing = HospitalPricing.getCurrentPricing(hospitalId);
      
      // Get pricing history
      const pricingHistory = HospitalPricing.getPricingHistory(hospitalId, null, 50);
      
      // Calculate pricing trends
      const trends = this.calculatePricingTrends(pricingHistory);
      
      // Get booking volume impact (if transaction data available)
      const volumeImpact = this.analyzePricingVolumeImpact(hospitalId, dateRange);

      return {
        hospitalId,
        hospitalName: hospital.name,
        currentPricing,
        pricingTrends: trends,
        volumeImpact,
        totalPricingChanges: pricingHistory.length,
        analyticsGeneratedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Pricing analytics error:', error);
      throw error;
    }
  }

  /**
   * Calculate pricing trends from history
   */
  static calculatePricingTrends(pricingHistory) {
    const trends = {};
    const resourceTypes = ['beds', 'icu', 'operationTheatres'];

    resourceTypes.forEach(resourceType => {
      const resourceHistory = pricingHistory.filter(p => p.resourceType === resourceType);
      
      if (resourceHistory.length >= 2) {
        const latest = resourceHistory[0];
        const previous = resourceHistory[1];
        
        const change = latest.baseRate - previous.baseRate;
        const changePercentage = (change / previous.baseRate) * 100;
        
        trends[resourceType] = {
          currentRate: latest.baseRate,
          previousRate: previous.baseRate,
          change,
          changePercentage: Math.round(changePercentage * 100) / 100,
          trend: change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable',
          lastChanged: latest.effectiveFrom
        };
      }
    });

    return trends;
  }

  /**
   * Analyze pricing impact on booking volume
   */
  static analyzePricingVolumeImpact(hospitalId, dateRange = {}) {
    try {
      // This would require transaction/booking data analysis
      // For now, return a placeholder structure
      return {
        message: 'Volume impact analysis requires booking transaction data',
        dataAvailable: false,
        analysisDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Volume impact analysis error:', error);
      return {
        error: error.message,
        dataAvailable: false
      };
    }
  }
}

module.exports = PricingManagementService;