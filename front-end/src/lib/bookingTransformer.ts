import { BookingFormData } from './types';

// Interface for transformation result
export interface TransformationResult {
  success: boolean;
  data?: BackendBookingData;
  error?: string;
  warnings?: string[];
}

// Backend expected data structure
export interface BackendBookingData {
  userId: number;
  hospitalId: number;
  resourceType: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  medicalCondition: string;
  urgency: string;
  scheduledDate: string;
  estimatedDuration: number;
  surgeonId?: number;
  notes?: string;
}

// Validation rules for each field
const VALIDATION_RULES = {
  userId: { min: 1, required: true },
  hospitalId: { min: 1, required: true },
  resourceType: { 
    required: true, 
    allowedValues: ['bed', 'icu', 'operationTheatres'] 
  },
  patientName: { 
    required: true, 
    minLength: 2, 
    maxLength: 100,
    pattern: /^[a-zA-Z\s\-'\.]+$/
  },
  patientAge: { min: 0, max: 150, required: true },
  patientGender: { 
    required: true, 
    allowedValues: ['male', 'female', 'other'] 
  },
  emergencyContactName: { 
    required: true, 
    minLength: 2, 
    maxLength: 100 
  },
  emergencyContactPhone: { 
    required: true, 
    minLength: 10, 
    maxLength: 15,
    pattern: /^[\d\s\-\+\(\)]+$/
  },
  emergencyContactRelationship: { 
    required: true, 
    minLength: 2, 
    maxLength: 50 
  },
  medicalCondition: { 
    required: true, 
    minLength: 10, 
    maxLength: 1000 
  },
  urgency: { 
    required: true, 
    allowedValues: ['low', 'medium', 'high', 'critical'] 
  },
  scheduledDate: { required: true },
  estimatedDuration: { min: 1, max: 720, required: true }
};

/**
 * Validates a single field value against its rules
 */
function validateField(fieldName: string, value: any): { valid: boolean; error?: string } {
  const rules = VALIDATION_RULES[fieldName as keyof typeof VALIDATION_RULES];
  if (!rules) return { valid: true };

  // Check if required field is missing
  if (rules.required && (value === undefined || value === null || value === '')) {
    return { valid: false, error: `${fieldName} is required` };
  }

  // Skip other validations if field is not required and empty
  if (!rules.required && (value === undefined || value === null || value === '')) {
    return { valid: true };
  }

  // Check allowed values
  if (rules.allowedValues && !rules.allowedValues.includes(value)) {
    return { 
      valid: false, 
      error: `${fieldName} must be one of: ${rules.allowedValues.join(', ')}` 
    };
  }

  // Check string length
  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      return { 
        valid: false, 
        error: `${fieldName} must be at least ${rules.minLength} characters` 
      };
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      return { 
        valid: false, 
        error: `${fieldName} must be less than ${rules.maxLength} characters` 
      };
    }
    if (rules.pattern && !rules.pattern.test(value)) {
      return { 
        valid: false, 
        error: `${fieldName} contains invalid characters` 
      };
    }
  }

  // Check numeric ranges
  if (typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      return { 
        valid: false, 
        error: `${fieldName} must be at least ${rules.min}` 
      };
    }
    if (rules.max !== undefined && value > rules.max) {
      return { 
        valid: false, 
        error: `${fieldName} must be at most ${rules.max}` 
      };
    }
  }

  return { valid: true };
}

/**
 * Validates scheduled date is in the future
 */
function validateScheduledDate(dateString: string): { valid: boolean; error?: string } {
  try {
    const scheduledDate = new Date(dateString);
    const now = new Date();
    
    if (isNaN(scheduledDate.getTime())) {
      return { valid: false, error: 'Invalid date format' };
    }
    
    if (scheduledDate <= now) {
      return { valid: false, error: 'Scheduled date must be in the future' };
    }
    
    // Check if date is too far in the future (1 year)
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    
    if (scheduledDate > oneYearFromNow) {
      return { valid: false, error: 'Scheduled date cannot be more than 1 year in the future' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid date format' };
  }
}

/**
 * Sanitizes string input by trimming and removing extra spaces
 */
function sanitizeString(value: string): string {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Sanitizes phone number by removing non-digit characters except +, -, (, ), and spaces
 */
function sanitizePhoneNumber(phone: string): string {
  if (typeof phone !== 'string') return phone;
  return phone.trim().replace(/[^\d\s\-\+\(\)]/g, '');
}

/**
 * Main transformation function with comprehensive validation and error handling
 */
export function transformBookingData(formData: BookingFormData): TransformationResult {
  console.log('🔄 Starting booking data transformation...');
  console.log('📥 Input data:', formData);
  
  const warnings: string[] = [];
  const errors: string[] = [];
  
  try {
    // Check if formData exists
    if (!formData || typeof formData !== 'object') {
      return {
        success: false,
        error: 'Invalid form data: data is missing or not an object'
      };
    }

    // Validate each field
    const fieldsToValidate = [
      'userId', 'hospitalId', 'resourceType', 'patientName', 'patientAge', 
      'patientGender', 'emergencyContactName', 'emergencyContactPhone', 
      'emergencyContactRelationship', 'medicalCondition', 'urgency', 
      'scheduledDate', 'estimatedDuration'
    ];

    for (const fieldName of fieldsToValidate) {
      const fieldValue = formData[fieldName as keyof BookingFormData];
      const validation = validateField(fieldName, fieldValue);
      
      if (!validation.valid) {
        errors.push(validation.error || `Invalid ${fieldName}`);
      }
    }

    // Special validation for scheduled date
    if (formData.scheduledDate) {
      const dateValidation = validateScheduledDate(formData.scheduledDate);
      if (!dateValidation.valid) {
        errors.push(dateValidation.error || 'Invalid scheduled date');
      }
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
      console.error('❌ Validation errors:', errors);
      return {
        success: false,
        error: `Validation failed: ${errors.join(', ')}`
      };
    }

    // Sanitize string fields
    const sanitizedData = {
      userId: formData.userId,
      hospitalId: formData.hospitalId,
      resourceType: formData.resourceType,
      patientName: sanitizeString(formData.patientName),
      patientAge: formData.patientAge,
      patientGender: formData.patientGender,
      emergencyContactName: sanitizeString(formData.emergencyContactName),
      emergencyContactPhone: sanitizePhoneNumber(formData.emergencyContactPhone),
      emergencyContactRelationship: sanitizeString(formData.emergencyContactRelationship),
      medicalCondition: sanitizeString(formData.medicalCondition),
      urgency: formData.urgency,
      scheduledDate: formData.scheduledDate,
      estimatedDuration: formData.estimatedDuration,
      // Optional fields
      surgeonId: formData.surgeonId || undefined,
      notes: undefined // Can be added later if needed
    };

    // Add warnings for any data modifications
    if (sanitizedData.patientName !== formData.patientName) {
      warnings.push('Patient name was cleaned (extra spaces removed)');
    }
    if (sanitizedData.emergencyContactPhone !== formData.emergencyContactPhone) {
      warnings.push('Phone number was cleaned (invalid characters removed)');
    }

    console.log('✅ Data transformation successful');
    console.log('📤 Output data:', sanitizedData);
    if (warnings.length > 0) {
      console.warn('⚠️ Warnings:', warnings);
    }

    return {
      success: true,
      data: sanitizedData,
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error) {
    console.error('❌ Unexpected error during transformation:', error);
    return {
      success: false,
      error: `Transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Validates transformed data before sending to API
 */
export function validateTransformedData(data: BackendBookingData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check all required fields are present
  const requiredFields = [
    'userId', 'hospitalId', 'resourceType', 'patientName', 'patientAge',
    'patientGender', 'emergencyContactName', 'emergencyContactPhone',
    'emergencyContactRelationship', 'medicalCondition', 'urgency',
    'scheduledDate', 'estimatedDuration'
  ];
  
  for (const field of requiredFields) {
    if (data[field as keyof BackendBookingData] === undefined || 
        data[field as keyof BackendBookingData] === null || 
        data[field as keyof BackendBookingData] === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Helper function to get user-friendly error messages
 */
export function getTransformationErrorMessage(error: string): string {
  const errorMappings: Record<string, string> = {
    'userId is required': 'User authentication is required. Please log in again.',
    'hospitalId is required': 'Please select a hospital before proceeding.',
    'resourceType must be one of': 'Please select a valid resource type (Bed, ICU, or Operation Theatre).',
    'patientName contains invalid characters': 'Patient name can only contain letters, spaces, hyphens, apostrophes, and periods.',
    'emergencyContactPhone contains invalid characters': 'Please enter a valid phone number with only digits, spaces, hyphens, parentheses, and plus signs.',
    'Scheduled date must be in the future': 'Please select a date and time in the future for your appointment.',
    'Invalid date format': 'Please select a valid date and time for your appointment.'
  };
  
  for (const [key, message] of Object.entries(errorMappings)) {
    if (error.includes(key)) {
      return message;
    }
  }
  
  return error; // Return original error if no mapping found
}