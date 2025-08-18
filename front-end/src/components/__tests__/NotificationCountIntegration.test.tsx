import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useNotificationCount } from '@/lib/hooks/useNotificationCount';
import NotificationBell from '../NotificationBell';
import { notificationAPI } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

// Mock the dependencies
jest.mock('@/lib/api');
jest.mock('@/lib/auth');

const mockNotificationAPI = notificationAPI as jest.Mocked<typeof notificationAPI>;
const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>;

// Test component that uses the hook
const TestNotificationComponent: React.FC = () => {
  const { count, loading, error } = useNotificationCount(0, false); // Disable polling for test
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return <NotificationBell unreadCount={count} />;
};

describe('Notification Count Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticated by default
    mockIsAuthenticated.mockReturnValue(true);
  });

  it('should integrate notification count hook with NotificationBell component', async () => {
    // Mock API response
    mockNotificationAPI.getUnreadCount.mockResolvedValue({
      data: {
        success: true,
        data: {
          unreadCount: 3
        }
      }
    } as any);

    render(<TestNotificationComponent />);

    // Should show loading initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Wait for the API call to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Should show the notification bell with count
    const badge = screen.getByText('3');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-red-500'); // Badge styling
  });

  it('should show error state when API fails', async () => {
    // Mock API error
    mockNotificationAPI.getUnreadCount.mockRejectedValue({
      response: {
        data: {
          message: 'Network error'
        }
      }
    });

    render(<TestNotificationComponent />);

    // Wait for the error to appear
    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeInTheDocument();
    });
  });

  it('should not show badge when count is zero', async () => {
    // Mock API response with zero count
    mockNotificationAPI.getUnreadCount.mockResolvedValue({
      data: {
        success: true,
        data: {
          unreadCount: 0
        }
      }
    } as any);

    render(<TestNotificationComponent />);

    // Wait for the API call to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Should not show any badge
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    
    // But should show the bell icon
    const bellButton = screen.getByRole('button', { name: /notifications/i });
    expect(bellButton).toBeInTheDocument();
  });

  it('should handle unauthenticated state', async () => {
    // Mock unauthenticated
    mockIsAuthenticated.mockReturnValue(false);

    render(<TestNotificationComponent />);

    // Wait for the component to settle
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Should not call the API
    expect(mockNotificationAPI.getUnreadCount).not.toHaveBeenCalled();
    
    // Should show bell with no badge
    const bellButton = screen.getByRole('button', { name: /notifications/i });
    expect(bellButton).toBeInTheDocument();
    expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
  });

  it('should show 99+ for counts over 99', async () => {
    // Mock API response with high count
    mockNotificationAPI.getUnreadCount.mockResolvedValue({
      data: {
        success: true,
        data: {
          unreadCount: 150
        }
      }
    } as any);

    render(<TestNotificationComponent />);

    // Wait for the API call to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Should show 99+ badge
    const badge = screen.getByText('99+');
    expect(badge).toBeInTheDocument();
  });
});