'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { hospitalAPI } from '@/lib/api';
import { Hospital } from '@/lib/types';
// Removed complex pollingClient - using simple polling instead
import { 
  Bed, 
  Heart, 
  Scissors,
  Save,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  History,
  Filter,
  Calendar,
  User,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

interface ResourceManagementDashboardProps {
  hospital: Hospital;
  onUpdate: (updatedHospital: Hospital) => void;
}

interface ResourceData {
  beds: {
    total: number;
    available: number;
  };
  icu: {
    total: number;
    available: number;
  };
  operationTheatres: {
    total: number;
    available: number;
  };
}

interface ResourceHistoryItem {
  id: number;
  resourceType: 'beds' | 'icu' | 'operationTheatres';
  changeType: 'manual_update' | 'booking_approved' | 'booking_completed' | 'booking_cancelled';
  oldValue: number;
  newValue: number;
  quantity: number;
  changedBy: number;
  changedByName?: string;
  reason?: string;
  timestamp: string;
  bookingId?: number;
}

interface ValidationError {
  field: string;
  message: string;
}

export default function ResourceManagementDashboard({ hospital, onUpdate }: ResourceManagementDashboardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [pollingEnabled, setPollingEnabled] = useState(
    // Disable polling by default to prevent 404 errors
    // Can be enabled by setting NEXT_PUBLIC_ENABLE_POLLING=true
    process.env.NEXT_PUBLIC_ENABLE_POLLING === 'true'
  );
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toISOString());
  const [pollingStatus, setPollingStatus] = useState<{
    isConnected: boolean;
    retryCount: number;
    interval: number;
  }>({
    isConnected: false,
    retryCount: 0,
    interval: 30000
  });
  
  // Refs for polling intervals
  const resourcePollingInterval = useRef<NodeJS.Timeout | null>(null);
  const dashboardPollingInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Resource management state
  const [resources, setResources] = useState<ResourceData>({
    beds: {
      total: hospital.resources?.beds?.total || 0,
      available: hospital.resources?.beds?.available || 0,
    },
    icu: {
      total: hospital.resources?.icu?.total || 0,
      available: hospital.resources?.icu?.available || 0,
    },
    operationTheatres: {
      total: hospital.resources?.operationTheatres?.total || 0,
      available: hospital.resources?.operationTheatres?.available || 0,
    },
  });

  // History state
  const [history, setHistory] = useState<ResourceHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({
    resourceType: '',
    changeType: '',
    startDate: '',
    endDate: ''
  });

  // Initialize polling for real-time updates
  useEffect(() => {
    if (!pollingEnabled) {
      // Stop polling if disabled
      if (resourcePollingInterval.current) {
        clearInterval(resourcePollingInterval.current);
        resourcePollingInterval.current = null;
      }
      if (dashboardPollingInterval.current) {
        clearInterval(dashboardPollingInterval.current);
        dashboardPollingInterval.current = null;
      }
      setPollingStatus(prev => ({ ...prev, isConnected: false }));
      return;
    }

    // Check if user is authenticated and hospital is approved
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No authentication token, skipping polling setup');
        setPollingStatus(prev => ({ ...prev, isConnected: false }));
        return;
      }
    }

    // Don't start polling if hospital is not approved
    if (hospital.approvalStatus !== 'approved') {
      console.log('Hospital not approved, skipping polling setup');
      if (resourcePollingInterval.current) {
        clearInterval(resourcePollingInterval.current);
        resourcePollingInterval.current = null;
      }
      if (dashboardPollingInterval.current) {
        clearInterval(dashboardPollingInterval.current);
        dashboardPollingInterval.current = null;
      }
      setPollingStatus(prev => ({ ...prev, isConnected: false }));
      return;
    }

    // Simple polling function
    const pollResources = async () => {
      try {
        const response = await fetch(`/api/hospitals/${hospital.id}/resources`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            onUpdate({ ...hospital, resources: data.data });
            setPollingStatus(prev => ({ ...prev, isConnected: true, retryCount: 0 }));
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        setPollingStatus(prev => ({ ...prev, isConnected: false, retryCount: prev.retryCount + 1 }));
      }
    };

    // Start simple polling
    pollResources(); // Initial call
    resourcePollingInterval.current = setInterval(pollResources, 30000); // Poll every 30 seconds
    // Cleanup function
    return () => {
      if (resourcePollingInterval.current) {
        clearInterval(resourcePollingInterval.current);
        resourcePollingInterval.current = null;
      }
      if (dashboardPollingInterval.current) {
        clearInterval(dashboardPollingInterval.current);
        dashboardPollingInterval.current = null;
      }
    };
  }, [hospital.id, pollingEnabled, onUpdate]);

  // Load resource history
  const loadResourceHistory = async () => {
    try {
      setHistoryLoading(true);
      
      const params = new URLSearchParams();
      if (historyFilters.resourceType) params.append('resourceType', historyFilters.resourceType);
      if (historyFilters.changeType) params.append('changeType', historyFilters.changeType);
      if (historyFilters.startDate) params.append('startDate', historyFilters.startDate);
      if (historyFilters.endDate) params.append('endDate', historyFilters.endDate);
      params.append('limit', '50');
      
      const response = await fetch(`/api/hospitals/${hospital.id}/resources/history?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setHistory(result.data);
        }
      }
    } catch (error) {
      console.error('Error loading resource history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, [hospital.id, historyFilters]);

  useEffect(() => {
    loadResourceHistory();
  }, [loadResourceHistory]);

  const handleResourceChange = (
    resourceType: 'beds' | 'icu' | 'operationTheatres',
    field: 'total' | 'available',
    value: number
  ) => {
    const newValue = Math.max(0, value);
    setResources(prev => ({
      ...prev,
      [resourceType]: {
        ...prev[resourceType],
        [field]: newValue
      }
    }));

    // Clear validation errors for this field
    setValidationErrors(prev => 
      prev.filter(error => error.field !== `${resourceType}.${field}`)
    );
  };

  const validateResources = (): boolean => {
    const errors: ValidationError[] = [];

    // Check if available doesn't exceed total for each resource
    if (resources.beds.available > resources.beds.total) {
      errors.push({
        field: 'beds.available',
        message: 'Available beds cannot exceed total beds'
      });
    }
    if (resources.icu.available > resources.icu.total) {
      errors.push({
        field: 'icu.available',
        message: 'Available ICU beds cannot exceed total ICU beds'
      });
    }
    if (resources.operationTheatres.available > resources.operationTheatres.total) {
      errors.push({
        field: 'operationTheatres.available',
        message: 'Available operation theatres cannot exceed total operation theatres'
      });
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!validateResources()) {
      setError('Please fix validation errors before saving');
      return;
    }

    try {
      setLoading(true);
      
      const updateData = {
        resources: {
          beds: {
            total: resources.beds.total,
            available: resources.beds.available,
            occupied: resources.beds.total - resources.beds.available
          },
          icu: {
            total: resources.icu.total,
            available: resources.icu.available,
            occupied: resources.icu.total - resources.icu.available
          },
          operationTheatres: {
            total: resources.operationTheatres.total,
            available: resources.operationTheatres.available,
            occupied: resources.operationTheatres.total - resources.operationTheatres.available
          }
        }
      };

      const response = await hospitalAPI.updateMyHospitalResources(updateData);
      
      if (response.data.success) {
        setSuccess('Resources updated successfully!');
        onUpdate(response.data.data);
        setLastUpdate(new Date().toISOString());
        
        // Reload history to show the new change
        loadResourceHistory();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to update resources');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setResources({
      beds: {
        total: hospital.resources?.beds?.total || 0,
        available: hospital.resources?.beds?.available || 0,
      },
      icu: {
        total: hospital.resources?.icu?.total || 0,
        available: hospital.resources?.icu?.available || 0,
      },
      operationTheatres: {
        total: hospital.resources?.operationTheatres?.total || 0,
        available: hospital.resources?.operationTheatres?.available || 0,
      },
    });
    setError('');
    setSuccess('');
    setValidationErrors([]);
  };

  const getResourceIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'beds': return <Bed className="w-5 h-5 text-blue-600" />;
      case 'icu': return <Heart className="w-5 h-5 text-red-600" />;
      case 'operationTheatres': return <Scissors className="w-5 h-5 text-purple-600" />;
      default: return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'manual_update': return <User className="w-4 h-4 text-blue-600" />;
      case 'booking_approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'booking_completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'booking_cancelled': return <Minus className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getChangeTypeLabel = (changeType: string) => {
    switch (changeType) {
      case 'manual_update': return 'Manual Update';
      case 'booking_approved': return 'Booking Approved';
      case 'booking_completed': return 'Booking Completed';
      case 'booking_cancelled': return 'Booking Cancelled';
      default: return changeType;
    }
  };

  const getResourceLabel = (resourceType: string) => {
    switch (resourceType) {
      case 'beds': return 'Hospital Beds';
      case 'icu': return 'ICU Beds';
      case 'operationTheatres': return 'Operation Theatres';
      default: return resourceType;
    }
  };

  const hasValidationError = (field: string) => {
    return validationErrors.some(error => error.field === field);
  };

  const getValidationError = (field: string) => {
    return validationErrors.find(error => error.field === field)?.message;
  };

  return (
    <div className="space-y-6">
      {/* Header with polling status */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Resource Management</h2>
          <p className="text-gray-600">
            Manage your hospital's resource availability in real-time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className={`w-2 h-2 rounded-full ${
              pollingEnabled && pollingStatus.isConnected ? 'bg-green-500' : 
              pollingEnabled && pollingStatus.retryCount > 0 ? 'bg-yellow-500' :
              'bg-gray-400'
            }`}></div>
            <span>
              {pollingEnabled && pollingStatus.isConnected ? 'Live Updates' : 
               pollingEnabled && pollingStatus.retryCount > 0 ? `Reconnecting (${pollingStatus.retryCount})` :
               pollingEnabled ? 'Connecting...' : 'Updates Paused'}
            </span>
            {pollingEnabled && pollingStatus.isConnected && (
              <span className="text-xs text-gray-500">
                ({Math.round(pollingStatus.interval / 1000)}s)
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPollingEnabled(!pollingEnabled)}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${pollingEnabled && pollingStatus.isConnected ? 'animate-spin' : ''}`} />
            {pollingEnabled ? 'Pause' : 'Resume'}
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="manage" className="space-y-6">
        <TabsList>
          <TabsTrigger value="manage">Manage Resources</TabsTrigger>
          <TabsTrigger value="history">Change History</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-6">
          {/* Resource Management Cards */}
          <div className="grid gap-6">
            {/* Beds */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bed className="w-5 h-5 text-blue-600" />
                  Hospital Beds
                </CardTitle>
                <CardDescription>
                  Last updated: {new Date(lastUpdate).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="beds-total">Total Beds</Label>
                    <Input
                      id="beds-total"
                      type="number"
                      min="0"
                      value={resources.beds.total}
                      onChange={(e) => handleResourceChange('beds', 'total', parseInt(e.target.value) || 0)}
                      className={hasValidationError('beds.total') ? 'border-red-500' : ''}
                    />
                    {hasValidationError('beds.total') && (
                      <p className="text-sm text-red-600 mt-1">{getValidationError('beds.total')}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="beds-available">Available Beds</Label>
                    <Input
                      id="beds-available"
                      type="number"
                      min="0"
                      max={resources.beds.total}
                      value={resources.beds.available}
                      onChange={(e) => handleResourceChange('beds', 'available', parseInt(e.target.value) || 0)}
                      className={hasValidationError('beds.available') ? 'border-red-500' : ''}
                    />
                    {hasValidationError('beds.available') && (
                      <p className="text-sm text-red-600 mt-1">{getValidationError('beds.available')}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex justify-between text-sm text-gray-600">
                  <span>Occupied: {resources.beds.total - resources.beds.available} beds</span>
                  <span>Utilization: {resources.beds.total > 0 ? Math.round(((resources.beds.total - resources.beds.available) / resources.beds.total) * 100) : 0}%</span>
                </div>
              </CardContent>
            </Card>

            {/* ICU */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Heart className="w-5 h-5 text-red-600" />
                  ICU Beds
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="icu-total">Total ICU Beds</Label>
                    <Input
                      id="icu-total"
                      type="number"
                      min="0"
                      value={resources.icu.total}
                      onChange={(e) => handleResourceChange('icu', 'total', parseInt(e.target.value) || 0)}
                      className={hasValidationError('icu.total') ? 'border-red-500' : ''}
                    />
                    {hasValidationError('icu.total') && (
                      <p className="text-sm text-red-600 mt-1">{getValidationError('icu.total')}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="icu-available">Available ICU Beds</Label>
                    <Input
                      id="icu-available"
                      type="number"
                      min="0"
                      max={resources.icu.total}
                      value={resources.icu.available}
                      onChange={(e) => handleResourceChange('icu', 'available', parseInt(e.target.value) || 0)}
                      className={hasValidationError('icu.available') ? 'border-red-500' : ''}
                    />
                    {hasValidationError('icu.available') && (
                      <p className="text-sm text-red-600 mt-1">{getValidationError('icu.available')}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex justify-between text-sm text-gray-600">
                  <span>Occupied: {resources.icu.total - resources.icu.available} ICU beds</span>
                  <span>Utilization: {resources.icu.total > 0 ? Math.round(((resources.icu.total - resources.icu.available) / resources.icu.total) * 100) : 0}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Operation Theatres */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Scissors className="w-5 h-5 text-purple-600" />
                  Operation Theatres
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ot-total">Total Operation Theatres</Label>
                    <Input
                      id="ot-total"
                      type="number"
                      min="0"
                      value={resources.operationTheatres.total}
                      onChange={(e) => handleResourceChange('operationTheatres', 'total', parseInt(e.target.value) || 0)}
                      className={hasValidationError('operationTheatres.total') ? 'border-red-500' : ''}
                    />
                    {hasValidationError('operationTheatres.total') && (
                      <p className="text-sm text-red-600 mt-1">{getValidationError('operationTheatres.total')}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="ot-available">Available Operation Theatres</Label>
                    <Input
                      id="ot-available"
                      type="number"
                      min="0"
                      max={resources.operationTheatres.total}
                      value={resources.operationTheatres.available}
                      onChange={(e) => handleResourceChange('operationTheatres', 'available', parseInt(e.target.value) || 0)}
                      className={hasValidationError('operationTheatres.available') ? 'border-red-500' : ''}
                    />
                    {hasValidationError('operationTheatres.available') && (
                      <p className="text-sm text-red-600 mt-1">{getValidationError('operationTheatres.available')}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex justify-between text-sm text-gray-600">
                  <span>Occupied: {resources.operationTheatres.total - resources.operationTheatres.available} operation theatres</span>
                  <span>Utilization: {resources.operationTheatres.total > 0 ? Math.round(((resources.operationTheatres.total - resources.operationTheatres.available) / resources.operationTheatres.total) * 100) : 0}%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={resetForm}
              disabled={loading}
            >
              Reset
            </Button>
            <Button 
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* History Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filter History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="resource-filter">Resource Type</Label>
                  <Select
                    value={historyFilters.resourceType}
                    onValueChange={(value) => setHistoryFilters(prev => ({ ...prev, resourceType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All resources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All resources</SelectItem>
                      <SelectItem value="beds">Hospital Beds</SelectItem>
                      <SelectItem value="icu">ICU Beds</SelectItem>
                      <SelectItem value="operationTheatres">Operation Theatres</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="change-filter">Change Type</Label>
                  <Select
                    value={historyFilters.changeType}
                    onValueChange={(value) => setHistoryFilters(prev => ({ ...prev, changeType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All changes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All changes</SelectItem>
                      <SelectItem value="manual_update">Manual Update</SelectItem>
                      <SelectItem value="booking_approved">Booking Approved</SelectItem>
                      <SelectItem value="booking_completed">Booking Completed</SelectItem>
                      <SelectItem value="booking_cancelled">Booking Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={historyFilters.startDate}
                    onChange={(e) => setHistoryFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={historyFilters.endDate}
                    onChange={(e) => setHistoryFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* History List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Resource Change History
              </CardTitle>
              <CardDescription>
                Track all changes made to your hospital resources
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading history...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No history found</h3>
                  <p className="text-gray-600">
                    No resource changes match your current filters.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div key={item.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="flex-shrink-0">
                        {getChangeTypeIcon(item.changeType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getResourceIcon(item.resourceType)}
                          <span className="font-medium">{getResourceLabel(item.resourceType)}</span>
                          <Badge variant="outline" className="text-xs">
                            {getChangeTypeLabel(item.changeType)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            {item.oldValue !== item.newValue ? (
                              <>
                                <span>{item.oldValue}</span>
                                <TrendingUp className="w-3 h-3" />
                                <span>{item.newValue}</span>
                                <span className={`ml-1 ${item.newValue > item.oldValue ? 'text-green-600' : 'text-red-600'}`}>
                                  ({item.newValue > item.oldValue ? '+' : ''}{item.newValue - item.oldValue})
                                </span>
                              </>
                            ) : (
                              <span>No change ({item.newValue})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(item.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                        {item.reason && (
                          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                            {item.reason}
                          </p>
                        )}
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
  );
}