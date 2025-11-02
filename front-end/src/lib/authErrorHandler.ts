/**
 * Authentication error handling utilities
 * Provides consistent error handling for authentication-related operations
 */

export interface AuthError extends Error {
  code?: string;
  statusCode?: number;
  isAuthError: true;
  isRecoverable: boolean;
  retryable: boolean;
}

export type AuthErrorCode = 
  | 'HYDRATION_MISMATCH'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'NETWORK_ERROR'
  | 'STORAGE_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Creates a standardized authentication error
 */
export function createAuthError(
  message: string,
  code: AuthErrorCode,
  statusCode?: number,
  isRecoverable = true,
  retryable = true
): AuthError {
  const error = new Error(message) as AuthError;
  error.code = code;
  error.statusCode = statusCode;
  error.isAuthError = true;
  error.isRecoverable = isRecoverable;
  error.retryable = retryable;
  return error;
}

/**
 * Type guard to check if an error is an AuthError
 */
export function isAuthError(error: unknown): error is AuthError {
  return error instanceof Error && 'isAuthError' in error && error.isAuthError === true;
}

/**
 * Handles authentication errors with appropriate recovery strategies
 */
export class AuthErrorHandler {
  private static instance: AuthErrorHandler;
  private errorLog: AuthError[] = [];
  private maxLogSize = 50;

  static getInstance(): AuthErrorHandler {
    if (!AuthErrorHandler.instance) {
      AuthErrorHandler.instance = new AuthErrorHandler();
    }
    return AuthErrorHandler.instance;
  }

  /**
   * Handles an authentication error and returns recovery action
   */
  handleError(error: unknown): {
    shouldRetry: boolean;
    retryDelay?: number;
    fallbackAction?: () => void;
    userMessage: string;
  } {
    const authError = this.normalizeError(error);
    this.logError(authError);

    switch (authError.code) {
      case 'HYDRATION_MISMATCH':
        return {
          shouldRetry: true,
          retryDelay: 100,
          userMessage: 'Loading authentication state...',
        };

      case 'TOKEN_EXPIRED':
        return {
          shouldRetry: false,
          fallbackAction: this.clearAuthData,
          userMessage: 'Your session has expired. Please log in again.',
        };

      case 'TOKEN_INVALID':
        return {
          shouldRetry: false,
          fallbackAction: this.clearAuthData,
          userMessage: 'Authentication failed. Please log in again.',
        };

      case 'NETWORK_ERROR':
        return {
          shouldRetry: true,
          retryDelay: 2000,
          userMessage: 'Network error. Retrying...',
        };

      case 'STORAGE_ERROR':
        return {
          shouldRetry: true,
          retryDelay: 500,
          userMessage: 'Storage access error. Retrying...',
        };

      default:
        return {
          shouldRetry: authError.retryable,
          retryDelay: 1000,
          userMessage: 'An error occurred. Please try again.',
        };
    }
  }

  /**
   * Normalizes any error into an AuthError
   */
  private normalizeError(error: unknown): AuthError {
    if (isAuthError(error)) {
      return error;
    }

    if (error instanceof Error) {
      // Check for specific error patterns
      if (error.message.includes('hydration')) {
        return createAuthError(
          'Hydration mismatch detected',
          'HYDRATION_MISMATCH',
          undefined,
          true,
          true
        );
      }

      if (error.message.includes('localStorage') || error.message.includes('sessionStorage')) {
        return createAuthError(
          'Storage access error',
          'STORAGE_ERROR',
          undefined,
          true,
          true
        );
      }

      if (error.message.includes('network') || error.message.includes('fetch')) {
        return createAuthError(
          'Network error during authentication',
          'NETWORK_ERROR',
          undefined,
          true,
          true
        );
      }

      return createAuthError(
        error.message,
        'UNKNOWN_ERROR',
        undefined,
        true,
        true
      );
    }

    return createAuthError(
      'Unknown authentication error',
      'UNKNOWN_ERROR',
      undefined,
      true,
      true
    );
  }

  /**
   * Logs error for monitoring and debugging
   */
  private logError(error: AuthError): void {
    // Add to internal log
    this.errorLog.push(error);
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.error('AuthError:', {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        isRecoverable: error.isRecoverable,
        retryable: error.retryable,
        stack: error.stack,
      });
    }

    // External error tracking in production
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      try {
        // Send to error tracking service if available
        if ((window as any).errorTracker) {
          (window as any).errorTracker.captureException(error, {
            tags: {
              type: 'authentication_error',
              code: error.code,
              recoverable: error.isRecoverable.toString(),
            },
          });
        }
      } catch (trackingError) {
        console.warn('Failed to send error to tracking service:', trackingError);
      }
    }
  }

  /**
   * Clears authentication data from storage
   */
  private clearAuthData = (): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } catch (error) {
      console.warn('Failed to clear auth data:', error);
    }
  };

  /**
   * Gets recent error history for debugging
   */
  getErrorHistory(): AuthError[] {
    return [...this.errorLog];
  }

  /**
   * Clears error history
   */
  clearErrorHistory(): void {
    this.errorLog = [];
  }
}

/**
 * Retry utility with exponential backoff
 */
export class AuthRetryManager {
  private retryAttempts = new Map<string, number>();
  private maxRetries = 3;
  private baseDelay = 1000;

  async retry<T>(
    operation: () => Promise<T>,
    operationId: string,
    maxRetries = this.maxRetries
  ): Promise<T> {
    const attempts = this.retryAttempts.get(operationId) || 0;

    try {
      const result = await operation();
      // Success - reset retry count
      this.retryAttempts.delete(operationId);
      return result;
    } catch (error) {
      const authError = AuthErrorHandler.getInstance().handleError(error);
      
      if (!authError.shouldRetry || attempts >= maxRetries) {
        this.retryAttempts.delete(operationId);
        throw error;
      }

      // Increment retry count
      this.retryAttempts.set(operationId, attempts + 1);

      // Calculate delay with exponential backoff
      const delay = authError.retryDelay || this.baseDelay * Math.pow(2, attempts);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return this.retry(operation, operationId, maxRetries);
    }
  }

  /**
   * Resets retry count for an operation
   */
  resetRetries(operationId: string): void {
    this.retryAttempts.delete(operationId);
  }

  /**
   * Gets current retry count for an operation
   */
  getRetryCount(operationId: string): number {
    return this.retryAttempts.get(operationId) || 0;
  }
}

// Export singleton instances
export const authErrorHandler = AuthErrorHandler.getInstance();
export const authRetryManager = new AuthRetryManager();