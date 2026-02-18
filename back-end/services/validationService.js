const User = require('../models/User');
const Hospital = require('../models/Hospital');
const ErrorHandler = require('../utils/errorHandler');

class ValidationService {
  // Validate hospital authority can only register one hospital
  static async canUserAddHospital(userId) {
    const user = await User.findById(userId);
    if (!user) return false;
    
    // Only hospital-authority can add hospitals
    if (user.userType !== 'hospital-authority') return false;

    // If user already has a hospital linked, they can't add another
    if (user.hospital_id) return false;
    
    // Check can_add_hospital flag
    return user.can_add_hospital === true; // Mongoose boolean is true/false not 1/0
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
  static async checkDuplicateHospital(name, city, excludeId = null) {
    const query = {
      name: { $regex: new RegExp(`^${name}$`, 'i') }, // Case insensitive
      'address.city': { $regex: new RegExp(`^${city}$`, 'i') } // Using nested object for city? Or flat 'city'?
    };
    
    // Hospital schema has flat 'city' field or nested 'address'?
    // Let's check Hospital model. It has 'city' at top level AND could have nested address?
    // Looking at schema: It has: street, city, state, zipCode, country at top level? No, wait.
    // Schema: 
    //   street: String, city: String, state: String...
    //   But sanitizeHospitalData creates 'address' object. 
    //   If Hospital model uses flat fields, sanitize method is creating object structure that might not match directly?
    //   Schema has 'street': String, 'city': String.
    //   Let's check `ValidationService.sanitizeHospitalData`. It returns address: { street: ... }.
    //   If `Hospital.create` accepts this, Mongoose schema should support nested creation or flat fields.
    //   Wait, schema (Step 154) has flat fields: street, city, state.
    //   If I pass { address: { street: ... } } to `Hospital.create`, Mongoose won't automatically map it to flat fields unless we handle it.
    //   However, let's assume `checkDuplicateHospital` checks `city` field.
    //   The SQL limit was `LOWER(name) = LOWER(?) AND LOWER(city) = LOWER(?)`.
    
    // Assuming flat city field based on schema viewing.
    const duplicateQuery = {
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        city: { $regex: new RegExp(`^${city.trim()}$`, 'i') }
    };

    if (excludeId) {
      duplicateQuery._id = { $ne: excludeId };
    }

    const existing = await Hospital.findOne(duplicateQuery);
    return !!existing;
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
    return true; // Phone validation rules removed
  }

  // Sanitize input data
  static sanitizeHospitalData(hospitalData) {
    // Flatten address and contact for schema compatibility if needed, 
    // or keep nested if schema supports it or we use mapped object.
    // Hospital Schema (Step 154) uses FLAT fields: street, city, state...
    // But this sanitizer produces nested structure.
    // We should probably flatten it here to match Schema or update Schema.
    // Given the task is Refactor, and Schema has flat fields, I should flatten here.
    
    return {
      name: hospitalData.name?.trim(),
      description: hospitalData.description?.trim() || '',
      type: hospitalData.type?.trim() || 'General',
      street: hospitalData.address?.street?.trim(),
      city: hospitalData.address?.city?.trim(),
      state: hospitalData.address?.state?.trim(),
      zipCode: hospitalData.address?.zipCode?.trim(),
      country: hospitalData.address?.country?.trim() || 'Bangladesh',
      phone: hospitalData.contact?.phone?.trim(),
      email: hospitalData.contact?.email?.trim().toLowerCase(),
      emergency: hospitalData.contact?.emergency?.trim(),
      services: Array.isArray(hospitalData.services) ? 
        hospitalData.services.map(s => s.trim()).filter(s => s) : [],
      // Capacity is also flat in Schema: total_beds, icu_beds, operation_theaters
      total_beds: parseInt(hospitalData.capacity?.totalBeds) || 0,
      icu_beds: parseInt(hospitalData.capacity?.icuBeds) || 0,
      operation_theaters: parseInt(hospitalData.capacity?.operationTheaters) || 0
    };
  }

  // Validate user permissions for hospital operations
  static async validateHospitalAccess(userId, hospitalId, operation) {
    const user = await User.findById(userId);
    if (!user) return false;

    // Admin can do everything
    if (user.userType === 'admin') return true;

    // Hospital authority can only access their own hospital
    if (user.userType === 'hospital-authority') {
      if (operation === 'create' && user.hospital_id) return false; // Already has hospital
      // Compare ObjectIds as strings
      if (operation !== 'create' && (!user.hospital_id || user.hospital_id.toString() !== hospitalId.toString())) return false;
      return true;
    }

    return false;
  }

  // Check approval status integrity
  static async validateApprovalIntegrity(hospitalId) {
    const hospital = await Hospital.findById(hospitalId);

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

  // Validate rapid assistance eligibility
  static validateRapidAssistanceEligibility(patientAge, rapidAssistance) {
    if (!rapidAssistance) {
      return { isValid: true, errors: [] };
    }

    const errors = [];

    // Check if patient age is provided and valid
    if (patientAge === undefined || patientAge === null) {
      errors.push('Patient age is required to determine Rapid Assistance eligibility');
    } else if (typeof patientAge !== 'number' || isNaN(patientAge)) {
      errors.push('Invalid patient age detected');
    } else if (patientAge < 60) {
      errors.push('Invalid Rapid Assistance selection detected. Please ensure you meet the age requirements. Note: Rapid Assistance is exclusively available for patients aged 60 and above to ensure appropriate care for senior citizens.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Calculate rapid assistance charge
  static calculateRapidAssistanceCharge(rapidAssistance) {
    return rapidAssistance ? 200 : 0;
  }
}

module.exports = ValidationService;