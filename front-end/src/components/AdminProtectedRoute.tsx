'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, isAdmin, getCurrentUser } from '@/lib/auth';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = () => {
      // Check if user is authenticated
      if (!isAuthenticated()) {
        router.push('/login');
        return;
      }

      // Check if user is admin
      if (!isAdmin()) {
        const user = getCurrentUser();
        const userType = user?.userType || 'unknown';
        
        // Redirect to appropriate dashboard with message
        if (userType === 'hospital-authority') {
          router.push('/dashboard?message=Access denied. Admin privileges required. You have been redirected to your dashboard.');
        } else {
          router.push('/dashboard?message=Access denied. Admin privileges required.');
        }
        return;
      }

      // User has access
      setHasAccess(true);
      setIsLoading(false);
    };

    checkAccess();
  }, [router]);

  // Show loading state while checking access
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access permissions...</p>
        </div>
      </div>
    );
  }

  // Only render children if user has access
  if (hasAccess) {
    return <>{children}</>;
  }

  // This should not be reached due to redirects, but just in case
  return null;
}