import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthGuard from '../AuthGuard';

// Mock Next.js router
const mockPush = jest.fn();
const mockPathname = '/protected-page';

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock auth hook
const mockUseAuth = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock guest utilities
const mockTrackGuestConversion = jest.fn();
const mockGetGuestFeatureMessage = jest.fn();
const mockGetGuestActionPrompt = jest.fn();

jest.mock('@/lib/guestUtils', () => ({
  trackGuestConversion: mockTrackGuestConversion,
  getGuestFeatureMessage: mockGetGuestFeatureMessage,
  getGuestActionPrompt: mockGetGuestActionPrompt,
}));

describe('AuthGuard - Comprehensive Guest Protection Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetGuestFeatureMessage.mockReturnValue('Please log in to access this feature.');
    mockGetGuestActionPrompt.mockReturnValue('To access this feature, please log in to your account.');
    
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

  describe('Guest User Protection', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });
    });

    it('should show default login prompt for unauthenticated users', () => {
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Login Required')).toBeInTheDocument();
      expect(screen.getByText(/Please log in to access this feature/)).toBeInTheDocument();
      expect(screen.getByText('Go to Login')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show custom fallback content when provided', () => {
      const customFallback = (
        <div data-testid="custom-fallback">
          <h2>Booking Requires Login</h2>
          <p>To book hospital resources, please create an account or log in.</p>
          <button>Sign Up Now</button>
        </div>
      );

      render(
        <AuthGuard fallback={customFallback}>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Booking Requires Login')).toBeInTheDocument();
      expect(screen.getByText('To book hospital resources, please create an account or log in.')).toBeInTheDocument();
      expect(screen.getByText('Sign Up Now')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should redirect to login with return URL when login button is clicked', () => {
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      const loginButton = screen.getByText('Go to Login');
      fireEvent.click(loginButton);

      expect(mockPush).toHaveBeenCalledWith('/login?returnTo=%2Fprotected-page');
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'intendedDestination',
        '/protected-page'
      );
    });

    it('should track guest conversion events', () => {
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(mockTrackGuestConversion).toHaveBeenCalledWith(
        expect.any(String), // sessionId
        'auth_guard_shown',
        'protected_access',
        { page: '/protected-page' }
      );

      const loginButton = screen.getByText('Go to Login');
      fireEvent.click(loginButton);

      expect(mockTrackGuestConversion).toHaveBeenCalledWith(
        expect.any(String), // sessionId
        'login_redirect_clicked',
        'protected_access',
        { page: '/protected-page', destination: '/login?returnTo=%2Fprotected-page' }
      );
    });

    it('should use custom redirect URL when provided', () => {
      render(
        <AuthGuard redirectTo="/custom-login">
          <div>Protected Content</div>
        </AuthGuard>
      );

      const loginButton = screen.getByText('Go to Login');
      fireEvent.click(loginButton);

      expect(mockPush).toHaveBeenCalledWith('/custom-login?returnTo=%2Fprotected-page');
    });

    it('should handle feature-specific messages', () => {
      mockGetGuestFeatureMessage.mockReturnValue('Please log in to book hospital resources.');
      mockGetGuestActionPrompt.mockReturnValue('To book resources, please log in to your account.');

      render(
        <AuthGuard feature="booking">
          <div>Booking Content</div>
        </AuthGuard>
      );

      expect(mockGetGuestFeatureMessage).toHaveBeenCalledWith('booking');
      expect(screen.getByText('Please log in to book hospital resources.')).toBeInTheDocument();
    });
  });

  describe('Authenticated User Access', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 1, name: 'John Doe', userType: 'user' },
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });
    });

    it('should show protected content for authenticated users', () => {
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(screen.queryByText('Login Required')).not.toBeInTheDocument();
    });

    it('should not track conversion events for authenticated users', () => {
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(mockTrackGuestConversion).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should show loading state while authentication is being checked', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        login: jest.fn(),
        logout: jest.fn(),
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      expect(screen.queryByText('Login Required')).not.toBeInTheDocument();
    });

    it('should show custom loading content when provided', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const customLoading = <div data-testid="custom-loading">Loading your session...</div>;

      render(
        <AuthGuard loadingFallback={customLoading}>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByTestId('custom-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading your session...')).toBeInTheDocument();
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow access for users with required roles', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 1, name: 'Admin User', userType: 'admin' },
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      render(
        <AuthGuard requiredRoles={['admin', 'hospital-authority']}>
          <div>Admin Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    it('should deny access for users without required roles', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 1, name: 'Regular User', userType: 'user' },
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      render(
        <AuthGuard requiredRoles={['admin']}>
          <div>Admin Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/You don't have permission to access this feature/)).toBeInTheDocument();
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });

    it('should show custom access denied message for role restrictions', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 1, name: 'Regular User', userType: 'user' },
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        logout: jest.fn(),
      });

      const customAccessDenied = (
        <div data-testid="custom-access-denied">
          <h2>Hospital Authority Access Required</h2>
          <p>This feature is only available to hospital authorities.</p>
        </div>
      );

      render(
        <AuthGuard 
          requiredRoles={['hospital-authority']} 
          accessDeniedFallback={customAccessDenied}
        >
          <div>Hospital Management</div>
        </AuthGuard>
      );

      expect(screen.getByTestId('custom-access-denied')).toBeInTheDocument();
      expect(screen.getByText('Hospital Authority Access Required')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Authentication service unavailable',
        login: jest.fn(),
        logout: jest.fn(),
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Authentication Error')).toBeInTheDocument();
      expect(screen.getByText('Authentication service unavailable')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should allow retry on authentication errors', async () => {
      const mockRetry = jest.fn();
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Network error',
        retry: mockRetry,
        login: jest.fn(),
        logout: jest.fn(),
      });

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      expect(mockRetry).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      const loginSection = screen.getByRole('region', { name: /authentication required/i });
      expect(loginSection).toBeInTheDocument();

      const loginButton = screen.getByRole('button', { name: /go to login/i });
      expect(loginButton).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      const loginButton = screen.getByText('Go to Login');
      
      // Focus the button
      loginButton.focus();
      expect(loginButton).toHaveFocus();

      // Press Enter
      fireEvent.keyDown(loginButton, { key: 'Enter', code: 'Enter' });
      expect(mockPush).toHaveBeenCalledWith('/login?returnTo=%2Fprotected-page');
    });
  });

  describe('Integration with Guest Utilities', () => {
    it('should generate unique session IDs for tracking', () => {
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(mockTrackGuestConversion).toHaveBeenCalledWith(
        expect.stringMatching(/^guest-\d+-[a-f0-9]+$/), // sessionId pattern
        'auth_guard_shown',
        'protected_access',
        { page: '/protected-page' }
      );
    });

    it('should use consistent session ID across multiple tracking calls', () => {
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      const loginButton = screen.getByText('Go to Login');
      fireEvent.click(loginButton);

      const calls = mockTrackGuestConversion.mock.calls;
      expect(calls).toHaveLength(2);
      expect(calls[0][0]).toBe(calls[1][0]); // Same session ID
    });
  });
});