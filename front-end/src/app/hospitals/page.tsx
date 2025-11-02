'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { hospitalAPI, pricingAPI } from '@/lib/api';
import { Hospital } from '@/lib/types';
import { HospitalDetailModal } from '@/components/HospitalDetailModal';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Bed, 
  Heart, 
  Scissors,
  Star,
  Search,
  Filter,
  ArrowRight,
  DollarSign,
  Clock,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedService, setSelectedService] = useState('all');
  const [resourceType, setResourceType] = useState('all');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchHospitals();
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      setIsAuthenticated(!!token);
    } catch {}
  }, []);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const response = await hospitalAPI.getAll();
      const hospitalsData = response.data.data;
      
      // Fetch pricing for each hospital
      const hospitalsWithPricing = await Promise.all(
        hospitalsData.map(async (hospital: Hospital) => {
          try {
            const pricingResponse = await pricingAPI.getHospitalPricing(hospital.id);
            const pricingData = pricingResponse.data.data;
            
            // Organize pricing by resource type (handle both 'bed'/'beds' variations)
            type PricingItem = { resourceType?: string; baseRate?: number; hourlyRate?: number; minimumCharge?: number; maximumCharge?: number; currency?: string };
            const pricing = {
              beds: pricingData.find((p: PricingItem) => p.resourceType === 'beds' || p.resourceType === 'bed') || {
                baseRate: 0,
                hourlyRate: 0,
                minimumCharge: 0,
                maximumCharge: 0,
                currency: 'BDT'
              },
              icu: pricingData.find((p: PricingItem) => p.resourceType === 'icu') || {
                baseRate: 0,
                hourlyRate: 0,
                minimumCharge: 0,
                maximumCharge: 0,
                currency: 'BDT'
              },
              operationTheatres: pricingData.find((p: PricingItem) => p.resourceType === 'operationTheatres' || p.resourceType === 'operationTheater') || {
                baseRate: 0,
                hourlyRate: 0,
                minimumCharge: 0,
                maximumCharge: 0,
                currency: 'BDT'
              }
            };
            
            return { ...hospital, pricing };
          } catch (error) {
            console.warn(`Failed to fetch pricing for hospital ${hospital.id}:`, error);
            return hospital;
          }
        })
      );
      
      setHospitals(hospitalsWithPricing);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (searchQuery) params.q = searchQuery;
      if (selectedCity && selectedCity !== 'all') params.city = selectedCity;
      if (selectedService && selectedService !== 'all') params.service = selectedService;
      if (resourceType && resourceType !== 'all') params.resourceType = resourceType;

      const response = await hospitalAPI.search(params);
      setHospitals(response.data.data);
    } catch (error) {
      console.error('Error searching hospitals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getResourceAvailability = (hospital: Hospital, resource: string) => {
    if (!hospital.resources) return 0;
    
    switch (resource) {
      case 'beds':
        return hospital.resources.beds?.available || 0;
      case 'icu':
        return hospital.resources.icu?.available || 0;
      case 'operationTheatres':
        return hospital.resources.operationTheatres?.available || 0;
      default:
        return 0;
    }
  };

  const getResourceColor = (available: number) => {
    if (available === 0) return 'bg-red-100 text-red-800';
    if (available < 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const formatPrice = (price: number, currency: string = 'BDT') => {
    if (currency === 'BDT') {
      return `৳${price.toLocaleString()}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const getPricingDisplay = (pricing: { baseRate?: number; hourlyRate?: number; currency?: string } | undefined) => {
    if (!pricing || pricing.baseRate === 0) return 'Pricing not available';
    
    const basePrice = formatPrice(pricing.baseRate, pricing.currency);
    if (pricing.hourlyRate && pricing.hourlyRate > 0) {
      const hourlyPrice = formatPrice(pricing.hourlyRate, pricing.currency);
      return `${basePrice}/day + ${hourlyPrice}/hr`;
    }
    return `${basePrice}/day`;
  };

  const handleViewDetails = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedHospital(null);
  };

  const cities = Array.from(new Set(hospitals.map(h => h.address.city)));
  const services = Array.from(new Set(hospitals.flatMap(h => h.services)));

  return (
    <div className="min-h-screen">
        <Navigation />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Find Emergency Care
          </h1>
          <p className="text-lg text-gray-600">
            Locate hospitals with available resources for immediate medical care when every second counts.
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search & Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Hospital name or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {cities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="service">Service</Label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {services.map(service => (
                      <SelectItem key={service} value={service}>{service}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="resource">Resource Type</Label>
                <Select value={resourceType} onValueChange={setResourceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select resource" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Resources</SelectItem>
                    <SelectItem value="beds">Beds</SelectItem>
                    <SelectItem value="icu">ICU</SelectItem>
                    <SelectItem value="operationTheatres">Operation Theatres</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSearch} className="w-full md:w-auto">
              <Search className="w-4 h-4 mr-2" />
              Find Care Now
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Finding available medical facilities...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hospitals.map((hospital) => (
              <Card key={hospital.id} className="hover:shadow-lg transition-all duration-300 flex flex-col h-full border-2 hover:border-blue-200">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-lg font-semibold text-gray-900">{hospital.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium text-gray-700">{hospital.rating || 'N/A'}</span>
                    </div>
                  </div>
                  <CardDescription className="flex items-center gap-1 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    {hospital.address.city}, {hospital.address.state}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="flex flex-col flex-grow pt-0">
                  <div className="flex-grow">
                    {/* Resource Availability & Pricing */}
                    {hospital.resources && (
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-center gap-1 mb-2">
                          <Bed className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-700">Beds</span>
                        </div>
                        <Badge className={`${getResourceColor(hospital.resources.beds?.available || 0)} text-xs`}>
                          {hospital.resources.beds?.available || 0} available
                        </Badge>
                        {hospital.pricing?.beds && hospital.pricing.beds.baseRate > 0 ? (
                          <div className="mt-2">
                            <div className="text-xs font-semibold text-blue-700 flex items-center justify-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {formatPrice(hospital.pricing.beds.baseRate, hospital.pricing.beds.currency)}/day
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2">
                            <div className="text-xs text-gray-500 text-center">
                              Price on request
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-center bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-center gap-1 mb-2">
                          <Heart className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-gray-700">ICU</span>
                        </div>
                        <Badge className={`${getResourceColor(hospital.resources.icu?.available || 0)} text-xs`}>
                          {hospital.resources.icu?.available || 0} available
                        </Badge>
                        {hospital.pricing?.icu && hospital.pricing.icu.baseRate > 0 ? (
                          <div className="mt-2">
                            <div className="text-xs font-semibold text-blue-700 flex items-center justify-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {formatPrice(hospital.pricing.icu.baseRate, hospital.pricing.icu.currency)}/day
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2">
                            <div className="text-xs text-gray-500 text-center">
                              Price on request
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-center bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-center gap-1 mb-2">
                          <Scissors className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-gray-700">OT</span>
                        </div>
                        <Badge className={`${getResourceColor(hospital.resources.operationTheatres?.available || 0)} text-xs`}>
                          {hospital.resources.operationTheatres?.available || 0} available
                        </Badge>
                        {hospital.pricing?.operationTheatres && hospital.pricing.operationTheatres.baseRate > 0 ? (
                          <div className="mt-2">
                            <div className="text-xs font-semibold text-blue-700 flex items-center justify-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {formatPrice(hospital.pricing.operationTheatres.baseRate, hospital.pricing.operationTheatres.currency)}/day
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2">
                            <div className="text-xs text-gray-500 text-center">
                              Price on request
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    )}

                    {/* Pricing Summary */}
                    {hospital.pricing && (hospital.pricing.beds.baseRate > 0 || hospital.pricing.icu.baseRate > 0 || hospital.pricing.operationTheatres.baseRate > 0) && (
                      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-semibold text-blue-900">Starting Prices</span>
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                            Compare & Save
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          {hospital.pricing.beds.baseRate > 0 && (
                            <div className="flex justify-between items-center bg-white/60 rounded px-2 py-1">
                              <span className="text-gray-700">🛏️ General Beds:</span>
                              <span className="font-bold text-blue-800">{formatPrice(hospital.pricing.beds.baseRate, hospital.pricing.beds.currency)}/day</span>
                            </div>
                          )}
                          {hospital.pricing.icu.baseRate > 0 && (
                            <div className="flex justify-between items-center bg-white/60 rounded px-2 py-1">
                              <span className="text-gray-700">🏥 ICU Beds:</span>
                              <span className="font-bold text-blue-800">{formatPrice(hospital.pricing.icu.baseRate, hospital.pricing.icu.currency)}/day</span>
                            </div>
                          )}
                          {hospital.pricing.operationTheatres.baseRate > 0 && (
                            <div className="flex justify-between items-center bg-white/60 rounded px-2 py-1">
                              <span className="text-gray-700">⚕️ Operation Theatre:</span>
                              <span className="font-bold text-blue-800">{formatPrice(hospital.pricing.operationTheatres.baseRate, hospital.pricing.operationTheatres.currency)}/day</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-blue-600 text-center">
                          💡 Prices may vary based on specific requirements
                        </div>
                      </div>
                    )}

                    {/* Contact Info */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span className="truncate">{hospital.contact.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{hospital.contact.email}</span>
                      </div>
                    </div>

                    {/* Services */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2 text-gray-700">Services:</h4>
                      <div className="flex flex-wrap gap-1">
                        {hospital.services.slice(0, 3).map((service, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-white">
                            {service}
                          </Badge>
                        ))}
                        {hospital.services.length > 3 && (
                          <Badge variant="outline" className="text-xs bg-white">
                            +{hospital.services.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions - Always at bottom */}
                  <div className="flex gap-2 mt-auto pt-4 border-t border-gray-100">
                    <Button 
                      variant="outline" 
                      className="flex-1 text-sm"
                      onClick={() => handleViewDetails(hospital)}
                    >
                      View Details
                    </Button>
                    {isAuthenticated ? (
                      <Link href={`/booking?hospitalId=${hospital.id}`} className="flex-1">
                        <Button className="w-full text-sm bg-blue-600 hover:bg-blue-700">
                          Book Resources
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/login?next=${encodeURIComponent(`/booking?hospitalId=${hospital.id}`)}`} className="flex-1">
                        <Button className="w-full text-sm bg-blue-600 hover:bg-blue-700">
                          Login to Book
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && hospitals.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No medical facilities found</h3>
            <p className="text-gray-600">Please adjust your search criteria or try a different location.</p>
          </div>
        )}
      </div>

      {/* Hospital Detail Modal */}
      <HospitalDetailModal
        hospital={selectedHospital}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
} 