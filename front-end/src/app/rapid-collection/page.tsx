'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  TestTube, 
  Hospital, 
  MapPin, 
  Clock, 
  Phone, 
  CheckCircle, 
  Search,
  User,
  Home,
  Calendar
} from 'lucide-react';
import { sampleCollectionAPI } from '@/lib/api';
import { isAuthenticated, getCurrentUser } from '@/lib/auth';
import Navigation from '@/components/Navigation';

interface Hospital {
  id: number;
  name: string;
  address: string;
  phone: string;
  available_tests: number;
}

interface TestType {
  id: number;
  name: string;
  description: string;
  sample_type: string;
  price_range: string;
  preparation_instructions: string;
  price?: number;
  home_collection_fee?: number;
  estimated_duration?: string;
}

interface PricingInfo {
  total: number;
  breakdown: Array<{
    name: string;
    price: number;
    homeCollectionFee: number;
    total: number;
  }>;
}

interface CollectionRequest {
  hospitalId: number;
  testTypeIds: number[];
  patientName: string;
  patientPhone: string;
  collectionAddress: string;
  preferredTime: string;
  specialInstructions: string;
}

export default function RapidCollectionPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [availableTests, setAvailableTests] = useState<TestType[]>([]);
  const [selectedTests, setSelectedTests] = useState<number[]>([]);
  const [pricing, setPricing] = useState<PricingInfo | null>(null);
  const [formData, setFormData] = useState<CollectionRequest>({
    hospitalId: 0,
    testTypeIds: [],
    patientName: '',
    patientPhone: '',
    collectionAddress: '',
    preferredTime: 'morning',
    specialInstructions: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState({
    hospitals: false,
    tests: false,
    pricing: false,
    submit: false
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [step, setStep] = useState(1); // 1: Select Hospital, 2: Select Tests, 3: Fill Details
  useEffect(() => {
    // Check authentication but allow browsing - only require login when selecting hospital
    const authenticated = isAuthenticated();
    
    if (authenticated) {
      const currentUser = getCurrentUser();
      setUser(currentUser);
      
      // Pre-fill user data for authenticated users
      if (currentUser) {
        setFormData(prev => ({
          ...prev,
          patientName: currentUser.name || '',
          patientPhone: currentUser.phone || ''
        }));
      }
    }

    const pendingData = localStorage.getItem('pendingRapidCollectionFormData');
    if (pendingData) {
      const formData = JSON.parse(pendingData);
      setFormData(formData);
      localStorage.removeItem('pendingRapidCollectionFormData');
    }

    loadHospitals();
  }, [router]);

  const loadHospitals = async () => {
    setLoading(prev => ({ ...prev, hospitals: true }));
    setError(null);

    try {
      const response = await sampleCollectionAPI.getHospitals();
      // Add computed address field for each hospital
      const hospitalsWithAddress = response.data.data.map((hospital: any) => ({
        ...hospital,
        address: `${hospital.street || ''}, ${hospital.city || ''}, ${hospital.state || ''} ${hospital.zipCode || ''}`.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '')
      }));
      setHospitals(hospitalsWithAddress);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load hospitals');
    } finally {
      setLoading(prev => ({ ...prev, hospitals: false }));
    }
  };

  const loadTestTypes = async (hospitalId: number) => {
    setLoading(prev => ({ ...prev, tests: true }));
    setError(null);

    try {
      const response = await sampleCollectionAPI.getHospitalTestTypes(hospitalId);
      setAvailableTests(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load test types');
    } finally {
      setLoading(prev => ({ ...prev, tests: false }));
    }
  };

  const calculatePricing = async (hospitalId: number, testIds: number[]) => {
    if (testIds.length === 0) {
      setPricing(null);
      return;
    }

    setLoading(prev => ({ ...prev, pricing: true }));

    try {
      const response = await sampleCollectionAPI.calculatePricing({
        hospitalId,
        testTypeIds: testIds
      });
      setPricing(response.data.data.pricing);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to calculate pricing');
    } finally {
      setLoading(prev => ({ ...prev, pricing: false }));
    }
  };

  const handleHospitalSelect = (hospital: Hospital) => {
    // Check if user is logged in before allowing hospital selection
    const authenticated = isAuthenticated();
    if (!authenticated) {
      // Store the selected hospital data and redirect to login
      localStorage.setItem('pendingRapidCollectionFormData', JSON.stringify({
        ...formData,
        hospitalId: hospital.id
      }));
      router.push('/login?redirect=/rapid-collection');
      return;
    }

    setSelectedHospital(hospital);
    setFormData(prev => ({ ...prev, hospitalId: hospital.id }));
    setSelectedTests([]);
    setPricing(null);
    loadTestTypes(hospital.id);
    setStep(2);
  };

  const handleTestToggle = (testId: number) => {
    const newSelectedTests = selectedTests.includes(testId)
      ? selectedTests.filter(id => id !== testId)
      : [...selectedTests, testId];
    
    setSelectedTests(newSelectedTests);
    setFormData(prev => ({ ...prev, testTypeIds: newSelectedTests }));
    
    if (selectedHospital) {
      calculatePricing(selectedHospital.id, newSelectedTests);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedHospital || selectedTests.length === 0) {
      setError('Please select a hospital and at least one test');
      return;
    }

    // Double-check authentication (should not happen since we check at hospital selection)
    const currentUser = getCurrentUser();
    if (!currentUser) {
      setError('Please log in to submit your collection request');
      return;
    }

    setLoading(prev => ({ ...prev, submit: true }));
    setError(null);

    try {
      const response = await sampleCollectionAPI.submitRequest(formData);
      
      // Authenticated user - redirect to dashboard
      setSuccess(`Collection request created successfully! ${response.data.message}`);
      setTimeout(() => {
        router.push('/dashboard?tab=collections');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };

  const filteredHospitals = hospitals.filter(hospital =>
    hospital.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hospital.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show loading screen while checking authentication

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted Successfully!</h1>
                <p className="text-gray-600 mb-4">{success}</p>
                <p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
            <TestTube className="w-10 h-10 text-blue-600" />
            Rapid Collection
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Request home sample collection for medical tests. Browse hospitals and select your tests. 
            You'll need to log in when you're ready to make a selection.
          </p>
        </div>

        {/* Guest User Information Banner */}
        {!user && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-900 mb-1">
                    Login Required for Selection
                  </h3>
                  <p className="text-sm text-blue-700 mb-2">
                    You can browse hospitals and test options, but you'll need to 
                    <Link href="/login" className="font-medium underline hover:text-blue-800 ml-1">log in</Link> 
                    when you're ready to select a hospital and proceed with your collection request.
                  </p>
                  <div className="text-xs text-blue-600">
                    ✓ Browse hospitals • ✓ View test options • ✓ Login when ready to book
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${
              step >= 1 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
            }`}>
              <Hospital className="w-4 h-4" />
              <span className="font-medium">Select Hospital</span>
            </div>
            <div className={`w-8 h-0.5 transition-all ${
              step >= 2 ? 'bg-blue-400' : 'bg-gray-300'
            }`} />
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${
              step >= 2 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
            }`}>
              <TestTube className="w-4 h-4" />
              <span className="font-medium">Select Tests</span>
            </div>
            <div className={`w-8 h-0.5 transition-all ${
              step >= 3 ? 'bg-blue-400' : 'bg-gray-300'
            }`} />
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${
              step >= 3 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
            }`}>
              <User className="w-4 h-4" />
              <span className="font-medium">Patient Details</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto">
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Step 1: Select Hospital</h2>
              
              {/* Search */}
              <div className="mb-6">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search hospitals..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Hospitals Grid */}
              {loading.hospitals ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-4 bg-gray-200 rounded mb-2" />
                        <div className="h-3 bg-gray-200 rounded mb-4" />
                        <div className="h-8 bg-gray-200 rounded" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredHospitals.map(hospital => (
                    <Card key={hospital.id} className="hover:shadow-lg transition-shadow cursor-pointer group" 
                          onClick={() => handleHospitalSelect(hospital)}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <Hospital className="w-8 h-8 text-blue-600 group-hover:scale-110 transition-transform" />
                          <Badge variant="secondary">
                            {hospital.available_tests} tests available
                          </Badge>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">
                          {hospital.name}
                        </h3>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4" />
                            <span>{hospital.address}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4" />
                            <span>{hospital.phone}</span>
                          </div>
                        </div>
                        <Button className="w-full mt-4 group-hover:bg-blue-700 transition-colors">
                          Select Hospital
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!loading.hospitals && filteredHospitals.length === 0 && (
                <div className="text-center py-12">
                  <Hospital className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hospitals found</h3>
                  <p className="text-gray-600">Try adjusting your search terms.</p>
                </div>
              )}
            </div>
          )}

          {step === 2 && selectedHospital && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Step 2: Select Tests</h2>
                <Button variant="outline" onClick={() => setStep(1)}>
                  Change Hospital
                </Button>
              </div>

              {/* Selected Hospital Info */}
              <Card className="mb-6 bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <Hospital className="w-8 h-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-blue-900">{selectedHospital.name}</h3>
                      <p className="text-blue-700">{selectedHospital.address}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Available Tests */}
              {loading.tests ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="h-4 bg-gray-200 rounded mb-2" />
                        <div className="h-3 bg-gray-200 rounded mb-2" />
                        <div className="h-6 bg-gray-200 rounded" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    {availableTests.map(test => (
                      <Card key={test.id} 
                            className={`cursor-pointer transition-all ${
                              selectedTests.includes(test.id)
                                ? 'ring-2 ring-blue-500 bg-blue-50'
                                : 'hover:shadow-md'
                            }`}
                            onClick={() => handleTestToggle(test.id)}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <TestTube className={`w-5 h-5 ${
                                selectedTests.includes(test.id) ? 'text-blue-600' : 'text-gray-500'
                              }`} />
                              <h3 className={`font-semibold ${
                                selectedTests.includes(test.id) ? 'text-blue-900' : 'text-gray-900'
                              }`}>
                                {test.name}
                              </h3>
                            </div>
                            {selectedTests.includes(test.id) && (
                              <CheckCircle className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{test.description}</p>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">
                              {test.sample_type}
                            </Badge>
                            <span className="text-sm font-medium text-green-600">
                              {test.price_range}
                            </span>
                          </div>
                          {test.preparation_instructions && (
                            <p className="text-xs text-gray-500 mt-2">
                              {test.preparation_instructions}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Pricing Summary */}
                  {pricing && (
                    <Card className="bg-green-50 border-green-200">
                      <CardHeader>
                        <CardTitle className="text-green-900">Estimated Cost</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {pricing.breakdown.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{item.name}</span>
                              <span>৳{item.total}</span>
                            </div>
                          ))}
                          <div className="border-t pt-2 flex justify-between font-semibold text-green-800">
                            <span>Total (including home collection)</span>
                            <span>৳{pricing.total}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {selectedTests.length > 0 && (
                    <div className="mt-6 text-center">
                      <Button onClick={() => setStep(3)} size="lg">
                        Continue to Details
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Step 3: Patient Details</h2>
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back to Tests
                </Button>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                {/* Form */}
                <Card>
                  <CardHeader>
                    <CardTitle>Collection Information</CardTitle>
                    <CardDescription>
                      Please provide the details for sample collection
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="patientName">Patient Name *</Label>
                        <Input
                          id="patientName"
                          type="text"
                          value={formData.patientName}
                          onChange={(e) => setFormData(prev => ({ ...prev, patientName: e.target.value }))}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="patientPhone">Patient Phone *</Label>
                        <Input
                          id="patientPhone"
                          type="tel"
                          value={formData.patientPhone}
                          onChange={(e) => setFormData(prev => ({ ...prev, patientPhone: e.target.value }))}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="collectionAddress">Collection Address *</Label>
                        <Textarea
                          id="collectionAddress"
                          value={formData.collectionAddress}
                          onChange={(e) => setFormData(prev => ({ ...prev, collectionAddress: e.target.value }))}
                          placeholder="Enter complete address with landmarks"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="preferredTime">Preferred Time</Label>
                        <select
                          id="preferredTime"
                          value={formData.preferredTime}
                          onChange={(e) => setFormData(prev => ({ ...prev, preferredTime: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="morning">Morning (8 AM - 12 PM)</option>
                          <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
                          <option value="evening">Evening (5 PM - 8 PM)</option>
                          <option value="anytime">Anytime</option>
                        </select>
                      </div>
                      
                      <div>
                        <Label htmlFor="specialInstructions">Special Instructions</Label>
                        <Textarea
                          id="specialInstructions"
                          value={formData.specialInstructions}
                          onChange={(e) => setFormData(prev => ({ ...prev, specialInstructions: e.target.value }))}
                          placeholder="Any special instructions for the collection agent"
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full" 
                        size="lg"
                        disabled={loading.submit}
                      >
                        {loading.submit ? 'Submitting...' : 'Submit Collection Request'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Summary */}
                <div className="space-y-6">
                  {/* Selected Hospital */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Hospital className="w-5 h-5" />
                        <span>Selected Hospital</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <h3 className="font-semibold">{selectedHospital?.name}</h3>
                      <p className="text-sm text-gray-600">{selectedHospital?.address}</p>
                    </CardContent>
                  </Card>

                  {/* Selected Tests */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <TestTube className="w-5 h-5" />
                        <span>Selected Tests</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {availableTests
                          .filter(test => selectedTests.includes(test.id))
                          .map(test => (
                            <div key={test.id} className="flex justify-between items-center">
                              <span className="text-sm">{test.name}</span>
                              <Badge variant="outline">{test.sample_type}</Badge>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pricing */}
                  {pricing && (
                    <Card className="bg-green-50 border-green-200">
                      <CardHeader>
                        <CardTitle className="text-green-900">Total Cost</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-800">৳{pricing.total}</div>
                        <p className="text-sm text-green-600 mt-1">
                          Including home collection fees
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}