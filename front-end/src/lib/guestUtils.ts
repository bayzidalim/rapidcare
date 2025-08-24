import { GuestSession } from './auth';

// Guest session management utilities
export const GUEST_SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
export const GUEST_ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const isGuestSessionExpired = (session: GuestSession): boolean => {
  const now = Date.now();
  const sessionAge = now - session.startTime;
  const inactivityTime = now - session.lastActivity;
  
  return sessionAge > GUEST_SESSION_TIMEOUT || inactivityTime > GUEST_ACTIVITY_TIMEOUT;
};

export const cleanupExpiredGuestSession = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const sessionStr = localStorage.getItem('guestSession');
  if (!sessionStr) return false;
  
  try {
    const session: GuestSession = JSON.parse(sessionStr);
    if (isGuestSessionExpired(session)) {
      localStorage.removeItem('guestSession');
      return true;
    }
  } catch (error) {
    // Invalid session data, remove it
    localStorage.removeItem('guestSession');
    return true;
  }
  
  return false;
};

// Guest analytics utilities
export interface GuestActivity {
  sessionId: string;
  action: string;
  page: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export const trackGuestActivity = (
  sessionId: string,
  action: string,
  page: string,
  metadata?: Record<string, any>
): void => {
  if (typeof window === 'undefined') return;
  
  const activity: GuestActivity = {
    sessionId,
    action,
    page,
    timestamp: Date.now(),
    metadata,
  };
  
  // Store in session storage for potential batch sending
  const activities = getStoredGuestActivities();
  activities.push(activity);
  
  // Keep only last 50 activities to prevent storage bloat
  const recentActivities = activities.slice(-50);
  sessionStorage.setItem('guestActivities', JSON.stringify(recentActivities));
};

export const getStoredGuestActivities = (): GuestActivity[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = sessionStorage.getItem('guestActivities');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
};

export const clearGuestActivities = (): void => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('guestActivities');
  }
};

// Guest feature access utilities
export const getGuestFeatureMessage = (feature: string): string => {
  const messages: Record<string, string> = {
    booking: 'Please log in to book hospital resources and make payments.',
    payment: 'Please log in to access payment features.',
    dashboard: 'Please log in to access your personal dashboard.',
    profile: 'Please log in to manage your profile.',
    'hospital-management': 'Please log in to manage hospital information.',
    admin: 'Please log in with admin credentials to access admin features.',
  };
  
  return messages[feature] || 'Please log in to access this feature.';
};

export const getGuestActionPrompt = (action: string): string => {
  const prompts: Record<string, string> = {
    'book-resource': 'To book this resource, you need to log in or create an account.',
    'make-payment': 'To make a payment, you need to log in or create an account.',
    'view-bookings': 'To view your bookings, you need to log in.',
    'manage-hospital': 'To manage hospital information, you need to log in.',
    'access-dashboard': 'To access your dashboard, you need to log in.',
  };
  
  return prompts[action] || 'To perform this action, you need to log in.';
};

// Guest conversion tracking
export interface GuestConversionEvent {
  sessionId: string;
  event: 'login_prompt_shown' | 'login_attempted' | 'registration_attempted' | 'feature_blocked';
  feature: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export const trackGuestConversion = (
  sessionId: string,
  event: GuestConversionEvent['event'],
  feature: string,
  metadata?: Record<string, any>
): void => {
  if (typeof window === 'undefined') return;
  
  const conversionEvent: GuestConversionEvent = {
    sessionId,
    event,
    feature,
    timestamp: Date.now(),
    metadata,
  };
  
  // Store conversion events separately
  const events = getStoredConversionEvents();
  events.push(conversionEvent);
  
  // Keep only last 20 conversion events
  const recentEvents = events.slice(-20);
  sessionStorage.setItem('guestConversions', JSON.stringify(recentEvents));
};

export const getStoredConversionEvents = (): GuestConversionEvent[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = sessionStorage.getItem('guestConversions');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
};

export const clearConversionEvents = (): void => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('guestConversions');
  }
};

// Guest state persistence utilities
export const saveGuestState = (key: string, data: any): void => {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.setItem(`guest_${key}`, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save guest state:', error);
  }
};

export const loadGuestState = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const stored = sessionStorage.getItem(`guest_${key}`);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

export const clearGuestState = (key?: string): void => {
  if (typeof window === 'undefined') return;
  
  if (key) {
    sessionStorage.removeItem(`guest_${key}`);
  } else {
    // Clear all guest state
    const keysToRemove: string[] = [];
    
    // Try to get all keys - this works in real browsers
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('guest_')) {
          keysToRemove.push(key);
        }
      }
    } catch (error) {
      // Fallback: iterate through sessionStorage using for...in
      for (const key in sessionStorage) {
        if (key.startsWith('guest_')) {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
    });
  }
};

// Guest form data persistence (for login redirects)
export const saveGuestFormData = (formId: string, data: any): void => {
  saveGuestState(`form_${formId}`, data);
};

export const loadGuestFormData = <T>(formId: string): T | null => {
  return loadGuestState(`form_${formId}`, null);
};

export const clearGuestFormData = (formId: string): void => {
  clearGuestState(`form_${formId}`);
};