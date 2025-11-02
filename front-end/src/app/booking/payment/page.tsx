'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { bookingAPI, authAPI } from '@/lib/api';
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
  Scissors,
  UserCheck,
  Plus,
  Phone
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
  patientAge?: number | null; // Use patientAge to match database field
  rapidAssistance?: boolean | null;
  rapidAssistanceCharge?: number | null;
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

interface PaymentSummaryProps {
  baseAmount: number;
  rapidAssistance: boolean;
  rapidAssistanceCharge: number;
}

function PaymentSummary({ baseAmount, rapidAssistance, rapidAssistanceCharge }: PaymentSummaryProps) {
  const [displayTotal, setDisplayTotal] = useState(baseAmount);
  const totalAmount = baseAmount + (rapidAssistance ? rapidAssistanceCharge : 0);

  // Animate total amount changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayTotal(totalAmount);
    }, 100);
    return () => clearTimeout(timer);
  }, [totalAmount]);

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
        <Receipt className="w-4 h-4" />
        Payment Summary
      </h4>
      <div className="space-y-2">
        {/* Base booking cost */}
        <div className="flex justify-between items-center py-1">
          <span className="text-gray-600">Base Booking Cost:</span>
          <span className="font-medium">৳{baseAmount.toLocaleString()}</span>
        </div>

        {/* Rapid assistance line item with smooth animation */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${rapidAssistance
          ? 'opacity-100 max-h-16 transform translate-y-0'
          : 'opacity-0 max-h-0 transform -translate-y-2'
          }`}>
          <div className="flex justify-between items-center text-blue-600 py-1">
            <span className="flex items-center gap-1">
              <UserCheck className="w-4 h-4" />
              Rapid Assistance:
            </span>
            <span className="font-medium">+৳{rapidAssistanceCharge.toLocaleString()}</span>
          </div>
        </div>

        {/* Divider line */}
        <div className="border-t border-gray-200 my-2"></div>

        {/* Total amount with emphasis and animation */}
        <div className={`flex justify-between items-center text-lg font-bold py-2 px-3 rounded-lg transition-all duration-500 ${rapidAssistance
          ? 'bg-blue-50 text-blue-700 border border-blue-200'
          : 'bg-gray-50 text-gray-900 border border-gray-200'
          }`}>
          <span className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Total Amount:
          </span>
          <span className={`transition-all duration-500 ease-in-out transform ${displayTotal !== totalAmount ? 'scale-110' : 'scale-100'
            }`}>
            ৳{displayTotal.toLocaleString()}
          </span>
        </div>

        {/* Real-time calculation indicator */}
        {rapidAssistance && (
          <div className="text-xs text-blue-600 text-center py-1 animate-pulse">
            ✓ Total updated with Rapid Assistance
          </div>
        )}
      </div>

      {/* Detailed itemized breakdown */}
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${rapidAssistance
        ? 'opacity-100 max-h-96 transform translate-y-0'
        : 'opacity-0 max-h-0 transform -translate-y-4'
        }`}>
        <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="space-y-3">
            <div className="font-medium flex items-center gap-2 text-blue-800">
              <Receipt className="w-4 h-4" />
              Itemized Payment Breakdown
            </div>

            <div className="bg-white rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2">
                  <Bed className="w-4 h-4 text-gray-500" />
                  Hospital booking service:
                </span>
                <span className="font-medium">৳{baseAmount.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-sm text-blue-600">
                <span className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Rapid Assistance add-on:
                </span>
                <span className="font-medium">৳{rapidAssistanceCharge.toLocaleString()}</span>
              </div>

              <div className="border-t pt-2">
                <div className="flex justify-between items-center font-semibold text-blue-700">
                  <span>Total Payment:</span>
                  <span className="text-lg">৳{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-blue-700 bg-blue-100 rounded p-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Rapid Assistance Service Includes:</strong>
                  <ul className="mt-1 space-y-0.5 ml-2">
                    <li>• Personal escort from hospital gate</li>
                    <li>• Direct guidance to your bed/ICU</li>
                    <li>• Assistant contact information</li>
                    <li>• Priority navigation support</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState('');
  const [showRetry, setShowRetry] = useState(false);
  const [rapidAssistance, setRapidAssistance] = useState(false); // New state for Rapid Assistance
  // Dynamic total calculation is handled in effects and components

  useEffect(() => {
    // Get booking data from URL params or localStorage
    const bookingId = searchParams.get('bookingId');
    const storedBookingData = localStorage.getItem('pendingBookingData');

    // Prioritize API data over localStorage for complete data
    if (bookingId) {
      fetchBookingData(bookingId);
    } else if (storedBookingData) {
      const data = JSON.parse(storedBookingData);
      setBookingData(data);
      if (data.rapidAssistance === true) {
        setRapidAssistance(true);
      }
    } else {
      setError('No booking data found. Please start a new booking.');
    }

    // Get user balance
    fetchUserBalance();
  }, [searchParams]);

  const fetchBookingData = async (bookingId: string) => {
    try {
      const response = await bookingAPI.getById(parseInt(bookingId, 10));
      if (response.data.success) {
        const booking = response.data.data;
        setBookingData(booking);
        // Set rapid assistance state based on booking data
        if (booking.rapidAssistance === true || booking.rapidAssistance === 1) {
          setRapidAssistance(true);
        }
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
      // Fetch user profile with balance from API
      const response = await authAPI.getProfile();
      if (response.data.success && response.data.data.balance !== undefined) {
        setUserBalance(response.data.data.balance);
      } else {
        // Fallback to local storage user data
        const user = getCurrentUser();
        if (user) {
          setUserBalance(user.balance || 10000);
        }
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      // Fallback to local storage user data
      const user = getCurrentUser();
      if (user) {
        setUserBalance(user.balance || 10000);
      }
    }
  };

  const handleRetry = () => {
    setError('');
    setShowRetry(false);
    handlePayment();
  };

  const handlePayment = async () => {
    if (!bookingData || !transactionId.trim()) {
      setError('Please enter a transaction ID');
      return;
    }

    // Enhanced validation before payment processing
    if (!validateRapidAssistanceEligibility()) {
      return;
    }

    // Additional validation for rapid assistance before payment
    if (rapidAssistance) {
      // Double-check age eligibility
      if (!bookingData.patientAge || !isSeniorCitizen(bookingData.patientAge)) {
        handleRapidAssistanceError('validation_failed');
        return;
      }

      // Validate that rapid assistance charge is correctly calculated
      const expectedRapidAssistanceCharge = 200;
      const calculatedTotal = bookingData.paymentAmount + expectedRapidAssistanceCharge;
      const currentTotal = bookingData.paymentAmount + (rapidAssistance ? 200 : 0);
      
      if (calculatedTotal !== currentTotal) {
        handleRapidAssistanceError('calculation_error');
        return;
      }
    }

    setLoading(true);
    setError('');
    setShowRetry(false);

    try {
      // Include Rapid Assistance in the payment data with validation
      const totalAmount = bookingData.paymentAmount + (rapidAssistance ? 200 : 0);
      const paymentData = {
        bookingId: bookingData.id,
        transactionId: transactionId.trim(),
        amount: totalAmount,
        rapidAssistance: Boolean(rapidAssistance && isSeniorCitizen(bookingData.patientAge)), // Double-check eligibility
        patientAge: bookingData.patientAge // Include age for backend validation
      };

      const response = await bookingAPI.processPayment(paymentData);

      if (response.data.success) {
        setPaymentResult(response.data);
        // Clear stored booking data
        localStorage.removeItem('pendingBookingData');
        // Update user balance
        if (response.data.data?.payment?.new_balance !== undefined) {
          setUserBalance(response.data.data.payment.new_balance);
        }
      } else {
        setError(response.data.error || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      
      // Enhanced error handling for rapid assistance related errors
      const errorMessage = error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Payment processing failed';
      
      // Check if error is related to rapid assistance validation
      if (errorMessage.toLowerCase().includes('rapid assistance') || 
          errorMessage.toLowerCase().includes('age') ||
          errorMessage.toLowerCase().includes('eligibility')) {
        // Handle rapid assistance specific errors
        if (errorMessage.toLowerCase().includes('age')) {
          handleRapidAssistanceError('age_ineligible', bookingData?.patientAge);
        } else if (errorMessage.toLowerCase().includes('manipulation') || 
                   errorMessage.toLowerCase().includes('invalid')) {
          handleRapidAssistanceError('manipulation_detected');
        } else {
          handleRapidAssistanceError('validation_failed');
        }
      } else {
        // Handle general payment errors
        setError(errorMessage);
        setShowRetry(true);
      }
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

  // Function to check if user is a senior citizen (60+ years)
  const isSeniorCitizen = (age?: number | null) => {
    return age != null && age >= 60;
  };

  // Enhanced error handling function for rapid assistance
  const handleRapidAssistanceError = useCallback((errorType: string, age?: number) => {
    let errorMessage = '';
    
    switch (errorType) {
      case 'age_missing':
        errorMessage = 'Patient age is required to determine Rapid Assistance eligibility. Please contact support if age information is missing.';
        break;
      case 'age_invalid':
        errorMessage = 'Invalid patient age detected. Please contact support to verify age information.';
        break;
      case 'age_ineligible':
        errorMessage = `Rapid Assistance is only available for patients aged 60 and above. Current patient age: ${age} years.`;
        break;
      case 'calculation_error':
        errorMessage = 'Payment calculation error detected for Rapid Assistance. Please refresh the page and try again.';
        break;
      case 'validation_failed':
        errorMessage = 'Rapid Assistance validation failed. Service is only available for patients aged 60 and above.';
        break;
      case 'manipulation_detected':
        errorMessage = 'Invalid Rapid Assistance selection detected. Please ensure you meet the age requirements.';
        break;
      default:
        errorMessage = 'An error occurred with Rapid Assistance selection. Please try again.';
    }
    
    setError(errorMessage);
    setRapidAssistance(false); // Always disable rapid assistance on error
  }, []);

  // Enhanced function to validate rapid assistance eligibility with comprehensive error handling
  const validateRapidAssistanceEligibility = useCallback(() => {
    if (!bookingData) {
      return true; // Skip validation if booking data not loaded yet
    }

    // Check if rapid assistance is selected
    if (rapidAssistance) {
      // Validate age is provided
      if (bookingData.patientAge == null || bookingData.patientAge === undefined) {
        handleRapidAssistanceError('age_missing');
        return false;
      }

      // Validate age is a valid number
      if (typeof bookingData.patientAge !== 'number' || bookingData.patientAge < 0 || bookingData.patientAge > 150) {
        handleRapidAssistanceError('age_invalid');
        return false;
      }

      // Validate senior citizen eligibility (60+)
      if (!isSeniorCitizen(bookingData.patientAge)) {
        handleRapidAssistanceError('age_ineligible', bookingData.patientAge);
        return false;
      }
    }

    return true;
  }, [rapidAssistance, bookingData, handleRapidAssistanceError]);

  // Effect to validate rapid assistance when age or selection changes
  useEffect(() => {
    if (bookingData && rapidAssistance) {
      validateRapidAssistanceEligibility();
    }
  }, [bookingData, rapidAssistance, validateRapidAssistanceEligibility]);

  // Effect to validate existing rapid assistance selection on component mount
  useEffect(() => {
    if (bookingData && rapidAssistance) {
      // Check if rapid assistance was pre-selected but patient is not eligible
      if (!isSeniorCitizen(bookingData.patientAge)) {
        handleRapidAssistanceError('manipulation_detected');
      }
    }
  }, [bookingData, rapidAssistance, handleRapidAssistanceError]); // Include all dependencies

  // Periodic validation to prevent client-side manipulation
  useEffect(() => {
    const validateInterval = setInterval(() => {
      if (bookingData && rapidAssistance) {
        // Continuous validation to detect any manipulation
        if (!isSeniorCitizen(bookingData.patientAge)) {
          console.warn('Rapid assistance manipulation detected - disabling service');
          handleRapidAssistanceError('manipulation_detected');
        }
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(validateInterval);
  }, [bookingData, rapidAssistance, handleRapidAssistanceError]);

  // Total amount is calculated dynamically in components and payment processing

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

                  {/* Rapid Assistance Information */}
                  {paymentResult.data?.booking.rapidAssistance && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 animate-in fade-in-0 slide-in-from-top-2 duration-500">
                      <h3 className="font-semibold text-lg mb-3 flex items-center text-blue-800">
                        <UserCheck className="w-5 h-5 mr-2" />
                        Rapid Assistance Service Confirmed
                      </h3>
                      <p className="text-blue-700 mb-4 leading-relaxed">
                        Your dedicated assistant will meet you at the hospital main entrance and escort you directly to your assigned bed or ICU.
                        This service ensures you receive priority navigation support throughout the facility.
                      </p>

                      {/* Assistant Contact Information */}
                      <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <User className="w-4 h-4 text-blue-600" />
                          <p className="text-sm font-medium text-blue-800">Your Assigned Assistant:</p>
                        </div>

                        {paymentResult.data.booking.rapidAssistantName && paymentResult.data.booking.rapidAssistantPhone ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{paymentResult.data.booking.rapidAssistantName}</p>
                                <p className="text-sm text-gray-600">Certified Hospital Assistant</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <Phone className="w-4 h-4 text-green-600" />
                              </div>
                              <div>
                                <p className="font-mono font-semibold text-gray-900">{paymentResult.data.booking.rapidAssistantPhone}</p>
                                <p className="text-sm text-gray-600">Direct contact number</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-2">
                            <div className="inline-flex items-center gap-2 text-blue-700">
                              <Clock className="w-4 h-4" />
                              <span className="text-sm">Assistant details will be assigned shortly</span>
                            </div>
                            <p className="text-xs text-blue-600 mt-1">
                              You will receive assistant contact information via SMS within 15 minutes
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Service Details */}
                      <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                        <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Service Includes:
                        </h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            Meet & greet at hospital main entrance
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            Direct escort to your bed/ICU location
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            Assistance with hospital navigation
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            Priority support throughout your visit
                          </li>
                        </ul>
                      </div>

                      {/* Important Instructions */}
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800">Important Instructions:</p>
                            <ul className="text-xs text-yellow-700 mt-1 space-y-0.5">
                              <li>• Call your assistant 15 minutes before arrival</li>
                              <li>• Meet at the main entrance reception desk</li>
                              <li>• Have your booking reference ready: #{paymentResult.data?.booking.id}</li>
                              <li>• Bring valid ID and any medical documents</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

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
                      {/* Show Rapid Assistance charge if selected */}
                      {paymentResult.data?.booking.rapidAssistance && (
                        <div className="flex justify-between">
                          <span>Rapid Assistance:</span>
                          <span className="font-semibold">৳200</span>
                        </div>
                      )}
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
                          {paymentResult.data?.booking.rapidAssistance && (
                            <div className="flex justify-between font-medium">
                              <span>Rapid Assistance:</span>
                              <span>৳200</span>
                            </div>
                          )}
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
            <Alert className={`mb-6 ${
              error.includes('Rapid Assistance') || error.includes('Patient age') || error.includes('Invalid patient age')
                ? 'border-orange-200 bg-orange-50'
                : 'border-red-200 bg-red-50'
            }`}>
              <AlertTriangle className={`h-4 w-4 ${
                error.includes('Rapid Assistance') || error.includes('Patient age') || error.includes('Invalid patient age')
                  ? 'text-orange-600'
                  : 'text-red-600'
              }`} />
              <AlertDescription className={`${
                error.includes('Rapid Assistance') || error.includes('Patient age') || error.includes('Invalid patient age')
                  ? 'text-orange-800'
                  : 'text-red-800'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium mb-1">
                      {error.includes('Rapid Assistance') || error.includes('Patient age') || error.includes('Invalid patient age')
                        ? 'Rapid Assistance Validation Error'
                        : 'Payment Error'
                      }
                    </div>
                    <span className="text-sm">{error}</span>
                    {error.includes('Rapid Assistance') && (
                      <div className="mt-2 text-xs opacity-90">
                        <strong>Note:</strong> Rapid Assistance is exclusively available for patients aged 60 and above to ensure appropriate care for senior citizens.
                      </div>
                    )}
                  </div>
                  {showRetry && (
                    <Button
                      onClick={handleRetry}
                      variant="outline"
                      size="sm"
                      className="ml-4 border-red-300 text-red-700 hover:bg-red-100 flex-shrink-0"
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

                    {/* Add-ons Section - Only show for senior citizens (60+) */}
                    {isSeniorCitizen(bookingData.patientAge) && (
                      <div className="border-t pt-4">
                        <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
                          <Plus className="w-5 h-5 mr-2 text-blue-600" />
                          Add-ons
                        </h3>

                        <Card className={`border-2 transition-all duration-200 ${rapidAssistance
                          ? 'border-blue-300 bg-blue-50/30'
                          : 'border-dashed border-gray-200 hover:border-blue-300'
                          }`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <UserCheck className="w-5 h-5 text-blue-600" />
                                  <h4 className="font-semibold text-gray-900">Rapid Assistance Service</h4>
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                    Senior Citizen Only
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                                  A dedicated assistant will escort you from the hospital gate directly to your assigned bed or ICU.
                                  Perfect for elderly patients who need navigation support in large hospital complexes.
                                </p>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg font-semibold text-blue-600">+৳200</span>
                                    <span className="text-xs text-gray-500">(Fixed Price)</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Label htmlFor="rapid-assistance-switch" className="text-sm font-medium cursor-pointer">
                                      Add to booking
                                    </Label>
                                    <Switch
                                      id="rapid-assistance-switch"
                                      checked={rapidAssistance && isSeniorCitizen(bookingData.patientAge)} // Ensure switch reflects actual eligibility
                                      disabled={!isSeniorCitizen(bookingData.patientAge)} // Disable switch for ineligible patients
                                      onCheckedChange={(checked) => {
                                        // Enhanced client-side validation before allowing toggle
                                        if (checked) {
                                          // Validate age is provided
                                          if (bookingData.patientAge == null || bookingData.patientAge === undefined) {
                                            handleRapidAssistanceError('age_missing');
                                            return;
                                          }

                                          // Validate age is a valid number
                                          if (typeof bookingData.patientAge !== 'number' || bookingData.patientAge < 0 || bookingData.patientAge > 150) {
                                            handleRapidAssistanceError('age_invalid');
                                            return;
                                          }

                                          // Validate senior citizen eligibility (60+)
                                          if (!isSeniorCitizen(bookingData.patientAge)) {
                                            handleRapidAssistanceError('age_ineligible', bookingData.patientAge);
                                            return;
                                          }
                                        }

                                        // If all validations pass or unchecking, update state
                                        setRapidAssistance(checked);
                                        
                                        // Clear any previous rapid assistance related errors when successfully toggling
                                        if (error && (error.includes('Rapid Assistance') || error.includes('Patient age') || error.includes('Invalid patient age'))) {
                                          setError('');
                                        }
                                      }}
                                      className={`transition-all duration-300 ${
                                        isSeniorCitizen(bookingData.patientAge) 
                                          ? 'data-[state=checked]:bg-blue-600' 
                                          : 'opacity-50 cursor-not-allowed'
                                      }`}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {rapidAssistance && (
                              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                                <div className="flex items-start space-x-2">
                                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-sm font-medium text-blue-800 mb-1">
                                      Rapid Assistance Added ✓
                                    </p>
                                    <p className="text-xs text-blue-700 leading-relaxed">
                                      Your assistant details will be provided in the confirmation message after payment.
                                      They will meet you at the hospital main entrance and guide you to your destination.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Enhanced age-based eligibility message for non-senior citizens */}
                    {bookingData.patientAge != null && !isSeniorCitizen(bookingData.patientAge) && (
                      <div className="border-t pt-4">
                        <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
                          <Plus className="w-5 h-5 mr-2 text-gray-400" />
                          Add-ons
                        </h3>
                        
                        <Card className="border-2 border-dashed border-gray-200 bg-gray-50/50">
                          <CardContent className="p-4">
                            <div className="text-center py-4">
                              <UserCheck className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                              <h4 className="font-semibold text-gray-700 mb-2">Rapid Assistance Service</h4>
                              <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200 mb-3">
                                Not Available
                              </Badge>
                              <p className="text-sm text-gray-600 mb-2">
                                This service is exclusively available for patients aged 60 and above.
                              </p>
                              <p className="text-xs text-gray-500">
                                Current patient age: {bookingData.age} years (Minimum required: 60 years)
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Handle missing age information */}
                    {(bookingData.age == null || bookingData.age === undefined) && (
                      <div className="border-t pt-4">
                        <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
                          <Plus className="w-5 h-5 mr-2 text-gray-400" />
                          Add-ons
                        </h3>
                        
                        <Card className="border-2 border-dashed border-orange-200 bg-orange-50/50">
                          <CardContent className="p-4">
                            <div className="text-center py-4">
                              <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-orange-500" />
                              <h4 className="font-semibold text-orange-700 mb-2">Rapid Assistance Service</h4>
                              <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 mb-3">
                                Age Verification Required
                              </Badge>
                              <p className="text-sm text-orange-700 mb-2">
                                Patient age information is required to determine service eligibility.
                              </p>
                              <p className="text-xs text-orange-600">
                                Please contact support if age information is missing from your booking.
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <PaymentSummary
                        baseAmount={bookingData.paymentAmount}
                        rapidAssistance={rapidAssistance}
                        rapidAssistanceCharge={200}
                      />
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
                {bookingData && (() => {
                  const totalRequired = bookingData.paymentAmount + (rapidAssistance ? 200 : 0);
                  const isInsufficientBalance = userBalance < totalRequired;

                  return isInsufficientBalance ? (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        <div className="space-y-1">
                          <p className="font-medium">Insufficient balance for this payment</p>
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span>Base booking cost:</span>
                              <span>৳{bookingData.paymentAmount}</span>
                            </div>
                            {rapidAssistance && (
                              <div className="flex justify-between text-blue-600">
                                <span>Rapid Assistance:</span>
                                <span>৳200</span>
                              </div>
                            )}
                            <div className="flex justify-between font-medium border-t pt-1">
                              <span>Total required:</span>
                              <span>৳{totalRequired}</span>
                            </div>
                            <div className="flex justify-between text-red-600 font-medium">
                              <span>Additional needed:</span>
                              <span>৳{totalRequired - userBalance}</span>
                            </div>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ) : null;
                })()}

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
                {(() => {
                  const totalAmount = (bookingData?.paymentAmount || 0) + (rapidAssistance ? 200 : 0);
                  const isInsufficientBalance = bookingData && userBalance < totalAmount;
                  const isDisabled = loading || !transactionId.trim() || !bookingData || isInsufficientBalance;

                  return (
                    <Button
                      onClick={handlePayment}
                      disabled={isDisabled}
                      className={`w-full transition-all duration-300 ${rapidAssistance
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                        }`}
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
                          <span className="transition-all duration-300">
                            Pay ৳{totalAmount}
                            {rapidAssistance && (
                              <span className="text-blue-200 text-sm ml-1">
                                (incl. Rapid Assistance)
                              </span>
                            )}
                          </span>
                        </>
                      )}
                    </Button>
                  );
                })()}
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