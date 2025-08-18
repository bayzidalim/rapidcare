'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { bookingAPI } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Wallet,
  Receipt,
  Clock,
  User,
  Building2,
  Bed,
  Heart,
  Scissors
} from 'lucide-react';
import Link from 'next/link';

interface BookingData {
  id: number;
  patientName: string;
  hospitalName: string;
  resourceType: string;
  estimatedDuration: number;
  scheduledDate: string;
  urgency: string;
  paymentAmount: number;
}

interface PaymentResult {
  success: boolean;
  data?: {
    booking: any;
    payment: {
      amount: number;
      transaction_id: string;
      previous_balance: number;
      new_balance: number;
      cost_breakdown: {
        base_price: number;
        service_charge_amount: number;
        total_cost: number;
        hospital_share: number;
        service_charge_share: number;
      };
    };
  };
  error?: string;
}

function PaymentPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    // Get booking data from URL params or localStorage
    const bookingId = searchParams.get('bookingId');
    const storedBookingData = localStorage.getItem('pendingBookingData');
    
    if (storedBookingData) {
      const data = JSON.parse(storedBookingData);
      setBookingData(data);
    } else if (bookingId) {
      fetchBookingData(bookingId);
    } else {
      setError('No booking data found. Please start a new booking.');
    }

    // Get user balance
    fetchUserBalance();
  }, [searchParams]);

  const fetchBookingData = async (bookingId: string) => {
    try {
      const response = await bookingAPI.getById(bookingId);
      if (response.data.success) {
        setBookingData(response.data.data);
      } else {
        setError('Failed to load booking data');
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
      setError('Failed to load booking data');
    }
  };

  const fetchUserBalance = async () => {
    try {
      const user = getCurrentUser();
      if (user) {
        // For now, we'll simulate getting balance from user data
        // In a real implementation, you'd call an API endpoint
        setUserBalance(user.balance || 10000);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const handleRetry = () => {
    setError('');
    setShowRetry(false);
    setRetryCount(prev => prev + 1);
    handlePayment();
  };

  const handlePayment = async () => {
    if (!bookingData || !transactionId.trim()) {
      setError('Please enter a transaction ID');
      return;
    }

    setLoading(true);
    setError('');
    setShowRetry(false);

    try {
      const response = await bookingAPI.processPayment({
        bookingId: bookingData.id,
        transactionId: transactionId.trim(),
        amount: bookingData.paymentAmount
      });

      if (response.data.success) {
        setPaymentResult(response.data);
        // Clear stored booking data
        localStorage.removeItem('pendingBookingData');
        // Update user balance
        setUserBalance(response.data.data.payment.new_balance);
      } else {
        setError(response.data.error || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Payment processing failed';
      setError(errorMessage);
      setShowRetry(true);
    } finally {
      setLoading(false);
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'bed':
      case 'beds':
        return <Bed className="w-5 h-5" />;
      case 'icu':
        return <Heart className="w-5 h-5" />;
      case 'operationTheatres':
        return <Scissors className="w-5 h-5" />;
      default:
        return <Bed className="w-5 h-5" />;
    }
  };

  const getResourceLabel = (type: string) => {
    switch (type) {
      case 'bed':
      case 'beds':
        return 'Hospital Bed';
      case 'icu':
        return 'ICU';
      case 'operationTheatres':
        return 'Operation Theatre';
      default:
        return type;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Success page
  if (paymentResult?.success) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
          <Navigation />
          <div className="max-w-2xl mx-auto px-4 py-16">
            <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 animate-in zoom-in-0 duration-700 delay-300">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Payment Successful! 🎉
                  </h2>
                  <p className="text-gray-600 mb-8 text-lg">
                    Your booking has been confirmed and payment processed successfully.
                  </p>
                  
                  {/* Payment Details */}
                  <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
                    <h3 className="font-semibold text-lg mb-4 flex items-center">
                      <Receipt className="w-5 h-5 mr-2" />
                      Payment Receipt
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Transaction ID:</span>
                        <span className="font-mono">{paymentResult.data?.payment.transaction_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount Paid:</span>
                        <span className="font-semibold">৳{paymentResult.data?.payment.amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Previous Balance:</span>
                        <span>৳{paymentResult.data?.payment.previous_balance}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>New Balance:</span>
                        <span className="font-semibold text-green-600">৳{paymentResult.data?.payment.new_balance}</span>
                      </div>
                    </div>
                    
                    {/* Cost Breakdown */}
                    {paymentResult.data?.payment.cost_breakdown && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-medium mb-2">Cost Breakdown:</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Hospital Charges:</span>
                            <span>৳{paymentResult.data.payment.cost_breakdown.hospital_share}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Service Charges:</span>
                            <span>৳{paymentResult.data.payment.cost_breakdown.service_charge_share}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-4 justify-center">
                    <Link href="/dashboard">
                      <Button className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
                        View Dashboard
                      </Button>
                    </Link>
                    <Link href="/hospitals">
                      <Button variant="outline">
                        Book Another Resource
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <Navigation />
        
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link href="/booking" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Booking
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Complete Your Payment
            </h1>
            <p className="text-gray-600">
              Secure your medical resource booking with a simple payment process.
            </p>
          </div>

          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="flex items-center justify-between">
                  <span>{error}</span>
                  {showRetry && (
                    <Button
                      onClick={handleRetry}
                      variant="outline"
                      size="sm"
                      className="ml-4 border-red-300 text-red-700 hover:bg-red-100"
                    >
                      Try Again
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            {/* Booking Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Receipt className="w-5 h-5 mr-2" />
                  Booking Summary
                </CardTitle>
                <CardDescription>
                  Review your booking details before payment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {bookingData ? (
                  <>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <User className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="font-medium">{bookingData.patientName}</p>
                          <p className="text-sm text-gray-500">Patient</p>
                        </div>
                      </div>
                      <Badge className={getUrgencyColor(bookingData.urgency)}>
                        {bookingData.urgency}
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                      <Building2 className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium">{bookingData.hospitalName}</p>
                        <p className="text-sm text-gray-500">Hospital</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                      {getResourceIcon(bookingData.resourceType)}
                      <div>
                        <p className="font-medium">{getResourceLabel(bookingData.resourceType)}</p>
                        <p className="text-sm text-gray-500">
                          {bookingData.estimatedDuration} hours
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                      <Clock className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium">
                          {new Date(bookingData.scheduledDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500">Scheduled Date</p>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center text-lg font-semibold">
                        <span>Total Amount:</span>
                        <span className="text-blue-600">৳{bookingData.paymentAmount}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading booking details...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Payment Details
                </CardTitle>
                <CardDescription>
                  Enter your transaction details to complete payment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Balance Display */}
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-3">
                    <Wallet className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Current Balance</p>
                      <p className="text-sm text-green-600">Available for payment</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-green-700">৳{userBalance}</span>
                </div>

                {/* Balance Check */}
                {bookingData && userBalance < bookingData.paymentAmount && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      Insufficient balance. You need ৳{bookingData.paymentAmount - userBalance} more to complete this payment.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Transaction ID Input */}
                <div className="space-y-2">
                  <Label htmlFor="transactionId">Transaction ID</Label>
                  <Input
                    id="transactionId"
                    type="text"
                    placeholder="Enter transaction ID (e.g., TXN123456)"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-sm text-gray-500">
                    Enter any unique transaction ID for your records
                  </p>
                </div>

                {/* Payment Button */}
                <Button
                  onClick={handlePayment}
                  disabled={loading || !transactionId.trim() || !bookingData || (bookingData && userBalance < bookingData.paymentAmount)}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay ৳{bookingData?.paymentAmount || 0}
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  This is a mock payment system for university demonstration purposes.
                  No real money will be charged.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading payment page...</p>
      </div>
    </div>}>
      <PaymentPageContent />
    </Suspense>
  );
}