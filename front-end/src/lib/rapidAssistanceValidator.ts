/**
 * Rapid Assistance Validation Utility
 * Provides comprehensive validation for rapid assistance eligibility
 */

export interface ValidationResult {
  isValid: boolean;
  errorType?: string;
  errorMessage?: string;
}

export interface BookingData {
  age?: number | null;
  rapidAssistance?: boolean;
  paymentAmount?: number;
}

/**
 * Check if a patient is eligible for rapid assistance (60+ years)
 */
export function isSeniorCitizen(age?: number | null): boolean {
  return age != null && age >= 60;
}

/**
 * Validate rapid assistance eligibility with comprehensive error handling
 */
export function validateRapidAssistanceEligibility(
  bookingData: BookingData,
  rapidAssistance: boolean
): ValidationResult {
  // Skip validation if rapid assistance is not selected
  if (!rapidAssistance) {
    return { isValid: true };
  }

  // Validate age is provided
  if (bookingData.age == null || bookingData.age === undefined) {
    return {
      isValid: false,
      errorType: 'age_missing',
      errorMessage: 'Patient age is required to determine Rapid Assistance eligibility. Please contact support if age information is missing.'
    };
  }

  // Validate age is a valid number
  if (typeof bookingData.age !== 'number' || bookingData.age < 0 || bookingData.age > 150) {
    return {
      isValid: false,
      errorType: 'age_invalid',
      errorMessage: 'Invalid patient age detected. Please contact support to verify age information.'
    };
  }

  // Validate senior citizen eligibility (60+)
  if (!isSeniorCitizen(bookingData.age)) {
    return {
      isValid: false,
      errorType: 'age_ineligible',
      errorMessage: `Rapid Assistance is only available for patients aged 60 and above. Current patient age: ${bookingData.age} years.`
    };
  }

  return { isValid: true };
}

/**
 * Validate payment calculation with rapid assistance
 */
export function validatePaymentCalculation(
  baseAmount: number,
  rapidAssistance: boolean,
  rapidAssistanceCharge: number = 200
): ValidationResult {
  const expectedTotal = baseAmount + (rapidAssistance ? rapidAssistanceCharge : 0);
  
  if (expectedTotal < 0) {
    return {
      isValid: false,
      errorType: 'calculation_error',
      errorMessage: 'Invalid payment calculation detected.'
    };
  }

  return { isValid: true };
}

/**
 * Comprehensive validation for rapid assistance feature
 */
export function validateRapidAssistance(
  bookingData: BookingData,
  rapidAssistance: boolean
): ValidationResult {
  // First validate eligibility
  const eligibilityResult = validateRapidAssistanceEligibility(bookingData, rapidAssistance);
  if (!eligibilityResult.isValid) {
    return eligibilityResult;
  }

  // Then validate payment calculation if rapid assistance is selected
  if (rapidAssistance && bookingData.paymentAmount) {
    const paymentResult = validatePaymentCalculation(bookingData.paymentAmount, rapidAssistance);
    if (!paymentResult.isValid) {
      return paymentResult;
    }
  }

  return { isValid: true };
}

/**
 * Get error message for specific error types
 */
export function getErrorMessage(errorType: string, age?: number): string {
  switch (errorType) {
    case 'age_missing':
      return 'Patient age is required to determine Rapid Assistance eligibility. Please contact support if age information is missing.';
    case 'age_invalid':
      return 'Invalid patient age detected. Please contact support to verify age information.';
    case 'age_ineligible':
      return `Rapid Assistance is only available for patients aged 60 and above. Current patient age: ${age} years.`;
    case 'calculation_error':
      return 'Payment calculation error detected for Rapid Assistance. Please refresh the page and try again.';
    case 'validation_failed':
      return 'Rapid Assistance validation failed. Service is only available for patients aged 60 and above.';
    case 'manipulation_detected':
      return 'Invalid Rapid Assistance selection detected. Please ensure you meet the age requirements.';
    default:
      return 'An error occurred with Rapid Assistance selection. Please try again.';
  }
}

/**
 * Test cases for validation
 */
export const testCases = [
  {
    name: 'Valid senior citizen (65 years)',
    bookingData: { age: 65, paymentAmount: 1000 },
    rapidAssistance: true,
    expected: { isValid: true }
  },
  {
    name: 'Boundary case (exactly 60 years)',
    bookingData: { age: 60, paymentAmount: 1000 },
    rapidAssistance: true,
    expected: { isValid: true }
  },
  {
    name: 'Ineligible patient (45 years)',
    bookingData: { age: 45, paymentAmount: 1000 },
    rapidAssistance: true,
    expected: { isValid: false, errorType: 'age_ineligible' }
  },
  {
    name: 'Missing age',
    bookingData: { age: null, paymentAmount: 1000 },
    rapidAssistance: true,
    expected: { isValid: false, errorType: 'age_missing' }
  },
  {
    name: 'Invalid age (negative)',
    bookingData: { age: -5, paymentAmount: 1000 },
    rapidAssistance: true,
    expected: { isValid: false, errorType: 'age_invalid' }
  },
  {
    name: 'Invalid age (too high)',
    bookingData: { age: 200, paymentAmount: 1000 },
    rapidAssistance: true,
    expected: { isValid: false, errorType: 'age_invalid' }
  },
  {
    name: 'No rapid assistance selected',
    bookingData: { age: 45, paymentAmount: 1000 },
    rapidAssistance: false,
    expected: { isValid: true }
  }
];

/**
 * Run all test cases
 */
export function runValidationTests(): { passed: number; failed: number; results: any[] } {
  const results = testCases.map(testCase => {
    const result = validateRapidAssistance(testCase.bookingData, testCase.rapidAssistance);
    const passed = result.isValid === testCase.expected.isValid &&
                  (!testCase.expected.errorType || result.errorType === testCase.expected.errorType);
    
    return {
      name: testCase.name,
      passed,
      expected: testCase.expected,
      actual: result
    };
  });

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return { passed, failed, results };
}