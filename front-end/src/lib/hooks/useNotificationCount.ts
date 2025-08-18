'use client';

import { useState, useEffect, useRef } from 'react';
import { notificationAPI } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

interface NotificationCountState {
  count: number;
  loading: boolean;
  error: string | null;
}

export function useNotificationCount() {
  const [state, setState] = useState<NotificationCountState>({
    count: 0,
    loading: false,
    error: null
  });

  const intervalRef = useRef<NodeJS.Timeout>();

  // Simple fetch function
  const fetchNotificationCount = async (showLoading: boolean = false) => {
    if (!isAuthenticated()) {
      setState({ count: 0, loading: false, error: null });
      return;
    }

    if (showLoading) {
      setState(prev => ({ ...prev, loading: true, error: null }));
    }

    try {
      const response = await notificationAPI.getUnreadCount();
      
      setState({
        count: response.data?.data?.count || 0,
        loading: false,
        error: null
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch notifications';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  };

  // Set up polling
  useEffect(() => {
    if (!isAuthenticated()) {
      return;
    }

    // Initial fetch
    fetchNotificationCount(true);

    // Set up polling every 30 seconds
    intervalRef.current = setInterval(() => {
      fetchNotificationCount(false);
    }, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // Empty dependency array

  // Simple functions
  const refetch = async () => {
    await fetchNotificationCount(true);
  };

  const incrementCount = () => {
    setState(prev => ({ ...prev, count: prev.count + 1 }));
  };

  const decrementCount = () => {
    setState(prev => ({ ...prev, count: Math.max(0, prev.count - 1) }));
  };

  const resetCount = () => {
    setState(prev => ({ ...prev, count: 0 }));
  };

  return {
    count: state.count,
    loading: state.loading,
    error: state.error,
    refetch,
    incrementCount,
    decrementCount,
    resetCount
  };
}

export default useNotificationCount;