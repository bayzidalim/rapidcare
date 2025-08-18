'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import BookingApprovalInterface from '@/components/BookingApprovalInterface';
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
  Bed,
  Heart,
  Scissors,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';

export default function HospitalBookingsPage() {
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

  const handleBookingAction = (bookingId: number, action: 'approve' | 'decline', data: any) => {
    console.log(`Booking ${bookingId} ${action}ed:`, data);
    // You can add additional logic here, like showing notifications
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen">
          <Navigation />
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading hospital details...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !hospital) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen">
          <Navigation />
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Hospital Not Found</h1>
              <p className="text-gray-600 mb-6">{error || 'The requested hospital could not be found.'}</p>
              <Link href="/hospitals">
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Hospitals
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/hospitals" className="inline-flex items-center text-blue-600 hover:text-blue-800">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Hospitals
              </Link>
              <div className="h-4 border-l border-gray-300"></div>
              <Link href={`/hospitals/${hospitalId}/analytics`} className="inline-flex items-center text-green-600 hover:text-green-800">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Analytics
              </Link>
            </div>
            
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {hospital.name}
                </h1>
                <p className="text-gray-600 mb-4">
                  Booking Management Dashboard
                </p>
              </div>
              
              <Badge 
                variant={hospital.approvalStatus === 'approved' ? 'default' : 'secondary'}
                className="text-sm"
              >
                {hospital.approvalStatus || 'Active'}
              </Badge>
            </div>
          </div>

          {/* Hospital Info Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Hospital Information
              </CardTitle>
              <CardDescription>
                Basic information and current resource availability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    Location
                  </h4>
                  <p className="text-sm text-gray-600">
                    {hospital.address.street}<br />
                    {hospital.address.city}, {hospital.address.state} {hospital.address.zipCode}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    Contact
                  </h4>
                  <p className="text-sm text-gray-600">
                    {hospital.contact.phone}<br />
                    {hospital.contact.email}
                  </p>
                </div>
                
                {hospital.resources && (
                  <>
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Bed className="w-4 h-4 text-gray-500" />
                        Hospital Beds
                      </h4>
                      <p className="text-sm text-gray-600">
                        {hospital.resources.beds.available} available of {hospital.resources.beds.total}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-gray-500" />
                        ICU Beds
                      </h4>
                      <p className="text-sm text-gray-600">
                        {hospital.resources.icu.available} available of {hospital.resources.icu.total}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Booking Approval Interface */}
          <BookingApprovalInterface 
            hospitalId={hospitalId}
            onBookingAction={handleBookingAction}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}