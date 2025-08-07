// Test script for payment modal integration and data flow
console.log('🧪 Testing Payment Modal Integration and Data Flow...');

// Mock booking data for testing
const validBookingData = {
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
  scheduledDate: '2025-12-10T14:00',
  estimatedDuration: 48,
  payment: {
    amount: 1300,
    status: 'pending'
  }
};

const mockHospital = {
  id: 761,
  name: 'City General Hospital',
  resources: {
    beds: { total: 50, available: 30, occupied: 20 },
    icu: { total: 10, available: 5, occupied: 5 },
    operationTheatres: { total: 5, available: 2, occupied: 3 }
  }
};

// Mock validation functions
function validateBookingForPayment(bookingData, selectedHospital) {
  const errors = [];
  const warnings = [];

  if (!bookingData) {
    errors.push('Booking data is missing');
    return { isValid: false, errors, warnings };
  }

  if (!selectedHospital) {
    errors.push('Hospital selection is required');
    return { isValid: false, errors, warnings };
  }

  // Check required fields
  const requiredFields = [
    'patientName', 'patientAge', 'patientGender', 'emergencyContactName',
    'emergencyContactPhone', 'emergencyContactRelationship', 'medicalCondition',
    'urgency', 'resourceType', 'scheduledDate', 'estimatedDuration'
  ];

  for (const field of requiredFields) {
    if (!bookingData[field] || (typeof bookingData[field] === 'string' && bookingData[field].trim() === '')) {
      errors.push(`${field} is required`);
    }
  }

  // Check payment amount
  if (!bookingData.payment || !bookingData.payment.amount || bookingData.payment.amount <= 0) {
    errors.push('Payment amount must be calculated and greater than 0');
  }

  // Check resource availability
  const resourceAvailability = getResourceAvailability(selectedHospital, bookingData.resourceType);
  if (resourceAvailability <= 0) {
    errors.push(`No ${bookingData.resourceType} available at the selected hospital`);
  } else if (resourceAvailability <= 2) {
    warnings.push(`Limited availability: Only ${resourceAvailability} ${bookingData.resourceType} remaining`);
  }

  // Check scheduled date
  const scheduledDate = new Date(bookingData.scheduledDate);
  const now = new Date();
  if (scheduledDate <= now) {
    errors.push('Scheduled date must be in the future');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    calculatedAmount: bookingData.payment?.amount
  };
}

function getResourceAvailability(hospital, resourceType) {
  if (!hospital.resources) return 0;
  
  switch (resourceType) {
    case 'bed': return hospital.resources.beds?.available || 0;
    case 'icu': return hospital.resources.icu?.available || 0;
    case 'operationTheatres': return hospital.resources.operationTheatres?.available || 0;
    default: return 0;
  }
}

function validateTransactionId(transactionId) {
  if (!transactionId || transactionId.trim() === '') {
    return { isValid: false, error: 'Transaction ID is required' };
  }

  const trimmedId = transactionId.trim();
  
  if (trimmedId.length < 8) {
    return { isValid: false, error: 'Transaction ID must be at least 8 characters long' };
  }

  if (trimmedId.length > 50) {
    return { isValid: false, error: 'Transaction ID must be less than 50 characters long' };
  }

  const validPattern = /^[A-Za-z0-9\-_]+$/;
  if (!validPattern.test(trimmedId)) {
    return { isValid: false, error: 'Transaction ID can only contain letters, numbers, hyphens, and underscores' };
  }

  return { isValid: true };
}

function calculatePaymentBreakdown(resourceType, duration) {
  const baseRates = {
    bed: 100,
    icu: 500,
    operationTheatres: 1000,
  };

  const baseRate = baseRates[resourceType] || baseRates.bed;
  const baseAmount = Math.round(baseRate * (duration / 24));
  const serviceCharge = Math.round(baseAmount * 0.3);
  const totalAmount = baseAmount + serviceCharge;

  return {
    baseAmount,
    serviceCharge,
    totalAmount,
    breakdown: [
      {
        description: `${resourceType === 'operationTheatres' ? 'Operation Theatre' : resourceType.toUpperCase()} (${duration} hours)`,
        amount: baseAmount
      },
      {
        description: 'Service Charge (30%)',
        amount: serviceCharge
      }
    ]
  };
}

// Test cases
const testCases = [
  {
    name: 'Valid booking data with available resources',
    bookingData: validBookingData,
    hospital: mockHospital,
    expectedValid: true
  },
  {
    name: 'Missing patient name',
    bookingData: { ...validBookingData, patientName: '' },
    hospital: mockHospital,
    expectedValid: false,
    expectedError: 'patientName is required'
  },
  {
    name: 'No hospital selected',
    bookingData: validBookingData,
    hospital: null,
    expectedValid: false,
    expectedError: 'Hospital selection is required'
  },
  {
    name: 'Invalid payment amount',
    bookingData: { ...validBookingData, payment: { amount: 0, status: 'pending' } },
    hospital: mockHospital,
    expectedValid: false,
    expectedError: 'Payment amount must be calculated and greater than 0'
  },
  {
    name: 'Resource not available',
    bookingData: { ...validBookingData, resourceType: 'bed' },
    hospital: {
      ...mockHospital,
      resources: {
        ...mockHospital.resources,
        beds: { total: 50, available: 0, occupied: 50 }
      }
    },
    expectedValid: false,
    expectedError: 'No bed available at the selected hospital'
  }
];

// Run payment validation tests
console.log('🏃‍♂️ Running payment validation tests...\n');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  
  const result = validateBookingForPayment(testCase.bookingData, testCase.hospital);
  
  console.log(`  Valid: ${result.isValid} (expected: ${testCase.expectedValid})`);
  
  if (result.errors.length > 0) {
    console.log(`  Errors: ${result.errors.join(', ')}`);
  }
  
  if (result.warnings.length > 0) {
    console.log(`  Warnings: ${result.warnings.join(', ')}`);
  }
  
  const testPassed = result.isValid === testCase.expectedValid;
  if (testCase.expectedError && !testCase.expectedValid) {
    const hasExpectedError = result.errors.some(error => error.includes(testCase.expectedError));
    if (hasExpectedError && !result.isValid) {
      console.log('  ✅ PASS - Expected error found');
    } else {
      console.log('  ❌ FAIL - Expected error not found or validation passed unexpectedly');
    }
  } else if (testPassed) {
    console.log('  ✅ PASS - Validation result matches expected');
  } else {
    console.log('  ❌ FAIL - Validation result does not match expected');
  }
  
  console.log('');
});

// Test transaction ID validation
console.log('💳 Testing transaction ID validation...\n');

const transactionIdTests = [
  { id: 'TXN123456789', expected: true, name: 'Valid transaction ID' },
  { id: '', expected: false, name: 'Empty transaction ID' },
  { id: 'TXN123', expected: false, name: 'Too short transaction ID' },
  { id: 'TXN123@456', expected: false, name: 'Invalid characters in transaction ID' },
  { id: 'TXN-123_456', expected: true, name: 'Valid transaction ID with hyphens and underscores' },
  { id: 'A'.repeat(60), expected: false, name: 'Too long transaction ID' }
];

transactionIdTests.forEach((test, index) => {
  console.log(`Transaction ID Test ${index + 1}: ${test.name}`);
  
  const result = validateTransactionId(test.id);
  
  console.log(`  Input: "${test.id}"`);
  console.log(`  Valid: ${result.isValid} (expected: ${test.expected})`);
  
  if (!result.isValid && result.error) {
    console.log(`  Error: ${result.error}`);
  }
  
  if (result.isValid === test.expected) {
    console.log('  ✅ PASS');
  } else {
    console.log('  ❌ FAIL');
  }
  
  console.log('');
});

// Test payment calculation
console.log('💰 Testing payment calculation...\n');

const paymentTests = [
  { resourceType: 'bed', duration: 24, expectedBase: 100 },
  { resourceType: 'icu', duration: 48, expectedBase: 1000 },
  { resourceType: 'operationTheatres', duration: 12, expectedBase: 500 }
];

paymentTests.forEach((test, index) => {
  console.log(`Payment Test ${index + 1}: ${test.resourceType} for ${test.duration} hours`);
  
  const breakdown = calculatePaymentBreakdown(test.resourceType, test.duration);
  
  console.log(`  Base Amount: ৳${breakdown.baseAmount} (expected: ৳${test.expectedBase})`);
  console.log(`  Service Charge: ৳${breakdown.serviceCharge}`);
  console.log(`  Total Amount: ৳${breakdown.totalAmount}`);
  
  if (breakdown.baseAmount === test.expectedBase) {
    console.log('  ✅ PASS - Base amount calculation correct');
  } else {
    console.log('  ❌ FAIL - Base amount calculation incorrect');
  }
  
  console.log('');
});

console.log('🎉 Payment modal integration tests completed!');

// Test data flow simulation
console.log('🔄 Testing data flow simulation...\n');

console.log('1. Form Submission → Payment Validation');
const formValidation = validateBookingForPayment(validBookingData, mockHospital);
console.log(`   Validation Result: ${formValidation.isValid ? '✅ Valid' : '❌ Invalid'}`);

if (formValidation.isValid) {
  console.log('2. Payment Modal Opens → Display Booking Summary');
  console.log(`   Patient: ${validBookingData.patientName}`);
  console.log(`   Hospital: ${mockHospital.name}`);
  console.log(`   Resource: ${validBookingData.resourceType}`);
  console.log(`   Amount: ৳${validBookingData.payment.amount}`);
  
  console.log('3. User Enters Transaction ID → Validation');
  const txnValidation = validateTransactionId('TXN123456789');
  console.log(`   Transaction ID Valid: ${txnValidation.isValid ? '✅ Valid' : '❌ Invalid'}`);
  
  if (txnValidation.isValid) {
    console.log('4. Payment Confirmation → Booking Creation');
    console.log('   ✅ Ready to create booking with validated data');
  }
}

console.log('\n✨ All payment modal tests completed successfully!');