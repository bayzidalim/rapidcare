'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { hospitalAPI } from '@/lib/api';
import { Hospital } from '@/lib/types';
import { 
  Bed, 
  Heart, 
  Scissors,
  Save,
  Edit,
  X,
  AlertTriangle,
  CheckCircle,
  Building2
} from 'lucide-react';

interface HospitalAuthorityResourceManagerProps {
  hospital: Hospital;
  onUpdate?: (updatedHospital: Hospital) => void;
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

export default function HospitalAuthorityResourceManager({ 
  hospital, 
  onUpdate 
}: HospitalAuthorityResourceManagerProps) {
  const [resources, setResources] = useState<ResourceData>({
    beds: {
      total: hospital.resources.beds.total,
      available: hospital.resources.beds.available,
    },
    icu: {
      total: hospital.resources.icu.total,
      available: hospital.resources.icu.available,
    },
    operationTheatres: {
      total: hospital.resources.operationTheatres.total,
      available: hospital.resources.operationTheatres.available,
    },
  });

  const [editingResource, setEditingResource] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleResourceChange = (
    resourceType: 'beds' | 'icu' | 'operationTheatres',
    field: 'total' | 'available',
    value: number
  ) => {
    setResources(prev => ({
      ...prev,
      [resourceType]: {
        ...prev[resourceType],
        [field]: Math.max(0, value)
      }
    }));
  };

  const validateResource = (resourceType: 'beds' | 'icu' | 'operationTheatres'): boolean => {
    const resource = resources[resourceType];
    if (resource.available > resource.total) {
      setError(`Available ${resourceType} cannot exceed total ${resourceType}`);
      return false;
    }
    return true;
  };

  const handleSaveResource = async (resourceType: 'beds' | 'icu' | 'operationTheatres') => {
    setError('');
    setSuccess('');

    if (!validateResource(resourceType)) {
      return;
    }

    try {
      setLoading(true);
      
      const updateData = {
        resources: {
          [resourceType]: {
            total: resources[resourceType].total,
            available: resources[resourceType].available,
            occupied: resources[resourceType].total - resources[resourceType].available
          }
        }
      };

      const response = await hospitalAPI.updateResources(hospital.id, updateData);
      
      if (response.data.success) {
        setSuccess(`${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} updated successfully!`);
        setEditingResource(null);
        
        if (onUpdate) {
          onUpdate(response.data.data);
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error: any) {
      setError(error.response?.data?.error || `Failed to update ${resourceType}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = (resourceType: 'beds' | 'icu' | 'operationTheatres') => {
    // Reset to original values
    setResources(prev => ({
      ...prev,
      [resourceType]: {
        total: hospital.resources[resourceType].total,
        available: hospital.resources[resourceType].available,
      }
    }));
    setEditingResource(null);
    setError('');
  };

  const getResourceIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'beds': return <Bed className="w-5 h-5 text-blue-600" />;
      case 'icu': return <Heart className="w-5 h-5 text-red-600" />;
      case 'operationTheatres': return <Scissors className="w-5 h-5 text-purple-600" />;
      default: return <Building2 className="w-5 h-5 text-gray-600" />;
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

  const getUtilizationColor = (available: number, total: number) => {
    if (total === 0) return 'text-gray-500';
    const utilization = (total - available) / total;
    if (utilization >= 0.9) return 'text-red-600';
    if (utilization >= 0.7) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-semibold text-gray-900">Resource Management</h3>
      </div>

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

      <div className="grid md:grid-cols-3 gap-6">
        {(Object.keys(resources) as Array<keyof ResourceData>).map((resourceType) => {
          const resource = resources[resourceType];
          const isEditing = editingResource === resourceType;
          const occupied = resource.total - resource.available;
          const utilizationPercentage = resource.total > 0 ? Math.round((occupied / resource.total) * 100) : 0;

          return (
            <Card key={resourceType} className="relative">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {getResourceIcon(resourceType)}
                  {getResourceLabel(resourceType)}
                </CardTitle>
                <CardDescription>
                  Current capacity and availability
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`${resourceType}-total`}>Total Capacity</Label>
                      <Input
                        id={`${resourceType}-total`}
                        type="number"
                        min="0"
                        value={resource.total}
                        onChange={(e) => handleResourceChange(resourceType, 'total', parseInt(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`${resourceType}-available`}>Available</Label>
                      <Input
                        id={`${resourceType}-available`}
                        type="number"
                        min="0"
                        max={resource.total}
                        value={resource.available}
                        onChange={(e) => handleResourceChange(resourceType, 'available', parseInt(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSaveResource(resourceType)}
                        disabled={loading}
                        size="sm"
                        className="flex-1"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleCancelEdit(resourceType)}
                        disabled={loading}
                        variant="outline"
                        size="sm"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Total</p>
                        <p className="text-2xl font-bold text-gray-900">{resource.total}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Available</p>
                        <p className="text-2xl font-bold text-green-600">{resource.available}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Occupied</span>
                        <span className={getUtilizationColor(resource.available, resource.total)}>
                          {occupied} ({utilizationPercentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${utilizationPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    <Button
                      onClick={() => setEditingResource(resourceType)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit {getResourceLabel(resourceType)}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-sm font-bold">i</span>
          </div>
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Resource Management Tips</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Update your resource availability regularly to help patients find available services</li>
              <li>• Available resources cannot exceed total capacity</li>
              <li>• Changes are reflected immediately across the platform</li>
              <li>• Monitor utilization rates to optimize resource allocation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}