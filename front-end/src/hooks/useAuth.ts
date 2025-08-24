import { useState, useEffect, useCallback } from 'react';
import { 
  AuthState, 
  User, 
  GuestSession,
  getAuthState, 
  initializeSession,
  isAuthenticated,
  isGuest,
  getCurrentUser,
  getGuestSession,
  updateGuestActivity,
  clearGuestSession,
  loginWithGuestCleanup,
  logoutToGuest,
  getUserType,
  canAccessFeature,
  getSessionInfo,
  handleAuthRequired
} from '../lib/auth';

export interface UseAuthReturn {
  // State
  authState: AuthState;
  isLoading: boolean;
  
  // User info
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  userType: 'authenticated' | 'guest' | 'anonymous';
  
  // Session info
  guestSession: GuestSession | null;
  sessionInfo: any;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  logoutToGuestMode: () => void;
  initSession: () => void;
  updateActivity: () => void;
  
  // Utilities
  canAccess: (feature: string) => boolean;
  requireAuth: (intendedAction?: string, intendedPath?: string) => void;
  refreshAuthState: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isGuest: false,
    user: null,
    guestSession: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Initialize authentication state
  const initSession = useCallback(() => {
    try {
      const newAuthState = initializeSession();
      setAuthState(newAuthState);
    } catch (error) {
      console.error('Error initializing session:', error);
      // Fallback to anonymous state
      setAuthState({
        isAuthenticated: false,
        isGuest: false,
        user: null,
        guestSession: null,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh auth state
  const refreshAuthState = useCallback(() => {
    const newAuthState = getAuthState();
    setAuthState(newAuthState);
  }, []);

  // Login with guest cleanup
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await loginWithGuestCleanup(email, password);
      refreshAuthState();
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [refreshAuthState]);

  // Regular logout
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    refreshAuthState();
  }, [refreshAuthState]);

  // Logout to guest mode
  const logoutToGuestMode = useCallback(() => {
    logoutToGuest();
    refreshAuthState();
  }, [refreshAuthState]);

  // Update guest activity
  const updateActivity = useCallback(() => {
    if (authState.isGuest) {
      updateGuestActivity();
      refreshAuthState();
    }
  }, [authState.isGuest, refreshAuthState]);

  // Check feature access
  const canAccess = useCallback((feature: string) => {
    return canAccessFeature(feature);
  }, []);

  // Require authentication
  const requireAuth = useCallback((intendedAction?: string, intendedPath?: string) => {
    handleAuthRequired(intendedAction, intendedPath);
  }, []);

  // Initialize on mount
  useEffect(() => {
    initSession();
  }, [initSession]);

  // Update activity on user interaction (throttled)
  useEffect(() => {
    if (!authState.isGuest) return;

    const handleActivity = () => {
      updateActivity();
    };

    // Throttle activity updates to every 30 seconds
    const throttledHandler = (() => {
      let lastUpdate = 0;
      return () => {
        const now = Date.now();
        if (now - lastUpdate > 30000) { // 30 seconds
          lastUpdate = now;
          handleActivity();
        }
      };
    })();

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, throttledHandler, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledHandler);
      });
    };
  }, [authState.isGuest, updateActivity]);

  // Listen for storage changes (for multi-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'user' || e.key === 'guestSession') {
        refreshAuthState();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshAuthState]);

  return {
    // State
    authState,
    isLoading,
    
    // User info
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isGuest: authState.isGuest,
    userType: getUserType(),
    
    // Session info
    guestSession: authState.guestSession,
    sessionInfo: getSessionInfo(),
    
    // Actions
    login,
    logout,
    logoutToGuestMode,
    initSession,
    updateActivity,
    
    // Utilities
    canAccess,
    requireAuth,
    refreshAuthState,
  };
};

export default useAuth;