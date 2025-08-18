import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { BrowserRouter } from 'react-router-dom';
import App from '../../app/page';

// Mock the API module
jest.mock('../../lib/api', () => ({
  getHospitals: jest.fn(),
  createBooking: jest.fn(),
  getUserBookings: jest.fn(),
  getPendingBookings: jest.fn(),
  approveBooking: jest.fn(),
  declineBooking: jest.fn(),
  cancelBooking: jest.fn(),
  login: jest.fn(),
  register: jest.fn(),
}));

// Mock the auth module
const mockAuthContext = {
  user: null,
  isAuthenticated: false,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
};

jest.mock('../../lib/auth', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Next.js router
const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  refresh: jest.fn(),
  pathname: '/',
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockRouter.pathname,
}));

// Mock real-time updates
jest.mock('../../hooks/useRealTimeUpdates', () => ({
  useRealTimeUpdates: () => ({
    data: null,
    isConnected: true,
    lastUpdate: new Date(),
  }),
}));

const mockHospitals = [
  {
    id: 1,
    name: 'City General Hospital',
    address: { 
      street: '123 Main St',
      city: 'Test City',
      state: 'Test State',
      zipCode: '12345'
    },
    contact: {
      phone: '+8801234567890',
      email: 'info@citygeneral.com',
      emergency: '+8801234567891'
    },
    resources: {
      beds: { available: 10, total: 50, occupied: 35, reserved: 5 },
      icu: { available: 3, total: 10, occupied: 6, reserved: 1 },
      operationTheatres: { available: 2, total: 5, occupied: 2, reserved: 1 },
    },
    approval_status: 'approved',
    isActive: true,
  },
  {
    id: 2,
    name: 'Metro Medical Center',
    address: { 
      street: '456 Oak Ave',
      city: 'Metro City',
      state: 'Test State',
      zipCode: '54321'
    },
    contact: {
      phone: '+8801234567892',
      email: 'info@metromedical.com',
      emergency: '+8801234567893'
    },
    resources: {
      beds: { available: 5, total: 30, occupied: 20, reserved: 5 },
      icu: { available: 1, total: 8, occupied: 6, reserved: 1 },
      operationTheatres: { available: 1, total: 3, occupied: 1, reserved: 1 },
    },
    approval_status: 'approved',
    isActive: true,
  },
];

const mockUser = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  userType: 'user',
};

const mockHospitalAuthority = {
  id: 2,
  name: 'Hospital Admin',
  email: 'admin@citygeneral.com',
  userType: 'hospital-authority',
  hospital_id: 1,
};

describe('Complete Booking Workflow E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthContext.user = null;
    mockAuthContext.isAuthenticated = false;
    mockRouter.pathname = '/';
    
    const api = require('../../lib/api');
    api.getHospitals.mockResolvedValue({ data: mockHospitals });
  });

  const renderApp = () => {
    return render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
  };

  describe('User Registration and Login Flow', () => {
    it('should allow user to register and login', async () => {
      const user = userEvent.setup();
      const api = require('../../lib/api');
      
      api.register.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: 'mock-token' }
      });
      
      api.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: 'mock-token' }
      });

      renderApp();

      // Navigate to registration
      const registerLink = screen.getByRole('link', { name: /register/i });
      await user.click(registerLink);

      // Fill registration form
      await user.type(screen.getByLabelText(/name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.selectOptions(screen.getByLabelText(/user type/i), 'user');

      const registerButton = screen.getByRole('button', { name: /register/i });
      await user.click(registerButton);

      await waitFor(() => {
        expect(api.register).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
          userType: 'user',
        });
      });

      // Mock successful authentication
      mockAuthContext.user = mockUser;
      mockAuthContext.isAuthenticated = true;

      // Should redirect to dashboard
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });

    it('should allow hospital authority to register with hospital details', async () => {
      const user = userEvent.setup();
      const api = require('../../lib/api');
      
      api.register.mockResolvedValue({
        success: true,
        data: { 
          user: mockHospitalAuthority, 
          hospital: { id: 1, name: 'Test Hospital' },
          token: 'mock-token' 
        }
      });

      renderApp();

      // Navigate to registration
      const registerLink = screen.getByRole('link', { name: /register/i });
      await user.click(registerLink);

      // Fill user details
      await user.type(screen.getByLabelText(/name/i), 'Hospital Admin');
      await user.type(screen.getByLabelText(/email/i), 'admin@hospital.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.selectOptions(screen.getByLabelText(/user type/i), 'hospital-authority');

      // Hospital details form should appear
      await waitFor(() => {
        expect(screen.getByLabelText(/hospital name/i)).toBeInTheDocument();
      });

      // Fill hospital details
      await user.type(screen.getByLabelText(/hospital name/i), 'Test Hospital');
      await user.type(screen.getByLabelText(/hospital type/i), 'General');
      await user.type(screen.getByLabelText(/street address/i), '123 Test St');
      await user.type(screen.getByLabelText(/city/i), 'Test City');
      await user.type(screen.getByLabelText(/state/i), 'Test State');
      await user.type(screen.getByLabelText(/zip code/i), '12345');
      await user.type(screen.getByLabelText(/phone/i), '+8801234567890');
      await user.type(screen.getByLabelText(/email/i), 'info@hospital.com');
      await user.type(screen.getByLabelText(/emergency contact/i), '+8801234567891');

      const registerButton = screen.getByRole('button', { name: /register/i });
      await user.click(registerButton);

      await waitFor(() => {
        expect(api.register).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Hospital Admin',
          email: 'admin@hospital.com',
          userType: 'hospital-authority',
          hospital: expect.objectContaining({
            name: 'Test Hospital',
            type: 'General',
          }),
        }));
      });
    });
  });

  describe('Hospital Discovery and Booking Creation Flow', () => {
    beforeEach(() => {
      mockAuthContext.user = mockUser;
      mockAuthContext.isAuthenticated = true;
    });

    it('should allow user to browse hospitals and create booking', async () => {
      const user = userEvent.setup();
      const api = require('../../lib/api');
      
      api.createBooking.mockResolvedValue({
        success: true,
        data: {
          id: 1,
          bookingReference: 'BK-20241201-ABC123',
          status: 'pending',
        }
      });

      renderApp();

      // Navigate to hospitals page
      const hospitalsLink = screen.getByRole('link', { name: /hospitals/i });
      await user.click(hospitalsLink);

      // Should see hospital list
      await waitFor(() => {
        expect(screen.getByText('City General Hospital')).toBeInTheDocument();
        expect(screen.getByText('Metro Medical Center')).toBeInTheDocument();
      });

      // Check resource availability display
      expect(screen.getByText(/beds: 10 available/i)).toBeInTheDocument();
      expect(screen.getByText(/icu: 3 available/i)).toBeInTheDocument();
      expect(screen.getByText(/operation theatres: 2 available/i)).toBeInTheDocument();

      // Click on first hospital to view details
      const hospitalCard = screen.getByTestId('hospital-card-1');
      await user.click(hospitalCard);

      // Should see hospital details
      expect(screen.getByText(/hospital details/i)).toBeInTheDocument();
      expect(screen.getByText('123 Main St')).toBeInTheDocument();
      expect(screen.getByText('+8801234567890')).toBeInTheDocument();

      // Click book now button
      const bookNowButton = screen.getByRole('button', { name: /book now/i });
      await user.click(bookNowButton);

      // Should see booking form
      expect(screen.getByText(/create booking/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('City General Hospital')).toBeInTheDocument();

      // Fill booking form
      await user.selectOptions(screen.getByLabelText(/resource type/i), 'beds');
      await user.type(screen.getByLabelText(/patient name/i), 'John Doe');
      await user.type(screen.getByLabelText(/patient age/i), '30');
      await user.selectOptions(screen.getByLabelText(/patient gender/i), 'male');
      await user.type(screen.getByLabelText(/medical condition/i), 'Emergency surgery required for appendicitis');
      await user.selectOptions(screen.getByLabelText(/urgency/i), 'high');
      await user.type(screen.getByLabelText(/emergency contact name/i), 'Jane Doe');
      await user.type(screen.getByLabelText(/emergency contact phone/i), '+8801234567890');
      await user.type(screen.getByLabelText(/relationship/i), 'spouse');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await user.type(screen.getByLabelText(/scheduled date/i), tomorrow.toISOString().split('T')[0]);
      
      await user.type(screen.getByLabelText(/estimated duration/i), '48');
      await user.type(screen.getByLabelText(/notes/i), 'Patient requires immediate attention');

      // Submit booking
      const submitButton = screen.getByRole('button', { name: /submit booking/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(api.createBooking).toHaveBeenCalledWith(expect.objectContaining({
          hospitalId: 1,
          resourceType: 'beds',
          patientName: 'John Doe',
          patientAge: 30,
          patientGender: 'male',
          medicalCondition: 'Emergency surgery required for appendicitis',
          urgency: 'high',
        }));
      });

      // Should show success message
      expect(screen.getByText(/booking submitted successfully/i)).toBeInTheDocument();
      expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
    });

    it('should validate booking form and show errors', async () => {
      const user = userEvent.setup();
      renderApp();

      // Navigate to booking form
      const hospitalsLink = screen.getByRole('link', { name: /hospitals/i });
      await user.click(hospitalsLink);

      await waitFor(() => {
        const bookNowButton = screen.getAllByRole('button', { name: /book now/i })[0];
        await user.click(bookNowButton);
      });

      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /submit booking/i });
      await user.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/patient name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/patient age is required/i)).toBeInTheDocument();
        expect(screen.getByText(/medical condition is required/i)).toBeInTheDocument();
      });

      // Fill invalid data
      await user.type(screen.getByLabelText(/patient age/i), '200');
      await user.type(screen.getByLabelText(/emergency contact phone/i), 'invalid-phone');
      
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      await user.type(screen.getByLabelText(/scheduled date/i), pastDate.toISOString().split('T')[0]);

      await user.click(submitButton);

      // Should show specific validation errors
      await waitFor(() => {
        expect(screen.getByText(/age must be between 1 and 150/i)).toBeInTheDocument();
        expect(screen.getByText(/invalid phone number format/i)).toBeInTheDocument();
        expect(screen.getByText(/scheduled date must be in the future/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Booking Management Flow', () => {
    beforeEach(() => {
      mockAuthContext.user = mockUser;
      mockAuthContext.isAuthenticated = true;
    });

    it('should allow user to view and manage their bookings', async () => {
      const user = userEvent.setup();
      const api = require('../../lib/api');
      
      const mockUserBookings = [
        {
          id: 1,
          bookingReference: 'BK-20241201-ABC123',
          patientName: 'John Doe',
          hospitalName: 'City General Hospital',
          resourceType: 'beds',
          status: 'pending',
          urgency: 'high',
          scheduledDate: '2024-12-02T10:00:00Z',
          createdAt: '2024-12-01T10:00:00Z',
        },
        {
          id: 2,
          bookingReference: 'BK-20241201-DEF456',
          patientName: 'John Doe',
          hospitalName: 'Metro Medical Center',
          resourceType: 'icu',
          status: 'approved',
          urgency: 'critical',
          scheduledDate: '2024-12-03T14:00:00Z',
          createdAt: '2024-12-01T12:00:00Z',
        },
      ];

      api.getUserBookings.mockResolvedValue({ data: mockUserBookings });
      api.cancelBooking.mockResolvedValue({ success: true });

      renderApp();

      // Navigate to dashboard
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      await user.click(dashboardLink);

      // Should see booking summary
      await waitFor(() => {
        expect(screen.getByText(/my bookings/i)).toBeInTheDocument();
        expect(screen.getByText(/total bookings: 2/i)).toBeInTheDocument();
        expect(screen.getByText(/pending: 1/i)).toBeInTheDocument();
        expect(screen.getByText(/approved: 1/i)).toBeInTheDocument();
      });

      // Should see booking cards
      expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      expect(screen.getByText('BK-20241201-DEF456')).toBeInTheDocument();

      // Click on first booking to view details
      const bookingCard = screen.getByTestId('booking-card-1');
      await user.click(bookingCard);

      expect(screen.getByText(/booking details/i)).toBeInTheDocument();
      expect(screen.getByText('City General Hospital')).toBeInTheDocument();

      // Cancel pending booking
      const cancelButton = screen.getByRole('button', { name: /cancel booking/i });
      await user.click(cancelButton);

      // Confirm cancellation
      expect(screen.getByText(/confirm cancellation/i)).toBeInTheDocument();
      const confirmButton = screen.getByRole('button', { name: /confirm cancel/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(api.cancelBooking).toHaveBeenCalledWith(1, expect.any(Object));
      });

      expect(screen.getByText(/booking cancelled successfully/i)).toBeInTheDocument();
    });

    it('should filter and search bookings', async () => {
      const user = userEvent.setup();
      const api = require('../../lib/api');
      
      const mockUserBookings = [
        {
          id: 1,
          bookingReference: 'BK-20241201-ABC123',
          patientName: 'John Doe',
          status: 'pending',
          urgency: 'high',
        },
        {
          id: 2,
          bookingReference: 'BK-20241201-DEF456',
          patientName: 'Jane Smith',
          status: 'approved',
          urgency: 'critical',
        },
      ];

      api.getUserBookings.mockResolvedValue({ data: mockUserBookings });

      renderApp();

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      await user.click(dashboardLink);

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
        expect(screen.getByText('BK-20241201-DEF456')).toBeInTheDocument();
      });

      // Filter by status
      const statusFilter = screen.getByLabelText(/filter by status/i);
      await user.selectOptions(statusFilter, 'pending');

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
        expect(screen.queryByText('BK-20241201-DEF456')).not.toBeInTheDocument();
      });

      // Search by patient name
      const searchInput = screen.getByPlaceholderText(/search bookings/i);
      await user.clear(searchInput);
      await user.type(searchInput, 'Jane');

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-DEF456')).toBeInTheDocument();
        expect(screen.queryByText('BK-20241201-ABC123')).not.toBeInTheDocument();
      });
    });
  });

  describe('Hospital Authority Approval Flow', () => {
    beforeEach(() => {
      mockAuthContext.user = mockHospitalAuthority;
      mockAuthContext.isAuthenticated = true;
    });

    it('should allow hospital authority to approve and decline bookings', async () => {
      const user = userEvent.setup();
      const api = require('../../lib/api');
      
      const mockPendingBookings = [
        {
          id: 1,
          bookingReference: 'BK-20241201-ABC123',
          patientName: 'John Doe',
          resourceType: 'beds',
          status: 'pending',
          urgency: 'critical',
          medicalCondition: 'Emergency surgery required',
          waitingTime: 6,
        },
        {
          id: 2,
          bookingReference: 'BK-20241201-DEF456',
          patientName: 'Jane Smith',
          resourceType: 'icu',
          status: 'pending',
          urgency: 'high',
          medicalCondition: 'Critical care required',
          waitingTime: 4,
        },
      ];

      api.getPendingBookings.mockResolvedValue({ 
        data: mockPendingBookings,
        summary: { totalPending: 2, critical: 1, high: 1, medium: 0, low: 0 }
      });
      api.approveBooking.mockResolvedValue({ success: true });
      api.declineBooking.mockResolvedValue({ success: true });

      renderApp();

      // Navigate to hospital dashboard
      const dashboardLink = screen.getByRole('link', { name: /hospital dashboard/i });
      await user.click(dashboardLink);

      // Should see pending bookings
      await waitFor(() => {
        expect(screen.getByText(/pending bookings/i)).toBeInTheDocument();
        expect(screen.getByText(/total pending: 2/i)).toBeInTheDocument();
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
        expect(screen.getByText('BK-20241201-DEF456')).toBeInTheDocument();
      });

      // Approve first booking
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      await user.click(approveButtons[0]);

      // Fill approval form
      expect(screen.getByText(/approve booking/i)).toBeInTheDocument();
      await user.type(screen.getByLabelText(/approval notes/i), 'Approved for immediate admission');
      await user.type(screen.getByLabelText(/resources to allocate/i), '1');

      const confirmApprovalButton = screen.getByRole('button', { name: /confirm approval/i });
      await user.click(confirmApprovalButton);

      await waitFor(() => {
        expect(api.approveBooking).toHaveBeenCalledWith(1, {
          notes: 'Approved for immediate admission',
          resourcesAllocated: 1,
        });
      });

      expect(screen.getByText(/booking approved successfully/i)).toBeInTheDocument();

      // Decline second booking
      const declineButtons = screen.getAllByRole('button', { name: /decline/i });
      await user.click(declineButtons[0]); // Now first since one was approved

      // Fill decline form
      expect(screen.getByText(/decline booking/i)).toBeInTheDocument();
      await user.selectOptions(screen.getByLabelText(/decline reason/i), 'no_resources');
      await user.type(screen.getByLabelText(/additional notes/i), 'All ICU beds are currently occupied');

      const confirmDeclineButton = screen.getByRole('button', { name: /confirm decline/i });
      await user.click(confirmDeclineButton);

      await waitFor(() => {
        expect(api.declineBooking).toHaveBeenCalledWith(2, {
          reason: 'no_resources',
          notes: 'All ICU beds are currently occupied',
        });
      });

      expect(screen.getByText(/booking declined successfully/i)).toBeInTheDocument();
    });

    it('should perform bulk operations on multiple bookings', async () => {
      const user = userEvent.setup();
      const api = require('../../lib/api');
      
      const mockPendingBookings = [
        { id: 1, bookingReference: 'BK-20241201-ABC123', patientName: 'John Doe', status: 'pending' },
        { id: 2, bookingReference: 'BK-20241201-DEF456', patientName: 'Jane Smith', status: 'pending' },
        { id: 3, bookingReference: 'BK-20241201-GHI789', patientName: 'Bob Johnson', status: 'pending' },
      ];

      api.getPendingBookings.mockResolvedValue({ 
        data: mockPendingBookings,
        summary: { totalPending: 3, critical: 0, high: 0, medium: 3, low: 0 }
      });
      api.approveBooking.mockResolvedValue({ success: true });

      renderApp();

      const dashboardLink = screen.getByRole('link', { name: /hospital dashboard/i });
      await user.click(dashboardLink);

      await waitFor(() => {
        expect(screen.getByText('BK-20241201-ABC123')).toBeInTheDocument();
      });

      // Select multiple bookings
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // First booking
      await user.click(checkboxes[1]); // Second booking

      expect(screen.getByText(/2 bookings selected/i)).toBeInTheDocument();

      // Perform bulk approval
      const bulkApproveButton = screen.getByRole('button', { name: /bulk approve/i });
      await user.click(bulkApproveButton);

      await user.type(screen.getByLabelText(/approval notes/i), 'Bulk approval for routine cases');
      
      const confirmBulkButton = screen.getByRole('button', { name: /confirm bulk approval/i });
      await user.click(confirmBulkButton);

      await waitFor(() => {
        expect(api.approveBooking).toHaveBeenCalledTimes(2);
      });

      expect(screen.getByText(/2 bookings approved successfully/i)).toBeInTheDocument();
    });
  });

  describe('Real-time Updates and Notifications', () => {
    beforeEach(() => {
      mockAuthContext.user = mockUser;
      mockAuthContext.isAuthenticated = true;
    });

    it('should show real-time booking status updates', async () => {
      const { useRealTimeUpdates } = require('../../hooks/useRealTimeUpdates');
      
      const api = require('../../lib/api');
      api.getUserBookings.mockResolvedValue({ 
        data: [
          {
            id: 1,
            bookingReference: 'BK-20241201-ABC123',
            status: 'pending',
            patientName: 'John Doe',
          }
        ]
      });

      renderApp();

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      await userEvent.setup().click(dashboardLink);

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
      });

      // Mock real-time status update
      useRealTimeUpdates.mockReturnValue({
        data: {
          type: 'booking_status_update',
          bookingId: 1,
          newStatus: 'approved',
        },
        isConnected: true,
        lastUpdate: new Date(),
      });

      // Re-render to trigger update
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Approved')).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent(/booking status updated/i);
      });
    });

    it('should show connection status and handle reconnection', async () => {
      const { useRealTimeUpdates } = require('../../hooks/useRealTimeUpdates');
      
      useRealTimeUpdates.mockReturnValue({
        data: null,
        isConnected: false,
        lastUpdate: new Date(),
      });

      renderApp();

      expect(screen.getByText(/connection lost/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reconnect/i })).toBeInTheDocument();

      // Mock reconnection
      const reconnectButton = screen.getByRole('button', { name: /reconnect/i });
      await userEvent.setup().click(reconnectButton);

      useRealTimeUpdates.mockReturnValue({
        data: null,
        isConnected: true,
        lastUpdate: new Date(),
      });

      // Re-render to show connected state
      renderApp();

      expect(screen.getByText(/connected/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(() => {
      mockAuthContext.user = mockUser;
      mockAuthContext.isAuthenticated = true;
    });

    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      const api = require('../../lib/api');
      
      api.getUserBookings.mockRejectedValue(new Error('Network error'));

      renderApp();

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      await user.click(dashboardLink);

      await waitFor(() => {
        expect(screen.getByText(/failed to load bookings/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      // Test retry functionality
      api.getUserBookings.mockResolvedValue({ data: [] });
      
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText(/no bookings found/i)).toBeInTheDocument();
      });
    });

    it('should handle booking creation failures', async () => {
      const user = userEvent.setup();
      const api = require('../../lib/api');
      
      api.createBooking.mockRejectedValue(new Error('Booking creation failed'));

      renderApp();

      // Navigate to booking form and fill it
      const hospitalsLink = screen.getByRole('link', { name: /hospitals/i });
      await user.click(hospitalsLink);

      await waitFor(() => {
        const bookNowButton = screen.getAllByRole('button', { name: /book now/i })[0];
        await user.click(bookNowButton);
      });

      // Fill minimum required fields
      await user.type(screen.getByLabelText(/patient name/i), 'John Doe');
      await user.type(screen.getByLabelText(/patient age/i), '30');
      await user.selectOptions(screen.getByLabelText(/patient gender/i), 'male');
      await user.type(screen.getByLabelText(/medical condition/i), 'Emergency surgery required');

      const submitButton = screen.getByRole('button', { name: /submit booking/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to submit booking/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and Mobile Responsiveness', () => {
    beforeEach(() => {
      mockAuthContext.user = mockUser;
      mockAuthContext.isAuthenticated = true;
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      renderApp();

      // Tab through main navigation
      await user.tab();
      expect(screen.getByRole('link', { name: /dashboard/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('link', { name: /hospitals/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('link', { name: /bookings/i })).toHaveFocus();

      // Enter should activate links
      await user.keyboard('{Enter}');
      expect(mockRouter.push).toHaveBeenCalled();
    });

    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderApp();

      const mainContainer = screen.getByRole('main');
      expect(mainContainer).toHaveClass('mobile-responsive');
    });

    it('should have proper ARIA labels and roles', () => {
      renderApp();

      expect(screen.getByRole('banner')).toBeInTheDocument(); // Header
      expect(screen.getByRole('navigation')).toBeInTheDocument(); // Nav menu
      expect(screen.getByRole('main')).toBeInTheDocument(); // Main content
      expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // Footer
    });
  });
});