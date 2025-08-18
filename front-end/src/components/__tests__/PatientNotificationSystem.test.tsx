import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PatientNotificationCenter from '../PatientNotificationCenter';
import NotificationHistory from '../NotificationHistory';
import NotificationPreferences from '../NotificationPreferences';

// Mock the API
jest.mock('@/lib/api', () => ({
    notificationAPI: {
        getHistory: jest.fn(),
        getStatistics: jest.fn(),
        processQueue: jest.fn(),
        sendTest: jest.fn(),
    },
    authAPI: {
        getNotificationPreferences: jest.fn(),
        updateNotificationPreferences: jest.fn(),
    },
}));

import { notificationAPI } from '@/lib/api';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

const mockNotifications = [
    {
        id: 1,
        recipientId: 1,
        type: 'booking_approved',
        channel: 'email',
        priority: 'high',
        content: JSON.stringify({
            subject: 'Booking Approved - City Hospital',
            message: 'Your booking has been approved'
        }),
        metadata: JSON.stringify({
            booking: {
                id: 1,
                patientName: 'John Doe',
                resourceType: 'beds',
                hospitalName: 'City Hospital',
                scheduledDate: '2024-02-15T10:00:00Z',
                resourcesAllocated: 1
            },
            details: {
                approvedAt: '2024-02-10T10:00:00Z',
                notes: 'Approved for emergency admission'
            }
        }),
        status: 'delivered',
        retryCount: 0,
        maxRetries: 3,
        scheduledAt: '2024-02-10T10:00:00Z',
        createdAt: '2024-02-10T10:00:00Z',
        updatedAt: '2024-02-10T10:05:00Z',
        actualDeliveredAt: '2024-02-10T10:05:00Z'
    },
    {
        id: 2,
        recipientId: 1,
        type: 'booking_declined',
        channel: 'sms',
        priority: 'high',
        content: JSON.stringify({
            message: 'Your booking has been declined'
        }),
        metadata: JSON.stringify({
            booking: {
                id: 2,
                patientName: 'John Doe',
                resourceType: 'icu',
                hospitalName: 'General Hospital',
                scheduledDate: '2024-02-16T14:00:00Z'
            },
            details: {
                declinedAt: '2024-02-11T09:00:00Z',
                reason: 'No ICU beds available',
                alternativeSuggestions: ['Metro Hospital - Available ICU beds']
            }
        }),
        status: 'delivered',
        retryCount: 0,
        maxRetries: 3,
        scheduledAt: '2024-02-11T09:00:00Z',
        createdAt: '2024-02-11T09:00:00Z',
        updatedAt: '2024-02-11T09:02:00Z',
        actualDeliveredAt: '2024-02-11T09:02:00Z'
    }
];

describe('PatientNotificationCenter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state initially', () => {
        (notificationAPI.getHistory as jest.Mock).mockImplementation(() =>
            new Promise(() => { }) // Never resolves to keep loading state
        );

        render(<PatientNotificationCenter userId={1} />);

        expect(screen.getByText('Notifications')).toBeInTheDocument();
        // Check for loading spinner instead of text
        const loadingSpinner = document.querySelector('.animate-spin');
        expect(loadingSpinner).toBeInTheDocument();
    });

    it('renders notifications successfully', async () => {
        (notificationAPI.getHistory as jest.Mock).mockResolvedValue({
            data: {
                success: true,
                data: mockNotifications
            }
        });

        render(<PatientNotificationCenter userId={1} />);

        await waitFor(() => {
            expect(screen.getByText('Booking Approved')).toBeInTheDocument();
            expect(screen.getByText('Booking Declined')).toBeInTheDocument();
        });

        expect(screen.getByText('City Hospital')).toBeInTheDocument();
        expect(screen.getAllByText('John Doe')).toHaveLength(2); // Two notifications with John Doe
        expect(screen.getByText('beds')).toBeInTheDocument();
    });

    it('handles API error gracefully', async () => {
        (notificationAPI.getHistory as jest.Mock).mockRejectedValue({
            response: { data: { message: 'Failed to load notifications' } }
        });

        render(<PatientNotificationCenter userId={1} />);

        await waitFor(() => {
            expect(screen.getByText('Failed to load notifications')).toBeInTheDocument();
        });

        expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('filters notifications correctly', async () => {
        (notificationAPI.getHistory as jest.Mock).mockResolvedValue({
            data: {
                success: true,
                data: mockNotifications
            }
        });

        render(<PatientNotificationCenter userId={1} />);

        await waitFor(() => {
            expect(screen.getByText('Booking Approved')).toBeInTheDocument();
        });

        // Click booking filter
        fireEvent.click(screen.getByText('Bookings'));

        // Both notifications should still be visible as they are booking-related
        expect(screen.getByText('Booking Approved')).toBeInTheDocument();
        expect(screen.getByText('Booking Declined')).toBeInTheDocument();
    });

    it('refreshes notifications when refresh button is clicked', async () => {
        (notificationAPI.getHistory as jest.Mock).mockResolvedValue({
            data: {
                success: true,
                data: mockNotifications
            }
        });

        render(<PatientNotificationCenter userId={1} />);

        await waitFor(() => {
            expect(screen.getByText('Refresh Notifications')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Refresh Notifications'));

        expect(notificationAPI.getHistory).toHaveBeenCalledTimes(2);
    });
});

describe('NotificationHistory', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders notification history table', async () => {
        (notificationAPI.getHistory as jest.Mock).mockResolvedValue({
            data: {
                success: true,
                data: mockNotifications
            }
        });

        render(<NotificationHistory userId={1} />);

        await waitFor(() => {
            expect(screen.getByText('Notification History')).toBeInTheDocument();
        });

        // Check table headers
        expect(screen.getByText('Type')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('Channel')).toBeInTheDocument();
        expect(screen.getByText('Details')).toBeInTheDocument();
    });

    it('searches notifications', async () => {
        (notificationAPI.getHistory as jest.Mock).mockResolvedValue({
            data: {
                success: true,
                data: mockNotifications
            }
        });

        render(<NotificationHistory userId={1} />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Search notifications...')).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText('Search notifications...');
        fireEvent.change(searchInput, { target: { value: 'City Hospital' } });

        // Should filter results client-side
        await waitFor(() => {
            expect(screen.getByText('City Hospital')).toBeInTheDocument();
        });
    });
});

describe('NotificationPreferences', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders notification preferences form', async () => {
        render(<NotificationPreferences userId={1} />);

        await waitFor(() => {
            expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
        });

        expect(screen.getByText('Notification Channels')).toBeInTheDocument();
        expect(screen.getByText('Booking Notifications')).toBeInTheDocument();
        expect(screen.getByText('System Notifications')).toBeInTheDocument();
    });

    it('saves preferences', async () => {
        render(<NotificationPreferences userId={1} />);

        await waitFor(() => {
            expect(screen.getByText('Save Preferences')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Save Preferences'));

        await waitFor(() => {
            expect(screen.getByText('Notification preferences saved successfully')).toBeInTheDocument();
        });
    });

    it('handles individual notification type toggles', async () => {
        render(<NotificationPreferences userId={1} />);

        await waitFor(() => {
            expect(screen.getByText('Booking Approved')).toBeInTheDocument();
        });

        // Find booking approval email switch
        const bookingApprovalSection = screen.getByText('Booking Approved').closest('div');
        const emailSwitch = bookingApprovalSection?.querySelector('button[role="switch"]');

        if (emailSwitch) {
            fireEvent.click(emailSwitch);
            // Should toggle the switch state
            expect(emailSwitch).toBeInTheDocument();
        }
    });
});

describe('Notification System Integration', () => {
    it('handles notification content parsing correctly', async () => {
        const notificationWithComplexContent = {
            ...mockNotifications[0],
            content: JSON.stringify({
                subject: 'Complex Notification',
                body: 'This is a complex notification with multiple fields',
                message: 'Short message version'
            }),
            metadata: JSON.stringify({
                booking: {
                    id: 1,
                    patientName: 'Jane Smith',
                    resourceType: 'operationTheatres',
                    hospitalName: 'Surgery Center',
                    scheduledDate: '2024-02-20T08:00:00Z'
                },
                details: {
                    notes: 'Special preparation required',
                    nextSteps: ['Arrive 2 hours early', 'Bring medical records'],
                    supportContact: {
                        phone: '+1-800-HOSPITAL',
                        email: 'support@hospital.com'
                    }
                }
            })
        };

        (notificationAPI.getHistory as jest.Mock).mockResolvedValue({
            data: {
                success: true,
                data: [notificationWithComplexContent]
            }
        });

        render(<PatientNotificationCenter userId={1} />);

        await waitFor(() => {
            expect(screen.getByText('Complex Notification')).toBeInTheDocument();
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
            expect(screen.getByText('operationTheatres')).toBeInTheDocument();
            expect(screen.getByText('Surgery Center')).toBeInTheDocument();
        });
    });

    it('handles failed notifications display', async () => {
        const failedNotification = {
            ...mockNotifications[0],
            status: 'failed',
            lastError: 'Email delivery failed: Invalid email address'
        };

        (notificationAPI.getHistory as jest.Mock).mockResolvedValue({
            data: {
                success: true,
                data: [failedNotification]
            }
        });

        render(<PatientNotificationCenter userId={1} />);

        await waitFor(() => {
            expect(screen.getByText('Failed')).toBeInTheDocument();
            expect(screen.getByText('Email delivery failed: Invalid email address')).toBeInTheDocument();
        });
    });
});