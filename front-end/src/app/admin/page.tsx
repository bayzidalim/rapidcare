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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import AuditTrailViewer from '@/components/AuditTrailViewer';
import {
  Building2,
  Users,
  Calendar,
  Heart,
  UserPlus,
  Trash2,
  Edit,
  Eye,
  Search,
  Plus,
  Shield,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Settings,
  BarChart3,
  Clock,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { isAuthenticated, isAdmin } from '@/lib/auth';
import { adminAPI } from '@/lib/api';
import AdminFinancialDashboard from '@/components/AdminFinancialDashboard';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  userType: 'user' | 'hospital-authority' | 'admin';
  hospitalId?: number;
  isActive: boolean;
  createdAt: string;
}

interface Hospital {
  id: number;
  name: string;
  description?: string;
  type: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contact: {
    phone: string;
    email: string;
    emergency: string;
  };
  capacity: {
    totalBeds: number;
    icuBeds: number;
    operationTheaters: number;
  };
  services: string[];
  isActive: boolean;
  createdAt: string;
}

interface Booking {
  id: number;
  userId: number;
  hospitalId: number;
  resourceType: 'bed' | 'icu' | 'operationTheatre';
  patientName: string;
  patientAge: number;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  scheduledDate: string;
  createdAt: string;
}

interface BloodRequest {
  id: number;
  requesterName: string;
  bloodType: string;
  units: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'matched' | 'completed' | 'cancelled';
  hospital: {
    name: string;
  };
  requiredBy: string;
  createdAt: string;
}

interface PendingHospital extends Hospital {
  authority: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  submittedAt?: string;
}

interface HospitalApprovalStats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  averageApprovalTime: number;
  recentApprovals: Array<{
    hospitalId: number;
    hospitalName: string;
    approvedAt: string;
    approvedBy: number;
  }>;
  recentRejections: Array<{
    hospitalId: number;
    hospitalName: string;
    rejectedAt: string;
    rejectionReason: string;
  }>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bloodRequests, setBloodRequests] = useState<BloodRequest[]>([]);
  const [pendingHospitals, setPendingHospitals] = useState<PendingHospital[]>([]);
  const [approvalStats, setApprovalStats] = useState<HospitalApprovalStats>({
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0,
    averageApprovalTime: 0,
    recentApprovals: [],
    recentRejections: [],
  });

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalHospitals: 0,
    totalBookings: 0,
    totalBloodRequests: 0,
    activeUsers: 0,
    activeHospitals: 0,
    pendingBookings: 0,
    pendingBloodRequests: 0,
  });

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialog states
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [addHospitalDialogOpen, setAddHospitalDialogOpen] = useState(false);
  const [editHospitalDialogOpen, setEditHospitalDialogOpen] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedPendingHospital, setSelectedPendingHospital] = useState<PendingHospital | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Settings state
  const [settings, setSettings] = useState({
    general: {
      systemName: 'RapidCare',
      timezone: 'UTC',
      defaultLanguage: 'en',
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
    },
    security: {
      passwordMinLength: 6,
      sessionTimeout: 30,
      maxLoginAttempts: 5,
    },
    booking: {
      defaultDuration: 60,
      requireApproval: false,
      maxBookingsPerUser: 10,
    },
  });

  // Form schemas
  const addUserSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    userType: z.enum(['user', 'hospital-authority', 'admin']),
    hospitalId: z.number().optional(),
  });

  const editUserSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    userType: z.enum(['user', 'hospital-authority', 'admin']),
    hospitalId: z.number().optional(),
    password: z.string().optional(),
  });

  type AddUserFormData = z.infer<typeof addUserSchema>;
  type EditUserFormData = z.infer<typeof editUserSchema>;

  const hospitalSchema = z.object({
    name: z.string().min(2, 'Hospital name must be at least 2 characters'),
    description: z.string().optional(),
    type: z.string().min(1, 'Hospital type is required'),
    address: z.object({
      street: z.string().min(1, 'Street address is required'),
      city: z.string().min(1, 'City is required'),
      state: z.string().min(1, 'State is required'),
      zipCode: z.string().min(1, 'ZIP code is required'),
      country: z.string().min(1, 'Country is required'),
    }),
    contact: z.object({
      phone: z.string().min(1, 'Phone number is required'),
      email: z.string().email('Invalid email address'),
      emergency: z.string().min(1, 'Emergency contact is required'),
    }),
    capacity: z.object({
      totalBeds: z.number().min(1, 'Total beds must be at least 1'),
      icuBeds: z.number().min(0, 'ICU beds cannot be negative'),
      operationTheaters: z.number().min(0, 'Operation theaters cannot be negative'),
    }),
    services: z.array(z.string()).optional(),
  });

  type HospitalFormData = z.infer<typeof hospitalSchema>;

  const settingsSchema = z.object({
    general: z.object({
      systemName: z.string().min(1, 'System name is required'),
      timezone: z.string().min(1, 'Timezone is required'),
      defaultLanguage: z.string().min(1, 'Default language is required'),
    }),
    notifications: z.object({
      emailEnabled: z.boolean(),
      smsEnabled: z.boolean(),
    }),
    security: z.object({
      passwordMinLength: z.number().min(4, 'Minimum length must be at least 4'),
      sessionTimeout: z.number().min(5, 'Session timeout must be at least 5 minutes'),
      maxLoginAttempts: z.number().min(1, 'Max attempts must be at least 1'),
    }),
    booking: z.object({
      defaultDuration: z.number().min(15, 'Default duration must be at least 15 minutes'),
      requireApproval: z.boolean(),
      maxBookingsPerUser: z.number().min(1, 'Max bookings must be at least 1'),
    }),
  });

  type SettingsFormData = z.infer<typeof settingsSchema>;

  // Form hooks
  const addUserForm = useForm<AddUserFormData>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      userType: 'user',
    },
  });

  const editUserForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      userType: 'user',
    },
  });

  const addHospitalForm = useForm<HospitalFormData>({
    resolver: zodResolver(hospitalSchema),
    defaultValues: {
      name: '',
      description: '',
      type: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
      },
      contact: {
        phone: '',
        email: '',
        emergency: '',
      },
      capacity: {
        totalBeds: 0,
        icuBeds: 0,
        operationTheaters: 0,
      },
      services: [],
    },
  });

  const editHospitalForm = useForm<HospitalFormData>({
    resolver: zodResolver(hospitalSchema),
    defaultValues: {
      name: '',
      description: '',
      type: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
      },
      contact: {
        phone: '',
        email: '',
        emergency: '',
      },
      capacity: {
        totalBeds: 0,
        icuBeds: 0,
        operationTheaters: 0,
      },
      services: [],
    },
  });

  const settingsForm = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

  useEffect(() => {
    // Check if user is admin
    if (!isAuthenticated() || !isAdmin()) {
      router.push('/login');
      return;
    }

    fetchAllData();
  }, []);

  // Automatic data refresh every 30 seconds with page visibility detection
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let retryCount = 0;
    const maxRetries = 3;

    const fetchWithRetry = async () => {
      try {
        await fetchAllData();
        retryCount = 0; // Reset retry count on success
      } catch (error) {
        retryCount++;
        if (retryCount <= maxRetries) {
          // Exponential backoff: 5s, 10s, 20s
          const retryDelay = Math.min(5000 * Math.pow(2, retryCount - 1), 20000);
          setTimeout(() => {
            if (!document.hidden) {
              fetchWithRetry();
            }
          }, retryDelay);
        } else {
          // Max retries reached, show error but don't stop trying
          setError('Unable to refresh healthcare platform data. Please check your connection and try again.');
          retryCount = 0; // Reset for next interval
        }
      }
    };

    const startInterval = () => {
      interval = setInterval(() => {
        if (!document.hidden) {
          fetchWithRetry();
        }
      }, 30000); // 30 seconds
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, clear interval
        if (interval) {
          clearInterval(interval);
        }
      } else {
        // Page is visible, restart interval and refresh immediately
        startInterval();
        fetchWithRetry();
      }
    };

    // Start initial interval
    startInterval();

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [usersRes, hospitalsRes, bookingsRes, bloodRequestsRes, statsRes, pendingHospitalsRes, approvalStatsRes] = await Promise.all([
        adminAPI.getAllUsers(),
        adminAPI.getAllHospitals(),
        adminAPI.getAllBookings(),
        adminAPI.getAllBloodRequests(),
        adminAPI.getStats(),
        adminAPI.getPendingHospitals(),
        adminAPI.getHospitalApprovalStats(),
      ]);

      setUsers(usersRes.data.data);
      setHospitals(hospitalsRes.data.data);
      setBookings(bookingsRes.data.data);
      setBloodRequests(bloodRequestsRes.data.data);
      setStats(statsRes.data.data);
      setPendingHospitals(pendingHospitalsRes.data.data);
      setApprovalStats(approvalStatsRes.data.data);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Unable to load healthcare platform data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setError('');
    setSuccess('');
    try {
      await fetchAllData();
      setSuccess('Healthcare platform data refreshed successfully');
    } catch (error: any) {
      setError('Unable to refresh healthcare platform data. Please try again.');
    }
  };

  const handleAddUser = async (data: AddUserFormData) => {
    try {
      await adminAPI.createUser(data);
      setSuccess('Healthcare user account created successfully');
      setAddUserDialogOpen(false);
      addUserForm.reset();
      fetchAllData();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to create user');
    }
  };

  const handleEditUser = async (data: EditUserFormData) => {
    if (!selectedUser) return;

    try {
      await adminAPI.updateUser(selectedUser.id, data);
      setSuccess('Healthcare user account updated successfully');
      setEditUserDialogOpen(false);
      setSelectedUser(null);
      editUserForm.reset();
      fetchAllData();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to update user');
    }
  };

  const openEditUserDialog = (user: User) => {
    setSelectedUser(user);
    editUserForm.reset({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      userType: user.userType,
      hospitalId: user.hospitalId,
    });
    setEditUserDialogOpen(true);
  };

  const handleAddHospital = async (data: HospitalFormData) => {
    try {
      await adminAPI.createHospital(data);
      setSuccess('Medical facility registered successfully');
      setAddHospitalDialogOpen(false);
      addHospitalForm.reset();
      fetchAllData();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to create hospital');
    }
  };

  const handleEditHospital = async (data: HospitalFormData) => {
    if (!selectedHospital) return;

    try {
      await adminAPI.updateHospital(selectedHospital.id, data);
      setSuccess('Medical facility information updated successfully');
      setEditHospitalDialogOpen(false);
      setSelectedHospital(null);
      editHospitalForm.reset();
      fetchAllData();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to update hospital');
    }
  };

  const openEditHospitalDialog = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    editHospitalForm.reset({
      name: hospital.name,
      description: hospital.description || '',
      type: hospital.type,
      address: hospital.address,
      contact: hospital.contact,
      capacity: hospital.capacity,
      services: hospital.services || [],
    });
    setEditHospitalDialogOpen(true);
  };

  const handleSaveSettings = async (data: SettingsFormData) => {
    try {
      // In a real app, this would call an API endpoint
      setSettings(data);
      setSuccess('Healthcare platform configuration saved successfully');
    } catch (error: any) {
      setError('Unable to save healthcare platform configuration. Please try again.');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await adminAPI.deleteUser(userId);
      setSuccess('User deleted successfully');
      fetchAllData();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleDeleteHospital = async (hospitalId: number) => {
    if (!confirm('Are you sure you want to delete this hospital?')) return;

    try {
      await adminAPI.deleteHospital(hospitalId);
      setSuccess('Hospital deleted successfully');
      fetchAllData();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to delete hospital');
    }
  };

  const handleDeleteBooking = async (bookingId: number) => {
    if (!confirm('Are you sure you want to delete this booking?')) return;

    try {
      await adminAPI.deleteBooking(bookingId);
      setSuccess('Medical resource booking cancelled successfully');
      fetchAllData();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to delete booking');
    }
  };

  const handleDeleteBloodRequest = async (requestId: number) => {
    if (!confirm('Are you sure you want to delete this blood request?')) return;

    try {
      await adminAPI.deleteBloodRequest(requestId);
      setSuccess('Emergency blood request cancelled successfully');
      fetchAllData();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to delete blood request');
    }
  };

  const handleApproveHospital = async () => {
    if (!selectedPendingHospital) {
      setError('No hospital selected for approval');
      return;
    }

    // Clear previous messages
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      console.log(`Approving hospital: ${selectedPendingHospital.name} (ID: ${selectedPendingHospital.id})`);
      
      const response = await adminAPI.approveHospital(selectedPendingHospital.id);
      
      // Show success message with hospital name
      const hospitalName = selectedPendingHospital.name;
      setSuccess(`✅ ${hospitalName} has been approved and is now available to users!`);
      
      // Close dialog and reset state
      setApproveDialogOpen(false);
      setSelectedPendingHospital(null);
      
      // Refresh data to show updated status
      await fetchAllData();
      
      console.log('Hospital approval successful:', response.data);
      
    } catch (error: any) {
      console.error('Hospital approval error:', error);
      
      // Extract meaningful error message
      let errorMessage = 'Failed to approve hospital';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Hospital not found. It may have been deleted.';
      } else if (error.response?.status === 409) {
        errorMessage = 'Hospital cannot be approved. It may have already been processed.';
      }
      
      setError(`❌ ${errorMessage}`);
      
      // Don't close dialog on error so user can retry
    } finally {
      setLoading(false);
    }
  };

  const handleRejectHospital = async () => {
    if (!selectedPendingHospital) {
      setError('No hospital selected for rejection');
      return;
    }

    const trimmedReason = rejectionReason.trim();
    if (!trimmedReason) {
      setError('Rejection reason is required');
      return;
    }

    if (trimmedReason.length < 10) {
      setError('Rejection reason must be at least 10 characters long');
      return;
    }

    if (trimmedReason.length > 500) {
      setError('Rejection reason must be less than 500 characters');
      return;
    }

    // Clear previous messages
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      console.log(`Rejecting hospital: ${selectedPendingHospital.name} (ID: ${selectedPendingHospital.id})`);
      console.log(`Rejection reason: ${trimmedReason}`);
      
      const response = await adminAPI.rejectHospital(selectedPendingHospital.id, { 
        reason: trimmedReason 
      });
      
      // Show success message with hospital name
      const hospitalName = selectedPendingHospital.name;
      setSuccess(`✅ ${hospitalName} has been rejected. The hospital authority has been notified and can resubmit after addressing the issues.`);
      
      // Close dialog and reset state
      setRejectDialogOpen(false);
      setSelectedPendingHospital(null);
      setRejectionReason('');
      
      // Refresh data to show updated status
      await fetchAllData();
      
      console.log('Hospital rejection successful:', response.data);
      
    } catch (error: any) {
      console.error('Hospital rejection error:', error);
      
      // Extract meaningful error message
      let errorMessage = 'Failed to reject hospital';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Hospital not found. It may have been deleted.';
      } else if (error.response?.status === 409) {
        errorMessage = 'Hospital cannot be rejected. It may have already been processed.';
      }
      
      setError(`❌ ${errorMessage}`);
      
      // Don't close dialog on error so user can retry
    } finally {
      setLoading(false);
    }
  };

  const openApproveDialog = (hospital: PendingHospital) => {
    setSelectedPendingHospital(hospital);
    setApproveDialogOpen(true);
  };

  const openRejectDialog = (hospital: PendingHospital) => {
    setSelectedPendingHospital(hospital);
    setRejectDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
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

  const filteredUsers = (users || []).filter(user =>
    user && user.name && user.email &&
    (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredHospitals = (hospitals || [])
    .filter(hospital => hospital && hospital.name && hospital.address && typeof hospital.address.city === 'string')
    .filter(hospital =>
      hospital.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hospital.address.city.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const filteredBookings = (bookings || []).filter(booking =>
    booking && booking.patientName &&
    booking.patientName.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (statusFilter === 'all' || booking.status === statusFilter)
  );

  const filteredBloodRequests = (bloodRequests || []).filter(request =>
    request && request.requesterName &&
    request.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (statusFilter === 'all' || request.status === statusFilter)
  );

  const filteredPendingHospitals = (pendingHospitals || []).filter(hospital =>
    hospital && hospital.name && hospital.authority &&
    (hospital.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hospital.authority.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hospital.authority.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading RapidCare administrative dashboard...</p>
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">RapidCare Administrative Dashboard</h1>
            <p className="text-gray-600">Comprehensive healthcare resource management and system oversight</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleManualRefresh}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-600" />
              <span className="text-sm text-gray-600">Admin Access</span>
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

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                  <p className="text-xs text-green-600">{stats?.activeUsers || 0} active</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Hospitals</p>
                  <p className="text-2xl font-bold">{stats?.totalHospitals || 0}</p>
                  <p className="text-xs text-green-600">{stats?.activeHospitals || 0} active</p>
                </div>
                <Building2 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold">{stats?.totalBookings || 0}</p>
                  <p className="text-xs text-yellow-600">{stats?.pendingBookings || 0} pending</p>
                </div>
                <Calendar className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Blood Requests</p>
                  <p className="text-2xl font-bold">{stats?.totalBloodRequests || 0}</p>
                  <p className="text-xs text-red-600">{stats?.pendingBloodRequests || 0} pending</p>
                </div>
                <Heart className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="hospitals">Hospitals</TabsTrigger>
            <TabsTrigger value="hospital-approvals">Hospital Approvals</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="blood-requests">Blood Requests</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(users || []).slice(0, 5).map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        <Badge className={getStatusColor(user.isActive ? 'active' : 'inactive')}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(bookings || []).slice(0, 5).map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{booking.patientName}</p>
                          <p className="text-sm text-gray-600">{booking.resourceType}</p>
                        </div>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Healthcare User Management</CardTitle>
                    <CardDescription>Manage patient accounts, hospital authorities, and administrative users</CardDescription>
                  </div>
                  <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                        <DialogDescription>
                          Create a new user account with specific permissions.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={addUserForm.handleSubmit(handleAddUser)} className="space-y-4">
                        <div>
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            {...addUserForm.register('name')}
                            placeholder="Enter full name"
                          />
                          {addUserForm.formState.errors.name && (
                            <p className="text-sm text-red-600 mt-1">
                              {addUserForm.formState.errors.name.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            {...addUserForm.register('email')}
                            placeholder="Enter email address"
                          />
                          {addUserForm.formState.errors.email && (
                            <p className="text-sm text-red-600 mt-1">
                              {addUserForm.formState.errors.email.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="phone">Phone (Optional)</Label>
                          <Input
                            id="phone"
                            {...addUserForm.register('phone')}
                            placeholder="Enter phone number"
                          />
                        </div>

                        <div>
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            {...addUserForm.register('password')}
                            placeholder="Enter password"
                          />
                          {addUserForm.formState.errors.password && (
                            <p className="text-sm text-red-600 mt-1">
                              {addUserForm.formState.errors.password.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="userType">User Role</Label>
                          <Select
                            value={addUserForm.watch('userType')}
                            onValueChange={(value) => addUserForm.setValue('userType', value as 'user' | 'hospital-authority' | 'admin')}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select user role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="hospital-authority">Hospital Authority</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {addUserForm.watch('userType') === 'hospital-authority' && (
                          <div>
                            <Label htmlFor="hospitalId">Associated Hospital</Label>
                            <Select
                              value={addUserForm.watch('hospitalId')?.toString() || ''}
                              onValueChange={(value) => addUserForm.setValue('hospitalId', parseInt(value))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select hospital" />
                              </SelectTrigger>
                              <SelectContent>
                                {hospitals.map((hospital) => (
                                  <SelectItem key={hospital.id} value={hospital.id.toString()}>
                                    {hospital.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setAddUserDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={addUserForm.formState.isSubmitting}
                          >
                            {addUserForm.formState.isSubmitting ? 'Creating...' : 'Create User'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* Edit User Dialog */}
                  <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                          Update user information and permissions.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={editUserForm.handleSubmit(handleEditUser)} className="space-y-4">
                        <div>
                          <Label htmlFor="edit-name">Name</Label>
                          <Input
                            id="edit-name"
                            {...editUserForm.register('name')}
                            placeholder="Enter full name"
                          />
                          {editUserForm.formState.errors.name && (
                            <p className="text-sm text-red-600 mt-1">
                              {editUserForm.formState.errors.name.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="edit-email">Email</Label>
                          <Input
                            id="edit-email"
                            type="email"
                            {...editUserForm.register('email')}
                            placeholder="Enter email address"
                          />
                          {editUserForm.formState.errors.email && (
                            <p className="text-sm text-red-600 mt-1">
                              {editUserForm.formState.errors.email.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="edit-phone">Phone (Optional)</Label>
                          <Input
                            id="edit-phone"
                            {...editUserForm.register('phone')}
                            placeholder="Enter phone number"
                          />
                        </div>

                        <div>
                          <Label htmlFor="edit-password">New Password (Optional)</Label>
                          <Input
                            id="edit-password"
                            type="password"
                            {...editUserForm.register('password')}
                            placeholder="Leave blank to keep current password"
                          />
                          {editUserForm.formState.errors.password && (
                            <p className="text-sm text-red-600 mt-1">
                              {editUserForm.formState.errors.password.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="edit-userType">User Role</Label>
                          <Select
                            value={editUserForm.watch('userType')}
                            onValueChange={(value) => editUserForm.setValue('userType', value as 'user' | 'hospital-authority' | 'admin')}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select user role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="hospital-authority">Hospital Authority</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {editUserForm.watch('userType') === 'hospital-authority' && (
                          <div>
                            <Label htmlFor="edit-hospitalId">Associated Hospital</Label>
                            <Select
                              value={editUserForm.watch('hospitalId')?.toString() || ''}
                              onValueChange={(value) => editUserForm.setValue('hospitalId', parseInt(value))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select hospital" />
                              </SelectTrigger>
                              <SelectContent>
                                {hospitals.map((hospital) => (
                                  <SelectItem key={hospital.id} value={hospital.id.toString()}>
                                    {hospital.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEditUserDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={editUserForm.formState.isSubmitting}
                          >
                            {editUserForm.formState.isSubmitting ? 'Updating...' : 'Update User'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <p className="text-xs text-gray-500">{user.userType}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(user.isActive ? 'active' : 'inactive')}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditUserDialog(user)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hospitals">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Medical Facility Management</CardTitle>
                    <CardDescription>Oversee hospital registrations, resource capacity, and facility operations</CardDescription>
                  </div>
                  <Dialog open={addHospitalDialogOpen} onOpenChange={setAddHospitalDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Hospital
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add New Hospital</DialogTitle>
                        <DialogDescription>
                          Register a new hospital in the system.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={addHospitalForm.handleSubmit(handleAddHospital)} className="space-y-6">
                        {/* Basic Information */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Basic Information</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="hospital-name">Hospital Name</Label>
                              <Input
                                id="hospital-name"
                                {...addHospitalForm.register('name')}
                                placeholder="Enter hospital name"
                              />
                              {addHospitalForm.formState.errors.name && (
                                <p className="text-sm text-red-600 mt-1">
                                  {addHospitalForm.formState.errors.name.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="hospital-type">Hospital Type</Label>
                              <Input
                                id="hospital-type"
                                {...addHospitalForm.register('type')}
                                placeholder="e.g., General, Specialty, Emergency"
                              />
                              {addHospitalForm.formState.errors.type && (
                                <p className="text-sm text-red-600 mt-1">
                                  {addHospitalForm.formState.errors.type.message}
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="hospital-description">Description (Optional)</Label>
                            <Input
                              id="hospital-description"
                              {...addHospitalForm.register('description')}
                              placeholder="Brief description of the hospital"
                            />
                          </div>
                        </div>

                        {/* Address Information */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Address</h3>
                          <div>
                            <Label htmlFor="hospital-street">Street Address</Label>
                            <Input
                              id="hospital-street"
                              {...addHospitalForm.register('address.street')}
                              placeholder="Enter street address"
                            />
                            {addHospitalForm.formState.errors.address?.street && (
                              <p className="text-sm text-red-600 mt-1">
                                {addHospitalForm.formState.errors.address.street.message}
                              </p>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="hospital-city">City</Label>
                              <Input
                                id="hospital-city"
                                {...addHospitalForm.register('address.city')}
                                placeholder="Enter city"
                              />
                              {addHospitalForm.formState.errors.address?.city && (
                                <p className="text-sm text-red-600 mt-1">
                                  {addHospitalForm.formState.errors.address.city.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="hospital-state">State</Label>
                              <Input
                                id="hospital-state"
                                {...addHospitalForm.register('address.state')}
                                placeholder="Enter state"
                              />
                              {addHospitalForm.formState.errors.address?.state && (
                                <p className="text-sm text-red-600 mt-1">
                                  {addHospitalForm.formState.errors.address.state.message}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="hospital-zipCode">ZIP Code</Label>
                              <Input
                                id="hospital-zipCode"
                                {...addHospitalForm.register('address.zipCode')}
                                placeholder="Enter ZIP code"
                              />
                              {addHospitalForm.formState.errors.address?.zipCode && (
                                <p className="text-sm text-red-600 mt-1">
                                  {addHospitalForm.formState.errors.address.zipCode.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="hospital-country">Country</Label>
                              <Input
                                id="hospital-country"
                                {...addHospitalForm.register('address.country')}
                                placeholder="Enter country"
                              />
                              {addHospitalForm.formState.errors.address?.country && (
                                <p className="text-sm text-red-600 mt-1">
                                  {addHospitalForm.formState.errors.address.country.message}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Contact Information */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Contact Information</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="hospital-phone">Phone</Label>
                              <Input
                                id="hospital-phone"
                                {...addHospitalForm.register('contact.phone')}
                                placeholder="Enter phone number"
                              />
                              {addHospitalForm.formState.errors.contact?.phone && (
                                <p className="text-sm text-red-600 mt-1">
                                  {addHospitalForm.formState.errors.contact.phone.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="hospital-email">Email</Label>
                              <Input
                                id="hospital-email"
                                type="email"
                                {...addHospitalForm.register('contact.email')}
                                placeholder="Enter email address"
                              />
                              {addHospitalForm.formState.errors.contact?.email && (
                                <p className="text-sm text-red-600 mt-1">
                                  {addHospitalForm.formState.errors.contact.email.message}
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="hospital-emergency">Emergency Contact</Label>
                            <Input
                              id="hospital-emergency"
                              {...addHospitalForm.register('contact.emergency')}
                              placeholder="Enter emergency contact number"
                            />
                            {addHospitalForm.formState.errors.contact?.emergency && (
                              <p className="text-sm text-red-600 mt-1">
                                {addHospitalForm.formState.errors.contact.emergency.message}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Capacity Information */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Capacity</h3>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor="hospital-totalBeds">Total Beds</Label>
                              <Input
                                id="hospital-totalBeds"
                                type="number"
                                {...addHospitalForm.register('capacity.totalBeds', { valueAsNumber: true })}
                                placeholder="0"
                              />
                              {addHospitalForm.formState.errors.capacity?.totalBeds && (
                                <p className="text-sm text-red-600 mt-1">
                                  {addHospitalForm.formState.errors.capacity.totalBeds.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="hospital-icuBeds">ICU Beds</Label>
                              <Input
                                id="hospital-icuBeds"
                                type="number"
                                {...addHospitalForm.register('capacity.icuBeds', { valueAsNumber: true })}
                                placeholder="0"
                              />
                              {addHospitalForm.formState.errors.capacity?.icuBeds && (
                                <p className="text-sm text-red-600 mt-1">
                                  {addHospitalForm.formState.errors.capacity.icuBeds.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="hospital-operationTheaters">Operation Theaters</Label>
                              <Input
                                id="hospital-operationTheaters"
                                type="number"
                                {...addHospitalForm.register('capacity.operationTheaters', { valueAsNumber: true })}
                                placeholder="0"
                              />
                              {addHospitalForm.formState.errors.capacity?.operationTheaters && (
                                <p className="text-sm text-red-600 mt-1">
                                  {addHospitalForm.formState.errors.capacity.operationTheaters.message}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setAddHospitalDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={addHospitalForm.formState.isSubmitting}
                          >
                            {addHospitalForm.formState.isSubmitting ? 'Creating...' : 'Create Hospital'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* Edit Hospital Dialog */}
                  <Dialog open={editHospitalDialogOpen} onOpenChange={setEditHospitalDialogOpen}>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Hospital</DialogTitle>
                        <DialogDescription>
                          Update hospital information and settings.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={editHospitalForm.handleSubmit(handleEditHospital)} className="space-y-6">
                        {/* Basic Information */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Basic Information</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="edit-hospital-name">Hospital Name</Label>
                              <Input
                                id="edit-hospital-name"
                                {...editHospitalForm.register('name')}
                                placeholder="Enter hospital name"
                              />
                              {editHospitalForm.formState.errors.name && (
                                <p className="text-sm text-red-600 mt-1">
                                  {editHospitalForm.formState.errors.name.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="edit-hospital-type">Hospital Type</Label>
                              <Input
                                id="edit-hospital-type"
                                {...editHospitalForm.register('type')}
                                placeholder="e.g., General, Specialty, Emergency"
                              />
                              {editHospitalForm.formState.errors.type && (
                                <p className="text-sm text-red-600 mt-1">
                                  {editHospitalForm.formState.errors.type.message}
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="edit-hospital-description">Description (Optional)</Label>
                            <Input
                              id="edit-hospital-description"
                              {...editHospitalForm.register('description')}
                              placeholder="Brief description of the hospital"
                            />
                          </div>
                        </div>

                        {/* Address Information */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Address</h3>
                          <div>
                            <Label htmlFor="edit-hospital-street">Street Address</Label>
                            <Input
                              id="edit-hospital-street"
                              {...editHospitalForm.register('address.street')}
                              placeholder="Enter street address"
                            />
                            {editHospitalForm.formState.errors.address?.street && (
                              <p className="text-sm text-red-600 mt-1">
                                {editHospitalForm.formState.errors.address.street.message}
                              </p>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="edit-hospital-city">City</Label>
                              <Input
                                id="edit-hospital-city"
                                {...editHospitalForm.register('address.city')}
                                placeholder="Enter city"
                              />
                              {editHospitalForm.formState.errors.address?.city && (
                                <p className="text-sm text-red-600 mt-1">
                                  {editHospitalForm.formState.errors.address.city.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="edit-hospital-state">State</Label>
                              <Input
                                id="edit-hospital-state"
                                {...editHospitalForm.register('address.state')}
                                placeholder="Enter state"
                              />
                              {editHospitalForm.formState.errors.address?.state && (
                                <p className="text-sm text-red-600 mt-1">
                                  {editHospitalForm.formState.errors.address.state.message}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="edit-hospital-zipCode">ZIP Code</Label>
                              <Input
                                id="edit-hospital-zipCode"
                                {...editHospitalForm.register('address.zipCode')}
                                placeholder="Enter ZIP code"
                              />
                              {editHospitalForm.formState.errors.address?.zipCode && (
                                <p className="text-sm text-red-600 mt-1">
                                  {editHospitalForm.formState.errors.address.zipCode.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="edit-hospital-country">Country</Label>
                              <Input
                                id="edit-hospital-country"
                                {...editHospitalForm.register('address.country')}
                                placeholder="Enter country"
                              />
                              {editHospitalForm.formState.errors.address?.country && (
                                <p className="text-sm text-red-600 mt-1">
                                  {editHospitalForm.formState.errors.address.country.message}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Contact Information */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Contact Information</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="edit-hospital-phone">Phone</Label>
                              <Input
                                id="edit-hospital-phone"
                                {...editHospitalForm.register('contact.phone')}
                                placeholder="Enter phone number"
                              />
                              {editHospitalForm.formState.errors.contact?.phone && (
                                <p className="text-sm text-red-600 mt-1">
                                  {editHospitalForm.formState.errors.contact.phone.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="edit-hospital-email">Email</Label>
                              <Input
                                id="edit-hospital-email"
                                type="email"
                                {...editHospitalForm.register('contact.email')}
                                placeholder="Enter email address"
                              />
                              {editHospitalForm.formState.errors.contact?.email && (
                                <p className="text-sm text-red-600 mt-1">
                                  {editHospitalForm.formState.errors.contact.email.message}
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="edit-hospital-emergency">Emergency Contact</Label>
                            <Input
                              id="edit-hospital-emergency"
                              {...editHospitalForm.register('contact.emergency')}
                              placeholder="Enter emergency contact number"
                            />
                            {editHospitalForm.formState.errors.contact?.emergency && (
                              <p className="text-sm text-red-600 mt-1">
                                {editHospitalForm.formState.errors.contact.emergency.message}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Capacity Information */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Capacity</h3>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor="edit-hospital-totalBeds">Total Beds</Label>
                              <Input
                                id="edit-hospital-totalBeds"
                                type="number"
                                {...editHospitalForm.register('capacity.totalBeds', { valueAsNumber: true })}
                                placeholder="0"
                              />
                              {editHospitalForm.formState.errors.capacity?.totalBeds && (
                                <p className="text-sm text-red-600 mt-1">
                                  {editHospitalForm.formState.errors.capacity.totalBeds.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="edit-hospital-icuBeds">ICU Beds</Label>
                              <Input
                                id="edit-hospital-icuBeds"
                                type="number"
                                {...editHospitalForm.register('capacity.icuBeds', { valueAsNumber: true })}
                                placeholder="0"
                              />
                              {editHospitalForm.formState.errors.capacity?.icuBeds && (
                                <p className="text-sm text-red-600 mt-1">
                                  {editHospitalForm.formState.errors.capacity.icuBeds.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="edit-hospital-operationTheaters">Operation Theaters</Label>
                              <Input
                                id="edit-hospital-operationTheaters"
                                type="number"
                                {...editHospitalForm.register('capacity.operationTheaters', { valueAsNumber: true })}
                                placeholder="0"
                              />
                              {editHospitalForm.formState.errors.capacity?.operationTheaters && (
                                <p className="text-sm text-red-600 mt-1">
                                  {editHospitalForm.formState.errors.capacity.operationTheaters.message}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEditHospitalDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={editHospitalForm.formState.isSubmitting}
                          >
                            {editHospitalForm.formState.isSubmitting ? 'Updating...' : 'Update Hospital'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredHospitals.map((hospital) => (
                    <div key={hospital.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">{hospital.name}</p>
                          <p className="text-sm text-gray-600">
                            {hospital.address.city}, {hospital.address.state}
                          </p>
                          <p className="text-xs text-gray-500">{hospital.contact.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(hospital.isActive ? 'active' : 'inactive')}>
                          {hospital.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditHospitalDialog(hospital)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteHospital(hospital.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hospital-approvals">
            <div className="space-y-6">
              {/* Approval Statistics */}
              <div className="grid md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                        <p className="text-2xl font-bold text-yellow-600">{approvalStats?.totalPending || 0}</p>
                      </div>
                      <Clock className="w-8 h-8 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Approved Hospitals</p>
                        <p className="text-2xl font-bold text-green-600">{approvalStats?.totalApproved || 0}</p>
                      </div>
                      <ThumbsUp className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Rejected Hospitals</p>
                        <p className="text-2xl font-bold text-red-600">{approvalStats?.totalRejected || 0}</p>
                      </div>
                      <ThumbsDown className="w-8 h-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg. Approval Time</p>
                        <p className="text-2xl font-bold">{approvalStats?.averageApprovalTime || 0}h</p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Pending Hospitals List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Pending Hospital Approvals</CardTitle>
                      <CardDescription>Review and approve hospital registrations</CardDescription>
                    </div>
                    <AuditTrailViewer showMetrics={true} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredPendingHospitals.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No pending hospital approvals</p>
                      </div>
                    ) : (
                      filteredPendingHospitals.map((hospital) => (
                        <div key={hospital.id} className="border rounded-lg p-6 space-y-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Building2 className="w-5 h-5 text-blue-600" />
                                <h3 className="text-lg font-semibold">{hospital.name}</h3>
                                <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                              </div>

                              <div className="grid md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-600 mb-1">Hospital Authority</p>
                                  <p className="font-medium">{hospital.authority.name}</p>
                                  <p className="text-gray-500">{hospital.authority.email}</p>
                                  {hospital.authority.phone && (
                                    <p className="text-gray-500">{hospital.authority.phone}</p>
                                  )}
                                </div>

                                <div>
                                  <p className="text-gray-600 mb-1">Hospital Details</p>
                                  <p className="font-medium">{hospital.type}</p>
                                  <p className="text-gray-500">
                                    {hospital.address.city}, {hospital.address.state}
                                  </p>
                                  <p className="text-gray-500">{hospital.contact.phone}</p>
                                </div>
                              </div>

                              {hospital.capacity && (
                                <div className="mt-3">
                                  <p className="text-gray-600 mb-1">Capacity</p>
                                  <div className="flex gap-4 text-sm">
                                    <span>Beds: {hospital.capacity.totalBeds}</span>
                                    <span>ICU: {hospital.capacity.icuBeds}</span>
                                    <span>OT: {hospital.capacity.operationTheaters}</span>
                                  </div>
                                </div>
                              )}

                              {hospital.services && Array.isArray(hospital.services) && hospital.services.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-gray-600 mb-1">Services</p>
                                  <div className="flex flex-wrap gap-1">
                                    {hospital.services.slice(0, 3).map((service, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {service}
                                      </Badge>
                                    ))}
                                    {hospital.services && hospital.services.length > 3 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{(hospital.services?.length || 0) - 3} more
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div className="mt-3 text-xs text-gray-500">
                                Submitted: {new Date(hospital.submittedAt || hospital.createdAt).toLocaleDateString()}
                              </div>
                            </div>

                            <div className="flex gap-2 ml-4">
                              <Button
                                onClick={() => openApproveDialog(hospital)}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                                disabled={loading}
                              >
                                <ThumbsUp className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                onClick={() => openRejectDialog(hospital)}
                                size="sm"
                                variant="destructive"
                                disabled={loading}
                              >
                                <ThumbsDown className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Approvals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(approvalStats?.recentApprovals || []).length === 0 ? (
                        <p className="text-gray-500 text-sm">No recent approvals</p>
                      ) : (
                        (approvalStats?.recentApprovals || []).map((approval, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{approval.hospitalName}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(approval.approvedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge className="bg-green-100 text-green-800">
                              Approved
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Rejections</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(approvalStats?.recentRejections || []).length === 0 ? (
                        <p className="text-gray-500 text-sm">No recent rejections</p>
                      ) : (
                        (approvalStats?.recentRejections || []).map((rejection, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{rejection.hospitalName}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(rejection.rejectedAt).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {rejection.rejectionReason}
                              </p>
                            </div>
                            <Badge className="bg-red-100 text-red-800">
                              Rejected
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Medical Resource Bookings</CardTitle>
                <CardDescription>Monitor and manage critical care reservations and resource allocation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredBookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">{booking.patientName}</p>
                          <p className="text-sm text-gray-600">
                            {booking.resourceType} • {booking.patientAge} years
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(booking.scheduledDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                        <Badge className={getUrgencyColor(booking.urgency)}>
                          {booking.urgency}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteBooking(booking.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blood-requests">
            <Card>
              <CardHeader>
                <CardTitle>Blood Donation Network</CardTitle>
                <CardDescription>Coordinate emergency blood requests and donor matching operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredBloodRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">{request.requesterName}</p>
                          <p className="text-sm text-gray-600">
                            {request.bloodType} • {request.units} units
                          </p>
                          <p className="text-xs text-gray-500">
                            {request.hospital?.name || 'Hospital not specified'}
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
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteBloodRequest(request.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial">
            <AdminFinancialDashboard />
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>RapidCare System Configuration</CardTitle>
                <CardDescription>Configure platform-wide healthcare management settings and operational parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={settingsForm.handleSubmit(handleSaveSettings)} className="space-y-8">
                  {/* General Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Platform Configuration
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="systemName">Healthcare Platform Name</Label>
                        <Input
                          id="systemName"
                          {...settingsForm.register('general.systemName')}
                          placeholder="Enter healthcare platform name"
                        />
                        {settingsForm.formState.errors.general?.systemName && (
                          <p className="text-sm text-red-600 mt-1">
                            {settingsForm.formState.errors.general.systemName.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select
                          value={settingsForm.watch('general.timezone')}
                          onValueChange={(value) => settingsForm.setValue('general.timezone', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UTC">UTC</SelectItem>
                            <SelectItem value="America/New_York">Eastern Time</SelectItem>
                            <SelectItem value="America/Chicago">Central Time</SelectItem>
                            <SelectItem value="America/Denver">Mountain Time</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Security Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Healthcare Security Protocols
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="passwordMinLength">Minimum Password Length (Security Compliance)</Label>
                        <Input
                          id="passwordMinLength"
                          type="number"
                          {...settingsForm.register('security.passwordMinLength', { valueAsNumber: true })}
                          placeholder="6"
                        />
                        {settingsForm.formState.errors.security?.passwordMinLength && (
                          <p className="text-sm text-red-600 mt-1">
                            {settingsForm.formState.errors.security.passwordMinLength.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="sessionTimeout">Healthcare Session Timeout (minutes)</Label>
                        <Input
                          id="sessionTimeout"
                          type="number"
                          {...settingsForm.register('security.sessionTimeout', { valueAsNumber: true })}
                          placeholder="30"
                        />
                        {settingsForm.formState.errors.security?.sessionTimeout && (
                          <p className="text-sm text-red-600 mt-1">
                            {settingsForm.formState.errors.security.sessionTimeout.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="maxLoginAttempts">Maximum Login Attempts (Security)</Label>
                        <Input
                          id="maxLoginAttempts"
                          type="number"
                          {...settingsForm.register('security.maxLoginAttempts', { valueAsNumber: true })}
                          placeholder="5"
                        />
                        {settingsForm.formState.errors.security?.maxLoginAttempts && (
                          <p className="text-sm text-red-600 mt-1">
                            {settingsForm.formState.errors.security.maxLoginAttempts.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Booking Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Medical Resource Booking Configuration
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="defaultDuration">Default Medical Resource Duration (minutes)</Label>
                        <Input
                          id="defaultDuration"
                          type="number"
                          {...settingsForm.register('booking.defaultDuration', { valueAsNumber: true })}
                          placeholder="60"
                        />
                        {settingsForm.formState.errors.booking?.defaultDuration && (
                          <p className="text-sm text-red-600 mt-1">
                            {settingsForm.formState.errors.booking.defaultDuration.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="maxBookingsPerUser">Maximum Resource Bookings Per Patient</Label>
                        <Input
                          id="maxBookingsPerUser"
                          type="number"
                          {...settingsForm.register('booking.maxBookingsPerUser', { valueAsNumber: true })}
                          placeholder="10"
                        />
                        {settingsForm.formState.errors.booking?.maxBookingsPerUser && (
                          <p className="text-sm text-red-600 mt-1">
                            {settingsForm.formState.errors.booking.maxBookingsPerUser.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="requireApproval"
                        {...settingsForm.register('booking.requireApproval')}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="requireApproval">Require medical authority approval for all resource bookings</Label>
                    </div>
                  </div>

                  {/* Notification Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Healthcare Communication Settings</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="emailEnabled"
                          {...settingsForm.register('notifications.emailEnabled')}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="emailEnabled">Enable healthcare email notifications</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="smsEnabled"
                          {...settingsForm.register('notifications.smsEnabled')}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="smsEnabled">Enable emergency SMS notifications</Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => settingsForm.reset(settings)}
                    >
                      Reset
                    </Button>
                    <Button
                      type="submit"
                      disabled={settingsForm.formState.isSubmitting}
                    >
                      {settingsForm.formState.isSubmitting ? 'Updating Configuration...' : 'Save Healthcare Settings'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Healthcare Analytics Dashboard
                  </CardTitle>
                  <CardDescription>Monitor platform performance, resource utilization, and healthcare service metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{stats.totalUsers}</div>
                      <div className="text-sm text-gray-600">Healthcare Users</div>
                      <div className="text-xs text-green-600">+{Math.round(stats.totalUsers * 0.1)} this month</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{stats.totalHospitals}</div>
                      <div className="text-sm text-gray-600">Medical Facilities</div>
                      <div className="text-xs text-green-600">+{Math.round(stats.totalHospitals * 0.05)} this month</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">{stats.totalBookings}</div>
                      <div className="text-sm text-gray-600">Resource Reservations</div>
                      <div className="text-xs text-green-600">+{Math.round(stats.totalBookings * 0.15)} this month</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600">{stats.totalBloodRequests}</div>
                      <div className="text-sm text-gray-600">Emergency Blood Requests</div>
                      <div className="text-xs text-green-600">+{Math.round(stats.totalBloodRequests * 0.08)} this month</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Healthcare Platform Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium">New Healthcare User Registration</p>
                            <p className="text-sm text-gray-600">5 minutes ago</p>
                          </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">New</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="font-medium">Booking Confirmed</p>
                            <p className="text-sm text-gray-600">12 minutes ago</p>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Confirmed</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-5 h-5 text-purple-600" />
                          <div>
                            <p className="font-medium">Hospital Added</p>
                            <p className="text-sm text-gray-600">1 hour ago</p>
                          </div>
                        </div>
                        <Badge className="bg-purple-100 text-purple-800">Added</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>System Health</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Server Status</span>
                        <Badge className="bg-green-100 text-green-800">Online</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Database</span>
                        <Badge className="bg-green-100 text-green-800">Connected</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">API Response Time</span>
                        <span className="text-sm text-gray-600">~150ms</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Active Sessions</span>
                        <span className="text-sm text-gray-600">{stats.activeUsers}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Pending Requests</span>
                        <span className="text-sm text-gray-600">{stats.pendingBookings + stats.pendingBloodRequests}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Hospital Approval Dialog */}
        <Dialog open={approveDialogOpen} onOpenChange={(open) => {
          if (!loading) setApproveDialogOpen(open);
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-green-600" />
                Approve Hospital
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to approve this hospital? Once approved, it will be visible to all users and they can book resources.
              </DialogDescription>
            </DialogHeader>
            {selectedPendingHospital && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-green-900">{selectedPendingHospital.name}</h4>
                      <p className="text-sm text-green-700 mt-1">
                        Authority: {selectedPendingHospital.authority.name}
                      </p>
                      <p className="text-sm text-green-600">
                        📍 {selectedPendingHospital.address.city}, {selectedPendingHospital.address.state}
                      </p>
                      {selectedPendingHospital.contact.phone && (
                        <p className="text-sm text-green-600">
                          📞 {selectedPendingHospital.contact.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Show error if any */}
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setApproveDialogOpen(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleApproveHospital}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Approving...
                      </>
                    ) : (
                      <>
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        Approve Hospital
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Hospital Rejection Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={(open) => {
          if (!loading) {
            setRejectDialogOpen(open);
            if (!open) setRejectionReason('');
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ThumbsDown className="w-5 h-5 text-red-600" />
                Reject Hospital
              </DialogTitle>
              <DialogDescription>
                Please provide a detailed reason for rejecting this hospital registration. The hospital authority will receive this feedback.
              </DialogDescription>
            </DialogHeader>
            {selectedPendingHospital && (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-red-900">{selectedPendingHospital.name}</h4>
                      <p className="text-sm text-red-700 mt-1">
                        Authority: {selectedPendingHospital.authority.name}
                      </p>
                      <p className="text-sm text-red-600">
                        📍 {selectedPendingHospital.address.city}, {selectedPendingHospital.address.state}
                      </p>
                      {selectedPendingHospital.contact.phone && (
                        <p className="text-sm text-red-600">
                          📞 {selectedPendingHospital.contact.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="rejectionReason" className="text-sm font-medium">
                    Rejection Reason <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a detailed explanation of why this hospital is being rejected. Include specific issues that need to be addressed for resubmission..."
                    className="resize-none h-32 mt-1"
                    disabled={loading}
                    required
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">
                      Minimum 10 characters required
                    </p>
                    <p className="text-xs text-gray-500">
                      {rejectionReason.length}/500
                    </p>
                  </div>
                </div>

                {/* Show error if any */}
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRejectDialogOpen(false);
                      setRejectionReason('');
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRejectHospital}
                    variant="destructive"
                    disabled={loading || !rejectionReason.trim() || rejectionReason.trim().length < 10}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Rejecting...
                      </>
                    ) : (
                      <>
                        <ThumbsDown className="w-4 h-4 mr-2" />
                        Reject Hospital
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 