'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Clock, AlertCircle, Info, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { notificationAPI } from '@/lib/api';
import { Notification, NotificationMetadata, NotificationContent } from '@/lib/types';

interface PatientNotificationCenterProps {
  userId: number;
  className?: string;
}

const PatientNotificationCenter: React.FC<PatientNotificationCenterProps> = ({
  userId,
  className = ''
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'booking'>('all');

  useEffect(() => {
    loadNotifications();
  }, [userId, filter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { limit: 50 };
      if (filter === 'booking') {
        params.type = 'booking_approved,booking_declined,booking_completed,booking_cancelled';
      }

      const response = await notificationAPI.getHistory(params);
      
      if (response.data.success) {
        setNotifications(response.data.data || []);
      } else {
        setError(response.data.message || 'Failed to load notifications');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string, status: string) => {
    if (status === 'failed') return <XCircle className="h-5 w-5 text-red-500" />;
    if (status === 'delivered') {
      switch (type) {
        case 'booking_approved':
          return <CheckCircle className="h-5 w-5 text-green-500" />;
        case 'booking_declined':
          return <XCircle className="h-5 w-5 text-red-500" />;
        case 'booking_completed':
          return <Check className="h-5 w-5 text-blue-500" />;
        case 'booking_cancelled':
          return <X className="h-5 w-5 text-orange-500" />;
        default:
          return <Bell className="h-5 w-5 text-gray-500" />;
      }
    }
    return <Clock className="h-5 w-5 text-yellow-500" />;
  };

  const getNotificationTitle = (type: string) => {
    switch (type) {
      case 'booking_approved':
        return 'Booking Approved';
      case 'booking_declined':
        return 'Booking Declined';
      case 'booking_completed':
        return 'Booking Completed';
      case 'booking_cancelled':
        return 'Booking Cancelled';
      case 'resource_threshold':
        return 'Resource Alert';
      case 'system_alert':
        return 'System Alert';
      default:
        return 'Notification';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="default" className="bg-green-100 text-green-800">Delivered</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'queued':
        return <Badge variant="outline">Queued</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const parseNotificationContent = (contentStr: string): NotificationContent => {
    try {
      return JSON.parse(contentStr);
    } catch {
      return { message: contentStr };
    }
  };

  const parseNotificationMetadata = (metadataStr?: string): NotificationMetadata => {
    if (!metadataStr) return {};
    try {
      return JSON.parse(metadataStr);
    } catch {
      return {};
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return notification.status !== 'delivered';
    if (filter === 'booking') {
      return ['booking_approved', 'booking_declined', 'booking_completed', 'booking_cancelled']
        .includes(notification.type);
    }
    return true;
  });

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={loadNotifications} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
          {filteredNotifications.length > 0 && (
            <Badge variant="secondary">{filteredNotifications.length}</Badge>
          )}
        </CardTitle>
        
        {/* Filter buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            Unread
          </Button>
          <Button
            variant={filter === 'booking' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('booking')}
          >
            Bookings
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notifications found</p>
            <p className="text-sm">You'll see booking updates and important alerts here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => {
              const content = parseNotificationContent(notification.content);
              const metadata = parseNotificationMetadata(notification.metadata);
              
              return (
                <div
                  key={notification.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    notification.status === 'delivered' 
                      ? 'bg-gray-50 border-gray-200' 
                      : 'bg-white border-blue-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type, notification.status)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900">
                          {getNotificationTitle(notification.type)}
                        </h4>
                        {getStatusBadge(notification.status)}
                        {getPriorityBadge(notification.priority)}
                      </div>
                      
                      {metadata.booking && (
                        <div className="text-sm text-gray-600 mb-2">
                          <p><strong>Hospital:</strong> {metadata.booking.hospitalName}</p>
                          <p><strong>Resource:</strong> {metadata.booking.resourceType}</p>
                          <p><strong>Patient:</strong> {metadata.booking.patientName}</p>
                          {metadata.booking.scheduledDate && (
                            <p><strong>Date:</strong> {new Date(metadata.booking.scheduledDate).toLocaleDateString()}</p>
                          )}
                        </div>
                      )}
                      
                      <div className="text-sm text-gray-700 mb-2">
                        {content.subject && (
                          <p className="font-medium mb-1">{content.subject}</p>
                        )}
                        {content.message && (
                          <p>{content.message}</p>
                        )}
                      </div>
                      
                      {metadata.details?.notes && (
                        <div className="text-sm text-gray-600 mb-2">
                          <p><strong>Notes:</strong> {metadata.details.notes}</p>
                        </div>
                      )}
                      
                      {metadata.details?.reason && (
                        <div className="text-sm text-red-600 mb-2">
                          <p><strong>Reason:</strong> {metadata.details.reason}</p>
                        </div>
                      )}
                      
                      {metadata.details?.alternativeSuggestions && 
                       metadata.details.alternativeSuggestions.length > 0 && (
                        <div className="text-sm text-gray-600 mb-2">
                          <p><strong>Alternative Options:</strong></p>
                          <ul className="list-disc list-inside ml-2">
                            {metadata.details.alternativeSuggestions.map((alt, index) => (
                              <li key={index}>{alt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
                        <span>
                          {formatDate(notification.actualDeliveredAt || notification.createdAt)}
                        </span>
                        <span className="capitalize">
                          {notification.channel}
                        </span>
                      </div>
                      
                      {notification.status === 'failed' && notification.lastError && (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                          <strong>Error:</strong> {notification.lastError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {filteredNotifications.length > 0 && (
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={loadNotifications}>
              Refresh Notifications
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientNotificationCenter;