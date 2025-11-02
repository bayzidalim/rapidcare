import { useState, useEffect, ReactNode } from 'react';

export interface ClientOnlyProps {
  /**
   * Content to render only on the client side after hydration
   */
  children: ReactNode;
  
  /**
   * Fallback content to show during server-side rendering and initial client render
   * This ensures consistent HTML between server and client
   */
  fallback?: ReactNode;
  
  /**
   * Optional className for the wrapper element
   */
  className?: string;
  
  /**
   * Whether to use a wrapper element or render children directly
   * Default: true (uses a div wrapper)
   */
  useWrapper?: boolean;
}

/**
 * ClientOnly component that prevents hydration mismatches by rendering
 * children only after client-side hydration is complete.
 * 
 * This component ensures that:
 * 1. Server renders the fallback content (or nothing)
 * 2. Client initially renders the same fallback content
 * 3. After hydration, client renders the actual children
 * 
 * This prevents hydration mismatches when content depends on client-side state
 * like localStorage, window object, or other browser-specific APIs.
 * 
 * @example
 * ```tsx
 * <ClientOnly fallback={<div>Loading...</div>}>
 *   <AuthenticatedUserMenu />
 * </ClientOnly>
 * ```
 * 
 * @example
 * ```tsx
 * <ClientOnly>
 *   <ComponentThatUsesLocalStorage />
 * </ClientOnly>
 * ```
 */
export function ClientOnly({ 
  children, 
  fallback = null, 
  className,
  useWrapper = true 
}: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // Mark as mounted after hydration is complete
    setHasMounted(true);
  }, []);

  // During SSR and initial client render, show fallback
  if (!hasMounted) {
    if (useWrapper) {
      return <div className={className}>{fallback}</div>;
    }
    return <>{fallback}</>;
  }

  // After hydration, show actual children
  if (useWrapper) {
    return <div className={className}>{children}</div>;
  }
  
  return <>{children}</>;
}

/**
 * Hook that returns whether the component has mounted on the client
 * Useful for conditional rendering that needs to avoid hydration mismatches
 * 
 * @returns boolean indicating if component has mounted on client
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const hasMounted = useClientOnly();
 *   
 *   if (!hasMounted) {
 *     return <div>Loading...</div>;
 *   }
 *   
 *   return <div>{localStorage.getItem('data')}</div>;
 * }
 * ```
 */
export function useClientOnly(): boolean {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return hasMounted;
}

/**
 * Higher-order component that wraps a component with ClientOnly
 * Useful for components that always need client-only rendering
 * 
 * @param Component - The component to wrap
 * @param fallback - Optional fallback content during SSR
 * @returns Wrapped component that only renders on client
 * 
 * @example
 * ```tsx
 * const ClientOnlyUserMenu = withClientOnly(UserMenu, <div>Loading menu...</div>);
 * ```
 */
export function withClientOnly<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ClientOnly fallback={fallback}>
      <Component {...props} />
    </ClientOnly>
  );

  WrappedComponent.displayName = `withClientOnly(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}