const db = require('../config/database');
const ResourceAuditLog = require('./ResourceAuditLog');

class Hospital {
  static create(hospitalData) {
    const stmt = db.prepare(`
      INSERT INTO hospitals (name, street, city, state, zipCode, country, phone, email, emergency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      hospitalData.name,
      hospitalData.street,
      hospitalData.city,
      hospitalData.state,
      hospitalData.zipCode,
      hospitalData.country,
      hospitalData.phone,
      hospitalData.email,
      hospitalData.emergency
    );
    
    return result.lastInsertRowid;
  }

  static findById(id) {
    const stmt = db.prepare('SELECT * FROM hospitals WHERE id = ?');
    return stmt.get(id);
  }

  static getAll() {
    const stmt = db.prepare('SELECT * FROM hospitals WHERE isActive = 1 ORDER BY name');
    return stmt.all();
  }

  static search(searchTerm) {
    const stmt = db.prepare(`
      SELECT * FROM hospitals 
      WHERE isActive = 1 
      AND (name LIKE ? OR city LIKE ? OR state LIKE ?)
      ORDER BY name
    `);
    const searchPattern = `%${searchTerm}%`;
    return stmt.all(searchPattern, searchPattern, searchPattern);
  }

  static update(id, updateData) {
    const stmt = db.prepare(`
      UPDATE hospitals 
      SET name = ?, street = ?, city = ?, state = ?, zipCode = ?, 
          country = ?, phone = ?, email = ?, emergency = ?, 
          lastUpdated = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    return stmt.run(
      updateData.name,
      updateData.street,
      updateData.city,
      updateData.state,
      updateData.zipCode,
      updateData.country,
      updateData.phone,
      updateData.email,
      updateData.emergency,
      id
    );
  }

  static delete(id) {
    const stmt = db.prepare('UPDATE hospitals SET isActive = 0 WHERE id = ?');
    return stmt.run(id);
  }

  static getWithResources() {
    const stmt = db.prepare(`
      SELECT h.*, 
             hr.resourceType,
             hr.total,
             hr.available,
             hr.occupied,
             hr.reserved,
             hr.maintenance,
             hr.lastUpdated
      FROM hospitals h
      LEFT JOIN hospital_resources hr ON h.id = hr.hospitalId
      WHERE h.isActive = 1 AND h.approval_status = 'approved'
      ORDER BY h.name, hr.resourceType
    `);
    const results = stmt.all();
    
    // Group resources by hospital
    const hospitalsMap = {};
    results.forEach(row => {
      if (!hospitalsMap[row.id]) {
        hospitalsMap[row.id] = {
          id: row.id,
          name: row.name,
          description: row.description,
          type: row.type,
          street: row.street,
          city: row.city,
          state: row.state,
          zipCode: row.zipCode,
          country: row.country,
          phone: row.phone,
          email: row.email,
          emergency: row.emergency,
          rating: row.rating,
          resources: {}
        };
      }
      
      if (row.resourceType) {
        hospitalsMap[row.id].resources[row.resourceType] = {
          total: row.total,
          available: row.available,
          occupied: row.occupied,
          reserved: row.reserved || 0,
          maintenance: row.maintenance || 0,
          lastUpdated: row.lastUpdated
        };
      }
    });
    
    return Object.values(hospitalsMap);
  }

  static getResources(hospitalId) {
    const stmt = db.prepare(`
      SELECT * FROM hospital_resources 
      WHERE hospitalId = ?
      ORDER BY resourceType
    `);
    return stmt.all(hospitalId);
  }

  static updateResources(hospitalId, resources, updatedBy = null) {
    const transaction = db.transaction(() => {
      // Get current resources for audit logging
      const currentResources = this.getResources(hospitalId);
      const currentResourceMap = {};
      currentResources.forEach(resource => {
        currentResourceMap[resource.resourceType] = resource;
      });

      // Delete existing resources
      const deleteStmt = db.prepare('DELETE FROM hospital_resources WHERE hospitalId = ?');
      deleteStmt.run(hospitalId);

      // Insert new resources and log changes
      const insertStmt = db.prepare(`
        INSERT INTO hospital_resources (
          hospitalId, resourceType, total, available, occupied, 
          reserved, maintenance, lastUpdated, updatedBy
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
      `);

      resources.forEach(resource => {
        insertStmt.run(
          hospitalId,
          resource.resourceType,
          resource.total,
          resource.available,
          resource.occupied,
          resource.reserved || 0,
          resource.maintenance || 0,
          updatedBy
        );

        // Log the change if there's a difference and updatedBy is provided
        if (updatedBy && currentResourceMap[resource.resourceType]) {
          const oldResource = currentResourceMap[resource.resourceType];
          if (oldResource.available !== resource.available) {
            ResourceAuditLog.logManualUpdate(
              hospitalId,
              resource.resourceType,
              oldResource.available,
              resource.available,
              updatedBy,
              'Resource quantity updated via hospital management'
            );
          }
        }
      });
    });

    transaction();
  }

  /**
   * Update a specific resource type for a hospital
   * @param {number} hospitalId - Hospital ID
   * @param {string} resourceType - Resource type (beds, icu, operationTheatres)
   * @param {Object} resourceData - Resource data
   * @param {number} updatedBy - User who made the update
   * @returns {boolean} Success status
   */
  static updateResourceType(hospitalId, resourceType, resourceData, updatedBy) {
    const transaction = db.transaction(() => {
      // Get current resource for audit logging
      const currentStmt = db.prepare(`
        SELECT * FROM hospital_resources 
        WHERE hospitalId = ? AND resourceType = ?
      `);
      const currentResource = currentStmt.get(hospitalId, resourceType);

      // Update or insert resource
      const upsertStmt = db.prepare(`
        INSERT OR REPLACE INTO hospital_resources (
          hospitalId, resourceType, total, available, occupied, 
          reserved, maintenance, lastUpdated, updatedBy
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
      `);

      upsertStmt.run(
        hospitalId,
        resourceType,
        resourceData.total,
        resourceData.available,
        resourceData.occupied || 0,
        resourceData.reserved || 0,
        resourceData.maintenance || 0,
        updatedBy
      );

      // Log the change
      if (currentResource && currentResource.available !== resourceData.available) {
        ResourceAuditLog.logManualUpdate(
          hospitalId,
          resourceType,
          currentResource.available,
          resourceData.available,
          updatedBy,
          'Individual resource type updated'
        );
      }
    });

    transaction();
    return true;
  }

  /**
   * Allocate resources for a booking
   * @param {number} hospitalId - Hospital ID
   * @param {string} resourceType - Resource type
   * @param {number} quantity - Quantity to allocate
   * @param {number} bookingId - Booking ID
   * @param {number} allocatedBy - User who allocated the resources
   * @returns {boolean} Success status
   */
  static allocateResources(hospitalId, resourceType, quantity, bookingId, allocatedBy) {
    const transaction = db.transaction(() => {
      // Get current resource
      const stmt = db.prepare(`
        SELECT * FROM hospital_resources 
        WHERE hospitalId = ? AND resourceType = ?
      `);
      const resource = stmt.get(hospitalId, resourceType);

      if (!resource || resource.available < quantity) {
        throw new Error('Insufficient resources available');
      }

      // Update resource quantities
      const updateStmt = db.prepare(`
        UPDATE hospital_resources 
        SET available = available - ?, 
            occupied = occupied + ?,
            lastUpdated = CURRENT_TIMESTAMP,
            updatedBy = ?
        WHERE hospitalId = ? AND resourceType = ?
      `);

      updateStmt.run(quantity, quantity, allocatedBy, hospitalId, resourceType);

      // Log the allocation
      ResourceAuditLog.logBookingApproval(
        hospitalId,
        resourceType,
        quantity,
        bookingId,
        allocatedBy
      );
    });

    transaction();
    return true;
  }

  /**
   * Release resources from a booking
   * @param {number} hospitalId - Hospital ID
   * @param {string} resourceType - Resource type
   * @param {number} quantity - Quantity to release
   * @param {number} bookingId - Booking ID
   * @param {number} releasedBy - User who released the resources
   * @param {string} reason - Reason for release (completion, cancellation)
   * @returns {boolean} Success status
   */
  static releaseResources(hospitalId, resourceType, quantity, bookingId, releasedBy, reason = 'completed') {
    const transaction = db.transaction(() => {
      // Update resource quantities
      const updateStmt = db.prepare(`
        UPDATE hospital_resources 
        SET available = available + ?, 
            occupied = occupied - ?,
            lastUpdated = CURRENT_TIMESTAMP,
            updatedBy = ?
        WHERE hospitalId = ? AND resourceType = ?
      `);

      updateStmt.run(quantity, quantity, releasedBy, hospitalId, resourceType);

      // Log the release
      if (reason === 'completed') {
        ResourceAuditLog.logBookingCompletion(
          hospitalId,
          resourceType,
          quantity,
          bookingId,
          releasedBy
        );
      } else {
        ResourceAuditLog.logBookingCancellation(
          hospitalId,
          resourceType,
          quantity,
          bookingId,
          releasedBy
        );
      }
    });

    transaction();
    return true;
  }

  /**
   * Check resource availability
   * @param {number} hospitalId - Hospital ID
   * @param {string} resourceType - Resource type
   * @param {number} quantity - Required quantity
   * @returns {Object} Availability information
   */
  static checkResourceAvailability(hospitalId, resourceType, quantity = 1) {
    const stmt = db.prepare(`
      SELECT * FROM hospital_resources 
      WHERE hospitalId = ? AND resourceType = ?
    `);
    const resource = stmt.get(hospitalId, resourceType);

    if (!resource) {
      return {
        available: false,
        currentAvailable: 0,
        requested: quantity,
        message: 'Resource type not found'
      };
    }

    return {
      available: resource.available >= quantity,
      currentAvailable: resource.available,
      requested: quantity,
      total: resource.total,
      occupied: resource.occupied,
      reserved: resource.reserved || 0,
      maintenance: resource.maintenance || 0,
      message: resource.available >= quantity 
        ? 'Resources available' 
        : `Only ${resource.available} of ${quantity} requested resources available`
    };
  }

  /**
   * Get resource utilization statistics
   * @param {number} hospitalId - Hospital ID
   * @returns {Object} Utilization statistics
   */
  static getResourceUtilization(hospitalId) {
    const stmt = db.prepare(`
      SELECT 
        resourceType,
        total,
        available,
        occupied,
        reserved,
        maintenance,
        ROUND((CAST(occupied AS REAL) / CAST(total AS REAL)) * 100, 2) as utilizationPercentage,
        lastUpdated
      FROM hospital_resources 
      WHERE hospitalId = ?
      ORDER BY resourceType
    `);
    return stmt.all(hospitalId);
  }

  /**
   * Get hospitals with available resources
   * @param {string} resourceType - Resource type to filter by
   * @param {number} minQuantity - Minimum available quantity
   * @returns {Array} Hospitals with available resources
   */
  static getWithAvailableResources(resourceType = null, minQuantity = 1) {
    let query = `
      SELECT h.*, hr.resourceType, hr.total, hr.available, hr.occupied
      FROM hospitals h
      INNER JOIN hospital_resources hr ON h.id = hr.hospitalId
      WHERE h.isActive = 1 AND hr.available >= ?
    `;
    
    const params = [minQuantity];
    
    if (resourceType) {
      query += ' AND hr.resourceType = ?';
      params.push(resourceType);
    }
    
    query += ' ORDER BY h.name, hr.resourceType';
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Initialize default resources for a hospital
   * @param {number} hospitalId - Hospital ID
   * @param {number} createdBy - User who created the hospital
   * @returns {boolean} Success status
   */
  static initializeDefaultResources(hospitalId, createdBy = null) {
    const transaction = db.transaction(() => {
      const defaultResources = [
        { resourceType: 'beds', total: 50, available: 45, occupied: 5 },
        { resourceType: 'icu', total: 10, available: 8, occupied: 2 },
        { resourceType: 'operationTheatres', total: 5, available: 4, occupied: 1 }
      ];

      const stmt = db.prepare(`
        INSERT OR IGNORE INTO hospital_resources (
          hospitalId, resourceType, total, available, occupied, 
          reserved, maintenance, updatedBy
        )
        VALUES (?, ?, ?, ?, ?, 0, 0, ?)
      `);

      defaultResources.forEach(resource => {
        stmt.run(
          hospitalId,
          resource.resourceType,
          resource.total,
          resource.available,
          resource.occupied,
          createdBy
        );
      });
    });

    transaction();
    return true;
  }

  /**
   * Get hospitals with available resources for booking
   * @param {string} resourceType - Resource type to filter by
   * @param {number} minQuantity - Minimum available quantity
   * @param {string} city - City filter (optional)
   * @returns {Array} Hospitals with available resources
   */
  static getAvailableForBooking(resourceType = null, minQuantity = 1, city = null) {
    let query = `
      SELECT h.*, 
             hr.resourceType, 
             hr.total, 
             hr.available, 
             hr.occupied,
             hr.reserved,
             hr.maintenance
      FROM hospitals h
      INNER JOIN hospital_resources hr ON h.id = hr.hospitalId
      WHERE h.isActive = 1 
      AND h.approval_status = 'approved'
      AND hr.available >= ?
    `;
    
    const params = [minQuantity];
    
    if (resourceType) {
      query += ' AND hr.resourceType = ?';
      params.push(resourceType);
    }
    
    if (city) {
      query += ' AND h.city LIKE ?';
      params.push(`%${city}%`);
    }
    
    query += ' ORDER BY hr.available DESC, h.rating DESC, h.name';
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Get resource summary for all hospitals
   * @returns {Object} Resource summary statistics
   */
  static getResourceSummary() {
    const stmt = db.prepare(`
      SELECT 
        resourceType,
        COUNT(DISTINCT hospitalId) as hospitalCount,
        SUM(total) as totalResources,
        SUM(available) as totalAvailable,
        SUM(occupied) as totalOccupied,
        SUM(reserved) as totalReserved,
        SUM(maintenance) as totalMaintenance,
        ROUND(AVG(CAST(available AS REAL) / CAST(total AS REAL)) * 100, 2) as avgAvailabilityPercentage
      FROM hospital_resources hr
      INNER JOIN hospitals h ON hr.hospitalId = h.id
      WHERE h.isActive = 1 AND h.approval_status = 'approved'
      GROUP BY resourceType
      ORDER BY resourceType
    `);
    return stmt.all();
  }

  /**
   * Update resource availability after booking operations
   * @param {number} hospitalId - Hospital ID
   * @param {string} resourceType - Resource type
   * @param {string} operation - 'allocate' or 'release'
   * @param {number} quantity - Quantity to allocate/release
   * @param {number} updatedBy - User performing the operation
   * @returns {boolean} Success status
   */
  static updateResourceAvailability(hospitalId, resourceType, operation, quantity, updatedBy) {
    const transaction = db.transaction(() => {
      // Get current resource state
      const currentStmt = db.prepare(`
        SELECT * FROM hospital_resources 
        WHERE hospitalId = ? AND resourceType = ?
      `);
      const currentResource = currentStmt.get(hospitalId, resourceType);

      if (!currentResource) {
        throw new Error(`Resource type ${resourceType} not found for hospital ${hospitalId}`);
      }

      let newAvailable, newOccupied;
      
      if (operation === 'allocate') {
        if (currentResource.available < quantity) {
          throw new Error(`Insufficient ${resourceType} available. Only ${currentResource.available} available.`);
        }
        newAvailable = currentResource.available - quantity;
        newOccupied = currentResource.occupied + quantity;
      } else if (operation === 'release') {
        newAvailable = currentResource.available + quantity;
        newOccupied = Math.max(0, currentResource.occupied - quantity);
      } else {
        throw new Error('Invalid operation. Must be "allocate" or "release"');
      }

      // Update resource
      const updateStmt = db.prepare(`
        UPDATE hospital_resources 
        SET available = ?, 
            occupied = ?,
            lastUpdated = CURRENT_TIMESTAMP,
            updatedBy = ?
        WHERE hospitalId = ? AND resourceType = ?
      `);

      updateStmt.run(newAvailable, newOccupied, updatedBy, hospitalId, resourceType);

      // Log the change
      ResourceAuditLog.create({
        hospitalId,
        resourceType,
        actionType: operation === 'allocate' ? 'booking_approval' : 'booking_completion',
        oldValue: currentResource.available,
        newValue: newAvailable,
        quantity: operation === 'allocate' ? -quantity : quantity,
        bookingId: null, // Will be set by calling function if needed
        performedBy: updatedBy,
        reason: `Resource ${operation} operation`
      });
    });

    transaction();
    return true;
  }

  static count(options = {}) {
    let query = 'SELECT COUNT(*) as count FROM hospitals';
    const params = [];
    if (options.where) {
      const conditions = [];
      Object.keys(options.where).forEach(key => {
        const value = options.where[key];
        if (
          typeof value === 'number' ||
          typeof value === 'string' ||
          typeof value === 'bigint' ||
          value === null
        ) {
          conditions.push(`${key} = ?`);
          params.push(value);
        }
      });
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
    }
    const stmt = db.prepare(query);
    const result = stmt.get(...params);
    return result.count;
  }
}

module.exports = Hospital; 