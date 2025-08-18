'use client';

import React, { useState } from 'react';
import { Transaction, PaymentReceipt } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PaymentReceiptModal from './PaymentReceiptModal';
import { 
  CreditCard, 
  Calendar, 
  Building2, 
  User, 
  Receipt, 
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface PaymentHistoryCardProps {
  transactions: Transaction[];
  loading?: boolean;
  onRefresh?: () => void;
  onViewReceipt?: (transactionId: string) => void;
  onRefund?: (transactionId: string) => void;
}

const PaymentHistoryCard: React.FC<PaymentHistoryCardProps> = ({
  transactions,
  loading = false,
  onRefresh,
  onViewReceipt,
  onRefund
}) => {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'credit_card':
      case 'debit_card':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
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

  const handleViewReceipt = async (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowReceiptModal(true);
    
    if (onViewReceipt) {
      onViewReceipt(transaction.transactionId);
    }
  };

  const handleDownloadReceipt = () => {
    // This would typically generate and download a PDF receipt
    console.log('Download receipt for transaction:', selectedTransaction?.transactionId);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Payment History
            <RefreshCw className="w-4 h-4 animate-spin" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Payment History
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No payment history</h3>
              <p className="text-gray-600">
                Your payment transactions will appear here once you make bookings.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {getPaymentMethodIcon(transaction.paymentMethod)}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {transaction.hospitalName || 'Hospital Booking'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Transaction ID: {transaction.transactionId}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(transaction.amount)}
                      </div>
                      <Badge className={getStatusColor(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>{transaction.patientName || 'Patient'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4" />
                      <span className="capitalize">
                        {transaction.resourceType || 'Resource'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {transaction.scheduledDate 
                          ? formatDate(transaction.scheduledDate)
                          : formatDate(transaction.createdAt)
                        }
                      </span>
                    </div>
                  </div>

                  {/* Payment Breakdown */}
                  <div className="bg-gray-50 rounded-md p-3 mb-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Hospital Amount:</span>
                        <span className="font-medium">
                          {formatCurrency(transaction.hospitalAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Service Charge:</span>
                        <span className="font-medium">
                          {formatCurrency(transaction.serviceCharge)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Paid via {transaction.paymentMethod.replace('_', ' ')} • {formatDate(transaction.createdAt)}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReceipt(transaction)}
                      >
                        <Receipt className="w-4 h-4 mr-1" />
                        Receipt
                      </Button>
                      
                      {transaction.status === 'completed' && onRefund && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRefund(transaction.transactionId)}
                        >
                          <AlertCircle className="w-4 h-4 mr-1" />
                          Refund
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Modal */}
      <PaymentReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        transaction={selectedTransaction || undefined}
        onDownload={handleDownloadReceipt}
        onPrint={handlePrintReceipt}
      />
    </>
  );
};

export default PaymentHistoryCard;