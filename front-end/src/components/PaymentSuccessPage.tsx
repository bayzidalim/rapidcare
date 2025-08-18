'use client';

import React from 'react';
import { PaymentResult, PaymentReceipt } from '@/lib/types';

interface PaymentSuccessPageProps {
  paymentResult: PaymentResult;
  receipt?: PaymentReceipt;
  onViewReceipt: () => void;
  onGoToDashboard: () => void;
  onBookAnother: () => void;
}

const PaymentSuccessPage: React.FC<PaymentSuccessPageProps> = ({
  paymentResult,
  receipt,
  onViewReceipt,
  onGoToDashboard,
  onBookAnother
}) => {
  const transaction = paymentResult.transaction;

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      {/* Success Icon */}
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Payment Successful!
        </h2>
        <p className="text-gray-600">
          Your booking has been confirmed and payment processed successfully.
        </p>
      </div>

      {/* Booking Confirmation Details */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-green-800 mb-3">Booking Confirmed</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-green-700">Booking Reference:</span>
            <span className="font-medium text-green-800">
              #{transaction?.bookingId || 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-700">Transaction ID:</span>
            <span className="font-medium text-green-800">
              {transaction?.transactionId || 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-700">Amount Paid:</span>
            <span className="font-medium text-green-800">
              ${transaction?.amount?.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-700">Payment Method:</span>
            <span className="font-medium text-green-800 capitalize">
              {transaction?.paymentMethod?.replace('_', ' ') || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-blue-800 mb-2">What's Next?</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• You will receive a confirmation email shortly</li>
          <li>• The hospital will contact you with further instructions</li>
          <li>• Please arrive 30 minutes before your scheduled time</li>
          <li>• Bring a valid ID and insurance information</li>
        </ul>
      </div>

      {/* Important Information */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-yellow-800 mb-2">Important Information</h3>
        <div className="text-sm text-yellow-700 space-y-1">
          <p>• Cancellations must be made at least 24 hours in advance</p>
          <p>• Refunds are processed according to hospital policy</p>
          <p>• Keep your booking reference for all communications</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={onViewReceipt}
          className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
        >
          View Receipt
        </button>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onGoToDashboard}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Go to Dashboard
          </button>
          
          <button
            onClick={onBookAnother}
            className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Book Another
          </button>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          For urgent matters, contact our 24/7 helpline: 
          <span className="font-medium text-gray-700"> 1-800-HOSPITAL</span>
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;