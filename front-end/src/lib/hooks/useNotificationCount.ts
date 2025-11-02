'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationAPI } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

interface NotificationCountState {
  count: number;
  loading: boolean;
  error: string | null;
}

interface UseNotificationCountReturn extends NotificationCountState {
  refetch: () => Promise<void>;
  incrementCount: () => void;
  decrementCount: () => void;
  resetCount: () => void;
}

/**
 * Custom hook for managing notification count with real-time updates
 * Provides loading states, error handling, and manual count manipulation
 */
export const useNotificationCount = (
  refreshInterval: number = 30000, // 30 seconds default
  enablePolling: boolean = true
): UseNotificationCountReturn => {
  const [state, setState] = useState<NotificationCountState>({
    count: 0,
    loading: true,
    error: null
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Fetch notification count from API
  const fetchNotificationCount = useCallback(async (showLoading: boolean = false) => {
    // Only fetch if user is authenticated
    if (!isAuthenticated()) {
      setState(prev => ({
        ...prev,
        count: 0,
        loading: false,
        error: null
      }));
      return;
    }

    if (showLoading) {
      setState(prev => ({ ...prev, loading: true, error: null }));
    }

    try {
      const response = await notificationAPI.getUnreadCount();
      
      if (mountedRef.current && response.data.success) {
        setState(prev => ({
          ...prev,
          count: response.data.data.count || 0,
          loading: false,
          error: null
        }));
      }
    } catch (error: any) {
      console.error('Error fetching notification count:', error);
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.response?.data?.message || 'Failed to load notification count'
        }));
      }
    }
  }, []);

  // Manual refetch function
  const refetch = useCallback(async () => {
    await fetchNotificationCount(true);
  }, [fetchNotificationCount]);

  // Increment count (for optimistic updates)
  const incrementCount = useCallback(() => {
    setState(prev => ({
      ...prev,
      count: prev.count + 1
    }));
  }, []);

  // Decrement count (for optimistic updates)
  const decrementCount = useCallback(() => {
    setState(prev => ({
      ...prev,
      count: Math.max(0, prev.count - 1)
    }));
  }, []);

  // Reset count to zero
  const resetCount = useCallback(() => {
    setState(prev => ({
      ...prev,
      count: 0
    }));
  }, []);

  // Setup polling for real-time updates
  useEffect(() => {
    // Initial fetch
    fetchNotificationCount(true);

    // Setup polling if enabled
    if (enablePolling && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchNotificationCount(false); // Don't show loading for background updates
      }, refreshInterval);
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchNotificationCount, refreshInterval, enablePolling]);

  // Handle authentication state changes
  useEffect(() => {
    const handleAuthChange = () => {
      if (isAuthenticated()) {
        fetchNotificationCount(true);
      } else {
        setState({
          count: 0,
          loading: false,
          error: null
        });
      }
    };

    // Listen for storage changes (login/logout events)
    window.addEventListener('storage', handleAuthChange);
    
    return () => {
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [fetchNotificationCount]);

  // Handle component unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Handle visibility change (pause polling when tab is not visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enablePolling) {
        // Refetch when tab becomes visible
        fetchNotificationCount(false);
        
        // Restart polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        if (refreshInterval > 0) {
          intervalRef.current = setInterval(() => {
            fetchNotificationCount(false);
          }, refreshInterval);
        }
      } else if (document.visibilityState === 'hidden') {
        // Stop polling when tab is hidden
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchNotificationCount, enablePolling, refreshInterval]);

  return {
    ...state,
    refetch,
    incrementCount,
    decrementCount,
    resetCount
  };
};

export default useNotificationCount;