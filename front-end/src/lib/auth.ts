import { authAPI } from './api';

export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  userType: 'user' | 'hospital-authority' | 'admin';
  role?: string;
  hospitalId?: number;
  permissions?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface GuestSession {
  sessionId: string;
  startTime: number;
  lastActivity: number;
  isGuest: true;
}

export interface AuthState {
  isAuthenticated: boolean;
  isGuest: boolean;
  user: User | null;
  guestSession: GuestSession | null;
}

// Login function
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await authAPI.login({ email, password });
    const { user, token } = response.data.data;
    
    // Store token in localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    return { user, token };
  } catch (error: any) {
    // Preserve the original error response for better error handling
    if (error.response?.data?.error) {
      const authError = new Error(error.response.data.error);
      (authError as any).response = error.response;
      throw authError;
    }
    throw error;
  }
};

// Logout function
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
};

// Get current user
export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

// Get token
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return getToken() !== null;
};

// Check if user is hospital authority
export const isHospitalAuthority = (): boolean => {
  const user = getCurrentUser();
  return user?.userType === 'hospital-authority';
};

// Check if user has permission
export const hasPermission = (permission: string): boolean => {
  const user = getCurrentUser();
  if (!user?.permissions) return false;
  
  try {
    const permissions = JSON.parse(user.permissions);
    return permissions.includes(permission);
  } catch {
    return false;
  }
};

// Check if user is admin
export const isAdmin = (): boolean => {
  const user = getCurrentUser();
  return user?.userType === 'admin';
};

// Guest mode utilities
export const generateGuestSessionId = (): string => {
  return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createGuestSession = (): GuestSession => {
  const sessionId = generateGuestSessionId();
  const now = Date.now();
  const guestSession: GuestSession = {
    sessionId,
    startTime: now,
    lastActivity: now,
    isGuest: true,
  };
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('guestSession', JSON.stringify(guestSession));
  }
  
  return guestSession;
};

export const getGuestSession = (): GuestSession | null => {
  if (typeof window === 'undefined') return null;
  
  const sessionStr = localStorage.getItem('guestSession');
  if (!sessionStr) return null;
  
  try {
    return JSON.parse(sessionStr);
  } catch {
    return null;
  }
};

export const updateGuestActivity = (): void => {
  const session = getGuestSession();
  if (session) {
    session.lastActivity = Date.now();
    localStorage.setItem('guestSession', JSON.stringify(session));
  }
};

export const clearGuestSession = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('guestSession');
  }
};

// Enhanced authentication status checking
export const isGuest = (): boolean => {
  return !isAuthenticated() && getGuestSession() !== null;
};

export const getAuthState = (): AuthState => {
  const authenticated = isAuthenticated();
  const user = getCurrentUser();
  const guestSession = getGuestSession();
  
  return {
    isAuthenticated: authenticated,
    isGuest: !authenticated && guestSession !== null,
    user,
    guestSession,
  };
};

export const initializeSession = (): AuthState => {
  const authState = getAuthState();
  
  // If not authenticated and no guest session exists, create one
  if (!authState.isAuthenticated && !authState.guestSession) {
    const newGuestSession = createGuestSession();
    return {
      ...authState,
      isGuest: true,
      guestSession: newGuestSession,
    };
  }
  
  // Update guest activity if in guest mode
  if (authState.isGuest && authState.guestSession) {
    updateGuestActivity();
  }
  
  return authState;
};

// Authentication requirement helpers
export const requiresAuth = (action: string): boolean => {
  const protectedActions = [
    'booking',
    'payment',
    'profile',
    'dashboard',
    'hospital-management',
    'admin',
  ];
  
  return protectedActions.some(protectedAction => action.includes(protectedAction));
};

export const getLoginRedirectUrl = (intendedPath?: string): string => {
  const baseUrl = '/login';
  if (intendedPath && intendedPath !== '/') {
    return `${baseUrl}?returnUrl=${encodeURIComponent(intendedPath)}`;
  }
  return baseUrl;
};

export const handleAuthRequired = (intendedAction?: string, intendedPath?: string): void => {
  const redirectUrl = getLoginRedirectUrl(intendedPath);
  
  // Store intended action for post-login handling
  if (intendedAction && typeof window !== 'undefined') {
    localStorage.setItem('intendedAction', intendedAction);
  }
  
  window.location.href = redirectUrl;
};

// Enhanced login with guest session cleanup
export const loginWithGuestCleanup = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const result = await login(email, password);
    
    // Clear guest session after successful login
    clearGuestSession();
    
    // Handle intended action if exists
    if (typeof window !== 'undefined') {
      const intendedAction = localStorage.getItem('intendedAction');
      if (intendedAction) {
        localStorage.removeItem('intendedAction');
        // You can add specific handling for different intended actions here
      }
    }
    
    return result;
  } catch (error) {
    throw error;
  }
};

// Enhanced logout with guest session creation
export const logoutToGuest = (): void => {
  // Clear authentication data
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('intendedAction');
  
  // Create new guest session
  createGuestSession();
  
  // Redirect to home
  window.location.href = '/';
};

// User type checking with guest support
export const getUserType = (): 'authenticated' | 'guest' | 'anonymous' => {
  if (isAuthenticated()) return 'authenticated';
  if (isGuest()) return 'guest';
  return 'anonymous';
};

export const canAccessFeature = (feature: string): boolean => {
  const userType = getUserType();
  
  // Define feature access rules
  const featureAccess: Record<string, string[]> = {
    'hospital-listing': ['authenticated', 'guest', 'anonymous'],
    'hospital-details': ['authenticated', 'guest', 'anonymous'],
    'blood-donation': ['authenticated', 'guest', 'anonymous'],
    'booking': ['authenticated'],
    'payment': ['authenticated'],
    'dashboard': ['authenticated'],
    'profile': ['authenticated'],
    'hospital-management': ['authenticated'],
    'admin': ['authenticated'],
  };
  
  const allowedTypes = featureAccess[feature] || ['authenticated'];
  return allowedTypes.includes(userType);
};

// Session management utilities
export const getSessionInfo = () => {
  const authState = getAuthState();
  
  if (authState.isAuthenticated && authState.user) {
    return {
      type: 'authenticated',
      user: authState.user,
      sessionId: `auth_${authState.user.id}`,
    };
  }
  
  if (authState.isGuest && authState.guestSession) {
    return {
      type: 'guest',
      sessionId: authState.guestSession.sessionId,
      startTime: authState.guestSession.startTime,
      lastActivity: authState.guestSession.lastActivity,
    };
  }
  
  return {
    type: 'anonymous',
    sessionId: null,
  };
}; 