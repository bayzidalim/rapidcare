import { BookingFormData, Hospital } from './types';

export interface PaymentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  calculatedAmount?: number;
}

/**
 * Validates booking data before payment processing
 */
export function validateBookingForPayment(
  bookingData: BookingFormData,
  selectedHospital: Hospital | null
): PaymentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if booking data exists
  if (!bookingData) {
    errors.push('Booking data is missing');
    return { isValid: false, errors, warnings };
  }

  // Check if hospital is selected
  if (!selectedHospital) {
    errors.push('Hospital selection is required');
    return { isValid: false, errors, warnings };
  }

  // Validate required fields
  const requiredFields = [
    { field: 'patientName', value: bookingData.patientName, name: 'Patient name' },
    { field: 'patientAge', value: bookingData.patientAge, name: 'Patient age' },
    { field: 'patientGender', value: bookingData.patientGender, name: 'Patient gender' },
    { field: 'emergencyContactName', value: bookingData.emergencyContactName, name: 'Emergency contact name' },
    { field: 'emergencyContactPhone', value: bookingData.emergencyContactPhone, name: 'Emergency contact phone' },
    { field: 'emergencyContactRelationship', value: bookingData.emergencyContactRelationship, name: 'Emergency contact relationship' },
    { field: 'medicalCondition', value: bookingData.medicalCondition, name: 'Medical condition' },
    { field: 'urgency', value: bookingData.urgency, name: 'Urgency level' },
    { field: 'resourceType', value: bookingData.resourceType, name: 'Resource type' },
    { field: 'scheduledDate', value: bookingData.scheduledDate, name: 'Scheduled date' },
    { field: 'estimatedDuration', value: bookingData.estimatedDuration, name: 'Estimated duration' }
  ];

  for (const { field, value, name } of requiredFields) {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors.push(`${name} is required`);
    }
  }

  // Validate payment amount
  if (!bookingData.payment || !bookingData.payment.amount || bookingData.payment.amount <= 0) {
    errors.push('Payment amount must be calculated and greater than 0');
  }

  // Validate resource availability
  if (selectedHospital.resources) {
    const resourceAvailability = getResourceAvailability(selectedHospital, bookingData.resourceType);
    if (resourceAvailability <= 0) {
      errors.push(`No ${bookingData.resourceType} available at the selected hospital`);
    } else if (resourceAvailability <= 2) {
      warnings.push(`Limited availability: Only ${resourceAvailability} ${bookingData.resourceType} remaining`);
    }
  }

  // Validate scheduled date
  if (bookingData.scheduledDate) {
    const scheduledDate = new Date(bookingData.scheduledDate);
    const now = new Date();
    
    if (scheduledDate <= now) {
      errors.push('Scheduled date must be in the future');
    }
    
    // Check if date is too far in the future (1 year)
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    
    if (scheduledDate > oneYearFromNow) {
      warnings.push('Scheduled date is more than 1 year in the future');
    }
  }

  // Validate patient age
  if (bookingData.patientAge < 0 || bookingData.patientAge > 150) {
    errors.push('Patient age must be between 0 and 150');
  }

  // Validate duration
  if (bookingData.estimatedDuration < 1 || bookingData.estimatedDuration > 720) {
    errors.push('Estimated duration must be between 1 and 720 hours');
  }

  // Validate phone number format
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  if (bookingData.emergencyContactPhone && !phoneRegex.test(bookingData.emergencyContactPhone)) {
    errors.push('Emergency contact phone number contains invalid characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    calculatedAmount: bookingData.payment?.amount
  };
}

/**
 * Helper function to get resource availability
 */
function getResourceAvailability(hospital: Hospital, resourceType: string): number {
  if (!hospital.resources) return 0;
  
  switch (resourceType) {
    case 'bed': return hospital.resources.beds?.available || 0;
    case 'icu': return hospital.resources.icu?.available || 0;
    case 'operationTheatres': return hospital.resources.operationTheatres?.available || 0;
    default: return 0;
  }
}

/**
 * Simplified transaction ID validation for academic demonstration
 */
export function validateTransactionId(transactionId: string): { isValid: boolean; error?: string } {
  if (!transactionId || transactionId.trim() === '') {
    return { isValid: false, error: 'Transaction ID is required' };
  }

  const trimmedId = transactionId.trim();
  
  // Simple validation - just check if it's not empty and has reasonable length
  if (trimmedId.length < 3) {
    return { isValid: false, error: 'Transaction ID must be at least 3 characters' };
  }

  if (trimmedId.length > 100) {
    return { isValid: false, error: 'Transaction ID is too long' };
  }

  // For academic demo - accept any reasonable input
  return { isValid: true };
}

/**
 * Calculates payment breakdown
 */
export function calculatePaymentBreakdown(
  resourceType: string,
  duration: number,
  baseRates?: { [key: string]: number }
): {
  baseAmount: number;
  serviceCharge: number;
  totalAmount: number;
  breakdown: Array<{ description: string; amount: number }>;
} {
  const defaultRates = {
    bed: 100,
    icu: 500,
    operationTheatres: 1000,
  };

  const rates = baseRates || defaultRates;
  const baseRate = rates[resourceType] || rates.bed;
  const baseAmount = Math.round(baseRate * (duration / 24)); // Daily rate
  const serviceCharge = Math.round(baseAmount * 0.3); // 30% service charge
  const totalAmount = baseAmount + serviceCharge;

  const breakdown = [
    {
      description: `${resourceType === 'operationTheatres' ? 'Operation Theatre' : resourceType.toUpperCase()} (${duration} hours)`,
      amount: baseAmount
    },
    {
      description: 'Service Charge (30%)',
      amount: serviceCharge
    }
  ];

  return {
    baseAmount,
    serviceCharge,
    totalAmount,
    breakdown
  };
}

/**
 * Formats currency amount for display
 */
export function formatCurrency(amount: number, currency: string = '৳'): string {
  return `${currency}${amount.toLocaleString()}`;
}