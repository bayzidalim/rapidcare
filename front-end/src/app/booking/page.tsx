'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { hospitalAPI, bookingAPI } from '@/lib/api';
import { Hospital } from '@/lib/types';
import { getCurrentUser, getToken } from '@/lib/auth';
import {
  Building2,
  Bed,
  Heart,
  Scissors,
  User,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  CreditCard
} from 'lucide-react';
import Link from 'next/link';

interface SimpleBookingForm {
  hospitalId: string;
  resourceType: string;
  patientName: string;
  patientAge: string;
  patientGender: string;
  medicalCondition: string;
  urgency: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  scheduledDate: string;
  estimatedDuration: string;
}

export default function BookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState(getCurrentUser());

  // Form state
  const [formData, setFormData] = useState<SimpleBookingForm>({
    hospitalId: '',
    resourceType: '',
    patientName: '',
    patientAge: '',
    patientGender: '',
    medicalCondition: '',
    urgency: 'medium',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    scheduledDate: '',
    estimatedDuration: '24'
  });
  const [rapidAssistance, setRapidAssistance] = useState(false);

  // Load hospitals on component mount
  useEffect(() => {
    loadHospitals();
    
    // Check authentication
    const user = getCurrentUser();
    const token = getToken();
    
    if (!user || !token) {
      setError('Please log in to create a booking');
      return;
    }
    
    setCurrentUser(user);

    const hospitalIdFromUrl = searchParams.get('hospitalId');
    if (hospitalIdFromUrl) {
      handleInputChange('hospitalId', hospitalIdFromUrl);
    }

  }, []);

  useEffect(() => {
    const hospitalIdFromUrl = searchParams.get('hospitalId');
    if (hospitalIdFromUrl && hospitals.length > 0) {
      handleInputChange('hospitalId', hospitalIdFromUrl);
    }
  }, [hospitals, searchParams]);

  const loadHospitals = async () => {
    try {
      const response = await hospitalAPI.getAll();
      if (response.data.success) {
        setHospitals(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load hospitals:', error);
      setError('Failed to load hospitals. Please refresh the page.');
    }
  };

  const calculateAmount = (resourceType: string, duration: number, includeRapidAssistance: boolean) => {
    // Base rates in Taka (৳)
    const baseRates = {
      beds: 120,        // ৳120 per day
      icu: 600,        // ৳600 per day  
      operationTheatres: 1200, // ৳1200 per day
    };

    const baseRate = baseRates[resourceType as keyof typeof baseRates] || 120;
    const amount = baseRate * (duration / 24); // Daily rate
    
    // Add 30% service charge
    let totalAmount = amount * 1.3;

    if (includeRapidAssistance) {
      totalAmount += 200;
    }

    return Math.round(totalAmount);
  };

  const handleInputChange = (field: keyof SimpleBookingForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }) as SimpleBookingForm);
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!formData.hospitalId) errors.push('Please select a hospital');
    if (!formData.resourceType) errors.push('Please select a resource type');
    if (!formData.patientName.trim()) errors.push('Patient name is required');
    if (!formData.patientAge || parseInt(formData.patientAge) < 1) errors.push('Valid patient age is required');
    if (!formData.patientGender) errors.push('Please select patient gender');
    if (!formData.medicalCondition.trim()) errors.push('Medical condition is required');
    if (!formData.urgency) errors.push('Please select urgency level');
    if (!formData.emergencyContactName.trim()) errors.push('Emergency contact name is required');
    if (!formData.emergencyContactPhone.trim()) errors.push('Emergency contact phone is required');
    if (!formData.emergencyContactRelationship.trim()) errors.push('Emergency contact relationship is required');
    if (!formData.scheduledDate) errors.push('Scheduled date is required');
    if (!formData.estimatedDuration || parseInt(formData.estimatedDuration) < 1) errors.push('Valid duration is required');
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 Form submission started');
    
    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    // Check if user is logged in
    if (!currentUser) {
      // Store form data in localStorage
      localStorage.setItem('pendingBookingFormData', JSON.stringify(formData));
      // Redirect to login page
      router.push('/login?redirect=/booking');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Calculate payment amount
      const amount = calculateAmount(formData.resourceType, parseInt(formData.estimatedDuration), rapidAssistance);
      
      // Prepare booking data (remove userId as backend gets it from auth token)
      const patientAge = parseInt(formData.patientAge);
      const bookingData = {
        hospitalId: parseInt(formData.hospitalId),
        resourceType: formData.resourceType,
        patientName: formData.patientName,
        patientAge: patientAge,
        patientGender: formData.patientGender,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        emergencyContactRelationship: formData.emergencyContactRelationship,
        medicalCondition: formData.medicalCondition,
        urgency: formData.urgency,
        scheduledDate: formData.scheduledDate,
        estimatedDuration: parseInt(formData.estimatedDuration),
        rapidAssistance: rapidAssistance && patientAge >= 60 ? rapidAssistance : false
      };

      console.log('📤 Sending booking data:', bookingData);
      console.log('🔑 Current user:', currentUser);
      console.log('🎫 Auth token:', getToken() ? 'Present' : 'Missing');
      
      // Validate data before sending
      const invalidFields = [];
      if (isNaN(bookingData.hospitalId) || bookingData.hospitalId <= 0) {
        invalidFields.push('hospitalId');
      }
      if (isNaN(bookingData.patientAge) || bookingData.patientAge <= 0) {
        invalidFields.push('patientAge');
      }
      if (isNaN(bookingData.estimatedDuration) || bookingData.estimatedDuration <= 0) {
        invalidFields.push('estimatedDuration');
      }
      
      // Validate rapid assistance selection
      if (bookingData.rapidAssistance && bookingData.patientAge < 60) {
        throw new Error('Rapid Assistance is only available for patients aged 60 and above');
      }
      
      if (invalidFields.length > 0) {
        throw new Error(`Invalid data in fields: ${invalidFields.join(', ')}`);
      }

      // Create booking
      const response = await bookingAPI.create(bookingData);
      
      console.log('📥 Booking response:', response.data);

      if (response.data.success) {
        const booking = response.data.data;
        
        // Store booking data for payment page
        const paymentData = {
          id: booking.id,
          patientName: booking.patientName,
          hospitalName: selectedHospital?.name || 'Unknown Hospital',
          resourceType: booking.resourceType,
          estimatedDuration: booking.estimatedDuration,
          scheduledDate: booking.scheduledDate,
          urgency: booking.urgency,
          paymentAmount: amount,
          patientAge: booking.patientAge, // Add patientAge field
          rapidAssistance: rapidAssistance
        };
        
        localStorage.setItem('pendingBookingData', JSON.stringify(paymentData));
        
        console.log('✅ Booking created successfully, redirecting to payment...');
        
        // Redirect to payment page using Next.js router instead of window.location
        router.push(`/booking/payment?bookingId=${booking.id}`);
        
      } else {
        throw new Error(response.data.error || 'Booking creation failed');
      }
      
    } catch (error: any) {
      console.error('❌ Booking creation error:', error);
      
      // Handle different types of errors
      let errorMessage = 'Failed to create booking. Please try again.';
      
      if (error.response?.status === 401) {
        errorMessage = 'Please log in to create a booking';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.error || 'Invalid booking data. Please check all fields.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'beds': return <Bed className="w-4 h-4" />;
      case 'icu': return <Heart className="w-4 h-4" />;
      case 'operationTheatres': return <Scissors className="w-4 h-4" />;
      default: return <Bed className="w-4 h-4" />;
    }
  };

  const getResourceAvailability = (hospital: Hospital, type: string) => {
    if (!hospital.resources) return 0;
    switch (type) {
      case 'beds': return hospital.resources.beds?.available || 0;
      case 'icu': return hospital.resources.icu?.available || 0;
      case 'operationTheatres': return hospital.resources.operationTheatres?.available || 0;
      default: return 0;
    }
  };

  // Success page
  

  // Show login message if not authenticated
  

  return (
    
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link href="/hospitals" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Hospitals
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Book Emergency Medical Resources
            </h1>
            <p className="text-gray-600">
              Secure critical medical resources quickly when every second counts.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
                {error.includes('log in') && (
                  <div className="mt-2">
                    <Link href="/login">
                      <Button size="sm" className="bg-red-600 hover:bg-red-700">
                        Go to Login
                      </Button>
                    </Link>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Hospital & Resource Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  Select Medical Facility
                </CardTitle>
                <CardDescription>
                  Choose your preferred hospital and the specific medical resource you need.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hospitalId">Hospital</Label>
                    {searchParams.get('hospitalId') && selectedHospital ? (
                      <div className="p-2 border rounded-md bg-gray-100 font-medium">
                        {selectedHospital.name}
                      </div>
                    ) : (
                      <Select 
                        value={formData.hospitalId} 
                        onValueChange={(value) => handleInputChange('hospitalId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a hospital" />
                        </SelectTrigger>
                        <SelectContent>
                          {hospitals.map((hospital) => (
                            <SelectItem key={hospital.id} value={hospital.id.toString()}>
                              <div className="flex items-center justify-between w-full">
                                <span>{hospital.name}</span>
                                <span className="text-sm text-gray-500 ml-2">
                                  {hospital.address?.city}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="resourceType">Resource Type</Label>
                    <Select 
                      value={formData.resourceType} 
                      onValueChange={(value) => handleInputChange('resourceType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select resource type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beds">
                          <div className="flex items-center gap-2">
                            <Bed className="w-4 h-4" />
                            <span>Hospital Bed</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="icu">
                          <div className="flex items-center gap-2">
                            <Heart className="w-4 h-4" />
                            <span>ICU</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="operationTheatres">
                          <div className="flex items-center gap-2">
                            <Scissors className="w-4 h-4" />
                            <span>Operation Theatre</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Availability Display */}
                {selectedHospital && formData.resourceType && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Real-Time Availability</h4>
                    <div className="flex items-center gap-2">
                      {getResourceIcon(formData.resourceType)}
                      <span>
                        {getResourceAvailability(selectedHospital, formData.resourceType)} resources available now
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Patient Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Patient Details
                </CardTitle>
                <CardDescription>
                  Basic patient information for the booking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="patientName">Patient Name</Label>
                    <Input
                      id="patientName"
                      value={formData.patientName}
                      onChange={(e) => handleInputChange('patientName', e.target.value)}
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="patientAge">Age</Label>
                    <Input
                      id="patientAge"
                      type="number"
                      value={formData.patientAge}
                      onChange={(e) => handleInputChange('patientAge', e.target.value)}
                      placeholder="Age"
                      min="1"
                      max="120"
                    />
                  </div>
                  <div>
                    <Label htmlFor="patientGender">Gender</Label>
                    <Select 
                      value={formData.patientGender} 
                      onValueChange={(value) => handleInputChange('patientGender', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="medicalCondition">Medical Condition</Label>
                    <Input
                      id="medicalCondition"
                      value={formData.medicalCondition}
                      onChange={(e) => handleInputChange('medicalCondition', e.target.value)}
                      placeholder="Brief description"
                    />
                  </div>
                  <div>
                    <Label htmlFor="urgency">Urgency Level</Label>
                    <Select 
                      value={formData.urgency} 
                      onValueChange={(value) => handleInputChange('urgency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select urgency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact & Scheduling */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Contact & Scheduling
                </CardTitle>
                <CardDescription>
                  Emergency contact information and booking schedule
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                    <Input
                      id="emergencyContactName"
                      value={formData.emergencyContactName}
                      onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                      placeholder="Contact name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyContactPhone">Phone Number</Label>
                    <Input
                      id="emergencyContactPhone"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyContactRelationship">Relationship</Label>
                    <Input
                      id="emergencyContactRelationship"
                      value={formData.emergencyContactRelationship}
                      onChange={(e) => handleInputChange('emergencyContactRelationship', e.target.value)}
                      placeholder="e.g., spouse, parent"
                    />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="scheduledDate">Scheduled Date & Time</Label>
                    <Input
                      id="scheduledDate"
                      type="datetime-local"
                      value={formData.scheduledDate}
                      onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="estimatedDuration">Duration (hours)</Label>
                    <Input
                      id="estimatedDuration"
                      type="number"
                      value={formData.estimatedDuration}
                      onChange={(e) => handleInputChange('estimatedDuration', e.target.value)}
                      placeholder="24"
                      min="1"
                      max="168"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Add-ons */}
            {formData.patientAge && parseInt(formData.patientAge) >= 60 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Add-ons
                  </CardTitle>
                  <CardDescription>
                    Optional services to enhance your experience.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="flex items-center">
                        <h4 className="font-semibold">Rapid Assistance</h4>
                        <Badge variant="secondary" className="ml-2">Senior Citizen Only</Badge>
                      </div>
                      <p className="text-sm text-gray-600">An assistant will escort the patient from the hospital gate to their bed or ICU.</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="rapid-assistance">Add for 200৳</Label>
                      <Switch
                        id="rapid-assistance"
                        checked={rapidAssistance}
                        onCheckedChange={setRapidAssistance}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Summary */}
            {formData.resourceType && formData.estimatedDuration && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Payment Summary
                  </CardTitle>
                  <CardDescription>
                    Transparent pricing breakdown for your booking
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Base Rate ({formData.resourceType})</span>
                      <span>৳{Math.round(calculateAmount(formData.resourceType, parseInt(formData.estimatedDuration) || 24, false) / 1.3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service Charge (30%)</span>
                      <span>৳{Math.round(calculateAmount(formData.resourceType, parseInt(formData.estimatedDuration) || 24, false) * 0.3)}</span>
                    </div>
                    {rapidAssistance && (
                      <div className="flex justify-between">
                        <span>Rapid Assistance</span>
                        <span>৳200</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between font-bold text-lg">
                      <span>Total Amount</span>
                      <span className="text-green-600">৳{calculateAmount(formData.resourceType, parseInt(formData.estimatedDuration) || 24, rapidAssistance)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 text-lg"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Secure My Booking
                  </div>
                )}
              </Button>
              <Link href="/hospitals">
                <Button variant="outline" type="button" className="px-8">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    
  );
}