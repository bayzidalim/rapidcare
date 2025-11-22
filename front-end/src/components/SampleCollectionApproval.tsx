'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  TestTube,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface TestDetail {
  id: number;
  name: string;
  price: number;
  home_collection_fee: number;
  sample_type: string;
}

interface SampleCollectionRequest {
  id: number;
  patient_name: string;
  patient_phone: string;
  collection_address: string;
  preferred_time: string;
  special_instructions: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  status: string;
  estimated_price: string;
  test_types: number[];
  testDetails: TestDetail[];
  user_name: string;
  user_email: string;
  user_phone: string;
  created_at: string;
  approved_at?: string;
  rejection_reason?: string;
}

interface SampleCollectionApprovalProps {
  hospitalId?: number;
}

export default function SampleCollectionApproval({ hospitalId }: SampleCollectionApprovalProps) {
  const [pendingRequests, setPendingRequests] = useState<SampleCollectionRequest[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<SampleCollectionRequest[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<SampleCollectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<SampleCollectionRequest | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [stats, setStats] = useState({
    pendingApproval: 0,
    totalRequests: 0,
    completedRequests: 0
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch pending approvals
      const pendingResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/sample-collection/hospital/pending-approvals`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json();
        setPendingRequests(pendingData.data || []);
      }

      // Fetch all requests to filter approved/rejected
      const allResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/sample-collection/hospital/requests`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (allResponse.ok) {
        const allData = await allResponse.json();
        const requests = allData.data || [];
        setApprovedRequests(requests.filter((r: SampleCollectionRequest) => r.approval_status === 'approved'));
        setRejectedRequests(requests.filter((r: SampleCollectionRequest) => r.approval_status === 'rejected'));
      }

    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch sample collection requests',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/sample-collection/hospital/stats`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleApprove = async (requestId: number) => {
    try {
      setProcessingId(requestId);
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/sample-collection/hospital/requests/${requestId}/approve`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Request Approved',
          description: data.message || 'Sample collection request approved successfully',
        });
        fetchRequests();
        fetchStats();
      } else {
        throw new Error(data.error || 'Failed to approve request');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve request',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectClick = (request: SampleCollectionRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a rejection reason',
        variant: 'destructive'
      });
      return;
    }

    try {
      setProcessingId(selectedRequest.id);
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/sample-collection/hospital/requests/${selectedRequest.id}/reject`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ reason: rejectionReason })
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Request Rejected',
          description: 'Sample collection request rejected successfully',
        });
        setShowRejectDialog(false);
        setSelectedRequest(null);
        setRejectionReason('');
        fetchRequests();
        fetchStats();
      } else {
        throw new Error(data.error || 'Failed to reject request');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject request',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateTotalPrice = (testDetails: TestDetail[]) => {
    return testDetails.reduce((total, test) => {
      return total + (test.price || 0) + (test.home_collection_fee || 0);
    }, 0);
  };

  const RequestCard = ({ request, showActions = true }: { request: SampleCollectionRequest; showActions?: boolean }) => (
    <Card className="mb-4 hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{request.patient_name}</CardTitle>
            <CardDescription>
              Requested by: {request.user_name} ({request.user_email})
            </CardDescription>
          </div>
          <Badge variant={
            request.approval_status === 'approved' ? 'default' :
            request.approval_status === 'rejected' ? 'destructive' :
            'secondary'
          }>
            {request.approval_status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
            {request.approval_status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
            {request.approval_status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
            {request.approval_status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Patient Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 mt-1 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">{request.patient_phone}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Collection Address</p>
                <p className="text-sm text-muted-foreground">{request.collection_address}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 mt-1 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Preferred Time</p>
                <p className="text-sm text-muted-foreground capitalize">{request.preferred_time}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 mt-1 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Requested On</p>
                <p className="text-sm text-muted-foreground">{formatDate(request.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Tests Requested */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TestTube className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium">Tests Requested</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              {request.testDetails && request.testDetails.length > 0 ? (
                request.testDetails.map((test) => (
                  <div key={test.id} className="flex justify-between items-center text-sm">
                    <span>{test.name}</span>
                    <span className="font-medium">
                      ৳{test.price} + ৳{test.home_collection_fee} (collection)
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No test details available</p>
              )}
              <div className="border-t pt-2 mt-2 flex justify-between items-center font-semibold">
                <span>Total Estimated Price</span>
                <span className="text-lg">
                  ৳{request.testDetails ? calculateTotalPrice(request.testDetails) : request.estimated_price}
                </span>
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          {request.special_instructions && (
            <div>
              <p className="text-sm font-medium mb-1">Special Instructions</p>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                {request.special_instructions}
              </p>
            </div>
          )}

          {/* Rejection Reason */}
          {request.approval_status === 'rejected' && request.rejection_reason && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">Rejection Reason</p>
                  <p className="text-sm text-destructive/80 mt-1">{request.rejection_reason}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {showActions && request.approval_status === 'pending' && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={() => handleApprove(request.id)}
                disabled={processingId === request.id}
                className="flex-1"
              >
                {processingId === request.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Request
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleRejectClick(request)}
                disabled={processingId === request.id}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject Request
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.pendingApproval}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting your review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">All time requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.completedRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different request statuses */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No Pending Approvals</p>
                <p className="text-sm text-muted-foreground">
                  All sample collection requests have been reviewed
                </p>
              </CardContent>
            </Card>
          ) : (
            <div>
              {pendingRequests.map((request) => (
                <RequestCard key={request.id} request={request} showActions={true} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          {approvedRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No Approved Requests</p>
                <p className="text-sm text-muted-foreground">
                  Approved requests will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div>
              {approvedRequests.map((request) => (
                <RequestCard key={request.id} request={request} showActions={false} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          {rejectedRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <XCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No Rejected Requests</p>
                <p className="text-sm text-muted-foreground">
                  Rejected requests will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div>
              {rejectedRequests.map((request) => (
                <RequestCard key={request.id} request={request} showActions={false} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Sample Collection Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request. The user will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="e.g., We do not have the required test equipment available at this time."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason('');
              }}
              disabled={processingId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim() || processingId !== null}
            >
              {processingId !== null ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Confirm Rejection'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
