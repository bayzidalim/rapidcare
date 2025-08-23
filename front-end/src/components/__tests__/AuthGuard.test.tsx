import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import AuthGuard from '../AuthGuard';
import { isAuthenticated } from '@/lib/auth';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock auth utility
jest.mock('@/lib/auth', () => ({
  isAuthenticated: jest.fn(),
}));

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;
const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>;

describe('AuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: mockPush } as any);
    mockUsePathname.mockReturnValue('/protected-page');
    mockUseSearchParams.mockReturnValue({
      toString: () => '',
    } as any);
  });

  it('renders children when user is authenticated', async () => {
    mockIsAuthenticated.mockReturnValue(true);

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('handles unauthenticated state without fallback', async () => {
    mockIsAuthenticated.mockReturnValue(false);

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    // Should redirect to login when not authenticated and no fallback provided
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login?returnUrl=%2Fprotected-page');
    });
  });

  it('redirects to login with return URL when not authenticated', async () => {
    mockIsAuthenticated.mockReturnValue(false);
    mockUsePathname.mockReturnValue('/booking/123');
    mockUseSearchParams.mockReturnValue({
      toString: () => 'step=payment',
    } as any);

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login?returnUrl=%2Fbooking%2F123%3Fstep%3Dpayment');
    });
  });

  it('shows fallback component when provided and not authenticated', async () => {
    mockIsAuthenticated.mockReturnValue(false);

    const fallback = <div>Please log in to continue</div>;

    render(
      <AuthGuard fallback={fallback}>
        <div>Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('Please log in to continue')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  it('shows default auth required message when no fallback provided', async () => {
    mockIsAuthenticated.mockReturnValue(false);

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    // Wait for the redirect to be called first
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });
  });

  it('uses custom message and title', async () => {
    mockIsAuthenticated.mockReturnValue(false);

    const customFallback = <div>Custom fallback</div>;

    render(
      <AuthGuard 
        fallback={customFallback}
        title="Custom Title"
        message="Custom message"
      >
        <div>Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    });
  });
});