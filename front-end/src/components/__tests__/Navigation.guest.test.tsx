import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navigation from '../Navigation';

// Mock Next.js router
const mockPush = jest.fn();
const mockPathname = '/';

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock auth functions
jest.mock('@/lib/auth', () => {
  const mockIsAuthenticated = jest.fn();
  const mockGetCurrentUser = jest.fn();
  const mockLogout = jest.fn();
  
  return {
    isAuthenticated: mockIsAuthenticated,
    getCurrentUser: mockGetCurrentUser,
    logout: mockLogout,
  };
});

// Mock navigation config
jest.mock('@/lib/navigationConfig', () => ({
  createNavigationConfigFromAuth: () => ({
    primaryItems: [
      {
        href: '/hospitals',
        label: 'Hospitals',
        icon: () => <div>Hospital Icon</div>,
        requiresAuth: false,
        priority: 'primary',
        showOnMobile: true,
      },
      {
        href: '/booking',
        label: 'Book Now',
        icon: () => <div>Booking Icon</div>,
        requiresAuth: true,
        priority: 'primary',
        showOnMobile: true,
      },
    ],
    secondaryItems: [],
    actionItems: [
      {
        type: 'auth',
        component: 'AuthButton',
        requiresAuth: false,
      },
    ],
    mobileItems: [
      {
        href: '/hospitals',
        label: 'Hospitals',
        icon: () => <div>Hospital Icon</div>,
        requiresAuth: false,
        priority: 'primary',
        showOnMobile: true,
      },
      {
        href: '/booking',
        label: 'Book Now',
        icon: () => <div>Booking Icon</div>,
        requiresAuth: true,
        priority: 'primary',
        showOnMobile: true,
      },
    ],
  }),
}));

// Mock notification hook
jest.mock('@/lib/hooks/useNotificationCount', () => ({
  useNotificationCount: () => ({
    count: 0,
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

// Mock other components
jest.mock('../NotificationBell', () => {
  return function MockNotificationBell({ onClick }: { onClick: () => void }) {
    return <button onClick={onClick}>Notifications</button>;
  };
});

jest.mock('../UserMenu', () => {
  return function MockUserMenu({ onLogout }: { onLogout: () => void }) {
    return <button onClick={onLogout}>User Menu</button>;
  };
});

describe('Navigation - Guest Mode', () => {
  let mockIsAuthenticated: jest.Mock;
  let mockGetCurrentUser: jest.Mock;
  let mockLogout: jest.Mock;

  beforeEach(() => {
    // Get the mocked functions
    const authModule = require('@/lib/auth');
    mockIsAuthenticated = authModule.isAuthenticated as jest.Mock;
    mockGetCurrentUser = authModule.getCurrentUser as jest.Mock;
    mockLogout = authModule.logout as jest.Mock;
    
    jest.clearAllMocks();
    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
  });

  describe('Guest User (Not Authenticated)', () => {
    beforeEach(() => {
      mockIsAuthenticated.mockReturnValue(false);
      mockGetCurrentUser.mockReturnValue(null);
    });

    it('should show guest mode indicator', () => {
      render(<Navigation />);
      expect(screen.getByText('Guest Mode')).toBeInTheDocument();
    });

    it('should show public navigation items without restrictions', () => {
      render(<Navigation />);
      const hospitalsLink = screen.getByText('Hospitals');
      expect(hospitalsLink).toBeInTheDocument();
      expect(hospitalsLink.closest('a')).toHaveAttribute('href', '/hospitals');
    });

    it('should show restricted items with lock icon and tooltip', async () => {
      render(<Navigation />);
      const bookingLink = screen.getByText('Book Now');
      expect(bookingLink).toBeInTheDocument();
      
      // Should have lock icon
      const lockIcon = bookingLink.parentElement?.querySelector('svg');
      expect(lockIcon).toBeInTheDocument();
      
      // Should show tooltip on hover
      fireEvent.mouseEnter(bookingLink.closest('a')!);
      await waitFor(() => {
        expect(screen.getByText(/Login required to access Book Now/)).toBeInTheDocument();
      });
    });

    it('should redirect to login when clicking restricted items', () => {
      render(<Navigation />);
      const bookingLink = screen.getByText('Book Now');
      
      fireEvent.click(bookingLink.closest('a')!);
      
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('/login?returnTo=%2Fbooking')
      );
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'intendedDestination',
        '/booking'
      );
    });

    it('should show login button in action items', () => {
      render(<Navigation />);
      expect(screen.getByText('Login')).toBeInTheDocument();
    });

    it('should show guest information in mobile menu', () => {
      render(<Navigation />);
      
      // Open mobile menu
      const menuButton = screen.getByLabelText('Open menu');
      fireEvent.click(menuButton);
      
      expect(screen.getByText('Browsing as Guest')).toBeInTheDocument();
      expect(screen.getByText('Available to you:')).toBeInTheDocument();
      expect(screen.getByText('• Browse hospitals and services')).toBeInTheDocument();
    });
  });

  describe('Authenticated User', () => {
    const mockUser = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      userType: 'user' as const,
    };

    beforeEach(() => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetCurrentUser.mockReturnValue(mockUser);
    });

    it('should not show guest mode indicator', () => {
      render(<Navigation />);
      expect(screen.queryByText('Guest Mode')).not.toBeInTheDocument();
    });

    it('should show all navigation items without restrictions', () => {
      render(<Navigation />);
      
      const hospitalsLink = screen.getByText('Hospitals');
      const bookingLink = screen.getByText('Book Now');
      
      expect(hospitalsLink.closest('a')).toHaveAttribute('href', '/hospitals');
      expect(bookingLink.closest('a')).toHaveAttribute('href', '/booking');
      
      // Should not have lock icons
      expect(screen.queryByTestId('lock-icon')).not.toBeInTheDocument();
    });

    it('should show user menu instead of login button', () => {
      render(<Navigation />);
      expect(screen.getByText('User Menu')).toBeInTheDocument();
      expect(screen.queryByText('Login')).not.toBeInTheDocument();
    });
  });

  describe('Authentication State Transitions', () => {
    it('should handle smooth transition from guest to authenticated', async () => {
      const { rerender } = render(<Navigation />);
      
      // Initially guest
      const authModule = require('@/lib/auth');
      const mockIsAuth = authModule.isAuthenticated as jest.Mock;
      const mockGetUser = authModule.getCurrentUser as jest.Mock;
      
      mockIsAuth.mockReturnValue(false);
      mockGetUser.mockReturnValue(null);
      
      expect(screen.getByText('Guest Mode')).toBeInTheDocument();
      
      // Simulate login
      mockIsAuth.mockReturnValue(true);
      mockGetUser.mockReturnValue({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        userType: 'user' as const,
      });
      
      rerender(<Navigation />);
      
      await waitFor(() => {
        expect(screen.queryByText('Guest Mode')).not.toBeInTheDocument();
        expect(screen.getByText('User Menu')).toBeInTheDocument();
      });
    });
  });
});