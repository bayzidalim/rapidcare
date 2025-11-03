'use client';

import React, { useState } from 'react';
import { Booking, Transaction } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PaymentReceiptModal from './PaymentReceiptModal';
import BookingCancellationModal from './BookingCancellationModal';
import { ReviewForm } from './ReviewForm';
import { paymentAPI } from '@/lib/api';
import { generateReceiptData, downloadReceiptAsHTML, printReceipt } from '@/lib/receiptUtils';
import { 
  Clock, 
  User, 
  MapPin,
  Bed,
  Heart,
  Scissors,
  CreditCard,
  Receipt,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  DollarSign,
  UserCheck,
  Phone,
  Star
} from 'lucide-react';

interface BookingCardWithPaymentProps {
  booking: Booking;
  onUpdate?: (updatedBooking: Booking) => void;
  showPaymentDetails?: boolean;
  allowCancellation?: boolean;
}

const BookingCardWithPayment: React.FC<BookingCardWithPaymentProps> = ({
  booking,
  onUpdate,
  showPaymentDetails = true,
  allowCancellation = true
}) => {
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showPaymentDetailsModal, setShowPaymentDetailsModal] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showBookingDetailsModal, setShowBookingDetailsModal] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'declined': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'bed': return <Bed className="w-4 h-4" />;
      case 'icu': return <Heart className="w-4 h-4" />;
      case 'operationTheatre': return <Scissors className="w-4 h-4" />;
      default: return <Bed className="w-4 h-4" />;
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

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'refunded':
        return <RefreshCw className="w-4 h-4 text-gray-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatCurrency = (amount: number) => {
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

  const handleViewReceipt = async () => {
    if (!booking.payment?.transactionId) {
      console.error('No transaction ID available');
      return;
    }

    try {
      setLoading(true);
      const response = await paymentAPI.getTransactionDetails(booking.payment.transactionId);
      if (response.data.success) {
        setTransaction(response.data.data.transaction);
        setShowReceiptModal(true);
      }
    } catch (error) {
      console.error('Error fetching transaction details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPaymentDetails = async () => {
    if (!booking.payment?.transactionId) {
      console.error('No transaction ID available');
      return;
    }

    try {
      setLoading(true);
      const response = await paymentAPI.getTransactionDetails(booking.payment.transactionId);
      if (response.data.success) {
        setTransaction(response.data.data.transaction);
        setShowPaymentDetailsModal(true);
      }
    } catch (error) {
      console.error('Error fetching transaction details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = () => {
    if (!allowCancellation || booking.status !== 'pending') {
      return;
    }
    setShowCancellationModal(true);
  };

  const hospitalName = typeof booking.hospitalId === 'object' 
    ? booking.hospitalId.name 
    : 'Hospital';

  const hospitalLocation = typeof booking.hospitalId === 'object' 
    ? `${booking.hospitalId.address?.city || 'Unknown'}, ${booking.hospitalId.address?.state || 'Unknown'}`
    : 'Location';

  return (
    <>
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="pt-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              {getResourceIcon(booking.resourceType)}
              <div>
                <h3 className="font-semibold">{hospitalName}</h3>
                <p className="text-sm text-gray-600">
                  {booking.patientName} • {booking.patientAge} years
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge className={getStatusColor(booking.status)}>
                {booking.status}
              </Badge>
              <Badge className={getUrgencyColor(booking.urgency)}>
                {booking.urgency}
              </Badge>
              {booking.rapidAssistance && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                  <UserCheck className="w-3 h-3 mr-1" />
                  Rapid Assistance
                </Badge>
              )}
            </div>
          </div>

          {/* Booking Details */}
          <div className="grid md:grid-cols-3 gap-4 text-sm mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span>{hospitalLocation}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>{formatDate(booking.scheduledDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span>{booking.emergencyContact?.name || 'N/A'}</span>
            </div>
          </div>

          {/* Payment Information */}
          {showPaymentDetails && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-900">Payment Details</span>
                </div>
                <div className="flex items-center gap-2">
                  {getPaymentStatusIcon(booking.payment?.status || 'pending')}
                  <Badge className={getPaymentStatusColor(booking.payment?.status || 'pending')}>
                    {booking.payment?.status || 'pending'}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">{formatCurrency(booking.payment?.amount || 0)}</span>
                </div>
                {booking.payment?.method && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Method:</span>
                    <span className="font-medium capitalize">
                      {booking.payment?.method?.replace('_', ' ')}
                    </span>
                  </div>
                )}
                {booking.payment?.transactionId && (
                  <div className="flex justify-between col-span-2">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-medium font-mono text-xs">
                      {booking.payment?.transactionId}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Medical Condition */}
          <div className="bg-blue-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-900">
              <span className="font-medium">Medical Condition:</span> {booking.medicalCondition}
            </p>
          </div>

          {/* Rapid Assistance Details */}
          {booking.rapidAssistance && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900">Rapid Assistance Service</h4>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                  Active
                </Badge>
              </div>
              
              <p className="text-sm text-blue-800 mb-3 leading-relaxed">
                A dedicated assistant will escort you from the hospital gate to your assigned location.
              </p>
              
              {/* Assistant Contact Information */}
              {booking.rapidAssistantName && booking.rapidAssistantPhone ? (
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{booking.rapidAssistantName}</p>
                      <p className="text-xs text-gray-600">Assigned Assistant</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Phone className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-medium text-gray-900">{booking.rapidAssistantPhone}</p>
                      <p className="text-xs text-gray-600">Direct contact</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg p-3 border border-blue-200 text-center">
                  <div className="flex items-center justify-center gap-2 text-blue-700">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">Assistant assignment in progress</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Contact details will be provided shortly
                  </p>
                </div>
              )}
              
              {/* Service charge display */}
              {booking.rapidAssistanceCharge && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-700">Service Charge:</span>
                    <span className="font-semibold text-blue-900">৳{booking.rapidAssistanceCharge.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Created:</span> {formatDate(booking.createdAt)}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowBookingDetailsModal(true)}
              >
                View Details
              </Button>
              
              {booking.payment?.status === 'paid' && booking.payment?.transactionId && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewReceipt}
                    disabled={loading}
                  >
                    <Receipt className="w-4 h-4 mr-1" />
                    Receipt
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewPaymentDetails}
                    disabled={loading}
                  >
                    <CreditCard className="w-4 h-4 mr-1" />
                    Payment
                  </Button>
                </>
              )}
              
              {allowCancellation && booking.status === 'pending' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelBooking}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              )}
              
              {booking.status === 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReviewModal(true)}
                  className="text-yellow-600 hover:text-yellow-700"
                >
                  <Star className="w-4 h-4 mr-1" />
                  Review
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Receipt Modal */}
      <PaymentReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        transaction={transaction || undefined}
        onDownload={() => {
          if (transaction) {
            const receipt = generateReceiptData(transaction);
            downloadReceiptAsHTML(receipt);
          }
        }}
        onPrint={() => {
          if (transaction) {
            const receipt = generateReceiptData(transaction);
            printReceipt(receipt);
          }
        }}
      />

      {/* Payment Details Modal */}
      <Dialog open={showPaymentDetailsModal} onOpenChange={setShowPaymentDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          
          {transaction && (
            <div className="space-y-6">
              {/* Transaction Overview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-3">Transaction Overview</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-mono">{transaction.transactionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <Badge className={getPaymentStatusColor(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Date:</span>
                    <span>{formatDate(transaction.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="capitalize">{transaction.paymentMethod.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              {/* Amount Breakdown */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium mb-3">Amount Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hospital Amount:</span>
                    <span className="font-medium">{formatCurrency(transaction.hospitalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service Charge:</span>
                    <span className="font-medium">{formatCurrency(transaction.serviceCharge)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(transaction.amount)}</span>
                  </div>
                </div>
              </div>

              {/* Booking Information */}
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium mb-3">Booking Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Patient:</span>
                    <span>{transaction.patientName || booking.patientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Resource:</span>
                    <span className="capitalize">{transaction.resourceType || booking.resourceType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hospital:</span>
                    <span>{transaction.hospitalName || hospitalName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Scheduled:</span>
                    <span>{formatDate(transaction.scheduledDate || booking.scheduledDate)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowReceiptModal(true)}
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  View Receipt
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (transaction) {
                      const receipt = generateReceiptData(transaction);
                      downloadReceiptAsHTML(receipt);
                    }
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Booking Cancellation Modal */}
      <BookingCancellationModal
        isOpen={showCancellationModal}
        onClose={() => setShowCancellationModal(false)}
        booking={booking}
        onCancellationComplete={(updatedBooking) => {
          if (onUpdate) {
            onUpdate(updatedBooking);
          }
          setShowCancellationModal(false);
        }}
      />

      {/* Booking Details Modal */}
      <Dialog open={showBookingDetailsModal} onOpenChange={setShowBookingDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Hospital Information */}
            <div className="space-y-3">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Hospital Information
              </h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{hospitalName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Location:</span>
                  <span className="font-medium">{hospitalLocation}</span>
                </div>
              </div>
            </div>

            {/* Patient Information */}
            <div className="space-y-3">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Patient Information
              </h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{booking.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Age:</span>
                  <span className="font-medium">{booking.patientAge} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gender:</span>
                  <span className="font-medium capitalize">{booking.patientGender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Medical Condition:</span>
                  <span className="font-medium">{booking.medicalCondition}</span>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-3">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-600" />
                Emergency Contact
              </h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{booking.emergencyContact?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{booking.emergencyContact?.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Relationship:</span>
                  <span className="font-medium capitalize">{booking.emergencyContact?.relationship || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Booking Information */}
            <div className="space-y-3">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Booking Information
              </h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Resource Type:</span>
                  <span className="font-medium capitalize">{booking.resourceType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Scheduled Date:</span>
                  <span className="font-medium">{formatDate(booking.scheduledDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{booking.estimatedDuration} hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Urgency:</span>
                  <Badge className={getUrgencyColor(booking.urgency)}>{booking.urgency}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Booking ID:</span>
                  <span className="font-medium font-mono text-xs">#{booking.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">{formatDate(booking.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Rapid Assistance */}
            {booking.rapidAssistance && (
              <div className="space-y-3">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  Rapid Assistance
                </h4>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 space-y-2 border border-blue-200">
                  <p className="text-sm text-blue-800">
                    Rapid Assistance service is active for this booking. A dedicated assistant will escort you from the hospital gate to your assigned location.
                  </p>
                  {booking.rapidAssistantName && booking.rapidAssistantPhone && (
                    <div className="mt-3 pt-3 border-t border-blue-200 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Assistant Name:</span>
                        <span className="font-medium">{booking.rapidAssistantName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Assistant Phone:</span>
                        <span className="font-medium font-mono">{booking.rapidAssistantPhone}</span>
                      </div>
                    </div>
                  )}
                  {booking.rapidAssistanceCharge && (
                    <div className="pt-2 border-t border-blue-200">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Service Charge:</span>
                        <span className="font-semibold">৳{booking.rapidAssistanceCharge.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Information */}
            {showPaymentDetails && (
              <div className="space-y-3">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  Payment Information
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">{formatCurrency(booking.payment?.amount || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Payment Status:</span>
                    <Badge className={getPaymentStatusColor(booking.payment?.status || 'pending')}>
                      {booking.payment?.status || 'pending'}
                    </Badge>
                  </div>
                  {booking.payment?.method && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Method:</span>
                      <span className="font-medium capitalize">{booking.payment.method.replace('_', ' ')}</span>
                    </div>
                  )}
                  {booking.payment?.transactionId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transaction ID:</span>
                      <span className="font-medium font-mono text-xs">{booking.payment.transactionId}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {booking.notes && (
              <div className="space-y-3">
                <h4 className="font-semibold text-lg">Notes</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">{booking.notes}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowBookingDetailsModal(false)}
              >
                Close
              </Button>
              {booking.payment?.status === 'paid' && booking.payment?.transactionId && (
                <Button
                  onClick={() => {
                    setShowBookingDetailsModal(false);
                    handleViewReceipt();
                  }}
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  View Receipt
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Modal */}
      {booking.hospitalId && typeof booking.hospitalId === 'number' && (
        <ReviewForm
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          bookingId={booking.id}
          hospitalId={booking.hospitalId}
          hospitalName={hospitalName}
          onSuccess={() => {
            // Optionally refresh bookings or show a success message
            setShowReviewModal(false);
          }}
        />
      )}
    </>
  );
};

export default BookingCardWithPayment;