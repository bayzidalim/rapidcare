'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  message?: string;
  title?: string;
}

const AuthGuardContent = ({ 
  children, 
  fallback,
  redirectTo = '/login',
  message = 'You need to be logged in to access this feature.',
  title = 'Authentication Required'
}: AuthGuardProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      setIsAuth(authenticated);
      setIsLoading(false);

      if (!authenticated && !fallback) {
        // Create return URL with current path and search params
        const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
        const returnUrl = encodeURIComponent(currentUrl);
        router.push(`${redirectTo}?returnUrl=${returnUrl}`);
      }
    };

    checkAuth();
  }, [router, pathname, searchParams, redirectTo, fallback]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, show children
  if (isAuth) {
    return <>{children}</>;
  }

  // If not authenticated and fallback is provided, show fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default fallback with friendly message
  const handleLogin = () => {
    const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    const returnUrl = encodeURIComponent(currentUrl);
    router.push(`${redirectTo}?returnUrl=${returnUrl}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">{title}</CardTitle>
          <CardDescription className="text-gray-600">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">
              Please log in to continue to your requested page.
            </p>
            <Button 
              onClick={handleLogin}
              className="w-full"
            >
              Go to Login
            </Button>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">
              You'll be redirected back here after logging in.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const AuthGuard = (props: AuthGuardProps) => {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthGuardContent {...props} />
    </Suspense>
  );
};

export default AuthGuard;