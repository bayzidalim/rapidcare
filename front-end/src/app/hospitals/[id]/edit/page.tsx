'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { hospitalAPI } from '@/lib/api';
import { Hospital } from '@/lib/types';
import { isHospitalAuthority } from '@/lib/auth';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Bed, 
  Heart, 
  Scissors,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Plus,
  X,
  Save
} from 'lucide-react';
import Link from 'next/link';

const hospitalSchema = z.object({
  name: z.string().min(2, 'Hospital name must be at least 2 characters'),
  address: z.object({
    street: z.string().min(5, 'Street address is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    zipCode: z.string().min(3, 'ZIP code is required'),
    country: z.string().min(2, 'Country is required'),
  }),
  contact: z.object({
    phone: z.string().min(2, 'Valid phone number is required'),
    email: z.string().email('Valid email is required'),
    emergency: z.string().min(2, 'Emergency contact is required'),
  }),
  resources: z.object({
    beds: z.object({
      total: z.number().min(0, 'Total beds must be 0 or greater'),
      available: z.number().min(0, 'Available beds must be 0 or greater'),
    }),
    icu: z.object({
      total: z.number().min(0, 'Total ICU beds must be 0 or greater'),
      available: z.number().min(0, 'Available ICU beds must be 0 or greater'),
    }),
    operationTheatres: z.object({
      total: z.number().min(0, 'Total operation theatres must be 0 or greater'),
      available: z.number().min(0, 'Available operation theatres must be 0 or greater'),
    }),
  }),
  services: z.array(z.string()).min(1, 'At least one service is required'),
  rating: z.number().min(0).max(5, 'Rating must be between 0 and 5'),
  isActive: z.boolean(),
});

type HospitalFormData = z.infer<typeof hospitalSchema>;

const commonServices = [
  'Emergency Care',
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Oncology',
  'Radiology',
  'General Surgery',
  'Obstetrics & Gynecology',
  'Psychiatry',
  'Dermatology',
  'Ophthalmology',
  'ENT',
  'Urology',
  'Nephrology',
  'Gastroenterology',
  'Pulmonology',
  'Endocrinology',
  'Physical Therapy',
  'Rehabilitation',
];

export default function EditHospitalPage() {
  const router = useRouter();
  const params = useParams();
  const hospitalId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [newService, setNewService] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<HospitalFormData>({
    resolver: zodResolver(hospitalSchema),
  });

  const services = watch('services') || [];

  useEffect(() => {
    if (hospitalId) {
      fetchHospital();
    }
  }, [hospitalId]);

  const fetchHospital = async () => {
    try {
      setLoading(true);
      const response = await hospitalAPI.getById(parseInt(hospitalId));
      const hospitalData = response.data.data;
      setHospital(hospitalData);
      
      // Set form values
      setValue('name', hospitalData.name);
      setValue('address', hospitalData.address);
      setValue('contact', hospitalData.contact);
      setValue('resources', {
        beds: { total: hospitalData.resources.beds.total, available: hospitalData.resources.beds.available },
        icu: { total: hospitalData.resources.icu.total, available: hospitalData.resources.icu.available },
        operationTheatres: { total: hospitalData.resources.operationTheatres.total, available: hospitalData.resources.operationTheatres.available },
      });
      setValue('services', hospitalData.services);
      setValue('rating', hospitalData.rating);
      setValue('isActive', hospitalData.isActive);
    } catch (error) {
      console.error('Error fetching hospital:', error);
      setError('Failed to load hospital data');
    } finally {
      setLoading(false);
    }
  };

  const addService = () => {
    if (newService.trim() && !services.includes(newService.trim())) {
      setValue('services', [...services, newService.trim()]);
      setNewService('');
    }
  };

  const removeService = (serviceToRemove: string) => {
    setValue('services', services.filter(service => service !== serviceToRemove));
  };

  const onSubmit = async (data: HospitalFormData) => {
    try {
      setSaving(true);
      setError('');

      // Calculate occupied resources
      const resourcesWithOccupied = {
        beds: {
          ...data.resources.beds,
          occupied: data.resources.beds.total - data.resources.beds.available,
        },
        icu: {
          ...data.resources.icu,
          occupied: data.resources.icu.total - data.resources.icu.available,
        },
        operationTheatres: {
          ...data.resources.operationTheatres,
          occupied: data.resources.operationTheatres.total - data.resources.operationTheatres.available,
        },
      };

      const hospitalData = {
        ...data,
        resources: resourcesWithOccupied,
      };

      // Use the update endpoint
      await hospitalAPI.update(parseInt(hospitalId), hospitalData);
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/hospitals/manage');
      }, 2000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to update hospital');
    } finally {
      setSaving(false);
    }
  };

  if (!isHospitalAuthority()) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen">
          <Navigation />
          <div className="max-w-2xl mx-auto px-4 py-16">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Access Restricted
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Only authorized hospital administrators can modify facility information.
                  </p>
                  <Link href="/dashboard">
                    <Button>Go to Dashboard</Button>
                  </Link>
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
        <div className="min-h-screen">
          <Navigation />
          <div className="max-w-2xl mx-auto px-4 py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading facility information...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (success) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen">
          <Navigation />
          <div className="max-w-2xl mx-auto px-4 py-16">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Hospital Information Updated Successfully!
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Your facility information has been updated in the RapidCare network. Redirecting to management page...
                  </p>
                  <Link href="/hospitals/manage">
                    <Button>Go to Manage Hospitals</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!hospital) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen">
          <Navigation />
          <div className="max-w-2xl mx-auto px-4 py-16">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Medical Facility Not Found
                  </h2>
                  <p className="text-gray-600 mb-6">
                    The requested facility doesn't exist or you don't have authorization to modify it.
                  </p>
                  <Link href="/hospitals/manage">
                    <Button>Go to Manage Hospitals</Button>
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
      <div className="min-h-screen">
        <Navigation />
        
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link href="/hospitals/manage" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Manage Hospitals
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Update Hospital Information</h1>
            <p className="text-gray-600">
              Keep {hospital.name} information current to ensure optimal emergency care coordination.
            </p>
          </div>

          {error && (
            <Alert className="mb-6" variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Maintain accurate hospital information to ensure seamless emergency care coordination.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Hospital Name</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="Enter hospital name"
                  />
                  {errors.name && (
                    <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      {...register('contact.phone')}
                      placeholder="+1-555-0123"
                    />
                    {errors.contact?.phone && (
                      <p className="text-red-600 text-sm mt-1">{errors.contact.phone.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register('contact.email')}
                      placeholder="info@hospital.com"
                    />
                    {errors.contact?.email && (
                      <p className="text-red-600 text-sm mt-1">{errors.contact.email.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="emergency">Emergency Contact</Label>
                  <Input
                    id="emergency"
                    {...register('contact.emergency')}
                    placeholder="+1-555-9111"
                  />
                  {errors.contact?.emergency && (
                    <p className="text-red-600 text-sm mt-1">{errors.contact.emergency.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Address Information
                </CardTitle>
                <CardDescription>
                  Keep location information current for accurate patient routing and emergency response.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    {...register('address.street')}
                    placeholder="123 Main Street"
                  />
                  {errors.address?.street && (
                    <p className="text-red-600 text-sm mt-1">{errors.address.street.message}</p>
                  )}
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      {...register('address.city')}
                      placeholder="New York"
                    />
                    {errors.address?.city && (
                      <p className="text-red-600 text-sm mt-1">{errors.address.city.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      {...register('address.state')}
                      placeholder="NY"
                    />
                    {errors.address?.state && (
                      <p className="text-red-600 text-sm mt-1">{errors.address.state.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      {...register('address.zipCode')}
                      placeholder="10001"
                    />
                    {errors.address?.zipCode && (
                      <p className="text-red-600 text-sm mt-1">{errors.address.zipCode.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    {...register('address.country')}
                    placeholder="USA"
                  />
                  {errors.address?.country && (
                    <p className="text-red-600 text-sm mt-1">{errors.address.country.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Resource Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bed className="w-5 h-5" />
                  Resource Information
                </CardTitle>
                <CardDescription>
                  Maintain real-time resource availability to enable efficient emergency care allocation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Beds */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Bed className="w-4 h-4" />
                    Hospital Beds
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bedsTotal">Total Beds</Label>
                      <Input
                        id="bedsTotal"
                        type="number"
                        {...register('resources.beds.total', { valueAsNumber: true })}
                        min="0"
                      />
                      {errors.resources?.beds?.total && (
                        <p className="text-red-600 text-sm mt-1">{errors.resources.beds.total.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="bedsAvailable">Available Beds</Label>
                      <Input
                        id="bedsAvailable"
                        type="number"
                        {...register('resources.beds.available', { valueAsNumber: true })}
                        min="0"
                      />
                      {errors.resources?.beds?.available && (
                        <p className="text-red-600 text-sm mt-1">{errors.resources.beds.available.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* ICU */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    ICU Beds
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="icuTotal">Total ICU Beds</Label>
                      <Input
                        id="icuTotal"
                        type="number"
                        {...register('resources.icu.total', { valueAsNumber: true })}
                        min="0"
                      />
                      {errors.resources?.icu?.total && (
                        <p className="text-red-600 text-sm mt-1">{errors.resources.icu.total.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="icuAvailable">Available ICU Beds</Label>
                      <Input
                        id="icuAvailable"
                        type="number"
                        {...register('resources.icu.available', { valueAsNumber: true })}
                        min="0"
                      />
                      {errors.resources?.icu?.available && (
                        <p className="text-red-600 text-sm mt-1">{errors.resources.icu.available.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Operation Theatres */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Scissors className="w-4 h-4" />
                    Operation Theatres
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="otTotal">Total Operation Theatres</Label>
                      <Input
                        id="otTotal"
                        type="number"
                        {...register('resources.operationTheatres.total', { valueAsNumber: true })}
                        min="0"
                      />
                      {errors.resources?.operationTheatres?.total && (
                        <p className="text-red-600 text-sm mt-1">{errors.resources.operationTheatres.total.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="otAvailable">Available Operation Theatres</Label>
                      <Input
                        id="otAvailable"
                        type="number"
                        {...register('resources.operationTheatres.available', { valueAsNumber: true })}
                        min="0"
                      />
                      {errors.resources?.operationTheatres?.available && (
                        <p className="text-red-600 text-sm mt-1">{errors.resources.operationTheatres.available.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Services */}
            <Card>
              <CardHeader>
                <CardTitle>Services Offered</CardTitle>
                <CardDescription>
                  Keep service offerings current to help patients find the right specialized care quickly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select onValueChange={(value) => setNewService(value)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {commonServices
                        .filter(service => !services.includes(service))
                        .map(service => (
                          <SelectItem key={service} value={service}>
                            {service}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={addService} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {services.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {services.map((service, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                      >
                        <span>{service}</span>
                        <button
                          type="button"
                          onClick={() => removeService(service)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {errors.services && (
                  <p className="text-red-600 text-sm">{errors.services.message}</p>
                )}
              </CardContent>
            </Card>

            {/* Status and Rating */}
            <Card>
              <CardHeader>
                <CardTitle>Status and Rating</CardTitle>
                <CardDescription>
                  Maintain accurate status and quality ratings to help patients make informed emergency care decisions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="rating">Rating</Label>
                  <Select onValueChange={(value) => setValue('rating', parseFloat(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0.0 - No rating</SelectItem>
                      <SelectItem value="1">1.0 - Poor</SelectItem>
                      <SelectItem value="2">2.0 - Fair</SelectItem>
                      <SelectItem value="3">3.0 - Good</SelectItem>
                      <SelectItem value="4">4.0 - Very Good</SelectItem>
                      <SelectItem value="5">5.0 - Excellent</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.rating && (
                    <p className="text-red-600 text-sm mt-1">{errors.rating.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="isActive">Status</Label>
                  <Select onValueChange={(value) => setValue('isActive', value === 'true')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.isActive && (
                    <p className="text-red-600 text-sm mt-1">{errors.isActive.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Link href="/hospitals/manage" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Updating Information...' : 'Update Information'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
} 