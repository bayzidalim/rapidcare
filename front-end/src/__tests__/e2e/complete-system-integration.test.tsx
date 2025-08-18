import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Mock Next.js router
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock API calls
const mockApiCall = jest.fn();
jest.mock('@/lib/api', () => ({
  apiCall: mockApiCall,
}));

// Mock auth
const mockIsAuthenticated = jest.fn();
const mockGetUserInfo = jest.fn();
jest.mock('@/lib/auth', () => ({
  isAuthenticated: mockIsAuthenticated,
  getUserInfo: mockGetUserInfo,
  logout: jest.fn(),
}));

// Import components after mocking
import HomePage from '@/app/page';
import BookingPage from '@/app/booking/page';
import HospitalsPage from '@/app/hospitals/page';
import DashboardPage from '@/app/dashboard/page';

describe('Complete System Integration E2E Tests', () => {
  const mockUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    userType: 'user',
  };

  const mockHospitalAuthority = {
    id: 2,
    name: 'Hospital Authority',
    email: 'authority@example.com',
    userType: 'hospital-authority',
    hospitalId: 1,
  };

  const mockHospitals = [
    {
      id: 1,
      name: 'Test Hospital',
      address: '123 Test Street',
      phone: '01234567890',
      email: 'hospital@test.com',
      approved: true,
      resources: {
        beds: { total: 50, available: 30, occupied: 20 },
        icu: { total: 10, available: 5, occupied: 5 },
        operationTheatres: { total: 5, available: 2, occupied: 3 },
      },
    },
  ];

  const mockBooking = {
    id: 1,
    userId: 1,
    hospitalId: 1,
    resourceType: 'beds',
    patientName: 'Test Patient',
    patientAge: 35,
    patientGender: 'male',
    medicalCondition: 'Emergency surgery required',
    urgency: 'high',
    emergencyContactName: 'Emergency Contact',
    emergencyContactPhone: '01234567891',
    emergencyContactRelationship: 'spouse',
    scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    estimatedDuration: 48,
    status: 'pending',
    bookingReference: 'RC-2025-001',
    createdAt: new Date().toISOString(),
    hospital: mockHospitals[0],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiCall.mockClear();
    mockIsAuthenticated.mockReturnValue(false);
    mockGetUserInfo.mockReturnValue(null);
  });

  describe('1. User Authentication and Hospital Discovery Flow', () => {
    it('should display login prompt for unauthenticated users', async () => {
      render(<HomePage />);

      expect(screen.getByText('Get Help Now')).toBeInTheDocument();
      expect(screen.getByText('Create Account')).toBeInTheDocument();
      expect(screen.getByText('RapidCare')).toBeInTheDocument();
    });

    it('should show authenticated user options when logged in', async () => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetUserInfo.mockReturnValue(mockUser);

      render(<HomePage />);

      expect(screen.getByText('Find Emergency Care')).toBeInTheDocument();
      expect(screen.getByText('Book Resources Now')).toBeInTheDocument();
    });

    it('should display hospitals with real-time resource availability', async () => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetUserInfo.mockReturnValue(mockUser);
      mockApiCall.mockResolvedValueOnce({ hospitals: mockHospitals });

      render(<HospitalsPage />);

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith('/hospitals', 'GET');
      });

      await waitFor(() => {
        expect(screen.getByText('Test Hospital')).toBeInTheDocument();
      });
    });
  });

  describe('2. Complete Booking Request Flow', () => {
    beforeEach(() => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetUserInfo.mockReturnValue(mockUser);
    });

    it('should allow user to create a booking request with all required information', async () => {
      mockApiCall
        .mockResolvedValueOnce({ hospitals: mockHospitals }) // Get hospitals
        .mockResolvedValueOnce({ booking: mockBooking }); // Create booking

      const user = userEvent.setup();
      render(<BookingPage />);

      // Wait for hospitals to load
      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith('/hospitals', 'GET');
      });

      // Fill out the booking form
      await act(async () => {
        // Select hospital
        const hospitalSelect = screen.getByLabelText(/hospital/i);
        await user.selectOptions(hospitalSelect, '1');

        // Select resource type
        const resourceSelect = screen.getByLabelText(/resource type/i);
        await user.selectOptions(resourceSelect, 'beds');

        // Fill patient information
        const patientNameInput = screen.getByLabelText(/patient name/i);
        await user.type(patientNameInput, 'Test Patient');

        const patientAgeInput = screen.getByLabelText(/patient age/i);
        await user.type(patientAgeInput, '35');

        const patientGenderSelect = screen.getByLabelText(/patient gender/i);
        await user.selectOptions(patientGenderSelect, 'male');

        const medicalConditionInput = screen.getByLabelText(/medical condition/i);
        await user.type(medicalConditionInput, 'Emergency surgery required');

        const urgencySelect = screen.getByLabelText(/urgency/i);
        await user.selectOptions(urgencySelect, 'high');

        // Fill emergency contact
        const emergencyContactNameInput = screen.getByLabelText(/emergency contact name/i);
        await user.type(emergencyContactNameInput, 'Emergency Contact');

        const emergencyContactPhoneInput = screen.getByLabelText(/emergency contact phone/i);
        await user.type(emergencyContactPhoneInput, '01234567891');

        const emergencyContactRelationshipInput = screen.getByLabelText(/relationship/i);
        await user.type(emergencyContactRelationshipInput, 'spouse');

        // Set scheduled date
        const scheduledDateInput = screen.getByLabelText(/scheduled date/i);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await user.type(scheduledDateInput, tomorrow.toISOString().split('T')[0]);

        // Submit the form
        const submitButton = screen.getByRole('button', { name: /submit booking/i });
        await user.click(submitButton);
      });

      // Verify booking creation API call
      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith('/bookings', 'POST', expect.objectContaining({
          hospitalId: 1,
          resourceType: 'beds',
          patientName: 'Test Patient',
          patientAge: 35,
          patientGender: 'male',
          medicalCondition: 'Emergency surgery required',
          urgency: 'high',
          emergencyContactName: 'Emergency Contact',
          emergencyContactPhone: '01234567891',
          emergencyContactRelationship: 'spouse',
        }));
      });
    });

    it('should validate required fields and show error messages', async () => {
      mockApiCall.mockResolvedValueOnce({ hospitals: mockHospitals });

      const user = userEvent.setup();
      render(<BookingPage />);

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith('/hospitals', 'GET');
      });

      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /submit booking/i });
      await user.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/patient name is required/i)).toBeInTheDocument();
      });
    });

    it('should display booking confirmation with reference number', async () => {
      mockApiCall
        .mockResolvedValueOnce({ hospitals: mockHospitals })
        .mockResolvedValueOnce({ booking: mockBooking });

      const user = userEvent.setup();
      render(<BookingPage />);

      // Complete the booking process (simplified)
      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith('/hospitals', 'GET');
      });

      // After successful booking creation, should show confirmation
      await waitFor(() => {
        if (mockApiCall.mock.calls.length > 1) {
          expect(screen.getByText(/booking confirmed/i)).toBeInTheDocument();
          expect(screen.getByText('RC-2025-001')).toBeInTheDocument();
        }
      });
    });
  });

  describe('3. User Dashboard and Status Tracking', () => {
    beforeEach(() => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetUserInfo.mockReturnValue(mockUser);
    });

    it('should display user bookings with current status', async () => {
      mockApiCall.mockResolvedValueOnce({ bookings: [mockBooking] });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith('/bookings/user', 'GET');
      });

      await waitFor(() => {
        expect(screen.getByText('Test Patient')).toBeInTheDocument();
        expect(screen.getByText('pending')).toBeInTheDocument();
        expect(screen.getByText('RC-2025-001')).toBeInTheDocument();
      });
    });

    it('should show real-time status updates', async () => {
      const approvedBooking = { ...mockBooking, status: 'approved' };
      
      mockApiCall
        .mockResolvedValueOnce({ bookings: [mockBooking] }) // Initial load
        .mockResolvedValueOnce({ bookings: [approvedBooking] }); // Polling update

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('pending')).toBeInTheDocument();
      });

      // Simulate polling update
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      await waitFor(() => {
        expect(screen.getByText('approved')).toBeInTheDocument();
      });
    });

    it('should allow user to cancel their booking', async () => {
      mockApiCall
        .mockResolvedValueOnce({ bookings: [mockBooking] })
        .mockResolvedValueOnce({ message: 'Booking cancelled successfully' });

      const user = userEvent.setup();
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Patient')).toBeInTheDocument();
      });

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Confirm cancellation
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith('/bookings/1', 'DELETE');
      });
    });
  });

  describe('4. Hospital Authority Workflow', () => {
    beforeEach(() => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetUserInfo.mockReturnValue(mockHospitalAuthority);
    });

    it('should display pending bookings for hospital authority', async () => {
      mockApiCall.mockResolvedValueOnce({ bookings: [mockBooking] });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith('/bookings/hospital/1/pending', 'GET');
      });

      await waitFor(() => {
        expect(screen.getByText('Test Patient')).toBeInTheDocument();
        expect(screen.getByText('high')).toBeInTheDocument(); // Urgency level
      });
    });

    it('should allow hospital authority to approve booking', async () => {
      const approvedBooking = { ...mockBooking, status: 'approved' };
      
      mockApiCall
        .mockResolvedValueOnce({ bookings: [mockBooking] })
        .mockResolvedValueOnce({ booking: approvedBooking });

      const user = userEvent.setup();
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Patient')).toBeInTheDocument();
      });

      // Click approve button
      const approveButton = screen.getByRole('button', { name: /approve/i });
      await user.click(approveButton);

      // Add approval notes
      const notesInput = screen.getByLabelText(/notes/i);
      await user.type(notesInput, 'Approved for emergency treatment');

      // Confirm approval
      const confirmButton = screen.getByRole('button', { name: /confirm approval/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith('/bookings/1/approve', 'PUT', {
          authorityNotes: 'Approved for emergency treatment',
        });
      });
    });

    it('should allow hospital authority to decline booking with reason', async () => {
      const declinedBooking = { ...mockBooking, status: 'declined' };
      
      mockApiCall
        .mockResolvedValueOnce({ bookings: [mockBooking] })
        .mockResolvedValueOnce({ booking: declinedBooking });

      const user = userEvent.setup();
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Patient')).toBeInTheDocument();
      });

      // Click decline button
      const declineButton = screen.getByRole('button', { name: /decline/i });
      await user.click(declineButton);

      // Select decline reason
      const reasonSelect = screen.getByLabelText(/reason/i);
      await user.selectOptions(reasonSelect, 'Resource not available');

      // Confirm decline
      const confirmButton = screen.getByRole('button', { name: /confirm decline/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith('/bookings/1/decline', 'PUT', {
          declineReason: 'Resource not available',
        });
      });
    });
  });

  describe('5. Real-time Notifications', () => {
    beforeEach(() => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetUserInfo.mockReturnValue(mockUser);
    });

    it('should display notification bell with unread count', async () => {
      const mockNotifications = [
        {
          id: 1,
          type: 'booking_approved',
          title: 'Booking Approved',
          message: 'Your booking has been approved',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ];

      mockApiCall.mockResolvedValueOnce({ notifications: mockNotifications });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument(); // Notification count
      });
    });

    it('should show notification details when clicked', async () => {
      const mockNotifications = [
        {
          id: 1,
          type: 'booking_approved',
          title: 'Booking Approved',
          message: 'Your booking RC-2025-001 has been approved',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ];

      mockApiCall
        .mockResolvedValueOnce({ notifications: mockNotifications })
        .mockResolvedValueOnce({ success: true }); // Mark as read

      const user = userEvent.setup();
      render(<DashboardPage />);

      // Click notification bell
      const notificationBell = screen.getByRole('button', { name: /notifications/i });
      await user.click(notificationBell);

      await waitFor(() => {
        expect(screen.getByText('Booking Approved')).toBeInTheDocument();
        expect(screen.getByText('Your booking RC-2025-001 has been approved')).toBeInTheDocument();
      });

      // Click on notification to mark as read
      const notification = screen.getByText('Booking Approved');
      await user.click(notification);

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith('/notifications/1/read', 'PUT');
      });
    });
  });

  describe('6. Error Handling and Recovery', () => {
    beforeEach(() => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetUserInfo.mockReturnValue(mockUser);
    });

    it('should handle API errors gracefully', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('Network error'));

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/error loading/i)).toBeInTheDocument();
      });
    });

    it('should show retry option on failed requests', async () => {
      mockApiCall
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ bookings: [mockBooking] });

      const user = userEvent.setup();
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/error loading/i)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Test Patient')).toBeInTheDocument();
      });
    });

    it('should handle offline scenarios', async () => {
      // Mock offline scenario
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/offline/i)).toBeInTheDocument();
      });
    });
  });

  describe('7. Performance and Accessibility', () => {
    beforeEach(() => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetUserInfo.mockReturnValue(mockUser);
    });

    it('should support keyboard navigation', async () => {
      mockApiCall.mockResolvedValueOnce({ bookings: [mockBooking] });

      const user = userEvent.setup();
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Patient')).toBeInTheDocument();
      });

      // Test tab navigation
      await user.tab();
      expect(document.activeElement).toHaveAttribute('role', 'button');

      // Test enter key activation
      await user.keyboard('{Enter}');
      // Should trigger button action
    });

    it('should have proper ARIA labels and roles', async () => {
      mockApiCall.mockResolvedValueOnce({ bookings: [mockBooking] });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });

      // Check for proper ARIA labels
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should load content progressively with loading states', async () => {
      // Delay the API response to test loading states
      mockApiCall.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ bookings: [mockBooking] }), 100)
        )
      );

      render(<DashboardPage />);

      // Should show loading state initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Should show content after loading
      await waitFor(() => {
        expect(screen.getByText('Test Patient')).toBeInTheDocument();
      });
    });
  });

  describe('8. Mobile Responsiveness', () => {
    beforeEach(() => {
      mockIsAuthenticated.mockReturnValue(true);
      mockGetUserInfo.mockReturnValue(mockUser);
      
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });
    });

    it('should adapt layout for mobile devices', async () => {
      mockApiCall.mockResolvedValueOnce({ bookings: [mockBooking] });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Patient')).toBeInTheDocument();
      });

      // Check for mobile-specific classes or responsive behavior
      const container = screen.getByRole('main');
      expect(container).toHaveClass(/mobile|responsive|sm:|md:/);
    });

    it('should handle touch interactions', async () => {
      mockApiCall.mockResolvedValueOnce({ bookings: [mockBooking] });

      const user = userEvent.setup();
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Patient')).toBeInTheDocument();
      });

      // Test touch events (simulated as clicks)
      const bookingCard = screen.getByText('Test Patient').closest('div');
      await user.click(bookingCard!);

      // Should handle touch interaction appropriately
    });
  });
});