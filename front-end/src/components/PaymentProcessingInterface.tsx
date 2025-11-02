'use client';

import React, { useState } from 'react';
import { PaymentData, BookingFormData, PaymentResult, PaymentValidation } from '@/lib/types';

interface PaymentProcessingInterfaceProps {
  bookingData: BookingFormData;
  totalAmount: number;
  onPaymentSuccess: (result: PaymentResult) => void;
  onPaymentFailure: (error: string) => void;
  onCancel: () => void;
}

const PaymentProcessingInterface: React.FC<PaymentProcessingInterfaceProps> = ({
  bookingData,
  totalAmount,
  onPaymentSuccess,
  onPaymentFailure,
  onCancel
}) => {
  const [paymentData, setPaymentData] = useState<PaymentData>({
    paymentMethod: 'credit_card'
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handlePaymentMethodChange = (method: PaymentData['paymentMethod']) => {
    setPaymentData({
      paymentMethod: method
    });
    setValidationErrors([]);
  };

  const handleInputChange = (field: keyof PaymentData, value: string) => {
    setPaymentData(prev => ({
      ...prev,
      [field]: value
    }));
    setValidationErrors([]);
  };

  const validatePaymentData = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/payments/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ paymentData })
      });

      const result = await response.json();
      
      if (result.success && result.data.isValid) {
        setValidationErrors([]);
        return true;
      } else {
        setValidationErrors(result.data.errors || ['Invalid payment data']);
        return false;
      }
    } catch (error) {
      setValidationErrors(['Payment validation failed']);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = await validatePaymentData();
    if (!isValid) return;

    setShowConfirmation(true);
  };

  const processPayment = async () => {
    setIsProcessing(true);
    setShowConfirmation(false);

    try {
      const response = await fetch('/api/payments/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          bookingId: bookingData.userId, // This should be the actual booking ID
          paymentData
        })
      });

      const result = await response.json();

      if (result.success) {
        onPaymentSuccess(result);
      } else {
        onPaymentFailure(result.error || 'Payment processing failed');
      }
    } catch (error) {
      onPaymentFailure('Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderPaymentMethodForm = () => {
    switch (paymentData.paymentMethod) {
      case 'credit_card':
      case 'debit_card':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Card Number
              </label>
              <input
                type="text"
                placeholder="1234 5678 9012 3456"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={paymentData.cardNumber || ''}
                onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                maxLength={19}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Month
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={paymentData.expiryMonth || ''}
                  onChange={(e) => handleInputChange('expiryMonth', e.target.value)}
                >
                  <option value="">Month</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                      {String(i + 1).padStart(2, '0')}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Year
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={paymentData.expiryYear || ''}
                  onChange={(e) => handleInputChange('expiryYear', e.target.value)}
                >
                  <option value="">Year</option>
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() + i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CVV
                </label>
                <input
                  type="text"
                  placeholder="123"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={paymentData.cvv || ''}
                  onChange={(e) => handleInputChange('cvv', e.target.value)}
                  maxLength={4}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Type
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={paymentData.cardType || ''}
                  onChange={(e) => handleInputChange('cardType', e.target.value)}
                >
                  <option value="">Select Type</option>
                  <option value="visa">Visa</option>
                  <option value="mastercard">Mastercard</option>
                  <option value="amex">American Express</option>
                  <option value="discover">Discover</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cardholder Name
              </label>
              <input
                type="text"
                placeholder="John Doe"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={paymentData.cardHolderName || ''}
                onChange={(e) => handleInputChange('cardHolderName', e.target.value)}
              />
            </div>
          </div>
        );

      case 'bank_transfer':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Account Number
              </label>
              <input
                type="text"
                placeholder="1234567890"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={paymentData.bankAccount || ''}
                onChange={(e) => handleInputChange('bankAccount', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Routing Number
              </label>
              <input
                type="text"
                placeholder="021000021"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={paymentData.routingNumber || ''}
                onChange={(e) => handleInputChange('routingNumber', e.target.value)}
              />
            </div>
          </div>
        );

      case 'digital_wallet':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wallet Provider
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={paymentData.walletProvider || ''}
                onChange={(e) => handleInputChange('walletProvider', e.target.value)}
              >
                <option value="">Select Provider</option>
                <option value="paypal">PayPal</option>
                <option value="apple_pay">Apple Pay</option>
                <option value="google_pay">Google Pay</option>
                <option value="samsung_pay">Samsung Pay</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wallet ID / Email
              </label>
              <input
                type="email"
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={paymentData.walletId || ''}
                onChange={(e) => handleInputChange('walletId', e.target.value)}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (showConfirmation) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Confirm Payment</h2>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-800 mb-2">Booking Summary</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Patient:</span>
              <span>{bookingData.patientName}</span>
            </div>
            <div className="flex justify-between">
              <span>Resource:</span>
              <span className="capitalize">{bookingData.resourceType}</span>
            </div>
            <div className="flex justify-between">
              <span>Duration:</span>
              <span>{bookingData.estimatedDuration} hours</span>
            </div>
            <div className="flex justify-between font-medium text-gray-800 pt-2 border-t">
              <span>Total Amount:</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-800 mb-2">Payment Method</h3>
          <div className="text-sm text-gray-600">
            <div className="capitalize">{paymentData.paymentMethod.replace('_', ' ')}</div>
            {paymentData.paymentMethod === 'credit_card' || paymentData.paymentMethod === 'debit_card' ? (
              <div>**** **** **** {paymentData.cardNumber?.slice(-4)}</div>
            ) : null}
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setShowConfirmation(false)}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Back
          </button>
          <button
            onClick={processPayment}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Payment Information</h2>
      
      {/* Booking Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-gray-800 mb-2">Booking Summary</h3>
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Patient:</span>
            <span>{bookingData.patientName}</span>
          </div>
          <div className="flex justify-between">
            <span>Resource:</span>
            <span className="capitalize">{bookingData.resourceType}</span>
          </div>
          <div className="flex justify-between">
            <span>Duration:</span>
            <span>{bookingData.estimatedDuration} hours</span>
          </div>
          <div className="flex justify-between font-medium text-gray-800 pt-2 border-t">
            <span>Total Amount:</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Method Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Payment Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'credit_card', label: 'Credit Card' },
              { value: 'debit_card', label: 'Debit Card' },
              { value: 'bank_transfer', label: 'Bank Transfer' },
              { value: 'digital_wallet', label: 'Digital Wallet' }
            ].map((method) => (
              <button
                key={method.value}
                type="button"
                onClick={() => handlePaymentMethodChange(method.value as PaymentData['paymentMethod'])}
                className={`p-3 text-sm border rounded-md transition-colors ${
                  paymentData.paymentMethod === method.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {method.label}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Method Form */}
        {renderPaymentMethodForm()}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="text-sm text-red-600">
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Review Payment
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentProcessingInterface;