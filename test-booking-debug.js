// Debug script to test booking functionality
console.log('Testing booking form submission...');

// Test the form submission flow
const testBookingSubmission = () => {
  console.log('1. Form validation check...');
  
  // Check if form elements exist
  const form = document.querySelector('form');
  const submitButton = document.querySelector('button[type="submit"]');
  
  if (!form) {
    console.error('❌ Form not found');
    return;
  }
  
  if (!submitButton) {
    console.error('❌ Submit button not found');
    return;
  }
  
  console.log('✅ Form elements found');
  
  // Check form validation
  console.log('2. Checking form validation...');
  
  // Check required fields
  const requiredFields = [
    'hospitalId',
    'resourceType', 
    'patientName',
    'patientAge',
    'patientGender',
    'emergencyContact.name',
    'emergencyContact.phone',
    'emergencyContact.relationship',
    'medicalCondition',
    'urgency',
    'scheduledDate',
    'estimatedDuration'
  ];
  
  requiredFields.forEach(field => {
    const element = document.querySelector(`[name="${field}"]`);
    if (!element) {
      console.warn(`⚠️ Field ${field} not found`);
    } else {
      console.log(`✅ Field ${field} found, value: ${element.value}`);
    }
  });
  
  // Check for JavaScript errors
  console.log('3. Checking for JavaScript errors...');
  
  // Add event listener to form
  form.addEventListener('submit', (e) => {
    console.log('🚀 Form submit event triggered');
    console.log('Form data:', new FormData(form));
  });
  
  // Check if React Hook Form is working
  console.log('4. Checking React Hook Form...');
  
  // Look for React Hook Form errors in the DOM
  const errorElements = document.querySelectorAll('.text-red-600');
  if (errorElements.length > 0) {
    console.warn('⚠️ Validation errors found:');
    errorElements.forEach(error => {
      console.warn(`- ${error.textContent}`);
    });
  } else {
    console.log('✅ No validation errors visible');
  }
};

// Run the test when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', testBookingSubmission);
} else {
  testBookingSubmission();
}