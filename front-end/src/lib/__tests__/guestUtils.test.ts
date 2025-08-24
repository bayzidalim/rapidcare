import {
  isGuestSessionExpired,
  cleanupExpiredGuestSession,
  trackGuestActivity,
  getStoredGuestActivities,
  clearGuestActivities,
  getGuestFeatureMessage,
  getGuestActionPrompt,
  trackGuestConversion,
  getStoredConversionEvents,
  clearConversionEvents,
  saveGuestState,
  loadGuestState,
  clearGuestState,
  saveGuestFormData,
  loadGuestFormData,
  clearGuestFormData,
  GUEST_SESSION_TIMEOUT,
  GUEST_ACTIVITY_TIMEOUT,
} from '../guestUtils';
import { GuestSession } from '../auth';

// Mock localStorage and sessionStorage
const createStorageMock = () => {
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
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    },
  };
};

const localStorageMock = createStorageMock();
const sessionStorageMock = createStorageMock();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

describe('Guest Utilities', () => {
  beforeEach(() => {
    localStorageMock.clear();
    sessionStorageMock.clear();
  });

  describe('Session Expiration', () => {
    test('isGuestSessionExpired returns false for fresh session', () => {
      const session: GuestSession = {
        sessionId: 'test-session',
        startTime: Date.now(),
        lastActivity: Date.now(),
        isGuest: true,
      };
      
      expect(isGuestSessionExpired(session)).toBe(false);
    });

    test('isGuestSessionExpired returns true for old session', () => {
      const session: GuestSession = {
        sessionId: 'test-session',
        startTime: Date.now() - GUEST_SESSION_TIMEOUT - 1000,
        lastActivity: Date.now() - GUEST_SESSION_TIMEOUT - 1000,
        isGuest: true,
      };
      
      expect(isGuestSessionExpired(session)).toBe(true);
    });

    test('isGuestSessionExpired returns true for inactive session', () => {
      const session: GuestSession = {
        sessionId: 'test-session',
        startTime: Date.now(),
        lastActivity: Date.now() - GUEST_ACTIVITY_TIMEOUT - 1000,
        isGuest: true,
      };
      
      expect(isGuestSessionExpired(session)).toBe(true);
    });

    test('cleanupExpiredGuestSession removes expired session', () => {
      const expiredSession: GuestSession = {
        sessionId: 'expired-session',
        startTime: Date.now() - GUEST_SESSION_TIMEOUT - 1000,
        lastActivity: Date.now() - GUEST_SESSION_TIMEOUT - 1000,
        isGuest: true,
      };
      
      localStorageMock.setItem('guestSession', JSON.stringify(expiredSession));
      
      const wasCleanedUp = cleanupExpiredGuestSession();
      expect(wasCleanedUp).toBe(true);
      expect(localStorageMock.getItem('guestSession')).toBeNull();
    });

    test('cleanupExpiredGuestSession keeps valid session', () => {
      const validSession: GuestSession = {
        sessionId: 'valid-session',
        startTime: Date.now(),
        lastActivity: Date.now(),
        isGuest: true,
      };
      
      localStorageMock.setItem('guestSession', JSON.stringify(validSession));
      
      const wasCleanedUp = cleanupExpiredGuestSession();
      expect(wasCleanedUp).toBe(false);
      expect(localStorageMock.getItem('guestSession')).not.toBeNull();
    });
  });

  describe('Activity Tracking', () => {
    test('trackGuestActivity stores activity', () => {
      trackGuestActivity('session-1', 'page_view', '/hospitals', { hospitalId: 123 });
      
      const activities = getStoredGuestActivities();
      expect(activities).toHaveLength(1);
      expect(activities[0]).toMatchObject({
        sessionId: 'session-1',
        action: 'page_view',
        page: '/hospitals',
        metadata: { hospitalId: 123 },
      });
    });

    test('trackGuestActivity limits stored activities to 50', () => {
      // Add 60 activities
      for (let i = 0; i < 60; i++) {
        trackGuestActivity('session-1', 'action', `/page-${i}`);
      }
      
      const activities = getStoredGuestActivities();
      expect(activities).toHaveLength(50);
      expect(activities[0].page).toBe('/page-10'); // Should start from activity 10
      expect(activities[49].page).toBe('/page-59'); // Should end at activity 59
    });

    test('clearGuestActivities removes all activities', () => {
      trackGuestActivity('session-1', 'action', '/page');
      expect(getStoredGuestActivities()).toHaveLength(1);
      
      clearGuestActivities();
      expect(getStoredGuestActivities()).toHaveLength(0);
    });
  });

  describe('Feature Messages', () => {
    test('getGuestFeatureMessage returns correct messages', () => {
      expect(getGuestFeatureMessage('booking')).toContain('log in to book');
      expect(getGuestFeatureMessage('payment')).toContain('log in to access payment');
      expect(getGuestFeatureMessage('dashboard')).toContain('log in to access your personal dashboard');
      expect(getGuestFeatureMessage('unknown-feature')).toContain('log in to access this feature');
    });

    test('getGuestActionPrompt returns correct prompts', () => {
      expect(getGuestActionPrompt('book-resource')).toContain('To book this resource');
      expect(getGuestActionPrompt('make-payment')).toContain('To make a payment');
      expect(getGuestActionPrompt('unknown-action')).toContain('To perform this action');
    });
  });

  describe('Conversion Tracking', () => {
    test('trackGuestConversion stores conversion events', () => {
      trackGuestConversion('session-1', 'login_prompt_shown', 'booking', { source: 'button' });
      
      const events = getStoredConversionEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        sessionId: 'session-1',
        event: 'login_prompt_shown',
        feature: 'booking',
        metadata: { source: 'button' },
      });
    });

    test('trackGuestConversion limits stored events to 20', () => {
      // Add 25 conversion events
      for (let i = 0; i < 25; i++) {
        trackGuestConversion('session-1', 'feature_blocked', `feature-${i}`);
      }
      
      const events = getStoredConversionEvents();
      expect(events).toHaveLength(20);
      expect(events[0].feature).toBe('feature-5'); // Should start from event 5
      expect(events[19].feature).toBe('feature-24'); // Should end at event 24
    });

    test('clearConversionEvents removes all events', () => {
      trackGuestConversion('session-1', 'login_attempted', 'booking');
      expect(getStoredConversionEvents()).toHaveLength(1);
      
      clearConversionEvents();
      expect(getStoredConversionEvents()).toHaveLength(0);
    });
  });

  describe('State Persistence', () => {
    test('saveGuestState and loadGuestState work correctly', () => {
      const testData = { key: 'value', number: 123, array: [1, 2, 3] };
      
      saveGuestState('test-key', testData);
      const loaded = loadGuestState('test-key', null);
      
      expect(loaded).toEqual(testData);
    });

    test('loadGuestState returns default value when no data exists', () => {
      const defaultValue = { default: true };
      const loaded = loadGuestState('non-existent-key', defaultValue);
      
      expect(loaded).toEqual(defaultValue);
    });

    test('clearGuestState removes specific key', () => {
      saveGuestState('key1', 'value1');
      saveGuestState('key2', 'value2');
      
      clearGuestState('key1');
      
      expect(loadGuestState('key1', null)).toBeNull();
      expect(loadGuestState('key2', null)).toBe('value2');
    });

    test('clearGuestState removes all guest state when no key provided', () => {
      saveGuestState('key1', 'value1');
      saveGuestState('key2', 'value2');
      
      clearGuestState();
      
      expect(loadGuestState('key1', null)).toBeNull();
      expect(loadGuestState('key2', null)).toBeNull();
    });
  });

  describe('Form Data Persistence', () => {
    test('saveGuestFormData and loadGuestFormData work correctly', () => {
      const formData = { name: 'John', email: 'john@example.com' };
      
      saveGuestFormData('booking-form', formData);
      const loaded = loadGuestFormData('booking-form');
      
      expect(loaded).toEqual(formData);
    });

    test('loadGuestFormData returns null when no data exists', () => {
      const loaded = loadGuestFormData('non-existent-form');
      expect(loaded).toBeNull();
    });

    test('clearGuestFormData removes form data', () => {
      saveGuestFormData('booking-form', { data: 'test' });
      expect(loadGuestFormData('booking-form')).not.toBeNull();
      
      clearGuestFormData('booking-form');
      expect(loadGuestFormData('booking-form')).toBeNull();
    });
  });
});