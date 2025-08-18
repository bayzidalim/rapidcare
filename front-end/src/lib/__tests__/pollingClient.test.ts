/**
 * Integration tests for PollingClient
 */

import PollingClient from '../pollingClient';

// Mock fetch for testing
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('PollingClient', () => {
  let pollingClient: PollingClient;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    pollingClient = new PollingClient({
      baseURL: 'http://localhost:5000/api',
      defaultInterval: 1000, // 1 second for faster tests
      maxRetries: 2
    });
  });

  afterEach(() => {
    pollingClient.stopAllPolling();
    jest.useRealTimers();
  });

  describe('Basic Polling Functionality', () => {
    it('should start polling and make initial request', async () => {
      const mockResponse = {
        success: true,
        data: {
          hasChanges: true,
          currentTimestamp: '2023-01-01T00:00:00.000Z',
          changes: { byHospital: [] }
        },
        pollingInfo: {
          recommendedInterval: 2000
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const onUpdate = jest.fn();
      const session = pollingClient.startPolling('test-session', '/test-endpoint', {
        onUpdate
      });

      // Wait for initial request
      await jest.runOnlyPendingTimersAsync();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test-endpoint'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          cache: 'no-cache'
        })
      );

      expect(onUpdate).toHaveBeenCalledWith(mockResponse.data, 'test-session');

      session.stop();
    });

    it('should include authentication token when available', async () => {
      const token = 'test-token';
      pollingClient.setAuthToken(token);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      } as Response);

      pollingClient.startPolling('auth-test', '/test-endpoint');

      await jest.runOnlyPendingTimersAsync();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${token}`
          })
        })
      );
    });

    it('should add query parameters correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      } as Response);

      pollingClient.startPolling('params-test', '/test-endpoint', {
        params: {
          hospitalId: 123,
          resourceType: 'beds'
        },
        lastUpdate: '2023-01-01T00:00:00.000Z'
      });

      await jest.runOnlyPendingTimersAsync();

      const expectedUrl = expect.stringContaining('/test-endpoint?hospitalId=123&resourceType=beds&lastUpdate=2023-01-01T00%3A00%3A00.000Z');
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    });
  });

  describe('Adaptive Polling', () => {
    it('should adjust interval based on server recommendations', async () => {
      const mockResponse = {
        success: true,
        data: { hasChanges: false, currentTimestamp: '2023-01-01T00:00:00.000Z' },
        pollingInfo: { recommendedInterval: 5000 }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const session = pollingClient.startPolling('adaptive-test', '/test-endpoint');
      
      // Initial request
      await jest.runOnlyPendingTimersAsync();
      
      // Check that interval was adjusted
      const status = session.getStatus();
      expect(status.interval).toBe(5000);

      session.stop();
    });

    it('should respect min and max interval limits', async () => {
      const pollingClientWithLimits = new PollingClient({
        minInterval: 2000,
        maxInterval: 10000,
        defaultInterval: 5000
      });

      // Test minimum limit
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {},
          pollingInfo: { recommendedInterval: 1000 } // Below minimum
        }),
      } as Response);

      const session1 = pollingClientWithLimits.startPolling('min-test', '/test-endpoint');
      await jest.runOnlyPendingTimersAsync();
      
      let status = session1.getStatus();
      expect(status.interval).toBe(5000); // Should stay at default, not go below min

      session1.stop();

      // Test maximum limit
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {},
          pollingInfo: { recommendedInterval: 20000 } // Above maximum
        }),
      } as Response);

      const session2 = pollingClientWithLimits.startPolling('max-test', '/test-endpoint');
      await jest.runOnlyPendingTimersAsync();
      
      status = session2.getStatus();
      expect(status.interval).toBe(5000); // Should stay at default, not go above max

      session2.stop();
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should retry on network errors with exponential backoff', async () => {
      const onError = jest.fn();
      
      // First request fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      // Second request succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      } as Response);

      const session = pollingClient.startPolling('retry-test', '/test-endpoint', {
        onError
      });

      // Initial request (fails)
      await jest.runOnlyPendingTimersAsync();
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        'retry-test',
        1
      );

      // Retry request (succeeds)
      await jest.runOnlyPendingTimersAsync();
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Check that interval increased due to error
      const status = session.getStatus();
      expect(status.retryCount).toBe(0); // Reset after successful request

      session.stop();
    });

    it('should stop polling after max retries exceeded', async () => {
      const onError = jest.fn();
      
      // All requests fail
      mockFetch.mockRejectedValue(new Error('Persistent error'));

      pollingClient.startPolling('max-retry-test', '/test-endpoint', {
        onError
      });

      // Initial request + 2 retries = 3 total attempts
      await jest.runOnlyPendingTimersAsync(); // Initial
      await jest.runOnlyPendingTimersAsync(); // Retry 1
      await jest.runOnlyPendingTimersAsync(); // Retry 2

      expect(onError).toHaveBeenCalledTimes(3);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Session should be stopped after max retries (no need to check status as it's deleted)
      const activeSessions = pollingClient.getActiveSessions();
      expect(activeSessions.find(s => s.id === 'max-retry-test')).toBeUndefined();
    });

    it('should handle HTTP error responses', async () => {
      const onError = jest.fn();
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      } as Response);

      pollingClient.startPolling('http-error-test', '/test-endpoint', {
        onError
      });

      await jest.runOnlyPendingTimersAsync();

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Server error'
        }),
        'http-error-test',
        1
      );
    });
  });

  describe('Session Management', () => {
    it('should manage multiple polling sessions', () => {
      const session1 = pollingClient.startPolling('session-1', '/endpoint-1');
      const session2 = pollingClient.startPolling('session-2', '/endpoint-2');

      const activeSessions = pollingClient.getActiveSessions();
      expect(activeSessions).toHaveLength(2);
      expect(activeSessions.map(s => s.id)).toContain('session-1');
      expect(activeSessions.map(s => s.id)).toContain('session-2');

      session1.stop();
      session2.stop();
    });

    it('should stop specific sessions', () => {
      const session1 = pollingClient.startPolling('session-1', '/endpoint-1');
      const session2 = pollingClient.startPolling('session-2', '/endpoint-2');

      session1.stop();

      const activeSessions = pollingClient.getActiveSessions();
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].id).toBe('session-2');

      session2.stop();
    });

    it('should stop all sessions', () => {
      pollingClient.startPolling('session-1', '/endpoint-1');
      pollingClient.startPolling('session-2', '/endpoint-2');
      pollingClient.startPolling('session-3', '/endpoint-3');

      pollingClient.stopAllPolling();

      const activeSessions = pollingClient.getActiveSessions();
      expect(activeSessions).toHaveLength(0);
    });

    it('should update session parameters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      } as Response);

      const session = pollingClient.startPolling('param-update-test', '/test-endpoint', {
        params: { initialParam: 'value1' }
      });

      // Wait for initial request
      await jest.runOnlyPendingTimersAsync();

      // Update params and trigger next poll
      session.updateParams({ newParam: 'value2' });
      await jest.runOnlyPendingTimersAsync();

      const expectedUrl = expect.stringContaining('initialParam=value1&newParam=value2');
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));

      session.stop();
    });
  });

  describe('Specialized Polling Methods', () => {
    it('should create resource polling session with correct endpoint', () => {
      const session = pollingClient.pollResources('resource-test', 123);
      
      const status = session.getStatus();
      expect(status.endpoint).toBe('/hospitals/123/polling/resources');
      
      session.stop();
    });

    it('should create booking polling session with correct endpoint', () => {
      const session = pollingClient.pollBookings('booking-test', 456);
      
      const status = session.getStatus();
      expect(status.endpoint).toBe('/hospitals/456/polling/bookings');
      
      session.stop();
    });

    it('should create dashboard polling session with correct endpoint', () => {
      const session = pollingClient.pollDashboard('dashboard-test', 789);
      
      const status = session.getStatus();
      expect(status.endpoint).toBe('/hospitals/789/polling/dashboard');
      
      session.stop();
    });

    it('should create change detection polling with faster interval', () => {
      const session = pollingClient.pollChanges('changes-test', 101);
      
      const status = session.getStatus();
      expect(status.endpoint).toBe('/hospitals/101/polling/changes');
      expect(status.interval).toBe(10000); // Should use faster interval
      
      session.stop();
    });
  });

  describe('Configuration and Health Checks', () => {
    it('should fetch polling configuration', async () => {
      const mockConfig = {
        success: true,
        data: {
          recommendedInterval: 15000,
          configuration: {
            minInterval: 5000,
            maxInterval: 300000
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      } as Response);

      const config = await pollingClient.getPollingConfig(123);
      
      expect(config).toEqual(mockConfig);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/hospitals/123/polling/config'),
        expect.any(Object)
      );
    });

    it('should check polling service health', async () => {
      const mockHealth = {
        success: true,
        data: {
          status: 'healthy',
          timestamp: '2023-01-01T00:00:00.000Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHealth,
      } as Response);

      const health = await pollingClient.checkHealth();
      
      expect(health).toEqual(mockHealth);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/polling/health'),
        expect.any(Object)
      );
    });
  });

  describe('Timestamp Management', () => {
    it('should update lastUpdate timestamp from server response', async () => {
      const mockResponse = {
        success: true,
        data: {
          hasChanges: true,
          currentTimestamp: '2023-01-01T12:00:00.000Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const session = pollingClient.startPolling('timestamp-test', '/test-endpoint');

      await jest.runOnlyPendingTimersAsync();

      const status = session.getStatus();
      expect(status.lastUpdate).toBe('2023-01-01T12:00:00.000Z');

      session.stop();
    });

    it('should include lastUpdate in subsequent requests', async () => {
      const initialTimestamp = '2023-01-01T10:00:00.000Z';
      const updatedTimestamp = '2023-01-01T12:00:00.000Z';

      // First response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { currentTimestamp: updatedTimestamp }
        }),
      } as Response);

      // Second response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { currentTimestamp: '2023-01-01T14:00:00.000Z' }
        }),
      } as Response);

      const session = pollingClient.startPolling('timestamp-test', '/test-endpoint', {
        lastUpdate: initialTimestamp
      });

      // First request should include initial timestamp
      await jest.runOnlyPendingTimersAsync();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`lastUpdate=${encodeURIComponent(initialTimestamp)}`),
        expect.any(Object)
      );

      // Second request should include updated timestamp
      await jest.runOnlyPendingTimersAsync();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`lastUpdate=${encodeURIComponent(updatedTimestamp)}`),
        expect.any(Object)
      );

      session.stop();
    });
  });
});