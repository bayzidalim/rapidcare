'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import AnimatedPage, { ScrollReveal, AnimatedList, AnimatedListItem } from '@/components/AnimatedPage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { bookingAPI, bloodAPI, hospitalAPI, paymentAPI } from '@/lib/api';
import { Booking, BloodRequest, Transaction, Hospital, User as UserType } from '@/lib/types';
import { getCurrentUser, isHospitalAuthority, isAuthenticated, isAdmin } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import PaymentHistoryCard from '@/components/PaymentHistoryCard';
import BookingCardWithPayment from '@/components/BookingCardWithPayment';
import ResourceManagementDashboard from '@/components/ResourceManagementDashboard';
import HospitalApprovalStatus from '@/components/HospitalApprovalStatus';
import HospitalPricingManagement from '@/components/HospitalPricingManagement';
import BookingApprovalInterface from '@/components/BookingApprovalInterface';
import SampleCollectionApproval from '@/components/SampleCollectionApproval';
import {
  Calendar,
  Heart,
  Bed,
  Scissors,
  MapPin,
  Clock,
  User,
  Phone,
  Building2,
  ArrowRight,
  Plus,
  Settings,
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Users,
  Activity,
  UserCheck,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bloodRequests, setBloodRequests] = useState<BloodRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [hospitalLoading, setHospitalLoading] = useState(false);
  const [, setUser] = useState<UserType | null>(null);
  const [isAuthority, setIsAuthority] = useState(false);
  const [hospitalError, setHospitalError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);

  useEffect(() => {
    // Check authentication and redirect admins
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    if (isAdmin()) {
      router.push('/admin');
      return;
    }
    
    const currentUser = getCurrentUser();
    const userIsAuthority = isHospitalAuthority();
    
    setUser(currentUser);
    setIsAuthority(userIsAuthority);
    
    // Fetch data with the current user context
    fetchUserData(currentUser, userIsAuthority);
  }, [router]);

  const fetchUserData = async (currentUser?: UserType | null, userIsAuthority?: boolean) => {
    try {
      console.log('Fetching user data for:', currentUser, 'Is authority:', userIsAuthority);
      setLoading(true);
      const userId = currentUser?.id || 1; // In a real app, this would come from auth
      
      // Fetch data individually to handle errors separately
      try {
        console.log('Fetching bookings...');
        // Using getMyBookings instead of getUserBookings as it seems to be the correct endpoint
        const bookingsResponse = await bookingAPI.getMyBookings();
        console.log('Bookings response:', bookingsResponse);
        if (bookingsResponse.data && bookingsResponse.data.data) {
          setBookings(bookingsResponse.data.data);
        } else {
          setBookings([]);
        }
      } catch (error: unknown) {
        const err = error as { response?: { status?: number } };
        const message = (error as Error)?.message ?? String(error);
        // Handle 401/403 errors specifically (authentication issues)
        if (err.response?.status === 401 || err.response?.status === 403) {
          // Token might be expired, redirect to login
          console.log('Authentication error, redirecting to login');
          router.push('/login');
          return;
        }
        // For 404 errors, this might just mean no bookings exist, not an auth issue
        if (err.response?.status === 404) {
          console.log('No bookings found for user');
          setBookings([]);
        } else {
          console.error('Error fetching bookings:', message || 'Unknown error');
          setBookings([]);
        }
      }
      
      try {
        console.log('Fetching blood requests...');
        const bloodRequestsResponse = await bloodAPI.getMyRequests();
        console.log('Blood requests response:', bloodRequestsResponse);
        if (bloodRequestsResponse.data && bloodRequestsResponse.data.data) {
          setBloodRequests(bloodRequestsResponse.data.data);
        } else {
          setBloodRequests([]);
        }
      } catch (error: unknown) {
        const err = error as { response?: { status?: number; statusText?: string; data?: unknown } };
        const message = (error as Error)?.message ?? String(error);
        console.error('Error fetching blood requests:', message);
        console.log('Blood requests error details:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data
        });
        // Handle 401/403 errors specifically (authentication issues)
        if (err.response?.status === 401 || err.response?.status === 403) {
          // Token might be expired, redirect to login
          console.log('Authentication error, redirecting to login');
          router.push('/login');
          return;
        }
        // For 404 errors, this might just mean no blood requests exist, not an auth issue
        if (err.response?.status === 404) {
          console.log('No blood requests found for user');
          setBloodRequests([]);
        } else {
          const message = (error as Error)?.message ?? String(error);
          console.error('Error fetching blood requests:', message || 'Unknown error');
          setBloodRequests([]);
        }
      }
      
      try {
        console.log('Fetching payment history...');
        await fetchPaymentHistory();
      } catch (error: unknown) {
        const err = error as { response?: { status?: number; statusText?: string; data?: unknown } };
        const message = (error as Error)?.message ?? String(error);
        console.error('Error fetching payment history:', message);
        console.log('Payment history error details:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data
        });
        // Handle 401/403 errors specifically (authentication issues)
        if (err.response?.status === 401 || err.response?.status === 403) {
          // Token might be expired, redirect to login
          console.log('Authentication error, redirecting to login');
          router.push('/login');
          return;
        }
        // For 404 errors, this might just mean no payment history exists, not an auth issue
        if (err.response?.status === 404) {
          console.log('No payment history found for user');
          setTransactions([]);
        } else {
          const message = (error as Error)?.message ?? String(error);
          console.error('Error fetching payment history:', message || 'Unknown error');
          setTransactions([]);
        }
      }
      
      // If user is hospital authority, also fetch their hospital data
      if (userIsAuthority) {
        try {
          console.log('Fetching hospital data for authority user...');
          await fetchHospitalData();
        } catch (error: unknown) {
          const err = error as { response?: { status?: number; statusText?: string; data?: unknown } };
          const message = (error as Error)?.message ?? String(error);
          console.error('Error fetching hospital data:', message);
          console.log('Hospital data error details:', {
            status: err.response?.status,
            statusText: err.response?.statusText,
            data: err.response?.data
          });
          // Handle 401/403 errors specifically (authentication issues)
          if (err.response?.status === 401 || err.response?.status === 403) {
            // Token might be expired, redirect to login
            console.log('Authentication error, redirecting to login');
            router.push('/login');
            return;
          }
          // For 404 errors, this might mean no hospital data exists for this user
          if (err.response?.status === 404) {
            console.log('No hospital data found for authority user');
            setHospital(null);
          } else {
            setHospital(null);
          }
        }
      }
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      // Handle 401/403 errors specifically (authentication issues)
      if (err.response?.status === 401 || err.response?.status === 403) {
        // Token might be expired, redirect to login
        console.log('Authentication error, redirecting to login');
        router.push('/login');
        return;
      }
      const message = (error as Error)?.message ?? String(error);
      console.error('Error fetching user data:', message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchHospitalData = async () => {
    try {
      setHospitalLoading(true);
      setHospitalError('');
      
      console.log('Fetching hospital data...');
      const response = await hospitalAPI.getMyHospital();
      console.log('Hospital data response:', response);
      if (response.data && response.data.success) {
        setHospital(response.data.data);
      }
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      // Handle 401/403 errors specifically (authentication issues)
      if (err.response?.status === 401 || err.response?.status === 403) {
        // Token might be expired, redirect to login
        console.log('Authentication error, redirecting to login');
        router.push('/login');
        return;
      }
      // For 404 errors, this might mean no hospital data exists for this user
      if (err.response?.status === 404) {
        console.log('No hospital data found for user');
        setHospital(null);
      } else {
        const message = (error as Error)?.message ?? String(error);
        console.error('Error fetching hospital data:', message || 'Unknown error');
        const errorWithResponse = error as { response?: { data?: { error?: string } } };
        setHospitalError(errorWithResponse.response?.data?.error || 'Failed to load hospital data');
      }
    } finally {
      setHospitalLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      setPaymentLoading(true);
      
      console.log('Fetching payment history...');
      const response = await paymentAPI.getPaymentHistory();
      console.log('Payment history response:', response);
      if (response.data && response.data.success) {
        setTransactions(response.data.data);
      }
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      // Handle 401/403 errors specifically (authentication issues)
      if (err.response?.status === 401 || err.response?.status === 403) {
        // Token might be expired, redirect to login
        console.log('Authentication error, redirecting to login');
        router.push('/login');
        return;
      }
      // For 404 errors, this might just mean no payment history exists, not an auth issue
      if (err.response?.status === 404) {
        console.log('No payment history found for user');
        setTransactions([]);
      } else {
        const message = (error as Error)?.message ?? String(error);
        console.error('Error fetching payment history:', message || 'Unknown error');
        setTransactions([]);
      }
    } finally {
      setPaymentLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'bed':
      case 'beds': return <Bed className="w-4 h-4" />;
      case 'icu': return <Heart className="w-4 h-4" />;
      case 'operationTheatre':
      case 'operationTheatres': return <Scissors className="w-4 h-4" />;
      default: return <Bed className="w-4 h-4" />;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your RapidCare dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {isAuthority ? 'RapidCare Medical Facility Dashboard' : 'RapidCare Dashboard'}
              </h1>
              <p className="text-gray-600">
                {isAuthority 
                  ? hospital 
                    ? `Manage emergency resources and patient bookings for ${hospital.name}`
                    : 'Manage your medical facility resources and emergency patient care.'
                  : 'Access emergency medical resources and manage your healthcare bookings.'
                }
              </p>
              {isAuthority && hospital && (
                <div className="flex items-center gap-2 mt-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-600 font-medium">{hospital.name}</span>
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm text-gray-500">{hospital.address?.city}, {hospital.address?.state}</span>
                </div>
              )}
            </div>
            {!isAuthority && (
              <div className="flex gap-2">
                <Link href="/hospitals">
                  <Button variant="outline">
                    <Building2 className="w-4 h-4 mr-2" />
                    Find Emergency Care
                  </Button>
                </Link>
                <Link href="/booking">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Book Emergency Resources
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Hospital Authority Approval Status - Prominent Display */}
        {isAuthority && (
          <div className="mb-8">
            {hospital ? (
              <HospitalApprovalStatus 
                hospital={hospital} 
                onUpdate={(updatedHospital) => setHospital(updatedHospital)}
              />
            ) : hospitalLoading ? (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <div>
                      <h3 className="font-semibold text-blue-900">Loading Facility Status</h3>
                      <p className="text-blue-700 text-sm">
                        Retrieving your medical facility verification status...
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-8 h-8 text-yellow-600" />
                    <div>
                      <h3 className="font-semibold text-yellow-900">No Medical Facility Registered</h3>
                      <p className="text-yellow-700 text-sm">
                        No medical facility is associated with your account. Medical facility representatives should have a facility assigned during registration.
                      </p>
                      <p className="text-yellow-700 text-sm mt-1">
                        Please contact RapidCare support if you believe this is an error.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {isAuthority && hospital && hospital.approvalStatus === 'approved' ? (
            // Hospital Authority Stats - Only for approved hospitals
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Beds</p>
                      <p className="text-2xl font-bold">{hospital.resources?.beds?.total || 0}</p>
                      <p className="text-xs text-gray-500">
                        {hospital.resources?.beds?.available || 0} available
                      </p>
                    </div>
                    <Bed className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">ICU Beds</p>
                      <p className="text-2xl font-bold">{hospital.resources?.icu?.total || 0}</p>
                      <p className="text-xs text-gray-500">
                        {hospital.resources?.icu?.available || 0} available
                      </p>
                    </div>
                    <Heart className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Operation Theatres</p>
                      <p className="text-2xl font-bold">{hospital.resources?.operationTheatres?.total || 0}</p>
                      <p className="text-xs text-gray-500">
                        {hospital.resources?.operationTheatres?.available || 0} available
                      </p>
                    </div>
                    <Scissors className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Facility Rating</p>
                      <p className="text-2xl font-bold">{hospital.rating?.toFixed(1) || 'N/A'}</p>
                      <p className="text-xs text-gray-500">
                        {hospital.surgeons?.length || 0} surgeons
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </>
          ) : isAuthority && hospital && hospital.approvalStatus !== 'approved' ? (
            // Hospital Authority with non-approved status - Limited stats
            <>
              <Card className="opacity-60">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Facility Status</p>
                      <p className="text-2xl font-bold capitalize">{hospital.approvalStatus}</p>
                      <p className="text-xs text-gray-500">
                        {hospital.approvalStatus === 'pending' ? 'Under review' : 'Needs attention'}
                      </p>
                    </div>
                    <Building2 className="w-8 h-8 text-gray-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="opacity-60">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Submitted</p>
                      <p className="text-lg font-bold">
                        {hospital.submittedAt ? new Date(hospital.submittedAt).toLocaleDateString() : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">Registration date</p>
                    </div>
                    <Calendar className="w-8 h-8 text-gray-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="opacity-60">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Services</p>
                      <p className="text-2xl font-bold">{hospital.services?.length || 0}</p>
                      <p className="text-xs text-gray-500">Offered services</p>
                    </div>
                    <Activity className="w-8 h-8 text-gray-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="opacity-60">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Access Level</p>
                      <p className="text-2xl font-bold">Limited</p>
                      <p className="text-xs text-gray-500">Pending verification</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            // Regular User Stats
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                      <p className="text-2xl font-bold">{bookings.length}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Bookings</p>
                      <p className="text-2xl font-bold">
                        {bookings.filter(b => ['pending', 'confirmed', 'in-progress'].includes(b.status)).length}
                      </p>
                    </div>
                    <Bed className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Spent</p>
                      <p className="text-2xl font-bold">
                        ৳{transactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-BD')}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Blood Requests</p>
                      <p className="text-2xl font-bold">{bloodRequests.length}</p>
                    </div>
                    <Heart className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Hospital Authority Resource Management - Only for approved hospitals */}
        {isAuthority && hospital && hospital.approvalStatus === 'approved' && (
          <div className="mb-8">
            <ResourceManagementDashboard 
              hospital={hospital} 
              onUpdate={(updatedHospital) => setHospital(updatedHospital)}
            />
          </div>
        )}

        {/* Hospital Loading Error */}
        {isAuthority && hospitalError && (
          <div className="mb-8">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                  <div>
                    <h3 className="font-semibold text-red-900">Error Loading Facility Data</h3>
                    <p className="text-red-700 text-sm">{hospitalError}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => fetchHospitalData()}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue={isAuthority && hospital?.approvalStatus === 'approved' ? "hospital-bookings" : isAuthority ? "hospital-status" : "bookings"} className="space-y-6">
          <TabsList>
            {isAuthority && hospital?.approvalStatus === 'approved' ? (
              <>
                <TabsTrigger value="hospital-bookings">Hospital Bookings</TabsTrigger>
                <TabsTrigger value="sample-collection">Sample Collection</TabsTrigger>
                <TabsTrigger value="pricing">Pricing Management</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="hospital-status">Hospital Status</TabsTrigger>
              </>
            ) : isAuthority ? (
              <>
                <TabsTrigger value="hospital-status">Hospital Status</TabsTrigger>
                <TabsTrigger value="hospital-info">Hospital Information</TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="bookings">My Bookings</TabsTrigger>
                <TabsTrigger value="blood">Blood Requests</TabsTrigger>
                <TabsTrigger value="payments">Payment History</TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Hospital Authority Bookings Tab */}
          <TabsContent value="hospital-bookings">
            {hospital ? (
              <BookingApprovalInterface hospitalId={hospital.id} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Emergency Patient Bookings</CardTitle>
                  <CardDescription>
                    View and manage emergency patient bookings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Hospital data not loaded</h3>
                    <p className="text-gray-600 mb-4">
                      Cannot display bookings because the hospital data could not be loaded.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Hospital Authority Sample Collection Approvals Tab */}
          <TabsContent value="sample-collection">
            {hospital ? (
              <Card>
                <CardHeader>
                  <CardTitle>Sample Collection Approvals</CardTitle>
                  <CardDescription>
                    Review and approve home sample collection requests from patients.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SampleCollectionApproval hospitalId={hospital.id} />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Sample Collection Approvals</CardTitle>
                  <CardDescription>
                    Review and approve home sample collection requests.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Hospital data not loaded</h3>
                    <p className="text-gray-600 mb-4">
                      Cannot display sample collection requests because the hospital data could not be loaded.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Hospital Authority Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Emergency Resource Utilization</CardTitle>
                  <CardDescription>
                    Current utilization rates for your emergency medical resources.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {hospital ? (
                    <div className="space-y-4">
                      {Object.entries(hospital.resources || {}).map(([resourceType, resource]) => {
                        const utilization = resource.total > 0 ? Math.round(((resource.total - resource.available) / resource.total) * 100) : 0;
                        return (
                          <div key={resourceType} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium capitalize">
                                {resourceType === 'operationTheatres' ? 'Operation Theatres' : resourceType}
                              </span>
                              <span className="text-sm text-gray-600">{utilization}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${utilization}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500">No facility data available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Emergency Activity</CardTitle>
                  <CardDescription>
                    Latest emergency bookings and updates for your facility.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {bookings.slice(0, 5).map((booking) => (
                      <div key={booking.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{booking.patientName}</p>
                            {booking.rapidAssistance && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 text-xs px-1.5 py-0.5">
                                <UserCheck className="w-2.5 h-2.5 mr-1" />
                                RA
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600">
                            {booking.resourceType} booking • {booking.status}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                    {bookings.length === 0 && (
                      <p className="text-gray-500 text-sm">No recent emergency activity</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Hospital Authority Pricing Management Tab */}
          <TabsContent value="pricing">
            <HospitalPricingManagement hospitalId={hospital?.id || 0} />
          </TabsContent>

          {/* Regular User Bookings Tab */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Your Emergency Care Bookings</CardTitle>
                <CardDescription>
                  View and manage your emergency medical resource bookings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No emergency bookings found</h3>
                    <p className="text-gray-600 mb-4">
                      {isAuthority 
                        ? 'No emergency patient bookings have been made to your facility yet.'
                        : 'You haven\'t made any emergency care bookings yet.'
                      }
                    </p>
                    {!isAuthority && (
                      <Link href="/booking">
                        <Button>
                          Book Emergency Care
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <BookingCardWithPayment
                        key={booking.id}
                        booking={booking}
                        onUpdate={(updatedBooking) => {
                          setBookings(prev => prev.map(b => 
                            b.id === updatedBooking.id ? updatedBooking : b
                          ));
                        }}
                        showPaymentDetails={true}
                        allowCancellation={true}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blood">
            <Card>
              <CardHeader>
                <CardTitle>Your Blood Requests</CardTitle>
                <CardDescription>
                  View and manage your blood donation requests.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bloodRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No blood requests found</h3>
                    <p className="text-gray-600 mb-4">You haven\'t made any blood donation requests yet.</p>
                    <Link href="/donate-blood">
                      <Button>
                        Request Blood
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bloodRequests.map((request) => (
                      <Card key={request.id} className="border-l-4 border-l-red-500">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <Heart className="w-5 h-5 text-red-600" />
                              <div>
                                <h3 className="font-semibold">
                                  {request.bloodType} Blood Request
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {request.units} units • {request.hospital?.name || 'Hospital not specified'}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Badge className={getStatusColor(request.status)}>
                                {request.status}
                              </Badge>
                              <Badge className={getUrgencyColor(request.urgency)}>
                                {request.urgency}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-gray-500" />
                              <span>{request.hospital?.name || 'Hospital not specified'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span>
                                Required by: {new Date(request.requiredBy).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-500" />
                              <span>{request.requesterPhone}</span>
                            </div>
                          </div>

                          {request.patientName && (
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Patient:</span> {request.patientName}
                              {request.patientAge && ` (${request.patientAge} years)`}
                            </div>
                          )}

                          {request.matchedDonors?.length > 0 && (
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Matched Donors:</span> {request.matchedDonors.length}
                            </div>
                          )}

                          <div className="mt-4 flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Created:</span> {new Date(request.createdAt).toLocaleDateString()}
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                View Details
                              </Button>
                              {request.status === 'pending' && (
                                <Button variant="outline" size="sm">
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment History Tab for Regular Users */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>
                  View your payment transactions and receipts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {paymentLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading payment history...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
                    <p className="text-gray-600 mb-4">You haven\'t made any payments yet.</p>
                  </div>
                ) : (
                  <PaymentHistoryCard
                    transactions={transactions}
                    loading={paymentLoading}
                    onRefresh={fetchPaymentHistory}
                    onViewReceipt={(transactionId) => {
                      console.log('View receipt for transaction:', transactionId);
                    }}
                    onRefund={(transactionId) => {
                      console.log('Process refund for transaction:', transactionId);
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                {isAuthority 
                  ? 'Access hospital management features quickly.'
                  : 'Access frequently used features quickly.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAuthority ? (
                <div className="grid md:grid-cols-3 gap-4">
                  <Button variant="outline" className="w-full h-20 flex-col gap-2">
                    <Users className="w-6 h-6" />
                    <span>Manage Staff</span>
                  </Button>
                  <Button variant="outline" className="w-full h-20 flex-col gap-2">
                    <Activity className="w-6 h-6" />
                    <span>View Reports</span>
                  </Button>
                  <Link href="/profile">
                    <Button variant="outline" className="w-full h-20 flex-col gap-2">
                      <Settings className="w-6 h-6" />
                      <span>Settings</span>
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full h-20 flex-col gap-2 border-dashed border-2 hover:border-solid hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                    onClick={() => {
                        const tabsList = document.querySelector('[role="tablist"]');
                        const pricingTab = tabsList?.querySelector('[value="pricing"]') as HTMLButtonElement | null;
                        if (pricingTab) pricingTab.click();
                    }}
                  >
                    <div className="bg-blue-100 p-2 rounded-full">
                        <Plus className="w-4 h-4 text-blue-600" />
                    </div>
                    <span>Add Rapid Service</span>
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Link href="/hospitals">
                    <Button variant="outline" className="w-full h-20 flex-col gap-2">
                      <Building2 className="w-6 h-6" />
                      <span>Find Hospitals</span>
                    </Button>
                  </Link>
                  <Link href="/booking">
                    <Button variant="outline" className="w-full h-20 flex-col gap-2">
                      <Calendar className="w-6 h-6" />
                      <span>Book Resource</span>
                    </Button>
                  </Link>
                  <Link href="/donate-blood">
                    <Button variant="outline" className="w-full h-20 flex-col gap-2">
                      <Heart className="w-6 h-6" />
                      <span>Blood Donation</span>
                    </Button>
                  </Link>
                  <Link href="/rapid-analyze">
                    <Button variant="outline" className="w-full h-20 flex-col gap-2">
                      <Sparkles className="w-6 h-6" />
                      <span>Rapid Analyze</span>
                    </Button>
                  </Link>
                  <Link href="/rapid-collection">
                    <Button variant="outline" className="w-full h-20 flex-col gap-2">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Clock className="w-4 h-4 text-blue-600" />
                      </div>
                      <span>Rapid Collection</span>
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Booking Details Modal */}
        {selectedBooking && (
          <Dialog open={showBookingDetails} onOpenChange={setShowBookingDetails}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Booking Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Patient Information */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-3">Patient Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Name:</span> {selectedBooking.patientName}</div>
                      <div><span className="font-medium">Age:</span> {selectedBooking.patientAge} years</div>
                      <div><span className="font-medium">Gender:</span> {selectedBooking.patientGender}</div>
                      <div><span className="font-medium">Medical Condition:</span> {selectedBooking.medicalCondition}</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Emergency Contact</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Name:</span> {selectedBooking.emergencyContact?.name || 'N/A'}</div>
                      <div><span className="font-medium">Phone:</span> {selectedBooking.emergencyContact?.phone || 'N/A'}</div>
                      <div><span className="font-medium">Relationship:</span> {selectedBooking.emergencyContact?.relationship || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Booking Information */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-3">Booking Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Resource Type:</span> {selectedBooking.resourceType}</div>
                      <div><span className="font-medium">Scheduled Date:</span> {new Date(selectedBooking.scheduledDate).toLocaleString()}</div>
                      <div><span className="font-medium">Duration:</span> {selectedBooking.estimatedDuration} hours</div>
                      <div><span className="font-medium">Urgency:</span> <Badge className={getUrgencyColor(selectedBooking.urgency)}>{selectedBooking.urgency}</Badge></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Payment Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Amount:</span> ৳{selectedBooking.payment?.amount || 0}</div>
                      <div><span className="font-medium">Status:</span> <Badge className={getStatusColor(selectedBooking.payment?.status || 'pending')}>{selectedBooking.payment?.status || 'pending'}</Badge></div>
                      <div><span className="font-medium">Booking Status:</span> <Badge className={getStatusColor(selectedBooking.status)}>{selectedBooking.status}</Badge></div>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                {selectedBooking.rapidAssistance && (
                  <div>
                    <h3 className="font-semibold mb-3">Rapid Assistance</h3>
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      <p>An assistant has been assigned to escort the patient.</p>
                      <p><span className="font-medium">Assistant Name:</span> {selectedBooking.rapidAssistantName || 'N/A'}</p>
                      <p><span className="font-medium">Assistant Phone:</span> {selectedBooking.rapidAssistantPhone || 'N/A'}</p>
                    </div>
                  </div>
                )}

                {selectedBooking.notes && (
                  <div>
                    <h3 className="font-semibold mb-3">Additional Notes</h3>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedBooking.notes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  {selectedBooking.status === 'pending' && (
                    <>
                      <Button className="bg-green-600 hover:bg-green-700">
                        Approve Booking
                      </Button>
                      <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
                        Decline Booking
                      </Button>
                    </>
                  )}
                  <Button variant="outline" onClick={() => setShowBookingDetails(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
} 