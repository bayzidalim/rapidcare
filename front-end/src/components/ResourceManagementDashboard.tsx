'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { hospitalAPI } from '@/lib/api';
import { Hospital } from '@/lib/types';
import { pollingClient, SessionControl } from '@/lib/pollingClient';
import { 
  Bed, 
  Heart, 
  Scissors,
  Save,
  AlertTriangle,
  CheckCircle,
  RefreshCw
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
  
  // Refs for polling sessions
  const resourcePollingSession = useRef<SessionControl | null>(null);
  const dashboardPollingSession = useRef<SessionControl | null>(null);
  
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


  // Initialize polling for real-time updates
  useEffect(() => {
    if (!pollingEnabled) {
      // Stop polling if disabled
      if (resourcePollingSession.current) {
        resourcePollingSession.current.stop();
        resourcePollingSession.current = null;
      }
      if (dashboardPollingSession.current) {
        dashboardPollingSession.current.stop();
        dashboardPollingSession.current = null;
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
      // Ensure polling client has the latest token
      pollingClient.setAuthToken(token);
    }

    // Don't start polling if hospital is not approved
    if (hospital.approvalStatus !== 'approved') {
      console.log('Hospital not approved, skipping polling setup');
      if (resourcePollingSession.current) {
        resourcePollingSession.current.stop();
        resourcePollingSession.current = null;
      }
      if (dashboardPollingSession.current) {
        dashboardPollingSession.current.stop();
        dashboardPollingSession.current = null;
      }
      setPollingStatus(prev => ({ ...prev, isConnected: false }));
      return;
    }

    // Set up polling client event handlers
    pollingClient.setEventHandlers({
      onConnect: (sessionId, endpoint) => {
        console.log(`Polling connected: ${sessionId} -> ${endpoint}`);
        setPollingStatus(prev => ({ ...prev, isConnected: true, retryCount: 0 }));
      },
      onDisconnect: (sessionId, endpoint) => {
        console.log(`Polling disconnected: ${sessionId} -> ${endpoint}`);
        setPollingStatus(prev => ({ ...prev, isConnected: false }));
      }
    });

    // Start resource polling
    resourcePollingSession.current = pollingClient.pollResources(
      `resource-dashboard-${hospital.id}`,
      hospital.id,
      {
        interval: 15000, // 15 seconds for resource updates
        onUpdate: (data, sessionId) => {
          console.log('Resource polling update:', data);
          
          if (data.hasChanges && data.changes?.byHospital?.length > 0) {
            const hospitalData = data.changes.byHospital.find(
              (h: any) => h.hospitalId === hospital.id
            );
            
            if (hospitalData && hospitalData.resources) {
              const newResources: ResourceData = {
                beds: { total: 0, available: 0 },
                icu: { total: 0, available: 0 },
                operationTheatres: { total: 0, available: 0 }
              };
              
              hospitalData.resources.forEach((resource: any) => {
                if (resource.resourceType === 'beds') {
                  newResources.beds = {
                    total: resource.total,
                    available: resource.available
                  };
                } else if (resource.resourceType === 'icu') {
                  newResources.icu = {
                    total: resource.total,
                    available: resource.available
                  };
                } else if (resource.resourceType === 'operationTheatres') {
                  newResources.operationTheatres = {
                    total: resource.total,
                    available: resource.available
                  };
                }
              });
              
              setResources(newResources);
              setLastUpdate(data.currentTimestamp || new Date().toISOString());
              
              // Update hospital data
              const updatedHospital = {
                ...hospital,
                resources: {
                  beds: newResources.beds,
                  icu: newResources.icu,
                  operationTheatres: newResources.operationTheatres
                }
              };
              onUpdate(updatedHospital);
            }
          }
          
          // Update polling status
          const status = resourcePollingSession.current?.getStatus();
          if (status?.exists) {
            setPollingStatus(prev => ({
              ...prev,
              interval: status.interval || prev.interval,
              retryCount: status.retryCount || 0
            }));
          }
        },
        onError: (error, sessionId, retryCount) => {
          console.error(`Resource polling error (${sessionId}):`, error, `Retry: ${retryCount}`);
          setPollingStatus(prev => ({ 
            ...prev, 
            isConnected: false, 
            retryCount 
          }));
          
          // If it's a 404 error, stop polling to prevent spam
          if (error.message.includes('404') || error.message.includes('Not Found')) {
            console.log('Polling endpoint not found, stopping polling');
            if (resourcePollingSession.current) {
              resourcePollingSession.current.stop();
              resourcePollingSession.current = null;
            }
            return;
          }
          
          if (retryCount >= 3) {
            setError(`Polling connection lost. Please refresh the page.`);
          }
        }
      }
    );

    // Start dashboard polling for combined updates
    dashboardPollingSession.current = pollingClient.pollDashboard(
      `dashboard-${hospital.id}`,
      hospital.id,
      {
        interval: 30000, // 30 seconds for dashboard updates
        onUpdate: (data, sessionId) => {
          console.log('Dashboard polling update:', data);
          
          // Handle dashboard-specific updates here if needed
          if (data.dashboard) {
            // Update any dashboard-specific state
            setLastUpdate(data.currentTimestamp || new Date().toISOString());
          }
        },
        onError: (error, sessionId, retryCount) => {
          console.error(`Dashboard polling error (${sessionId}):`, error, `Retry: ${retryCount}`);
          
          // If it's a 404 error, stop polling to prevent spam
          if (error.message.includes('404') || error.message.includes('Not Found')) {
            console.log('Dashboard polling endpoint not found, stopping polling');
            if (dashboardPollingSession.current) {
              dashboardPollingSession.current.stop();
              dashboardPollingSession.current = null;
            }
            return;
          }
        }
      }
    );

    // Cleanup function
    return () => {
      if (resourcePollingSession.current) {
        resourcePollingSession.current.stop();
        resourcePollingSession.current = null;
      }
      if (dashboardPollingSession.current) {
        dashboardPollingSession.current.stop();
        dashboardPollingSession.current = null;
      }
    };
  }, [hospital.id, pollingEnabled, onUpdate]);


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

      </Tabs>
    </div>
  );
}