'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  User,
  Calendar,
  Heart,
  Edit,
  Lock,
  AlertTriangle,
  CheckCircle,
  Bed,
  Activity,
  Scissors,
  Eye,
  X
} from 'lucide-react';
import { isAuthenticated, isAdmin } from '@/lib/auth';
import { authAPI, bookingAPI, bloodAPI } from '@/lib/api';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  userType: 'user' | 'hospital-authority' | 'admin';
  balance?: number;
  createdAt: string;
}

interface UserBooking {
  id: number;
  hospitalId: number;
  hospitalName?: string;
  resourceType: 'bed' | 'icu' | 'operationTheatre';
  patientName: string;
  patientAge: number;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  scheduledDate: string;
  createdAt: string;
  paymentAmount?: number;
  paymentStatus?: string;
}

interface UserBloodRequest {
  id: number;
  requesterName: string;
  bloodType: string;
  units: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'matched' | 'completed' | 'cancelled';
  hospitalName: string;
  requiredBy: string;
  matchedDonors?: any[];
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Data states
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [bloodRequests, setBloodRequests] = useState<UserBloodRequest[]>([]);
  
  // Loading states for individual sections
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bloodRequestsLoading, setBloodRequestsLoading] = useState(false);
  
  // Dialog states
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  // Form schemas
  const profileSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().optional(),
  });

  const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

  type ProfileFormData = z.infer<typeof profileSchema>;
  type PasswordFormData = z.infer<typeof passwordSchema>;

  // Form hooks
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      phone: '',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

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
    
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    setError('');
    try {
      const [profileResponse, bookingsResponse, bloodRequestsResponse] = await Promise.allSettled([
        authAPI.getProfile(),
        bookingAPI.getMyBookings(),
        bloodAPI.getMyRequests()
      ]);

      // Handle profile data
      if (profileResponse.status === 'fulfilled' && profileResponse.value.data.success) {
        const profileData = profileResponse.value.data.data;
        setProfile(profileData);
        profileForm.reset({
          name: profileData.name,
          phone: profileData.phone || '',
        });
      } else {
        console.error('Profile fetch failed:', profileResponse);
        setError('Failed to load profile information');
      }

      // Handle bookings data
      if (bookingsResponse.status === 'fulfilled' && bookingsResponse.value.data.success) {
        setBookings(bookingsResponse.value.data.data);
      } else {
        console.error('Bookings fetch failed:', bookingsResponse);
        setBookings([]);
      }

      // Handle blood requests data
      if (bloodRequestsResponse.status === 'fulfilled' && bloodRequestsResponse.value.data.success) {
        setBloodRequests(bloodRequestsResponse.value.data.data);
      } else {
        console.error('Blood requests fetch failed:', bloodRequestsResponse);
        setBloodRequests([]);
      }

    } catch (error: any) {
      console.error('Profile data fetch error:', error);
      setError('Unable to load your profile data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (data: ProfileFormData) => {
    try {
      setError('');
      await authAPI.updateProfile(data);
      setSuccess('Your profile has been updated successfully');
      fetchProfileData();
      
      // Auto-dismiss success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Unable to update your profile. Please try again.');
    }
  };

  const handlePasswordChange = async (data: PasswordFormData) => {
    try {
      setError('');
      await authAPI.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setSuccess('Your password has been updated successfully');
      setPasswordDialogOpen(false);
      passwordForm.reset();
      
      // Auto-dismiss success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Unable to update your password. Please verify your current password and try again.');
    }
  };

  const refreshBookings = async () => {
    setBookingsLoading(true);
    try {
      const response = await bookingAPI.getMyBookings();
      if (response.data.success) {
        setBookings(response.data.data);
      }
    } catch (error) {
      console.error('Error refreshing bookings:', error);
    } finally {
      setBookingsLoading(false);
    }
  };

  const refreshBloodRequests = async () => {
    setBloodRequestsLoading(true);
    try {
      const response = await bloodAPI.getMyRequests();
      if (response.data.success) {
        setBloodRequests(response.data.data);
      }
    } catch (error) {
      console.error('Error refreshing blood requests:', error);
    } finally {
      setBloodRequestsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'matched': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const getResourceIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'bed': return <Bed className="w-4 h-4" />;
      case 'icu': return <Activity className="w-4 h-4" />;
      case 'operationTheatre': return <Scissors className="w-4 h-4" />;
      default: return <Bed className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading your RapidCare profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My RapidCare Profile</h1>
            <p className="text-gray-600">Manage your account settings and view your emergency care activity</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={fetchProfileData}
              variant="outline"
              size="sm"
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <div className="flex items-center gap-2">
              <User className="w-6 h-6 text-blue-600" />
              <span className="text-sm text-gray-600">{profile?.userType}</span>
            </div>
          </div>
        </div>

        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Account Information</TabsTrigger>
            <TabsTrigger value="bookings">Emergency Bookings</TabsTrigger>
            <TabsTrigger value="blood-requests">Blood Donation Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Update your personal information and RapidCare account settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        {...profileForm.register('name')}
                        placeholder="Enter your complete legal name"
                      />
                      {profileForm.formState.errors.name && (
                        <p className="text-sm text-red-600 mt-1">
                          {profileForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        value={profile?.email || ''}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Email address cannot be modified for security</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Contact Number</Label>
                      <Input
                        id="phone"
                        {...profileForm.register('phone')}
                        placeholder="Enter your primary contact number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="userType">Account Type</Label>
                      <Input
                        id="userType"
                        value={profile?.userType || ''}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Account type cannot be modified</p>
                    </div>
                  </div>

                  {/* Account Balance Display */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Activity className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Account Balance</h3>
                          <p className="text-sm text-gray-600">Available for medical bookings</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          ৳{profile?.balance?.toLocaleString() || '10,000'}
                        </div>
                        <div className="text-sm text-gray-500">BDT</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" type="button">
                          <Lock className="w-4 h-4 mr-2" />
                          Update Password
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Your Password</DialogTitle>
                          <DialogDescription>
                            Enter your current password and create a new secure password for your RapidCare account.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
                          <div>
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <Input
                              id="currentPassword"
                              type="password"
                              {...passwordForm.register('currentPassword')}
                              placeholder="Enter your current password"
                            />
                            {passwordForm.formState.errors.currentPassword && (
                              <p className="text-sm text-red-600 mt-1">
                                {passwordForm.formState.errors.currentPassword.message}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="newPassword">New Secure Password</Label>
                            <Input
                              id="newPassword"
                              type="password"
                              {...passwordForm.register('newPassword')}
                              placeholder="Create a strong, secure password"
                            />
                            {passwordForm.formState.errors.newPassword && (
                              <p className="text-sm text-red-600 mt-1">
                                {passwordForm.formState.errors.newPassword.message}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              {...passwordForm.register('confirmPassword')}
                              placeholder="Re-enter your new password"
                            />
                            {passwordForm.formState.errors.confirmPassword && (
                              <p className="text-sm text-red-600 mt-1">
                                {passwordForm.formState.errors.confirmPassword.message}
                              </p>
                            )}
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setPasswordDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={passwordForm.formState.isSubmitting}
                            >
                              {passwordForm.formState.isSubmitting ? 'Updating...' : 'Update Password'}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>

                    <Button
                      type="submit"
                      disabled={profileForm.formState.isSubmitting}
                    >
                      {profileForm.formState.isSubmitting ? 'Saving changes...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Emergency Care Bookings</CardTitle>
                    <CardDescription>View and manage your emergency medical resource bookings</CardDescription>
                  </div>
                  <Button
                    onClick={refreshBookings}
                    variant="outline"
                    size="sm"
                    disabled={bookingsLoading}
                    className="flex items-center gap-2"
                  >
                    <Activity className="w-4 h-4" />
                    {bookingsLoading ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {bookings && bookings.length > 0 ? (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <div key={booking.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-100 rounded-lg">
                              {getResourceIcon(booking.resourceType)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-lg">{booking.patientName}</h3>
                                <Badge className={getStatusColor(booking.status)}>
                                  {booking.status}
                                </Badge>
                                <Badge className={getUrgencyColor(booking.urgency)}>
                                  {booking.urgency}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Resource:</span> {booking.resourceType}
                                </div>
                                <div>
                                  <span className="font-medium">Age:</span> {booking.patientAge} years
                                </div>
                                <div>
                                  <span className="font-medium">Hospital:</span> {booking.hospitalName || 'Unknown Hospital'}
                                </div>
                                <div>
                                  <span className="font-medium">Scheduled:</span> {new Date(booking.scheduledDate).toLocaleDateString()}
                                </div>
                                {booking.paymentAmount && (
                                  <div>
                                    <span className="font-medium">Amount:</span> ৳{booking.paymentAmount}
                                  </div>
                                )}
                                {booking.paymentStatus && (
                                  <div>
                                    <span className="font-medium">Payment:</span> 
                                    <Badge className={`ml-1 ${
                                      booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {booking.paymentStatus}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Emergency Bookings</h3>
                    <p className="text-gray-600 mb-4">Your emergency care bookings will appear here</p>
                    <Button onClick={() => window.location.href = '/booking'}>
                      Book Emergency Care
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blood-requests">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Blood Donation Requests</CardTitle>
                    <CardDescription>View your emergency blood donation requests and their status</CardDescription>
                  </div>
                  <Button
                    onClick={refreshBloodRequests}
                    variant="outline"
                    size="sm"
                    disabled={bloodRequestsLoading}
                    className="flex items-center gap-2"
                  >
                    <Activity className="w-4 h-4" />
                    {bloodRequestsLoading ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {bloodRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Blood Donation Requests</h3>
                    <p className="text-gray-600 mb-4">Your emergency blood donation requests will appear here</p>
                    <Button onClick={() => window.location.href = '/donate-blood'}>
                      Request Blood Donation
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bloodRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-red-100 rounded-lg">
                            <Heart className="w-4 h-4 text-red-600" />
                          </div>
                          <div>
                            <p className="font-medium">{request.bloodType} • {request.units} units</p>
                            <p className="text-sm text-gray-600">
                              Patient: {request.requesterName}
                            </p>
                            <p className="text-xs text-gray-500">
                              Medical Facility: {request.hospitalName}
                            </p>
                            <p className="text-xs text-gray-500">
                              Required by: {new Date(request.requiredBy).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(request.status)}>
                            {request.status}
                          </Badge>
                          <Badge className={getUrgencyColor(request.urgency)}>
                            {request.urgency}
                          </Badge>
                          {request.matchedDonors && request.matchedDonors.length > 0 && (
                            <Badge className="bg-green-100 text-green-800">
                              {request.matchedDonors.length} matched
                            </Badge>
                          )}
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}