import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PaymentHistoryCard from '../PaymentHistoryCard';
import { Transaction } from '@/lib/types';

// Mock the PaymentReceiptModal
jest.mock('../PaymentReceiptModal', () => {
  return function MockPaymentReceiptModal({ isOpen, onClose }: any) {
    return isOpen ? (
      <div data-testid="payment-receipt-modal">
        <button onClick={onClose}>Close Receipt Modal</button>
      </div>
    ) : null;
  };
});

const mockTransactions: Transaction[] = [
  {
    id: 1,
    bookingId: 1,
    userId: 1,
    hospitalId: 1,
    amount: 100,
    serviceCharge: 5,
    hospitalAmount: 95,
    paymentMethod: 'credit_card',
    transactionId: 'txn_123',
    status: 'completed',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    patientName: 'John Doe',
    resourceType: 'bed',
    scheduledDate: '2024-02-01T10:00:00Z',
    hospitalName: 'Test Hospital'
  },
  {
    id: 2,
    bookingId: 2,
    userId: 1,
    hospitalId: 2,
    amount: 200,
    serviceCharge: 10,
    hospitalAmount: 190,
    paymentMethod: 'debit_card',
    transactionId: 'txn_456',
    status: 'pending',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    patientName: 'Jane Smith',
    resourceType: 'icu',
    scheduledDate: '2024-02-02T14:00:00Z',
    hospitalName: 'Another Hospital'
  }
];

describe('PaymentHistoryCard', () => {
  it('renders payment history correctly', () => {
    render(<PaymentHistoryCard transactions={mockTransactions} />);
    
    expect(screen.getByText('Payment History')).toBeInTheDocument();
    expect(screen.getByText('Test Hospital')).toBeInTheDocument();
    expect(screen.getByText('Another Hospital')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('$200.00')).toBeInTheDocument();
  });

  it('displays transaction details correctly', () => {
    render(<PaymentHistoryCard transactions={mockTransactions} />);
    
    expect(screen.getByText('Transaction ID: txn_123')).toBeInTheDocument();
    expect(screen.getByText('Transaction ID: txn_456')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<PaymentHistoryCard transactions={[]} loading={true} />);
    
    expect(screen.getByText('Payment History')).toBeInTheDocument();
    // Should show loading skeletons
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(3);
  });

  it('shows empty state when no transactions', () => {
    render(<PaymentHistoryCard transactions={[]} />);
    
    expect(screen.getByText('No payment history')).toBeInTheDocument();
    expect(screen.getByText('Your payment transactions will appear here once you make bookings.')).toBeInTheDocument();
  });

  it('displays correct status badges', () => {
    render(<PaymentHistoryCard transactions={mockTransactions} />);
    
    const completedBadge = screen.getByText('completed');
    expect(completedBadge).toHaveClass('bg-green-100', 'text-green-800');
    
    const pendingBadge = screen.getByText('pending');
    expect(pendingBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });

  it('shows payment breakdown', () => {
    render(<PaymentHistoryCard transactions={mockTransactions} />);
    
    expect(screen.getByText('$95.00')).toBeInTheDocument(); // Hospital amount
    expect(screen.getByText('$5.00')).toBeInTheDocument(); // Service charge
    expect(screen.getByText('$190.00')).toBeInTheDocument(); // Hospital amount for second transaction
    expect(screen.getByText('$10.00')).toBeInTheDocument(); // Service charge for second transaction
  });

  it('calls onViewReceipt when receipt button is clicked', () => {
    const mockOnViewReceipt = jest.fn();
    render(
      <PaymentHistoryCard 
        transactions={mockTransactions} 
        onViewReceipt={mockOnViewReceipt}
      />
    );
    
    const receiptButtons = screen.getAllByText('Receipt');
    fireEvent.click(receiptButtons[0]);
    
    expect(mockOnViewReceipt).toHaveBeenCalledWith('txn_123');
  });

  it('calls onRefund when refund button is clicked for completed transactions', () => {
    const mockOnRefund = jest.fn();
    render(
      <PaymentHistoryCard 
        transactions={mockTransactions} 
        onRefund={mockOnRefund}
      />
    );
    
    const refundButtons = screen.getAllByText('Refund');
    fireEvent.click(refundButtons[0]);
    
    expect(mockOnRefund).toHaveBeenCalledWith('txn_123');
  });

  it('calls onRefresh when refresh button is clicked', () => {
    const mockOnRefresh = jest.fn();
    render(
      <PaymentHistoryCard 
        transactions={mockTransactions} 
        onRefresh={mockOnRefresh}
      />
    );
    
    const refreshButton = screen.getByRole('button', { name: '' }); // Refresh button with icon only
    fireEvent.click(refreshButton);
    
    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it('opens receipt modal when receipt button is clicked', async () => {
    render(<PaymentHistoryCard transactions={mockTransactions} />);
    
    const receiptButtons = screen.getAllByText('Receipt');
    fireEvent.click(receiptButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByTestId('payment-receipt-modal')).toBeInTheDocument();
    });
  });

  it('formats dates correctly', () => {
    render(<PaymentHistoryCard transactions={mockTransactions} />);
    
    // Should format dates in a readable format
    expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 2, 2024/)).toBeInTheDocument();
  });

  it('displays payment method correctly', () => {
    render(<PaymentHistoryCard transactions={mockTransactions} />);
    
    expect(screen.getByText(/credit card/)).toBeInTheDocument();
    expect(screen.getByText(/debit card/)).toBeInTheDocument();
  });

  it('shows refund button only for completed transactions', () => {
    const mockOnRefund = jest.fn();
    render(
      <PaymentHistoryCard 
        transactions={mockTransactions} 
        onRefund={mockOnRefund}
      />
    );
    
    const refundButtons = screen.getAllByText('Refund');
    // Should only show refund button for completed transaction
    expect(refundButtons).toHaveLength(1);
  });
});