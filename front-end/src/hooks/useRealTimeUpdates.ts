'use client';

import { useState, useEffect, useRef } from 'react';
import { getCurrentUser } from '@/lib/auth';

interface UseRealTimeUpdatesOptions {
  enabled?: boolean;
  interval?: number;
  onUpdate?: (data: any) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

interface RealTimeStatus {
  isConnected: boolean;
  retryCount: number;
  lastUpdate: string | null;
  error: string | null;
}

export function useRealTimeUpdates(
  sessionId: string,
  endpoint: string,
  options: UseRealTimeUpdatesOptions = {}
) {
  const [status, setStatus] = useState<RealTimeStatus>({
    isConnected: false,
    retryCount: 0,
    lastUpdate: null,
    error: null
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentUser = getCurrentUser();

  const {
    enabled = true,
    interval = 30000,
    onUpdate,
    onError,
    onConnect,
    onDisconnect
  } = options;

  // Simple polling function
  const poll = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const fullUrl = `${apiUrl}${endpoint}`;
      
      console.log(`🔄 Polling: ${fullUrl}`); // Debug log
      
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        console.log(`✅ Poll success: ${fullUrl}`, data); // Debug log

        setStatus(prev => ({
          ...prev,
          isConnected: true,
          lastUpdate: new Date().toISOString(),
          error: null,
          retryCount: 0
        }));

        if (onUpdate) {
          onUpdate(data);
        }
      } else {
        console.warn(`❌ Poll failed: ${fullUrl} - HTTP ${response.status}`); // Debug log
        
        // For 404 errors, don't treat as critical - the endpoint might not be implemented yet
        if (response.status === 404) {
          console.log(`⚠️ Endpoint not found: ${fullUrl} - Polling disabled for this endpoint`);
          setStatus(prev => ({
            ...prev,
            isConnected: false,
            error: `Endpoint not implemented: ${endpoint}`,
            retryCount: prev.retryCount + 1
          }));
          return; // Don't throw error for 404s
        }
        
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`💥 Poll error: ${endpoint}`, error); // Debug log

      setStatus(prev => ({
        ...prev,
        isConnected: false,
        error: errorMessage,
        retryCount: prev.retryCount + 1
      }));

      // Only call onError for non-404 errors
      if (onError && !errorMessage.includes('404')) {
        onError(error instanceof Error ? error : new Error(errorMessage));
      }
    }
  };

  useEffect(() => {
    if (!enabled || !currentUser) {
      console.log(`⏸️ Polling disabled: enabled=${enabled}, currentUser=${!!currentUser}`);
      return;
    }

    console.log(`🚀 Starting polling for: ${endpoint}`);

    // Initial connection
    if (onConnect) {
      onConnect();
    }

    // Start polling with a small delay to avoid immediate errors
    const startPolling = () => {
      poll(); // Initial poll
      intervalRef.current = setInterval(poll, interval);
    };

    // Start after a short delay
    const timeoutId = setTimeout(startPolling, 1000);

    return () => {
      clearTimeout(timeoutId);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (onDisconnect) {
        onDisconnect();
      }
      
      console.log(`🛑 Stopped polling for: ${endpoint}`);
    };
  }, [enabled, sessionId, endpoint, interval]); // Simplified dependencies

  const updateParams = (_newParams: Record<string, any>) => {
    // Simple parameter update - just restart polling
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(poll, interval);
    }
  };

  const reconnect = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (enabled && currentUser) {
      poll(); // Immediate poll
      intervalRef.current = setInterval(poll, interval);
    }
  };

  return {
    status,
    updateParams,
    reconnect
  };
}

// Hook for booking status updates
export function useBookingUpdates(
  hospitalId?: number,
  options: UseRealTimeUpdatesOptions = {}
) {
  const currentUser = getCurrentUser();
  const sessionId = `booking-updates-${currentUser?.id || 'anonymous'}`;

  let endpoint = '/polling/bookings';
  if (hospitalId) {
    endpoint = `/hospitals/${hospitalId}/polling/bookings`;
  }

  // Disable polling by default since these endpoints might not be implemented yet
  const isPollingEnabled = process.env.NEXT_PUBLIC_ENABLE_POLLING === 'true' || false;

  return useRealTimeUpdates(sessionId, endpoint, {
    ...options,
    enabled: isPollingEnabled && (options.enabled !== false), // Only enable if explicitly enabled
    interval: options.interval || 20000 // 20 seconds for booking updates
  });
}

// Hook for notification updates
export function useNotificationUpdates(options: UseRealTimeUpdatesOptions = {}) {
  const currentUser = getCurrentUser();
  const sessionId = `notification-updates-${currentUser?.id || 'anonymous'}`;

  // Disable polling by default since these endpoints might not be implemented yet
  const isPollingEnabled = process.env.NEXT_PUBLIC_ENABLE_POLLING === 'true' || false;

  return useRealTimeUpdates(sessionId, '/polling/notifications', {
    ...options,
    enabled: isPollingEnabled && (options.enabled !== false), // Only enable if explicitly enabled
    interval: options.interval || 30000 // 30 seconds for notifications
  });
}

// Hook for resource availability updates
export function useResourceUpdates(
  hospitalId: number,
  options: UseRealTimeUpdatesOptions = {}
) {
  const currentUser = getCurrentUser();
  const sessionId = `resource-updates-${hospitalId}-${currentUser?.id || 'anonymous'}`;

  // Disable polling by default since these endpoints might not be implemented yet
  const isPollingEnabled = process.env.NEXT_PUBLIC_ENABLE_POLLING === 'true' || false;

  return useRealTimeUpdates(sessionId, `/hospitals/${hospitalId}/polling/resources`, {
    ...options,
    enabled: isPollingEnabled && (options.enabled !== false), // Only enable if explicitly enabled
    interval: options.interval || 15000 // 15 seconds for resource updates
  });
}

// Hook for dashboard updates
export function useDashboardUpdates(options: UseRealTimeUpdatesOptions = {}) {
  const currentUser = getCurrentUser();
  const sessionId = `dashboard-updates-${currentUser?.id || 'anonymous'}`;

  let endpoint = '/polling/dashboard';
  if (currentUser?.userType === 'hospital-authority' && currentUser.hospitalId) {
    endpoint = `/hospitals/${currentUser.hospitalId}/polling/dashboard`;
  }

  // Disable polling by default since these endpoints might not be implemented yet
  const isPollingEnabled = process.env.NEXT_PUBLIC_ENABLE_POLLING === 'true' || false;

  return useRealTimeUpdates(sessionId, endpoint, {
    ...options,
    enabled: isPollingEnabled && (options.enabled !== false), // Only enable if explicitly enabled
    interval: options.interval || 25000 // 25 seconds for dashboard updates
  });
}