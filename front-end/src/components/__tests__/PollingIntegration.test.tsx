/**
 * Integration tests for polling functionality in dashboard components
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResourceManagementDashboard from '../ResourceManagementDashboard';
import BookingApprovalInterface from '../BookingApprovalInterface';
import { pollingClient } from '@/lib/pollingClient';

// Mock the polling client
jest.mock('@/lib/pollingClient', () => ({
  pollingClient: {
    setEventHandlers: jest.fn(),
    pollResources: jest.fn(),
    pollBookings: jest.fn(),
    pollDashboard: jest.fn(),
    stopAllPolling: jest.fn(),
  }
}));

// Mock the API
jest.mock('@/lib/api', () => ({
  hospitalAPI: {
    updateResources: jest.fn(),
    getResourceHistory: jest.fn(),
  },
  bookingAPI: {
    getPendingBookings: jest.fn(),
    approveBooking: jest.fn(),
    declineBooking: jest.fn(),
  }
}));

const mockPollingClient = pollingClient as jest.Mocked<typeof pollingClient>;

describe('Polling Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ResourceManagementDashboard Polling', () => {
    const mockHospital = {
      id: 1,
      name: 'Test Hospital',
      resources: {
        beds: { total: 100, available: 50 },
        icu: { total: 20, available: 10 },
        operationTheatres: { total: 5, available: 3 }
      }
    };

    const mockOnUpdate = jest.fn();

    it('should initialize polling when component mounts', async () => {
      const mockSessionControl = {
        stop: jest.fn(),
        updateParams: jest.fn(),
        getStatus: jest.fn(() => ({ exists: true, interval: 15000, retryCount: 0 }))
      };

      mockPollingClient.pollResources.mockReturnValue(mockSessionControl);
      mockPollingClient.pollDashboard.mockReturnValue(mockSessionControl);

      render(
        <ResourceManagementDashboard 
          hospital={mockHospital} 
          onUpdate={mockOnUpdate} 
        />
      );

      await waitFor(() => {
        expect(mockPollingClient.setEventHandlers).toHaveBeenCalled();
        expect(mockPollingClient.pollResources).toHaveBeenCalledWith(
          `resource-dashboard-${mockHospital.id}`,
          mockHospital.id,
          expect.objectContaining({
            interval: 15000,
            onUpdate: expect.any(Function),
            onError: expect.any(Function)
          })
        );
        expect(mockPollingClient.pollDashboard).toHaveBeenCalledWith(
          `dashboard-${mockHospital.id}`,
          mockHospital.id,
          expect.objectContaining({
            interval: 30000,
            onUpdate: expect.any(Function),
            onError: expect.any(Function)
          })
        );
      });
    });

    it('should handle resource updates from polling', async () => {
      let resourceUpdateHandler: Function;
      
      const mockSessionControl = {
        stop: jest.fn(),
        updateParams: jest.fn(),
        getStatus: jest.fn(() => ({ exists: true, interval: 15000, retryCount: 0 }))
      };

      mockPollingClient.pollResources.mockImplementation((sessionId, hospitalId, options) => {
        resourceUpdateHandler = options.onUpdate!;
        return mockSessionControl;
      });
      mockPollingClient.pollDashboard.mockReturnValue(mockSessionControl);

      render(
        <ResourceManagementDashboard 
          hospital={mockHospital} 
          onUpdate={mockOnUpdate} 
        />
      );

      await waitFor(() => {
        expect(resourceUpdateHandler).toBeDefined();
      });

      // Simulate polling update
      const mockPollingData = {
        hasChanges: true,
        currentTimestamp: '2023-01-01T12:00:00.000Z',
        changes: {
          byHospital: [{
            hospitalId: 1,
            resources: [
              { resourceType: 'beds', total: 100, available: 45 },
              { resourceType: 'icu', total: 20, available: 8 }
            ]
          }]
        }
      };

      act(() => {
        resourceUpdateHandler(mockPollingData, 'test-session');
      });

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            resources: expect.objectContaining({
              beds: { total: 100, available: 45 },
              icu: { total: 20, available: 8 }
            })
          })
        );
      });
    });

    it('should pause and resume polling when toggled', async () => {
      const mockSessionControl = {
        stop: jest.fn(),
        updateParams: jest.fn(),
        getStatus: jest.fn(() => ({ exists: true, interval: 15000, retryCount: 0 }))
      };

      mockPollingClient.pollResources.mockReturnValue(mockSessionControl);
      mockPollingClient.pollDashboard.mockReturnValue(mockSessionControl);

      render(
        <ResourceManagementDashboard 
          hospital={mockHospital} 
          onUpdate={mockOnUpdate} 
        />
      );

      // Find and click the pause button
      const pauseButton = await screen.findByText('Pause');
      await userEvent.click(pauseButton);

      await waitFor(() => {
        expect(mockSessionControl.stop).toHaveBeenCalledTimes(2); // Both sessions stopped
      });

      // Click resume button
      const resumeButton = await screen.findByText('Resume');
      await userEvent.click(resumeButton);

      await waitFor(() => {
        // Should start polling again
        expect(mockPollingClient.pollResources).toHaveBeenCalledTimes(2);
        expect(mockPollingClient.pollDashboard).toHaveBeenCalledTimes(2);
      });
    });

    it('should display polling status correctly', async () => {
      let connectHandler: Function;
      
      const mockSessionControl = {
        stop: jest.fn(),
        updateParams: jest.fn(),
        getStatus: jest.fn(() => ({ exists: true, interval: 15000, retryCount: 0 }))
      };

      mockPollingClient.setEventHandlers.mockImplementation((handlers) => {
        connectHandler = handlers.onConnect!;
      });
      mockPollingClient.pollResources.mockReturnValue(mockSessionControl);
      mockPollingClient.pollDashboard.mockReturnValue(mockSessionControl);

      render(
        <ResourceManagementDashboard 
          hospital={mockHospital} 
          onUpdate={mockOnUpdate} 
        />
      );

      // Initially should show "Connecting..."
      expect(screen.getByText('Connecting...')).toBeInTheDocument();

      // Simulate connection
      act(() => {
        connectHandler('test-session', '/test-endpoint');
      });

      await waitFor(() => {
        expect(screen.getByText('Live Updates')).toBeInTheDocument();
        expect(screen.getByText('(15s)')).toBeInTheDocument();
      });
    });

    it('should handle polling errors gracefully', async () => {
      let errorHandler: Function;
      
      const mockSessionControl = {
        stop: jest.fn(),
        updateParams: jest.fn(),
        getStatus: jest.fn(() => ({ exists: true, interval: 15000, retryCount: 2 }))
      };

      mockPollingClient.pollResources.mockImplementation((sessionId, hospitalId, options) => {
        errorHandler = options.onError!;
        return mockSessionControl;
      });
      mockPollingClient.pollDashboard.mockReturnValue(mockSessionControl);

      render(
        <ResourceManagementDashboard 
          hospital={mockHospital} 
          onUpdate={mockOnUpdate} 
        />
      );

      await waitFor(() => {
        expect(errorHandler).toBeDefined();
      });

      // Simulate polling error
      act(() => {
        errorHandler(new Error('Network error'), 'test-session', 2);
      });

      await waitFor(() => {
        expect(screen.getByText('Reconnecting (2)')).toBeInTheDocument();
      });

      // Simulate max retries exceeded
      act(() => {
        errorHandler(new Error('Network error'), 'test-session', 3);
      });

      await waitFor(() => {
        expect(screen.getByText(/Polling connection lost/)).toBeInTheDocument();
      });
    });
  });

  describe('BookingApprovalInterface Polling', () => {
    const mockHospitalId = 1;

    it('should initialize booking polling when component mounts', async () => {
      const mockSessionControl = {
        stop: jest.fn(),
        updateParams: jest.fn(),
        getStatus: jest.fn(() => ({ exists: true, interval: 20000, retryCount: 0 }))
      };

      mockPollingClient.pollBookings.mockReturnValue(mockSessionControl);

      // Mock the API call
      const { bookingAPI } = require('@/lib/api');
      bookingAPI.getPendingBookings.mockResolvedValue({
        data: {
          success: true,
          data: [],
          summary: { totalPending: 0, critical: 0, high: 0 }
        }
      });

      render(<BookingApprovalInterface hospitalId={mockHospitalId} />);

      await waitFor(() => {
        expect(mockPollingClient.setEventHandlers).toHaveBeenCalled();
        expect(mockPollingClient.pollBookings).toHaveBeenCalledWith(
          `booking-approval-${mockHospitalId}`,
          mockHospitalId,
          expect.objectContaining({
            interval: 20000,
            params: expect.objectContaining({
              statuses: 'pending'
            }),
            onUpdate: expect.any(Function),
            onError: expect.any(Function)
          })
        );
      });
    });

    it('should handle booking updates from polling', async () => {
      let bookingUpdateHandler: Function;
      
      const mockSessionControl = {
        stop: jest.fn(),
        updateParams: jest.fn(),
        getStatus: jest.fn(() => ({ exists: true, interval: 20000, retryCount: 0 }))
      };

      mockPollingClient.pollBookings.mockImplementation((sessionId, hospitalId, options) => {
        bookingUpdateHandler = options.onUpdate!;
        return mockSessionControl;
      });

      // Mock the API calls
      const { bookingAPI } = require('@/lib/api');
      bookingAPI.getPendingBookings.mockResolvedValue({
        data: {
          success: true,
          data: [],
          summary: { totalPending: 0, critical: 0, high: 0 }
        }
      });

      render(<BookingApprovalInterface hospitalId={mockHospitalId} />);

      await waitFor(() => {
        expect(bookingUpdateHandler).toBeDefined();
      });

      // Simulate polling update with new bookings
      const mockPollingData = {
        hasChanges: true,
        currentTimestamp: '2023-01-01T12:00:00.000Z',
        changes: {
          byHospital: [{
            hospitalId: mockHospitalId,
            bookings: [
              { id: 1, status: 'pending', patientName: 'John Doe' }
            ]
          }]
        }
      };

      // Mock the refreshed API call
      bookingAPI.getPendingBookings.mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ id: 1, status: 'pending', patientName: 'John Doe' }],
          summary: { totalPending: 1, critical: 0, high: 1 }
        }
      });

      act(() => {
        bookingUpdateHandler(mockPollingData, 'test-session');
      });

      await waitFor(() => {
        // Should trigger a refresh of the booking list
        expect(bookingAPI.getPendingBookings).toHaveBeenCalledTimes(2);
      });
    });

    it('should display booking polling status', async () => {
      let connectHandler: Function;
      
      const mockSessionControl = {
        stop: jest.fn(),
        updateParams: jest.fn(),
        getStatus: jest.fn(() => ({ exists: true, interval: 20000, retryCount: 0 }))
      };

      mockPollingClient.setEventHandlers.mockImplementation((handlers) => {
        connectHandler = handlers.onConnect!;
      });
      mockPollingClient.pollBookings.mockReturnValue(mockSessionControl);

      // Mock the API call
      const { bookingAPI } = require('@/lib/api');
      bookingAPI.getPendingBookings.mockResolvedValue({
        data: {
          success: true,
          data: [],
          summary: { totalPending: 0, critical: 0, high: 0 }
        }
      });

      render(<BookingApprovalInterface hospitalId={mockHospitalId} />);

      // Initially should show "Connecting..."
      await waitFor(() => {
        expect(screen.getByText('Connecting...')).toBeInTheDocument();
      });

      // Simulate connection
      act(() => {
        connectHandler('test-session', '/test-endpoint');
      });

      await waitFor(() => {
        expect(screen.getByText('Live Updates')).toBeInTheDocument();
        expect(screen.getByText('(20s)')).toBeInTheDocument();
      });
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should cleanup polling sessions when components unmount', async () => {
      const mockSessionControl = {
        stop: jest.fn(),
        updateParams: jest.fn(),
        getStatus: jest.fn(() => ({ exists: true, interval: 15000, retryCount: 0 }))
      };

      mockPollingClient.pollResources.mockReturnValue(mockSessionControl);
      mockPollingClient.pollDashboard.mockReturnValue(mockSessionControl);

      const mockHospital = {
        id: 1,
        name: 'Test Hospital',
        resources: {
          beds: { total: 100, available: 50 },
          icu: { total: 20, available: 10 },
          operationTheatres: { total: 5, available: 3 }
        }
      };

      const { unmount } = render(
        <ResourceManagementDashboard 
          hospital={mockHospital} 
          onUpdate={jest.fn()} 
        />
      );

      await waitFor(() => {
        expect(mockPollingClient.pollResources).toHaveBeenCalled();
        expect(mockPollingClient.pollDashboard).toHaveBeenCalled();
      });

      // Unmount component
      unmount();

      await waitFor(() => {
        expect(mockSessionControl.stop).toHaveBeenCalledTimes(2); // Both sessions stopped
      });
    });

    it('should handle rapid component re-renders without creating duplicate sessions', async () => {
      const mockSessionControl = {
        stop: jest.fn(),
        updateParams: jest.fn(),
        getStatus: jest.fn(() => ({ exists: true, interval: 15000, retryCount: 0 }))
      };

      mockPollingClient.pollResources.mockReturnValue(mockSessionControl);
      mockPollingClient.pollDashboard.mockReturnValue(mockSessionControl);

      const mockHospital = {
        id: 1,
        name: 'Test Hospital',
        resources: {
          beds: { total: 100, available: 50 },
          icu: { total: 20, available: 10 },
          operationTheatres: { total: 5, available: 3 }
        }
      };

      const { rerender } = render(
        <ResourceManagementDashboard 
          hospital={mockHospital} 
          onUpdate={jest.fn()} 
        />
      );

      await waitFor(() => {
        expect(mockPollingClient.pollResources).toHaveBeenCalledTimes(1);
        expect(mockPollingClient.pollDashboard).toHaveBeenCalledTimes(1);
      });

      // Re-render with same props
      rerender(
        <ResourceManagementDashboard 
          hospital={mockHospital} 
          onUpdate={jest.fn()} 
        />
      );

      // Should not create new sessions
      expect(mockPollingClient.pollResources).toHaveBeenCalledTimes(1);
      expect(mockPollingClient.pollDashboard).toHaveBeenCalledTimes(1);
    });
  });
});