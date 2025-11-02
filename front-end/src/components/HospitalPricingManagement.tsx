'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { pricingAPI } from '@/lib/api';
import { 
  DollarSign, 
  Bed, 
  Heart, 
  Scissors, 
  Save, 
  RefreshCw,
  TrendingUp,
  Calculator
} from 'lucide-react';
import { JSX } from 'react/jsx-runtime';

interface PricingData {
  resource_type: string;
  base_price: number;
  service_charge_percentage: number;
  service_charge_amount: number;
  total_price: number;
  is_default: boolean;
}

interface HospitalPricingManagementProps {
  hospitalId: number;
}

export default function HospitalPricingManagement({ hospitalId }: HospitalPricingManagementProps) {
  const [pricing, setPricing] = useState<Record<string, PricingData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPricing();
  }, [hospitalId]);

  const fetchPricing = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await pricingAPI.getHospitalPricing(hospitalId);
      
      if (response.data.success) {
        // Transform array response to object format
        const pricingArray = response.data.data || [];
        const pricingObject: Record<string, PricingData> = {};
        
        pricingArray.forEach((item: any) => {
          pricingObject[item.resourceType] = {
            resource_type: item.resourceType,
            base_price: item.baseRate,
            service_charge_percentage: item.serviceChargePercentage || 30,
            service_charge_amount: item.serviceChargeAmount || (item.baseRate * 30) / 100,
            total_price: item.totalPrice || item.baseRate + ((item.baseRate * 30) / 100),
            is_default: item.isDefault || false
          };
        });
        
        setPricing(pricingObject);
      } else {
        setError('Failed to load pricing data');
      }
    } catch (error) {
      console.error('Error fetching pricing:', error);
      setError('Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  const updatePricing = async (resourceType: string, basePrice: number) => {
    try {
      setSaving(prev => ({ ...prev, [resourceType]: true }));
      setError('');
      
      const response = await pricingAPI.updateHospitalPricing(hospitalId, {
        resourceType,
        baseRate: basePrice,
        serviceChargePercentage: 30 // Fixed 30% service charge
      });
      
      if (response.data.success) {
        // Refresh pricing data from API
        await fetchPricing();
        setSuccess(`${getResourceLabel(resourceType)} pricing updated successfully!`);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.error || 'Failed to update pricing');
      }
    } catch (error: any) {
      console.error('Error updating pricing:', error);
      setError(error.response?.data?.error || 'Failed to update pricing');
    } finally {
      setSaving(prev => ({ ...prev, [resourceType]: false }));
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'bed': return <Bed className="w-5 h-5" />;
      case 'icu': return <Heart className="w-5 h-5" />;
      case 'operationTheatres': return <Scissors className="w-5 h-5" />;
      default: return <Bed className="w-5 h-5" />;
    }
  };

  const getResourceLabel = (type: string) => {
    switch (type) {
      case 'bed': return 'Hospital Bed';
      case 'icu': return 'ICU';
      case 'operationTheatres': return 'Operation Theatre';
      default: return type;
    }
  };

  const getResourceColor = (type: string) => {
    switch (type) {
      case 'bed': return 'bg-blue-100 text-blue-800';
      case 'icu': return 'bg-red-100 text-red-800';
      case 'operationTheatres': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Resource Pricing Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Loading pricing data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Resource Pricing Management
          </CardTitle>
          <CardDescription>
            Set competitive prices for your hospital resources. Service charge (30%) is automatically added.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="mb-4" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
            {Object.entries(pricing).map(([resourceType, data]) => (
              <PricingCard
                key={resourceType}
                resourceType={resourceType}
                data={data}
                saving={saving[resourceType] || false}
                onUpdate={updatePricing}
                getResourceIcon={getResourceIcon}
                getResourceLabel={getResourceLabel}
                getResourceColor={getResourceColor}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="w-5 h-5 mr-2" />
            Pricing Summary
          </CardTitle>
          <CardDescription>
            Overview of your current pricing structure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(pricing).map(([resourceType, data]) => (
              <div key={resourceType} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getResourceIcon(resourceType)}
                  <div>
                    <p className="font-medium">{getResourceLabel(resourceType)}</p>
                    <p className="text-sm text-gray-500">Per day rate</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    Base: ৳{data.base_price} + Service: ৳{data.service_charge_amount}
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    ৳{data.total_price}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface PricingCardProps {
  resourceType: string;
  data: PricingData;
  saving: boolean;
  onUpdate: (resourceType: string, basePrice: number) => void;
  getResourceIcon: (type: string) => JSX.Element;
  getResourceLabel: (type: string) => string;
  getResourceColor: (type: string) => string;
}

function PricingCard({ 
  resourceType, 
  data, 
  saving, 
  onUpdate, 
  getResourceIcon, 
  getResourceLabel, 
  getResourceColor 
}: PricingCardProps) {
  const [basePrice, setBasePrice] = useState(data.base_price);

  const handleUpdate = () => {
    if (basePrice !== data.base_price && basePrice > 0) {
      onUpdate(resourceType, basePrice);
    }
  };

  const hasChanges = basePrice !== data.base_price;

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getResourceIcon(resourceType)}
            <CardTitle className="text-lg">{getResourceLabel(resourceType)}</CardTitle>
          </div>
          <Badge className={getResourceColor(resourceType)}>
            {data.is_default ? 'Default' : 'Custom'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor={`price-${resourceType}`}>Base Price (৳)</Label>
          <Input
            id={`price-${resourceType}`}
            type="number"
            value={basePrice === 0 ? '' : basePrice}
            onChange={(e) => {
              const value = e.target.value;
              setBasePrice(value === '' ? 0 : Number(value));
            }}
            placeholder="Enter base price"
            min="0"
            step="10"
          />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Base Price:</span>
            <span>৳{basePrice}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Service Charge (30%):</span>
            <span>৳{Math.round((basePrice * 30) / 100)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-2">
            <span>Total Price:</span>
            <span className="text-green-600">৳{basePrice + Math.round((basePrice * 30) / 100)}</span>
          </div>
        </div>

        <Button
          onClick={handleUpdate}
          disabled={!hasChanges || saving || basePrice <= 0}
          className="w-full"
          size="sm"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {hasChanges ? 'Update Price' : 'No Changes'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}