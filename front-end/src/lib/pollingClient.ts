/**
 * PollingClient Service
 * 
 * Frontend service for managing polling-based real-time updates with configurable intervals,
 * error handling, retry logic, and automatic interval adjustment.
 */

export interface PollingOptions {
  interval?: number;
  lastUpdate?: string;
  params?: Record<string, any>;
  onUpdate?: (data: any, sessionId: string) => void;
  onError?: (error: Error, sessionId: string, retryCount: number) => void;
}

export interface PollingSession {
  id: string;
  endpoint: string;
  interval: number;
  lastUpdate: string | null;
  params: Record<string, any>;
  retryCount: number;
  isActive: boolean;
  timeoutId: NodeJS.Timeout | null;
  onUpdate: (data: any, sessionId: string) => void;
  onError: (error: Error, sessionId: string, retryCount: number) => void;
}

export interface PollingConfig {
  baseURL: string;
  defaultInterval: number;
  minInterval: number;
  maxInterval: number;
  adaptivePolling: boolean;
  maxRetries: number;
  retryDelay: number;
  authToken?: string;
}

export interface SessionControl {
  stop: () => void;
  updateParams: (newParams: Record<string, any>) => void;
  getStatus: () => SessionStatus;
}

export interface SessionStatus {
  exists: boolean;
  isActive?: boolean;
  endpoint?: string;
  interval?: number;
  lastUpdate?: string | null;
  retryCount?: number;
}

class PollingClient {
  private config: PollingConfig;
  private activeSessions: Map<string, PollingSession>;
  private onConnect: (sessionId: string, endpoint: string) => void;
  private onDisconnect: (sessionId: string, endpoint: string) => void;

  constructor(config: Partial<PollingConfig> = {}) {
    this.config = {
      baseURL: config.baseURL || (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'),
      defaultInterval: config.defaultInterval || 30000, // 30 seconds
      minInterval: config.minInterval || 5000, // 5 seconds
      maxInterval: config.maxInterval || 300000, // 5 minutes
      adaptivePolling: config.adaptivePolling !== false, // Default true
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 5000,
      authToken: config.authToken
    };

    this.activeSessions = new Map();
    this.onConnect = () => {};
    this.onDisconnect = () => {};

    // Set auth token from localStorage if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        this.setAuthToken(token);
      }
    }
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.config.authToken = token;
  }

  /**
   * Set connection event handlers
   */
  setEventHandlers(handlers: {
    onConnect?: (sessionId: string, endpoint: string) => void;
    onDisconnect?: (sessionId: string, endpoint: string) => void;
  }): void {
    if (handlers.onConnect) this.onConnect = handlers.onConnect;
    if (handlers.onDisconnect) this.onDisconnect = handlers.onDisconnect;
  }

  /**
   * Start polling for a specific endpoint
   */
  startPolling(sessionId: string, endpoint: string, options: PollingOptions = {}): SessionControl {
    // Stop existing session if it exists
    this.stopPolling(sessionId);

    const session: PollingSession = {
      id: sessionId,
      endpoint,
      interval: options.interval || this.config.defaultInterval,
      lastUpdate: options.lastUpdate || null,
      params: options.params || {},
      retryCount: 0,
      isActive: true,
      timeoutId: null,
      onUpdate: options.onUpdate || (() => {}),
      onError: options.onError || ((error) => console.error('Polling error:', error))
    };

    this.activeSessions.set(sessionId, session);
    
    // Start polling immediately
    this.poll(session);
    
    this.onConnect(sessionId, endpoint);

    return {
      stop: () => this.stopPolling(sessionId),
      updateParams: (newParams) => this.updatePollingParams(sessionId, newParams),
      getStatus: () => this.getSessionStatus(sessionId)
    };
  }

  /**
   * Stop polling for a specific session
   */
  stopPolling(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.isActive = false;
      if (session.timeoutId) {
        clearTimeout(session.timeoutId);
      }
      this.activeSessions.delete(sessionId);
      this.onDisconnect(sessionId, session.endpoint);
    }
  }

  /**
   * Stop all active polling sessions
   */
  stopAllPolling(): void {
    for (const sessionId of this.activeSessions.keys()) {
      this.stopPolling(sessionId);
    }
  }

  /**
   * Update polling parameters for a session
   */
  updatePollingParams(sessionId: string, newParams: Record<string, any>): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.params = { ...session.params, ...newParams };
    }
  }

  /**
   * Get status of a polling session
   */
  getSessionStatus(sessionId: string): SessionStatus {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return { exists: false };
    }

    return {
      exists: true,
      isActive: session.isActive,
      endpoint: session.endpoint,
      interval: session.interval,
      lastUpdate: session.lastUpdate,
      retryCount: session.retryCount
    };
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): Array<{
    id: string;
    endpoint: string;
    interval: number;
    lastUpdate: string | null;
    retryCount: number;
    isActive: boolean;
  }> {
    return Array.from(this.activeSessions.values()).map(session => ({
      id: session.id,
      endpoint: session.endpoint,
      interval: session.interval,
      lastUpdate: session.lastUpdate,
      retryCount: session.retryCount,
      isActive: session.isActive
    }));
  }

  /**
   * Internal polling method
   */
  private async poll(session: PollingSession): Promise<void> {
    if (!session.isActive) {
      return;
    }

    try {
      const response = await this.makeRequest(session);
      
      if (response.success) {
        // Reset retry count on successful request
        session.retryCount = 0;
        
        // Update last update timestamp
        if (response.data && response.data.currentTimestamp) {
          session.lastUpdate = response.data.currentTimestamp;
        }
        
        // Adaptive interval adjustment
        if (this.config.adaptivePolling && response.pollingInfo) {
          const recommendedInterval = response.pollingInfo.recommendedInterval;
          if (recommendedInterval && 
              recommendedInterval >= this.config.minInterval && 
              recommendedInterval <= this.config.maxInterval) {
            session.interval = recommendedInterval;
          }
        }
        
        // Call update handler
        session.onUpdate(response.data, session.id);
        
      } else {
        throw new Error(response.error || 'Polling request failed');
      }
      
    } catch (error) {
      session.retryCount++;
      
      // Special handling for 404 errors - stop polling immediately
      if (error instanceof Error && (error.message.includes('404') || error.message.includes('Not Found'))) {
        console.warn(`Polling endpoint not found for session ${session.id}. Stopping polling.`);
        this.stopPolling(session.id);
        return;
      }
      
      // Call error handler
      session.onError(error as Error, session.id, session.retryCount);
      
      // Stop polling if max retries exceeded
      if (session.retryCount >= this.config.maxRetries) {
        console.error(`Max retries exceeded for session ${session.id}. Stopping polling.`);
        this.stopPolling(session.id);
        return;
      }
      
      // Increase interval on error (exponential backoff)
      session.interval = Math.min(
        session.interval * Math.pow(2, session.retryCount - 1),
        this.config.maxInterval
      );
    }
    
    // Schedule next poll if session is still active
    if (session.isActive) {
      session.timeoutId = setTimeout(() => this.poll(session), session.interval);
    }
  }

  /**
   * Make HTTP request to polling endpoint
   */
  private async makeRequest(session: PollingSession): Promise<any> {
    const url = new URL(session.endpoint, this.config.baseURL);
    
    // Add query parameters
    const params = { ...session.params };
    if (session.lastUpdate) {
      params.lastUpdate = session.lastUpdate;
    }
    
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        url.searchParams.append(key, params[key]);
      }
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Add authentication header if token is available
    // Try to get fresh token from localStorage if not set
    if (!this.config.authToken && typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        this.setAuthToken(token);
      }
    }

    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      cache: 'no-cache'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // If it's a 401 (unauthorized), try to refresh the token
      if (response.status === 401 && typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token && token !== this.config.authToken) {
          this.setAuthToken(token);
          // Don't retry immediately, let the next poll attempt use the new token
        }
      }
      
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Create a resource polling session
   */
  pollResources(sessionId: string, hospitalId: number, options: PollingOptions = {}): SessionControl {
    const endpoint = `/hospitals/${hospitalId}/polling/resources`;
    
    return this.startPolling(sessionId, endpoint, {
      ...options,
      params: {
        ...options.params,
        hospitalId
      }
    });
  }

  /**
   * Create a booking polling session
   */
  pollBookings(sessionId: string, hospitalId: number, options: PollingOptions = {}): SessionControl {
    const endpoint = `/hospitals/${hospitalId}/polling/bookings`;
    
    return this.startPolling(sessionId, endpoint, {
      ...options,
      params: {
        ...options.params,
        hospitalId
      }
    });
  }

  /**
   * Create a dashboard polling session
   */
  pollDashboard(sessionId: string, hospitalId: number, options: PollingOptions = {}): SessionControl {
    const endpoint = `/hospitals/${hospitalId}/polling/dashboard`;
    
    return this.startPolling(sessionId, endpoint, options);
  }

  /**
   * Create a change detection polling session
   */
  pollChanges(sessionId: string, hospitalId: number, options: PollingOptions = {}): SessionControl {
    const endpoint = `/hospitals/${hospitalId}/polling/changes`;
    
    return this.startPolling(sessionId, endpoint, {
      ...options,
      interval: options.interval || 10000, // Faster polling for change detection
      params: {
        ...options.params,
        hospitalId
      }
    });
  }

  /**
   * Get polling configuration from server
   */
  async getPollingConfig(hospitalId: number): Promise<any> {
    try {
      const endpoint = `/hospitals/${hospitalId}/polling/config`;
      
      const session: Partial<PollingSession> = {
        endpoint,
        params: { hospitalId }
      };
      
      const response = await this.makeRequest(session as PollingSession);
      return response;
      
    } catch (error) {
      console.error('Error fetching polling config:', error);
      throw error;
    }
  }

  /**
   * Check polling service health
   */
  async checkHealth(): Promise<any> {
    try {
      const session: Partial<PollingSession> = {
        endpoint: '/polling/health',
        params: {}
      };
      
      const response = await this.makeRequest(session as PollingSession);
      return response;
      
    } catch (error) {
      console.error('Error checking polling health:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const pollingClient = new PollingClient();

export default PollingClient;