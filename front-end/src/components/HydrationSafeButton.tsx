import React, { ReactNode } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useHydrationSafeAuth, isUserAuthenticated, isUserNotAuthenticated } from '@/lib/hooks/useHydrationSafeAuth';
import { AuthErrorBoundary, AuthButtonErrorFallback } from './AuthErrorBoundary';
import { cn } from '@/lib/utils';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';

export interface HydrationSafeButtonProps extends VariantProps<typeof buttonVariants> {
  /**
   * Content to render when user is authenticated
   */
  authenticatedContent: ReactNode;
  
  /**
   * Content to render when user is not authenticated
   */
  unauthenticatedContent: ReactNode;
  
  /**
   * Content to render while authentication state is loading/unknown
   * If not provided, will render a neutral loading state
   */
  loadingContent?: ReactNode;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Whether to use asChild pattern (for Link components)
   */
  asChild?: boolean;
  
  /**
   * Button click handler (optional)
   */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  
  /**
   * Whether the button should be disabled
   */
  disabled?: boolean;
  
  /**
   * Custom loading state override
   */
  isLoading?: boolean;
  
  /**
   * Accessibility label for screen readers
   */
  'aria-label'?: string;
  
  /**
   * Button type attribute
   */
  type?: 'button' | 'submit' | 'reset';
}

/**
 * HydrationSafeButton component that renders different content based on authentication state
 * while preventing hydration mismatches.
 * 
 * This component ensures that:
 * 1. Server and client render identical initial HTML (loading state)
 * 2. Authentication-specific content is shown only after hydration
 * 3. Smooth transitions between authentication states
 * 4. No hydration mismatch errors
 * 
 * @example
 * ```tsx
 * <HydrationSafeButton
 *   authenticatedContent={
 *     <Link href="/dashboard">Go to Dashboard</Link>
 *   }
 *   unauthenticatedContent={
 *     <Link href="/login">Login</Link>
 *   }
 *   loadingContent="Loading..."
 *   variant="default"
 *   size="lg"
 * />
 * ```
 */
export function HydrationSafeButton({
  authenticatedContent,
  unauthenticatedContent,
  loadingContent,
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  onClick,
  disabled = false,
  isLoading = false,
  'aria-label': ariaLabel,
  type = 'button',
  ...props
}: HydrationSafeButtonProps) {
  const { auth, refreshAuth, clearError } = useHydrationSafeAuth();
  
  // Determine what content to show with hydration-safe fallbacks
  const getButtonContent = () => {
    // Show error state if there's an error
    if (auth.error && !auth.isRetrying) {
      return (
        <>
          <AlertTriangle className="w-4 h-4 mr-2" />
          Error - Click to retry
        </>
      );
    }

    // Show retrying state
    if (auth.isRetrying) {
      return (
        <>
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          Retrying...
        </>
      );
    }
    
    // If explicitly loading or auth state is unknown/loading
    if (isLoading || auth.isAuthenticated === null || !auth.isHydrated) {
      // For asChild mode during loading, return the unauthenticated content to maintain DOM structure
      if (asChild) {
        return unauthenticatedContent;
      }
      return loadingContent || (
        <span className="opacity-50 animate-pulse">
          Loading...
        </span>
      );
    }
    
    // Show content based on authentication state
    if (isUserAuthenticated(auth.isAuthenticated)) {
      return authenticatedContent;
    }
    
    if (isUserNotAuthenticated(auth.isAuthenticated)) {
      return unauthenticatedContent;
    }
    
    // Fallback to loading state
    if (asChild) {
      return unauthenticatedContent;
    }
    return loadingContent || (
      <span className="opacity-50">
        Loading...
      </span>
    );
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // If there's an error, retry authentication instead of normal click
    if (auth.error && !auth.isRetrying) {
      event.preventDefault();
      clearError();
      refreshAuth();
      return;
    }

    // Normal click handler
    if (onClick) {
      onClick(event);
    }
  };

  const buttonContent = getButtonContent();
  const isButtonDisabled = disabled || isLoading || (auth.isAuthenticated === null && !auth.error && !asChild);

  return (
    <AuthErrorBoundary
      fallback={
        <AuthButtonErrorFallback onRetry={refreshAuth} />
      }
    >
      <Button
        variant={auth.error ? 'outline' : variant}
        size={size}
        className={cn(
          // Add transition classes for smooth state changes
          'transition-all duration-200 ease-in-out',
          // Error state styling
          auth.error && 'border-destructive/50 text-destructive hover:bg-destructive/10',
          className
        )}
        asChild={asChild && !auth.error} // Don't use asChild in error state
        onClick={handleClick}
        disabled={isButtonDisabled}
        aria-label={ariaLabel || (auth.error ? 'Retry authentication' : undefined)}
        type={type}
        {...props}
      >
        {buttonContent}
      </Button>
    </AuthErrorBoundary>
  );
}

/**
 * Specialized version of HydrationSafeButton for authentication actions
 * Provides common authentication button patterns
 */
export interface AuthActionButtonProps extends Omit<HydrationSafeButtonProps, 'authenticatedContent' | 'unauthenticatedContent'> {
  /**
   * The type of authentication action
   */
  action: 'login' | 'logout' | 'register' | 'profile';
  
  /**
   * Custom content for authenticated state (optional)
   */
  authenticatedContent?: ReactNode;
  
  /**
   * Custom content for unauthenticated state (optional)
   */
  unauthenticatedContent?: ReactNode;
}

/**
 * Pre-configured authentication action button with common patterns
 * 
 * @example
 * ```tsx
 * <AuthActionButton action="login" />
 * <AuthActionButton action="profile" />
 * ```
 */
export function AuthActionButton({
  action,
  authenticatedContent,
  unauthenticatedContent,
  ...props
}: AuthActionButtonProps) {
  const getDefaultContent = () => {
    switch (action) {
      case 'login':
        return {
          authenticated: authenticatedContent || 'Dashboard',
          unauthenticated: unauthenticatedContent || 'Login',
        };
      case 'logout':
        return {
          authenticated: authenticatedContent || 'Logout',
          unauthenticated: unauthenticatedContent || 'Login',
        };
      case 'register':
        return {
          authenticated: authenticatedContent || 'Dashboard',
          unauthenticated: unauthenticatedContent || 'Register',
        };
      case 'profile':
        return {
          authenticated: authenticatedContent || 'Profile',
          unauthenticated: unauthenticatedContent || 'Login',
        };
      default:
        return {
          authenticated: authenticatedContent || 'Dashboard',
          unauthenticated: unauthenticatedContent || 'Login',
        };
    }
  };

  const content = getDefaultContent();

  return (
    <HydrationSafeButton
      authenticatedContent={content.authenticated}
      unauthenticatedContent={content.unauthenticated}
      {...props}
    />
  );
}

/**
 * Hook for getting authentication-dependent content without rendering a button
 * Useful for other components that need authentication-dependent rendering
 * 
 * @param authenticatedContent - Content for authenticated state
 * @param unauthenticatedContent - Content for unauthenticated state
 * @param loadingContent - Content for loading state
 * @returns The appropriate content based on current auth state
 */
export function useAuthContent<T>(
  authenticatedContent: T,
  unauthenticatedContent: T,
  loadingContent?: T
): T {
  const { auth } = useHydrationSafeAuth();
  
  // If auth state is unknown/loading or not hydrated yet
  if (auth.isAuthenticated === null || !auth.isHydrated) {
    return loadingContent ?? unauthenticatedContent;
  }
  
  // Return content based on authentication state
  if (isUserAuthenticated(auth.isAuthenticated)) {
    return authenticatedContent;
  }
  
  return unauthenticatedContent;
}