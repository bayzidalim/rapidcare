import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotificationCount } from '../useNotificationCount';
import { notificationAPI } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

// Mock the dependencies
jest.mock('@/lib/api');
jest.mock('@/lib/auth');

const mockNotificationAPI = notificationAPI as jest.Mocked<typeof notificationAPI>;
const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>;

describe('useNotificationCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock successful API response by default
    mockNotificationAPI.getUnreadCount.mockResolvedValue({
      data: {
        success: true,
        data: {
          unreadCount: 5
        }
      }
    } as any);
    
    // Mock authenticated by default
    mockIsAuthenticated.mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useNotificationCount(0, false)); // Disable polling for test
    
    expect(result.current.loading).toBe(true);
    expect(result.current.count).toBe(0);
    expect(result.current.error).toBe(null);
  });

  it('should fetch notification count on mount when authenticated', async () => {
    const { result } = renderHook(() => useNotificationCount(0, false));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(mockNotificationAPI.getUnreadCount).toHaveBeenCalledTimes(1);
    expect(result.current.count).toBe(5);
    expect(result.current.error).toBe(null);
  });

  it('should not fetch when user is not authenticated', async () => {
    mockIsAuthenticated.mockReturnValue(false);
    
    const { result } = renderHook(() => useNotificationCount(0, false));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(mockNotificationAPI.getUnreadCount).not.toHaveBeenCalled();
    expect(result.current.count).toBe(0);
    expect(result.current.error).toBe(null);
  });

  it('should handle API errors gracefully', async () => {
    const errorMessage = 'Network error';
    mockNotificationAPI.getUnreadCount.mockRejectedValue({
      response: {
        data: {
          message: errorMessage
        }
      }
    });
    
    const { result } = renderHook(() => useNotificationCount(0, false));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.count).toBe(0);
    expect(result.current.error).toBe(errorMessage);
  });

  it('should handle API errors without response data', async () => {
    mockNotificationAPI.getUnreadCount.mockRejectedValue(new Error('Network error'));
    
    const { result } = renderHook(() => useNotificationCount(0, false));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.count).toBe(0);
    expect(result.current.error).toBe('Failed to load notification count');
  });

  it('should refetch data when refetch is called', async () => {
    const { result } = renderHook(() => useNotificationCount(0, false));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Clear previous calls
    mockNotificationAPI.getUnreadCount.mockClear();
    
    // Update mock to return different count
    mockNotificationAPI.getUnreadCount.mockResolvedValue({
      data: {
        success: true,
        data: {
          unreadCount: 10
        }
      }
    } as any);
    
    await act(async () => {
      await result.current.refetch();
    });
    
    expect(mockNotificationAPI.getUnreadCount).toHaveBeenCalledTimes(1);
    expect(result.current.count).toBe(10);
  });

  it('should increment count optimistically', async () => {
    const { result } = renderHook(() => useNotificationCount(0, false));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.count).toBe(5);
    
    act(() => {
      result.current.incrementCount();
    });
    
    expect(result.current.count).toBe(6);
  });

  it('should decrement count optimistically', async () => {
    const { result } = renderHook(() => useNotificationCount(0, false));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.count).toBe(5);
    
    act(() => {
      result.current.decrementCount();
    });
    
    expect(result.current.count).toBe(4);
  });

  it('should not decrement count below zero', async () => {
    mockNotificationAPI.getUnreadCount.mockResolvedValue({
      data: {
        success: true,
        data: {
          unreadCount: 0
        }
      }
    } as any);
    
    const { result } = renderHook(() => useNotificationCount(0, false));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.count).toBe(0);
    
    act(() => {
      result.current.decrementCount();
    });
    
    expect(result.current.count).toBe(0);
  });

  it('should reset count to zero', async () => {
    const { result } = renderHook(() => useNotificationCount(0, false));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.count).toBe(5);
    
    act(() => {
      result.current.resetCount();
    });
    
    expect(result.current.count).toBe(0);
  });

  it('should poll for updates when polling is enabled', async () => {
    const { result } = renderHook(() => useNotificationCount(1000, true)); // 1 second polling
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(mockNotificationAPI.getUnreadCount).toHaveBeenCalledTimes(1);
    
    // Fast-forward time by 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    await waitFor(() => {
      expect(mockNotificationAPI.getUnreadCount).toHaveBeenCalledTimes(2);
    });
  });

  it('should not poll when polling is disabled', async () => {
    const { result } = renderHook(() => useNotificationCount(1000, false));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(mockNotificationAPI.getUnreadCount).toHaveBeenCalledTimes(1);
    
    // Fast-forward time by 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // Should still be only 1 call (initial fetch)
    expect(mockNotificationAPI.getUnreadCount).toHaveBeenCalledTimes(1);
  });

  it('should cleanup polling on unmount', async () => {
    const { result, unmount } = renderHook(() => useNotificationCount(1000, true));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    unmount();
    
    // Fast-forward time - should not make additional calls after unmount
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    expect(mockNotificationAPI.getUnreadCount).toHaveBeenCalledTimes(1);
  });
});