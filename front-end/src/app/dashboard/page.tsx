'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import RealTimeStatusIndicator from '@/components/RealTimeStatusIndicator';
import { useBookingUpdates, useNotificationUpdates } from '@/hooks/useRealTimeUpdates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { bookingAPI, notificationAPI } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import {
  Calendar,
  Clock,
  Building2,
  User,
  Phone,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Ban,
  Bell,
  BellOff,
  Bed,
  Heart,
  Scissors,
  MapPin,
  Star,
  Activity,
  RefreshCw,
  Plus,
  Filter,
  Search,
  FileText,
  Users
} from 'lucide-react';
import Link from 'next/link';

interface Booking {
  id: number;
  bookingReference: string;
  hospitalId: number;
  hospitalName: string;
  resourceType: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  medicalCondition: string;
  urgency: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  scheduledDate: string;
  estimatedDuration: number;
  status: string;
  notes?: string;
  authorityNotes?: string;
  declineReason?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedByName?: string;
}

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
}

export default function DashboardPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [unreadCount, setUnreadCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');

  // Real-time updates
  const bookingUpdates = useBookingUpdates(undefined, {
    enabled: true,
    onUpdate: (data) => {
      if (data.hasChanges && data.changes?.bookings) {
        // Refresh bookings if there are changes
        loadDashboardData();
      }
    },
    onError: (error) => {
      console.error('Booking updates error:', error);
    }
  });

  const notificationUpdates = useNotificationUpdates({
    enabled: true,
    onUpdate: (data) => {
      if (data.hasChanges && data.changes?.notifications) {
        // Update notifications and unread count
        setNotifications(data.changes.notifications);
        setUnreadCount(data.changes.unreadCount || 0);
      }
    },
    onError: (error) => {
      console.error('Notification updates error:', error);
    }
  });

  useEffect(() => {
    loadDashboardData();
    setCurrentUser(getCurrentUser());
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load bookings and notifications in parallel
      const [bookingsResponse, notificationsResponse, unreadResponse] = await Promise.all([
        bookingAPI.getUserBookings(),
        notificationAPI.getUserNotifications({ limit: 10 }),
        notificationAPI.getUnreadCount()
      ]);

      if (bookingsResponse.data.success) {
        setBookings(bookingsResponse.data.data || []);
      }

      if (notificationsResponse.data.success) {
        setNotifications(notificationsResponse.data.data || []);
      }

      if (unreadResponse.data.success) {
        setUnreadCount(unreadResponse.data.data.unreadCount || 0);
      }
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking || !cancelReason.trim()) return;

    try {
      setCancelling(true);
      
      const response = await bookingAPI.cancel(selectedBooking.id, {
        reason: cancelReason.trim()
      });

      if (response.data.success) {
        // Update booking status locally
        setBookings(prev => prev.map(booking => 
          booking.id === selectedBooking.id 
            ? { ...booking, status: 'cancelled' }
            : booking
        ));
        
        setShowCancelModal(false);
        setSelectedBooking(null);
        setCancelReason('');
        
        // Reload data to get updated information
        loadDashboardData();
      } else {
        setError(response.data.error || 'Failed to cancel booking');
      }
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      setError(error.response?.data?.error || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const markNotificationAsRead = async (notificationId: number) => {
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

  const markAllNotificationsAsRead = async () => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'declined': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'beds': return <Bed className="w-4 h-4" />;
      case 'icu': return <Heart className="w-4 h-4" />;
      case 'operationTheatres': return <Scissors className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getResourceLabel = (type: string) => {
    switch (type) {
      case 'beds': return 'Hospital Bed';
      case 'icu': return 'ICU';
      case 'operationTheatres': return 'Operation Theatre';
      default: return type;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'declined': return <XCircle className="w-4 h-4" />;
      case 'cancelled': return <Ban className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const canCancelBooking = (booking: Booking) => {
    return ['pending', 'approved'].includes(booking.status);
  };

  const filteredBookings = bookings.filter(booking => {
    if (statusFilter !== 'all' && booking.status !== statusFilter) return false;
    if (urgencyFilter !== 'all' && booking.urgency !== urgencyFilter) return false;
    return true;
  });

  const getBookingStats = () => {
    const stats = {
      total: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      approved: bookings.filter(b => b.status === 'approved').length,
      declined: bookings.filter(b => b.status === 'declined').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
      completed: bookings.filter(b => b.status === 'completed').length,
    };
    return stats;
  };

  const stats = getBookingStats();

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-lg text-gray-600">Loading dashboard...</span>
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
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              My Dashboard
            </h1>
            <p className="text-gray-600">
              Manage your medical bookings and stay updated with notifications.
            </p>
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
                  onClick={loadDashboardData}
                  className="ml-4"
                >
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <FileText className="w-8 h-8 text-gray-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Approved</p>
                    <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Declined</p>
                    <p className="text-2xl font-bold text-red-600">{stats.declined}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Notifications</p>
                    <p className="text-2xl font-bold text-purple-600">{unreadCount}</p>
                  </div>
                  <Bell className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content - Bookings */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>My Bookings</CardTitle>
                      <CardDescription>
                        Track and manage your medical resource bookings
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <RealTimeStatusIndicator
                        isConnected={bookingUpdates.status.isConnected}
                        retryCount={bookingUpdates.status.retryCount}
                        lastUpdate={bookingUpdates.status.lastUpdate}
                        error={bookingUpdates.status.error}
                        onReconnect={bookingUpdates.reconnect}
                        showDetails={true}
                      />
                      <Button onClick={loadDashboardData} variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                      </Button>
                      <Link href="/booking">
                        <Button size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          New Booking
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Filters */}
                  <div className="flex flex-wrap gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-500" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="declined">Declined</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div>
                      <select
                        value={urgencyFilter}
                        onChange={(e) => setUrgencyFilter(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                      >
                        <option value="all">All Urgency</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>

                  {/* Bookings List */}
                  <div className="space-y-4">
                    {filteredBookings.length === 0 ? (
                      <div className="text-center py-8">
                        <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {bookings.length === 0 ? 'No bookings yet' : 'No bookings match your filters'}
                        </h3>
                        <p className="text-gray-600 mb-4">
                          {bookings.length === 0 
                            ? 'Start by booking your first medical resource.'
                            : 'Try adjusting your filters to see more bookings.'
                          }
                        </p>
                        {bookings.length === 0 && (
                          <Link href="/booking">
                            <Button>
                              <Plus className="w-4 h-4 mr-2" />
                              Create First Booking
                            </Button>
                          </Link>
                        )}
                      </div>
                    ) : (
                      filteredBookings.map((booking) => (
                        <Card key={booking.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="flex items-center gap-2">
                                    {getResourceIcon(booking.resourceType)}
                                    <span className="font-medium">
                                      {getResourceLabel(booking.resourceType)}
                                    </span>
                                  </div>
                                  <Badge className={getStatusColor(booking.status)}>
                                    <div className="flex items-center gap-1">
                                      {getStatusIcon(booking.status)}
                                      {booking.status}
                                    </div>
                                  </Badge>
                                  <Badge className={getUrgencyColor(booking.urgency)}>
                                    {booking.urgency}
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                                  <div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                      <Building2 className="w-4 h-4" />
                                      <span>Hospital</span>
                                    </div>
                                    <p className="font-medium">{booking.hospitalName}</p>
                                  </div>
                                  
                                  <div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                      <User className="w-4 h-4" />
                                      <span>Patient</span>
                                    </div>
                                    <p className="font-medium">{booking.patientName}</p>
                                  </div>
                                  
                                  <div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                      <Calendar className="w-4 h-4" />
                                      <span>Scheduled</span>
                                    </div>
                                    <p className="font-medium">
                                      {new Date(booking.scheduledDate).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <FileText className="w-4 h-4" />
                                    <span>Ref: {booking.bookingReference}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{booking.estimatedDuration}h duration</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>Created {new Date(booking.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col gap-2 ml-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setShowDetailsModal(true);
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Details
                                </Button>
                                
                                {canCancelBooking(booking) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedBooking(booking);
                                      setShowCancelModal(true);
                                    }}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Ban className="w-4 h-4 mr-2" />
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Notifications */}
            <div>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        Notifications
                        {unreadCount > 0 && (
                          <Badge variant="destructive" className="ml-2">
                            {unreadCount}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Recent updates on your bookings
                      </CardDescription>
                    </div>
                    {unreadCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={markAllNotificationsAsRead}
                      >
                        <BellOff className="w-4 h-4 mr-2" />
                        Mark All Read
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {notifications.length === 0 ? (
                      <div className="text-center py-6">
                        <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            notification.isRead 
                              ? 'bg-gray-50 border-gray-200' 
                              : 'bg-blue-50 border-blue-200'
                          }`}
                          onClick={() => !notification.isRead && markNotificationAsRead(notification.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm mb-1">
                                {notification.title}
                              </h4>
                              <p className="text-xs text-gray-600 mb-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{new Date(notification.createdAt).toLocaleDateString()}</span>
                                {notification.bookingReference && (
                                  <span>• Ref: {notification.bookingReference}</span>
                                )}
                              </div>
                            </div>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full mt-1"></div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {notifications.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <Link href="/notifications">
                        <Button variant="outline" className="w-full">
                          View All Notifications
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/booking">
                    <Button className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      New Booking
                    </Button>
                  </Link>
                  <Link href="/hospitals">
                    <Button variant="outline" className="w-full">
                      <Search className="w-4 h-4 mr-2" />
                      Find Hospitals
                    </Button>
                  </Link>
                  <Link href="/profile">
                    <Button variant="outline" className="w-full">
                      <User className="w-4 h-4 mr-2" />
                      Update Profile
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Booking Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Booking Details
              </DialogTitle>
              <DialogDescription>
                Complete information about your booking request
              </DialogDescription>
            </DialogHeader>
            
            {selectedBooking && (
              <div className="space-y-6">
                {/* Status and Reference */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium">Booking Reference</h3>
                    <p className="text-lg font-mono">{selectedBooking.bookingReference}</p>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(selectedBooking.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(selectedBooking.status)}
                        {selectedBooking.status.toUpperCase()}
                      </div>
                    </Badge>
                  </div>
                </div>

                {/* Hospital and Resource */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Hospital & Resource</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-500" />
                        <span>{selectedBooking.hospitalName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getResourceIcon(selectedBooking.resourceType)}
                        <span>{getResourceLabel(selectedBooking.resourceType)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>{selectedBooking.estimatedDuration} hours</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-gray-500" />
                        <Badge className={getUrgencyColor(selectedBooking.urgency)}>
                          {selectedBooking.urgency} priority
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Patient Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{selectedBooking.patientName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Age:</span>
                        <span className="font-medium">{selectedBooking.patientAge} years</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Gender:</span>
                        <span className="font-medium capitalize">{selectedBooking.patientGender}</span>
                      </div>
                      <div className="mt-3">
                        <span className="text-gray-600">Medical Condition:</span>
                        <p className="font-medium mt-1">{selectedBooking.medicalCondition}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Emergency Contact</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <p className="font-medium">{selectedBooking.emergencyContactName}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Phone:</span>
                      <p className="font-medium">{selectedBooking.emergencyContactPhone}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Relationship:</span>
                      <p className="font-medium capitalize">{selectedBooking.emergencyContactRelationship}</p>
                    </div>
                  </div>
                </div>

                {/* Schedule */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Schedule</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Scheduled Date & Time:</span>
                      <p className="font-medium">{new Date(selectedBooking.scheduledDate).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Duration:</span>
                      <p className="font-medium">{selectedBooking.estimatedDuration} hours</p>
                    </div>
                  </div>
                </div>

                {/* Notes and Status Information */}
                {(selectedBooking.notes || selectedBooking.authorityNotes || selectedBooking.declineReason) && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Additional Information</h4>
                    <div className="space-y-3">
                      {selectedBooking.notes && (
                        <div>
                          <span className="text-gray-600 text-sm">Your Notes:</span>
                          <p className="text-sm bg-gray-50 p-3 rounded-lg mt-1">{selectedBooking.notes}</p>
                        </div>
                      )}
                      {selectedBooking.authorityNotes && (
                        <div>
                          <span className="text-gray-600 text-sm">Hospital Notes:</span>
                          <p className="text-sm bg-blue-50 p-3 rounded-lg mt-1">{selectedBooking.authorityNotes}</p>
                        </div>
                      )}
                      {selectedBooking.declineReason && (
                        <div>
                          <span className="text-gray-600 text-sm">Decline Reason:</span>
                          <p className="text-sm bg-red-50 p-3 rounded-lg mt-1">{selectedBooking.declineReason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span>{new Date(selectedBooking.createdAt).toLocaleString()}</span>
                    </div>
                    {selectedBooking.approvedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          {selectedBooking.status === 'approved' ? 'Approved:' : 'Processed:'}
                        </span>
                        <span>{new Date(selectedBooking.approvedAt).toLocaleString()}</span>
                      </div>
                    )}
                    {selectedBooking.approvedByName && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Processed by:</span>
                        <span>{selectedBooking.approvedByName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                Close
              </Button>
              {selectedBooking && canCancelBooking(selectedBooking) && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowCancelModal(true);
                  }}
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Cancel Booking
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Booking Modal */}
        <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-600" />
                Cancel Booking
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this booking? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            {selectedBooking && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm space-y-1">
                    <div><strong>Reference:</strong> {selectedBooking.bookingReference}</div>
                    <div><strong>Hospital:</strong> {selectedBooking.hospitalName}</div>
                    <div><strong>Resource:</strong> {getResourceLabel(selectedBooking.resourceType)}</div>
                    <div><strong>Patient:</strong> {selectedBooking.patientName}</div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="cancelReason">Reason for Cancellation *</Label>
                  <Textarea
                    id="cancelReason"
                    placeholder="Please provide a reason for cancelling this booking..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
                disabled={cancelling}
              >
                Keep Booking
              </Button>
              <Button 
                variant="destructive"
                onClick={handleCancelBooking}
                disabled={cancelling || !cancelReason.trim()}
              >
                {cancelling ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4 mr-2" />
                    Cancel Booking
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}