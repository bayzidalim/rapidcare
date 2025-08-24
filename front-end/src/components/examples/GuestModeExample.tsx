'use client';

import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getGuestFeatureMessage, getGuestActionPrompt, trackGuestConversion } from '../../lib/guestUtils';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

export const GuestModeExample: React.FC = () => {
  const {
    isAuthenticated,
    isGuest,
    userType,
    user,
    guestSession,
    sessionInfo,
    canAccess,
    requireAuth,
    updateActivity,
  } = useAuth();

  const handleBookingAttempt = () => {
    if (!canAccess('booking')) {
      // Track conversion event
      if (guestSession) {
        trackGuestConversion(guestSession.sessionId, 'feature_blocked', 'booking', {
          source: 'booking_button',
          page: '/example',
        });
      }
      
      // Show login requirement
      alert(getGuestActionPrompt('book-resource'));
      requireAuth('booking', '/booking');
    } else {
      // Proceed with booking
      alert('Proceeding to booking...');
    }
  };

  const handlePaymentAttempt = () => {
    if (!canAccess('payment')) {
      if (guestSession) {
        trackGuestConversion(guestSession.sessionId, 'feature_blocked', 'payment', {
          source: 'payment_button',
          page: '/example',
        });
      }
      
      alert(getGuestFeatureMessage('payment'));
      requireAuth('payment', '/payment');
    } else {
      alert('Proceeding to payment...');
    }
  };

  const handleActivityUpdate = () => {
    updateActivity();
    alert('Guest activity updated!');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Guest Mode Authentication Example</CardTitle>
          <CardDescription>
            Demonstrates the guest mode authentication utilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Authentication Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <Badge variant={isAuthenticated ? 'default' : 'secondary'}>
                {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
              </Badge>
            </div>
            <div className="text-center">
              <Badge variant={isGuest ? 'default' : 'secondary'}>
                {isGuest ? 'Guest Mode' : 'Not Guest'}
              </Badge>
            </div>
            <div className="text-center">
              <Badge variant="outline">
                User Type: {userType}
              </Badge>
            </div>
          </div>

          {/* User Information */}
          {user && (
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-800">Authenticated User</h3>
              <p className="text-green-700">Name: {user.name}</p>
              <p className="text-green-700">Email: {user.email}</p>
              <p className="text-green-700">Type: {user.userType}</p>
            </div>
          )}

          {/* Guest Session Information */}
          {guestSession && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800">Guest Session</h3>
              <p className="text-blue-700">Session ID: {guestSession.sessionId}</p>
              <p className="text-blue-700">
                Started: {new Date(guestSession.startTime).toLocaleString()}
              </p>
              <p className="text-blue-700">
                Last Activity: {new Date(guestSession.lastActivity).toLocaleString()}
              </p>
            </div>
          )}

          {/* Session Information */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800">Session Information</h3>
            <pre className="text-sm text-gray-700 mt-2">
              {JSON.stringify(sessionInfo, null, 2)}
            </pre>
          </div>

          {/* Feature Access Testing */}
          <div className="space-y-3">
            <h3 className="font-semibold">Feature Access Testing</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Public Features */}
              <div className="space-y-2">
                <h4 className="font-medium text-green-600">Public Features (Always Accessible)</h4>
                <div className="space-y-1">
                  <Badge variant={canAccess('hospital-listing') ? 'default' : 'destructive'}>
                    Hospital Listing: {canAccess('hospital-listing') ? 'Accessible' : 'Blocked'}
                  </Badge>
                  <Badge variant={canAccess('hospital-details') ? 'default' : 'destructive'}>
                    Hospital Details: {canAccess('hospital-details') ? 'Accessible' : 'Blocked'}
                  </Badge>
                  <Badge variant={canAccess('blood-donation') ? 'default' : 'destructive'}>
                    Blood Donation: {canAccess('blood-donation') ? 'Accessible' : 'Blocked'}
                  </Badge>
                </div>
              </div>

              {/* Protected Features */}
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">Protected Features (Auth Required)</h4>
                <div className="space-y-1">
                  <Badge variant={canAccess('booking') ? 'default' : 'destructive'}>
                    Booking: {canAccess('booking') ? 'Accessible' : 'Blocked'}
                  </Badge>
                  <Badge variant={canAccess('payment') ? 'default' : 'destructive'}>
                    Payment: {canAccess('payment') ? 'Accessible' : 'Blocked'}
                  </Badge>
                  <Badge variant={canAccess('dashboard') ? 'default' : 'destructive'}>
                    Dashboard: {canAccess('dashboard') ? 'Accessible' : 'Blocked'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <h3 className="font-semibold">Action Testing</h3>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleBookingAttempt} variant="outline">
                Try Booking (Protected)
              </Button>
              <Button onClick={handlePaymentAttempt} variant="outline">
                Try Payment (Protected)
              </Button>
              {isGuest && (
                <Button onClick={handleActivityUpdate} variant="outline">
                  Update Guest Activity
                </Button>
              )}
            </div>
          </div>

          {/* Feature Messages */}
          <div className="space-y-2">
            <h3 className="font-semibold">Feature Messages</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Booking:</strong> {getGuestFeatureMessage('booking')}</p>
              <p><strong>Payment:</strong> {getGuestFeatureMessage('payment')}</p>
              <p><strong>Dashboard:</strong> {getGuestFeatureMessage('dashboard')}</p>
            </div>
          </div>

          {/* Action Prompts */}
          <div className="space-y-2">
            <h3 className="font-semibold">Action Prompts</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Book Resource:</strong> {getGuestActionPrompt('book-resource')}</p>
              <p><strong>Make Payment:</strong> {getGuestActionPrompt('make-payment')}</p>
              <p><strong>View Bookings:</strong> {getGuestActionPrompt('view-bookings')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GuestModeExample;