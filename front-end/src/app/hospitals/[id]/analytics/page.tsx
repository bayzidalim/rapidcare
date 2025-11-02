'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { hospitalAPI } from '@/lib/api';
import { Hospital } from '@/lib/types';
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Phone, 
  Mail,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';

export default function HospitalAnalyticsPage() {
  const params = useParams();
  const hospitalId = parseInt(params.id as string);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHospitalDetails();
  }, [hospitalId]);

  const fetchHospitalDetails = async () => {
    try {
      setLoading(true);
      const response = await hospitalAPI.getById(hospitalId);
      if (response.data.success) {
        setHospital(response.data.data);
      } else {
        setError('Failed to fetch hospital details');
      }
    } catch (err: any) {
      console.error('Error fetching hospital:', err);
      setError(err.response?.data?.error || 'Failed to fetch hospital details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedUserTypes={['hospital-authority', 'admin']}>
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading hospital details...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute allowedUserTypes={['hospital-authority', 'admin']}>
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
              <p className="text-red-600">{error}</p>
              <Button 
                onClick={fetchHospitalDetails} 
                className="mt-4"
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedUserTypes={['hospital-authority', 'admin']}>
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href={`/hospitals/${hospitalId}/bookings`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Bookings
              </Button>
            </Link>
            <div className="h-6 border-l border-gray-300"></div>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Dashboard
              </Button>
            </Link>
          </div>

          {hospital && (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Building2 className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl flex items-center gap-2">
                        {hospital.name}
                        <BarChart3 className="h-6 w-6 text-blue-600" />
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {hospital.address?.city}, {hospital.address?.state}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {hospital.contact?.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {hospital.contact?.email}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Analytics Dashboard
                  </Badge>
                </div>
              </CardHeader>
              
              {hospital.resources && (
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {hospital.resources.beds?.available || 0}
                      </div>
                      <div className="text-sm text-gray-600">Available Beds</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {hospital.resources.beds?.total || 0} total
                      </div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {hospital.resources.icu?.available || 0}
                      </div>
                      <div className="text-sm text-gray-600">Available ICU</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {hospital.resources.icu?.total || 0} total
                      </div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {hospital.resources.operationTheatres?.available || 0}
                      </div>
                      <div className="text-sm text-gray-600">Available OT</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {hospital.resources.operationTheatres?.total || 0} total
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>

        {/* Analytics Dashboard */}
        <AnalyticsDashboard hospitalId={hospitalId} />
      </div>
    </ProtectedRoute>
  );
}