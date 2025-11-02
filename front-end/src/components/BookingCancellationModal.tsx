'use client';

import React, { useState } from 'react';
import { Booking } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { bookingAPI, paymentAPI } from '@/lib/api';
import { 
  AlertTriangle, 
  DollarSign, 
  RefreshCw, 
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface BookingCancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  onCancellationComplete: (updatedBooking: Booking) => void;
}

const BookingCancellationModal: React.FC<BookingCancellationModalProps> = ({
  isOpen,
  onClose,
  booking,
  onCancellationComplete
}) => {
  const [reason, setReason] = useState('');
  const [requestRefund, setRequestRefund] = useState(booking.payment?.status === 'paid');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString('en-BD')}`;
  };

  const getRefundAmount = () => {
    // Calculate refund amount based on cancellation policy
    // For now, assume 80% refund if cancelled more than 24 hours before
    const scheduledDate = new Date(booking.scheduledDate);
    const now = new Date();
    const hoursUntilBooking = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilBooking > 24) {
      return (booking.payment?.amount || 0) * 0.8; // 80% refund
    } else if (hoursUntilBooking > 12) {
      return (booking.payment?.amount || 0) * 0.5; // 50% refund
    } else {
      return 0; // No refund
    }
  };

  const refundAmount = getRefundAmount();
  const canGetRefund = booking.payment?.status === 'paid' && refundAmount > 0;

  const handleCancellation = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for cancellation');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Cancel the booking
      await bookingAPI.cancel(booking.id, {
        reason: reason.trim(),
        requestRefund: requestRefund && canGetRefund
      });

      // If refund was requested and payment exists, process refund
      if (requestRefund && canGetRefund && booking.payment?.transactionId) {
        try {
          await paymentAPI.processRefund(booking.payment?.transactionId, {
            refundAmount: refundAmount,
            reason: `Booking cancellation: ${reason.trim()}`
          });
        } catch (refundError) {
          console.error('Refund processing error:', refundError);
          // Booking was cancelled but refund failed - this should be handled by support
        }
      }

      // Update the booking status
      const updatedBooking: Booking = {
        ...booking,
        status: 'cancelled',
        notes: reason.trim(),
        payment: {
          ...(booking.payment || {}),
          status: requestRefund && canGetRefund ? 'refunded' : (booking.payment?.status || 'pending')
        }
      };

      onCancellationComplete(updatedBooking);
      onClose();

    } catch (error: any) {
      console.error('Cancellation error:', error);
      setError(error.response?.data?.error || 'Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setReason('');
      setError('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Cancel Booking
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Booking Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Booking Details</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Patient:</span>
                <span>{booking.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Resource:</span>
                <span className="capitalize">{booking.resourceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span>{new Date(booking.scheduledDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <Badge variant="outline">{booking.status}</Badge>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          {booking.payment?.status === 'paid' && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Payment Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-medium">{formatCurrency(booking.payment?.amount || 0)}</span>
                </div>
                {canGetRefund && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Refund Amount:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(refundAmount)}
                    </span>
                  </div>
                )}
                {!canGetRefund && booking.payment?.status === 'paid' && (
                  <div className="text-xs text-orange-600">
                    No refund available due to cancellation policy
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Refund Policy Alert */}
          {booking.payment?.status === 'paid' && (
            <Alert>
              <Clock className="w-4 h-4" />
              <AlertDescription className="text-xs">
                Refund policy: 80% refund if cancelled 24+ hours before, 50% if cancelled 12+ hours before, no refund otherwise.
              </AlertDescription>
            </Alert>
          )}

          {/* Cancellation Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Cancellation *</Label>
            <Textarea
              id="reason"
              placeholder="Please provide a reason for cancelling this booking..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Refund Option */}
          {canGetRefund && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="requestRefund"
                checked={requestRefund}
                onChange={(e) => setRequestRefund(e.target.checked)}
                disabled={loading}
                className="rounded"
              />
              <Label htmlFor="requestRefund" className="text-sm">
                Request refund of {formatCurrency(refundAmount)}
              </Label>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancellation}
              disabled={loading || !reason.trim()}
              className="flex-1"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel Booking
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingCancellationModal;