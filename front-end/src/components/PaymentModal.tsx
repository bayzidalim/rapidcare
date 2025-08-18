import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Shield, 
  Zap, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  User,
  Hospital,
  Calendar
} from 'lucide-react';
import { BookingFormData } from '@/lib/types';
import { ErrorState } from '@/lib/errorHandler';
import EnhancedErrorDisplay from './EnhancedErrorDisplay';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: BookingFormData | null;
  hospitalName?: string;
  loading: boolean;
  errorState: ErrorState;
  retryState: {
    isRetrying: boolean;
    retryCount: number;
    nextRetryIn: number;
  };
  onPaymentConfirm: (transactionId: string) => void;
  onRetry: () => void;
  onDismissError: () => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  bookingData,
  hospitalName,
  loading,
  errorState,
  retryState,
  onPaymentConfirm,
  onRetry,
  onDismissError
}: PaymentModalProps) {
  const [transactionId, setTransactionId] = useState('');
  const [paymentStep, setPaymentStep] = useState<'summary' | 'payment' | 'processing'>('summary');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPaymentStep('summary');
      setTransactionId('');
    }
  }, [isOpen]);

  // Validate booking data
  if (!bookingData) {
    return null;
  }

  const handlePaymentConfirm = () => {
    if (!transactionId.trim()) {
      return;
    }
    setPaymentStep('processing');
    onPaymentConfirm(transactionId);
  };

  const handleClose = () => {
    if (!loading) {
      setTransactionId('');
      setPaymentStep('summary');
      onClose();
    }
  };

  const getResourceTypeDisplay = (type: string) => {
    switch (type) {
      case 'bed': return 'Hospital Bed';
      case 'icu': return 'ICU';
      case 'operationTheatres': return 'Operation Theatre';
      default: return type;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-pink-100">
            <CreditCard className="h-6 w-6 text-pink-600" />
          </div>
          <DialogTitle className="text-xl">
            {paymentStep === 'summary' && 'Booking Summary & Payment'}
            {paymentStep === 'payment' && 'Secure Payment Processing'}
            {paymentStep === 'processing' && 'Processing Payment...'}
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            {paymentStep === 'summary' && 'Review your booking details and proceed to payment'}
            {paymentStep === 'payment' && 'Complete your booking with secure payment via Bkash'}
            {paymentStep === 'processing' && 'Please wait while we process your payment'}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error Display */}
          <EnhancedErrorDisplay 
            errorState={errorState}
            onRetry={onRetry}
            onDismiss={onDismissError}
          />

          {/* Booking Summary */}
          {paymentStep === 'summary' && (
            <Card className="border-2 border-blue-100">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Booking Details</h3>
                  <Badge className={`${getUrgencyColor(bookingData.urgency)} border`}>
                    {bookingData.urgency.toUpperCase()} PRIORITY
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Patient:</span>
                    </div>
                    <p className="text-gray-700 ml-6">{bookingData.patientName}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Hospital className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Hospital:</span>
                    </div>
                    <p className="text-gray-700 ml-6">{hospitalName || 'Selected Hospital'}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Resource:</span>
                    </div>
                    <p className="text-gray-700 ml-6">{getResourceTypeDisplay(bookingData.resourceType)}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Duration:</span>
                    </div>
                    <p className="text-gray-700 ml-6">{bookingData.estimatedDuration} hours</p>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">Emergency Contact:</span>
                    <span className="text-sm text-gray-600">
                      {bookingData.emergencyContactName} ({bookingData.emergencyContactRelationship})
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Summary */}
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Total Amount</span>
              <span className="text-2xl font-bold text-pink-600">৳{bookingData.payment.amount}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Shield className="h-3 w-3" />
              <span>Secure payment gateway • Service charge included</span>
            </div>
          </div>

          {/* Payment Instructions */}
          {(paymentStep === 'payment' || paymentStep === 'processing') && (
            <div className="space-y-3">
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Quick Payment Steps
                </h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Send ৳{bookingData.payment.amount} to: <span className="font-mono font-bold">017XXXXXXXX</span></li>
                  <li>2. Copy the transaction ID from your Bkash confirmation</li>
                  <li>3. Enter the transaction ID below to complete your booking</li>
                </ol>
              </div>

              <div>
                <Label htmlFor="transactionId" className="text-sm font-medium">
                  Transaction ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="transactionId"
                  placeholder="e.g., TXN123456789"
                  className="mt-1 font-mono"
                  value={transactionId}
                  onChange={e => setTransactionId(e.target.value)}
                  disabled={loading}
                />
                {!transactionId && paymentStep === 'payment' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Please enter the transaction ID from your payment confirmation
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {paymentStep === 'summary' && (
              <>
                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 transition-all duration-200 transform hover:scale-105"
                  onClick={() => setPaymentStep('payment')}
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Proceed to Payment
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleClose}
                >
                  Review Booking Details
                </Button>
              </>
            )}

            {(paymentStep === 'payment' || paymentStep === 'processing') && (
              <>
                <Button
                  className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-medium py-3 transition-all duration-200 transform hover:scale-105"
                  onClick={handlePaymentConfirm}
                  disabled={loading || !transactionId.trim()}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {retryState.isRetrying ? (
                        retryState.nextRetryIn > 0 ? 
                          `Retrying in ${retryState.nextRetryIn}s... (${retryState.retryCount}/3)` :
                          `Retrying... (${retryState.retryCount}/3)`
                      ) : (
                        'Processing Payment...'
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Confirm & Secure Booking
                    </div>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => paymentStep === 'payment' ? setPaymentStep('summary') : handleClose()}
                  disabled={loading}
                >
                  {paymentStep === 'payment' ? 'Back to Summary' : 'Cancel Payment'}
                </Button>
              </>
            )}
          </div>

          {/* Security Notice */}
          <div className="bg-gray-50 p-3 rounded-lg border">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-xs text-gray-600">
                <p className="font-medium text-gray-700 mb-1">Secure Transaction</p>
                <p>Your payment information is encrypted and secure. We never store your payment details.</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}