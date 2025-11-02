import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useSearchParams } from 'next/navigation';
import PaymentPage from '@/app/booking/payment/page';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

// Mock API calls
jest.mock('@/lib/api', () => ({
  bookingAPI: {
    getById: jest.fn(),
    processPayment: jest.fn(),
  },
  authAPI: {
    getProfile: jest.fn(),
  },
}));

// Mock auth
jest.mock('@/lib/auth', () => ({
  getCurrentUser: jest.fn(() => ({ balance: 10000 })),
}));

// Mock components
jest.mock('@/components/Navigation', () => {
  return function MockNavigation() {
    return <div data-testid="navigation">Navigation</div>;
  };
});

jest.mock('@/components/ProtectedRoute', () => {
  return function MockProtectedRoute({ children }: { children: React.ReactNode }) {
    return <div data-testid="protected-route">{children}</div>;
  };
});

describe('Rapid Assistance Validation', () => {
  const mockSearchParams = useSearchParams as jest.Mock;

  beforeEach(() => {
    mockSearchParams.mockReturnValue({
      get: jest.fn(() => null),
    });

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should show rapid assistance option for senior citizens (60+)', () => {
    const seniorCitizenBooking = {
      id: 1,
      patientName: 'John Senior',
      hospitalName: 'Test Hospital',
      resourceType: 'bed',
      estimatedDuration: 24,
      scheduledDate: '2024-01-01',
      urgency: 'medium',
      paymentAmount: 1000,
      age: 65,
    };

    (window.localStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key === 'pendingBookingData') {
        return JSON.stringify(seniorCitizenBooking);
      }
      return null;
    });

    render(<PaymentPage />);

    expect(screen.getByText('Add-ons')).toBeInTheDocument();
    expect(screen.getByText('Rapid Assistance Service')).toBeInTheDocument();
    expect(screen.getByText('Senior Citizen Only')).toBeInTheDocument();
  });

  test('should not show rapid assistance option for patients under 60', () => {
    const youngPatientBooking = {
      id: 1,
      patientName: 'Jane Young',
      hospitalName: 'Test Hospital',
      resourceType: 'bed',
      estimatedDuration: 24,
      scheduledDate: '2024-01-01',
      urgency: 'medium',
      paymentAmount: 1000,
      age: 45,
    };

    (window.localStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key === 'pendingBookingData') {
        return JSON.stringify(youngPatientBooking);
      }
      return null;
    });

    render(<PaymentPage />);

    expect(screen.getByText('Add-ons')).toBeInTheDocument();
    expect(screen.getByText('Not Available')).toBeInTheDocument();
    expect(screen.getByText('Current patient age: 45 years (Minimum required: 60 years)')).toBeInTheDocument();
  });

  test('should show age verification required when age is missing', () => {
    const noAgeBooking = {
      id: 1,
      patientName: 'No Age Patient',
      hospitalName: 'Test Hospital',
      resourceType: 'bed',
      estimatedDuration: 24,
      scheduledDate: '2024-01-01',
      urgency: 'medium',
      paymentAmount: 1000,
      age: null,
    };

    (window.localStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key === 'pendingBookingData') {
        return JSON.stringify(noAgeBooking);
      }
      return null;
    });

    render(<PaymentPage />);

    expect(screen.getByText('Age Verification Required')).toBeInTheDocument();
    expect(screen.getByText('Patient age information is required to determine service eligibility.')).toBeInTheDocument();
  });

  test('should prevent rapid assistance selection for ineligible patients', async () => {
    const youngPatientBooking = {
      id: 1,
      patientName: 'Jane Young',
      hospitalName: 'Test Hospital',
      resourceType: 'bed',
      estimatedDuration: 24,
      scheduledDate: '2024-01-01',
      urgency: 'medium',
      paymentAmount: 1000,
      age: 45,
    };

    (window.localStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key === 'pendingBookingData') {
        return JSON.stringify(youngPatientBooking);
      }
      return null;
    });

    render(<PaymentPage />);

    // The rapid assistance switch should not be available for young patients
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByText('Not Available')).toBeInTheDocument();
  });

  test('should validate age boundary condition (exactly 60 years)', () => {
    const boundaryAgeBooking = {
      id: 1,
      patientName: 'Boundary Patient',
      hospitalName: 'Test Hospital',
      resourceType: 'bed',
      estimatedDuration: 24,
      scheduledDate: '2024-01-01',
      urgency: 'medium',
      paymentAmount: 1000,
      age: 60,
    };

    (window.localStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key === 'pendingBookingData') {
        return JSON.stringify(boundaryAgeBooking);
      }
      return null;
    });

    render(<PaymentPage />);

    // Should show rapid assistance for exactly 60 years old
    expect(screen.getByText('Rapid Assistance Service')).toBeInTheDocument();
    expect(screen.getByText('Senior Citizen Only')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  test('should handle invalid age values', () => {
    const invalidAgeBooking = {
      id: 1,
      patientName: 'Invalid Age Patient',
      hospitalName: 'Test Hospital',
      resourceType: 'bed',
      estimatedDuration: 24,
      scheduledDate: '2024-01-01',
      urgency: 'medium',
      paymentAmount: 1000,
      age: -5, // Invalid age
    };

    (window.localStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key === 'pendingBookingData') {
        return JSON.stringify(invalidAgeBooking);
      }
      return null;
    });

    render(<PaymentPage />);

    // For invalid ages, the component shows "Not Available" rather than "Age Verification Required"
    expect(screen.getByText('Not Available')).toBeInTheDocument();
    expect(screen.getByText('Current patient age: -5 years (Minimum required: 60 years)')).toBeInTheDocument();
  });
});