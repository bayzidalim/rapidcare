'use client';

import React, { useState } from 'react';
import { Hospital } from '@/lib/types';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReviewList } from './ReviewList';
import { ReviewForm } from './ReviewForm';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Bed, 
  Heart, 
  Scissors,
  Star,
  X,
  DollarSign,
  Clock,
  User,
  Shield,
  Building2,
  MessageSquare,
  Plus
} from 'lucide-react';

interface HospitalDetailModalProps {
  hospital: Hospital | null;
  isOpen: boolean;
  onClose: () => void;
}

export function HospitalDetailModal({ hospital, isOpen, onClose }: HospitalDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!hospital) return null;

  const formatPrice = (price: number, currency: string = 'BDT') => {
    if (currency === 'BDT') {
      return `৳${price.toLocaleString()}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const getResourceColor = (available: number) => {
    if (available === 0) return 'bg-red-100 text-red-800 border-red-200';
    if (available <= 5) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-gray-900 mb-2">
                {hospital.name}
              </DialogTitle>
              <p className="text-gray-600 mb-3">
                Detailed information about {hospital.name}
              </p>
              <div className="flex items-center gap-2 mb-2">
                {hospital.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium">{hospital.rating}</span>
                  </div>
                )}
                <Badge 
                  variant={hospital.isActive ? "default" : "secondary"}
                  className={hospital.isActive ? "bg-green-100 text-green-800" : ""}
                >
                  {hospital.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {hospital.type && (
                  <Badge variant="outline" className="capitalize">
                    {hospital.type}
                  </Badge>
                )}
              </div>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="write-review" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Write Review
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">

        <div className="py-6 space-y-6">
          {/* Address Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Address
            </h3>
            <div className="text-gray-700">
              <p>{hospital.address.street}</p>
              <p>{hospital.address.city}, {hospital.address.state} {hospital.address.zipCode}</p>
              <p>{hospital.address.country}</p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Phone className="w-5 h-5 text-blue-600" />
              Contact Information
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="w-4 h-4" />
                <span className="font-medium">Phone:</span>
                <span>{hospital.contact.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="w-4 h-4" />
                <span className="font-medium">Email:</span>
                <span>{hospital.contact.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Shield className="w-4 h-4 text-red-600" />
                <span className="font-medium">Emergency:</span>
                <span className="text-red-600 font-semibold">{hospital.contact.emergency}</span>
              </div>
            </div>
          </div>

          {/* Resources */}
          {hospital.resources && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Resources
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Beds */}
                <div className="bg-white rounded-lg p-4 border">
                  <div className="flex items-center gap-2 mb-3">
                    <Bed className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">Beds</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Available:</span>
                      <Badge className={getResourceColor(hospital.resources.beds?.available || 0)}>
                        {hospital.resources.beds?.available || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-medium">{hospital.resources.beds?.total || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Occupied:</span>
                      <span className="font-medium">{hospital.resources.beds?.occupied || 0}</span>
                    </div>
                  </div>
                  {hospital.pricing?.beds && hospital.pricing.beds.baseRate > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-1 text-sm font-semibold text-blue-700">
                        <DollarSign className="w-3 h-3" />
                        {formatPrice(hospital.pricing.beds.baseRate, hospital.pricing.beds.currency)}/day
                      </div>
                      {hospital.pricing.beds.hourlyRate > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                          <Clock className="w-3 h-3" />
                          {formatPrice(hospital.pricing.beds.hourlyRate, hospital.pricing.beds.currency)}/hr
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ICU */}
                <div className="bg-white rounded-lg p-4 border">
                  <div className="flex items-center gap-2 mb-3">
                    <Heart className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-gray-900">ICU</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Available:</span>
                      <Badge className={getResourceColor(hospital.resources.icu?.available || 0)}>
                        {hospital.resources.icu?.available || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-medium">{hospital.resources.icu?.total || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Occupied:</span>
                      <span className="font-medium">{hospital.resources.icu?.occupied || 0}</span>
                    </div>
                  </div>
                  {hospital.pricing?.icu && hospital.pricing.icu.baseRate > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-1 text-sm font-semibold text-blue-700">
                        <DollarSign className="w-3 h-3" />
                        {formatPrice(hospital.pricing.icu.baseRate, hospital.pricing.icu.currency)}/day
                      </div>
                      {hospital.pricing.icu.hourlyRate > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                          <Clock className="w-3 h-3" />
                          {formatPrice(hospital.pricing.icu.hourlyRate, hospital.pricing.icu.currency)}/hr
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Operation Theatres */}
                <div className="bg-white rounded-lg p-4 border">
                  <div className="flex items-center gap-2 mb-3">
                    <Scissors className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-gray-900">Operation Theatres</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Available:</span>
                      <Badge className={getResourceColor(hospital.resources.operationTheatres?.available || 0)}>
                        {hospital.resources.operationTheatres?.available || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-medium">{hospital.resources.operationTheatres?.total || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Occupied:</span>
                      <span className="font-medium">{hospital.resources.operationTheatres?.occupied || 0}</span>
                    </div>
                  </div>
                  {hospital.pricing?.operationTheatres && hospital.pricing.operationTheatres.baseRate > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-1 text-sm font-semibold text-blue-700">
                        <DollarSign className="w-3 h-3" />
                        {formatPrice(hospital.pricing.operationTheatres.baseRate, hospital.pricing.operationTheatres.currency)}/day
                      </div>
                      {hospital.pricing.operationTheatres.hourlyRate > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                          <Clock className="w-3 h-3" />
                          {formatPrice(hospital.pricing.operationTheatres.hourlyRate, hospital.pricing.operationTheatres.currency)}/hr
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Services */}
          {hospital.services && hospital.services.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Services</h3>
              <div className="flex flex-wrap gap-2">
                {hospital.services.map((service, index) => (
                  <Badge key={index} variant="outline" className="bg-white">
                    {service}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Surgeons */}
          {hospital.surgeons && hospital.surgeons.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Surgeons
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {hospital.surgeons.map((surgeon, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{surgeon.name}</p>
                        <p className="text-sm text-gray-600">{surgeon.specialization}</p>
                      </div>
                      <Badge 
                        variant={surgeon.isAvailable ? "default" : "secondary"}
                        className={surgeon.isAvailable ? "bg-green-100 text-green-800" : ""}
                      >
                        {surgeon.isAvailable ? 'Available' : 'Busy'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {hospital.description && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">About</h3>
              <p className="text-gray-700 leading-relaxed">{hospital.description}</p>
            </div>
          )}
        </div>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <ReviewList 
              hospitalId={hospital.id}
              canVote={true}
            />
          </TabsContent>

          <TabsContent value="write-review" className="mt-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Write a Review for {hospital.name}
              </h3>
              <ReviewForm
                hospitalId={hospital.id}
                onSuccess={() => {
                  setShowReviewForm(false);
                  setActiveTab('reviews');
                }}
                onCancel={() => setActiveTab('overview')}
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
