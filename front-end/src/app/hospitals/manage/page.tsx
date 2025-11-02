'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import AdminProtectedRoute from '@/components/AdminProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { hospitalAPI } from '@/lib/api';
import { Hospital } from '@/lib/types';
import { getCurrentUser, isHospitalAuthority } from '@/lib/auth';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Bed, 
  Heart, 
  Scissors,
  Star,
  Settings,
  Edit,
  Eye,
  ArrowLeft,
  Plus,
  Search,
  Calendar,
  Users
} from 'lucide-react';
import Link from 'next/link';
import ResourceManagementDashboard from '@/components/ResourceManagementDashboard';

export default function ManageHospitalsPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      // Admin users get all hospitals for management
      const response = await hospitalAPI.getAll();
      setHospitals(response.data.data);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHospitalUpdate = (updatedHospital: Hospital) => {
    setHospitals(prev => 
      prev.map(hospital => 
        hospital.id === updatedHospital.id ? updatedHospital : hospital
      )
    );
  };

  const filteredHospitals = hospitals.filter(hospital =>
    hospital.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hospital.address.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getResourceAvailability = (hospital: Hospital, resource: string) => {
    switch (resource) {
      case 'beds':
        return hospital.resources.beds.available;
      case 'icu':
        return hospital.resources.icu.available;
      case 'operationTheatres':
        return hospital.resources.operationTheatres.available;
      default:
        return 0;
    }
  };

  const getResourceColor = (available: number) => {
    if (available === 0) return 'bg-red-100 text-red-800';
    if (available < 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen">
        <Navigation />
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link href="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Medical Facilities</h1>
                <p className="text-gray-600">
                  Oversee your hospital network and maintain real-time resource availability for emergency care.
                </p>
              </div>
              <Link href="/hospitals/add">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Register Hospital
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Medical Facilities</p>
                    <p className="text-2xl font-bold">{hospitals.length}</p>
                  </div>
                  <Building2 className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Facilities</p>
                    <p className="text-2xl font-bold">
                      {hospitals.filter(h => h.isActive).length}
                    </p>
                  </div>
                  <Star className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Beds</p>
                    <p className="text-2xl font-bold">
                      {hospitals.reduce((sum, h) => sum + h.resources.beds.total, 0)}
                    </p>
                  </div>
                  <Bed className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Available Beds</p>
                    <p className="text-2xl font-bold">
                      {hospitals.reduce((sum, h) => sum + h.resources.beds.available, 0)}
                    </p>
                  </div>
                  <Heart className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Medical Facilities</Label>
                  <Input
                    id="search"
                    placeholder="Search by facility name or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hospitals List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading medical facilities...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHospitals.map((hospital) => (
                <Card key={hospital.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-lg">{hospital.name}</CardTitle>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium">{hospital.rating}</span>
                      </div>
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {hospital.address.city}, {hospital.address.state}
                    </CardDescription>
                    <div className="flex gap-2 mt-2">
                      <Badge className={getStatusColor(hospital.isActive)}>
                        {hospital.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Resource Availability */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Bed className="w-4 h-4" />
                          <span className="text-sm font-medium">Beds</span>
                        </div>
                        <Badge className={getResourceColor(hospital.resources.beds.available)}>
                          {hospital.resources.beds.available}/{hospital.resources.beds.total}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Heart className="w-4 h-4" />
                          <span className="text-sm font-medium">ICU</span>
                        </div>
                        <Badge className={getResourceColor(hospital.resources.icu.available)}>
                          {hospital.resources.icu.available}/{hospital.resources.icu.total}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Scissors className="w-4 h-4" />
                          <span className="text-sm font-medium">OT</span>
                        </div>
                        <Badge className={getResourceColor(hospital.resources.operationTheatres.available)}>
                          {hospital.resources.operationTheatres.available}/{hospital.resources.operationTheatres.total}
                        </Badge>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{hospital.contact.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{hospital.contact.email}</span>
                      </div>
                    </div>

                    {/* Services */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">Services:</h4>
                      <div className="flex flex-wrap gap-1">
                        {hospital.services.slice(0, 3).map((service, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                        {hospital.services.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{hospital.services.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="flex-1">
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                          </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{hospital.name}</DialogTitle>
                            <DialogDescription>
                              Detailed information about {hospital.name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-2">Address</h4>
                              <p className="text-sm text-gray-600">
                                {hospital.address.street}<br />
                                {hospital.address.city}, {hospital.address.state} {hospital.address.zipCode}<br />
                                {hospital.address.country}
                              </p>
                            </div>
                            <div>
                              <h4 className="font-medium mb-2">Contact Information</h4>
                              <div className="space-y-1 text-sm text-gray-600">
                                <p><strong>Phone:</strong> {hospital.contact.phone}</p>
                                <p><strong>Email:</strong> {hospital.contact.email}</p>
                                <p><strong>Emergency:</strong> {hospital.contact.emergency}</p>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-medium mb-2">Resources</h4>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="font-medium">Beds</p>
                                  <p className="text-gray-600">
                                    {hospital.resources.beds.available} available / {hospital.resources.beds.total} total
                                  </p>
                                </div>
                                <div>
                                  <p className="font-medium">ICU</p>
                                  <p className="text-gray-600">
                                    {hospital.resources.icu.available} available / {hospital.resources.icu.total} total
                                  </p>
                                </div>
                                <div>
                                  <p className="font-medium">Operation Theatres</p>
                                  <p className="text-gray-600">
                                    {hospital.resources.operationTheatres.available} available / {hospital.resources.operationTheatres.total} total
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-medium mb-2">Services</h4>
                              <div className="flex flex-wrap gap-1">
                                {hospital.services.map((service, index) => (
                                  <Badge key={index} variant="outline">
                                    {service}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-medium mb-2">Surgeons</h4>
                              {hospital.surgeons.length > 0 ? (
                                <div className="space-y-2">
                                  {hospital.surgeons.map((surgeon, index) => (
                                    <div key={index} className="text-sm">
                                      <p className="font-medium">{surgeon.name}</p>
                                      <p className="text-gray-600">{surgeon.specialization}</p>
                                      <Badge variant={surgeon.available ? "default" : "secondary"}>
                                        {surgeon.available ? 'Available' : 'Unavailable'}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-600">No surgeons listed</p>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Link href={`/hospitals/${hospital.id}/edit`} className="flex-1">
                        <Button className="w-full">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </Link>
                    </div>
                    
                    {/* Resource Management */}
                    <div className="flex justify-center">
                      <ResourceManagementDashboard 
                        hospital={hospital} 
                        onUpdate={handleHospitalUpdate}
                      />
                    </div>
                  </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && filteredHospitals.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No medical facilities found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery ? 'Please adjust your search criteria.' : 'Register your first hospital to join the RapidCare network.'}
              </p>
              <Link href="/hospitals/add">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Register Your Hospital
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </AdminProtectedRoute>
  );
} 