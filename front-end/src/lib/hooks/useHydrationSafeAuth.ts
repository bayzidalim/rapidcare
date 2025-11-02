import { useState, useEffect, useCallback, useMemo } from 'react';
import { getCurrentUser, getToken, isAuthenticated, User } from '../auth';
import { authErrorHandler, authRetryManager, createAuthError } from '../authErrorHandler';
import { hydrationValidator } from '../performance/hydrationValidator';

/**
 * Authentication state that's safe for hydration
 * null = unknown/loading state (used during SSR and initial client render)
 * true = authenticated
 * false = not authenticated
 */
export type HydrationSafeAuthState = boolean | null;

export interface HydrationSafeAuthData {
  isAuthenticated: HydrationSafeAuthState;
  isHydrated: boolean;
  user: User | null;
  hasAuthChecked: boolean;
  error: string | null;
  isRetrying: boolean;
}

export interface UseHydrationSafeAuthReturn {
  auth: HydrationSafeAuthData;
  checkAuth: () => void;
  refreshAuth: () => void;
  clearError: () => void;
}

/**
 * Custom hook that provides hydration-safe authentication state
 * 
 * This hook ensures that:
 * 1. Server and client render identical initial state (null/loading)
 * 2. Authentication check happens only after hydration
 * 3. No hydration mismatches occur due to authentication state
 * 
 * @returns Authentication state and utilities
 */
export function useHydrationSafeAuth(): UseHydrationSafeAuthReturn {
  // Start with null (unknown) state to match server rendering
  const [authState, setAuthState] = useState<HydrationSafeAuthData>({
    isAuthenticated: null, // null = unknown/loading
    isHydrated: false,
    user: null,
    hasAuthChecked: false,
    error: null,
    isRetrying: false,
  });

  const checkAuth = useCallback(async () => {
    const authCheckStart = performance.now();
    
    try {
      setAuthState(prev => ({ ...prev, isRetrying: true, error: null }));

      // Use retry manager for resilient authentication checks
      const result = await authRetryManager.retry(async () => {
        const authenticated = isAuthenticated();
        const user = getCurrentUser();
        return { authenticated, user };
      }, 'auth-check');
      
      const authCheckEnd = performance.now();
      hydrationValidator.recordAuthCheck(authCheckStart, authCheckEnd);
      
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: result.authenticated,
        user: result.user,
        hasAuthChecked: true,
        error: null,
        isRetrying: false,
      }));
    } catch (error) {
      hydrationValidator.recordError();
      const errorResponse = authErrorHandler.handleError(error);
      
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        hasAuthChecked: true,
        error: errorResponse.userMessage,
        isRetrying: false,
      }));

      // Execute fallback action if provided
      if (errorResponse.fallbackAction) {
        errorResponse.fallbackAction();
      }
    }
  }, []);

  const refreshAuth = useCallback(() => {
    // Reset retry count and check auth again
    hydrationValidator.recordRetry();
    authRetryManager.resetRetries('auth-check');
    checkAuth();
  }, [checkAuth]);

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  useEffect(() => {
    // Start performance monitoring
    hydrationValidator.startHydration();
    
    // Mark as hydrated and check auth after hydration is complete
    setAuthState(prev => ({ ...prev, isHydrated: true }));
    
    // Use requestAnimationFrame to ensure DOM is ready and hydration is complete
    const timeoutId = setTimeout(() => {
      checkAuth();
      hydrationValidator.endHydration();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      hydrationValidator.completeSession();
    };
  }, [checkAuth]);

  // Memoize the return value to prevent unnecessary re-renders
  const returnValue = useMemo(() => ({
    auth: authState,
    checkAuth,
    refreshAuth,
    clearError,
  }), [authState, checkAuth, refreshAuth, clearError]);

  return returnValue;
}

/**
 * Utility function to safely check authentication state
 * Returns null during SSR to prevent hydration mismatches
 */
export function safeIsAuthenticated(): HydrationSafeAuthState {
  if (typeof window === 'undefined') {
    return null; // Server-side: return unknown state
  }
  
  try {
    return isAuthenticated();
  } catch (error) {
    console.error('Error in safeIsAuthenticated:', error);
    return false;
  }
}

/**
 * Utility function to safely get current user
 * Returns null during SSR to prevent hydration mismatches
 */
export function safeGetCurrentUser(): User | null {
  if (typeof window === 'undefined') {
    return null; // Server-side: return null
  }
  
  try {
    return getCurrentUser();
  } catch (error) {
    console.error('Error in safeGetCurrentUser:', error);
    return null;
  }
}

/**
 * Utility function to safely get token
 * Returns null during SSR to prevent hydration mismatches
 */
export function safeGetToken(): string | null {
  if (typeof window === 'undefined') {
    return null; // Server-side: return null
  }
  
  try {
    return getToken();
  } catch (error) {
    console.error('Error in safeGetToken:', error);
    return null;
  }
}

/**
 * Type guard to check if auth state is determined (not loading)
 */
export function isAuthStateDetermined(authState: HydrationSafeAuthState): authState is boolean {
  return authState !== null;
}

/**
 * Type guard to check if user is authenticated
 */
export function isUserAuthenticated(authState: HydrationSafeAuthState): authState is true {
  return authState === true;
}

/**
 * Type guard to check if user is not authenticated
 */
export function isUserNotAuthenticated(authState: HydrationSafeAuthState): authState is false {
  return authState === false;
}