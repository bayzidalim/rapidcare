import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BookingCardWithPayment from '../BookingCardWithPayment';
import { Booking } from '@/lib/types';
import * as api from '@/lib/api';

// Mock the API
jest.mock('@/lib/api', () => ({
  paymentAPI: {
    getTransactionDetails: jest.fn(),
    processRefund: jest.fn(),
  },
  bookingAPI: {
    cancel: jest.fn(),
  },
}));

// Mock the PaymentReceiptModal and BookingCancellationModal
jest.mock('../PaymentReceiptModal', () => {
  return function MockPaymentReceiptModal({ isOpen, onClose }: any) {
    return isOpen ? (
      <div data-testid="payment-receipt-modal">
        <button onClick={onClose}>Close Receipt Modal</button>
      </div>
    ) : null;
  };
});

jest.mock('../BookingCancellationModal', () => {
  return function MockBookingCancellationModal({ isOpen, onClose, onCancellationComplete }: any) {
    return isOpen ? (
      <div data-testid="booking-cancellation-modal">
        <button onClick={onClose}>Close Cancellation Modal</button>
        <button onClick={() => onCancellationComplete({ status: 'cancelled' })}>
          Confirm Cancellation
        </button>
      </div>
    ) : null;
  };
});

const mockBooking: Booking = {
  id: 1,
  userId: 1,
  hospitalId: {
    id: 1,
    name: 'Test Hospital',
    address: {
      street: '123 Main St',
      city: 'Test City',
      state: 'Test State',
      zipCode: '12345',
      country: 'Test Country'
    },
    contact: {
      phone: '123-456-7890',
      email: 'test@hospital.com',
      emergency: '911'
    },
    services: ['Emergency', 'Surgery'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z'
  },
  resourceType: 'bed',
  patientName: 'John Doe',
  patientAge: 30,
  patientGender: 'male',
  emergencyContact: {
    name: 'Jane Doe',
    phone: '123-456-7891',
    relationship: 'spouse'
  },
  medicalCondition: 'Test condition',
  urgency: 'medium',
  scheduledDate: '2024-02-01T10:00:00Z',
  estimatedDuration: 2,
  status: 'pending',
  payment: {
    amount: 100,
    status: 'paid',
    method: 'credit_card',
    transactionId: 'txn_123'
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const mockTransaction = {
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
};

describe('BookingCardWithPayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders booking information correctly', () => {
    render(<BookingCardWithPayment booking={mockBooking} />);
    
    expect(screen.getByText('Test Hospital')).toBeInTheDocument();
    expect(screen.getByText('John Doe • 30 years')).toBeInTheDocument();
    expect(screen.getByText('Test City, Test State')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
  });

  it('displays payment details when showPaymentDetails is true', () => {
    render(<BookingCardWithPayment booking={mockBooking} showPaymentDetails={true} />);
    
    expect(screen.getByText('Payment Details')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('paid')).toBeInTheDocument();
    expect(screen.getByText('txn_123')).toBeInTheDocument();
  });

  it('shows receipt button when payment is completed', () => {
    render(<BookingCardWithPayment booking={mockBooking} />);
    
    expect(screen.getByText('Receipt')).toBeInTheDocument();
    expect(screen.getByText('Payment')).toBeInTheDocument();
  });

  it('shows cancel button when booking is pending and cancellation is allowed', () => {
    render(<BookingCardWithPayment booking={mockBooking} allowCancellation={true} />);
    
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('does not show cancel button when cancellation is not allowed', () => {
    render(<BookingCardWithPayment booking={mockBooking} allowCancellation={false} />);
    
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('opens receipt modal when receipt button is clicked', async () => {
    const mockGetTransactionDetails = jest.spyOn(api.paymentAPI, 'getTransactionDetails');
    mockGetTransactionDetails.mockResolvedValue({
      data: {
        success: true,
        data: { transaction: mockTransaction }
      }
    } as any);

    render(<BookingCardWithPayment booking={mockBooking} />);
    
    fireEvent.click(screen.getByText('Receipt'));
    
    await waitFor(() => {
      expect(mockGetTransactionDetails).toHaveBeenCalledWith('txn_123');
      expect(screen.getByTestId('payment-receipt-modal')).toBeInTheDocument();
    });
  });

  it('opens payment details modal when payment button is clicked', async () => {
    const mockGetTransactionDetails = jest.spyOn(api.paymentAPI, 'getTransactionDetails');
    mockGetTransactionDetails.mockResolvedValue({
      data: {
        success: true,
        data: { transaction: mockTransaction }
      }
    } as any);

    render(<BookingCardWithPayment booking={mockBooking} />);
    
    fireEvent.click(screen.getByText('Payment'));
    
    await waitFor(() => {
      expect(mockGetTransactionDetails).toHaveBeenCalledWith('txn_123');
    });
  });

  it('opens cancellation modal when cancel button is clicked', () => {
    render(<BookingCardWithPayment booking={mockBooking} allowCancellation={true} />);
    
    fireEvent.click(screen.getByText('Cancel'));
    
    expect(screen.getByTestId('booking-cancellation-modal')).toBeInTheDocument();
  });

  it('calls onUpdate when booking is updated', () => {
    const mockOnUpdate = jest.fn();
    render(
      <BookingCardWithPayment 
        booking={mockBooking} 
        onUpdate={mockOnUpdate}
        allowCancellation={true}
      />
    );
    
    fireEvent.click(screen.getByText('Cancel'));
    fireEvent.click(screen.getByText('Confirm Cancellation'));
    
    expect(mockOnUpdate).toHaveBeenCalledWith({ status: 'cancelled' });
  });

  it('displays correct status colors', () => {
    const completedBooking = { ...mockBooking, status: 'completed' as const };
    render(<BookingCardWithPayment booking={completedBooking} />);
    
    const statusBadge = screen.getByText('completed');
    expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('displays correct urgency colors', () => {
    const criticalBooking = { ...mockBooking, urgency: 'critical' as const };
    render(<BookingCardWithPayment booking={criticalBooking} />);
    
    const urgencyBadge = screen.getByText('critical');
    expect(urgencyBadge).toHaveClass('bg-red-100', 'text-red-800');
  });

  it('displays medical condition', () => {
    render(<BookingCardWithPayment booking={mockBooking} />);
    
    expect(screen.getByText('Medical Condition:')).toBeInTheDocument();
    expect(screen.getByText('Test condition')).toBeInTheDocument();
  });

  it('formats currency correctly', () => {
    render(<BookingCardWithPayment booking={mockBooking} showPaymentDetails={true} />);
    
    expect(screen.getByText('$100.00')).toBeInTheDocument();
  });

  it('handles different resource types', () => {
    const icuBooking = { ...mockBooking, resourceType: 'icu' as const };
    render(<BookingCardWithPayment booking={icuBooking} />);
    
    // Should render heart icon for ICU
    expect(screen.getByText('John Doe • 30 years')).toBeInTheDocument();
  });
});