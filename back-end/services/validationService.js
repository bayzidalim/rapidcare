const db = require('../config/database');

class ValidationService {
  // Validate hospital authority can only register one hospital
  static canUserAddHospital(userId) {
    const user = db.prepare(`
      SELECT hospital_id, can_add_hospital 
      FROM users 
      WHERE id = ? AND userType = 'hospital-authority'
    `).get(userId);

    if (!user) return false;
    
    // If user already has a hospital, they can't add another
    if (user.hospital_id) return false;
    
    // Check can_add_hospital flag
    return user.can_add_hospital === 1;
  }

  // Validate hospital data completeness
  static validateHospitalData(hospitalData) {
    const errors = [];

    // Required fields
    if (!hospitalData.name || hospitalData.name.trim().length < 2) {
      errors.push('Hospital name is required and must be at least 2 characters');
    }

    if (!hospitalData.address?.street) {
      errors.push('Street address is required');
    }

    if (!hospitalData.address?.city) {
      errors.push('City is required');
    }

    if (!hospitalData.address?.state) {
      errors.push('State is required');
    }

    if (!hospitalData.contact?.phone) {
      errors.push('Phone number is required');
    }

    if (!hospitalData.contact?.email) {
      errors.push('Email address is required');
    }

    if (!hospitalData.contact?.emergency) {
      errors.push('Emergency contact is required');
    }

    // Basic email validation
    if (hospitalData.contact?.email && !this.isValidEmail(hospitalData.contact.email)) {
      errors.push('Invalid email address format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Check for duplicate hospital names in same city
  static checkDuplicateHospital(name, city, excludeId = null) {
    let query = `
      SELECT id FROM hospitals 
      WHERE LOWER(name) = LOWER(?) AND LOWER(city) = LOWER(?)
    `;
    const params = [name, city];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const existing = db.prepare(query).get(...params);
    return existing !== undefined;
  }

  // Validate approval status transitions
  static validateStatusTransition(currentStatus, newStatus, userType) {
    const validTransitions = {
      'pending': {
        'approved': ['admin'],
        'rejected': ['admin']
      },
      'rejected': {
        'pending': ['hospital-authority'] // resubmission
      },
      'approved': {
        'rejected': ['admin'], // can reject approved hospitals if needed
      }
    };

    const allowedTransitions = validTransitions[currentStatus];
    if (!allowedTransitions) return false;

    const allowedUsers = allowedTransitions[newStatus];
    if (!allowedUsers) return false;

    return allowedUsers.includes(userType);
  }

  // Basic email validation
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate phone number format (basic)
  static isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  // Sanitize input data
  static sanitizeHospitalData(hospitalData) {
    return {
      name: hospitalData.name?.trim(),
      description: hospitalData.description?.trim() || '',
      type: hospitalData.type?.trim() || 'General',
      address: {
        street: hospitalData.address?.street?.trim(),
        city: hospitalData.address?.city?.trim(),
        state: hospitalData.address?.state?.trim(),
        zipCode: hospitalData.address?.zipCode?.trim(),
        country: hospitalData.address?.country?.trim() || 'Bangladesh'
      },
      contact: {
        phone: hospitalData.contact?.phone?.trim(),
        email: hospitalData.contact?.email?.trim().toLowerCase(),
        emergency: hospitalData.contact?.emergency?.trim()
      },
      services: Array.isArray(hospitalData.services) ? 
        hospitalData.services.map(s => s.trim()).filter(s => s) : [],
      capacity: {
        totalBeds: parseInt(hospitalData.capacity?.totalBeds) || 0,
        icuBeds: parseInt(hospitalData.capacity?.icuBeds) || 0,
        operationTheaters: parseInt(hospitalData.capacity?.operationTheaters) || 0
      }
    };
  }

  // Validate user permissions for hospital operations
  static validateHospitalAccess(userId, hospitalId, operation) {
    const user = db.prepare('SELECT userType, hospital_id FROM users WHERE id = ?').get(userId);
    if (!user) return false;

    // Admin can do everything
    if (user.userType === 'admin') return true;

    // Hospital authority can only access their own hospital
    if (user.userType === 'hospital-authority') {
      if (operation === 'create' && user.hospital_id) return false; // Already has hospital
      if (operation !== 'create' && user.hospital_id !== hospitalId) return false;
      return true;
    }

    return false;
  }

  // Check approval status integrity
  static validateApprovalIntegrity(hospitalId) {
    const hospital = db.prepare(`
      SELECT approval_status, approved_by, approved_at, rejection_reason
      FROM hospitals WHERE id = ?
    `).get(hospitalId);

    if (!hospital) return { isValid: false, errors: ['Hospital not found'] };

    const errors = [];

    // If approved, must have approved_by and approved_at
    if (hospital.approval_status === 'approved') {
      if (!hospital.approved_by) errors.push('Approved hospital missing approver information');
      if (!hospital.approved_at) errors.push('Approved hospital missing approval date');
    }

    // If rejected, must have rejection reason
    if (hospital.approval_status === 'rejected') {
      if (!hospital.rejection_reason) errors.push('Rejected hospital missing rejection reason');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate booking data
  static validateBookingData(bookingData) {
    const errors = [];

    // Patient information validation
    if (!bookingData.patientName || bookingData.patientName.trim().length < 2) {
      errors.push('Patient name is required and must be at least 2 characters');
    }

    if (!bookingData.patientAge || bookingData.patientAge < 1 || bookingData.patientAge > 150) {
      errors.push('Patient age must be between 1 and 150');
    }

    if (!bookingData.patientGender || !['male', 'female', 'other'].includes(bookingData.patientGender)) {
      errors.push('Patient gender is required and must be male, female, or other');
    }

    if (!bookingData.medicalCondition || bookingData.medicalCondition.trim().length < 5) {
      errors.push('Medical condition is required and must be at least 5 characters');
    }

    if (!bookingData.urgency || !['low', 'medium', 'high', 'critical'].includes(bookingData.urgency)) {
      errors.push('Urgency level is required and must be low, medium, high, or critical');
    }

    // Emergency contact validation
    if (!bookingData.emergencyContactName || bookingData.emergencyContactName.trim().length < 2) {
      errors.push('Emergency contact name is required and must be at least 2 characters');
    }

    if (!bookingData.emergencyContactPhone || !this.isValidPhone(bookingData.emergencyContactPhone)) {
      errors.push('Valid emergency contact phone number is required');
    }

    if (!bookingData.emergencyContactRelationship || bookingData.emergencyContactRelationship.trim().length < 2) {
      errors.push('Emergency contact relationship is required');
    }

    // Scheduling validation
    if (!bookingData.scheduledDate) {
      errors.push('Scheduled date is required');
    } else {
      const scheduledDate = new Date(bookingData.scheduledDate);
      const now = new Date();
      
      if (scheduledDate < now) {
        errors.push('Scheduled date cannot be in the past');
      }
      
      // Check if date is too far in the future (e.g., more than 1 year)
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      
      if (scheduledDate > oneYearFromNow) {
        errors.push('Scheduled date cannot be more than 1 year in the future');
      }
    }

    if (!bookingData.estimatedDuration || bookingData.estimatedDuration < 1 || bookingData.estimatedDuration > 720) {
      errors.push('Estimated duration must be between 1 and 720 hours (30 days)');
    }

    // Resource type validation
    if (!bookingData.resourceType || !['beds', 'icu', 'operationTheatres'].includes(bookingData.resourceType)) {
      errors.push('Resource type is required and must be beds, icu, or operationTheatres');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Sanitize booking data
  static sanitizeBookingData(bookingData) {
    return {
      patientName: bookingData.patientName?.trim(),
      patientAge: parseInt(bookingData.patientAge),
      patientGender: bookingData.patientGender?.toLowerCase(),
      medicalCondition: bookingData.medicalCondition?.trim(),
      urgency: bookingData.urgency?.toLowerCase(),
      emergencyContactName: bookingData.emergencyContactName?.trim(),
      emergencyContactPhone: bookingData.emergencyContactPhone?.trim(),
      emergencyContactRelationship: bookingData.emergencyContactRelationship?.trim(),
      scheduledDate: bookingData.scheduledDate,
      estimatedDuration: parseInt(bookingData.estimatedDuration) || 24,
      resourceType: bookingData.resourceType?.toLowerCase(),
      notes: bookingData.notes?.trim() || ''
    };
  }

  // Validate resource availability before booking
  static validateResourceAvailability(hospitalId, resourceType, scheduledDate, estimatedDuration) {
    const resource = db.prepare(`
      SELECT available, total, occupied, reserved 
      FROM hospital_resources 
      WHERE hospitalId = ? AND resourceType = ?
    `).get(hospitalId, resourceType);

    if (!resource) {
      return { isValid: false, error: 'Resource type not available at this hospital' };
    }

    if (resource.available <= 0) {
      return { isValid: false, error: 'No resources available for the requested type' };
    }

    // Additional validation could include checking for scheduling conflicts
    // For now, we'll just check basic availability

    return { isValid: true };
  }

  // Validate booking status transitions
  static validateBookingStatusTransition(currentStatus, newStatus, userType) {
    const validTransitions = {
      'pending': {
        'approved': ['hospital-authority', 'admin'],
        'declined': ['hospital-authority', 'admin'],
        'cancelled': ['user', 'admin'] // User can cancel their own pending booking
      },
      'approved': {
        'completed': ['hospital-authority', 'admin'],
        'cancelled': ['user', 'hospital-authority', 'admin']
      },
      'declined': {
        // Declined bookings cannot be changed
      },
      'cancelled': {
        // Cancelled bookings cannot be changed
      },
      'completed': {
        // Completed bookings cannot be changed
      }
    };

    const allowedTransitions = validTransitions[currentStatus];
    if (!allowedTransitions) return false;

    const allowedUsers = allowedTransitions[newStatus];
    if (!allowedUsers) return false;

    return allowedUsers.includes(userType);
  }

  // Rate limiting validation
  static validateBookingRateLimit(userId, timeWindowMinutes = 60, maxBookings = 5) {
    const timeWindow = new Date();
    timeWindow.setMinutes(timeWindow.getMinutes() - timeWindowMinutes);

    const recentBookings = db.prepare(`
      SELECT COUNT(*) as count 
      FROM bookings 
      WHERE userId = ? AND createdAt > ?
    `).get(userId, timeWindow.toISOString());

    return {
      isValid: recentBookings.count < maxBookings,
      currentCount: recentBookings.count,
      maxAllowed: maxBookings,
      timeWindowMinutes
    };
  }

  // Validate user can book at specific hospital
  static validateHospitalBookingAccess(userId, hospitalId) {
    // Check if hospital is approved and active
    const hospital = db.prepare(`
      SELECT approval_status, isActive 
      FROM hospitals 
      WHERE id = ?
    `).get(hospitalId);

    if (!hospital) {
      return { isValid: false, error: 'Hospital not found' };
    }

    if (hospital.approval_status !== 'approved') {
      return { isValid: false, error: 'Hospital is not approved for bookings' };
    }

    if (!hospital.isActive) {
      return { isValid: false, error: 'Hospital is currently inactive' };
    }

    // Check if user has any restrictions (could be extended)
    const user = db.prepare('SELECT isActive FROM users WHERE id = ?').get(userId);
    
    if (!user || !user.isActive) {
      return { isValid: false, error: 'User account is inactive' };
    }

    return { isValid: true };
  }

  // Input sanitization for security
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // Remove potentially dangerous characters
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  // Validate and sanitize all booking input
  static validateAndSanitizeBooking(bookingData) {
    // First sanitize all string inputs
    const sanitized = {};
    for (const [key, value] of Object.entries(bookingData)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeInput(value);
      } else {
        sanitized[key] = value;
      }
    }

    // Then validate the sanitized data
    const validation = this.validateBookingData(sanitized);
    
    if (!validation.isValid) {
      return { isValid: false, errors: validation.errors };
    }

    // Return sanitized and validated data
    return {
      isValid: true,
      data: this.sanitizeBookingData(sanitized)
    };
  }
}

module.exports = ValidationService;