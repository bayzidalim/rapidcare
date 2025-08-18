'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { hospitalAPI } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Bed,
  Heart,
  Scissors,
  Star,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Activity,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';
import Link from 'next/link';

interface Hospital {
  id: number;
  name: string;
  description?: string;
  type: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  emergency?: string;
  rating: number;
}

interface Resource {
  resourceType: string;
  total: number;
  available: number;
  occupied: number;
  reserved?: number;
  maintenance?: number;
  lastUpdated?: string;
}

interface Utilization {
  resourceType: string;
  total: number;
  available: number;
  occupied: number;
  reserved?: number;
  maintenance?: number;
  utilizationPercentage: number;
  lastUpdated?: string;
}

export default function HospitalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const hospitalId = params.id as string;
  
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [utilization, setUtilization] = useState<Utilization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(getCurrentUser());

  useEffect(() => {
    if (hospitalId) {
      loadHospitalDetails();
    }
    setCurrentUser(getCurrentUser());
  }, [hospitalId]);

  const loadHospitalDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await hospitalAPI.getHospitalResources(parseInt(hospitalId));
      
      if (response.data.success) {
        setHospital(response.data.data.hospital);
        setResources(response.data.data.resources || []);
        setUtilization(response.data.data.utilization || []);
      } else {
        setError('Failed to load hospital details');
      }
    } catch (error: any) {
      console.error('Failed to load hospital details:', error);
      setError('Failed to load hospital details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'beds': return <Bed className="w-5 h-5" />;
      case 'icu': return <Heart className="w-5 h-5" />;
      case 'operationTheatres': return <Scissors className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const getResourceLabel = (type: string) => {
    switch (type) {
      case 'beds': return 'Hospital Beds';
      case 'icu': return 'ICU';
      case 'operationTheatres': return 'Operation Theatres';
      default: return type;
    }
  };

  const getAvailabilityStatus = (available: number, total: number) => {
    const percentage = total > 0 ? (available / total) * 100 : 0;
    
    if (percentage >= 50) {
      return { 
        color: 'text-green-600 bg-green-50 border-green-200', 
        label: 'Good Availability',
        icon: <CheckCircle className="w-4 h-4" />
      };
    } else if (percentage >= 20) {
      return { 
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200', 
        label: 'Limited Availability',
        icon: <Clock className="w-4 h-4" />
      };
    } else if (percentage > 0) {
      return { 
        color: 'text-orange-600 bg-orange-50 border-orange-200', 
        label: 'Very Limited',
        icon: <AlertTriangle className="w-4 h-4" />
      };
    } else {
      return { 
        color: 'text-red-600 bg-red-50 border-red-200', 
        label: 'No Availability',
        icon: <AlertTriangle className="w-4 h-4" />
      };
    }
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-orange-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const handleBookNow = (resourceType?: string) => {
    if (!currentUser) {
      router.push('/login?redirect=' + encodeURIComponent(`/hospitals/${hospitalId}`));
      return;
    }
    
    const bookingUrl = resourceType 
      ? `/booking?hospitalId=${hospitalId}&resourceType=${resourceType}`
      : `/booking?hospitalId=${hospitalId}`;
    
    router.push(bookingUrl);
  };

  const getTotalAvailable = () => {
    return resources.reduce((sum, resource) => sum + resource.available, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-lg text-gray-600">Loading hospital details...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !hospital) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error || 'Hospital not found'}
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={loadHospitalDetails}>
                  Try Again
                </Button>
                <Link href="/hospitals">
                  <Button variant="outline" size="sm">
                    Back to Hospitals
                  </Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link href="/hospitals" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Hospitals
        </Link>

        {/* Hospital Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-3xl mb-2">{hospital.name}</CardTitle>
                <div className="flex items-center gap-6 text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    <span>
                      {hospital.street && `${hospital.street}, `}
                      {hospital.city}, {hospital.state} {hospital.zipCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    <span>{hospital.type} Hospital</span>
                  </div>
                </div>
                {hospital.rating > 0 && (
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500 fill-current" />
                    <span className="text-lg font-medium">{hospital.rating.toFixed(1)}</span>
                    <span className="text-gray-600">Hospital Rating</span>
                  </div>
                )}
                {hospital.description && (
                  <p className="text-gray-600 mt-4">{hospital.description}</p>
                )}
              </div>
              <div className="ml-6">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {getTotalAvailable()} Resources Available
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Resource Availability */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Resource Availability
                </CardTitle>
                <CardDescription>
                  Real-time availability of medical resources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {resources.map((resource) => {
                    const status = getAvailabilityStatus(resource.available, resource.total);
                    return (
                      <div key={resource.resourceType} className={`p-4 rounded-lg border ${status.color}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getResourceIcon(resource.resourceType)}
                            <span className="font-medium">
                              {getResourceLabel(resource.resourceType)}
                            </span>
                          </div>
                          {status.icon}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Available</span>
                            <span className="text-2xl font-bold">{resource.available}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Total</span>
                            <span>{resource.total}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Occupied</span>
                            <span>{resource.occupied}</span>
                          </div>
                          {resource.reserved && resource.reserved > 0 && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Reserved</span>
                              <span>{resource.reserved}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-500">{status.label}</span>
                            <span className="text-xs text-gray-500">
                              {Math.round((resource.available / resource.total) * 100)}% available
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-current h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(resource.available / resource.total) * 100}%` }}
                            ></div>
                          </div>
                        </div>

                        <Button 
                          onClick={() => handleBookNow(resource.resourceType)}
                          className="w-full mt-3"
                          disabled={resource.available === 0}
                          size="sm"
                        >
                          {resource.available === 0 ? 'Not Available' : 'Book Now'}
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {resources.length === 0 && (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No resource information available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Utilization Statistics */}
            {utilization.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Resource Utilization
                  </CardTitle>
                  <CardDescription>
                    Current utilization rates for hospital resources
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {utilization.map((util) => (
                      <div key={util.resourceType} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getResourceIcon(util.resourceType)}
                            <span className="font-medium">
                              {getResourceLabel(util.resourceType)}
                            </span>
                          </div>
                          <span className={`font-bold ${getUtilizationColor(util.utilizationPercentage)}`}>
                            {util.utilizationPercentage.toFixed(1)}%
                          </span>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                          <div 
                            className={`h-3 rounded-full transition-all duration-300 ${
                              util.utilizationPercentage >= 90 ? 'bg-red-500' :
                              util.utilizationPercentage >= 70 ? 'bg-orange-500' :
                              util.utilizationPercentage >= 50 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${util.utilizationPercentage}%` }}
                          ></div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="block">Available</span>
                            <span className="font-medium text-gray-900">{util.available}</span>
                          </div>
                          <div>
                            <span className="block">Occupied</span>
                            <span className="font-medium text-gray-900">{util.occupied}</span>
                          </div>
                          <div>
                            <span className="block">Total</span>
                            <span className="font-medium text-gray-900">{util.total}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Contact & Actions */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {hospital.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-medium">Phone</div>
                      <div className="text-gray-600">{hospital.phone}</div>
                    </div>
                  </div>
                )}
                
                {hospital.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-medium">Email</div>
                      <div className="text-gray-600">{hospital.email}</div>
                    </div>
                  </div>
                )}
                
                {hospital.emergency && (
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <div>
                      <div className="font-medium text-red-600">Emergency</div>
                      <div className="text-red-600 font-medium">{hospital.emergency}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => handleBookNow()}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={getTotalAvailable() === 0}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {getTotalAvailable() === 0 ? 'No Resources Available' : 'Book Resources'}
                </Button>
                
                {!currentUser && (
                  <div className="text-center pt-4 border-t">
                    <p className="text-sm text-gray-600 mb-3">
                      Sign in to book medical resources
                    </p>
                    <div className="space-y-2">
                      <Link href="/login" className="block">
                        <Button variant="outline" className="w-full">
                          Sign In
                        </Button>
                      </Link>
                      <Link href="/register" className="block">
                        <Button variant="outline" className="w-full">
                          Create Account
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hospital Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Hospital Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Resources</span>
                    <span className="font-medium">
                      {resources.reduce((sum, r) => sum + r.total, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Available Now</span>
                    <span className="font-medium text-green-600">
                      {getTotalAvailable()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Currently Occupied</span>
                    <span className="font-medium">
                      {resources.reduce((sum, r) => sum + r.occupied, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hospital Type</span>
                    <span className="font-medium">{hospital.type}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}