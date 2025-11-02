// Enhanced error handling utility for booking form

export interface ErrorInfo {
  type: 'validation' | 'network' | 'server' | 'client' | 'resource' | 'payment';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  userMessage: string;
  code?: string;
  field?: string;
  retryable: boolean;
  suggestions?: string[];
}

export interface ErrorState {
  hasError: boolean;
  errors: ErrorInfo[];
  primaryError?: ErrorInfo;
  showDetails: boolean;
}

// Error type mappings
const ERROR_MAPPINGS: Record<string, Partial<ErrorInfo>> = {
  // Validation errors
  'User ID is required': {
    type: 'validation',
    severity: 'high',
    userMessage: 'Please log in again to continue with your booking.',
    retryable: false,
    suggestions: ['Log out and log back in', 'Clear browser cache and try again']
  },
  'Hospital selection is required': {
    type: 'validation',
    severity: 'high',
    userMessage: 'Please select a hospital before proceeding.',
    retryable: true,
    suggestions: ['Choose a hospital from the dropdown list']
  },
  'Please select a resource type': {
    type: 'validation',
    severity: 'medium',
    userMessage: 'Please select the type of medical resource you need.',
    retryable: true,
    suggestions: ['Choose between Hospital Bed, ICU, or Operation Theatre']
  },
  'Patient name must be at least 2 characters': {
    type: 'validation',
    severity: 'medium',
    userMessage: 'Please enter the patient\'s full name.',
    field: 'patientName',
    retryable: true
  },
  'Patient name can only contain letters and spaces': {
    type: 'validation',
    severity: 'medium',
    userMessage: 'Patient name can only contain letters and spaces.',
    field: 'patientName',
    retryable: true
  },
  'Please enter a valid phone number': {
    type: 'validation',
    severity: 'medium',
    userMessage: 'Please enter a valid phone number for the emergency contact.',
    field: 'emergencyContactPhone',
    retryable: true,
    suggestions: ['Use format: +1234567890 or (123) 456-7890']
  },
  'Scheduled date must be in the future': {
    type: 'validation',
    severity: 'medium',
    userMessage: 'Please select a future date and time for your appointment.',
    field: 'scheduledDate',
    retryable: true
  },
  
  // Resource availability errors
  'No bed available': {
    type: 'resource',
    severity: 'high',
    userMessage: 'No hospital beds are currently available at this hospital.',
    retryable: true,
    suggestions: ['Try selecting a different hospital', 'Check availability at nearby hospitals']
  },
  'No icu available': {
    type: 'resource',
    severity: 'high',
    userMessage: 'No ICU beds are currently available at this hospital.',
    retryable: true,
    suggestions: ['Try selecting a different hospital', 'Contact the hospital directly for emergency cases']
  },
  'No operation theatres available': {
    type: 'resource',
    severity: 'high',
    userMessage: 'No operation theatres are currently available at this hospital.',
    retryable: true,
    suggestions: ['Try selecting a different hospital', 'Consider scheduling for a later time']
  },
  
  // Network errors
  'Network Error': {
    type: 'network',
    severity: 'high',
    userMessage: 'Unable to connect to the server. Please check your internet connection.',
    retryable: true,
    suggestions: ['Check your internet connection', 'Try again in a few moments', 'Contact support if the problem persists']
  },
  'timeout': {
    type: 'network',
    severity: 'medium',
    userMessage: 'The request timed out. Please try again.',
    retryable: true,
    suggestions: ['Try again in a few moments', 'Check your internet connection']
  },
  
  // Server errors
  'Internal Server Error': {
    type: 'server',
    severity: 'critical',
    userMessage: 'A server error occurred. Our team has been notified.',
    retryable: true,
    suggestions: ['Try again in a few minutes', 'Contact support if the problem persists']
  },
  'Service Unavailable': {
    type: 'server',
    severity: 'high',
    userMessage: 'The booking service is temporarily unavailable.',
    retryable: true,
    suggestions: ['Try again in a few minutes', 'Contact the hospital directly for urgent cases']
  },
  
  // Payment errors
  'Please enter a valid transaction ID': {
    type: 'payment',
    severity: 'medium',
    userMessage: 'Please enter the transaction ID from your payment confirmation.',
    field: 'transactionId',
    retryable: true,
    suggestions: ['Check your payment confirmation message', 'Enter the complete transaction ID']
  },
  'Payment processing failed': {
    type: 'payment',
    severity: 'high',
    userMessage: 'Payment could not be processed. Please try again.',
    retryable: true,
    suggestions: ['Verify your payment details', 'Try a different payment method', 'Contact your bank if the problem persists']
  }
};

/**
 * Creates an ErrorInfo object from an error message
 */
export function createErrorInfo(message: string, originalError?: any): ErrorInfo {
  // Find matching error mapping
  const mapping = Object.entries(ERROR_MAPPINGS).find(([key]) => 
    message.toLowerCase().includes(key.toLowerCase())
  );

  const baseInfo: ErrorInfo = {
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

  // Handle specific error patterns
  if (message.includes('validation') || message.includes('required') || message.includes('invalid')) {
    return {
      ...baseInfo,
      type: 'validation',
      severity: 'medium',
      userMessage: 'Please check your form inputs and try again.'
    };
  }

  if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
    return {
      ...baseInfo,
      type: 'network',
      severity: 'high',
      userMessage: 'Connection error. Please check your internet and try again.',
      suggestions: ['Check your internet connection', 'Try again in a few moments']
    };
  }

  if (message.includes('server') || message.includes('500') || message.includes('503')) {
    return {
      ...baseInfo,
      type: 'server',
      severity: 'high',
      userMessage: 'Server error. Please try again in a few minutes.',
      suggestions: ['Try again in a few minutes', 'Contact support if the problem persists']
    };
  }

  return baseInfo;
}

/**
 * Creates an ErrorState from multiple errors
 */
export function createErrorState(errors: (string | ErrorInfo)[]): ErrorState {
  const errorInfos = errors.map(error => 
    typeof error === 'string' ? createErrorInfo(error) : error
  );

  // Find the most severe error as primary
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

/**
 * Handles API response errors
 */
export function handleApiError(error: any): ErrorInfo {
  console.error('API Error:', error);

  // Network errors
  if (!error.response) {
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      return createErrorInfo('Network Error', error);
    }
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return createErrorInfo('timeout', error);
    }
    return createErrorInfo('Connection failed. Please check your internet connection.', error);
  }

  // HTTP status errors
  const status = error.response.status;
  const data = error.response.data;

  if (status === 400) {
    const message = data?.error || data?.message || 'Invalid request data';
    return createErrorInfo(message, error);
  }

  if (status === 401) {
    return createErrorInfo('Authentication required. Please log in again.', error);
  }

  if (status === 403) {
    return createErrorInfo('Access denied. You don\'t have permission to perform this action.', error);
  }

  if (status === 404) {
    return createErrorInfo('Resource not found. Please try again.', error);
  }

  if (status === 409) {
    const message = data?.error || 'Resource conflict. The requested resource may no longer be available.';
    return createErrorInfo(message, error);
  }

  if (status >= 500) {
    return createErrorInfo('Internal Server Error', error);
  }

  // Generic error
  const message = data?.error || data?.message || `Request failed with status ${status}`;
  return createErrorInfo(message, error);
}

/**
 * Gets retry suggestions based on error type
 */
export function getRetrySuggestions(errorInfo: ErrorInfo): string[] {
  if (errorInfo.suggestions) {
    return errorInfo.suggestions;
  }

  switch (errorInfo.type) {
    case 'network':
      return ['Check your internet connection', 'Try again in a few moments'];
    case 'server':
      return ['Try again in a few minutes', 'Contact support if the problem persists'];
    case 'validation':
      return ['Check your form inputs', 'Make sure all required fields are filled'];
    case 'resource':
      return ['Try selecting a different hospital', 'Consider a different time slot'];
    case 'payment':
      return ['Verify your payment details', 'Try a different payment method'];
    default:
      return ['Try again', 'Contact support if the problem persists'];
  }
}

/**
 * Determines if an error should trigger a retry mechanism
 */
export function shouldAutoRetry(errorInfo: ErrorInfo): boolean {
  return errorInfo.retryable && 
         (errorInfo.type === 'network' || errorInfo.type === 'server') &&
         errorInfo.severity !== 'critical';
}

/**
 * Gets the appropriate icon for an error type
 */
export function getErrorIcon(errorType: ErrorInfo['type']): string {
  switch (errorType) {
    case 'validation': return '⚠️';
    case 'network': return '🌐';
    case 'server': return '🔧';
    case 'resource': return '🏥';
    case 'payment': return '💳';
    default: return '❌';
  }
}

/**
 * Formats error message for display
 */
export function formatErrorMessage(errorInfo: ErrorInfo, includeDetails: boolean = false): string {
  let message = `${getErrorIcon(errorInfo.type)} ${errorInfo.userMessage}`;
  
  if (includeDetails && errorInfo.message !== errorInfo.userMessage) {
    message += `\n\nTechnical details: ${errorInfo.message}`;
  }
  
  return message;
}