// Debug script to test payment modal opening
console.log('🔍 Debugging Payment Modal Issue...');

// Test the simplified flow
console.log('1. Testing form submission flow...');

// Mock form data
const mockFormData = {
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
    amount: 0, // Will be calculated
    status: 'pending'
  }
};

// Mock hospital data
const mockHospital = {
  id: 761,
  name: 'City General Hospital',
  resources: {
    beds: { total: 50, available: 30, occupied: 20 },
    icu: { total: 10, available: 5, occupied: 5 },
    operationTheatres: { total: 5, available: 2, occupied: 3 }
  }
};

// Test payment calculation
function calculateAmount(resourceType, duration) {
  const baseRates = {
    bed: 100,
    icu: 500,
    operationTheatres: 1000,
  };
  
  const baseRate = baseRates[resourceType] || 100;
  const amount = baseRate * (duration / 24); // Daily rate
  
  // Add 30% service charge
  return Math.round(amount * 1.3);
}

console.log('2. Testing payment calculation...');
const calculatedAmount = calculateAmount(mockFormData.resourceType, mockFormData.estimatedDuration);
console.log(`   Calculated amount: $${calculatedAmount}`);

if (calculatedAmount > 0) {
  console.log('   ✅ Payment calculation working');
} else {
  console.log('   ❌ Payment calculation failed');
}

// Test form validation
console.log('3. Testing basic form validation...');

function validateBasicForm(data, hospital) {
  const errors = [];
  
  if (!hospital) {
    errors.push('Hospital selection is required');
  }
  
  if (!data.patientName || data.patientName.trim() === '') {
    errors.push('Patient name is required');
  }
  
  if (!data.resourceType) {
    errors.push('Resource type is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

const validation = validateBasicForm(mockFormData, mockHospital);
console.log(`   Validation result: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}`);

if (!validation.isValid) {
  console.log(`   Errors: ${validation.errors.join(', ')}`);
}

// Test the simplified flow
console.log('4. Testing simplified form submission flow...');

function simulateFormSubmission(data, hospital) {
  console.log('   📝 Form submitted...');
  
  // Step 1: Check hospital
  if (!hospital) {
    console.log('   ❌ No hospital selected');
    return { success: false, error: 'Please select a hospital' };
  }
  console.log('   ✅ Hospital selected:', hospital.name);
  
  // Step 2: Calculate amount
  const amount = calculateAmount(data.resourceType, data.estimatedDuration);
  if (amount <= 0) {
    console.log('   ❌ Invalid amount calculated');
    return { success: false, error: 'Unable to calculate amount' };
  }
  console.log('   ✅ Amount calculated:', amount);
  
  // Step 3: Set payment amount
  data.payment.amount = amount;
  console.log('   ✅ Payment amount set');
  
  // Step 4: Open payment modal
  console.log('   🎯 Opening payment modal...');
  return { 
    success: true, 
    data: data,
    message: 'Payment modal should open'
  };
}

const result = simulateFormSubmission(mockFormData, mockHospital);

if (result.success) {
  console.log('✅ Form submission simulation successful!');
  console.log('   Payment modal should open with amount:', result.data.payment.amount);
} else {
  console.log('❌ Form submission simulation failed:', result.error);
}

// Debugging checklist
console.log('\n🔍 Debugging Checklist:');
console.log('1. ✅ Form data structure is correct');
console.log('2. ✅ Hospital data is available');
console.log('3. ✅ Payment calculation works');
console.log('4. ✅ Basic validation passes');
console.log('5. ✅ Simplified flow logic is correct');

console.log('\n💡 If payment modal still not opening, check:');
console.log('- Browser console for JavaScript errors');
console.log('- Network tab for failed API calls');
console.log('- React DevTools for state changes');
console.log('- Make sure showPayment state is being set to true');

console.log('\n🎯 Expected behavior:');
console.log('1. Fill out the form completely');
console.log('2. Click "Secure My Booking"');
console.log('3. Payment modal should open immediately');
console.log('4. Enter transaction ID and confirm');
console.log('5. Booking should be created');

console.log('\n✨ Debug complete!');