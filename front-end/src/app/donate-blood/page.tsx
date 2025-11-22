'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { bloodAPI } from '@/lib/api';
import { BloodRequest, BloodRequestFormData } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';
import { 
  Droplets, 
  Heart, 
  User, 
  Phone, 
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users
} from 'lucide-react';

// Simplified blood request schema for quick form completion
const bloodRequestSchema = z.object({
  requesterId: z.number().min(1, 'Requester ID is required'),
  requesterName: z.string().min(1, 'Name is required'),
  requesterPhone: z.string().min(1, 'Phone number is required'),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  units: z.number().min(1, 'At least 1 unit is required'),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  hospital: z.object({
    name: z.string().min(1, 'Hospital name is required'),
    address: z.string().min(1, 'Hospital address is required'),
    contact: z.string().min(1, 'Hospital contact is required'),
  }),
  patientName: z.string().optional(),
  patientAge: z.number().optional(),
  medicalCondition: z.string().optional(),
  requiredBy: z.string().min(1, 'Required by date is required'),
  notes: z.string().optional(),
});

export default function BloodDonationPage() {
  const router = useRouter();
  const [bloodRequests, setBloodRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('request');
  const [selectedRequest, setSelectedRequest] = useState<BloodRequest | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BloodRequestFormData>({
    resolver: zodResolver(bloodRequestSchema),
    defaultValues: {
      requesterId: 1, // In a real app, this would come from auth
      urgency: 'medium',
      units: 1,
    },
  });

  useEffect(() => {
    fetchBloodRequests();

    const pendingData = localStorage.getItem('pendingBloodRequestFormData');
    if (pendingData) {
      const formData = JSON.parse(pendingData);
      Object.keys(formData).forEach((key) => {
        setValue(key as keyof BloodRequestFormData, formData[key]);
      });
      localStorage.removeItem('pendingBloodRequestFormData');
    }
  }, []);

  const fetchBloodRequests = async () => {
    try {
      const response = await bloodAPI.getAllRequests();
      setBloodRequests(response.data.data);
    } catch (error) {
      console.error('Error fetching blood requests:', error);
    }
  };

  const onSubmit = async (data: BloodRequestFormData) => {
    // Check if user is logged in
    const currentUser = getCurrentUser();
    if (!currentUser) {
      // Store form data in localStorage
      localStorage.setItem('pendingBloodRequestFormData', JSON.stringify(data));
      // Redirect to login page
      router.push('/login?redirect=/donate-blood');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await bloodAPI.createRequest(data as unknown as Record<string, unknown>);
      
      if (response.data.success) {
        setSuccess(true);
        fetchBloodRequests(); // Refresh the list
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to create blood request');
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'matched': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewDetails = (request: BloodRequest) => {
    setSelectedRequest(request);
    setIsDetailsDialogOpen(true);
  };

  const handleDonateBlood = (requestId: number) => {
    // Remove the card from the list
    setBloodRequests(bloodRequests.filter(request => request.id !== requestId));
  };

  if (success) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 py-16">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Blood Request Created!
                </h2>
                <p className="text-gray-600 mb-6">
                  Your blood request has been submitted successfully. Donors will be notified and matched automatically.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button onClick={() => { setSuccess(false); setActiveTab('requests'); }}>
                    View All Requests
                  </Button>
                  <Button variant="outline" onClick={() => { setSuccess(false); setActiveTab('request'); }}>
                    Create Another Request
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Blood Donation Network
          </h1>
          <p className="text-lg text-gray-600">
            Request blood donations or view existing requests to help save lives.
          </p>
        </div>

        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="request">Request Blood</TabsTrigger>
            <TabsTrigger value="requests">View Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="request">
            <Card>
              <CardHeader>
                <CardTitle>Request Blood Donation</CardTitle>
                <CardDescription>
                  Fill out the form below to request blood donation for emergency situations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Essential Information */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="requesterName">Your Name</Label>
                      <Input
                        id="requesterName"
                        {...register('requesterName')}
                        placeholder="Full name"
                      />
                      {errors.requesterName && (
                        <p className="text-red-600 text-sm mt-1">{errors.requesterName.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="requesterPhone">Phone</Label>
                      <Input
                        id="requesterPhone"
                        {...register('requesterPhone')}
                        placeholder="Phone number"
                      />
                      {errors.requesterPhone && (
                        <p className="text-red-600 text-sm mt-1">{errors.requesterPhone.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Blood Requirements */}
                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="bloodType">Blood Type</Label>
                      <Select onValueChange={(value) => setValue('bloodType', value as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B-">B-</SelectItem>
                          <SelectItem value="AB+">AB+</SelectItem>
                          <SelectItem value="AB-">AB-</SelectItem>
                          <SelectItem value="O+">O+</SelectItem>
                          <SelectItem value="O-">O-</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.bloodType && (
                        <p className="text-red-600 text-sm mt-1">{errors.bloodType.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="units">Units</Label>
                      <Input
                        id="units"
                        type="number"
                        {...register('units', { valueAsNumber: true })}
                        placeholder="1"
                        min="1"
                        defaultValue={1}
                      />
                      {errors.units && (
                        <p className="text-red-600 text-sm mt-1">{errors.units.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="urgency">Urgency</Label>
                      <Select onValueChange={(value) => setValue('urgency', value as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Urgency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.urgency && (
                        <p className="text-red-600 text-sm mt-1">{errors.urgency.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="requiredBy">Required By</Label>
                      <Input
                        id="requiredBy"
                        type="datetime-local"
                        {...register('requiredBy')}
                      />
                      {errors.requiredBy && (
                        <p className="text-red-600 text-sm mt-1">{errors.requiredBy.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Hospital Information */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="hospitalName">Hospital Name</Label>
                      <Input
                        id="hospitalName"
                        {...register('hospital.name')}
                        placeholder="Hospital name"
                      />
                      {errors.hospital?.name && (
                        <p className="text-red-600 text-sm mt-1">{errors.hospital.name.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="hospitalContact">Hospital Phone</Label>
                      <Input
                        id="hospitalContact"
                        {...register('hospital.contact')}
                        placeholder="Hospital phone"
                      />
                      {errors.hospital?.contact && (
                        <p className="text-red-600 text-sm mt-1">{errors.hospital.contact.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="hospitalAddress">Hospital Address</Label>
                      <Input
                        id="hospitalAddress"
                        {...register('hospital.address')}
                        placeholder="Hospital address"
                      />
                      {errors.hospital?.address && (
                        <p className="text-red-600 text-sm mt-1">{errors.hospital.address.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Optional Patient Information */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="patientName">Patient Name (Optional)</Label>
                      <Input
                        id="patientName"
                        {...register('patientName')}
                        placeholder="Patient name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="patientAge">Patient Age (Optional)</Label>
                      <Input
                        id="patientAge"
                        type="number"
                        {...register('patientAge', { valueAsNumber: true })}
                        placeholder="Age"
                      />
                    </div>
                    <div>
                      <Label htmlFor="medicalCondition">Medical Condition (Optional)</Label>
                      <Input
                        id="medicalCondition"
                        {...register('medicalCondition')}
                        placeholder="Brief condition"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? 'Creating Request...' : 'Submit Blood Request'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Blood Requests</h2>
                <Button onClick={() => setActiveTab('request')}>
                  Create New Request
                </Button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bloodRequests.map((request) => (
                  <Card key={request.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Droplets className="w-5 h-5 text-red-600" />
                          <span className="font-bold">{request.bloodType}</span>
                        </div>
                        <Badge className={getUrgencyColor(request.urgency)}>
                          {request.urgency}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {request.hospital?.name || 'Hospital not specified'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium">Units:</span>
                          <span className="ml-1">{request.units}</span>
                        </div>
                        <div>
                          <span className="font-medium">Status:</span>
                          <Badge className={`ml-1 ${getStatusColor(request.status)}`}>
                            {request.status}
                          </Badge>
                        </div>
                      </div>

                      {request.patientName && (
                        <div className="text-sm">
                          <span className="font-medium">Patient:</span>
                          <span className="ml-1">{request.patientName}</span>
                          {request.patientAge && (
                            <span className="ml-1">({request.patientAge} years)</span>
                          )}
                        </div>
                      )}

                      <div className="text-sm">
                        <span className="font-medium">Required by:</span>
                        <span className="ml-1">
                          {new Date(request.requiredBy).toLocaleDateString()}
                        </span>
                      </div>

                      {request.matchedDonors?.length > 0 && (
                        <div className="text-sm">
                          <span className="font-medium">Matched Donors:</span>
                          <span className="ml-1">{request.matchedDonors.length}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        <span>{request.requesterName}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{request.requesterPhone}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                      </div>

                      {request.notes && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Notes:</span>
                          <span className="ml-1">{request.notes}</span>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleViewDetails(request)}
                        >
                          View Details
                        </Button>
                        <Button 
                          className="flex-1"
                          onClick={() => handleDonateBlood(request.id)}
                        >
                          Donate Blood
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {bloodRequests.length === 0 && (
                <div className="text-center py-12">
                  <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No blood requests found</h3>
                  <p className="text-gray-600">Be the first to create a blood request.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-red-600" />
              Blood Request Details
            </DialogTitle>
            <DialogDescription>
              Complete information about this blood donation request
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6 mt-4">
              {/* Blood Type and Urgency */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-red-600">{selectedRequest.bloodType}</div>
                  <div>
                    <div className="font-semibold text-lg">{selectedRequest.units} Units Required</div>
                    <Badge className={getUrgencyColor(selectedRequest.urgency)}>
                      {selectedRequest.urgency.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <Badge className={getStatusColor(selectedRequest.status)}>
                  {selectedRequest.status}
                </Badge>
              </div>

              {/* Requester Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Requester Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Name</Label>
                    <div className="font-medium">{selectedRequest.requesterName}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Phone</Label>
                    <div className="font-medium flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {selectedRequest.requesterPhone}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hospital Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Hospital Information
                </h3>
                <div className="space-y-2">
                  <div>
                    <Label className="text-sm text-gray-600">Hospital Name</Label>
                    <div className="font-medium">{selectedRequest.hospital?.name || 'Not specified'}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Address</Label>
                    <div className="font-medium">{selectedRequest.hospital?.address || 'Not specified'}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Contact</Label>
                    <div className="font-medium flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {selectedRequest.hospital?.contact || 'Not specified'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient Information */}
              {(selectedRequest.patientName || selectedRequest.patientAge || selectedRequest.medicalCondition) && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Heart className="w-5 h-5" />
                    Patient Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedRequest.patientName && (
                      <div>
                        <Label className="text-sm text-gray-600">Patient Name</Label>
                        <div className="font-medium">{selectedRequest.patientName}</div>
                      </div>
                    )}
                    {selectedRequest.patientAge && (
                      <div>
                        <Label className="text-sm text-gray-600">Age</Label>
                        <div className="font-medium">{selectedRequest.patientAge} years</div>
                      </div>
                    )}
                    {selectedRequest.medicalCondition && (
                      <div className="md:col-span-2">
                        <Label className="text-sm text-gray-600">Medical Condition</Label>
                        <div className="font-medium">{selectedRequest.medicalCondition}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timeline Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Timeline
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Required By</Label>
                    <div className="font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(selectedRequest.requiredBy).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Request Created</Label>
                    <div className="font-medium flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {new Date(selectedRequest.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Matched Donors */}
              {selectedRequest.matchedDonors && selectedRequest.matchedDonors.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Matched Donors ({selectedRequest.matchedDonors.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedRequest.matchedDonors.map((donor, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{donor.donorName}</div>
                            <div className="text-sm text-gray-600 flex items-center gap-2">
                              <Phone className="w-3 h-3" />
                              {donor.donorPhone}
                            </div>
                          </div>
                          <Badge className={getStatusColor(donor.status)}>
                            {donor.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedRequest.notes && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Additional Notes</Label>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    {selectedRequest.notes}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  className="flex-1"
                  onClick={() => {
                    handleDonateBlood(selectedRequest.id);
                    setIsDetailsDialogOpen(false);
                  }}
                >
                  Donate Blood
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsDetailsDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 