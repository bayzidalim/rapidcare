const db = require('../config/database');

class HospitalService {
  // Get all hospitals (only approved for public use)
  static getAll(includeUnapproved = false) {
    try {
      let whereClause = 'WHERE h.isActive = 1';
      if (!includeUnapproved) {
        whereClause += " AND h.approval_status = 'approved'";
      }

      const hospitals = db.prepare(`
        SELECT 
          h.*,
          GROUP_CONCAT(DISTINCT hs.service) as services,
          approver.name as approver_name
        FROM hospitals h
        LEFT JOIN hospital_services hs ON h.id = hs.hospitalId
        LEFT JOIN users approver ON h.approved_by = approver.id
        ${whereClause}
        GROUP BY h.id
        ORDER BY h.name
      `).all();

      if (!hospitals || hospitals.length === 0) {
        return [];
      }

    return hospitals.map(hospital => ({
      ...hospital,
      services: hospital.services ? hospital.services.split(',') : [],
      address: {
        street: hospital.street,
        city: hospital.city,
        state: hospital.state,
        zipCode: hospital.zipCode,
        country: hospital.country
      },
      contact: {
        phone: hospital.phone,
        email: hospital.email,
        emergency: hospital.emergency
      },
      capacity: {
        totalBeds: hospital.total_beds || 0,
        icuBeds: hospital.icu_beds || 0,
        operationTheaters: hospital.operation_theaters || 0
      },
      approvalStatus: hospital.approval_status,
      approvedBy: hospital.approved_by,
      approvedAt: hospital.approved_at,
      approverName: hospital.approver_name,
      rejectionReason: hospital.rejection_reason,
      submittedAt: hospital.submitted_at,
      resources: this.getHospitalResources(hospital.id),
      surgeons: this.getHospitalSurgeons(hospital.id)
    }));
    } catch (error) {
      console.error('Error in HospitalService.getAll:', error);
      throw error;
    }
  }

  // Get hospital by ID
  static getById(id) {
    const hospital = db.prepare(`
      SELECT 
        h.*,
        GROUP_CONCAT(DISTINCT hs.service) as services
      FROM hospitals h
      LEFT JOIN hospital_services hs ON h.id = hs.hospitalId
      WHERE h.id = ? AND h.isActive = 1
      GROUP BY h.id
    `).get(id);

    if (!hospital) return null;

    return {
      ...hospital,
      services: hospital.services ? hospital.services.split(',') : [],
      address: {
        street: hospital.street,
        city: hospital.city,
        state: hospital.state,
        zipCode: hospital.zipCode,
        country: hospital.country
      },
      contact: {
        phone: hospital.phone,
        email: hospital.email,
        emergency: hospital.emergency
      },
      resources: this.getHospitalResources(hospital.id),
      surgeons: this.getHospitalSurgeons(hospital.id)
    };
  }

  // Search hospitals (only approved for public use)
  static search(params) {
    let query = `
      SELECT 
        h.*,
        GROUP_CONCAT(DISTINCT hs.service) as services
      FROM hospitals h
      LEFT JOIN hospital_services hs ON h.id = hs.hospitalId
      WHERE h.isActive = 1 AND h.approval_status = 'approved'
    `;
    
    const conditions = [];
    const queryParams = [];

    if (params.q) {
      conditions.push(`(h.name LIKE ? OR h.city LIKE ? OR h.state LIKE ?)`);
      const searchTerm = `%${params.q}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (params.city) {
      conditions.push(`h.city LIKE ?`);
      queryParams.push(`%${params.city}%`);
    }

    if (params.service) {
      conditions.push(`hs.service LIKE ?`);
      queryParams.push(`%${params.service}%`);
    }

    if (conditions.length > 0) {
      query += ` AND (${conditions.join(' OR ')})`;
    }

    query += ` GROUP BY h.id ORDER BY h.rating DESC, h.name`;

    const hospitals = db.prepare(query).all(...queryParams);

    return hospitals.map(hospital => ({
      ...hospital,
      services: hospital.services ? hospital.services.split(',') : [],
      address: {
        street: hospital.street,
        city: hospital.city,
        state: hospital.state,
        zipCode: hospital.zipCode,
        country: hospital.country
      },
      contact: {
        phone: hospital.phone,
        email: hospital.email,
        emergency: hospital.emergency
      },
      resources: this.getHospitalResources(hospital.id),
      surgeons: this.getHospitalSurgeons(hospital.id)
    }));
  }

  // Get hospitals with available resources (only approved)
  static getWithResources(params) {
    let query = `
      SELECT 
        h.*,
        GROUP_CONCAT(DISTINCT hs.service) as services
      FROM hospitals h
      LEFT JOIN hospital_services hs ON h.id = hs.hospitalId
      LEFT JOIN hospital_resources hr ON h.id = hr.hospitalId
      WHERE h.isActive = 1 AND h.approval_status = 'approved'
    `;

    const conditions = [];
    const queryParams = [];

    if (params.resourceType) {
      conditions.push(`hr.resourceType = ? AND hr.available >= ?`);
      queryParams.push(params.resourceType, parseInt(params.minAvailable) || 1);
    }

    if (conditions.length > 0) {
      query += ` AND (${conditions.join(' AND ')})`;
    }

    query += ` GROUP BY h.id ORDER BY h.rating DESC, h.name`;

    const hospitals = db.prepare(query).all(...queryParams);

    return hospitals.map(hospital => ({
      ...hospital,
      services: hospital.services ? hospital.services.split(',') : [],
      address: {
        street: hospital.street,
        city: hospital.city,
        state: hospital.state,
        zipCode: hospital.zipCode,
        country: hospital.country
      },
      contact: {
        phone: hospital.phone,
        email: hospital.email,
        emergency: hospital.emergency
      },
      resources: this.getHospitalResources(hospital.id),
      surgeons: this.getHospitalSurgeons(hospital.id)
    }));
  }

  // Create new hospital
  static create(hospitalData) {
    const stmt = db.prepare(`
      INSERT INTO hospitals (
        name, street, city, state, zipCode, country, 
        phone, email, emergency, rating, isActive
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      hospitalData.name,
      hospitalData.address?.street,
      hospitalData.address?.city,
      hospitalData.address?.state,
      hospitalData.address?.zipCode,
      hospitalData.address?.country,
      hospitalData.contact?.phone,
      hospitalData.contact?.email,
      hospitalData.contact?.emergency,
      hospitalData.rating || 0,
      hospitalData.isActive !== false ? 1 : 0
    );

    const hospitalId = result.lastInsertRowid;

    // Insert services
    if (hospitalData.services && hospitalData.services.length > 0) {
      const serviceStmt = db.prepare(`
        INSERT INTO hospital_services (hospitalId, service) VALUES (?, ?)
      `);
      
      hospitalData.services.forEach(service => {
        serviceStmt.run(hospitalId, service);
      });
    }

    // Insert resources
    if (hospitalData.resources) {
      const resourceStmt = db.prepare(`
        INSERT INTO hospital_resources (hospitalId, resourceType, total, available, occupied)
        VALUES (?, ?, ?, ?, ?)
      `);

      Object.entries(hospitalData.resources).forEach(([type, resource]) => {
        resourceStmt.run(
          hospitalId,
          type,
          resource.total || 0,
          resource.available || 0,
          resource.occupied || 0
        );
      });
    }

    // Insert surgeons
    if (hospitalData.surgeons && hospitalData.surgeons.length > 0) {
      const surgeonStmt = db.prepare(`
        INSERT INTO surgeons (hospitalId, name, specialization, available, scheduleDays, scheduleHours)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      hospitalData.surgeons.forEach(surgeon => {
        surgeonStmt.run(
          hospitalId,
          surgeon.name,
          surgeon.specialization,
          surgeon.available ? 1 : 0,
          surgeon.schedule?.days ? JSON.stringify(surgeon.schedule.days) : null,
          surgeon.schedule?.hours
        );
      });
    }

    return this.getById(hospitalId);
  }

  // Update hospital resources
  static updateResources(id, updateData) {
    const updateStmt = db.prepare(`
      UPDATE hospitals 
      SET lastUpdated = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    updateStmt.run(id);

    if (updateData.resources) {
      const resourceStmt = db.prepare(`
        INSERT OR REPLACE INTO hospital_resources (hospitalId, resourceType, total, available, occupied)
        VALUES (?, ?, ?, ?, ?)
      `);

      Object.entries(updateData.resources).forEach(([type, resource]) => {
        resourceStmt.run(
          id,
          type,
          resource.total || 0,
          resource.available || 0,
          resource.occupied || 0
        );
      });
    }

    if (updateData.surgeons) {
      // Delete existing surgeons
      db.prepare('DELETE FROM surgeons WHERE hospitalId = ?').run(id);

      // Insert new surgeons
      const surgeonStmt = db.prepare(`
        INSERT INTO surgeons (hospitalId, name, specialization, available, scheduleDays, scheduleHours)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      updateData.surgeons.forEach(surgeon => {
        surgeonStmt.run(
          id,
          surgeon.name,
          surgeon.specialization,
          surgeon.available ? 1 : 0,
          surgeon.schedule?.days ? JSON.stringify(surgeon.schedule.days) : null,
          surgeon.schedule?.hours
        );
      });
    }

    return this.getById(id);
  }

  // Get hospital resources
  static getHospitalResources(hospitalId) {
    try {
      const resources = db.prepare(`
        SELECT resourceType, total, available, occupied
        FROM hospital_resources
        WHERE hospitalId = ?
      `).all(hospitalId);

      const resourceMap = {
        beds: { total: 0, available: 0, occupied: 0 },
        icu: { total: 0, available: 0, occupied: 0 },
        operationTheatres: { total: 0, available: 0, occupied: 0 }
      };

      if (resources && resources.length > 0) {
        resources.forEach(resource => {
          resourceMap[resource.resourceType] = {
            total: resource.total,
            available: resource.available,
            occupied: resource.occupied
          };
        });
      }

      return resourceMap;
    } catch (error) {
      console.error('Error in getHospitalResources:', error);
      // Return default resource map on error
      return {
        beds: { total: 0, available: 0, occupied: 0 },
        icu: { total: 0, available: 0, occupied: 0 },
        operationTheatres: { total: 0, available: 0, occupied: 0 }
      };
    }
  }

  // Get hospital surgeons
  static getHospitalSurgeons(hospitalId) {
    try {
      const surgeons = db.prepare(`
        SELECT id, name, specialization, available, scheduleDays, scheduleHours
        FROM surgeons
        WHERE hospitalId = ?
      `).all(hospitalId);

      if (!surgeons || surgeons.length === 0) {
        return [];
      }

      return surgeons.map(surgeon => ({
        id: surgeon.id,
        name: surgeon.name,
        specialization: surgeon.specialization,
        available: surgeon.available === 1,
        schedule: {
          days: surgeon.scheduleDays ? JSON.parse(surgeon.scheduleDays) : [],
          hours: surgeon.scheduleHours
        }
      }));
    } catch (error) {
      console.error('Error in getHospitalSurgeons:', error);
      return [];
    }
  }

  // Update resource availability
  static updateResourceAvailability(hospitalId, resourceType, change, updatedBy = null) {
    const stmt = db.prepare(`
      UPDATE hospital_resources 
      SET available = available + ?, occupied = occupied - ?, updatedBy = ?, lastUpdated = CURRENT_TIMESTAMP
      WHERE hospitalId = ? AND resourceType = ?
    `);
    
    return stmt.run(change, change, updatedBy, hospitalId, resourceType);
  }

  // Update hospital
  static update(hospitalId, hospitalData) {
    // Update basic hospital information
    const stmt = db.prepare(`
      UPDATE hospitals 
      SET name = ?, street = ?, city = ?, state = ?, zipCode = ?, country = ?,
          phone = ?, email = ?, emergency = ?, rating = ?, isActive = ?, 
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      hospitalData.name,
      hospitalData.address?.street,
      hospitalData.address?.city,
      hospitalData.address?.state,
      hospitalData.address?.zipCode,
      hospitalData.address?.country,
      hospitalData.contact?.phone,
      hospitalData.contact?.email,
      hospitalData.contact?.emergency,
      hospitalData.rating || 0,
      hospitalData.isActive !== false ? 1 : 0,
      hospitalId
    );

    // Update services
    if (hospitalData.services) {
      // Delete existing services
      db.prepare('DELETE FROM hospital_services WHERE hospitalId = ?').run(hospitalId);
      
      // Insert new services
      const serviceStmt = db.prepare(`
        INSERT INTO hospital_services (hospitalId, service) VALUES (?, ?)
      `);
      
      hospitalData.services.forEach(service => {
        serviceStmt.run(hospitalId, service);
      });
    }

    // Update resources if provided
    if (hospitalData.resources) {
      Object.entries(hospitalData.resources).forEach(([type, resource]) => {
        const resourceStmt = db.prepare(`
          UPDATE hospital_resources 
          SET total = ?, available = ?, occupied = ?, updatedAt = CURRENT_TIMESTAMP
          WHERE hospitalId = ? AND resourceType = ?
        `);
        
        resourceStmt.run(
          resource.total || 0,
          resource.available || 0,
          resource.occupied || 0,
          hospitalId,
          type
        );
      });
    }

    return this.getById(hospitalId);
  }

  // Delete hospital
  static delete(hospitalId) {
    // Delete related records first
    db.prepare('DELETE FROM hospital_services WHERE hospitalId = ?').run(hospitalId);
    db.prepare('DELETE FROM hospital_resources WHERE hospitalId = ?').run(hospitalId);
    db.prepare('DELETE FROM surgeons WHERE hospitalId = ?').run(hospitalId);
    
    // Delete the hospital
    const stmt = db.prepare('DELETE FROM hospitals WHERE id = ?');
    return stmt.run(hospitalId);
  }

  // Get hospitals by user ID (for hospital authorities)
  static getByUserId(userId) {
    const hospital = db.prepare(`
      SELECT 
        h.*,
        GROUP_CONCAT(DISTINCT hs.service) as services,
        approver.name as approver_name
      FROM hospitals h
      LEFT JOIN hospital_services hs ON h.id = hs.hospitalId
      LEFT JOIN users approver ON h.approved_by = approver.id
      LEFT JOIN users u ON u.hospital_id = h.id
      WHERE u.id = ? AND h.isActive = 1
      GROUP BY h.id
    `).get(userId);

    if (!hospital) return null;

    return {
      ...hospital,
      services: hospital.services ? hospital.services.split(',') : [],
      address: {
        street: hospital.street,
        city: hospital.city,
        state: hospital.state,
        zipCode: hospital.zipCode,
        country: hospital.country
      },
      contact: {
        phone: hospital.phone,
        email: hospital.email,
        emergency: hospital.emergency
      },
      capacity: {
        totalBeds: hospital.total_beds || 0,
        icuBeds: hospital.icu_beds || 0,
        operationTheaters: hospital.operation_theaters || 0
      },
      approvalStatus: hospital.approval_status,
      approvedBy: hospital.approved_by,
      approvedAt: hospital.approved_at,
      approverName: hospital.approver_name,
      rejectionReason: hospital.rejection_reason,
      submittedAt: hospital.submitted_at,
      resources: this.getHospitalResources(hospital.id),
      surgeons: this.getHospitalSurgeons(hospital.id)
    };
  }

  // Get pending hospitals for approval
  static getPendingApprovals() {
    const hospitals = db.prepare(`
      SELECT 
        h.*,
        GROUP_CONCAT(DISTINCT hs.service) as services,
        u.name as authority_name,
        u.email as authority_email,
        u.phone as authority_phone
      FROM hospitals h
      LEFT JOIN hospital_services hs ON h.id = hs.hospitalId
      LEFT JOIN users u ON u.hospital_id = h.id
      WHERE h.approval_status = 'pending'
      GROUP BY h.id
      ORDER BY h.submitted_at ASC
    `).all();

    return hospitals.map(hospital => ({
      ...hospital,
      services: hospital.services ? hospital.services.split(',') : [],
      address: {
        street: hospital.street,
        city: hospital.city,
        state: hospital.state,
        zipCode: hospital.zipCode,
        country: hospital.country
      },
      contact: {
        phone: hospital.phone,
        email: hospital.email,
        emergency: hospital.emergency
      },
      capacity: {
        totalBeds: hospital.total_beds || 0,
        icuBeds: hospital.icu_beds || 0,
        operationTheaters: hospital.operation_theaters || 0
      },
      authority: {
        name: hospital.authority_name,
        email: hospital.authority_email,
        phone: hospital.authority_phone
      },
      approvalStatus: hospital.approval_status,
      submittedAt: hospital.submitted_at
    }));
  }

  // Approve hospital
  static approveHospital(hospitalId, approvedBy) {
    const stmt = db.prepare(`
      UPDATE hospitals 
      SET approval_status = 'approved',
          approved_by = ?,
          approved_at = CURRENT_TIMESTAMP,
          rejection_reason = NULL,
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const result = stmt.run(approvedBy, hospitalId);
    return result.changes > 0 ? this.getById(hospitalId) : null;
  }

  // Reject hospital
  static rejectHospital(hospitalId, rejectedBy, reason) {
    const stmt = db.prepare(`
      UPDATE hospitals 
      SET approval_status = 'rejected',
          approved_by = ?,
          approved_at = CURRENT_TIMESTAMP,
          rejection_reason = ?,
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const result = stmt.run(rejectedBy, reason, hospitalId);
    return result.changes > 0 ? this.getById(hospitalId) : null;
  }

  // Get approval statistics
  static getApprovalStats() {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN approval_status = 'rejected' THEN 1 END) as rejected,
        AVG(
          CASE 
            WHEN approval_status IN ('approved', 'rejected') AND approved_at IS NOT NULL 
            THEN (julianday(approved_at) - julianday(submitted_at)) * 24 
          END
        ) as avgApprovalTimeHours
      FROM hospitals
      WHERE submitted_at IS NOT NULL
    `).get();

    return {
      total: stats.total || 0,
      pending: stats.pending || 0,
      approved: stats.approved || 0,
      rejected: stats.rejected || 0,
      avgApprovalTimeHours: stats.avgApprovalTimeHours || 0
    };
  }

  // Create hospital with approval status (for hospital authority registration)
  static createWithApproval(hospitalData, authorityUserId) {
    const stmt = db.prepare(`
      INSERT INTO hospitals (
        name, description, type, street, city, state, zipCode, country, 
        phone, email, emergency, total_beds, icu_beds, operation_theaters,
        approval_status, submitted_at, isActive
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, 1)
    `);

    const result = stmt.run(
      hospitalData.name,
      hospitalData.description || '',
      hospitalData.type || 'General',
      hospitalData.address?.street,
      hospitalData.address?.city,
      hospitalData.address?.state,
      hospitalData.address?.zipCode,
      hospitalData.address?.country,
      hospitalData.contact?.phone,
      hospitalData.contact?.email,
      hospitalData.contact?.emergency,
      hospitalData.capacity?.totalBeds || 0,
      hospitalData.capacity?.icuBeds || 0,
      hospitalData.capacity?.operationTheaters || 0
    );

    const hospitalId = result.lastInsertRowid;

    // Link hospital to authority user
    const userStmt = db.prepare(`
      UPDATE users 
      SET hospital_id = ?, can_add_hospital = 0
      WHERE id = ?
    `);
    userStmt.run(hospitalId, authorityUserId);

    // Insert services
    if (hospitalData.services && hospitalData.services.length > 0) {
      const serviceStmt = db.prepare(`
        INSERT INTO hospital_services (hospitalId, service) VALUES (?, ?)
      `);
      
      hospitalData.services.forEach(service => {
        serviceStmt.run(hospitalId, service);
      });
    }

    return this.getById(hospitalId);
  }

  // Check if user can add hospital
  static canUserAddHospital(userId) {
    const user = db.prepare(`
      SELECT can_add_hospital, hospital_id 
      FROM users 
      WHERE id = ? AND userType = 'hospital-authority'
    `).get(userId);

    return user && user.can_add_hospital === 1 && !user.hospital_id;
  }
}

module.exports = HospitalService; 