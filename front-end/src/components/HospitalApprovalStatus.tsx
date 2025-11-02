'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Hospital } from '@/lib/types';
import { hospitalAPI } from '@/lib/api';
import AuditTrailViewer from './AuditTrailViewer';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Building2,
  Calendar,
  User,
  Timer,
  TrendingUp,
  Bell,
  Eye,
  FileText,
  MapPin,
  Phone,
  Mail,
  X
} from 'lucide-react';

interface HospitalApprovalStatusProps {
  hospital: Hospital;
  onUpdate: (hospital: Hospital) => void;
}

export default function HospitalApprovalStatus({ hospital, onUpdate }: HospitalApprovalStatusProps) {
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [showResubmitDialog, setShowResubmitDialog] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isPolling, setIsPolling] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const [resubmitData, setResubmitData] = useState({
    name: hospital.name,
    description: hospital.description || '',
    type: hospital.type || '',
    street: hospital.address.street,
    city: hospital.address.city,
    state: hospital.address.state,
    zipCode: hospital.address.zipCode,
    country: hospital.address.country,
    phone: hospital.contact.phone,
    email: hospital.contact.email,
    emergency: hospital.contact.emergency,
    services: hospital.services.join(', ')
  });

  // Real-time status polling for pending hospitals
  useEffect(() => {
    if (hospital.approvalStatus === 'pending') {
      setIsPolling(true);
      pollingInterval.current = setInterval(async () => {
        try {
          const response = await hospitalAPI.getMyHospital();
          if (response.data.success && response.data.data) {
            const updatedHospital = response.data.data;
            if (updatedHospital.approvalStatus !== hospital.approvalStatus) {
              onUpdate(updatedHospital);
              setLastUpdated(new Date());
              // Stop polling if status changed from pending
              if (updatedHospital.approvalStatus !== 'pending') {
                setIsPolling(false);
                if (pollingInterval.current) {
                  clearInterval(pollingInterval.current);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error polling hospital status:', error);
        }
      }, 30000); // Poll every 30 seconds

      return () => {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
        }
        setIsPolling(false);
      };
    }
  }, [hospital.approvalStatus, hospital.id, onUpdate]);

  // Load persisted dismissal state for this hospital + status
  useEffect(() => {
    try {
      const key = `rc-hospital-approval-dismissed:${hospital.id}:${hospital.approvalStatus || 'pending'}`;
      const stored = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      setIsDismissed(stored === '1');
    } catch {}
  }, [hospital.id, hospital.approvalStatus]);

  const handleDismiss = () => {
    try {
      const key = `rc-hospital-approval-dismissed:${hospital.id}:${hospital.approvalStatus || 'pending'}`;
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, '1');
      }
    } catch {}
    setIsDismissed(true);
  };

  // Calculate time since submission
  const getTimeSinceSubmission = () => {
    if (!hospital.submittedAt) return 'Unknown';
    const submitted = new Date(hospital.submittedAt);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - submitted.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
  };

  // Calculate approval progress
  const getApprovalProgress = () => {
    switch (hospital.approvalStatus) {
      case 'pending':
        return 50;
      case 'approved':
        return 100;
      case 'rejected':
        return 25;
      default:
        return 0;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'pending':
        return <Clock className="w-6 h-6 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="w-6 h-6 text-red-600" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusMessage = (status: string) => {
    const timeSince = getTimeSinceSubmission();
    
    switch (status) {
      case 'approved':
        return {
          title: 'Hospital Approved ✅',
          description: 'Your hospital has been approved and is now visible to users. You can manage your hospital resources and view bookings.',
          details: hospital.approvedAt ? `Approved ${new Date(hospital.approvedAt).toLocaleDateString()} at ${new Date(hospital.approvedAt).toLocaleTimeString()}` : '',
          type: 'success' as const,
          nextSteps: [
            'Start managing your hospital resources',
            'View and approve patient bookings',
            'Update pricing and availability',
            'Monitor analytics and performance'
          ]
        };
      case 'pending':
        return {
          title: 'Approval Pending ⏳',
          description: `Your hospital registration is under review by our administrators. Submitted ${timeSince}.`,
          details: 'This process typically takes 1-2 business days. You will receive a notification once the review is complete.',
          type: 'warning' as const,
          nextSteps: [
            'Wait for admin review (typically 1-2 business days)',
            'Check your email for updates',
            'Ensure all contact information is correct',
            'Prepare to address any feedback if needed'
          ]
        };
      case 'rejected':
        return {
          title: 'Hospital Rejected ❌',
          description: 'Your hospital registration was not approved. Please review the rejection reason below and resubmit with the necessary corrections.',
          details: hospital.approvedAt ? `Rejected ${new Date(hospital.approvedAt).toLocaleDateString()} at ${new Date(hospital.approvedAt).toLocaleTimeString()}` : '',
          type: 'error' as const,
          nextSteps: [
            'Review the rejection reason carefully',
            'Update your hospital information',
            'Address all mentioned issues',
            'Resubmit for approval'
          ]
        };
      default:
        return {
          title: 'Status Unknown ❓',
          description: 'Unable to determine hospital approval status. Please contact support.',
          details: 'This may be a temporary issue. Try refreshing the page or contact our support team.',
          type: 'info' as const,
          nextSteps: [
            'Refresh the page',
            'Check your internet connection',
            'Contact support if the issue persists'
          ]
        };
    }
  };

  const handleResubmit = async () => {
    try {
      setIsResubmitting(true);
      
      const updatedHospitalData = {
        name: resubmitData.name,
        description: resubmitData.description,
        type: resubmitData.type,
        address: {
          street: resubmitData.street,
          city: resubmitData.city,
          state: resubmitData.state,
          zipCode: resubmitData.zipCode,
          country: resubmitData.country
        },
        contact: {
          phone: resubmitData.phone,
          email: resubmitData.email,
          emergency: resubmitData.emergency
        },
        services: resubmitData.services.split(',').map(s => s.trim()).filter(s => s)
      };

      const response = await hospitalAPI.resubmitHospital(updatedHospitalData);
      
      if (response.data.success) {
        onUpdate(response.data.data);
        setShowResubmitDialog(false);
      }
    } catch (error) {
      console.error('Error resubmitting hospital:', error);
    } finally {
      setIsResubmitting(false);
    }
  };

  const statusMessage = getStatusMessage(hospital.approvalStatus || 'pending');

  if (isDismissed) {
    return null;
  }

  return (
    <Card className={`border-2 ${getStatusColor(hospital.approvalStatus || 'pending')}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(hospital.approvalStatus || 'pending')}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{statusMessage.title}</CardTitle>
                {isPolling && (
                  <div className="flex items-center gap-1 text-xs text-blue-600">
                    <Bell className="w-3 h-3 animate-pulse" />
                    <span>Live updates</span>
                  </div>
                )}
              </div>
              <CardDescription className="mt-1">
                {statusMessage.description}
              </CardDescription>
              {statusMessage.details && (
                <p className="text-xs text-gray-500 mt-1">{statusMessage.details}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={getStatusColor(hospital.approvalStatus || 'pending')}>
              {(hospital.approvalStatus || 'pending').charAt(0).toUpperCase() + 
               (hospital.approvalStatus || 'pending').slice(1)}
            </Badge>
            <div className="text-xs text-gray-500">
              Updated: {lastUpdated.toLocaleTimeString()}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              aria-label="Dismiss approval banner"
              onClick={handleDismiss}
              className="h-7 px-2 text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Application Progress</span>
            <span>{getApprovalProgress()}%</span>
          </div>
          <Progress value={getApprovalProgress()} className="h-2" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Hospital Information */}
        <div className="grid md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">{hospital.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {hospital.address.city}, {hospital.address.state}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Submitted: {hospital.submittedAt ? new Date(hospital.submittedAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {getTimeSinceSubmission()}
              </span>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        {statusMessage.nextSteps && statusMessage.nextSteps.length > 0 && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Next Steps
            </h4>
            <ul className="space-y-1">
              {statusMessage.nextSteps.map((step, index) => (
                <li key={index} className="text-sm text-blue-800 flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Approval Details */}
        {hospital.approvalStatus === 'approved' && hospital.approvedAt && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-green-900 mb-1">Hospital Approved!</h4>
                <p className="text-sm text-green-800 mb-2">
                  Your hospital was approved on {new Date(hospital.approvedAt).toLocaleDateString()} 
                  at {new Date(hospital.approvedAt).toLocaleTimeString()}
                  {hospital.approvedBy && ` by administrator`}.
                </p>
                <div className="grid md:grid-cols-2 gap-4 text-xs text-green-700">
                  <div className="flex items-center gap-2">
                    <Eye className="w-3 h-3" />
                    <span>Now visible to users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3 h-3" />
                    <span>Can manage resources</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Details */}
        {hospital.approvalStatus === 'rejected' && (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-900 mb-1">Application Rejected</h4>
                  <p className="text-sm text-red-800 mb-3">
                    Your hospital registration was rejected on {hospital.approvedAt ? new Date(hospital.approvedAt).toLocaleDateString() : 'N/A'}.
                    Please review the feedback below and resubmit with corrections.
                  </p>
                  <div className="p-3 bg-red-100 rounded border border-red-300">
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-red-600 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-red-900 mb-1">Rejection Reason:</div>
                        <div className="text-sm text-red-800">
                          {hospital.rejectionReason || 'No specific reason provided.'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <Dialog open={showResubmitDialog} onOpenChange={setShowResubmitDialog}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resubmit Hospital Information
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Resubmit Hospital Information</DialogTitle>
                  <DialogDescription>
                    Update your hospital information and resubmit for approval. Please address the rejection reason mentioned above.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Basic Information */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Hospital Name *</Label>
                      <Input
                        id="name"
                        value={resubmitData.name}
                        onChange={(e) => setResubmitData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter hospital name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Hospital Type</Label>
                      <Select value={resubmitData.type} onValueChange={(value) => setResubmitData(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select hospital type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Hospital</SelectItem>
                          <SelectItem value="specialty">Specialty Hospital</SelectItem>
                          <SelectItem value="emergency">Emergency Hospital</SelectItem>
                          <SelectItem value="teaching">Teaching Hospital</SelectItem>
                          <SelectItem value="private">Private Hospital</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={resubmitData.description}
                      onChange={(e) => setResubmitData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of your hospital"
                      rows={3}
                    />
                  </div>

                  {/* Address Information */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Address Information</h4>
                    <div>
                      <Label htmlFor="street">Street Address *</Label>
                      <Input
                        id="street"
                        value={resubmitData.street}
                        onChange={(e) => setResubmitData(prev => ({ ...prev, street: e.target.value }))}
                        placeholder="Enter street address"
                      />
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={resubmitData.city}
                          onChange={(e) => setResubmitData(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="Enter city"
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State *</Label>
                        <Input
                          id="state"
                          value={resubmitData.state}
                          onChange={(e) => setResubmitData(prev => ({ ...prev, state: e.target.value }))}
                          placeholder="Enter state"
                        />
                      </div>
                      <div>
                        <Label htmlFor="zipCode">ZIP Code *</Label>
                        <Input
                          id="zipCode"
                          value={resubmitData.zipCode}
                          onChange={(e) => setResubmitData(prev => ({ ...prev, zipCode: e.target.value }))}
                          placeholder="Enter ZIP code"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Contact Information</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          value={resubmitData.phone}
                          onChange={(e) => setResubmitData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={resubmitData.email}
                          onChange={(e) => setResubmitData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Enter email address"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="emergency">Emergency Contact *</Label>
                      <Input
                        id="emergency"
                        value={resubmitData.emergency}
                        onChange={(e) => setResubmitData(prev => ({ ...prev, emergency: e.target.value }))}
                        placeholder="Enter emergency contact number"
                      />
                    </div>
                  </div>

                  {/* Services */}
                  <div>
                    <Label htmlFor="services">Services Offered</Label>
                    <Textarea
                      id="services"
                      value={resubmitData.services}
                      onChange={(e) => setResubmitData(prev => ({ ...prev, services: e.target.value }))}
                      placeholder="Enter services separated by commas (e.g., Emergency Care, Surgery, ICU)"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={handleResubmit} 
                      disabled={isResubmitting}
                      className="flex-1"
                    >
                      {isResubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Resubmitting...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Resubmit for Approval
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowResubmitDialog(false)}
                      disabled={isResubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Pending Status Actions */}
        {hospital.approvalStatus === 'pending' && (
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-900 mb-1">Under Review</h4>
                <p className="text-sm text-yellow-800 mb-3">
                  Your hospital registration is being reviewed by our administrators. 
                  You will be notified once the review is complete.
                </p>
                <div className="grid md:grid-cols-2 gap-4 text-xs text-yellow-700">
                  <div className="flex items-center gap-2">
                    <Timer className="w-3 h-3" />
                    <span>Typical review: 1-2 business days</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bell className="w-3 h-3" />
                    <span>You'll receive email notification</span>
                  </div>
                </div>
                {isPolling && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-yellow-700">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full animate-pulse"></div>
                    <span>Checking for updates every 30 seconds...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Contact Information */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Contact Information
          </h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="w-3 h-3 text-gray-500" />
              <span>{hospital.contact.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3 h-3 text-gray-500" />
              <span>{hospital.contact.email}</span>
            </div>
          </div>
        </div>

        {/* Audit Trail */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Application History & Timeline
            </h4>
            <AuditTrailViewer entityType="hospital" entityId={hospital.id} />
          </div>
          <div className="text-xs text-gray-500">
            Track all changes and updates to your hospital application status.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}