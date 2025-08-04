const db = require('../config/database');
const HospitalService = require('./hospitalService');

class BookingService {
  // Create new booking
  static create(bookingData) {
    // Check resource availability
    const hospital = HospitalService.getById(bookingData.hospitalId);
    if (!hospital) {
      throw new Error('Hospital not found');
    }

    const resource = hospital.resources[bookingData.resourceType];
    if (!resource || resource.available < 1) {
      throw new Error(`${bookingData.resourceType} not available at this hospital`);
    }

    // Calculate payment amount with 30% markup
    const baseAmount = this.getBaseAmount(bookingData.resourceType, bookingData.estimatedDuration);
    const markup = baseAmount * 0.3;
    const totalAmount = baseAmount + markup;

    const stmt = db.prepare(`
      INSERT INTO bookings (
        userId, hospitalId, resourceType, patientName, patientAge, patientGender,
        emergencyContactName, emergencyContactPhone, emergencyContactRelationship,
        medicalCondition, urgency, surgeonId, scheduledDate, estimatedDuration,
        status, paymentAmount, paymentStatus, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      bookingData.userId,
      bookingData.hospitalId,
      bookingData.resourceType,
      bookingData.patientName,
      bookingData.patientAge,
      bookingData.patientGender,
      bookingData.emergencyContactName,
      bookingData.emergencyContactPhone,
      bookingData.emergencyContactRelationship,
      bookingData.medicalCondition,
      bookingData.urgency || 'medium',
      bookingData.surgeonId || null,
      bookingData.scheduledDate,
      bookingData.estimatedDuration || 24,
      'pending',
      totalAmount,
      'pending',
      bookingData.notes
    );

    // Update resource availability
    HospitalService.updateResourceAvailability(
      bookingData.hospitalId,
      bookingData.resourceType,
      -1,
      bookingData.userId
    );

    return this.getById(result.lastInsertRowid);
  }

  // Get booking by ID
  static getById(id) {
    const booking = db.prepare(`
      SELECT b.*, h.name as hospitalName, s.name as surgeonName
      FROM bookings b
      LEFT JOIN hospitals h ON b.hospitalId = h.id
      LEFT JOIN surgeons s ON b.surgeonId = s.id
      WHERE b.id = ?
    `).get(id);

    if (!booking) return null;

    return {
      ...booking,
      hospital: {
        id: booking.hospitalId,
        name: booking.hospitalName
      },
      surgeon: booking.surgeonId ? {
        id: booking.surgeonId,
        name: booking.surgeonName
      } : null
    };
  }

  // Get bookings by user ID
  static getByUserId(userId) {
    const bookings = db.prepare(`
      SELECT b.*, h.name as hospitalName, s.name as surgeonName
      FROM bookings b
      LEFT JOIN hospitals h ON b.hospitalId = h.id
      LEFT JOIN surgeons s ON b.surgeonId = s.id
      WHERE b.userId = ?
      ORDER BY b.createdAt DESC
    `).all(userId);

    return bookings.map(booking => ({
      ...booking,
      hospital: {
        id: booking.hospitalId,
        name: booking.hospitalName
      },
      surgeon: booking.surgeonId ? {
        id: booking.surgeonId,
        name: booking.surgeonName
      } : null
    }));
  }

  // Get bookings by hospital ID
  static getByHospitalId(hospitalId) {
    const bookings = db.prepare(`
      SELECT b.*, h.name as hospitalName, s.name as surgeonName, u.name as userName, u.email as userEmail
      FROM bookings b
      LEFT JOIN hospitals h ON b.hospitalId = h.id
      LEFT JOIN surgeons s ON b.surgeonId = s.id
      LEFT JOIN users u ON b.userId = u.id
      WHERE b.hospitalId = ?
      ORDER BY b.createdAt DESC
    `).all(hospitalId);

    return bookings.map(booking => ({
      ...booking,
      hospital: {
        id: booking.hospitalId,
        name: booking.hospitalName
      },
      surgeon: booking.surgeonId ? {
        id: booking.surgeonId,
        name: booking.surgeonName
      } : null,
      user: {
        id: booking.userId,
        name: booking.userName,
        email: booking.userEmail
      }
    }));
  }

  // Get all bookings (admin)
  static getAll() {
    const bookings = db.prepare(`
      SELECT b.*, h.name as hospitalName, s.name as surgeonName
      FROM bookings b
      LEFT JOIN hospitals h ON b.hospitalId = h.id
      LEFT JOIN surgeons s ON b.surgeonId = s.id
      ORDER BY b.createdAt DESC
    `).all();

    return bookings.map(booking => ({
      ...booking,
      hospital: {
        id: booking.hospitalId,
        name: booking.hospitalName
      },
      surgeon: booking.surgeonId ? {
        id: booking.surgeonId,
        name: booking.surgeonName
      } : null
    }));
  }

  // Update booking status
  static updateStatus(id, status) {
    const stmt = db.prepare(`
      UPDATE bookings 
      SET status = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    return stmt.run(status, id);
  }

  // Update payment status
  static updatePaymentStatus(id, paymentStatus, paymentMethod = null, transactionId = null) {
    const stmt = db.prepare(`
      UPDATE bookings 
      SET paymentStatus = ?, paymentMethod = ?, transactionId = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    return stmt.run(paymentStatus, paymentMethod, transactionId, id);
  }

  // Cancel booking
  static cancel(id) {
    const booking = this.getById(id);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status === 'cancelled') {
      throw new Error('Booking is already cancelled');
    }

    // Update booking status
    const stmt = db.prepare(`
      UPDATE bookings 
      SET status = 'cancelled', updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(id);

    // Restore resource availability
    HospitalService.updateResourceAvailability(
      booking.hospitalId,
      booking.resourceType,
      1,
      booking.userId
    );

    return this.getById(id);
  }

  // Get booking statistics
  static getStats() {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        SUM(paymentAmount) as totalRevenue,
        AVG(paymentAmount) as averageAmount
      FROM bookings
    `).get();

    return {
      total: stats.total,
      confirmed: stats.confirmed,
      pending: stats.pending,
      cancelled: stats.cancelled,
      completed: stats.completed,
      totalRevenue: stats.totalRevenue || 0,
      averageAmount: stats.averageAmount || 0
    };
  }

  // Get base amount for resource type
  static getBaseAmount(resourceType, duration = 24) {
    const baseRates = {
      beds: 100, // $100 per day
      icu: 500,  // $500 per day
      operationTheatres: 1000 // $1000 per day
    };

    const baseRate = baseRates[resourceType] || 100;
    return baseRate * (duration / 24); // Convert hours to days
  }

  // Get available surgeons for hospital
  static getAvailableSurgeons(hospitalId, scheduledDate) {
    const surgeons = db.prepare(`
      SELECT id, name, specialization, available, scheduleDays, scheduleHours
      FROM surgeons
      WHERE hospitalId = ? AND available = 1
    `).all(hospitalId);

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
  }
}

module.exports = BookingService; 