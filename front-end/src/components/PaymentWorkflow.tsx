'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookingFormData, PaymentResult, PaymentReceipt, Transaction } from '@/lib/types';
import PaymentProcessingInterface from './PaymentProcessingInterface';
import PaymentSuccessPage from './PaymentSuccessPage';
import PaymentFailurePage from './PaymentFailurePage';
import PaymentReceiptModal from './PaymentReceiptModal';

interface PaymentWorkflowProps {
  bookingData: BookingFormData;
  totalAmount: number;
  onCancel: () => void;
  onComplete?: (result: PaymentResult) => void;
}

type PaymentStep = 'processing' | 'success' | 'failure';

export default function PaymentWorkflow({ bookingData, totalAmount, onCancel, onComplete }: PaymentWorkflowProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<PaymentStep>('processing');
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [paymentError, setPaymentError] = useState<string>('');
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const handlePaymentSuccess = async (result: PaymentResult) => {
    setPaymentResult(result);
    setCurrentStep('success');
    
    // Fetch receipt data
    if (result.transaction?.id) {
      await fetchReceipt(result.transaction.id);
    }
    
    if (onComplete) {
      onComplete(result);
    }
  };

  const handlePaymentFailure = (error: string) => {
    setPaymentError(error);
    setCurrentStep('failure');
  };

  const fetchReceipt = async (transactionId: number) => {
    try {
      const response = await fetch(`/api/payments/${transactionId}/receipt`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setReceipt(result.data.receipt);
      }
    } catch (error) {
      console.error('Error fetching receipt:', error);
    }
  };

  const handleViewReceipt = () => {
    setShowReceiptModal(true);
  };

  const handleDownloadReceipt = () => {
    // Create a printable version of the receipt
    const printContent = document.getElementById('receipt-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Payment Receipt</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .receipt-header { text-align: center; margin-bottom: 20px; }
                .receipt-section { margin-bottom: 15px; }
                .receipt-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                .receipt-total { border-top: 1px solid #ccc; padding-top: 10px; font-weight: bold; }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handlePrintReceipt = () => {
    handleDownloadReceipt();
  };

  const handleRetryPayment = () => {
    setCurrentStep('processing');
    setPaymentError('');
    setPaymentResult(null);
  };

  const handleTryDifferentMethod = () => {
    setCurrentStep('processing');
    setPaymentError('');
    setPaymentResult(null);
  };

  const handleContactSupport = () => {
    // Open support contact modal or redirect to support page
    window.open('mailto:support@instant-hospitalization.com?subject=Payment Issue&body=Transaction ID: ' + (paymentResult?.transaction?.transactionId || 'N/A'), '_blank');
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  const handleBookAnother = () => {
    router.push('/hospitals');
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'processing':
        return (
          <PaymentProcessingInterface
            bookingData={bookingData}
            totalAmount={totalAmount}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentFailure={handlePaymentFailure}
            onCancel={onCancel}
          />
        );

      case 'success':
        return (
          <PaymentSuccessPage
            paymentResult={paymentResult!}
            receipt={receipt || undefined}
            onViewReceipt={handleViewReceipt}
            onGoToDashboard={handleGoToDashboard}
            onBookAnother={handleBookAnother}
          />
        );

      case 'failure':
        return (
          <PaymentFailurePage
            error={paymentError}
            transactionId={paymentResult?.transaction?.transactionId}
            onRetryPayment={handleRetryPayment}
            onTryDifferentMethod={handleTryDifferentMethod}
            onContactSupport={handleContactSupport}
            onCancel={onCancel}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Progress Indicator */}
        <div className="max-w-md mx-auto mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'processing' ? 'bg-blue-600 text-white' : 
              currentStep === 'success' || currentStep === 'failure' ? 'bg-green-600 text-white' : 
              'bg-gray-300 text-gray-600'
            }`}>
              1
            </div>
            <div className={`h-1 w-16 ${
              currentStep === 'success' || currentStep === 'failure' ? 'bg-green-600' : 'bg-gray-300'
            }`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'success' ? 'bg-green-600 text-white' : 
              currentStep === 'failure' ? 'bg-red-600 text-white' : 
              'bg-gray-300 text-gray-600'
            }`}>
              {currentStep === 'success' ? '✓' : currentStep === 'failure' ? '✗' : '2'}
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Payment</span>
            <span>
              {currentStep === 'success' ? 'Success' : 
               currentStep === 'failure' ? 'Failed' : 
               'Confirmation'}
            </span>
          </div>
        </div>

        {/* Current Step Content */}
        {renderCurrentStep()}

        {/* Receipt Modal */}
        <PaymentReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          receipt={receipt || undefined}
          transaction={paymentResult?.transaction}
          onDownload={handleDownloadReceipt}
          onPrint={handlePrintReceipt}
        />
      </div>
    </div>
  );
};