'use client';

import { useState, useEffect } from 'react';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { bloodAPI } from '@/lib/api';
import { BloodRequest } from '@/lib/types';
import { isAuthenticated, getCurrentUser } from '@/lib/auth';
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
  Users,
  Mail,
  Info
} from 'lucide-react';

// Guest blood request schema - requires contact information
const guestBloodRequestSchema = z.object({
  requesterName: z.string().min(2, 'Name must be at least 2 characters'),
  requesterPhone: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^\+?[\d\s\-\(\)]{10,}$/, 'Please provide a valid phone number'),
  requesterEmail: z.string().email('Please provide a valid email address').optional().or(z.literal('')),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  units: z.number().min(1, 'At least 1 unit is required').max(10, 'Maximum 10 units allowed'),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  hospitalName: z.string().min(2, 'Hospital name is required'),
  hospitalAddress: z.string().min(5, 'Hospital address is required'),
  hospitalContact: z.string().min(10, 'Hospital contact is required'),
  patientName: z.string().min(2, 'Patient name is required'),
  patientAge: z.number().min(1, 'Patient age is required').max(120, 'Please enter a valid age'),
  medicalCondition: z.string().min(5, 'Please describe the medical condition'),
  requiredBy: z.string().min(1, 'Required by date is required'),
  notes: z.string().optional(),
});

// Authenticated user blood request schema - uses user info
const authenticatedBloodRequestSchema = z.object({
  requesterName: z.string().optional(),
  requesterPhone: z.string().optional(),
  requesterEmail: z.string().optional(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  units: z.number().min(1, 'At least 1 unit is required').max(10, 'Maximum 10 units allowed'),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  hospitalName: z.string().min(2, 'Hospital name is required'),
  hospitalAddress: z.string().min(5, 'Hospital address is required'),
  hospitalContact: z.string().min(10, 'Hospital contact is required'),
  patientName: z.string().optional(),
  patientAge: z.number().optional(),
  medicalCondition: z.string().optional(),
  requiredBy: z.string().min(1, 'Required by date is required'),
  notes: z.string().optional(),
});

// Form data interface for both guest and authenticated users
interface BloodRequestFormData {
  requesterName?: string;
  requesterPhone?: string;
  requesterEmail?: string;
  bloodType: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  units: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  hospitalName: string;
  hospitalAddress: string;
  hospitalContact: string;
  patientName?: string;
  patientAge?: number;
  medicalCondition?: string;
  requiredBy: string;
  notes?: string;
}

export default function BloodDonationPage() {
  const [bloodRequests, setBloodRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('request');
  const [isGuest, setIsGuest] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Check authentication status
  useEffect(() => {
    const authenticated = isAuthenticated();
    const user = getCurrentUser();
    setIsGuest(!authenticated);
    setCurrentUser(user);
  }, []);

  // Choose schema based on authentication status
  const schema = isGuest ? guestBloodRequestSchema : authenticatedBloodRequestSchema;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BloodRequestFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      urgency: 'medium',
      units: 1,
      // Pre-fill user data if authenticated
      requesterName: currentUser?.name || '',
      requesterPhone: currentUser?.phone || '',
      requesterEmail: currentUser?.email || '',
    },
  });

  useEffect(() => {
    fetchBloodRequests();
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
    try {
      setLoading(true);
      setError('');

      // Prepare request data based on user type
      const requestData = {
        // For authenticated users, use their ID; for guests, this will be null on backend
        requesterId: currentUser?.id || null,
        requesterName: data.requesterName || currentUser?.name,
        requesterPhone: data.requesterPhone || currentUser?.phone,
        requesterEmail: data.requesterEmail || currentUser?.email,
        bloodType: data.bloodType,
        units: data.units,
        urgency: data.urgency,
        hospitalName: data.hospitalName,
        hospitalAddress: data.hospitalAddress,
        hospitalContact: data.hospitalContact,
        patientName: data.patientName,
        patientAge: data.patientAge,
        medicalCondition: data.medicalCondition,
        requiredBy: data.requiredBy,
        notes: data.notes,
      };

      const response = await bloodAPI.createRequest(requestData);
      
      if (response.data.success) {
        setSuccess(true);
        reset(); // Clear the form
        fetchBloodRequests(); // Refresh the list
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create blood request';
      setError(errorMessage);
      
      // Log error for debugging
      console.error('Blood request submission error:', error);
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
                {isGuest ? (
                  <div className="space-y-4">
                    <p className="text-gray-600 mb-4">
                      Thank you for your blood donation request. We have received your information and will contact you soon with next steps.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                      <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        What happens next?
                      </h3>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• We will verify your request and contact information within 30 minutes</li>
                        <li>• Potential donors in your area will be notified about your request</li>
                        <li>• You will be contacted when donors are matched (usually within 2-4 hours)</li>
                        <li>• Coordination will be done through the hospital you specified</li>
                        <li>• You'll receive SMS updates on the status of your request</li>
                      </ul>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
                      <h3 className="font-semibold text-amber-900 mb-2">Important Notes:</h3>
                      <ul className="text-sm text-amber-800 space-y-1">
                        <li>• Keep your phone available for coordination calls</li>
                        <li>• Contact the hospital directly for urgent/critical needs</li>
                        <li>• Consider creating an account for easier future requests and tracking</li>
                        <li>• Your request will remain active for 48 hours unless fulfilled</li>
                      </ul>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
                      <h3 className="font-semibold text-green-900 mb-2">Emergency Contact:</h3>
                      <p className="text-sm text-green-800">
                        For critical/life-threatening situations, please call the hospital directly or emergency services (999) 
                        while we work to find donors for you.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600 mb-6">
                    Your blood request has been submitted successfully. Donors will be notified and matched automatically.
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                  <Button onClick={() => { setSuccess(false); setActiveTab('requests'); }}>
                    View All Requests
                  </Button>
                  <Button variant="outline" onClick={() => { setSuccess(false); setActiveTab('request'); }}>
                    Create Another Request
                  </Button>
                  {isGuest && (
                    <Button 
                      variant="secondary" 
                      onClick={() => window.location.href = '/register?returnTo=/donate-blood'}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Create Account for Tracking
                    </Button>
                  )}
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
          {isGuest && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-blue-800 mb-2">
                    You're browsing as a guest. You can request blood donations without creating an account, 
                    but we'll need your contact information to coordinate with donors.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => window.location.href = '/login?returnTo=/donate-blood'}
                      className="text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      Login
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => window.location.href = '/register?returnTo=/donate-blood'}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Create Account
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
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
                  {isGuest 
                    ? "Fill out the form below to request blood donation. We'll need your contact information to coordinate with donors."
                    : "Fill out the form below to request blood donation for emergency situations."
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Contact Information - Required for guests, optional for authenticated users */}
                  {isGuest && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Your Contact Information
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="requesterName">Your Name *</Label>
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
                          <Label htmlFor="requesterPhone">Phone Number *</Label>
                          <Input
                            id="requesterPhone"
                            {...register('requesterPhone')}
                            placeholder="+880 1234 567890"
                          />
                          {errors.requesterPhone && (
                            <p className="text-red-600 text-sm mt-1">{errors.requesterPhone.message}</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-4">
                        <Label htmlFor="requesterEmail">Email Address (Optional)</Label>
                        <Input
                          id="requesterEmail"
                          type="email"
                          {...register('requesterEmail')}
                          placeholder="your.email@example.com"
                        />
                        {errors.requesterEmail && (
                          <p className="text-red-600 text-sm mt-1">{errors.requesterEmail.message}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Show contact info for authenticated users but make it optional */}
                  {!isGuest && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="requesterName">Your Name (Optional)</Label>
                        <Input
                          id="requesterName"
                          {...register('requesterName')}
                          placeholder={currentUser?.name || "Full name"}
                          defaultValue={currentUser?.name || ''}
                        />
                        {errors.requesterName && (
                          <p className="text-red-600 text-sm mt-1">{errors.requesterName.message}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="requesterPhone">Phone (Optional)</Label>
                        <Input
                          id="requesterPhone"
                          {...register('requesterPhone')}
                          placeholder={currentUser?.phone || "Phone number"}
                          defaultValue={currentUser?.phone || ''}
                        />
                        {errors.requesterPhone && (
                          <p className="text-red-600 text-sm mt-1">{errors.requesterPhone.message}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Blood Requirements */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                      <Droplets className="w-4 h-4" />
                      Blood Requirements
                    </h3>
                    <div className="grid md:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="bloodType">Blood Type *</Label>
                        <Select onValueChange={(value) => setValue('bloodType', value as any)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select blood type" />
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
                        <Label htmlFor="units">Units *</Label>
                        <Input
                          id="units"
                          type="number"
                          {...register('units', { valueAsNumber: true })}
                          placeholder="1"
                          min="1"
                          max="10"
                          defaultValue={1}
                        />
                        {errors.units && (
                          <p className="text-red-600 text-sm mt-1">{errors.units.message}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="urgency">Urgency *</Label>
                        <Select onValueChange={(value) => setValue('urgency', value as any)} defaultValue="medium">
                          <SelectTrigger>
                            <SelectValue placeholder="Select urgency level" />
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
                        <Label htmlFor="requiredBy">Required By *</Label>
                        <Input
                          id="requiredBy"
                          type="datetime-local"
                          {...register('requiredBy')}
                          min={new Date().toISOString().slice(0, 16)}
                        />
                        {errors.requiredBy && (
                          <p className="text-red-600 text-sm mt-1">{errors.requiredBy.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hospital Information */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Hospital Information
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="hospitalName">Hospital Name *</Label>
                        <Input
                          id="hospitalName"
                          {...register('hospitalName')}
                          placeholder="Hospital name"
                        />
                        {errors.hospitalName && (
                          <p className="text-red-600 text-sm mt-1">{errors.hospitalName.message}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="hospitalContact">Hospital Phone *</Label>
                        <Input
                          id="hospitalContact"
                          {...register('hospitalContact')}
                          placeholder="Hospital phone"
                        />
                        {errors.hospitalContact && (
                          <p className="text-red-600 text-sm mt-1">{errors.hospitalContact.message}</p>
                        )}
                      </div>
                      <div className="md:col-span-1">
                        <Label htmlFor="hospitalAddress">Hospital Address *</Label>
                        <Input
                          id="hospitalAddress"
                          {...register('hospitalAddress')}
                          placeholder="Hospital address"
                        />
                        {errors.hospitalAddress && (
                          <p className="text-red-600 text-sm mt-1">{errors.hospitalAddress.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Patient Information */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      Patient Information {isGuest && <span className="text-red-600">*</span>}
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="patientName">
                          Patient Name {isGuest && <span className="text-red-600">*</span>}
                        </Label>
                        <Input
                          id="patientName"
                          {...register('patientName')}
                          placeholder="Patient name"
                        />
                        {errors.patientName && (
                          <p className="text-red-600 text-sm mt-1">{errors.patientName.message}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="patientAge">
                          Patient Age {isGuest && <span className="text-red-600">*</span>}
                        </Label>
                        <Input
                          id="patientAge"
                          type="number"
                          {...register('patientAge', { valueAsNumber: true })}
                          placeholder="Age"
                          min="1"
                          max="120"
                        />
                        {errors.patientAge && (
                          <p className="text-red-600 text-sm mt-1">{errors.patientAge.message}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="medicalCondition">
                          Medical Condition {isGuest && <span className="text-red-600">*</span>}
                        </Label>
                        <Input
                          id="medicalCondition"
                          {...register('medicalCondition')}
                          placeholder="Brief condition description"
                        />
                        {errors.medicalCondition && (
                          <p className="text-red-600 text-sm mt-1">{errors.medicalCondition.message}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      {...register('notes')}
                      placeholder="Any additional information that might help donors or coordinators..."
                      rows={3}
                    />
                    {errors.notes && (
                      <p className="text-red-600 text-sm mt-1">{errors.notes.message}</p>
                    )}
                  </div>

                  {/* Guest Information Notice */}
                  {isGuest && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="font-semibold text-amber-900 mb-2">Important Information for Guest Users:</h4>
                      <ul className="text-sm text-amber-800 space-y-1">
                        <li>• Your contact information will be used to coordinate with donors</li>
                        <li>• We will verify your request before notifying potential donors (within 30 minutes)</li>
                        <li>• Keep your phone available for coordination calls and SMS updates</li>
                        <li>• For urgent/critical needs, contact the hospital directly while we find donors</li>
                        <li>• Creating an account allows you to track requests and get faster processing</li>
                        <li>• Your information is kept secure and only shared with matched donors</li>
                      </ul>
                    </div>
                  )}

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
                        {(request as any).hospitalName || request.hospital?.name || 'Hospital not specified'}
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

                      {(request as any).medicalCondition && (
                        <div className="text-sm">
                          <span className="font-medium">Condition:</span>
                          <span className="ml-1">{(request as any).medicalCondition}</span>
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

                      {/* Show contact info only for authenticated users or if it's their own request */}
                      {!isGuest && (
                        <>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="w-4 h-4" />
                            <span>{request.requesterName}</span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span>{request.requesterPhone}</span>
                          </div>
                        </>
                      )}

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
                        <Button variant="outline" className="flex-1">
                          View Details
                        </Button>
                        {isGuest ? (
                          <Button className="flex-1" onClick={() => window.location.href = '/login'}>
                            Login to Donate
                          </Button>
                        ) : (
                          <Button className="flex-1">
                            Donate Blood
                          </Button>
                        )}
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
    </div>
  );
} 