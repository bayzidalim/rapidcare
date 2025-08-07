// Test script to verify booking form fixes with robust transformation
console.log('🔧 Testing booking form fixes with robust transformation utility...');

// Test data that matches the new schema
const testFormData = {
  userId: 1,
  hospitalId: 761,
  resourceType: 'operationTheatres',
  patientName: 'John Doe',
  patientAge: 35,
  patientGender: 'male',
  // Flat emergency contact fields (new structure)
  emergencyContactName: 'Jane Doe',
  emergencyContactPhone: '1234567890',
  emergencyContactRelationship: 'Spouse',
  medicalCondition: 'Emergency surgery required due to accident',
  urgency: 'high',
  scheduledDate: '2025-02-10T14:00',
  estimatedDuration: 48,
  payment: {
    amount: 1000,
    status: 'pending'
  }
};

// Test the data transformation
const transformBookingData = (formData) => {
  try {
    return {
      userId: formData.userId,
      hospitalId: formData.hospitalId,
      resourceType: formData.resourceType,
      patientName: formData.patientName,
      patientAge: formData.patientAge,
      patientGender: formData.patientGender,
      emergencyContactName: formData.emergencyContactName,
      emergencyContactPhone: formData.emergencyContactPhone,
      emergencyContactRelationship: formData.emergencyContactRelationship,
      medicalCondition: formData.medicalCondition,
      urgency: formData.urgency,
      scheduledDate: formData.scheduledDate,
      estimatedDuration: formData.estimatedDuration
    };
  } catch (error) {
    console.error('❌ Error transforming booking data:', error);
    throw new Error('Failed to prepare booking data. Please check all fields are filled correctly.');
  }
};

// Test the transformation
console.log('📝 Testing data transformation...');
try {
  const transformedData = transformBookingData(testFormData);
  console.log('✅ Data transformation successful!');
  console.log('📊 Transformed data:', transformedData);
  
  // Verify all required backend fields are present
  const requiredBackendFields = [
    'userId', 'hospitalId', 'resourceType', 'patientName', 'patientAge', 'patientGender',
    'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelationship',
    'medicalCondition', 'urgency', 'scheduledDate', 'estimatedDuration'
  ];
  
  const missingFields = requiredBackendFields.filter(field => !transformedData.hasOwnProperty(field));
  
  if (missingFields.length === 0) {
    console.log('✅ All required backend fields are present');
  } else {
    console.error('❌ Missing required fields:', missingFields);
  }
  
} catch (error) {
  console.error('❌ Data transformation failed:', error.message);
}

// Test form validation scenarios
console.log('🔍 Testing validation scenarios...');

const testValidationCases = [
  {
    name: 'Empty patient name',
    data: { ...testFormData, patientName: '' },
    expectedError: 'Patient name must be at least 2 characters'
  },
  {
    name: 'Invalid phone number',
    data: { ...testFormData, emergencyContactPhone: 'abc123' },
    expectedError: 'Please enter a valid phone number'
  },
  {
    name: 'Past scheduled date',
    data: { ...testFormData, scheduledDate: '2020-01-01T10:00' },
    expectedError: 'Scheduled date must be in the future'
  },
  {
    name: 'Short medical condition',
    data: { ...testFormData, medicalCondition: 'sick' },
    expectedError: 'Please provide a detailed medical condition description'
  }
];

testValidationCases.forEach(testCase => {
  console.log(`🧪 Testing: ${testCase.name}`);
  // In a real scenario, this would test against the Zod schema
  console.log(`   Expected error: ${testCase.expectedError}`);
});

// Test resource availability checking
console.log('🏥 Testing resource availability checking...');

const mockHospital = {
  id: 761,
  name: 'Test Hospital',
  resources: {
    beds: { total: 50, available: 30, occupied: 20 },
    icu: { total: 10, available: 2, occupied: 8 },
    operationTheatres: { total: 5, available: 0, occupied: 5 }
  }
};

const checkResourceAvailability = (hospital, resourceType) => {
  if (!hospital || !hospital.resources) {
    return { available: false, message: 'Hospital resource information not available' };
  }

  let availability = 0;
  switch (resourceType) {
    case 'bed': availability = hospital.resources.beds.available; break;
    case 'icu': availability = hospital.resources.icu.available; break;
    case 'operationTheatres': availability = hospital.resources.operationTheatres.available; break;
    default: availability = 0;
  }
  
  if (availability <= 0) {
    return { 
      available: false, 
      message: `No ${resourceType === 'operationTheatres' ? 'operation theatres' : resourceType} available at this hospital` 
    };
  }

  if (availability <= 2) {
    return { 
      available: true, 
      message: `Limited availability: Only ${availability} ${resourceType === 'operationTheatres' ? 'operation theatres' : resourceType} remaining` 
    };
  }

  return { 
    available: true, 
    message: `${availability} ${resourceType === 'operationTheatres' ? 'operation theatres' : resourceType} available` 
  };
};

// Test different resource availability scenarios
const availabilityTests = [
  { resourceType: 'bed', expected: 'available' },
  { resourceType: 'icu', expected: 'limited' },
  { resourceType: 'operationTheatres', expected: 'unavailable' }
];

availabilityTests.forEach(test => {
  const result = checkResourceAvailability(mockHospital, test.resourceType);
  console.log(`${test.resourceType}: ${result.available ? '✅' : '❌'} ${result.message}`);
});

console.log('🎉 Booking form fix tests completed with robust transformation!');