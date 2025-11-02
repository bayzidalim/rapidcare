'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DollarSign, 
  Clock, 
  TrendingUp, 
  History, 
  Calculator, 
  Settings,
  AlertCircle,
  CheckCircle,
  Edit,
  Save,
  X
} from 'lucide-react';
import { pricingAPI } from '@/lib/api';
import { 
  HospitalPricing, 
  PricingFormData, 
  PricingHistoryItem, 
  PricingPreview,
  PricingValidation,
  ApiResponse 
} from '@/lib/types';

interface HospitalPricingDashboardProps {
  hospitalId: number;
  currentPricing?: Record<string, HospitalPricing | null>;
  onPricingUpdate?: (pricing: Record<string, HospitalPricing | null>) => void;
}

const RESOURCE_TYPES = [
  { value: 'beds', label: 'General Beds', icon: '🛏️' },
  { value: 'icu', label: 'ICU Beds', icon: '🏥' },
  { value: 'operationTheatres', label: 'Operation Theatres', icon: '⚕️' }
] as const;

const HospitalPricingDashboard: React.FC<HospitalPricingDashboardProps> = ({
  hospitalId,
  currentPricing: initialPricing,
  onPricingUpdate
}) => {
  const [pricing, setPricing] = useState<Record<string, HospitalPricing | null>>(initialPricing || {});
  const [pricingHistory, setPricingHistory] = useState<PricingHistoryItem[]>([]);
  const [editingResource, setEditingResource] = useState<string | null>(null);
  const [formData, setFormData] = useState<PricingFormData>({
    resourceType: 'beds',
    baseRate: 0,
    hourlyRate: 0,
    minimumCharge: 0,
    maximumCharge: 0,
    currency: 'BDT'
  });
  const [validation, setValidation] = useState<PricingValidation>({ isValid: true, errors: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewData, setPreviewData] = useState<PricingPreview | null>(null);
  const [previewDuration, setPreviewDuration] = useState(24);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!initialPricing) {
      loadPricing();
    }
    loadPricingHistory();
  }, [hospitalId, initialPricing]);

  const loadPricing = async () => {
    try {
      setLoading(true);
      const response = await pricingAPI.getHospitalPricing(hospitalId);
      if (response.data.success) {
        setPricing(response.data.data.pricing);
        onPricingUpdate?.(response.data.data.pricing);
      }
    } catch (error) {
      console.error('Failed to load pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPricingHistory = async () => {
    try {
      const response = await pricingAPI.getPricingHistory(hospitalId, { limit: 20 });
      if (response.data.success) {
        setPricingHistory(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load pricing history:', error);
    }
  };

  const validatePricing = (data: PricingFormData): PricingValidation => {
    const errors: string[] = [];

    if (!data.baseRate || data.baseRate <= 0) {
      errors.push('Base rate must be a positive number');
    }

    if (data.hourlyRate && data.hourlyRate < 0) {
      errors.push('Hourly rate cannot be negative');
    }

    if (data.minimumCharge && data.minimumCharge < 0) {
      errors.push('Minimum charge cannot be negative');
    }

    if (data.maximumCharge && data.maximumCharge < 0) {
      errors.push('Maximum charge cannot be negative');
    }

    if (data.minimumCharge && data.maximumCharge && data.minimumCharge > data.maximumCharge) {
      errors.push('Minimum charge cannot be greater than maximum charge');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handleEdit = (resourceType: string) => {
    const currentResourcePricing = pricing[resourceType];
    setEditingResource(resourceType);
    setFormData({
      resourceType: resourceType as any,
      baseRate: currentResourcePricing?.baseRate || 0,
      hourlyRate: currentResourcePricing?.hourlyRate || 0,
      minimumCharge: currentResourcePricing?.minimumCharge || 0,
      maximumCharge: currentResourcePricing?.maximumCharge || 0,
      currency: currentResourcePricing?.currency || 'BDT'
    });
    setValidation({ isValid: true, errors: [] });
  };

  const handleSave = async () => {
    const validationResult = validatePricing(formData);
    setValidation(validationResult);

    if (!validationResult.isValid) {
      return;
    }

    try {
      setSaving(true);
      const response = await pricingAPI.updateHospitalPricing(hospitalId, formData);
      
      if (response.data.success) {
        // Update local state
        const updatedPricing = { ...pricing };
        updatedPricing[formData.resourceType] = response.data.data.pricing;
        setPricing(updatedPricing);
        onPricingUpdate?.(updatedPricing);
        
        // Refresh history
        await loadPricingHistory();
        
        // Reset form
        setEditingResource(null);
        setFormData({
          resourceType: 'beds',
          baseRate: 0,
          hourlyRate: 0,
          minimumCharge: 0,
          maximumCharge: 0,
          currency: 'BDT'
        });
      }
    } catch (error: any) {
      console.error('Failed to update pricing:', error);
      setValidation({
        isValid: false,
        errors: [error.response?.data?.error || 'Failed to update pricing']
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingResource(null);
    setValidation({ isValid: true, errors: [] });
  };

  const handlePreview = async (resourceType: string) => {
    const resourcePricing = pricing[resourceType];
    if (!resourcePricing) return;

    try {
      const response = await pricingAPI.calculateBookingAmount({
        hospitalId,
        resourceType,
        duration: previewDuration
      });

      if (response.data.success) {
        const calculation = response.data.data;
        setPreviewData({
          resourceType,
          duration: previewDuration,
          baseRate: calculation.baseRate,
          hourlyRate: calculation.hourlyRate,
          calculatedAmount: calculation.calculatedAmount,
          minimumCharge: calculation.minimumCharge,
          maximumCharge: calculation.maximumCharge,
          finalAmount: calculation.calculatedAmount,
          breakdown: [
            { description: 'Base Rate (24 hours)', amount: calculation.baseRate },
            ...(calculation.hourlyRate && previewDuration > 24 ? 
              [{ description: `Additional Hours (${previewDuration - 24}h × $${calculation.hourlyRate})`, 
                 amount: (previewDuration - 24) * calculation.hourlyRate }] : []),
            ...(calculation.minimumCharge && calculation.calculatedAmount < calculation.minimumCharge ?
              [{ description: 'Minimum Charge Applied', amount: calculation.minimumCharge - calculation.calculatedAmount }] : []),
            ...(calculation.maximumCharge && calculation.calculatedAmount > calculation.maximumCharge ?
              [{ description: 'Maximum Charge Applied', amount: calculation.maximumCharge - calculation.calculatedAmount }] : [])
          ]
        });
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Failed to calculate preview:', error);
    }
  };

  const formatCurrency = (amount: number, currency = 'BDT') => {
    return `৳${amount.toLocaleString('en-BD')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading pricing information...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pricing Management</h2>
          <p className="text-gray-600">Manage rates for your hospital resources</p>
        </div>
        <Button
          onClick={() => loadPricing()}
          variant="outline"
          className="flex items-center gap-2"
        >
          <TrendingUp className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="current" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">Current Pricing</TabsTrigger>
          <TabsTrigger value="history">Pricing History</TabsTrigger>
          <TabsTrigger value="preview">Pricing Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
            {RESOURCE_TYPES.map((resource) => {
              const resourcePricing = pricing[resource.value];
              const isEditing = editingResource === resource.value;

              return (
                <Card key={resource.value} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{resource.icon}</span>
                        <div>
                          <CardTitle className="text-lg">{resource.label}</CardTitle>
                          <CardDescription>
                            {resourcePricing ? 'Active pricing' : 'No pricing set'}
                          </CardDescription>
                        </div>
                      </div>
                      {!isEditing && (
                        <Button
                          onClick={() => handleEdit(resource.value)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="baseRate">Base Rate *</Label>
                            <Input
                              id="baseRate"
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.baseRate === 0 ? '' : formData.baseRate}
                              onChange={(e) => {
                                const value = e.target.value;
                                setFormData({ ...formData, baseRate: value === '' ? 0 : parseFloat(value) });
                              }}
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <Label htmlFor="hourlyRate">Hourly Rate</Label>
                            <Input
                              id="hourlyRate"
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.hourlyRate === 0 ? '' : formData.hourlyRate}
                              onChange={(e) => {
                                const value = e.target.value;
                                setFormData({ ...formData, hourlyRate: value === '' ? 0 : parseFloat(value) });
                              }}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="minimumCharge">Minimum Charge</Label>
                            <Input
                              id="minimumCharge"
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.minimumCharge === 0 ? '' : formData.minimumCharge}
                              onChange={(e) => {
                                const value = e.target.value;
                                setFormData({ ...formData, minimumCharge: value === '' ? 0 : parseFloat(value) });
                              }}
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <Label htmlFor="maximumCharge">Maximum Charge</Label>
                            <Input
                              id="maximumCharge"
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.maximumCharge === 0 ? '' : formData.maximumCharge}
                              onChange={(e) => {
                                const value = e.target.value;
                                setFormData({ ...formData, maximumCharge: value === '' ? 0 : parseFloat(value) });
                              }}
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        {!validation.isValid && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              <ul className="list-disc list-inside">
                                {validation.errors.map((error, index) => (
                                  <li key={index}>{error}</li>
                                ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="flex gap-2">
                          <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-1"
                          >
                            <Save className="h-3 w-3" />
                            {saving ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            onClick={handleCancel}
                            variant="outline"
                            className="flex items-center gap-1"
                          >
                            <X className="h-3 w-3" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : resourcePricing ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Base Rate</span>
                          <span className="font-semibold">{formatCurrency(resourcePricing.baseRate, resourcePricing.currency)}</span>
                        </div>
                        {resourcePricing.hourlyRate && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Hourly Rate</span>
                            <span className="font-semibold">{formatCurrency(resourcePricing.hourlyRate, resourcePricing.currency)}</span>
                          </div>
                        )}
                        {resourcePricing.minimumCharge && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Minimum</span>
                            <span className="text-sm">{formatCurrency(resourcePricing.minimumCharge, resourcePricing.currency)}</span>
                          </div>
                        )}
                        {resourcePricing.maximumCharge && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Maximum</span>
                            <span className="text-sm">{formatCurrency(resourcePricing.maximumCharge, resourcePricing.currency)}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Last updated</span>
                          <span>{formatDate(resourcePricing.updatedAt)}</span>
                        </div>
                        <Button
                          onClick={() => handlePreview(resource.value)}
                          variant="outline"
                          size="sm"
                          className="w-full flex items-center gap-1"
                        >
                          <Calculator className="h-3 w-3" />
                          Preview Calculation
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No pricing configured</p>
                        <p className="text-xs">Click Edit to set rates</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Pricing History
              </CardTitle>
              <CardDescription>
                Track all pricing changes and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pricingHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource Type</TableHead>
                      <TableHead>Base Rate</TableHead>
                      <TableHead>Hourly Rate</TableHead>
                      <TableHead>Effective From</TableHead>
                      <TableHead>Updated By</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingHistory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>
                              {RESOURCE_TYPES.find(r => r.value === item.resourceType)?.icon}
                            </span>
                            {RESOURCE_TYPES.find(r => r.value === item.resourceType)?.label}
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(item.baseRate, item.currency)}</TableCell>
                        <TableCell>
                          {item.hourlyRate ? formatCurrency(item.hourlyRate, item.currency) : '-'}
                        </TableCell>
                        <TableCell>{formatDate(item.effectiveFrom)}</TableCell>
                        <TableCell>{item.createdByName || 'Unknown'}</TableCell>
                        <TableCell>
                          <Badge variant={item.isActive ? 'default' : 'secondary'}>
                            {item.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No pricing history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Pricing Preview
              </CardTitle>
              <CardDescription>
                Calculate booking amounts based on current pricing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="previewDuration">Duration (hours)</Label>
                    <Input
                      id="previewDuration"
                      type="number"
                      min="1"
                      value={previewDuration}
                      onChange={(e) => setPreviewDuration(parseInt(e.target.value) || 24)}
                    />
                  </div>
                  <div className="grid gap-2">
                    {RESOURCE_TYPES.map((resource) => {
                      const resourcePricing = pricing[resource.value];
                      return (
                        <Button
                          key={resource.value}
                          onClick={() => handlePreview(resource.value)}
                          disabled={!resourcePricing}
                          variant="outline"
                          className="justify-start"
                        >
                          <span className="mr-2">{resource.icon}</span>
                          Preview {resource.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                {previewData && (
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-3">
                        {RESOURCE_TYPES.find(r => r.value === previewData.resourceType)?.label} - {previewData.duration}h
                      </h4>
                      <div className="space-y-2">
                        {previewData.breakdown.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>{item.description}</span>
                            <span>{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>Total Amount</span>
                          <span>{formatCurrency(previewData.finalAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pricing Preview</DialogTitle>
            <DialogDescription>
              Calculated booking amount for {previewData?.duration} hours
            </DialogDescription>
          </DialogHeader>
          {previewData && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-3">
                  {RESOURCE_TYPES.find(r => r.value === previewData.resourceType)?.label}
                </h4>
                <div className="space-y-2">
                  {previewData.breakdown.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.description}</span>
                      <span>{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total Amount</span>
                    <span>{formatCurrency(previewData.finalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HospitalPricingDashboard;