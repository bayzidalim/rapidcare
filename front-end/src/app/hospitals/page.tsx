'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip } from '@/components/ui/tooltip';
import { hospitalAPI } from '@/lib/api';
import { getCurrentUser, isAuthenticated } from '@/lib/auth';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Bed,
  Heart,
  Scissors,
  Search,
  Filter,
  Star,
  Clock,
  AlertTriangle,
  CheckCircle,
  Users,
  XCircle,
  Activity,
  LogIn
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
  resources?: {
    beds?: { total: number; available: number; occupied: number };
    icu?: { total: number; available: number; occupied: number };
    operationTheatres?: { total: number; available: number; occupied: number };
  };
}

export default function HospitalsPage() {
  const router = useRouter();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [filteredHospitals, setFilteredHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState('');
  const [minAvailable, setMinAvailable] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(isAuthenticated());

  // Get unique cities from hospitals
  const cities = [...new Set(hospitals.map(h => h.city).filter((city): city is string => Boolean(city)))].sort();

  useEffect(() => {
    loadHospitals();
    setCurrentUser(getCurrentUser());
    setIsUserAuthenticated(isAuthenticated());
  }, []);

  useEffect(() => {
    filterAndSortHospitals();
  }, [hospitals, searchTerm, selectedCity, selectedResourceType, minAvailable, sortBy]);

  const loadHospitals = async () => {
    try {
      setLoading(true);
      setError('');

      // Use the hospital resources API to get hospitals with resource data
      // This endpoint supports both authenticated and guest access
      const response = await hospitalAPI.getHospitalsWithResources();

      if (response.data.success) {
        // Show all approved hospitals to guests and authenticated users
        setHospitals(response.data.data);
      } else {
        setError('Failed to load hospitals');
      }
    } catch (error: any) {
      console.error('Failed to load hospitals:', error);
      setError('Failed to load hospitals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortHospitals = () => {
    let filtered = [...hospitals];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(hospital =>
        hospital.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hospital.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hospital.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // City filter
    if (selectedCity) {
      filtered = filtered.filter(hospital => hospital.city === selectedCity);
    }

    // Resource availability filter
    if (selectedResourceType && minAvailable) {
      const minQty = parseInt(minAvailable);
      filtered = filtered.filter(hospital => {
        const resource = hospital.resources?.[selectedResourceType as keyof typeof hospital.resources];
        return resource && resource.available >= minQty;
      });
    }

    // Sort hospitals
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return b.rating - a.rating;
        case 'availability':
          const aTotal = getTotalAvailableResources(a);
          const bTotal = getTotalAvailableResources(b);
          return bTotal - aTotal;
        case 'city':
          return (a.city || '').localeCompare(b.city || '');
        default:
          return 0;
      }
    });

    setFilteredHospitals(filtered);
  };

  const getTotalAvailableResources = (hospital: Hospital) => {
    if (!hospital.resources) return 0;
    return (hospital.resources.beds?.available || 0) +
      (hospital.resources.icu?.available || 0) +
      (hospital.resources.operationTheatres?.available || 0);
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
      case 'beds': return 'Hospital Beds';
      case 'icu': return 'ICU';
      case 'operationTheatres': return 'Operation Theatres';
      default: return type;
    }
  };

  const getAvailabilityStatus = (available: number, total: number) => {
    const percentage = total > 0 ? (available / total) * 100 : 0;

    if (percentage >= 50) {
      return { color: 'text-green-600 bg-green-50 border-green-200', label: 'Good Availability' };
    } else if (percentage >= 20) {
      return { color: 'text-yellow-600 bg-yellow-50 border-yellow-200', label: 'Limited Availability' };
    } else if (percentage > 0) {
      return { color: 'text-orange-600 bg-orange-50 border-orange-200', label: 'Very Limited' };
    } else {
      return { color: 'text-red-600 bg-red-50 border-red-200', label: 'No Availability' };
    }
  };

  const handleBookNow = (hospital: Hospital) => {
    if (!isUserAuthenticated) {
      // Redirect to login with return URL for guests
      router.push(`/login?redirect=${encodeURIComponent(`/booking?hospitalId=${hospital.id}`)}`);
      return;
    }

    // Navigate to booking page with hospital pre-selected
    router.push(`/booking?hospitalId=${hospital.id}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCity('');
    setSelectedResourceType('');
    setMinAvailable('');
    setSortBy('name');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-lg text-gray-600">Loading hospitals...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Find Emergency Medical Care
              </h1>
              <p className="text-gray-600">
                Discover hospitals with available resources for immediate medical care.
                {!isUserAuthenticated && (
                  <span className="text-blue-600 font-medium"> Browse as guest or sign in to book resources.</span>
                )}
              </p>
            </div>
            {!isUserAuthenticated && (
              <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                <Users className="w-4 h-4" />
                <span>Guest Mode</span>
              </div>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
              <Button
                variant="outline"
                size="sm"
                onClick={loadHospitals}
                className="ml-4"
              >
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Search & Filter Hospitals
            </CardTitle>
            <CardDescription>
              Find hospitals that meet your specific needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Hospitals
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Hospital name, city, or type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="All cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All cities</SelectItem>
                    {cities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resource Type
                </label>
                <Select value={selectedResourceType} onValueChange={setSelectedResourceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All resources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All resources</SelectItem>
                    <SelectItem value="beds">Hospital Beds</SelectItem>
                    <SelectItem value="icu">ICU</SelectItem>
                    <SelectItem value="operationTheatres">Operation Theatres</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min. Available
                </label>
                <Input
                  type="number"
                  placeholder="1"
                  value={minAvailable}
                  onChange={(e) => setMinAvailable(e.target.value)}
                  min="1"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort by
                  </label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                      <SelectItem value="availability">Availability</SelectItem>
                      <SelectItem value="city">City</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-end gap-2">
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
                <Button onClick={loadHospitals} disabled={loading}>
                  <Search className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {filteredHospitals.length} of {hospitals.length} hospitals
            {searchTerm && ` matching "${searchTerm}"`}
            {selectedCity && ` in ${selectedCity}`}
          </p>
        </div>

        {/* Hospital Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredHospitals.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                No hospitals found
              </h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search criteria or filters.
              </p>
              <Button onClick={clearFilters} variant="outline">
                Clear All Filters
              </Button>
            </div>
          ) : (
            filteredHospitals.map((hospital) => (
              <Card key={hospital.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{hospital.name}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{hospital.city}, {hospital.state}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          <span>{hospital.type}</span>
                        </div>
                      </div>
                      {hospital.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="text-sm font-medium">{hospital.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="ml-4">
                      {getTotalAvailableResources(hospital)} Available
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Resource Availability */}
                  {hospital.resources && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-3">Resource Availability</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {Object.entries(hospital.resources).map(([type, resource]) => {
                          const status = getAvailabilityStatus(resource.available, resource.total);
                          return (
                            <div key={type} className={`p-3 rounded-lg border ${status.color}`}>
                              <div className="flex items-center gap-2 mb-1">
                                {getResourceIcon(type)}
                                <span className="text-sm font-medium">
                                  {getResourceLabel(type)}
                                </span>
                              </div>
                              <div className="text-lg font-bold">
                                {resource.available}/{resource.total}
                              </div>
                              <div className="text-xs opacity-75">
                                {status.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Contact Information */}
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                      {hospital.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span>{hospital.phone}</span>
                        </div>
                      )}
                      {hospital.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span>{hospital.email}</span>
                        </div>
                      )}
                      {hospital.emergency && (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Emergency: {hospital.emergency}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {getTotalAvailableResources(hospital) === 0 ? (
                      <Button
                        className="flex-1 bg-gray-400 cursor-not-allowed"
                        disabled
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        No Availability
                      </Button>
                    ) : !isUserAuthenticated ? (
                      <Tooltip content="Please log in to book hospital resources">
                        <Button
                          onClick={() => handleBookNow(hospital)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                          <LogIn className="w-4 h-4 mr-2" />
                          Login to Book
                        </Button>
                      </Tooltip>
                    ) : (
                      <Button
                        onClick={() => handleBookNow(hospital)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Book Now
                      </Button>
                    )}
                    <Link href={`/hospitals/${hospital.id}`}>
                      <Button variant="outline">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Quick Actions for Guests */}
        {!isUserAuthenticated && (
          <Card className="mt-8">
            <CardContent className="pt-6">
              <div className="text-center">
                <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  Ready to Book Emergency Care?
                </h3>
                <p className="text-gray-600 mb-4">
                  Sign in to your account to book medical resources instantly. You can browse all hospitals and their availability as a guest, but booking requires an account for secure payment processing.
                </p>
                <div className="flex gap-4 justify-center">
                  <Link href="/login">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="outline">
                      Create Account
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Information for Guests */}
        {!isUserAuthenticated && (
          <Card className="mt-6 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-2">
                    Guest Browsing Mode
                  </h4>
                  <p className="text-blue-800 text-sm">
                    You're currently browsing as a guest. You can view all approved hospitals and their real-time availability, but you'll need to log in to book resources. This ensures secure payment processing and proper booking management.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}