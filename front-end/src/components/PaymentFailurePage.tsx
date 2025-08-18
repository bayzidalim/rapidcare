'use client';

import React from 'react';
import { PaymentData } from '@/lib/types';

interface PaymentFailurePageProps {
  error: string;
  transactionId?: string;
  onRetryPayment: () => void;
  onTryDifferentMethod: () => void;
  onContactSupport: () => void;
  onCancel: () => void;
}

const PaymentFailurePage: React.FC<PaymentFailurePageProps> = ({
  error,
  transactionId,
  onRetryPayment,
  onTryDifferentMethod,
  onContactSupport,
  onCancel
}) => {
  const getErrorMessage = (error: string) => {
    const errorMessages: { [key: string]: string } = {
      'Card declined': 'Your card was declined. Please check your card details or try a different payment method.',
      'Insufficient funds': 'Insufficient funds in your account. Please check your balance or use a different payment method.',
      'Invalid card number': 'The card number you entered is invalid. Please check and try again.',
      'Expired card': 'Your card has expired. Please use a different card or update your card information.',
      'Invalid CVV': 'The CVV code you entered is incorrect. Please check the 3-digit code on the back of your card.',
      'Payment processing failed': 'We encountered an issue processing your payment. Please try again or contact support.',
      'Network error': 'Network connection issue. Please check your internet connection and try again.'
    };

    return errorMessages[error] || 'An unexpected error occurred during payment processing. Please try again or contact support.';
  };

  const getErrorIcon = () => {
    if (error.toLowerCase().includes('declined') || error.toLowerCase().includes('insufficient')) {
      return (
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    }

    return (
      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  };

  const getSuggestedActions = () => {
    const suggestions = [];

    if (error.toLowerCase().includes('declined')) {
      suggestions.push('Contact your bank to ensure your card is authorized for online transactions');
      suggestions.push('Check if your card has sufficient credit limit');
      suggestions.push('Verify that your billing address matches your card statement');
    } else if (error.toLowerCase().includes('insufficient')) {
      suggestions.push('Check your account balance');
      suggestions.push('Use a different payment method');
      suggestions.push('Contact your bank for assistance');
    } else if (error.toLowerCase().includes('invalid') || error.toLowerCase().includes('expired')) {
      suggestions.push('Double-check all card details');
      suggestions.push('Ensure your card is not expired');
      suggestions.push('Try a different card');
    } else {
      suggestions.push('Check your internet connection');
      suggestions.push('Try again in a few minutes');
      suggestions.push('Use a different payment method');
    }

    return suggestions;
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      {/* Error Icon */}
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          {getErrorIcon()}
        </div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Payment Failed
        </h2>
        <p className="text-gray-600">
          We couldn't process your payment. Please try again.
        </p>
      </div>

      {/* Error Details */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-red-800 mb-2">What happened?</h3>
        <p className="text-sm text-red-700">
          {getErrorMessage(error)}
        </p>
        {transactionId && (
          <div className="mt-3 pt-3 border-t border-red-200">
            <p className="text-xs text-red-600">
              Reference ID: {transactionId}
            </p>
          </div>
        )}
      </div>

      {/* Suggested Actions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-blue-800 mb-2">What you can do:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          {getSuggestedActions().map((suggestion, index) => (
            <li key={index}>• {suggestion}</li>
          ))}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={onRetryPayment}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          Retry Payment
        </button>
        
        <button
          onClick={onTryDifferentMethod}
          className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
        >
          Try Different Payment Method
        </button>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onContactSupport}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            Contact Support
          </button>
          
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            Cancel Booking
          </button>
        </div>
      </div>

      {/* Help Information */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-2">
            Need help? Our support team is available 24/7
          </p>
          <div className="flex justify-center space-x-4 text-xs text-gray-600">
            <span>📞 1-800-HOSPITAL</span>
            <span>✉️ support@hospital.com</span>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="mt-4 bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-600 text-center">
          🔒 Your payment information is secure and encrypted. 
          No payment details are stored on our servers.
        </p>
      </div>
    </div>
  );
};

export default PaymentFailurePage;