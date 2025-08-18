'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { hospitalAPI } from '@/lib/api';
import { Hospital } from '@/lib/types';
import { 
  Bed, 
  Heart, 
  Scissors,
  Settings,
  Save,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface ResourceManagerProps {
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

export default function ResourceManager({ hospital, onUpdate }: ResourceManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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

  const validateResources = (): boolean => {
    // Check if available doesn't exceed total for each resource
    if (resources.beds.available > resources.beds.total) {
      setError('Available beds cannot exceed total beds');
      return false;
    }
    if (resources.icu.available > resources.icu.total) {
      setError('Available ICU beds cannot exceed total ICU beds');
      return false;
    }
    if (resources.operationTheatres.available > resources.operationTheatres.total) {
      setError('Available operation theatres cannot exceed total operation theatres');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!validateResources()) {
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

      const response = await hospitalAPI.updateResources(hospital.id, updateData);
      
      if (response.data.success) {
        setSuccess('Resources updated successfully!');
        onUpdate(response.data.data);
        
        // Close dialog after a short delay
        setTimeout(() => {
          setIsOpen(false);
          setSuccess('');
        }, 2000);
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
    setError('');
    setSuccess('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) {
        resetForm();
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Manage Resources
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Hospital Resources</DialogTitle>
          <DialogDescription>
            Update the total capacity and current availability of your hospital resources.
            Changes will be reflected immediately across the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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

          {/* Beds */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bed className="w-5 h-5 text-blue-600" />
                Hospital Beds
              </CardTitle>
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
                  />
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
                  />
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Occupied: {resources.beds.total - resources.beds.available} beds
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
                  />
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
                  />
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Occupied: {resources.icu.total - resources.icu.available} ICU beds
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
                  />
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
                  />
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Occupied: {resources.operationTheatres.total - resources.operationTheatres.available} operation theatres
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              Cancel
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
        </div>
      </DialogContent>
    </Dialog>
  );
}