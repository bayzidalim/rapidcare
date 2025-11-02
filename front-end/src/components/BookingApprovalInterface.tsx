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
      <Card className="border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-white">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-600" />
                Pending Booking Requests
              </CardTitle>
              <CardDescription className="text-gray-600 mt-1">
                Review and approve or decline booking requests from patients
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm bg-white px-3 py-2 rounded-lg border">
                <div className={`w-3 h-3 rounded-full ${
                  pollingEnabled && pollingStatus.isConnected ? 'bg-green-500 animate-pulse' : 
                  pollingEnabled && pollingStatus.retryCount > 0 ? 'bg-yellow-500 animate-pulse' :
                  'bg-gray-400'
                }`}></div>
                <span className="font-medium">
                  {pollingEnabled && pollingStatus.isConnected ? 'Live Updates' : 
                   pollingEnabled && pollingStatus.retryCount > 0 ? `Reconnecting (${pollingStatus.retryCount})` :
                   pollingEnabled ? 'Connecting...' : 'Updates Paused'}
                </span>
                {pollingEnabled && pollingStatus.isConnected && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {Math.round(pollingStatus.interval / 1000)}s
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPollingEnabled(!pollingEnabled)}
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${pollingEnabled && pollingStatus.isConnected ? 'animate-spin' : ''}`} />
                {pollingEnabled ? 'Pause' : 'Resume'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchPendingBookings}
                disabled={loading}
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-800">Filters & Sorting:</span>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Urgency:</label>
                <Select 
                  value={filters.urgency || 'all'} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, urgency: value === 'all' ? undefined : value }))}
                >
                  <SelectTrigger className="w-36 border-blue-200">
                    <SelectValue placeholder="Urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Urgency</SelectItem>
                    <SelectItem value="critical">🚨 Critical</SelectItem>
                    <SelectItem value="high">⚠️ High</SelectItem>
                    <SelectItem value="medium">📋 Medium</SelectItem>
                    <SelectItem value="low">📝 Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Resource:</label>
                <Select 
                  value={filters.resourceType || 'all'} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, resourceType: value === 'all' ? undefined : value }))}
                >
                  <SelectTrigger className="w-44 border-blue-200">
                    <SelectValue placeholder="Resource Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Resources</SelectItem>
                    <SelectItem value="bed">🛏️ Hospital Bed</SelectItem>
                    <SelectItem value="icu">❤️ ICU</SelectItem>
                    <SelectItem value="operationTheatre">⚕️ Operation Theatre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <Select 
                  value={filters.sortBy || 'urgency'} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value as any }))}
                >
                  <SelectTrigger className="w-36 border-blue-200">
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
                  className="border-blue-200 hover:bg-blue-50"
                  title={`Sort ${filters.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  {filters.sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                </Button>
              </div>
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
              <div className="text-center py-12">
                <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">All Caught Up! 🎉</h3>
                <p className="text-gray-600 text-lg mb-4">
                  No pending booking requests at the moment
                </p>
                <p className="text-gray-500">
                  New booking requests will appear here automatically when patients submit them.
                </p>
                <div className="mt-6">
                  <Button 
                    variant="outline" 
                    onClick={fetchPendingBookings}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Check for New Requests
                  </Button>
                </div>
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
            
            {selectedBooking && !selectedBooking.canApprove && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Cannot approve this booking:</strong> {selectedBooking.resourceAvailability?.message || 'Required resources are not available'}
                </AlertDescription>
              </Alert>
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
              disabled={actionLoading || !selectedBooking?.canApprove}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {!selectedBooking?.canApprove ? 'Cannot Approve - No Resources' : 'Approve Booking'}
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
                disabled={!selectedBooking?.canApprove}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!selectedBooking?.canApprove ? 'Cannot approve - resources not available' : 'Approve this booking'}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {!selectedBooking?.canApprove ? 'Cannot Approve' : 'Approve'}
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
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500 bg-gradient-to-r from-white to-blue-50/30">
      <CardContent className="p-6">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full">
                {getResourceIcon(booking.resourceType)}
                <span className="font-semibold text-blue-800">{formatResourceType(booking.resourceType)}</span>
              </div>
              <Badge className={`${getUrgencyColor(booking.urgency)} font-medium px-3 py-1`}>
                {booking.urgency.toUpperCase()}
              </Badge>
              {booking.waitingTime && (
                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatWaitingTime(booking.waitingTime)} waiting
                </Badge>
              )}
            </div>
            
            {/* Patient Info Section */}
            <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-800">Patient Information</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-lg font-bold text-gray-900">{booking.patientName}</p>
                  <p className="text-sm text-gray-600">
                    {booking.patientAge} years old • {booking.patientGender}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{booking.userPhone || 'No phone'}</p>
                  <p className="text-sm text-gray-600">{booking.userEmail || 'No email'}</p>
                </div>
              </div>
            </div>
            
            {/* Schedule & Duration Section */}
            <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-gray-800">Schedule Details</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Scheduled Date</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(booking.scheduledDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-semibold text-gray-900">{booking.estimatedDuration} hours</p>
                </div>
              </div>
            </div>
            
            {/* Medical Condition Section */}
            <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-gray-800">Medical Condition</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-l-red-400">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {booking.medicalCondition.length > 150 
                    ? `${booking.medicalCondition.substring(0, 150)}...` 
                    : booking.medicalCondition
                  }
                </p>
                {booking.medicalCondition.length > 150 && (
                  <button 
                    onClick={onViewDetails}
                    className="text-blue-600 text-xs mt-2 hover:underline"
                  >
                    Read full condition details →
                  </button>
                )}
              </div>
            </div>
            
            {/* Resource Availability Section */}
            {booking.resourceAvailability && (
              <div className="mb-4">
                <div className={`p-4 rounded-lg border-2 ${
                  booking.canApprove 
                    ? 'bg-green-50 text-green-800 border-green-300' 
                    : 'bg-red-50 text-red-800 border-red-300'
                }`}>
                  <div className="flex items-center gap-3">
                    {booking.canApprove ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    )}
                    <div className="flex-1">
                      <div className="font-bold text-lg">
                        {booking.canApprove ? '✅ Resources Available' : '❌ Resources Unavailable'}
                      </div>
                      <div className="text-sm mt-1">
                        <span className="font-semibold">
                          {booking.resourceAvailability.current} of {booking.resourceAvailability.total} 
                        </span>
                        <span className="ml-1">
                          {formatResourceType(booking.resourceType).toLowerCase()} available
                        </span>
                        {booking.resourceAvailability.message && (
                          <div className="mt-2 p-2 bg-white/50 rounded border">
                            <span className="font-medium">{booking.resourceAvailability.message}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons Section */}
          <div className="flex flex-col gap-3 ml-6 min-w-[140px]">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onViewDetails}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
            <Button 
              size="sm" 
              onClick={onApprove}
              disabled={!booking.canApprove}
              className={`font-semibold ${
                booking.canApprove 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title={!booking.canApprove ? booking.resourceAvailability?.message || 'Resources not available' : 'Approve this booking'}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              {booking.canApprove ? 'Approve' : 'Cannot Approve'}
            </Button>
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={onDecline}
              className="font-semibold"
            >
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
              <span className="font-medium">{booking.emergencyContact?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Phone:</span>
              <span>{booking.emergencyContact?.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Relationship:</span>
              <span className="capitalize">{booking.emergencyContact?.relationship}</span>
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
            <span className="font-medium">${booking.payment?.amount}</span>
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