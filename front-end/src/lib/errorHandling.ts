// Enhanced error handling utilities for the approval system

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  timestamp?: string;
  details?: any;
}

export interface RetryOptions {
  maxRetries: number;
  delay: number;
  backoff: boolean;
}

export class ApprovalError extends Error {
  public code: string;
  public statusCode: number;
  public timestamp: string;
  public details?: any;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'ApprovalError';
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
    this.details = details;
  }
}

// Enhanced error message mapping
export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection and try again.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  
  // Authentication errors
  UNAUTHORIZED: 'You are not authorized to perform this action. Please log in again.',
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  
  // Hospital approval errors
  HOSPITAL_NOT_FOUND: 'Hospital not found. It may have been deleted or moved.',
  INVALID_HOSPITAL_ID: 'Invalid hospital ID provided.',
  HOSPITAL_ALREADY_PROCESSED: 'This hospital has already been processed by another administrator.',
  INVALID_STATUS_TRANSITION: 'Cannot change hospital status. It may have been updated by another user.',
  
  // Validation errors
  MISSING_REJECTION_REASON: 'A rejection reason is required when rejecting a hospital.',
  REJECTION_REASON_TOO_SHORT: 'Rejection reason must be at least 10 characters long.',
  REJECTION_REASON_TOO_LONG: 'Rejection reason must be less than 500 characters long.',
  INVALID_APPROVER: 'Invalid approver. Only administrators can approve hospitals.',
  INVALID_REJECTOR: 'Invalid rejector. Only administrators can reject hospitals.',
  
  // Service errors
  SERVICE_ERROR: 'A service error occurred. Please try again or contact support.',
  DATABASE_ERROR: 'Database error occurred. Please try again later.',
  INTERNAL_SERVER_ERROR: 'An internal server error occurred. Please try again later.',
  
  // Resubmission errors
  RESUBMISSION_NOT_ALLOWED: 'Hospital can only be resubmitted if it was rejected.',
  DUPLICATE_HOSPITAL: 'A hospital with this name already exists in this city.',
  VALIDATION_FAILED: 'Hospital information validation failed. Please check all required fields.',
  
  // Default
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again or contact support.'
};

// User-friendly error message generator
export function getUserFriendlyErrorMessage(error: any): string {
  // Handle ApprovalError instances
  if (error instanceof ApprovalError) {
    return ERROR_MESSAGES[error.code as keyof typeof ERROR_MESSAGES] || error.message;
  }
  
  // Handle API response errors
  if (error.response?.data?.error) {
    const errorCode = error.response.data.code;
    if (errorCode && ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES]) {
      return ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES];
    }
    return error.response.data.error;
  }
  
  // Handle network errors
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return ERROR_MESSAGES.TIMEOUT_ERROR;
  }
  
  // Handle HTTP status codes
  if (error.response?.status) {
    switch (error.response.status) {
      case 401:
        return ERROR_MESSAGES.UNAUTHORIZED;
      case 403:
        return ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS;
      case 404:
        return ERROR_MESSAGES.HOSPITAL_NOT_FOUND;
      case 409:
        return ERROR_MESSAGES.HOSPITAL_ALREADY_PROCESSED;
      case 422:
        return ERROR_MESSAGES.VALIDATION_FAILED;
      case 500:
        return ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
      default:
        return error.response.data?.error || ERROR_MESSAGES.UNKNOWN_ERROR;
    }
  }
  
  // Fallback to original error message or default
  return error.message || ERROR_MESSAGES.UNKNOWN_ERROR;
}

// Retry mechanism with exponential backoff
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = { maxRetries: 3, delay: 1000, backoff: true }
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain error types
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw error;
      }
      
      // Don't retry on the last attempt
      if (attempt === options.maxRetries) {
        break;
      }
      
      // Calculate delay with optional exponential backoff
      const delay = options.backoff 
        ? options.delay * Math.pow(2, attempt)
        : options.delay;
      
      console.log(`Operation failed (attempt ${attempt + 1}/${options.maxRetries + 1}). Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Enhanced API call wrapper with retry and error handling
export async function safeApiCall<T>(
  apiCall: () => Promise<T>,
  options: {
    retryOptions?: RetryOptions;
    errorContext?: string;
    showUserFeedback?: boolean;
  } = {}
): Promise<{ success: true; data: T } | { success: false; error: string; code?: string }> {
  const {
    retryOptions = { maxRetries: 2, delay: 1000, backoff: true },
    errorContext = 'API call',
    showUserFeedback = true
  } = options;
  
  try {
    const result = await retryOperation(apiCall, retryOptions);
    return { success: true, data: result };
  } catch (error) {
    const userFriendlyMessage = getUserFriendlyErrorMessage(error);
    
    console.error(`${errorContext} failed:`, {
      error: error.message,
      code: error.response?.data?.code,
      status: error.response?.status,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: false,
      error: userFriendlyMessage,
      code: error.response?.data?.code
    };
  }
}

// Loading state manager
export class LoadingStateManager {
  private loadingStates: Map<string, boolean> = new Map();
  private callbacks: Map<string, (loading: boolean) => void> = new Map();
  
  setLoading(key: string, loading: boolean) {
    this.loadingStates.set(key, loading);
    const callback = this.callbacks.get(key);
    if (callback) {
      callback(loading);
    }
  }
  
  isLoading(key: string): boolean {
    return this.loadingStates.get(key) || false;
  }
  
  subscribe(key: string, callback: (loading: boolean) => void) {
    this.callbacks.set(key, callback);
  }
  
  unsubscribe(key: string) {
    this.callbacks.delete(key);
  }
}

// Global loading state manager instance
export const loadingManager = new LoadingStateManager();

// Confirmation dialog helper
export interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
}

export function createConfirmationDialog(options: ConfirmationOptions): Promise<boolean> {
  return new Promise((resolve) => {
    // This would integrate with your UI library's dialog system
    // For now, using browser confirm as fallback
    const result = window.confirm(`${options.title}\n\n${options.message}`);
    resolve(result);
  });
}

// Success message helper
export interface SuccessOptions {
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    callback: () => void;
  };
}

export function showSuccessMessage(options: SuccessOptions) {
  // This would integrate with your toast/notification system
  console.log(`✅ ${options.title}: ${options.message}`);
  
  // If there's an action, you could show it in the UI
  if (options.action) {
    console.log(`Action available: ${options.action.label}`);
  }
}

// Error message helper
export interface ErrorOptions {
  title: string;
  message: string;
  details?: any;
  action?: {
    label: string;
    callback: () => void;
  };
}

export function showErrorMessage(options: ErrorOptions) {
  // This would integrate with your toast/notification system
  console.error(`❌ ${options.title}: ${options.message}`);
  
  if (options.details) {
    console.error('Error details:', options.details);
  }
  
  // If there's an action (like retry), you could show it in the UI
  if (options.action) {
    console.log(`Action available: ${options.action.label}`);
  }
}

// Validation helpers
export function validateRejectionReason(reason: string): { valid: boolean; error?: string } {
  const trimmed = reason.trim();
  
  if (!trimmed) {
    return { valid: false, error: ERROR_MESSAGES.MISSING_REJECTION_REASON };
  }
  
  if (trimmed.length < 10) {
    return { valid: false, error: ERROR_MESSAGES.REJECTION_REASON_TOO_SHORT };
  }
  
  if (trimmed.length > 500) {
    return { valid: false, error: ERROR_MESSAGES.REJECTION_REASON_TOO_LONG };
  }
  
  return { valid: true };
}

// Debounce helper for user input
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Rate limiting helper
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  canMakeRequest(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }
}

export const rateLimiter = new RateLimiter();