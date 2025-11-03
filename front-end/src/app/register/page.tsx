'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { authAPI } from '@/lib/api';
import { AlertTriangle, Building2, User, ArrowLeft, Info, Shield, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  userType: 'user' | 'hospital-authority';
  acceptedTerms: boolean;
  hospital?: {
    name: string;
    description: string;
    type: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    contact: {
      phone: string;
      email: string;
      emergency: string;
    };
    services: string[];
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    userType: 'user',
    acceptedTerms: false,
    hospital: {
      name: '',
      description: '',
      type: 'General',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'United States',
      },
      contact: {
        phone: '',
        email: '',
        emergency: '',
      },
      services: [],
    },
  });

  const handleInputChange = (field: keyof RegisterFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleHospitalChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      hospital: {
        ...prev.hospital!,
        [field]: value
      }
    }));
  };

  const handleHospitalNestedChange = (section: 'address' | 'contact', field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      hospital: {
        ...prev.hospital!,
        [section]: {
          ...prev.hospital![section],
          [field]: value
        }
      }
    }));
  };

  const handleServiceToggle = (service: string) => {
    setFormData(prev => ({
      ...prev,
      hospital: {
        ...prev.hospital!,
        services: prev.hospital!.services.includes(service)
          ? prev.hospital!.services.filter(s => s !== service)
          : [...prev.hospital!.services, service]
      }
    }));
  };

  const availableServices = [
    'Emergency Care',
    'Cardiology',
    'Neurology',
    'Orthopedics',
    'Pediatrics',
    'Oncology',
    'Radiology',
    'Laboratory',
    'Surgery',
    'ICU',
    'Maternity',
    'Pharmacy',
    'Blood Bank',
    'Dialysis',
    'Physical Therapy'
  ];

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Basic user validation
    if (!formData.name.trim()) {
      errors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Full name must be at least 2 characters long';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else {
      // Enhanced email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Please enter a valid email address';
      }
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else {
      // Enhanced phone validation
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
        errors.phone = 'Please enter a valid phone number';
      }
    }

    // Hospital authority specific validation
    if (formData.userType === 'hospital-authority') {
      if (!formData.acceptedTerms) {
        errors.acceptedTerms = 'You must accept the terms and conditions to register as a hospital authority';
      }

      if (!formData.hospital) {
        errors.hospital = 'Hospital information is required for hospital authority registration';
      } else {
        const { hospital } = formData;
        
        if (!hospital.name.trim()) {
          errors.hospitalName = 'Hospital name is required';
        } else if (hospital.name.trim().length < 3) {
          errors.hospitalName = 'Hospital name must be at least 3 characters long';
        }
        
        if (!hospital.description.trim()) {
          errors.hospitalDescription = 'Hospital description is required';
        } else if (hospital.description.trim().length < 10) {
          errors.hospitalDescription = 'Hospital description must be at least 10 characters long';
        }
        
        if (!hospital.type.trim()) {
          errors.hospitalType = 'Hospital type is required';
        }
        
        // Address validation
        if (!hospital.address.street.trim()) {
          errors.hospitalStreet = 'Hospital street address is required';
        }
        if (!hospital.address.city.trim()) {
          errors.hospitalCity = 'Hospital city is required';
        }
        if (!hospital.address.state.trim()) {
          errors.hospitalState = 'Hospital state is required';
        }
        if (!hospital.address.zipCode.trim()) {
          errors.hospitalZip = 'Hospital ZIP code is required';
        } else {
          // ZIP code validation
          const zipRegex = /^\d{5}(-\d{4})?$/;
          if (!zipRegex.test(hospital.address.zipCode)) {
            errors.hospitalZip = 'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)';
          }
        }
        if (!hospital.address.country.trim()) {
          errors.hospitalCountry = 'Hospital country is required';
        }
        
        // Contact validation
        if (!hospital.contact.phone.trim()) {
          errors.hospitalPhone = 'Hospital phone number is required';
        } else {
          const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
          if (!phoneRegex.test(hospital.contact.phone.replace(/[\s\-\(\)]/g, ''))) {
            errors.hospitalPhone = 'Please enter a valid hospital phone number';
          }
        }
        
        if (!hospital.contact.email.trim()) {
          errors.hospitalEmail = 'Hospital email is required';
        } else {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(hospital.contact.email)) {
            errors.hospitalEmail = 'Please enter a valid hospital email address';
          }
        }
        
        if (!hospital.contact.emergency.trim()) {
          errors.hospitalEmergency = 'Hospital emergency contact is required';
        } else {
          const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
          if (!phoneRegex.test(hospital.contact.emergency.replace(/[\s\-\(\)]/g, ''))) {
            errors.hospitalEmergency = 'Please enter a valid emergency contact number';
          }
        }
        
        // Services validation
        if (hospital.services.length === 0) {
          errors.hospitalServices = 'Please select at least one service that your hospital provides';
        }
      }
    }

    setFieldErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      setError('Please review and correct the highlighted fields to complete your registration.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      const registrationData: {
        name: string;
        email: string;
        password: string;
        phone: string;
        userType: string;
        hospital?: {
          name: string;
          description: string;
          type: string;
          address: {
            street: string;
            city: string;
            state: string;
            zipCode: string;
            country: string;
          };
          contact: {
            phone: string;
            email: string;
            emergency: string;
          };
          services: string[];
        };
      } = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        userType: formData.userType,
      };

      // Include hospital data for hospital authorities (without capacity)
      if (formData.userType === 'hospital-authority' && formData.hospital) {
        registrationData.hospital = {
          name: formData.hospital.name || '',
          description: formData.hospital.description || '',
          type: formData.hospital.type || '',
          address: formData.hospital.address || {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: ''
          },
          contact: formData.hospital.contact || {
            phone: '',
            email: '',
            emergency: ''
          },
          services: formData.hospital.services || []
        };
      }

      const response = await authAPI.register(registrationData);

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error as { response?: { data?: { error?: string } } }).response?.data?.error 
        : 'Unable to complete registration. Please try again or contact support.';
      setError(errorMessage || 'Unable to complete registration. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="max-w-md mx-auto px-4 py-16">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                  {formData.userType === 'hospital-authority' ? (
                    <Building2 className="w-8 h-8 text-green-600" />
                  ) : (
                    <User className="w-8 h-8 text-green-600" />
                  )}
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Welcome to RapidCare!
                </h2>
                {formData.userType === 'hospital-authority' ? (
                  <div className="space-y-4">
                    <p className="text-gray-600">
                      Your medical facility account has been created successfully. Your facility registration is now undergoing our quality verification process.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">Next Steps in Your RapidCare Journey:</p>
                          <ul className="space-y-1 text-blue-700">
                            <li>• Our verification team will review your facility information</li>
                            <li>• You&apos;ll receive email confirmation once your facility is approved</li>
                            <li>• Your facility will join the RapidCare emergency network</li>
                            <li>• You can begin managing resources and helping patients in need</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600 mb-6">
                    Your RapidCare account has been created successfully. You can now access emergency medical resources when you need them most.
                  </p>
                )}
                <Link href="/login" className="mt-6 block">
                  <Button className="w-full">
                    Access RapidCare
                  </Button>
                </Link>
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
      
      <div className={`mx-auto px-4 py-16 ${formData.userType === 'hospital-authority' ? 'max-w-2xl' : 'max-w-md'}`}>
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">Join RapidCare</CardTitle>
            <CardDescription>
              {formData.userType === 'hospital-authority' 
                ? 'Register your medical facility and create a professional account. Your hospital will undergo our verification process for quality assurance.'
                : 'Create your RapidCare account to access emergency medical resources when you need them most'
              }
            </CardDescription>
            
            {formData.userType === 'hospital-authority' && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Medical Facility Verification</p>
                    <p>Your hospital registration will undergo our quality verification process. You&apos;ll receive confirmation once your facility is approved for the RapidCare network.</p>
                  </div>
                </div>
              </div>
            )}
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="userType">Account Type</Label>
                <Select 
                  value={formData.userType} 
                  onValueChange={(value: 'user' | 'hospital-authority') => 
                    handleInputChange('userType', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>Patient/Individual</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="hospital-authority">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span>Medical Facility Representative</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your complete legal name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  className={fieldErrors.name ? 'border-red-500' : ''}
                />
                {fieldErrors.name && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your professional email address"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  className={fieldErrors.email ? 'border-red-500' : ''}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Contact Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your primary contact number"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  required
                  className={fieldErrors.phone ? 'border-red-500' : ''}
                />
                {fieldErrors.phone && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Secure Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong, secure password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required
                    className={fieldErrors.password ? 'border-red-500 pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>
                )}
                <div className="mt-1">
                  <div className="flex gap-1 mb-1">
                    <div className={`h-1 w-full rounded ${formData.password.length >= 6 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                    <div className={`h-1 w-full rounded ${/[A-Z]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                    <div className={`h-1 w-full rounded ${/[a-z]/.test(formData.password) ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                    <div className={`h-1 w-full rounded ${/\d/.test(formData.password) ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Secure your account with at least 6 characters including uppercase, lowercase, and number
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Secure Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your secure password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    required
                    className={fieldErrors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              {/* Hospital Authority Additional Fields */}
              {formData.userType === 'hospital-authority' && (
                <div className="space-y-6 border-t pt-6">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Medical Facility Information</h3>
                  </div>

                  {/* Hospital Basic Information */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="hospitalName">Medical Facility Name *</Label>
                      <Input
                        id="hospitalName"
                        type="text"
                        placeholder="Enter the complete legal name of your medical facility"
                        value={formData.hospital?.name || ''}
                        onChange={(e) => handleHospitalChange('name', e.target.value)}
                        required
                        className={`mt-1 ${fieldErrors.hospitalName ? 'border-red-500' : ''}`}
                      />
                      {fieldErrors.hospitalName && (
                        <p className="text-xs text-red-500 mt-1">{fieldErrors.hospitalName}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="hospitalDescription">Facility Description *</Label>
                      <Textarea
                        id="hospitalDescription"
                        placeholder="Provide a comprehensive description of your medical facility, including specialties, mission, and key capabilities that serve emergency care needs (minimum 10 characters)"
                        value={formData.hospital?.description || ''}
                        onChange={(e) => handleHospitalChange('description', e.target.value)}
                        required
                        rows={3}
                        className={`mt-1 ${fieldErrors.hospitalDescription ? 'border-red-500' : ''}`}
                      />
                      {fieldErrors.hospitalDescription ? (
                        <p className="text-xs text-red-500 mt-1">{fieldErrors.hospitalDescription}</p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.hospital?.description?.length || 0} characters (minimum 10 required)
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="hospitalType">Facility Type *</Label>
                      <Select 
                        value={formData.hospital?.type || 'General'} 
                        onValueChange={(value) => handleHospitalChange('type', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select your facility type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="General">General Hospital</SelectItem>
                          <SelectItem value="Specialty">Specialty Hospital</SelectItem>
                          <SelectItem value="Emergency">Emergency Hospital</SelectItem>
                          <SelectItem value="Pediatric">Pediatric Hospital</SelectItem>
                          <SelectItem value="Cardiac">Cardiac Hospital</SelectItem>
                          <SelectItem value="Cancer">Cancer Hospital</SelectItem>
                          <SelectItem value="Orthopedic">Orthopedic Hospital</SelectItem>
                          <SelectItem value="Psychiatric">Psychiatric Hospital</SelectItem>
                          <SelectItem value="Rehabilitation">Rehabilitation Hospital</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Hospital Services */}
                  <div>
                    <Label>Medical Services *</Label>
                    <p className="text-sm text-gray-600 mb-3">Select all medical services your facility provides to emergency patients:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {availableServices.map((service) => (
                        <label
                          key={service}
                          className="flex items-center space-x-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={formData.hospital?.services.includes(service) || false}
                            onChange={() => handleServiceToggle(service)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm">{service}</span>
                        </label>
                      ))}
                    </div>
                    {fieldErrors.hospitalServices && (
                      <p className="text-xs text-red-500 mt-1">{fieldErrors.hospitalServices}</p>
                    )}
                  </div>

                  {/* Hospital Address */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      Facility Address
                    </h4>
                    
                    <div>
                      <Label htmlFor="hospitalStreet">Street Address *</Label>
                      <Input
                        id="hospitalStreet"
                        type="text"
                        placeholder="Enter complete facility street address"
                        value={formData.hospital?.address.street || ''}
                        onChange={(e) => handleHospitalNestedChange('address', 'street', e.target.value)}
                        required
                        className={`mt-1 ${fieldErrors.hospitalStreet ? 'border-red-500' : ''}`}
                      />
                      {fieldErrors.hospitalStreet && (
                        <p className="text-xs text-red-500 mt-1">{fieldErrors.hospitalStreet}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="hospitalCity">City *</Label>
                        <Input
                          id="hospitalCity"
                          type="text"
                          placeholder="City"
                          value={formData.hospital?.address.city || ''}
                          onChange={(e) => handleHospitalNestedChange('address', 'city', e.target.value)}
                          required
                          className={`mt-1 ${fieldErrors.hospitalCity ? 'border-red-500' : ''}`}
                        />
                        {fieldErrors.hospitalCity && (
                          <p className="text-xs text-red-500 mt-1">{fieldErrors.hospitalCity}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="hospitalState">State/Province *</Label>
                        <Input
                          id="hospitalState"
                          type="text"
                          placeholder="State or Province"
                          value={formData.hospital?.address.state || ''}
                          onChange={(e) => handleHospitalNestedChange('address', 'state', e.target.value)}
                          required
                          className={`mt-1 ${fieldErrors.hospitalState ? 'border-red-500' : ''}`}
                        />
                        {fieldErrors.hospitalState && (
                          <p className="text-xs text-red-500 mt-1">{fieldErrors.hospitalState}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="hospitalZip">ZIP/Postal Code *</Label>
                        <Input
                          id="hospitalZip"
                          type="text"
                          placeholder="12345 or 12345-6789"
                          value={formData.hospital?.address.zipCode || ''}
                          onChange={(e) => handleHospitalNestedChange('address', 'zipCode', e.target.value)}
                          required
                          className={`mt-1 ${fieldErrors.hospitalZip ? 'border-red-500' : ''}`}
                        />
                        {fieldErrors.hospitalZip && (
                          <p className="text-xs text-red-500 mt-1">{fieldErrors.hospitalZip}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="hospitalCountry">Country *</Label>
                        <Select 
                          value={formData.hospital?.address.country || 'United States'} 
                          onValueChange={(value) => handleHospitalNestedChange('address', 'country', value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="United States">United States</SelectItem>
                            <SelectItem value="Canada">Canada</SelectItem>
                            <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                            <SelectItem value="Australia">Australia</SelectItem>
                            <SelectItem value="India">India</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Hospital Contact Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      Contact Information
                    </h4>

                    <div>
                      <Label htmlFor="hospitalPhone">Hospital Main Phone *</Label>
                      <Input
                        id="hospitalPhone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={formData.hospital?.contact.phone || ''}
                        onChange={(e) => handleHospitalNestedChange('contact', 'phone', e.target.value)}
                        required
                        className={`mt-1 ${fieldErrors.hospitalPhone ? 'border-red-500' : ''}`}
                      />
                      {fieldErrors.hospitalPhone && (
                        <p className="text-xs text-red-500 mt-1">{fieldErrors.hospitalPhone}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="hospitalEmail">Hospital Email *</Label>
                      <Input
                        id="hospitalEmail"
                        type="email"
                        placeholder="info@hospital.com"
                        value={formData.hospital?.contact.email || ''}
                        onChange={(e) => handleHospitalNestedChange('contact', 'email', e.target.value)}
                        required
                        className={`mt-1 ${fieldErrors.hospitalEmail ? 'border-red-500' : ''}`}
                      />
                      {fieldErrors.hospitalEmail && (
                        <p className="text-xs text-red-500 mt-1">{fieldErrors.hospitalEmail}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="hospitalEmergency">Emergency Contact Number *</Label>
                      <Input
                        id="hospitalEmergency"
                        type="tel"
                        placeholder="+1 (555) 911-0000"
                        value={formData.hospital?.contact.emergency || ''}
                        onChange={(e) => handleHospitalNestedChange('contact', 'emergency', e.target.value)}
                        required
                        className={`mt-1 ${fieldErrors.hospitalEmergency ? 'border-red-500' : ''}`}
                      />
                      {fieldErrors.hospitalEmergency ? (
                        <p className="text-xs text-red-500 mt-1">{fieldErrors.hospitalEmergency}</p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">
                          24/7 emergency contact number for urgent situations
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Resource Management Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-blue-900 mb-1">Resource Management</h4>
                        <p className="text-sm text-blue-700">
                          You can set up and manage your hospital&apos;s bed capacity, ICU units, and operation theaters 
                          after registration from your hospital management dashboard. This allows for real-time updates 
                          and better resource tracking.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Terms and Conditions */}
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-green-600" />
                      Terms and Conditions
                    </h4>
                    
                    <div className="bg-gray-50 border rounded-lg p-4 max-h-48 overflow-y-auto">
                      <div className="space-y-3 text-sm text-gray-700">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-1">Hospital Authority Registration Terms</h5>
                          <p>By registering as a hospital authority, you agree to the following terms:</p>
                        </div>
                        
                        <div>
                          <h6 className="font-medium">1. Verification and Approval</h6>
                          <p>• All hospital registrations are subject to admin approval</p>
                          <p>• You must provide accurate and complete information</p>
                          <p>• False information may result in permanent account suspension</p>
                        </div>
                        
                        <div>
                          <h6 className="font-medium">2. Hospital Management</h6>
                          <p>• You can only register one hospital per authority account</p>
                          <p>• You are responsible for keeping hospital information up-to-date</p>
                          <p>• Resource availability must be accurately maintained</p>
                        </div>
                        
                        <div>
                          <h6 className="font-medium">3. Service Standards</h6>
                          <p>• You must maintain professional service standards</p>
                          <p>• Emergency contacts must be available 24/7</p>
                          <p>• Booking confirmations must be honored</p>
                        </div>
                        
                        <div>
                          <h6 className="font-medium">4. Data and Privacy</h6>
                          <p>• Patient data must be handled according to HIPAA guidelines</p>
                          <p>• Hospital information may be displayed publicly after approval</p>
                          <p>• You consent to periodic verification of hospital status</p>
                        </div>
                        
                        <div>
                          <h6 className="font-medium">5. Platform Usage</h6>
                          <p>• The platform is for legitimate medical resource booking only</p>
                          <p>• Misuse may result in account termination</p>
                          <p>• Platform fees may apply to transactions</p>
                        </div>
                      </div>
                    </div>
                    
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.acceptedTerms}
                        onChange={(e) => setFormData(prev => ({ ...prev, acceptedTerms: e.target.checked }))}
                        className={`mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${fieldErrors.acceptedTerms ? 'border-red-500' : ''}`}
                        required
                      />
                      <span className="text-sm text-gray-700">
                        I have read and agree to the <strong>Terms and Conditions</strong> for hospital authority registration. 
                        I confirm that all information provided is accurate and complete, and I understand that my hospital 
                        registration is subject to admin approval.
                      </span>
                    </label>
                    
                    {fieldErrors.acceptedTerms && (
                      <p className="text-xs text-red-500">{fieldErrors.acceptedTerms}</p>
                    )}
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || (formData.userType === 'hospital-authority' && !formData.acceptedTerms)}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {formData.userType === 'hospital-authority' ? 'Registering Hospital...' : 'Creating Account...'}
                  </div>
                ) : (
                  formData.userType === 'hospital-authority' ? 'Register Hospital Authority' : 'Create Account'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                  Sign in here
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center">
              <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 