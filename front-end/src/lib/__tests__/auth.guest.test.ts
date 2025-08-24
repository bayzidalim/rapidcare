import {
  generateGuestSessionId,
  createGuestSession,
  getGuestSession,
  updateGuestActivity,
  clearGuestSession,
  isGuest,
  getAuthState,
  initializeSession,
  requiresAuth,
  getLoginRedirectUrl,
  getUserType,
  canAccessFeature,
  getSessionInfo,
} from '../auth';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Guest Authentication Utilities', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('Guest Session Management', () => {
    test('generateGuestSessionId creates unique session IDs', () => {
      const id1 = generateGuestSessionId();
      const id2 = generateGuestSessionId();
      
      expect(id1).toMatch(/^guest_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^guest_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    test('createGuestSession creates and stores session', () => {
      const session = createGuestSession();
      
      expect(session.isGuest).toBe(true);
      expect(session.sessionId).toMatch(/^guest_\d+_[a-z0-9]+$/);
      expect(session.startTime).toBeCloseTo(Date.now(), -2);
      expect(session.lastActivity).toBeCloseTo(Date.now(), -2);
      
      const stored = getGuestSession();
      expect(stored).toEqual(session);
    });

    test('getGuestSession returns null when no session exists', () => {
      expect(getGuestSession()).toBeNull();
    });

    test('updateGuestActivity updates last activity time', () => {
      const session = createGuestSession();
      const originalActivity = session.lastActivity;
      
      // Wait a bit to ensure time difference
      setTimeout(() => {
        updateGuestActivity();
        const updated = getGuestSession();
        
        expect(updated?.lastActivity).toBeGreaterThan(originalActivity);
      }, 10);
    });

    test('clearGuestSession removes session from storage', () => {
      createGuestSession();
      expect(getGuestSession()).not.toBeNull();
      
      clearGuestSession();
      expect(getGuestSession()).toBeNull();
    });
  });

  describe('Authentication State Detection', () => {
    test('isGuest returns true when guest session exists and no auth', () => {
      createGuestSession();
      expect(isGuest()).toBe(true);
    });

    test('isGuest returns false when no guest session', () => {
      expect(isGuest()).toBe(false);
    });

    test('isGuest returns false when authenticated', () => {
      // Mock authenticated state
      localStorageMock.setItem('token', 'mock-token');
      createGuestSession();
      
      expect(isGuest()).toBe(false);
    });

    test('getAuthState returns correct state for guest', () => {
      const session = createGuestSession();
      const authState = getAuthState();
      
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.isGuest).toBe(true);
      expect(authState.user).toBeNull();
      expect(authState.guestSession).toEqual(session);
    });

    test('getAuthState returns correct state for authenticated user', () => {
      const mockUser = { id: 1, email: 'test@example.com', name: 'Test User', userType: 'user' as const };
      localStorageMock.setItem('token', 'mock-token');
      localStorageMock.setItem('user', JSON.stringify(mockUser));
      
      const authState = getAuthState();
      
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.isGuest).toBe(false);
      expect(authState.user).toEqual(mockUser);
      expect(authState.guestSession).toBeNull();
    });

    test('initializeSession creates guest session when not authenticated', () => {
      const authState = initializeSession();
      
      expect(authState.isGuest).toBe(true);
      expect(authState.guestSession).not.toBeNull();
    });
  });

  describe('Feature Access Control', () => {
    test('requiresAuth correctly identifies protected actions', () => {
      expect(requiresAuth('booking')).toBe(true);
      expect(requiresAuth('payment')).toBe(true);
      expect(requiresAuth('dashboard')).toBe(true);
      expect(requiresAuth('hospital-management')).toBe(true);
      expect(requiresAuth('admin')).toBe(true);
      
      expect(requiresAuth('hospital-listing')).toBe(false);
      expect(requiresAuth('blood-donation')).toBe(false);
    });

    test('getLoginRedirectUrl creates correct URLs', () => {
      expect(getLoginRedirectUrl()).toBe('/login');
      expect(getLoginRedirectUrl('/hospitals')).toBe('/login?returnUrl=%2Fhospitals');
      expect(getLoginRedirectUrl('/hospitals/123')).toBe('/login?returnUrl=%2Fhospitals%2F123');
    });

    test('getUserType returns correct type for different states', () => {
      // Anonymous
      expect(getUserType()).toBe('anonymous');
      
      // Guest
      createGuestSession();
      expect(getUserType()).toBe('guest');
      
      // Authenticated
      localStorageMock.setItem('token', 'mock-token');
      expect(getUserType()).toBe('authenticated');
    });

    test('canAccessFeature returns correct access for different user types', () => {
      // Anonymous user
      expect(canAccessFeature('hospital-listing')).toBe(true);
      expect(canAccessFeature('booking')).toBe(false);
      
      // Guest user
      createGuestSession();
      expect(canAccessFeature('hospital-listing')).toBe(true);
      expect(canAccessFeature('hospital-details')).toBe(true);
      expect(canAccessFeature('blood-donation')).toBe(true);
      expect(canAccessFeature('booking')).toBe(false);
      
      // Authenticated user
      localStorageMock.setItem('token', 'mock-token');
      expect(canAccessFeature('booking')).toBe(true);
      expect(canAccessFeature('dashboard')).toBe(true);
    });
  });

  describe('Session Information', () => {
    test('getSessionInfo returns correct info for guest', () => {
      const session = createGuestSession();
      const info = getSessionInfo();
      
      expect(info.type).toBe('guest');
      expect(info.sessionId).toBe(session.sessionId);
      expect(info.startTime).toBe(session.startTime);
      expect(info.lastActivity).toBe(session.lastActivity);
    });

    test('getSessionInfo returns correct info for authenticated user', () => {
      const mockUser = { id: 1, email: 'test@example.com', name: 'Test User', userType: 'user' as const };
      localStorageMock.setItem('token', 'mock-token');
      localStorageMock.setItem('user', JSON.stringify(mockUser));
      
      const info = getSessionInfo();
      
      expect(info.type).toBe('authenticated');
      expect(info.user).toEqual(mockUser);
      expect(info.sessionId).toBe('auth_1');
    });

    test('getSessionInfo returns correct info for anonymous user', () => {
      const info = getSessionInfo();
      
      expect(info.type).toBe('anonymous');
      expect(info.sessionId).toBeNull();
    });
  });
});