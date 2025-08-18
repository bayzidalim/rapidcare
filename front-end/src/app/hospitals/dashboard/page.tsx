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
import { bookingAPI, hospitalAPI } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import {
  Calendar,
  Clock,
  Building2,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Filter,
  BarChart3,
  PieChart,
  Users,
  Bed,
  Heart,
  Scissors,
  FileText,
  Eye,
  Download
} from 'lucide-react';
import Link from 'next/link';

interface BookingStats {
  total: number;
  pending: number;
  approved: number;
  declined: number;
  cancelled: number;
  completed: number;
  approvalRate: number;
  avgProcessingTime: number;
}

interface Booking {
  id: number;
  bookingReference: string;
  patientName: string;
  resourceType: string;
  urgency: string;
  status: string;
  scheduledDate: string;
  createdAt: string;
  approvedAt?: string;
  approvedByName?: string;
}

interface ResourceUtilization {
  resourceType: string;
  total: number;
  available: number;
  occupied: number;
  utilizationPercentage: number;
}

export default function HospitalDashboardPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [utilization, setUtilization] = useState<ResourceUtilization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [dateRange, setDateRange] = useState('30d');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    // Check if user is hospital authority
    if (!currentUser || currentUser.userType !== 'hospital-authority') {
      router.push('/dashboard');
      return;
    }
    
    loadDashboardData();
    setCurrentUser(getCurrentUser());
  }, [currentUser, router]);

  useEffect(() => {
    if (currentUser?.userType === 'hospital-authority') {
      loadDashboardData();
    }
  }, [dateRange, statusFilter]);

  const loadDashboardData = async () => {
    if (!currentUser?.hospital_id) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Load booking history, statistics, and resource utilization
      const [historyResponse, utilizationResponse] = await Promise.all([
        bookingAPI.getBookingHistory(currentUser.hospital_id, {
          startDate: getStartDate(dateRange),
          status: statusFilter !== 'all' ? statusFilter : undefined,
          limit: 100
        }),
        hospitalAPI.getResourceUtilization(currentUser.hospital_id)
      ]);
      
      if (historyResponse.data.success) {
        const bookingData = historyResponse.data.data || [];
        setBookings(bookingData);
        
        // Calculate statistics
        const calculatedStats = calculateStats(bookingData);
        setStats(calculatedStats);
      }
      
      if (utilizationResponse.data.success) {
        setUtilization(utilizationResponse.data.data || []);
      }
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      setError(error.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = (range: string) => {
    const now = new Date();
    switch (range) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const calculateStats = (bookingData: Booking[]): BookingStats => {
    const total = bookingData.length;
    const pending = bookingData.filter(b => b.status === 'pending').length;
    const approved = bookingData.filter(b => b.status === 'approved').length;
    const declined = bookingData.filter(b => b.status === 'declined').length;
    const cancelled = bookingData.filter(b => b.status === 'cancelled').length;
    const completed = bookingData.filter(b => b.status === 'completed').length;
    
    const processed = approved + declined;
    const approvalRate = processed > 0 ? (approved / processed) * 100 : 0;
    
    // Calculate average processing time for processed bookings
    const processedBookings = bookingData.filter(b => b.approvedAt);
    const avgProcessingTime = processedBookings.length > 0 
      ? processedBookings.reduce((sum, booking) => {
          const created = new Date(booking.createdAt).getTime();
          const processed = new Date(booking.approvedAt!).getTime();
          return sum + (processed - created);
        }, 0) / processedBookings.length / (1000 * 60 * 60) // Convert to hours
      : 0;

    return {
      total,
      pending,
      approved,
      declined,
      cancelled,
      completed,
      approvalRate,
      avgProcessingTime
    };
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

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-orange-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Check if user is authorized
  if (!currentUser || currentUser.userType !== 'hospital-authority') {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <div className="max-w-2xl mx-auto px-4 py-16">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Access Denied
                  </h2>
                  <p className="text-gray-600 mb-8">
                    You need hospital authority privileges to access this page.
                  </p>
                  <Button onClick={() => router.push('/dashboard')}>
                    Go to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Hospital Analytics Dashboard
                </h1>
                <p className="text-gray-600">
                  Monitor booking performance and resource utilization for your hospital.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/hospitals/manage">
                  <Button variant="outline">
                    <Users className="w-4 h-4 mr-2" />
                    Manage Bookings
                  </Button>
                </Link>
                <Button onClick={loadDashboardData} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
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
                  onClick={loadDashboardData}
                  className="ml-4"
                >
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Bookings</p>
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
                      <p className="text-sm font-medium text-gray-600">Approval Rate</p>
                      <p className="text-2xl font-bold text-purple-600">{stats.approvalRate.toFixed(1)}%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Processing</p>
                      <p className="text-2xl font-bold text-indigo-600">{stats.avgProcessingTime.toFixed(1)}h</p>
                    </div>
                    <Clock className="w-8 h-8 text-indigo-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Resource Utilization */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Resource Utilization
                  </CardTitle>
                  <CardDescription>
                    Current utilization rates for hospital resources
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {utilization.length === 0 ? (
                      <div className="text-center py-6">
                        <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 text-sm">No utilization data available</p>
                      </div>
                    ) : (
                      utilization.map((util) => (
                        <div key={util.resourceType} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getResourceIcon(util.resourceType)}
                              <span className="font-medium">
                                {getResourceLabel(util.resourceType)}
                              </span>
                            </div>
                            <span className={`font-bold ${getUtilizationColor(util.utilizationPercentage)}`}>
                              {util.utilizationPercentage.toFixed(1)}%
                            </span>
                          </div>
                          
                          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                            <div 
                              className={`h-3 rounded-full transition-all duration-300 ${
                                util.utilizationPercentage >= 90 ? 'bg-red-500' :
                                util.utilizationPercentage >= 70 ? 'bg-orange-500' :
                                util.utilizationPercentage >= 50 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${util.utilizationPercentage}%` }}
                            ></div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                            <div>
                              <span className="block">Available</span>
                              <span className="font-medium text-gray-900">{util.available}</span>
                            </div>
                            <div>
                              <span className="block">Occupied</span>
                              <span className="font-medium text-gray-900">{util.occupied}</span>
                            </div>
                            <div>
                              <span className="block">Total</span>
                              <span className="font-medium text-gray-900">{util.total}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Bookings */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Recent Bookings
                      </CardTitle>
                      <CardDescription>
                        Latest booking requests and their status
                      </CardDescription>
                    </div>
                    <Link href="/hospitals/manage">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View All
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {bookings.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No bookings found
                        </h3>
                        <p className="text-gray-600">
                          No bookings match your current filters.
                        </p>
                      </div>
                    ) : (
                      bookings.slice(0, 10).map((booking) => (
                        <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {getResourceIcon(booking.resourceType)}
                              <span className="font-medium text-sm">
                                {getResourceLabel(booking.resourceType)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-sm">{booking.patientName}</p>
                              <p className="text-xs text-gray-600">
                                Ref: {booking.bookingReference}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge className={getUrgencyColor(booking.urgency)}>
                              {booking.urgency}
                            </Badge>
                            <Badge className={getStatusColor(booking.status)}>
                              {booking.status}
                            </Badge>
                            <div className="text-right">
                              <p className="text-xs text-gray-600">
                                {new Date(booking.createdAt).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(booking.scheduledDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {bookings.length > 10 && (
                    <div className="mt-4 pt-4 border-t">
                      <Link href="/hospitals/manage">
                        <Button variant="outline" className="w-full">
                          View All {bookings.length} Bookings
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Performance Summary */}
          {stats && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Performance Summary
                </CardTitle>
                <CardDescription>
                  Key performance indicators for the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {stats.total}
                    </div>
                    <div className="text-sm text-gray-600">Total Requests</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {dateRange === '7d' ? 'Last 7 days' : dateRange === '30d' ? 'Last 30 days' : 'Last 90 days'}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {stats.approvalRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Approval Rate</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {stats.approved} approved of {stats.approved + stats.declined} processed
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {stats.avgProcessingTime.toFixed(1)}h
                    </div>
                    <div className="text-sm text-gray-600">Avg Processing Time</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Time from request to decision
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      {stats.pending}
                    </div>
                    <div className="text-sm text-gray-600">Pending Requests</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Awaiting your review
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}