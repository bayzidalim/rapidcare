const db = require('../config/database');

class HospitalPricing {
  static create(pricingData) {
    const stmt = db.prepare(`
      INSERT INTO hospital_pricing (
        hospitalId, resourceType, baseRate, hourlyRate, minimumCharge, maximumCharge,
        currency, effectiveFrom, effectiveTo, createdBy
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      pricingData.hospitalId,
      pricingData.resourceType,
      pricingData.baseRate,
      pricingData.hourlyRate || null,
      pricingData.minimumCharge || null,
      pricingData.maximumCharge || null,
      pricingData.currency || 'USD',
      pricingData.effectiveFrom || new Date().toISOString(),
      pricingData.effectiveTo || null,
      pricingData.createdBy
    );
    
    return this.findById(result.lastInsertRowid);
  }

  static findById(id) {
    const stmt = db.prepare(`
      SELECT hp.*, 
             h.name as hospitalName,
             u.name as createdByName
      FROM hospital_pricing hp
      LEFT JOIN hospitals h ON hp.hospitalId = h.id
      LEFT JOIN users u ON hp.createdBy = u.id
      WHERE hp.id = ?
    `);
    
    return stmt.get(id);
  }

  static findByHospitalId(hospitalId) {
    const stmt = db.prepare(`
      SELECT hp.*, 
             u.name as createdByName
      FROM hospital_pricing hp
      LEFT JOIN users u ON hp.createdBy = u.id
      WHERE hp.hospitalId = ? AND hp.isActive = 1
      ORDER BY hp.resourceType, hp.effectiveFrom DESC
    `);
    
    return stmt.all(hospitalId);
  }

  static getCurrentPricing(hospitalId, resourceType = null) {
    let query = `
      SELECT hp.*, 
             h.name as hospitalName,
             u.name as createdByName
      FROM hospital_pricing hp
      LEFT JOIN hospitals h ON hp.hospitalId = h.id
      LEFT JOIN users u ON hp.createdBy = u.id
      WHERE hp.hospitalId = ? 
        AND hp.isActive = 1 
        AND hp.effectiveFrom <= CURRENT_TIMESTAMP
        AND (hp.effectiveTo IS NULL OR hp.effectiveTo > CURRENT_TIMESTAMP)
    `;
    
    const params = [hospitalId];
    
    if (resourceType) {
      query += ' AND hp.resourceType = ?';
      params.push(resourceType);
    }
    
    query += ' ORDER BY hp.resourceType, hp.effectiveFrom DESC';
    
    const stmt = db.prepare(query);
    return resourceType ? stmt.get(...params) : stmt.all(...params);
  }

  static updatePricing(hospitalId, resourceType, pricingData, userId) {
    // First, deactivate current pricing
    const deactivateStmt = db.prepare(`
      UPDATE hospital_pricing 
      SET effectiveTo = CURRENT_TIMESTAMP, isActive = 0, updatedAt = CURRENT_TIMESTAMP
      WHERE hospitalId = ? AND resourceType = ? AND isActive = 1
    `);
    deactivateStmt.run(hospitalId, resourceType);

    // Then create new pricing record
    return this.create({
      hospitalId,
      resourceType,
      baseRate: pricingData.baseRate,
      hourlyRate: pricingData.hourlyRate,
      minimumCharge: pricingData.minimumCharge,
      maximumCharge: pricingData.maximumCharge,
      currency: pricingData.currency || 'USD',
      effectiveFrom: pricingData.effectiveFrom || new Date().toISOString(),
      effectiveTo: pricingData.effectiveTo,
      createdBy: userId
    });
  }

  static getPricingHistory(hospitalId, resourceType = null, limit = 10) {
    let query = `
      SELECT hp.*, 
             u.name as createdByName
      FROM hospital_pricing hp
      LEFT JOIN users u ON hp.createdBy = u.id
      WHERE hp.hospitalId = ?
    `;
    
    const params = [hospitalId];
    
    if (resourceType) {
      query += ' AND hp.resourceType = ?';
      params.push(resourceType);
    }
    
    query += ' ORDER BY hp.effectiveFrom DESC';
    
    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
    }
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  static calculateBookingAmount(hospitalId, resourceType, duration = 24) {
    const pricing = this.getCurrentPricing(hospitalId, resourceType);
    
    if (!pricing) {
      throw new Error(`No pricing found for ${resourceType} at hospital ${hospitalId}`);
    }

    let amount = pricing.baseRate;
    
    // Add hourly charges if applicable
    if (pricing.hourlyRate && duration > 24) {
      const extraHours = duration - 24;
      amount += (extraHours * pricing.hourlyRate);
    }
    
    // Apply minimum and maximum constraints
    if (pricing.minimumCharge && amount < pricing.minimumCharge) {
      amount = pricing.minimumCharge;
    }
    
    if (pricing.maximumCharge && amount > pricing.maximumCharge) {
      amount = pricing.maximumCharge;
    }
    
    return {
      baseRate: pricing.baseRate,
      hourlyRate: pricing.hourlyRate,
      duration,
      calculatedAmount: amount,
      minimumCharge: pricing.minimumCharge,
      maximumCharge: pricing.maximumCharge,
      currency: pricing.currency
    };
  }

  static validatePricingData(pricingData) {
    const errors = [];
    
    if (!pricingData.baseRate || pricingData.baseRate <= 0) {
      errors.push('Base rate must be a positive number');
    }
    
    if (pricingData.hourlyRate && pricingData.hourlyRate < 0) {
      errors.push('Hourly rate cannot be negative');
    }
    
    if (pricingData.minimumCharge && pricingData.minimumCharge < 0) {
      errors.push('Minimum charge cannot be negative');
    }
    
    if (pricingData.maximumCharge && pricingData.maximumCharge < 0) {
      errors.push('Maximum charge cannot be negative');
    }
    
    if (pricingData.minimumCharge && pricingData.maximumCharge && 
        pricingData.minimumCharge > pricingData.maximumCharge) {
      errors.push('Minimum charge cannot be greater than maximum charge');
    }
    
    if (!['beds', 'icu', 'operationTheatres'].includes(pricingData.resourceType)) {
      errors.push('Invalid resource type');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static getResourceTypes() {
    return ['beds', 'icu', 'operationTheatres'];
  }

  static getPricingComparison(resourceType, city = null) {
    let query = `
      SELECT 
        h.name as hospitalName,
        h.city,
        hp.baseRate,
        hp.hourlyRate,
        hp.minimumCharge,
        hp.maximumCharge,
        hp.currency
      FROM hospital_pricing hp
      JOIN hospitals h ON hp.hospitalId = h.id
      WHERE hp.resourceType = ? 
        AND hp.isActive = 1
        AND hp.effectiveFrom <= CURRENT_TIMESTAMP
        AND (hp.effectiveTo IS NULL OR hp.effectiveTo > CURRENT_TIMESTAMP)
        AND h.isActive = 1
    `;
    
    const params = [resourceType];
    
    if (city) {
      query += ' AND h.city = ?';
      params.push(city);
    }
    
    query += ' ORDER BY hp.baseRate ASC';
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  static delete(id) {
    const stmt = db.prepare('UPDATE hospital_pricing SET isActive = 0 WHERE id = ?');
    return stmt.run(id);
  }

  static count(options = {}) {
    let query = 'SELECT COUNT(*) as count FROM hospital_pricing WHERE isActive = 1';
    const params = [];
    
    if (options.where) {
      const conditions = [];
      Object.keys(options.where).forEach(key => {
        const value = options.where[key];
        if (typeof value === 'number' || typeof value === 'string' || value === null) {
          conditions.push(`${key} = ?`);
          params.push(value);
        }
      });
      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ');
      }
    }
    
    const stmt = db.prepare(query);
    const result = stmt.get(...params);
    return result.count;
  }
}

module.exports = HospitalPricing;