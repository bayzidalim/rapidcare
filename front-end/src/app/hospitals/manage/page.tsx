'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import PollingStatusIndicator from '@/components/PollingStatusIndicator';
import { useBookingUpdates } from '@/hooks/useRealTimeUpdates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { bookingAPI, hospitalAPI } from '@/lib/api';
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
  UserCheck,
  UserX,
  Activity,
  TrendingUp,
  RefreshCw,
  Filter,
  SortAsc,
  SortDesc,
  Bed,
  Heart,
  Scissors,
  FileText,
  Users,
  Bell,
  Settings
} from 'lucide-react';

interface Booking {
  id: number;
  bookingReference: string;
  userId: number;
  userName: string;
  userPhone?: string;
  userEmail?: string;
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
  createdAt: string;
  waitingTime?: number;
}

interface BookingSummary {
  totalPending: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  avgWaitingDays: number;
}

export default function HospitalManagePage() {
  const router = useRouter();
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [summary, setSummary] = useState<BookingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  
  // Filter and sort states
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('urgency');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Form states
  const [approvalNotes, setApprovalNotes] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [declineNotes, setDeclineNotes] = useState('');

  // Real-time updates for pending bookings
  const bookingUpdates = useBookingUpdates(currentUser?.hospital_id, {
    enabled: currentUser?.userType === 'hospital-authority',
    onUpdate: (data) => {
      if (data.hasChanges && data.changes?.bookings) {
        // Refresh pending bookings if there are changes
        loadPendingBookings();
      }
    },
    onError: (error) => {
      console.error('Booking updates error:', error);
    }
  });

  useEffect(() => {
    // Check if user is hospital authority
    if (!currentUser || currentUser.userType !== 'hospital-authority') {
      router.push('/dashboard');
      return;
    }
    
    loadPendingBookings();
    setCurrentUser(getCurrentUser());
  }, [currentUser, router]);

  useEffect(() => {
    if (currentUser?.userType === 'hospital-authority') {
      loadPendingBookings();
    }
  }, [urgencyFilter, resourceFilter, sortBy, sortOrder]);

  const loadPendingBookings = async () => {
    if (!currentUser?.hospital_id) return;
    
    try {
      setLoading(true);
      setError('');
      
      const params = {
        urgency: urgencyFilter !== 'all' ? urgencyFilter : undefined,
        resourceType: resourceFilter !== 'all' ? resourceFilter : undefined,
        sortBy,
        sortOrder,
        limit: 50
      };
      
      const response = await bookingAPI.getPendingBookings(currentUser.hospital_id, params);
      
      if (response.data.success) {
        setPendingBookings(response.data.data || []);
        setSummary(response.data.summary || null);
      } else {
        setError('Failed to load pending bookings');
      }
    } catch (error: any) {
      console.error('Failed to load pending bookings:', error);
      setError(error.response?.data?.error || 'Failed to load pending bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveBooking = async () => {
    if (!selectedBooking) return;
    
    try {
      setActionLoading(true);
      setError('');
      
      const response = await bookingAPI.approveBooking(selectedBooking.id, {
        notes: approvalNotes.trim() || undefined,
        autoAllocateResources: true
      });
      
      if (response.data.success) {
        // Remove approved booking from list
        setPendingBookings(prev => prev.filter(b => b.id !== selectedBooking.id));
        setShowApprovalModal(false);
        setSelectedBooking(null);
        setApprovalNotes('');
        
        // Refresh data
        loadPendingBookings();
      } else {
        setError(response.data.error || 'Failed to approve booking');
      }
    } catch (error: any) {
      console.error('Error approving booking:', error);
      setError(error.response?.data?.error || 'Failed to approve booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineBooking = async () => {
    if (!selectedBooking || !declineReason) return;
    
    try {
      setActionLoading(true);
      setError('');
      
      const response = await bookingAPI.declineBooking(selectedBooking.id, {
        reason: declineReason,
        notes: declineNotes.trim() || undefined
      });
      
      if (response.data.success) {
        // Remove declined booking from list
        setPendingBookings(prev => prev.filter(b => b.id !== selectedBooking.id));
        setShowDeclineModal(false);
        setSelectedBooking(null);
        setDeclineReason('');
        setDeclineNotes('');
        
        // Refresh data
        loadPendingBookings();
      } else {
        setError(response.data.error || 'Failed to decline booking');
      }
    } catch (error: any) {
      console.error('Error declining booking:', error);
      setError(error.response?.data?.error || 'Failed to decline booking');
    } finally {
      setActionLoading(false);
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

  const formatWaitingTime = (hours: number) => {
    if (hours < 24) {
      return `${Math.round(hours)}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round(hours % 24);
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
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
                <span className="text-lg text-gray-600">Loading pending bookings...</span>
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
              Hospital Management
            </h1>
            <p className="text-gray-600">
              Review and manage incoming booking requests for your hospital.
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
                  onClick={loadPendingBookings}
                  className="ml-4"
                >
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Pending</p>
                      <p className="text-2xl font-bold text-gray-900">{summary.totalPending}</p>
                    </div>
                    <Activity className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Critical</p>
                      <p className="text-2xl font-bold text-red-600">{summary.critical}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">High Priority</p>
                      <p className="text-2xl font-bold text-orange-600">{summary.high}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Medium</p>
                      <p className="text-2xl font-bold text-yellow-600">{summary.medium}</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Low</p>
                      <p className="text-2xl font-bold text-green-600">{summary.low}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Wait</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {summary.avgWaitingDays ? `${Math.round(summary.avgWaitingDays)}d` : '0d'}
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-gray-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}      
    {/* Main Content */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pending Booking Requests</CardTitle>
                  <CardDescription>
                    Review and approve or decline booking requests from patients
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <PollingStatusIndicator
                    isConnected={bookingUpdates.status.isConnected}
                    retryCount={bookingUpdates.status.retryCount}
                    lastUpdate={bookingUpdates.status.lastUpdate}
                    error={bookingUpdates.status.error}
                    onReconnect={bookingUpdates.reconnect}
                    showDetails={true}
                  />
                  <Button onClick={loadPendingBookings} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Select value={resourceFilter} onValueChange={setResourceFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Resource Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Resources</SelectItem>
                    <SelectItem value="beds">Hospital Bed</SelectItem>
                    <SelectItem value="icu">ICU</SelectItem>
                    <SelectItem value="operationTheatres">Operation Theatre</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex items-center gap-2">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgency">Urgency</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="patient">Patient</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Bookings List */}
              <div className="space-y-4">
                {pendingBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">
                      No pending bookings
                    </h3>
                    <p className="text-gray-600">
                      All booking requests have been processed. New requests will appear here.
                    </p>
                  </div>
                ) : (
                  pendingBookings.map((booking) => (
                    <Card key={booking.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="flex items-center gap-2">
                                {getResourceIcon(booking.resourceType)}
                                <span className="font-medium">
                                  {getResourceLabel(booking.resourceType)}
                                </span>
                              </div>
                              <Badge className={getUrgencyColor(booking.urgency)}>
                                {booking.urgency}
                              </Badge>
                              {booking.waitingTime && (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatWaitingTime(booking.waitingTime)}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                  <User className="w-4 h-4" />
                                  <span>Patient Information</span>
                                </div>
                                <p className="font-medium">{booking.patientName}</p>
                                <p className="text-sm text-gray-600">
                                  {booking.patientAge} years, {booking.patientGender}
                                </p>
                              </div>
                              
                              <div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                  <Phone className="w-4 h-4" />
                                  <span>Contact</span>
                                </div>
                                <p className="text-sm">{booking.userPhone || 'N/A'}</p>
                                <p className="text-sm text-gray-600">{booking.userEmail || 'N/A'}</p>
                              </div>
                              
                              <div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>Scheduled</span>
                                </div>
                                <p className="text-sm">
                                  {new Date(booking.scheduledDate).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {booking.estimatedDuration}h duration
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <FileText className="w-4 h-4" />
                                <span>Ref: {booking.bookingReference}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                <span>Emergency: {booking.emergencyContactName}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>Requested {new Date(booking.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>

                            {booking.medicalCondition && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600 mb-1">Medical Condition:</p>
                                <p className="text-sm">{booking.medicalCondition}</p>
                              </div>
                            )}
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
                            
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedBooking(booking);
                                setShowApprovalModal(true);
                              }}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedBooking(booking);
                                setShowDeclineModal(true);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Decline
                            </Button>
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
    {/* Approval Modal */}
        <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Approve Booking Request
              </DialogTitle>
              <DialogDescription>
                Confirm approval for {selectedBooking?.patientName}'s booking request
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {selectedBooking && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Patient:</span> {selectedBooking.patientName}
                    </div>
                    <div>
                      <span className="font-medium">Resource:</span> {getResourceLabel(selectedBooking.resourceType)}
                    </div>
                    <div>
                      <span className="font-medium">Urgency:</span>
                      <Badge className={`ml-2 ${getUrgencyColor(selectedBooking.urgency)}`}>
                        {selectedBooking.urgency}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span> {selectedBooking.estimatedDuration}h
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="approvalNotes">Notes for Patient (Optional)</Label>
                <Textarea
                  id="approvalNotes"
                  placeholder="Add any notes for the patient..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowApprovalModal(false);
                  setApprovalNotes('');
                }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleApproveBooking}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Approve Booking
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Decline Modal */}
        <Dialog open={showDeclineModal} onOpenChange={setShowDeclineModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Decline Booking Request
              </DialogTitle>
              <DialogDescription>
                Provide a reason for declining {selectedBooking?.patientName}'s booking request
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="declineReason">Reason for Decline *</Label>
                <Select value={declineReason} onValueChange={setDeclineReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insufficient_resources">Insufficient Resources Available</SelectItem>
                    <SelectItem value="medical_condition">Medical Condition Not Suitable</SelectItem>
                    <SelectItem value="scheduling_conflict">Scheduling Conflict</SelectItem>
                    <SelectItem value="incomplete_information">Incomplete Information</SelectItem>
                    <SelectItem value="policy_violation">Policy Violation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="declineNotes">Additional Notes</Label>
                <Textarea
                  id="declineNotes"
                  placeholder="Provide additional details or alternative suggestions..."
                  value={declineNotes}
                  onChange={(e) => setDeclineNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowDeclineModal(false);
                  setDeclineReason('');
                  setDeclineNotes('');
                }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDeclineBooking}
                disabled={actionLoading || !declineReason}
                variant="destructive"
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Decline Booking
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                Booking Request Details
              </DialogTitle>
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
                    <Badge className={getUrgencyColor(selectedBooking.urgency)}>
                      {selectedBooking.urgency.toUpperCase()} PRIORITY
                    </Badge>
                  </div>
                </div>

                {/* Patient and Resource Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Resource Request</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Resource:</span>
                        <span className="font-medium">{getResourceLabel(selectedBooking.resourceType)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">{selectedBooking.estimatedDuration} hours</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Scheduled:</span>
                        <span className="font-medium">
                          {new Date(selectedBooking.scheduledDate).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Urgency:</span>
                        <Badge className={getUrgencyColor(selectedBooking.urgency)}>
                          {selectedBooking.urgency}
                        </Badge>
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

                {/* User Contact */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Requester Contact</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <p className="font-medium">{selectedBooking.userName}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Phone:</span>
                      <p className="font-medium">{selectedBooking.userPhone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Notes */}
                {selectedBooking.notes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Additional Notes</h4>
                    <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedBooking.notes}</p>
                  </div>
                )}

                {/* Timeline */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Request Submitted:</span>
                      <span>{new Date(selectedBooking.createdAt).toLocaleString()}</span>
                    </div>
                    {selectedBooking.waitingTime && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Waiting Time:</span>
                        <span>{formatWaitingTime(selectedBooking.waitingTime)}</span>
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
              <div className="flex gap-2">
                <Button 
                  variant="destructive"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowDeclineModal(true);
                  }}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline
                </Button>
                <Button 
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowApprovalModal(true);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}