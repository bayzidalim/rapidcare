'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { hospitalAPI, bookingAPI } from '@/lib/api';
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
  ArrowRight,
  Phone,
  Users,
  FileText,
  MapPin,
  Star,
  Activity
} from 'lucide-react';
import Link from 'next/link';

interface Hospital {
  id: number;
  name: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  emergency?: string;
  rating: number;
  resources?: {
    beds?: { total: number; available: number; occupied: number };
    icu?: { total: number; available: number; occupied: number };
    operationTheatres?: { total: number; available: number; occupied: number };
  };
}

interface BookingFormData {
  // Step 1: Hospital & Resource Selection
  hospitalId: string;
  resourceType: string;

  // Step 2: Patient Information
  patientName: string;
  patientAge: string;
  patientGender: string;
  medicalCondition: string;
  urgency: string;

  // Step 3: Emergency Contact
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;

  // Step 4: Scheduling
  scheduledDate: string;
  estimatedDuration: string;
  notes: string;
}

function BookingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [currentStep, setCurrentStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState<BookingFormData>({
    hospitalId: searchParams.get('hospitalId') || '',
    resourceType: searchParams.get('resourceType') || '',
    patientName: '',
    patientAge: '',
    patientGender: '',
    medicalCondition: '',
    urgency: 'medium',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    scheduledDate: '',
    estimatedDuration: '24',
    notes: ''
  });

  const totalSteps = 4;
  const stepTitles = [
    'Select Hospital & Resource',
    'Patient Information',
    'Emergency Contact',
    'Schedule & Review'
  ];

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
  }, []);

  // Update selected hospital when hospitalId changes
  useEffect(() => {
    if (formData.hospitalId) {
      const hospital = hospitals.find(h => h.id.toString() === formData.hospitalId);
      setSelectedHospital(hospital || null);
    }
  }, [formData.hospitalId, hospitals]);

  const loadHospitals = async () => {
    try {
      setLoading(true);
      const response = await hospitalAPI.getHospitalsWithResources();
      if (response.data.success) {
        setHospitals(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load hospitals:', error);
      setError('Failed to load hospitals. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof BookingFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Clear general error when user starts typing
    if (error) {
      setError('');
    }
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.hospitalId) errors.hospitalId = 'Please select a hospital';
        if (!formData.resourceType) errors.resourceType = 'Please select a resource type';
        break;
      case 2:
        if (!formData.patientName.trim()) errors.patientName = 'Patient name is required';
        if (!formData.patientAge || parseInt(formData.patientAge) < 1 || parseInt(formData.patientAge) > 150) {
          errors.patientAge = 'Valid patient age (1-150) is required';
        }
        if (!formData.patientGender) errors.patientGender = 'Please select patient gender';
        if (!formData.medicalCondition.trim()) errors.medicalCondition = 'Medical condition is required';
        if (!formData.urgency) errors.urgency = 'Please select urgency level';
        break;
      case 3:
        if (!formData.emergencyContactName.trim()) errors.emergencyContactName = 'Emergency contact name is required';
        if (!formData.emergencyContactPhone.trim()) errors.emergencyContactPhone = 'Emergency contact phone is required';
        if (!formData.emergencyContactRelationship.trim()) errors.emergencyContactRelationship = 'Emergency contact relationship is required';
        // Basic phone validation
        if (formData.emergencyContactPhone && !/^[\d\s\-\+\(\)]+$/.test(formData.emergencyContactPhone)) {
          errors.emergencyContactPhone = 'Invalid phone number format';
        }
        break;
      case 4:
        if (!formData.scheduledDate) errors.scheduledDate = 'Scheduled date is required';
        if (!formData.estimatedDuration || parseInt(formData.estimatedDuration) < 1) {
          errors.estimatedDuration = 'Valid duration is required';
        }
        // Validate scheduled date is in the future
        if (formData.scheduledDate) {
          const scheduledDate = new Date(formData.scheduledDate);
          const now = new Date();
          if (scheduledDate <= now) {
            errors.scheduledDate = 'Scheduled date must be in the future';
          }
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all steps
    let allValid = true;
    for (let step = 1; step <= totalSteps; step++) {
      if (!validateStep(step)) {
        allValid = false;
      }
    }

    if (!allValid) {
      setError('Please fix all validation errors before submitting');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Check authentication before proceeding
      if (!currentUser) {
        setError('Please log in to create a booking');
        return;
      }

      // Prepare booking data
      const bookingData = {
        hospitalId: parseInt(formData.hospitalId),
        resourceType: formData.resourceType,
        patientName: formData.patientName.trim(),
        patientAge: parseInt(formData.patientAge),
        patientGender: formData.patientGender,
        emergencyContactName: formData.emergencyContactName.trim(),
        emergencyContactPhone: formData.emergencyContactPhone.trim(),
        emergencyContactRelationship: formData.emergencyContactRelationship.trim(),
        medicalCondition: formData.medicalCondition.trim(),
        urgency: formData.urgency,
        scheduledDate: formData.scheduledDate,
        estimatedDuration: parseInt(formData.estimatedDuration),
        notes: formData.notes?.trim()
      };

      console.log('📤 Sending booking data:', bookingData);

      // Create booking
      const response = await bookingAPI.create(bookingData);

      console.log('📥 Booking response:', response.data);

      if (response.data.success) {
        setSuccess(true);
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
      setSubmitting(false);
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

  const getResourceAvailability = (hospital: Hospital, type: string) => {
    if (!hospital.resources) return 0;
    switch (type) {
      case 'beds': return hospital.resources.beds?.available || 0;
      case 'icu': return hospital.resources.icu?.available || 0;
      case 'operationTheatres': return hospital.resources.operationTheatres?.available || 0;
      default: return 0;
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

  // Success page
  if (success) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
          <Navigation />
          <div className="max-w-2xl mx-auto px-4 py-16">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    🎉 Booking Request Submitted!
                  </h2>
                  <p className="text-gray-600 mb-8 text-lg">
                    Your booking request has been submitted successfully. The hospital will review and respond shortly.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Link href="/dashboard">
                      <Button className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
                        View Dashboard
                      </Button>
                    </Link>
                    <Link href="/hospitals">
                      <Button variant="outline">
                        Book Another Resource
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Show login message if not authenticated
  if (!currentUser) {
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
                    Authentication Required
                  </h2>
                  <p className="text-gray-600 mb-8">
                    Please log in to create a booking.
                  </p>
                  <Link href="/login">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Go to Login
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
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

          {/* Progress Indicator */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Step {currentStep} of {totalSteps}</h3>
                <span className="text-sm text-gray-600">{stepTitles[currentStep - 1]}</span>
              </div>
              <Progress value={(currentStep / totalSteps) * 100} className="mb-2" />
              <div className="flex justify-between text-xs text-gray-500">
                {stepTitles.map((title, index) => (
                  <span key={index} className={currentStep > index + 1 ? 'text-green-600' : currentStep === index + 1 ? 'text-blue-600 font-medium' : ''}>
                    {title}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

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
            {/* Step 1: Hospital & Resource Selection */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building2 className="w-5 h-5 mr-2" />
                    Select Medical Facility & Resource
                  </CardTitle>
                  <CardDescription>
                    Choose your preferred hospital and the specific medical resource you need.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="hospitalId">Hospital *</Label>
                      <Select
                        value={formData.hospitalId}
                        onValueChange={(value) => handleInputChange('hospitalId', value)}
                        placeholder="Select a hospital"
                        className={validationErrors.hospitalId ? 'border-red-500' : ''}
                      >
                        {hospitals.map((hospital) => (
                          <SelectItem key={hospital.id} value={hospital.id.toString()}>
                            {hospital.name} - {hospital.city}
                          </SelectItem>
                        ))}
                      </Select>
                      {validationErrors.hospitalId && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.hospitalId}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="resourceType">Resource Type *</Label>
                      <Select
                        value={formData.resourceType}
                        onValueChange={(value) => handleInputChange('resourceType', value)}
                        placeholder="Select resource type"
                        className={validationErrors.resourceType ? 'border-red-500' : ''}
                      >
                        <SelectItem value="beds">Hospital Bed</SelectItem>
                        <SelectItem value="icu">ICU</SelectItem>
                        <SelectItem value="operationTheatres">Operation Theatre</SelectItem>
                      </Select>
                      {validationErrors.resourceType && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.resourceType}</p>
                      )}
                    </div>
                  </div>

                  {/* Hospital Details */}
                  {selectedHospital && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {selectedHospital.name}
                      </h4>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span>{selectedHospital.city}, {selectedHospital.state}</span>
                        </div>
                        {selectedHospital.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <span>{selectedHospital.phone}</span>
                          </div>
                        )}
                        {selectedHospital.rating > 0 && (
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span>{selectedHospital.rating.toFixed(1)} Rating</span>
                          </div>
                        )}
                      </div>

                      {/* Resource Availability */}
                      {formData.resourceType && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <div className="flex items-center gap-2">
                            {getResourceIcon(formData.resourceType)}
                            <span className="font-medium">
                              {getResourceAvailability(selectedHospital, formData.resourceType)} {getResourceLabel(formData.resourceType)} available now
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 2: Patient Information */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Patient Information
                  </CardTitle>
                  <CardDescription>
                    Provide patient details for the medical booking
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="patientName">Patient Name *</Label>
                      <Input
                        id="patientName"
                        value={formData.patientName}
                        onChange={(e) => handleInputChange('patientName', e.target.value)}
                        placeholder="Full name"
                        className={validationErrors.patientName ? 'border-red-500' : ''}
                      />
                      {validationErrors.patientName && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.patientName}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="patientAge">Age *</Label>
                      <Input
                        id="patientAge"
                        type="number"
                        value={formData.patientAge}
                        onChange={(e) => handleInputChange('patientAge', e.target.value)}
                        placeholder="Age"
                        min="1"
                        max="150"
                        className={validationErrors.patientAge ? 'border-red-500' : ''}
                      />
                      {validationErrors.patientAge && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.patientAge}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="patientGender">Gender *</Label>
                      <Select
                        value={formData.patientGender}
                        onValueChange={(value) => handleInputChange('patientGender', value)}
                        placeholder="Select gender"
                        className={validationErrors.patientGender ? 'border-red-500' : ''}
                      >
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </Select>
                      {validationErrors.patientGender && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.patientGender}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="medicalCondition">Medical Condition *</Label>
                      <Textarea
                        id="medicalCondition"
                        value={formData.medicalCondition}
                        onChange={(e) => handleInputChange('medicalCondition', e.target.value)}
                        placeholder="Brief description of medical condition"
                        rows={3}
                        className={validationErrors.medicalCondition ? 'border-red-500' : ''}
                      />
                      {validationErrors.medicalCondition && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.medicalCondition}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="urgency">Urgency Level *</Label>
                      <Select
                        value={formData.urgency}
                        onValueChange={(value) => handleInputChange('urgency', value)}
                        placeholder="Select urgency"
                        className={validationErrors.urgency ? 'border-red-500' : ''}
                      >
                        <SelectItem value="low">Low - Routine care</SelectItem>
                        <SelectItem value="medium">Medium - Standard priority</SelectItem>
                        <SelectItem value="high">High - Urgent care needed</SelectItem>
                        <SelectItem value="critical">Critical - Emergency</SelectItem>
                      </Select>
                      {validationErrors.urgency && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.urgency}</p>
                      )}

                      {formData.urgency && (
                        <div className="mt-2">
                          <Badge className={getUrgencyColor(formData.urgency)}>
                            {formData.urgency.toUpperCase()} PRIORITY
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Emergency Contact */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Emergency Contact Information
                  </CardTitle>
                  <CardDescription>
                    Provide emergency contact details for medical situations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="emergencyContactName">Contact Name *</Label>
                      <Input
                        id="emergencyContactName"
                        value={formData.emergencyContactName}
                        onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                        placeholder="Full name"
                        className={validationErrors.emergencyContactName ? 'border-red-500' : ''}
                      />
                      {validationErrors.emergencyContactName && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.emergencyContactName}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="emergencyContactPhone">Phone Number *</Label>
                      <Input
                        id="emergencyContactPhone"
                        value={formData.emergencyContactPhone}
                        onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className={validationErrors.emergencyContactPhone ? 'border-red-500' : ''}
                      />
                      {validationErrors.emergencyContactPhone && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.emergencyContactPhone}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="emergencyContactRelationship">Relationship *</Label>
                      <Select
                        value={formData.emergencyContactRelationship}
                        onValueChange={(value) => handleInputChange('emergencyContactRelationship', value)}
                        placeholder="Select relationship"
                        className={validationErrors.emergencyContactRelationship ? 'border-red-500' : ''}
                      >
                        <SelectItem value="spouse">Spouse</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="child">Child</SelectItem>
                        <SelectItem value="sibling">Sibling</SelectItem>
                        <SelectItem value="friend">Friend</SelectItem>
                        <SelectItem value="guardian">Guardian</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </Select>
                      {validationErrors.emergencyContactRelationship && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.emergencyContactRelationship}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800">Important</h4>
                        <p className="text-sm text-yellow-700">
                          This contact will be notified in case of medical emergencies. Please ensure the information is accurate and the person is reachable.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Schedule & Review */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="w-5 h-5 mr-2" />
                      Schedule & Additional Information
                    </CardTitle>
                    <CardDescription>
                      Set your preferred schedule and add any additional notes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="scheduledDate">Preferred Date & Time *</Label>
                        <Input
                          id="scheduledDate"
                          type="datetime-local"
                          value={formData.scheduledDate}
                          onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                          min={new Date().toISOString().slice(0, 16)}
                          className={validationErrors.scheduledDate ? 'border-red-500' : ''}
                        />
                        {validationErrors.scheduledDate && (
                          <p className="text-sm text-red-600 mt-1">{validationErrors.scheduledDate}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="estimatedDuration">Estimated Duration (hours) *</Label>
                        <Select
                          value={formData.estimatedDuration}
                          onValueChange={(value) => handleInputChange('estimatedDuration', value)}
                          placeholder="Select duration"
                          className={validationErrors.estimatedDuration ? 'border-red-500' : ''}
                        >
                          <SelectItem value="2">2 hours</SelectItem>
                          <SelectItem value="4">4 hours</SelectItem>
                          <SelectItem value="8">8 hours</SelectItem>
                          <SelectItem value="12">12 hours</SelectItem>
                          <SelectItem value="24">24 hours (1 day)</SelectItem>
                          <SelectItem value="48">48 hours (2 days)</SelectItem>
                          <SelectItem value="72">72 hours (3 days)</SelectItem>
                          <SelectItem value="168">168 hours (1 week)</SelectItem>
                        </Select>
                        {validationErrors.estimatedDuration && (
                          <p className="text-sm text-red-600 mt-1">{validationErrors.estimatedDuration}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="notes">Additional Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        placeholder="Any additional information or special requirements..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Booking Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="w-5 h-5 mr-2" />
                      Booking Summary
                    </CardTitle>
                    <CardDescription>
                      Review your booking details before submission
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Hospital & Resource</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Hospital:</span>
                            <span className="font-medium">{selectedHospital?.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Resource:</span>
                            <span className="font-medium">{getResourceLabel(formData.resourceType)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Duration:</span>
                            <span className="font-medium">{formData.estimatedDuration} hours</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Urgency:</span>
                            <Badge className={getUrgencyColor(formData.urgency)}>
                              {formData.urgency}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Patient Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Patient:</span>
                            <span className="font-medium">{formData.patientName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Age:</span>
                            <span className="font-medium">{formData.patientAge} years</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Gender:</span>
                            <span className="font-medium capitalize">{formData.patientGender}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Emergency Contact:</span>
                            <span className="font-medium">{formData.emergencyContactName}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {formData.scheduledDate && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">Scheduled for:</span>
                          <span className="font-medium">
                            {new Date(formData.scheduledDate).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-2"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Submit Booking Request
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading booking form...</p>
      </div>
    </div>}>
      <BookingPageContent />
    </Suspense>
  );
}