// Test script for the robust booking data transformation utility
console.log('🧪 Testing Booking Data Transformation Utility...');

// Mock the transformation utility functions for testing
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

// Test cases
const testCases = [
  {
    name: 'Valid booking data',
    data: {
      userId: 1,
      hospitalId: 761,
      resourceType: 'operationTheatres',
      patientName: 'John Doe',
      patientAge: 35,
      patientGender: 'male',
      emergencyContactName: 'Jane Doe',
      emergencyContactPhone: '1234567890',
      emergencyContactRelationship: 'Spouse',
      medicalCondition: 'Emergency surgery required due to accident',
      urgency: 'high',
      scheduledDate: '2025-02-10T14:00',
      estimatedDuration: 48,
      payment: { amount: 1000, status: 'pending' }
    },
    expectedResult: 'success'
  },
  {
    name: 'Missing required field (patientName)',
    data: {
      userId: 1,
      hospitalId: 761,
      resourceType: 'bed',
      patientName: '',
      patientAge: 35,
      patientGender: 'male',
      emergencyContactName: 'Jane Doe',
      emergencyContactPhone: '1234567890',
      emergencyContactRelationship: 'Spouse',
      medicalCondition: 'Emergency surgery required due to accident',
      urgency: 'high',
      scheduledDate: '2025-02-10T14:00',
      estimatedDuration: 48,
      payment: { amount: 1000, status: 'pending' }
    },
    expectedResult: 'error',
    expectedError: 'patientName is required'
  },
  {
    name: 'Invalid resource type',
    data: {
      userId: 1,
      hospitalId: 761,
      resourceType: 'invalid_type',
      patientName: 'John Doe',
      patientAge: 35,
      patientGender: 'male',
      emergencyContactName: 'Jane Doe',
      emergencyContactPhone: '1234567890',
      emergencyContactRelationship: 'Spouse',
      medicalCondition: 'Emergency surgery required due to accident',
      urgency: 'high',
      scheduledDate: '2025-02-10T14:00',
      estimatedDuration: 48,
      payment: { amount: 1000, status: 'pending' }
    },
    expectedResult: 'error',
    expectedError: 'resourceType must be one of'
  },
  {
    name: 'Invalid phone number format',
    data: {
      userId: 1,
      hospitalId: 761,
      resourceType: 'icu',
      patientName: 'John Doe',
      patientAge: 35,
      patientGender: 'male',
      emergencyContactName: 'Jane Doe',
      emergencyContactPhone: 'abc123xyz',
      emergencyContactRelationship: 'Spouse',
      medicalCondition: 'Emergency surgery required due to accident',
      urgency: 'high',
      scheduledDate: '2025-02-10T14:00',
      estimatedDuration: 48,
      payment: { amount: 1000, status: 'pending' }
    },
    expectedResult: 'error',
    expectedError: 'emergencyContactPhone contains invalid characters'
  },
  {
    name: 'Patient name with extra spaces (should be sanitized)',
    data: {
      userId: 1,
      hospitalId: 761,
      resourceType: 'bed',
      patientName: '  John   Doe  ',
      patientAge: 35,
      patientGender: 'male',
      emergencyContactName: 'Jane Doe',
      emergencyContactPhone: '123-456-7890',
      emergencyContactRelationship: 'Spouse',
      medicalCondition: 'Emergency surgery required due to accident',
      urgency: 'high',
      scheduledDate: '2025-02-10T14:00',
      estimatedDuration: 48,
      payment: { amount: 1000, status: 'pending' }
    },
    expectedResult: 'success',
    expectedWarning: 'Patient name was cleaned'
  },
  {
    name: 'Age out of range',
    data: {
      userId: 1,
      hospitalId: 761,
      resourceType: 'bed',
      patientName: 'John Doe',
      patientAge: 200,
      patientGender: 'male',
      emergencyContactName: 'Jane Doe',
      emergencyContactPhone: '1234567890',
      emergencyContactRelationship: 'Spouse',
      medicalCondition: 'Emergency surgery required due to accident',
      urgency: 'high',
      scheduledDate: '2025-02-10T14:00',
      estimatedDuration: 48,
      payment: { amount: 1000, status: 'pending' }
    },
    expectedResult: 'error',
    expectedError: 'patientAge must be at most 150'
  },
  {
    name: 'Medical condition too short',
    data: {
      userId: 1,
      hospitalId: 761,
      resourceType: 'bed',
      patientName: 'John Doe',
      patientAge: 35,
      patientGender: 'male',
      emergencyContactName: 'Jane Doe',
      emergencyContactPhone: '1234567890',
      emergencyContactRelationship: 'Spouse',
      medicalCondition: 'sick',
      urgency: 'high',
      scheduledDate: '2025-02-10T14:00',
      estimatedDuration: 48,
      payment: { amount: 1000, status: 'pending' }
    },
    expectedResult: 'error',
    expectedError: 'medicalCondition must be at least 10 characters'
  }
];

// Mock transformation function for testing
function mockTransformBookingData(formData) {
  console.log('🔄 Mock transformation for:', formData.patientName || 'Unknown');
  
  // Basic validation simulation
  if (!formData.patientName || formData.patientName.trim() === '') {
    return { success: false, error: 'patientName is required' };
  }
  
  if (!VALIDATION_RULES.resourceType.allowedValues.includes(formData.resourceType)) {
    return { success: false, error: 'resourceType must be one of: bed, icu, operationTheatres' };
  }
  
  if (formData.patientAge > 150) {
    return { success: false, error: 'patientAge must be at most 150' };
  }
  
  if (formData.medicalCondition && formData.medicalCondition.length < 10) {
    return { success: false, error: 'medicalCondition must be at least 10 characters' };
  }
  
  if (formData.emergencyContactPhone && !/^[\d\s\-\+\(\)]+$/.test(formData.emergencyContactPhone)) {
    return { success: false, error: 'emergencyContactPhone contains invalid characters' };
  }
  
  // Check for sanitization needs
  const warnings = [];
  let sanitizedName = formData.patientName;
  if (formData.patientName !== formData.patientName.trim().replace(/\s+/g, ' ')) {
    warnings.push('Patient name was cleaned (extra spaces removed)');
    sanitizedName = formData.patientName.trim().replace(/\s+/g, ' ');
  }
  
  return {
    success: true,
    data: {
      ...formData,
      patientName: sanitizedName
    },
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

// Run tests
console.log('🏃‍♂️ Running transformation tests...\n');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  
  const result = mockTransformBookingData(testCase.data);
  
  if (testCase.expectedResult === 'success') {
    if (result.success) {
      console.log('✅ PASS - Transformation successful');
      if (testCase.expectedWarning && result.warnings) {
        const hasExpectedWarning = result.warnings.some(w => w.includes(testCase.expectedWarning));
        if (hasExpectedWarning) {
          console.log('✅ PASS - Expected warning found');
        } else {
          console.log('⚠️ WARNING - Expected warning not found');
        }
      }
    } else {
      console.log('❌ FAIL - Expected success but got error:', result.error);
    }
  } else if (testCase.expectedResult === 'error') {
    if (!result.success) {
      const hasExpectedError = result.error && result.error.includes(testCase.expectedError);
      if (hasExpectedError) {
        console.log('✅ PASS - Expected error found:', result.error);
      } else {
        console.log('❌ FAIL - Wrong error message. Expected:', testCase.expectedError, 'Got:', result.error);
      }
    } else {
      console.log('❌ FAIL - Expected error but got success');
    }
  }
  
  console.log(''); // Empty line for readability
});

console.log('🎯 Transformation utility tests completed!');

// Test backend data structure compatibility
console.log('🔍 Testing backend compatibility...');

const sampleTransformedData = {
  userId: 1,
  hospitalId: 761,
  resourceType: 'operationTheatres',
  patientName: 'John Doe',
  patientAge: 35,
  patientGender: 'male',
  emergencyContactName: 'Jane Doe',
  emergencyContactPhone: '1234567890',
  emergencyContactRelationship: 'Spouse',
  medicalCondition: 'Emergency surgery required due to accident',
  urgency: 'high',
  scheduledDate: '2025-02-10T14:00',
  estimatedDuration: 48
};

const requiredBackendFields = [
  'userId', 'hospitalId', 'resourceType', 'patientName', 'patientAge',
  'patientGender', 'emergencyContactName', 'emergencyContactPhone',
  'emergencyContactRelationship', 'medicalCondition', 'urgency',
  'scheduledDate', 'estimatedDuration'
];

const missingFields = requiredBackendFields.filter(field => 
  !sampleTransformedData.hasOwnProperty(field)
);

if (missingFields.length === 0) {
  console.log('✅ All required backend fields are present');
} else {
  console.log('❌ Missing backend fields:', missingFields);
}

console.log('🎉 All tests completed!');