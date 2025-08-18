import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import BookingDashboard from '../BookingDashboard';

// Mock the API module
jest.mock('../../lib/api', () => ({
  getUserBookings: jest.fn(),
  cancelBooking: jest.fn(),
  getBookingById: jest.fn(),
}));

// Mock the auth module
jest.mock('../../lib/auth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Test User', email: 'test@example.com' },
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

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

const mockBookings = [
  {
    id: 1,
    bookingReference: 'BK-20241201-ABC123',
    patientName: 'John Doe',
    hospitalName: 'Test Hospital',
    resourceType: 'beds',
    status: 'pending',
    urgency: 'high',
    scheduledDate: '2024-12-02T10:00:00Z',
    createdAt: '2024-12-01T10:00:00Z',
    estimatedDuration: 48,
    medicalCondition: 'Emergency surgery required',
    emergencyContactName: 'Jane Doe',
    emergencyContactPhone: '+8801234567890',
  },
  {
    id: 2,
    bookingReference: 'BK-20241201-DEF456',
    patientName: 'Jane Smith',
    hospitalName: 'Another Hospital',
    resourceType: 'icu',
    status: 'approved',
    urgency: 'critical',
    scheduledDate: '2024-12-03T14:00:00Z',
    createdAt: '2024-12-01T12:00:00Z',
    estimatedDuration: 72,
    medicalCondition: 'Critical care required',
    emergencyContactName: 'John Smith',
    emergencyContactPhone: '+8801234567891',
  },
  {
    id: 3,
    bookingReference: 'BK-20241201-GHI789',
    patientName: 'Bob Johnson',
    hospitalName: 'City Hospital',
    resourceType: 'operationTheatres',
    status: 'completed',
    urgency: 'medium',
    scheduledDate: '2024-11-30T08:00:00Z',
    createdAt: '2024-11-29T15:00:00Z',
    estimatedDuration: 6,
    medicalCondition: 'Scheduled surgery',
    emergencyContactName: 'Alice Johnson',
    emergencyContactPhone: '+8801234567892',
  },
];

describe('BookingDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getUserBookings } = require('../../lib/api');
    getUserBookings.mockResolvedValue({ data: mockBookings });
  });

  const renderBookingDashboard = (props = {}) => {
    return render(<BookingDashboard {...props} />);
  };

  describe('Dashboard Rendering', () => {
    it('should render dashboard title and summary', async () => {
      renderBookingDashboard();

      expect(screen.getByText(/my bookings/i)).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText(/total bookings: 3/i)).toBeInTheDocument();
        expect(screen.getByText(/pending: 1/i)).toBeInTheDocument();
        expect(screen.getByText(/approved: 1/i)).toBeInTheDocument();
        expect(screen.getByText(/completed: 1/i)).toBeInTheDocument();
      });
    });

    it('should render all booking cards', async () => {
      renderBookingDashboard();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
        expect(screen.getByText('BK-20241201-DEF456')).toBeInTheDocument();
        expect(screen.getByText('BK-20241201-GHI789')).toBeInTheDocument();
      });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    it('should display correct status badges', async () => {
      renderBookingDashboard();

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('Approved')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
      });
    });

    it('should display urgency indicators', async () => {
      renderBookingDashboard();

      await waitFor(() => {
        expect(screen.getByText('High Priority')).toBeInTheDocument();
        expect(screen.getByText('Critical')).toBeInTheDocument();
        expect(screen.getByText('Medium Priority')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      const { getUserBookings } = require('../../lib/api');
      getUserBookings.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderBookingDashboard();

      expect(screen.getByText(/loading bookings/i)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should show empty state when no bookings exist', async () => {
      const { getUserBookings } = require('../../lib/api');
      getUserBookings.mockResolvedValue({ data: [] });

      renderBookingDashboard();

      await waitFor(() => {
        expect(screen.getByText(/no bookings found/i)).toBeInTheDocument();
        expect(screen.getByText(/create your first booking/i)).toBeInTheDocument();
      });
    });
  });

  describe('Filtering and Sorting', () => {
    it('should filter bookings by status', async () => {
      const user = userEvent.setup();
      renderBookingDashboard();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      });

      const statusFilter = screen.getByLabelText(/filter by status/i);
      await user.selectOptions(statusFilter, 'pending');

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
        expect(screen.queryByText('BK-20241201-DEF456')).not.toBeInTheDocument();
        expect(screen.queryByText('BK-20241201-GHI789')).not.toBeInTheDocument();
      });
    });

    it('should filter bookings by urgency', async () => {
      const user = userEvent.setup();
      renderBookingDashboard();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-DEF456')).toBeInTheDocument();
      });

      const urgencyFilter = screen.getByLabelText(/filter by urgency/i);
      await user.selectOptions(urgencyFilter, 'critical');

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-DEF456')).toBeInTheDocument();
        expect(screen.queryByText('BK-20241201-ABC123')).not.toBeInTheDocument();
        expect(screen.queryByText('BK-20241201-GHI789')).not.toBeInTheDocument();
      });
    });

    it('should sort bookings by date', async () => {
      const user = userEvent.setup();
      renderBookingDashboard();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      });

      const sortSelect = screen.getByLabelText(/sort by/i);
      await user.selectOptions(sortSelect, 'scheduledDate');

      // Check that bookings are sorted by scheduled date
      const bookingCards = screen.getAllByTestId('booking-card');
      expect(bookingCards[0]).toHaveTextContent('BK-20241201-GHI789'); // Earliest date
      expect(bookingCards[1]).toHaveTextContent('BK-20241201-ABC123');
      expect(bookingCards[2]).toHaveTextContent('BK-20241201-DEF456'); // Latest date
    });

    it('should search bookings by patient name', async () => {
      const user = userEvent.setup();
      renderBookingDashboard();

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

    it('should search bookings by booking reference', async () => {
      const user = userEvent.setup();
      renderBookingDashboard();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search bookings/i);
      await user.type(searchInput, 'DEF456');

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-DEF456')).toBeInTheDocument();
        expect(screen.queryByText('BK-20241201-ABC123')).not.toBeInTheDocument();
        expect(screen.queryByText('BK-20241201-GHI789')).not.toBeInTheDocument();
      });
    });
  });

  describe('Booking Actions', () => {
    it('should show booking details when card is clicked', async () => {
      const user = userEvent.setup();
      renderBookingDashboard();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      });

      const bookingCard = screen.getByTestId('booking-card-1');
      await user.click(bookingCard);

      expect(screen.getByText(/booking details/i)).toBeInTheDocument();
      expect(screen.getByText('Emergency surgery required')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('+8801234567890')).toBeInTheDocument();
    });

    it('should allow cancelling pending bookings', async () => {
      const user = userEvent.setup();
      const { cancelBooking } = require('../../lib/api');
      cancelBooking.mockResolvedValue({ success: true });

      renderBookingDashboard();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel booking/i });
      await user.click(cancelButton);

      // Confirm cancellation
      expect(screen.getByText(/confirm cancellation/i)).toBeInTheDocument();
      const confirmButton = screen.getByRole('button', { name: /confirm cancel/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(cancelBooking).toHaveBeenCalledWith(1, expect.any(Object));
      });
    });

    it('should not show cancel button for completed bookings', async () => {
      renderBookingDashboard();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-GHI789')).toBeInTheDocument();
      });

      const completedBookingCard = screen.getByTestId('booking-card-3');
      expect(completedBookingCard).not.toHaveTextContent('Cancel');
    });

    it('should handle cancellation errors', async () => {
      const user = userEvent.setup();
      const { cancelBooking } = require('../../lib/api');
      cancelBooking.mockRejectedValue(new Error('Cancellation failed'));

      renderBookingDashboard();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel booking/i });
      await user.click(cancelButton);

      const confirmButton = screen.getByRole('button', { name: /confirm cancel/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to cancel booking/i)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should update booking status in real-time', async () => {
      const { useRealTimeUpdates } = require('../../hooks/useRealTimeUpdates');
      
      // Mock real-time update
      useRealTimeUpdates.mockReturnValue({
        data: {
          type: 'booking_status_update',
          bookingId: 1,
          newStatus: 'approved',
        },
        isConnected: true,
        lastUpdate: new Date(),
      });

      renderBookingDashboard();

      await waitFor(() => {
        expect(screen.getByText('Approved')).toBeInTheDocument();
      });
    });

    it('should show connection status indicator', async () => {
      const { useRealTimeUpdates } = require('../../hooks/useRealTimeUpdates');
      
      useRealTimeUpdates.mockReturnValue({
        data: null,
        isConnected: false,
        lastUpdate: new Date(),
      });

      renderBookingDashboard();

      expect(screen.getByText(/connection lost/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reconnect/i })).toBeInTheDocument();
    });

    it('should show last update timestamp', async () => {
      const lastUpdate = new Date('2024-12-01T15:30:00Z');
      const { useRealTimeUpdates } = require('../../hooks/useRealTimeUpdates');
      
      useRealTimeUpdates.mockReturnValue({
        data: null,
        isConnected: true,
        lastUpdate,
      });

      renderBookingDashboard();

      expect(screen.getByText(/last updated/i)).toBeInTheDocument();
      expect(screen.getByText(/15:30/)).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile layout', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderBookingDashboard();

      const dashboard = screen.getByTestId('booking-dashboard');
      expect(dashboard).toHaveClass('mobile-layout');
    });

    it('should stack booking cards vertically on small screens', async () => {
      // Mock small viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      });

      renderBookingDashboard();

      await waitFor(() => {
        const bookingGrid = screen.getByTestId('booking-grid');
        expect(bookingGrid).toHaveClass('grid-cols-1');
      });
    });

    it('should show compact view on mobile', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderBookingDashboard();

      await waitFor(() => {
        const bookingCards = screen.getAllByTestId('booking-card');
        bookingCards.forEach(card => {
          expect(card).toHaveClass('compact-view');
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      renderBookingDashboard();

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /booking summary/i })).toBeInTheDocument();
        expect(screen.getByRole('list', { name: /bookings/i })).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderBookingDashboard();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      });

      // Tab through booking cards
      await user.tab();
      expect(screen.getByTestId('booking-card-1')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('booking-card-2')).toHaveFocus();

      // Enter should open booking details
      await user.keyboard('{Enter}');
      expect(screen.getByText(/booking details/i)).toBeInTheDocument();
    });

    it('should announce status changes to screen readers', async () => {
      const { useRealTimeUpdates } = require('../../hooks/useRealTimeUpdates');
      
      useRealTimeUpdates.mockReturnValue({
        data: {
          type: 'booking_status_update',
          bookingId: 1,
          newStatus: 'approved',
        },
        isConnected: true,
        lastUpdate: new Date(),
      });

      renderBookingDashboard();

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/booking status updated to approved/i);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const { getUserBookings } = require('../../lib/api');
      getUserBookings.mockRejectedValue(new Error('Network error'));

      renderBookingDashboard();

      await waitFor(() => {
        expect(screen.getByText(/failed to load bookings/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should allow retrying failed requests', async () => {
      const user = userEvent.setup();
      const { getUserBookings } = require('../../lib/api');
      
      // First call fails
      getUserBookings.mockRejectedValueOnce(new Error('Network error'));
      // Second call succeeds
      getUserBookings.mockResolvedValueOnce({ data: mockBookings });

      renderBookingDashboard();

      await waitFor(() => {
        expect(screen.getByText(/failed to load bookings/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      });
    });

    it('should handle partial data gracefully', async () => {
      const incompleteBookings = [
        {
          id: 1,
          bookingReference: 'BK-20241201-ABC123',
          patientName: 'John Doe',
          status: 'pending',
          // Missing some fields
        },
      ];

      const { getUserBookings } = require('../../lib/api');
      getUserBookings.mockResolvedValue({ data: incompleteBookings });

      renderBookingDashboard();

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText(/information incomplete/i)).toBeInTheDocument();
      });
    });
  });
});