'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { notificationAPI } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import {
  Bell,
  BellOff,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Filter,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  FileText,
  Building2,
  User,
  Settings
} from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: number;
  bookingId: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  bookingReference?: string;
  hospitalName?: string;
  patientName?: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [unreadCount, setUnreadCount] = useState(0);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState<number[]>([]);

  useEffect(() => {
    loadNotifications();
    setCurrentUser(getCurrentUser());
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [typeFilter, statusFilter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params: any = { limit: 100 };
      if (typeFilter !== 'all') params.type = typeFilter;
      if (statusFilter !== 'all') params.isRead = statusFilter === 'read';
      
      const [notificationsResponse, unreadResponse] = await Promise.all([
        notificationAPI.getUserNotifications(params),
        notificationAPI.getUnreadCount()
      ]);

      if (notificationsResponse.data.success) {
        setNotifications(notificationsResponse.data.data || []);
      }

      if (unreadResponse.data.success) {
        setUnreadCount(unreadResponse.data.data.unreadCount || 0);
      }
    } catch (error: any) {
      console.error('Failed to load notifications:', error);
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      
      // Update notification locally
      setNotifications(prev => prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      ));
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      
      // Update all notifications locally
      setNotifications(prev => prev.map(notification => ({
        ...notification,
        isRead: true
      })));
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const bulkMarkAsRead = async () => {
    if (selectedNotifications.length === 0) return;
    
    try {
      // Mark selected notifications as read
      for (const id of selectedNotifications) {
        await notificationAPI.markAsRead(id);
      }
      
      // Update notifications locally
      setNotifications(prev => prev.map(notification =>
        selectedNotifications.includes(notification.id)
          ? { ...notification, isRead: true }
          : notification
      ));
      
      // Update unread count
      const unreadSelected = selectedNotifications.filter(id => {
        const notification = notifications.find(n => n.id === id);
        return notification && !notification.isRead;
      });
      setUnreadCount(prev => Math.max(0, prev - unreadSelected.length));
      
      setSelectedNotifications([]);
    } catch (error) {
      console.error('Error bulk marking notifications as read:', error);
    }
  };

  const toggleNotificationSelection = (notificationId: number) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const selectAllNotifications = () => {
    const allIds = notifications.map(n => n.id);
    setSelectedNotifications(allIds);
  };

  const clearSelection = () => {
    setSelectedNotifications([]);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking_submitted': return <FileText className="w-5 h-5 text-blue-600" />;
      case 'booking_approved': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'booking_declined': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'booking_cancelled': return <XCircle className="w-5 h-5 text-gray-600" />;
      case 'booking_completed': return <CheckCircle className="w-5 h-5 text-blue-600" />;
      default: return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'booking_submitted': return 'border-l-blue-500';
      case 'booking_approved': return 'border-l-green-500';
      case 'booking_declined': return 'border-l-red-500';
      case 'booking_cancelled': return 'border-l-gray-500';
      case 'booking_completed': return 'border-l-blue-500';
      default: return 'border-l-gray-300';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'booking_submitted': return 'Booking Submitted';
      case 'booking_approved': return 'Booking Approved';
      case 'booking_declined': return 'Booking Declined';
      case 'booking_cancelled': return 'Booking Cancelled';
      case 'booking_completed': return 'Booking Completed';
      default: return type;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;
    if (statusFilter === 'read' && !notification.isRead) return false;
    if (statusFilter === 'unread' && notification.isRead) return false;
    return true;
  });

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-lg text-gray-600">Loading notifications...</span>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                  <Bell className="w-8 h-8" />
                  Notifications
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {unreadCount} unread
                    </Badge>
                  )}
                </h1>
                <p className="text-gray-600">
                  Stay updated with your booking requests and hospital responses.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={loadNotifications} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                {unreadCount > 0 && (
                  <Button onClick={markAllAsRead} variant="outline" size="sm">
                    <BellOff className="w-4 h-4 mr-2" />
                    Mark All Read
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadNotifications}
                  className="ml-4"
                >
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Filters and Actions */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="booking_submitted">Submitted</SelectItem>
                        <SelectItem value="booking_approved">Approved</SelectItem>
                        <SelectItem value="booking_declined">Declined</SelectItem>
                        <SelectItem value="booking_cancelled">Cancelled</SelectItem>
                        <SelectItem value="booking_completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="unread">Unread</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedNotifications.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {selectedNotifications.length} selected
                    </span>
                    <Button onClick={bulkMarkAsRead} size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      Mark Read
                    </Button>
                    <Button onClick={clearSelection} size="sm" variant="outline">
                      Clear
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notifications List */}
          <div className="space-y-4">
            {filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">
                      {notifications.length === 0 ? 'No notifications yet' : 'No notifications match your filters'}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {notifications.length === 0 
                        ? 'You\'ll receive notifications here when there are updates to your bookings.'
                        : 'Try adjusting your filters to see more notifications.'
                      }
                    </p>
                    {notifications.length === 0 && (
                      <Link href="/booking">
                        <Button>
                          <FileText className="w-4 h-4 mr-2" />
                          Create Your First Booking
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Select All Option */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.length === filteredNotifications.length}
                      onChange={(e) => e.target.checked ? selectAllNotifications() : clearSelection()}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-600">
                      Select all ({filteredNotifications.length})
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    Showing {filteredNotifications.length} of {notifications.length} notifications
                  </span>
                </div>

                {filteredNotifications.map((notification) => (
                  <Card 
                    key={notification.id} 
                    className={`hover:shadow-md transition-shadow border-l-4 ${getNotificationColor(notification.type)} ${
                      !notification.isRead ? 'bg-blue-50' : 'bg-white'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={selectedNotifications.includes(notification.id)}
                          onChange={() => toggleNotificationSelection(notification.id)}
                          className="mt-1 rounded border-gray-300"
                        />
                        
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className={`font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                                  {notification.title}
                                </h3>
                                <Badge variant="outline" className="text-xs">
                                  {getTypeLabel(notification.type)}
                                </Badge>
                                {!notification.isRead && (
                                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                )}
                              </div>
                              
                              <p className={`text-sm mb-3 ${!notification.isRead ? 'text-gray-800' : 'text-gray-600'}`}>
                                {notification.message}
                              </p>
                              
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{new Date(notification.createdAt).toLocaleString()}</span>
                                </div>
                                {notification.bookingReference && (
                                  <div className="flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    <span>Ref: {notification.bookingReference}</span>
                                  </div>
                                )}
                                {notification.hospitalName && (
                                  <div className="flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    <span>{notification.hospitalName}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              {!notification.isRead && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Mark Read
                                </Button>
                              )}
                              {notification.bookingId && (
                                <Link href={`/dashboard`}>
                                  <Button variant="outline" size="sm">
                                    <FileText className="w-4 h-4 mr-2" />
                                    View Booking
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>

          {/* Quick Actions */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Manage your notifications and booking preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Link href="/dashboard">
                <Button variant="outline">
                  <User className="w-4 h-4 mr-2" />
                  View Dashboard
                </Button>
              </Link>
              <Link href="/booking">
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  New Booking
                </Button>
              </Link>
              <Link href="/hospitals">
                <Button variant="outline">
                  <Building2 className="w-4 h-4 mr-2" />
                  Find Hospitals
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}