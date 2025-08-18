'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Booking, 
  BookingApprovalData, 
  BookingDeclineData, 
  PendingBookingsSummary,
  BookingApprovalFilters 
} from '@/lib/types';
import { bookingAPI } from '@/lib/api';
import { pollingClient, SessionControl } from '@/lib/pollingClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  User, 
  Phone, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Bed,
  Heart,
  Scissors,
  Filter,
  SortAsc,
  SortDesc,
  RefreshCw,
  Eye,
  UserCheck,
  UserX,
  Activity,
  TrendingUp
} from 'lucide-react';

interface BookingApprovalInterfaceProps {
  hospitalId: number;
  onBookingAction?: (bookingId: number, action: 'approve' | 'decline', data: any) => void;
}

const BookingApprovalInterface: React.FC<BookingApprovalInterfaceProps> = ({
  hospitalId,
  onBookingAction
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [summary, setSummary] = useState<PendingBookingsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [pollingStatus, setPollingStatus] = useState<{
    isConnected: boolean;
    retryCount: number;
    interval: number;
  }>({
    isConnected: false,
    retryCount: 0,
    interval: 20000
  });
  
  // Refs for polling sessions
  const bookingPollingSession = useRef<SessionControl | null>(null);
  
  // Filter and sort states
  const [filters, setFilters] = useState<BookingApprovalFilters>({
    sortBy: 'urgency',
    sortOrder: 'asc',
    limit: 50
  });

  // Form states
  const [approvalData, setApprovalData] = useState<BookingApprovalData>({
    autoAllocateResources: true
  });
  const [declineData, setDeclineData] = useState<BookingDeclineData>({
    reason: '',
    notes: '',
    alternativeSuggestions: []
  });

  useEffect(() => {
    fetchPendingBookings();
  }, [hospitalId, filters]);

  // Initialize polling for booking updates
  useEffect(() => {
    if (!pollingEnabled) {
      // Stop polling if disabled
      if (bookingPollingSession.current) {
        bookingPollingSession.current.stop();
        bookingPollingSession.current = null;
      }
      setPollingStatus(prev => ({ ...prev, isConnected: false }));
      return;
    }

    // Set up polling client event handlers
    pollingClient.setEventHandlers({
      onConnect: (sessionId, endpoint) => {
        console.log(`Booking polling connected: ${sessionId} -> ${endpoint}`);
        setPollingStatus(prev => ({ ...prev, isConnected: true, retryCount: 0 }));
      },
      onDisconnect: (sessionId, endpoint) => {
        console.log(`Booking polling disconnected: ${sessionId} -> ${endpoint}`);
        setPollingStatus(prev => ({ ...prev, isConnected: false }));
      }
    });

    // Start booking polling
    bookingPollingSession.current = pollingClient.pollBookings(
      `booking-approval-${hospitalId}`,
      hospitalId,
      {
        interval: 20000, // 20 seconds for booking updates
        params: {
          ...filters,
          statuses: 'pending' // Only poll for pending bookings
        },
        onUpdate: (data, sessionId) => {
          console.log('Booking polling update:', data);
          
          if (data.hasChanges && data.changes?.byHospital?.length > 0) {
            const hospitalData = data.changes.byHospital.find(
              (h: any) => h.hospitalId === hospitalId
            );
            
            if (hospitalData && hospitalData.bookings) {
              // Filter for pending bookings only
              const pendingBookings = hospitalData.bookings.filter(
                (booking: any) => booking.status === 'pending'
              );
              
              if (pendingBookings.length > 0) {
                // Refresh the full booking list to get complete data
                fetchPendingBookings();
              }
            }
          }
          
          // Update polling status
          const status = bookingPollingSession.current?.getStatus();
          if (status?.exists) {
            setPollingStatus(prev => ({
              ...prev,
              interval: status.interval || prev.interval,
              retryCount: status.retryCount || 0
            }));
          }
        },
        onError: (error, sessionId, retryCount) => {
          console.error(`Booking polling error (${sessionId}):`, error, `Retry: ${retryCount}`);
          setPollingStatus(prev => ({ 
            ...prev, 
            isConnected: false, 
            retryCount 
          }));
          
          if (retryCount >= 3) {
            setError(`Booking updates connection lost. Please refresh the page.`);
          }
        }
      }
    );

    // Cleanup function
    return () => {
      if (bookingPollingSession.current) {
        bookingPollingSession.current.stop();
        bookingPollingSession.current = null;
      }
    };
  }, [hospitalId, pollingEnabled, filters]);

  const fetchPendingBookings = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await bookingAPI.getPendingBookings(hospitalId, filters);
      
      if (response.data.success) {
        setBookings(response.data.data || []);
        setSummary(response.data.summary || null);
      } else {
        setError('Failed to fetch pending bookings');
      }
    } catch (err: any) {
      console.error('Error fetching pending bookings:', err);
      setError(err.response?.data?.error || 'Failed to fetch pending bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveBooking = async () => {
    if (!selectedBooking) return;
    
    try {
      setActionLoading(true);
      setError('');
      
      const response = await bookingAPI.approveBooking(selectedBooking.id, approvalData);
      
      if (response.data.success) {
        // Remove approved booking from list
        setBookings(prev => prev.filter(b => b.id !== selectedBooking.id));
        setShowApprovalModal(false);
        setSelectedBooking(null);
        setApprovalData({ autoAllocateResources: true });
        
        // Trigger callback if provided
        if (onBookingAction) {
          onBookingAction(selectedBooking.id, 'approve', response.data.data);
        }
        
        // Refresh summary
        fetchPendingBookings();
      } else {
        setError(response.data.error || 'Failed to approve booking');
      }
    } catch (err: any) {
      console.error('Error approving booking:', err);
      setError(err.response?.data?.error || 'Failed to approve booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineBooking = async () => {
    if (!selectedBooking || !declineData.reason) return;
    
    try {
      setActionLoading(true);
      setError('');
      
      const response = await bookingAPI.declineBooking(selectedBooking.id, declineData);
      
      if (response.data.success) {
        // Remove declined booking from list
        setBookings(prev => prev.filter(b => b.id !== selectedBooking.id));
        setShowDeclineModal(false);
        setSelectedBooking(null);
        setDeclineData({ reason: '', notes: '', alternativeSuggestions: [] });
        
        // Trigger callback if provided
        if (onBookingAction) {
          onBookingAction(selectedBooking.id, 'decline', response.data.data);
        }
        
        // Refresh summary
        fetchPendingBookings();
      } else {
        setError(response.data.error || 'Failed to decline booking');
      }
    } catch (err: any) {
      console.error('Error declining booking:', err);
      setError(err.response?.data?.error || 'Failed to decline booking');
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

  const getResourceIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'bed': return <Bed className="w-4 h-4" />;
      case 'icu': return <Heart className="w-4 h-4" />;
      case 'operationTheatre': return <Scissors className="w-4 h-4" />;
      default: return <Bed className="w-4 h-4" />;
    }
  };

  const formatResourceType = (resourceType: string) => {
    switch (resourceType) {
      case 'bed': return 'Hospital Bed';
      case 'icu': return 'ICU';
      case 'operationTheatre': return 'Operation Theatre';
      default: return resourceType;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading pending bookings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pending Booking Requests</CardTitle>
              <CardDescription>
                Review and approve or decline booking requests from patients
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className={`w-2 h-2 rounded-full ${
                  pollingEnabled && pollingStatus.isConnected ? 'bg-green-500' : 
                  pollingEnabled && pollingStatus.retryCount > 0 ? 'bg-yellow-500' :
                  'bg-gray-400'
                }`}></div>
                <span>
                  {pollingEnabled && pollingStatus.isConnected ? 'Live Updates' : 
                   pollingEnabled && pollingStatus.retryCount > 0 ? `Reconnecting (${pollingStatus.retryCount})` :
                   pollingEnabled ? 'Connecting...' : 'Updates Paused'}
                </span>
                {pollingEnabled && pollingStatus.isConnected && (
                  <span className="text-xs text-gray-500">
                    ({Math.round(pollingStatus.interval / 1000)}s)
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPollingEnabled(!pollingEnabled)}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${pollingEnabled && pollingStatus.isConnected ? 'animate-spin' : ''}`} />
                {pollingEnabled ? 'Pause' : 'Resume'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchPendingBookings}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select 
                value={filters.urgency || 'all'} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, urgency: value === 'all' ? undefined : value }))}
              >
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
            
            <Select 
              value={filters.resourceType || 'all'} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, resourceType: value === 'all' ? undefined : value }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Resource Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                <SelectItem value="bed">Hospital Bed</SelectItem>
                <SelectItem value="icu">ICU</SelectItem>
                <SelectItem value="operationTheatre">Operation Theatre</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2">
              <Select 
                value={filters.sortBy || 'urgency'} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value as any }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgency">Urgency</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' 
                }))}
              >
                {filters.sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {error && (
            <Alert className="mb-4" variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Booking List */}
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending bookings</h3>
                <p className="text-gray-600">
                  All booking requests have been processed. New requests will appear here.
                </p>
              </div>
            ) : (
              bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onApprove={() => {
                    setSelectedBooking(booking);
                    setShowApprovalModal(true);
                  }}
                  onDecline={() => {
                    setSelectedBooking(booking);
                    setShowDeclineModal(true);
                  }}
                  onViewDetails={() => {
                    setSelectedBooking(booking);
                    setShowDetailsModal(true);
                  }}
                  getUrgencyColor={getUrgencyColor}
                  getResourceIcon={getResourceIcon}
                  formatResourceType={formatResourceType}
                  formatWaitingTime={formatWaitingTime}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

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
                    <span className="font-medium">Resource:</span> {formatResourceType(selectedBooking.resourceType)}
                  </div>
                  <div>
                    <span className="font-medium">Urgency:</span>
                    <Badge className={`ml-2 ${getUrgencyColor(selectedBooking.urgency)}`}>
                      {selectedBooking.urgency}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Waiting:</span> {formatWaitingTime(selectedBooking.waitingTime || 0)}
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <Label htmlFor="approvalNotes">Notes (Optional)</Label>
              <Textarea
                id="approvalNotes"
                placeholder="Add any notes for the patient..."
                value={approvalData.notes || ''}
                onChange={(e) => setApprovalData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="resourcesAllocated">Resources to Allocate</Label>
              <Input
                id="resourcesAllocated"
                type="number"
                min="1"
                placeholder="1"
                value={approvalData.resourcesAllocated || ''}
                onChange={(e) => setApprovalData(prev => ({ 
                  ...prev, 
                  resourcesAllocated: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowApprovalModal(false)}
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
              <Select 
                value={declineData.reason || 'none'} 
                onValueChange={(value) => setDeclineData(prev => ({ ...prev, reason: value === 'none' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select a reason</SelectItem>
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
                value={declineData.notes || ''}
                onChange={(e) => setDeclineData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeclineModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDeclineBooking}
              disabled={actionLoading || !declineData.reason}
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
            <BookingDetailsView booking={selectedBooking} />
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
  );
};

// Booking Card Component
interface BookingCardProps {
  booking: Booking;
  onApprove: () => void;
  onDecline: () => void;
  onViewDetails: () => void;
  getUrgencyColor: (urgency: string) => string;
  getResourceIcon: (resourceType: string) => React.ReactNode;
  formatResourceType: (resourceType: string) => string;
  formatWaitingTime: (hours: number) => string;
}

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onApprove,
  onDecline,
  onViewDetails,
  getUrgencyColor,
  getResourceIcon,
  formatResourceType,
  formatWaitingTime
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                {getResourceIcon(booking.resourceType)}
                <span className="font-medium">{formatResourceType(booking.resourceType)}</span>
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
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Medical Condition</p>
              <p className="text-sm bg-gray-50 p-2 rounded">
                {booking.medicalCondition.length > 100 
                  ? `${booking.medicalCondition.substring(0, 100)}...` 
                  : booking.medicalCondition
                }
              </p>
            </div>
            
            {booking.resourceAvailability && (
              <div className="mb-4">
                <div className={`text-xs p-2 rounded ${
                  booking.canApprove 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {booking.canApprove ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <AlertTriangle className="w-3 h-3" />
                    )}
                    <span>
                      {booking.resourceAvailability.current} of {booking.resourceAvailability.total} available
                      {booking.resourceAvailability.message && ` - ${booking.resourceAvailability.message}`}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-2 ml-4">
            <Button size="sm" variant="outline" onClick={onViewDetails}>
              <Eye className="w-4 h-4 mr-2" />
              Details
            </Button>
            <Button 
              size="sm" 
              onClick={onApprove}
              disabled={!booking.canApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={onDecline}>
              <UserX className="w-4 h-4 mr-2" />
              Decline
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Booking Details View Component
interface BookingDetailsViewProps {
  booking: Booking;
}

const BookingDetailsView: React.FC<BookingDetailsViewProps> = ({ booking }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium mb-3">Patient Information</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-medium">{booking.patientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Age:</span>
              <span>{booking.patientAge} years</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Gender:</span>
              <span className="capitalize">{booking.patientGender}</span>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium mb-3">Emergency Contact</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-medium">{booking.emergencyContact.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Phone:</span>
              <span>{booking.emergencyContact.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Relationship:</span>
              <span className="capitalize">{booking.emergencyContact.relationship}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div>
        <h4 className="font-medium mb-3">Booking Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Resource Type:</span>
            <span className="font-medium">{booking.resourceType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Urgency:</span>
            <Badge className={`text-xs ${
              booking.urgency === 'critical' ? 'bg-red-100 text-red-800' :
              booking.urgency === 'high' ? 'bg-orange-100 text-orange-800' :
              booking.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {booking.urgency}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Scheduled Date:</span>
            <span>{new Date(booking.scheduledDate).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Duration:</span>
            <span>{booking.estimatedDuration} hours</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Payment Amount:</span>
            <span className="font-medium">${booking.payment.amount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Requested:</span>
            <span>{new Date(booking.createdAt).toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      <div>
        <h4 className="font-medium mb-3">Medical Condition</h4>
        <div className="bg-gray-50 p-4 rounded-lg text-sm">
          {booking.medicalCondition}
        </div>
      </div>
      
      {booking.notes && (
        <div>
          <h4 className="font-medium mb-3">Additional Notes</h4>
          <div className="bg-gray-50 p-4 rounded-lg text-sm">
            {booking.notes}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingApprovalInterface;