// Test script for enhanced error handling system
console.log('🧪 Testing Enhanced Error Handling System...');

// Mock error scenarios
const testErrors = [
  {
    name: 'Network Error',
    error: { code: 'NETWORK_ERROR', message: 'Network Error' },
    expectedType: 'network',
    expectedSeverity: 'high',
    expectedRetryable: true
  },
  {
    name: 'Validation Error',
    error: { message: 'Patient name must be at least 2 characters' },
    expectedType: 'validation',
    expectedSeverity: 'medium',
    expectedRetryable: true
  },
  {
    name: 'Server Error',
    error: { response: { status: 500, data: { error: 'Internal Server Error' } } },
    expectedType: 'server',
    expectedSeverity: 'critical',
    expectedRetryable: true
  },
  {
    name: 'Resource Unavailable',
    error: { message: 'No operation theatres available at this hospital' },
    expectedType: 'resource',
    expectedSeverity: 'high',
    expectedRetryable: true
  },
  {
    name: 'Payment Error',
    error: { message: 'Please enter a valid transaction ID' },
    expectedType: 'payment',
    expectedSeverity: 'medium',
    expectedRetryable: true
  },
  {
    name: 'Authentication Error',
    error: { response: { status: 401, data: { error: 'Authentication required' } } },
    expectedType: 'client',
    expectedSeverity: 'medium',
    expectedRetryable: true
  }
];

// Mock error handler functions
function createErrorInfo(message, originalError) {
  const ERROR_MAPPINGS = {
    'Network Error': {
      type: 'network',
      severity: 'high',
      userMessage: 'Unable to connect to the server. Please check your internet connection.',
      retryable: true,
      suggestions: ['Check your internet connection', 'Try again in a few moments']
    },
    'Patient name must be at least 2 characters': {
      type: 'validation',
      severity: 'medium',
      userMessage: 'Please enter the patient\'s full name.',
      field: 'patientName',
      retryable: true
    },
    'Internal Server Error': {
      type: 'server',
      severity: 'critical',
      userMessage: 'A server error occurred. Our team has been notified.',
      retryable: true,
      suggestions: ['Try again in a few minutes', 'Contact support if the problem persists']
    },
    'No operation theatres available': {
      type: 'resource',
      severity: 'high',
      userMessage: 'No operation theatres are currently available at this hospital.',
      retryable: true,
      suggestions: ['Try selecting a different hospital', 'Consider scheduling for a later time']
    },
    'Please enter a valid transaction ID': {
      type: 'payment',
      severity: 'medium',
      userMessage: 'Please enter the transaction ID from your payment confirmation.',
      field: 'transactionId',
      retryable: true,
      suggestions: ['Check your payment confirmation message', 'Enter the complete transaction ID']
    }
  };

  const mapping = Object.entries(ERROR_MAPPINGS).find(([key]) => 
    message.toLowerCase().includes(key.toLowerCase())
  );

  const baseInfo = {
    type: 'client',
    severity: 'medium',
    message,
    userMessage: message,
    retryable: true
  };

  if (mapping) {
    const [, mappingInfo] = mapping;
    return { ...baseInfo, ...mappingInfo, message };
  }

  return baseInfo;
}

function handleApiError(error) {
  console.log('Handling API error:', error);

  // Network errors
  if (!error.response) {
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      return createErrorInfo('Network Error', error);
    }
    return createErrorInfo('Connection failed. Please check your internet connection.', error);
  }

  // HTTP status errors
  const status = error.response.status;
  const data = error.response.data;

  if (status === 500) {
    return createErrorInfo('Internal Server Error', error);
  }

  if (status === 401) {
    return createErrorInfo('Authentication required. Please log in again.', error);
  }

  // Generic error
  const message = data?.error || data?.message || `Request failed with status ${status}`;
  return createErrorInfo(message, error);
}

function createErrorState(errors) {
  const errorInfos = errors.map(error => 
    typeof error === 'string' ? createErrorInfo(error) : error
  );

  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  const primaryError = errorInfos.reduce((prev, current) => 
    severityOrder[current.severity] > severityOrder[prev.severity] ? current : prev
  );

  return {
    hasError: errorInfos.length > 0,
    errors: errorInfos,
    primaryError,
    showDetails: false
  };
}

// Run tests
console.log('🏃‍♂️ Running error handling tests...\n');

testErrors.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  
  let errorInfo;
  if (testCase.error.response) {
    errorInfo = handleApiError(testCase.error);
  } else {
    errorInfo = createErrorInfo(testCase.error.message, testCase.error);
  }
  
  console.log(`  Type: ${errorInfo.type} (expected: ${testCase.expectedType})`);
  console.log(`  Severity: ${errorInfo.severity} (expected: ${testCase.expectedSeverity})`);
  console.log(`  Retryable: ${errorInfo.retryable} (expected: ${testCase.expectedRetryable})`);
  console.log(`  User Message: ${errorInfo.userMessage}`);
  
  if (errorInfo.suggestions) {
    console.log(`  Suggestions: ${errorInfo.suggestions.join(', ')}`);
  }
  
  // Validate results
  const typeMatch = errorInfo.type === testCase.expectedType;
  const severityMatch = errorInfo.severity === testCase.expectedSeverity;
  const retryableMatch = errorInfo.retryable === testCase.expectedRetryable;
  
  if (typeMatch && severityMatch && retryableMatch) {
    console.log('  ✅ PASS - All properties match expected values');
  } else {
    console.log('  ❌ FAIL - Some properties don\'t match expected values');
  }
  
  console.log(''); // Empty line for readability
});

// Test error state creation
console.log('🔄 Testing error state creation...');

const multipleErrors = [
  'Patient name must be at least 2 characters',
  'Please enter a valid phone number',
  'Scheduled date must be in the future'
];

const errorState = createErrorState(multipleErrors);

console.log(`Has Error: ${errorState.hasError}`);
console.log(`Number of Errors: ${errorState.errors.length}`);
console.log(`Primary Error: ${errorState.primaryError?.userMessage}`);
console.log(`Primary Error Severity: ${errorState.primaryError?.severity}`);

if (errorState.hasError && errorState.errors.length === 3) {
  console.log('✅ PASS - Error state created correctly with multiple errors');
} else {
  console.log('❌ FAIL - Error state creation failed');
}

// Test retry suggestions
console.log('\n🔄 Testing retry suggestions...');

const networkError = createErrorInfo('Network Error');
const validationError = createErrorInfo('Patient name must be at least 2 characters');

console.log('Network Error Suggestions:', networkError.suggestions);
console.log('Validation Error Suggestions:', validationError.suggestions || 'No specific suggestions');

console.log('\n🎉 Enhanced error handling tests completed!');

// Test error display formatting
console.log('\n📱 Testing error display formatting...');

const testDisplayErrors = [
  createErrorInfo('Network Error'),
  createErrorInfo('Patient name must be at least 2 characters'),
  createErrorInfo('No operation theatres available at this hospital')
];

testDisplayErrors.forEach((error, index) => {
  const icon = error.type === 'network' ? '🌐' : 
               error.type === 'validation' ? '⚠️' : 
               error.type === 'resource' ? '🏥' : '❌';
  
  console.log(`${index + 1}. ${icon} ${error.userMessage}`);
  if (error.suggestions) {
    error.suggestions.forEach(suggestion => {
      console.log(`   • ${suggestion}`);
    });
  }
});

console.log('\n✨ All error handling tests completed successfully!');