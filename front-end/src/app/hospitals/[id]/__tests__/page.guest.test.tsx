import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import HospitalDetailPage from '../page';
import { hospitalAPI } from '@/lib/api';
import { getCurrentUser, isAuthenticated } from '@/lib/auth';

// Mock the dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  hospitalAPI: {
    getHospitalResources: jest.fn(),
  },
}));

jest.mock('@/lib/auth', () => ({
  getCurrentUser: jest.fn(),
  isAuthenticated: jest.fn(),
}));

// Mock the Navigation component
jest.mock('@/components/Navigation', () => {
  return function MockNavigation() {
    return <div data-testid="navigation">Navigation</div>;
  };
});

const mockRouter = {
  push: jest.fn(),
};

const mockHospitalData = {
  data: {
    success: true,
    data: {
      hospital: {
        id: 1,
        name: 'Test Hospital',
        description: 'A test hospital',
        type: 'General',
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        phone: '123-456-7890',
        email: 'test@hospital.com',
        emergency: '911',
        rating: 4.5,
      },
      resources: [
        {
          resourceType: 'beds',
          total: 100,
          available: 25,
          occupied: 75,
          reserved: 0,
          maintenance: 0,
        },
        {
          resourceType: 'icu',
          total: 20,
          available: 5,
          occupied: 15,
          reserved: 0,
          maintenance: 0,
        },
      ],
      utilization: [
        {
          resourceType: 'beds',
          total: 100,
          available: 25,
          occupied: 75,
          utilizationPercentage: 75,
        },
      ],
    },
  },
};

describe('Hospital Detail Page - Guest Access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useParams as jest.Mock).mockReturnValue({ id: '1' });
    (hospitalAPI.getHospitalResources as jest.Mock).mockResolvedValue(mockHospitalData);
  });

  test('displays hospital information for guest users', async () => {
    // Mock guest user (not authenticated)
    (getCurrentUser as jest.Mock).mockReturnValue(null);
    (isAuthenticated as jest.Mock).mockReturnValue(false);

    render(<HospitalDetailPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Hospital')).toBeInTheDocument();
    });

    // Check that hospital information is displayed
    expect(screen.getByText('Test Hospital')).toBeInTheDocument();
    expect(screen.getByText('A test hospital')).toBeInTheDocument();
    expect(screen.getByText('General Hospital')).toBeInTheDocument();
    expect(screen.getByText('123 Test St, Test City, Test State 12345')).toBeInTheDocument();
  });

  test('shows guest mode banner for unauthenticated users', async () => {
    (getCurrentUser as jest.Mock).mockReturnValue(null);
    (isAuthenticated as jest.Mock).mockReturnValue(false);

    render(<HospitalDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Browsing as Guest')).toBeInTheDocument();
    });

    expect(screen.getByText(/You can view hospital information and availability/)).toBeInTheDocument();
    expect(screen.getByText('Sign in to book resources')).toBeInTheDocument();
  });

  test('displays resource availability for guests', async () => {
    (getCurrentUser as jest.Mock).mockReturnValue(null);
    (isAuthenticated as jest.Mock).mockReturnValue(false);

    render(<HospitalDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Resource Availability')).toBeInTheDocument();
    });

    // Check that resources are displayed (using getAllByText for multiple instances)
    expect(screen.getAllByText('Hospital Beds')[0]).toBeInTheDocument();
    expect(screen.getAllByText('ICU')[0]).toBeInTheDocument();
    
    // Check availability numbers
    expect(screen.getByText('25')).toBeInTheDocument(); // Available beds
    expect(screen.getByText('5')).toBeInTheDocument(); // Available ICU
  });

  test('shows login prompts on booking buttons for guests', async () => {
    (getCurrentUser as jest.Mock).mockReturnValue(null);
    (isAuthenticated as jest.Mock).mockReturnValue(false);

    render(<HospitalDetailPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Login to Book')[0]).toBeInTheDocument();
    });

    // Check that booking buttons show login prompts
    const loginButtons = screen.getAllByText('Login to Book');
    expect(loginButtons.length).toBeGreaterThan(0);
    
    // Check for guest-specific messaging (using getAllByText for multiple instances)
    const guestMessages = screen.getAllByText('Sign in required to book resources');
    expect(guestMessages.length).toBeGreaterThan(0);
  });

  test('redirects to login when guest tries to book', async () => {
    (getCurrentUser as jest.Mock).mockReturnValue(null);
    (isAuthenticated as jest.Mock).mockReturnValue(false);

    render(<HospitalDetailPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Login to Book')[0]).toBeInTheDocument();
    });

    // Click on a booking button
    const bookingButton = screen.getAllByText('Login to Book')[0];
    fireEvent.click(bookingButton);

    // Check that router.push was called with login URL
    expect(mockRouter.push).toHaveBeenCalledWith('/login?returnUrl=%2Fhospitals%2F1');
  });

  test('shows appropriate quick actions for guests', async () => {
    (getCurrentUser as jest.Mock).mockReturnValue(null);
    (isAuthenticated as jest.Mock).mockReturnValue(false);

    render(<HospitalDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });

    // Check for guest-specific quick actions
    expect(screen.getByText('Login to Book Resources')).toBeInTheDocument();
    expect(screen.getByText('Sign in to book medical resources and access your dashboard')).toBeInTheDocument();
    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByText("You'll return to this page after signing in")).toBeInTheDocument();
  });

  test('does not show guest banner for authenticated users', async () => {
    // Mock authenticated user
    (getCurrentUser as jest.Mock).mockReturnValue({
      id: 1,
      email: 'user@test.com',
      name: 'Test User',
      userType: 'user',
    });
    (isAuthenticated as jest.Mock).mockReturnValue(true);

    render(<HospitalDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Hospital')).toBeInTheDocument();
    });

    // Guest banner should not be present
    expect(screen.queryByText('Browsing as Guest')).not.toBeInTheDocument();
    
    // Should show regular booking buttons
    expect(screen.getByText('Book Resources')).toBeInTheDocument();
  });
});