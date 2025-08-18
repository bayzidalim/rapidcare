import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import BookingApprovalInterface from '../BookingApprovalInterface';

// Mock the API module
jest.mock('../../lib/api', () => ({
  getPendingBookings: jest.fn(),
  approveBooking: jest.fn(),
  declineBooking: jest.fn(),
  getBookingHistory: jest.fn(),
  getBookingStatistics: jest.fn(),
}));

// Mock the auth module
jest.mock('../../lib/auth', () => ({
  useAuth: () => ({
    user: { 
      id: 2, 
      name: 'Hospital Authority', 
      email: 'authority@hospital.com',
      userType: 'hospital-authority',
      hospital_id: 1
    },
    isAuthenticated: true,
  }),
}));

// Mock the real-time updates hook
jest.mock('../../hooks/useRealTimeUpdates', () => ({
  useRealTimeUpdates: () => ({
    data: null,
    isConnected: true,
    lastUpdate: new Date(),
  }),
}));

const mockPendingBookings = [
  {
    id: 1,
    bookingReference: 'BK-20241201-ABC123',
    patientName: 'John Doe',
    patientAge: 30,
    patientGender: 'male',
    resourceType: 'beds',
    status: 'pending',
    urgency: 'critical',
    scheduledDate: '2024-12-02T10:00:00Z',
    createdAt: '2024-12-01T10:00:00Z',
    estimatedDuration: 48,
    medicalCondition: 'Emergency surgery required for appendicitis',
    emergencyContactName: 'Jane Doe',
    emergencyContactPhone: '+8801234567890',
    emergencyContactRelationship: 'spouse',
    waitingTime: 6, // hours
  },
  {
    id: 2,
    bookingReference: 'BK-20241201-DEF456',
    patientName: 'Jane Smith',
    patientAge: 45,
    patientGender: 'female',
    resourceType: 'icu',
    status: 'pending',
    urgency: 'high',
    scheduledDate: '2024-12-03T14:00:00Z',
    createdAt: '2024-12-01T12:00:00Z',
    estimatedDuration: 72,
    medicalCondition: 'Critical care required for heart condition',
    emergencyContactName: 'John Smith',
    emergencyContactPhone: '+8801234567891',
    emergencyContactRelationship: 'husband',
    waitingTime: 4, // hours
  },
  {
    id: 3,
    bookingReference: 'BK-20241201-GHI789',
    patientName: 'Bob Johnson',
    patientAge: 25,
    patientGender: 'male',
    resourceType: 'operationTheatres',
    status: 'pending',
    urgency: 'medium',
    scheduledDate: '2024-12-04T08:00:00Z',
    createdAt: '2024-12-01T14:00:00Z',
    estimatedDuration: 6,
    medicalCondition: 'Scheduled surgery for knee repair',
    emergencyContactName: 'Alice Johnson',
    emergencyContactPhone: '+8801234567892',
    emergencyContactRelationship: 'wife',
    waitingTime: 2, // hours
  },
];

const mockStatistics = {
  totalPending: 3,
  critical: 1,
  high: 1,
  medium: 1,
  low: 0,
  avgWaitingDays: 0.17,
};

describe('BookingApprovalInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getPendingBookings, getBookingStatistics } = require('../../lib/api');
    getPendingBookings.mockResolvedValue({ 
      data: mockPendingBookings,
      summary: mockStatistics 
    });
    getBookingStatistics.mockResolvedValue({ data: mockStatistics });
  });

  const renderApprovalInterface = (props = {}) => {
    return render(<BookingApprovalInterface hospitalId={1} {...props} />);
  };

  describe('Interface Rendering', () => {
    it('should render approval interface with statistics', async () => {
      renderApprovalInterface();

      expect(screen.getByText(/pending bookings/i)).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText(/total pending: 3/i)).toBeInTheDocument();
        expect(screen.getByText(/critical: 1/i)).toBeInTheDocument();
        expect(screen.getByText(/high: 1/i)).toBeInTheDocument();
        expect(screen.getByText(/medium: 1/i)).toBeInTheDocument();
      });
    });

    it('should render all pending booking cards', async () => {
      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
        expect(screen.getByText('BK-20241201-DEF456')).toBeInTheDocument();
        expect(screen.getByText('BK-20241201-GHI789')).toBeInTheDocument();
      });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    it('should display urgency indicators with proper styling', async () => {
      renderApprovalInterface();

      await waitFor(() => {
        const criticalBadge = screen.getByText('Critical');
        const highBadge = screen.getByText('High');
        const mediumBadge = screen.getByText('Medium');

        expect(criticalBadge).toHaveClass('bg-red-500');
        expect(highBadge).toHaveClass('bg-orange-500');
        expect(mediumBadge).toHaveClass('bg-yellow-500');
      });
    });

    it('should show waiting time for each booking', async () => {
      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.getByText(/waiting: 6 hours/i)).toBeInTheDocument();
        expect(screen.getByText(/waiting: 4 hours/i)).toBeInTheDocument();
        expect(screen.getByText(/waiting: 2 hours/i)).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      const { getPendingBookings } = require('../../lib/api');
      getPendingBookings.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderApprovalInterface();

      expect(screen.getByText(/loading pending bookings/i)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should show empty state when no pending bookings', async () => {
      const { getPendingBookings } = require('../../lib/api');
      getPendingBookings.mockResolvedValue({ 
        data: [], 
        summary: { totalPending: 0, critical: 0, high: 0, medium: 0, low: 0 }
      });

      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.getByText(/no pending bookings/i)).toBeInTheDocument();
        expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
      });
    });
  });

  describe('Filtering and Sorting', () => {
    it('should filter bookings by urgency', async () => {
      const user = userEvent.setup();
      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      });

      const urgencyFilter = screen.getByLabelText(/filter by urgency/i);
      await user.selectOptions(urgencyFilter, 'critical');

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
        expect(screen.queryByText('BK-20241201-DEF456')).not.toBeInTheDocument();
        expect(screen.queryByText('BK-20241201-GHI789')).not.toBeInTheDocument();
      });
    });

    it('should filter bookings by resource type', async () => {
      const user = userEvent.setup();
      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-DEF456')).toBeInTheDocument();
      });

      const resourceFilter = screen.getByLabelText(/filter by resource/i);
      await user.selectOptions(resourceFilter, 'icu');

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-DEF456')).toBeInTheDocument();
        expect(screen.queryByText('BK-20241201-ABC123')).not.toBeInTheDocument();
        expect(screen.queryByText('BK-20241201-GHI789')).not.toBeInTheDocument();
      });
    });

    it('should sort bookings by urgency by default', async () => {
      renderApprovalInterface();

      await waitFor(() => {
        const bookingCards = screen.getAllByTestId('booking-card');
        expect(bookingCards[0]).toHaveTextContent('Critical'); // Most urgent first
        expect(bookingCards[1]).toHaveTextContent('High');
        expect(bookingCards[2]).toHaveTextContent('Medium');
      });
    });

    it('should sort bookings by waiting time', async () => {
      const user = userEvent.setup();
      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      });

      const sortSelect = screen.getByLabelText(/sort by/i);
      await user.selectOptions(sortSelect, 'waitingTime');

      await waitFor(() => {
        const bookingCards = screen.getAllByTestId('booking-card');
        expect(bookingCards[0]).toHaveTextContent('waiting: 6 hours'); // Longest waiting first
        expect(bookingCards[1]).toHaveTextContent('waiting: 4 hours');
        expect(bookingCards[2]).toHaveTextContent('waiting: 2 hours');
      });
    });

    it('should search bookings by patient name', async () => {
      const user = userEvent.setup();
      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search bookings/i);
      await user.type(searchInput, 'Jane');

      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
      });
    });
  });

  describe('Booking Approval', () => {
    it('should show booking details when card is clicked', async () => {
      const user = userEvent.setup();
      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      });

      const bookingCard = screen.getByTestId('booking-card-1');
      await user.click(bookingCard);

      expect(screen.getByText(/booking details/i)).toBeInTheDocument();
      expect(screen.getByText('Emergency surgery required for appendicitis')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('+8801234567890')).toBeInTheDocument();
      expect(screen.getByText('spouse')).toBeInTheDocument();
    });

    it('should approve booking with notes', async () => {
      const user = userEvent.setup();
      const { approveBooking } = require('../../lib/api');
      approveBooking.mockResolvedValue({ success: true });

      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      });

      const approveButton = screen.getAllByRole('button', { name: /approve/i })[0];
      await user.click(approveButton);

      // Fill approval form
      expect(screen.getByText(/approve booking/i)).toBeInTheDocument();
      
      const notesInput = screen.getByLabelText(/approval notes/i);
      await user.type(notesInput, 'Approved for immediate admission');

      const resourcesInput = screen.getByLabelText(/resources to allocate/i);
      await user.clear(resourcesInput);
      await user.type(resourcesInput, '2');

      const confirmButton = screen.getByRole('button', { name: /confirm approval/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(approveBooking).toHaveBeenCalledWith(1, {
          notes: 'Approved for immediate admission',
          resourcesAllocated: 2,
        });
      });
    });

    it('should decline booking with reason', async () => {
      const user = userEvent.setup();
      const { declineBooking } = require('../../lib/api');
      declineBooking.mockResolvedValue({ success: true });

      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      });

      const declineButton = screen.getAllByRole('button', { name: /decline/i })[0];
      await user.click(declineButton);

      // Fill decline form
      expect(screen.getByText(/decline booking/i)).toBeInTheDocument();
      
      const reasonSelect = screen.getByLabelText(/decline reason/i);
      await user.selectOptions(reasonSelect, 'no_resources');

      const notesInput = screen.getByLabelText(/additional notes/i);
      await user.type(notesInput, 'All beds are currently occupied');

      const confirmButton = screen.getByRole('button', { name: /confirm decline/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(declineBooking).toHaveBeenCalledWith(1, {
          reason: 'no_resources',
          notes: 'All beds are currently occupied',
        });
      });
    });

    it('should handle approval errors', async () => {
      const user = userEvent.setup();
      const { approveBooking } = require('../../lib/api');
      approveBooking.mockRejectedValue(new Error('Approval failed'));

      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      });

      const approveButton = screen.getAllByRole('button', { name: /approve/i })[0];
      await user.click(approveButton);

      const confirmButton = screen.getByRole('button', { name: /confirm approval/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to approve booking/i)).toBeInTheDocument();
      });
    });

    it('should validate approval form', async () => {
      const user = userEvent.setup();
      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      });

      const approveButton = screen.getAllByRole('button', { name: /approve/i })[0];
      await user.click(approveButton);

      // Try to submit without required fields
      const confirmButton = screen.getByRole('button', { name: /confirm approval/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/approval notes are required/i)).toBeInTheDocument();
      });
    });

    it('should validate decline form', async () => {
      const user = userEvent.setup();
      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      });

      const declineButton = screen.getAllByRole('button', { name: /decline/i })[0];
      await user.click(declineButton);

      // Try to submit without reason
      const confirmButton = screen.getByRole('button', { name: /confirm decline/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/decline reason is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Bulk Actions', () => {
    it('should allow selecting multiple bookings', async () => {
      const user = userEvent.setup();
      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);

      expect(screen.getByText(/2 bookings selected/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /bulk approve/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /bulk decline/i })).toBeInTheDocument();
    });

    it('should perform bulk approval', async () => {
      const user = userEvent.setup();
      const { approveBooking } = require('../../lib/api');
      approveBooking.mockResolvedValue({ success: true });

      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      });

      // Select multiple bookings
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);

      const bulkApproveButton = screen.getByRole('button', { name: /bulk approve/i });
      await user.click(bulkApproveButton);

      // Fill bulk approval form
      const notesInput = screen.getByLabelText(/approval notes/i);
      await user.type(notesInput, 'Bulk approval for urgent cases');

      const confirmButton = screen.getByRole('button', { name: /confirm bulk approval/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(approveBooking).toHaveBeenCalledTimes(2);
      });
    });

    it('should select all bookings with select all checkbox', async () => {
      const user = userEvent.setup();
      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText(/select all/i);
      await user.click(selectAllCheckbox);

      expect(screen.getByText(/3 bookings selected/i)).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should update booking list when new booking arrives', async () => {
      const { useRealTimeUpdates } = require('../../hooks/useRealTimeUpdates');
      
      useRealTimeUpdates.mockReturnValue({
        data: {
          type: 'new_booking',
          booking: {
            id: 4,
            bookingReference: 'BK-20241201-JKL012',
            patientName: 'New Patient',
            status: 'pending',
            urgency: 'high',
          },
        },
        isConnected: true,
        lastUpdate: new Date(),
      });

      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-JKL012')).toBeInTheDocument();
        expect(screen.getByText('New Patient')).toBeInTheDocument();
      });
    });

    it('should remove booking from list when approved', async () => {
      const { useRealTimeUpdates } = require('../../hooks/useRealTimeUpdates');
      
      useRealTimeUpdates.mockReturnValue({
        data: {
          type: 'booking_approved',
          bookingId: 1,
        },
        isConnected: true,
        lastUpdate: new Date(),
      });

      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.queryByText('BK-20241201-ABC123')).not.toBeInTheDocument();
        expect(screen.getByText('BK-20241201-DEF456')).toBeInTheDocument();
        expect(screen.getByText('BK-20241201-GHI789')).toBeInTheDocument();
      });
    });

    it('should show notification for new urgent bookings', async () => {
      const { useRealTimeUpdates } = require('../../hooks/useRealTimeUpdates');
      
      useRealTimeUpdates.mockReturnValue({
        data: {
          type: 'new_booking',
          booking: {
            id: 4,
            urgency: 'critical',
            patientName: 'Emergency Patient',
          },
        },
        isConnected: true,
        lastUpdate: new Date(),
      });

      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.getByText(/new critical booking received/i)).toBeInTheDocument();
        expect(screen.getByText(/emergency patient/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /statistics/i })).toBeInTheDocument();
        expect(screen.getByRole('list', { name: /pending bookings/i })).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      });

      // Tab through booking cards
      await user.tab();
      expect(screen.getByTestId('booking-card-1')).toHaveFocus();

      await user.tab();
      expect(screen.getAllByRole('button', { name: /approve/i })[0]).toHaveFocus();

      await user.tab();
      expect(screen.getAllByRole('button', { name: /decline/i })[0]).toHaveFocus();
    });

    it('should announce urgent bookings to screen readers', async () => {
      renderApprovalInterface();

      await waitFor(() => {
        const criticalBooking = screen.getByTestId('booking-card-1');
        expect(criticalBooking).toHaveAttribute('aria-label', expect.stringContaining('Critical urgency'));
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const { getPendingBookings } = require('../../lib/api');
      getPendingBookings.mockRejectedValue(new Error('Network error'));

      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.getByText(/failed to load pending bookings/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should allow retrying failed requests', async () => {
      const user = userEvent.setup();
      const { getPendingBookings } = require('../../lib/api');
      
      // First call fails
      getPendingBookings.mockRejectedValueOnce(new Error('Network error'));
      // Second call succeeds
      getPendingBookings.mockResolvedValueOnce({ 
        data: mockPendingBookings,
        summary: mockStatistics 
      });

      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.getByText(/failed to load pending bookings/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      });
    });

    it('should handle partial approval failures in bulk operations', async () => {
      const user = userEvent.setup();
      const { approveBooking } = require('../../lib/api');
      
      // First approval succeeds, second fails
      approveBooking
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Approval failed'));

      renderApprovalInterface();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      });

      // Select multiple bookings
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);

      const bulkApproveButton = screen.getByRole('button', { name: /bulk approve/i });
      await user.click(bulkApproveButton);

      const confirmButton = screen.getByRole('button', { name: /confirm bulk approval/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/1 booking approved, 1 failed/i)).toBeInTheDocument();
      });
    });
  });
});