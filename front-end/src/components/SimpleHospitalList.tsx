"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { hospitalAPI } from '@/lib/api';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Bed,
  Heart,
  Scissors,
  Search,
  Star,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react';

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

interface SimpleHospitalListProps {
  onHospitalSelect?: (hospital: Hospital) => void;
  showBookingButton?: boolean;
  className?: string;
}

const SimpleHospitalList: React.FC<SimpleHospitalListProps> = ({
  onHospitalSelect,
  showBookingButton = true,
  className
}) => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Simple fetch function
  const fetchHospitals = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await hospitalAPI.getHospitalsWithResources();
      
      if (response.data.success) {
        setHospitals(response.data.data);
      } else {
        setError('Failed to load hospitals');
      }
    } catch (err) {
      setError('Error loading hospitals');
      console.error('Error fetching hospitals:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load hospitals on mount
  useEffect(() => {
    fetchHospitals();
  }, []);

  // Simple search filter
  const filteredHospitals = hospitals.filter(hospital => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      hospital.name.toLowerCase().includes(searchLower) ||
      hospital.city?.toLowerCase().includes(searchLower) ||
      hospital.type.toLowerCase().includes(searchLower)
    );
  });

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

  if (loading) {
    return (
      <div className={className}>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading hospitals...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center text-red-800">
              <p>Error: {error}</p>
              <Button variant="outline" onClick={fetchHospitals} className="mt-2">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Simple Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Hospitals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by hospital name, city, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Hospital List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredHospitals.map((hospital) => (
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
                    {Object.entries(hospital.resources).map(([type, resource]) => (
                      <div key={type} className="p-3 rounded-lg border bg-gray-50">
                        <div className="flex items-center gap-2 mb-1">
                          {getResourceIcon(type)}
                          <span className="text-sm font-medium">
                            {getResourceLabel(type)}
                          </span>
                        </div>
                        <div className="text-lg font-bold">
                          {resource.available}/{resource.total}
                        </div>
                      </div>
                    ))}
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
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {showBookingButton && (
                  <Button 
                    onClick={() => onHospitalSelect?.(hospital)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={getTotalAvailableResources(hospital) === 0}
                  >
                    {getTotalAvailableResources(hospital) === 0 ? (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        No Availability
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Book Now
                      </>
                    )}
                  </Button>
                )}
                <Button variant="outline" onClick={() => onHospitalSelect?.(hospital)}>
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No results */}
      {filteredHospitals.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            No hospitals found
          </h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your search criteria.
          </p>
          <Button onClick={() => setSearchTerm('')} variant="outline">
            Clear Search
          </Button>
        </div>
      )}
    </div>
  );
};

export default SimpleHospitalList;