'use client';

import React from 'react';
import { PaymentReceipt, Transaction } from '@/lib/types';
import { generateReceiptData, downloadReceiptAsHTML, printReceipt } from '@/lib/receiptUtils';

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt?: PaymentReceipt;
  transaction?: Transaction;
  onDownload?: () => void;
  onPrint?: () => void;
}

const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt,
  transaction,
  onDownload,
  onPrint
}) => {
  if (!isOpen) return null;

  const receiptData = receipt || (transaction ? generateReceiptData(transaction) : null);

  if (!receiptData) {
    return null;
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString('en-BD')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Medical Care Receipt</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Receipt Content */}
        <div className="p-6" id="receipt-content">
          {/* Company Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-gray-800">RapidCare</h1>
            <p className="text-sm text-gray-600">Emergency Care, Delivered Fast</p>
            <p className="text-xs text-gray-500">www.rapidcare.com</p>
          </div>

          {/* Receipt Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Receipt ID:</span>
                <div className="font-medium text-gray-800">{receiptData.receiptId}</div>
              </div>
              <div>
                <span className="text-gray-600">Receipt Date:</span>
                <div className="font-medium text-gray-800">
                  {formatDate(receiptData.receiptDate)}
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-800 mb-3">Transaction Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Transaction ID:</span>
                <span className="font-medium text-gray-800">{receiptData.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Booking ID:</span>
                <span className="font-medium text-gray-800">#{receiptData.bookingId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Date:</span>
                <span className="font-medium text-gray-800">
                  {formatDate(receiptData.paymentDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-medium text-gray-800 capitalize">
                  {receiptData.paymentMethod.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium capitalize ${
                  receiptData.status === 'completed' ? 'text-green-600' : 
                  receiptData.status === 'failed' ? 'text-red-600' : 
                  'text-yellow-600'
                }`}>
                  {receiptData.status}
                </span>
              </div>
            </div>
          </div>

          {/* Booking Details */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-800 mb-3">Booking Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Patient Name:</span>
                <span className="font-medium text-gray-800">{receiptData.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Hospital:</span>
                <span className="font-medium text-gray-800">{receiptData.hospitalName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Resource Type:</span>
                <span className="font-medium text-gray-800 capitalize">
                  {receiptData.resourceType}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Scheduled Date:</span>
                <span className="font-medium text-gray-800">
                  {formatDate(receiptData.scheduledDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Rapid Assistance Details */}
          {receiptData.rapidAssistance && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-800 mb-3">Rapid Assistance Service</h3>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span className="font-medium text-blue-800">Service Confirmed</span>
                  </div>
                  <p className="text-blue-700 text-xs mb-3">
                    Dedicated assistant will escort you from hospital gate to your destination.
                  </p>
                  
                  {receiptData.rapidAssistantName && receiptData.rapidAssistantPhone ? (
                    <div className="bg-white rounded p-3 border border-blue-200">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-600">Assistant Name:</span>
                        <span className="font-medium text-gray-800">{receiptData.rapidAssistantName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Contact Number:</span>
                        <span className="font-mono text-gray-800">{receiptData.rapidAssistantPhone}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded p-3 border border-blue-200 text-center">
                      <span className="text-xs text-blue-600">Assistant details will be provided shortly</span>
                    </div>
                  )}
                  
                  {receiptData.rapidAssistanceCharge && (
                    <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                      <span className="text-blue-700 font-medium">Service Charge:</span>
                      <span className="font-medium text-blue-800">{formatCurrency(receiptData.rapidAssistanceCharge)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Payment Breakdown */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-800 mb-3">Payment Breakdown</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Booking Amount:</span>
                  <span className="text-gray-800">{formatCurrency(receiptData.hospitalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Charge:</span>
                  <span className="text-gray-800">{formatCurrency(receiptData.serviceCharge)}</span>
                </div>
                {receiptData.rapidAssistance && receiptData.rapidAssistanceCharge && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rapid Assistance:</span>
                    <span className="text-gray-800">{formatCurrency(receiptData.rapidAssistanceCharge)}</span>
                  </div>
                )}
                <div className="border-t border-gray-300 pt-2 mt-2">
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-800">Total Amount:</span>
                    <span className="text-gray-800">{formatCurrency(receiptData.amount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-800 mb-3">Important Information</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p>• This receipt serves as proof of payment for your emergency medical care booking</p>
              <p>• Retain this receipt for your medical records and insurance claims</p>
              <p>• For support inquiries, reference your transaction ID when contacting us</p>
              <p>• Refunds, if applicable, will be processed to your original payment method</p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-t border-gray-200 pt-4">
            <div className="text-center text-xs text-gray-500">
              <p className="mb-1">For support and inquiries:</p>
              <p>📞 1-800-RAPIDCARE | ✉️ support@rapidcare.com</p>
              <p className="mt-2">Thank you for choosing RapidCare - Your Emergency Care Partner</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 focus:outline-none"
          >
            Close
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={() => {
                if (onPrint) {
                  onPrint();
                } else {
                  printReceipt(receiptData);
                }
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Print
            </button>
            
            <button
              onClick={() => {
                if (onDownload) {
                  onDownload();
                } else {
                  downloadReceiptAsHTML(receiptData);
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentReceiptModal;