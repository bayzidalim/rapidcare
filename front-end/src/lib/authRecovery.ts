/**
 * Authentication recovery utilities
 * Provides mechanisms to recover from authentication failures
 */

import { authErrorHandler, createAuthError } from './authErrorHandler';

export interface RecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  fallbackUrl?: string;
  clearStorageOnFailure?: boolean;
}

export interface RecoveryResult {
  success: boolean;
  error?: string;
  redirectUrl?: string;
  retryCount: number;
}

/**
 * Authentication recovery manager
 */
export class AuthRecoveryManager {
  private static instance: AuthRecoveryManager;
  private recoveryAttempts = new Map<string, number>();

  static getInstance(): AuthRecoveryManager {
    if (!AuthRecoveryManager.instance) {
      AuthRecoveryManager.instance = new AuthRecoveryManager();
    }
    return AuthRecoveryManager.instance;
  }

  /**
   * Attempts to recover from authentication failure
   */
  async recover(
    operation: () => Promise<any>,
    operationId: string,
    options: RecoveryOptions = {}
  ): Promise<RecoveryResult> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      fallbackUrl = '/login',
      clearStorageOnFailure = true,
    } = options;

    const currentAttempts = this.recoveryAttempts.get(operationId) || 0;

    try {
      await operation();
      
      // Success - reset attempts
      this.recoveryAttempts.delete(operationId);
      
      return {
        success: true,
        retryCount: currentAttempts,
      };
    } catch (error) {
      const errorResponse = authErrorHandler.handleError(error);
      
      // If not retryable or max attempts reached
      if (!errorResponse.shouldRetry || currentAttempts >= maxRetries) {
        this.recoveryAttempts.delete(operationId);
        
        // Clear storage if requested
        if (clearStorageOnFailure) {
          this.clearAuthStorage();
        }
        
        return {
          success: false,
          error: errorResponse.userMessage,
          redirectUrl: fallbackUrl,
          retryCount: currentAttempts,
        };
      }

      // Increment attempts and retry
      this.recoveryAttempts.set(operationId, currentAttempts + 1);
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, errorResponse.retryDelay || retryDelay));
      
      // Recursive retry
      return this.recover(operation, operationId, options);
    }
  }

  /**
   * Clears authentication storage
   */
  private clearAuthStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
      }
    } catch (error) {
      console.warn('Failed to clear auth storage:', error);
    }
  }

  /**
   * Validates current authentication state
   */
  async validateAuthState(): Promise<{
    isValid: boolean;
    needsRefresh: boolean;
    error?: string;
  }> {
    try {
      if (typeof window === 'undefined') {
        return { isValid: false, needsRefresh: false };
      }

      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (!token || !userStr) {
        return { isValid: false, needsRefresh: false };
      }

      // Try to parse user data
      try {
        JSON.parse(userStr);
      } catch {
        return { 
          isValid: false, 
          needsRefresh: false,
          error: 'Invalid user data in storage'
        };
      }

      // Basic token validation (you might want to add JWT validation here)
      if (token.length < 10) {
        return { 
          isValid: false, 
          needsRefresh: false,
          error: 'Invalid token format'
        };
      }

      return { isValid: true, needsRefresh: false };
    } catch (error) {
      return { 
        isValid: false, 
        needsRefresh: true,
        error: 'Error validating auth state'
      };
    }
  }

  /**
   * Performs health check on authentication system
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check storage access
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('auth_test', 'test');
          localStorage.removeItem('auth_test');
        } catch {
          issues.push('localStorage access denied');
          recommendations.push('Check browser privacy settings');
        }
      }

      // Check auth state validation
      const authValidation = await this.validateAuthState();
      if (!authValidation.isValid && authValidation.error) {
        issues.push(authValidation.error);
        if (authValidation.needsRefresh) {
          recommendations.push('Refresh authentication state');
        }
      }

      // Check error history
      const errorHistory = authErrorHandler.getErrorHistory();
      const recentErrors = errorHistory.filter(
        error => Date.now() - error.name.length < 300000 // Last 5 minutes
      );

      if (recentErrors.length > 5) {
        issues.push('High error rate detected');
        recommendations.push('Check network connectivity and server status');
      }

      return {
        healthy: issues.length === 0,
        issues,
        recommendations,
      };
    } catch (error) {
      return {
        healthy: false,
        issues: ['Health check failed'],
        recommendations: ['Restart application'],
      };
    }
  }

  /**
   * Resets recovery state for an operation
   */
  resetRecovery(operationId: string): void {
    this.recoveryAttempts.delete(operationId);
  }

  /**
   * Gets current recovery attempt count
   */
  getRecoveryAttempts(operationId: string): number {
    return this.recoveryAttempts.get(operationId) || 0;
  }
}

// Export singleton instance
export const authRecoveryManager = AuthRecoveryManager.getInstance();

/**
 * Hook for authentication recovery
 */
export function useAuthRecovery() {
  const recover = async (
    operation: () => Promise<any>,
    operationId: string,
    options?: RecoveryOptions
  ) => {
    return authRecoveryManager.recover(operation, operationId, options);
  };

  const validateAuth = async () => {
    return authRecoveryManager.validateAuthState();
  };

  const healthCheck = async () => {
    return authRecoveryManager.healthCheck();
  };

  const resetRecovery = (operationId: string) => {
    authRecoveryManager.resetRecovery(operationId);
  };

  return {
    recover,
    validateAuth,
    healthCheck,
    resetRecovery,
  };
}