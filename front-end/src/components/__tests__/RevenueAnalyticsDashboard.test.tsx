import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RevenueAnalyticsDashboard from '../RevenueAnalyticsDashboard';
import { revenueAPI, paymentAPI } from '@/lib/api';

// Mock the API modules
jest.mock('@/lib/api', () => ({
  revenueAPI: {
    getHospitalRevenue: jest.fn(),
    getAdminRevenue: jest.fn(),
    getHospitalBalance: jest.fn(),
    getAdminBalance: jest.fn(),
  },
  paymentAPI: {
    getPaymentHistory: jest.fn(),
  },
}));

// Mock recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  Line: () => <div data-testid="line" />,
  Pie: () => <div data-testid="pie" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  Cell: () => <div data-testid="cell" />,
}));

const mockRevenueData = {
  totalRevenue: {
    totalTransactions: 50,
    totalRevenue: 25000,
    totalServiceCharge: 1250,
    totalHospitalRevenue: 23750,
    averageTransactionAmount: 500,
  },
  dailyAnalytics: [
    {
      date: '2024-01-01',
      transactionCount: 5,
      totalAmount: 2500,
      totalServiceCharge: 125,
      totalHospitalAmount: 2375,
      averageAmount: 500,
    },
  ],
  resourceBreakdown: [
    {
      resourceType: 'beds',
      transactionCount: 20,
      totalRevenue: 10000,
      averageRevenue: 500,
      totalBookingAmount: 10500,
    },
  ],
  currentBalance: null,
  dateRange: {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
  },
};

const mockBalance = {
  id: 1,
  userId: 1,
  userType: 'hospital-authority' as const,
  hospitalId: 1,
  currentBalance: 5000,
  totalEarnings: 25000,
  totalWithdrawals: 20000,
  pendingAmount: 500,
  lastTransactionAt: '2024-01-31T10:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-31T10:00:00Z',
};

const mockTransactions = [
  {
    id: 1,
    bookingId: 1,
    userId: 1,
    hospitalId: 1,
    amount: 500,
    serviceCharge: 25,
    hospitalAmount: 475,
    paymentMethod: 'credit_card',
    transactionId: 'TXN001',
    status: 'completed' as const,
    processedAt: '2024-01-01T10:00:00Z',
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
    patientName: 'John Doe',
    resourceType: 'beds',
    scheduledDate: '2024-01-02',
    hospitalName: 'Test Hospital',
    userName: 'John Doe',
    userEmail: 'john@example.com',
  },
];

const mockBalanceHistory = [
  {
    id: 1,
    balanceId: 1,
    transactionId: 1,
    transactionType: 'payment_received' as const,
    amount: 475,
    balanceBefore: 4525,
    balanceAfter: 5000,
    description: 'Payment received from booking transaction 1',
    referenceId: 'TXN001',
    processedBy: 1,
    createdAt: '2024-01-01T10:00:00Z',
  },
];

describe('RevenueAnalyticsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    beforeEach(() => {
      (revenueAPI.getHospitalRevenue as jest.Mock).mockResolvedValue({
        data: { data: mockRevenueData }
      });
      (revenueAPI.getHospitalBalance as jest.Mock).mockResolvedValue({
        data: { 
          data: { 
            balance: mockBalance, 
            history: mockBalanceHistory 
          } 
        }
      });
      (paymentAPI.getPaymentHistory as jest.Mock).mockResolvedValue({
        data: { data: mockTransactions }
      });
    });

    it('shows loading state initially', () => {
      render(
        <RevenueAnalyticsDashboard 
          hospitalId={1} 
          userType="hospital-authority" 
        />
      );

      expect(screen.getByText('Loading revenue analytics...')).toBeInTheDocument();
    });

    it('renders main title after loading', async () => {
      render(
        <RevenueAnalyticsDashboard 
          hospitalId={1} 
          userType="hospital-authority" 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Revenue Analytics')).toBeInTheDocument();
      });
    });

    it('shows hospital-specific description for hospital authority', async () => {
      render(
        <RevenueAnalyticsDashboard 
          hospitalId={1} 
          userType="hospital-authority" 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Track your hospital\'s earnings and financial performance')).toBeInTheDocument();
      });
    });

    it('shows admin description for admin user', async () => {
      (revenueAPI.getAdminRevenue as jest.Mock).mockResolvedValue({
        data: { data: mockRevenueData }
      });
      (revenueAPI.getAdminBalance as jest.Mock).mockResolvedValue({
        data: { 
          data: { 
            balances: [mockBalance], 
            history: mockBalanceHistory 
          } 
        }
      });

      render(
        <RevenueAnalyticsDashboard 
          userType="admin" 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Monitor platform-wide revenue and service charges')).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    beforeEach(() => {
      (revenueAPI.getHospitalRevenue as jest.Mock).mockResolvedValue({
        data: { data: mockRevenueData }
      });
      (revenueAPI.getHospitalBalance as jest.Mock).mockResolvedValue({
        data: { 
          data: { 
            balance: mockBalance, 
            history: mockBalanceHistory 
          } 
        }
      });
      (paymentAPI.getPaymentHistory as jest.Mock).mockResolvedValue({
        data: { data: mockTransactions }
      });
    });

    it('calls hospital revenue API for hospital authority', async () => {
      render(
        <RevenueAnalyticsDashboard 
          hospitalId={1} 
          userType="hospital-authority" 
        />
      );

      await waitFor(() => {
        expect(revenueAPI.getHospitalRevenue).toHaveBeenCalledWith(1, expect.any(Object));
        expect(revenueAPI.getHospitalBalance).toHaveBeenCalledWith(1);
      });
    });

    it('calls admin revenue API for admin user', async () => {
      (revenueAPI.getAdminRevenue as jest.Mock).mockResolvedValue({
        data: { data: mockRevenueData }
      });
      (revenueAPI.getAdminBalance as jest.Mock).mockResolvedValue({
        data: { 
          data: { 
            balances: [mockBalance], 
            history: mockBalanceHistory 
          } 
        }
      });

      render(
        <RevenueAnalyticsDashboard 
          userType="admin" 
        />
      );

      await waitFor(() => {
        expect(revenueAPI.getAdminRevenue).toHaveBeenCalled();
        expect(revenueAPI.getAdminBalance).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API call fails', async () => {
      (revenueAPI.getHospitalRevenue as jest.Mock).mockRejectedValue({
        response: { data: { error: 'Failed to fetch revenue data' } }
      });

      render(
        <RevenueAnalyticsDashboard 
          hospitalId={1} 
          userType="hospital-authority" 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch revenue data')).toBeInTheDocument();
      });
    });

    it('displays generic error message when no specific error is provided', async () => {
      (revenueAPI.getHospitalRevenue as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(
        <RevenueAnalyticsDashboard 
          hospitalId={1} 
          userType="hospital-authority" 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch revenue data')).toBeInTheDocument();
      });
    });

    it('displays no data message when revenue data is null', async () => {
      (revenueAPI.getHospitalRevenue as jest.Mock).mockResolvedValue({
        data: { data: null }
      });

      render(
        <RevenueAnalyticsDashboard 
          hospitalId={1} 
          userType="hospital-authority" 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No revenue data available')).toBeInTheDocument();
      });
    });
  });

  describe('Data Display', () => {
    beforeEach(() => {
      (revenueAPI.getHospitalRevenue as jest.Mock).mockResolvedValue({
        data: { data: mockRevenueData }
      });
      (revenueAPI.getHospitalBalance as jest.Mock).mockResolvedValue({
        data: { 
          data: { 
            balance: mockBalance, 
            history: mockBalanceHistory 
          } 
        }
      });
      (paymentAPI.getPaymentHistory as jest.Mock).mockResolvedValue({
        data: { data: mockTransactions }
      });
    });

    it('displays key revenue metrics', async () => {
      render(
        <RevenueAnalyticsDashboard 
          hospitalId={1} 
          userType="hospital-authority" 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Total Revenue')).toBeInTheDocument();
        expect(screen.getByText('Current Balance')).toBeInTheDocument();
        expect(screen.getByText('Average Transaction')).toBeInTheDocument();
        expect(screen.getByText('Total Earnings')).toBeInTheDocument();
      });
    });

    it('displays resource breakdown section', async () => {
      render(
        <RevenueAnalyticsDashboard 
          hospitalId={1} 
          userType="hospital-authority" 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Revenue by Resource Type')).toBeInTheDocument();
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });
    });

    it('displays tab navigation', async () => {
      render(
        <RevenueAnalyticsDashboard 
          hospitalId={1} 
          userType="hospital-authority" 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('Revenue Charts')).toBeInTheDocument();
        expect(screen.getByText('Transaction History')).toBeInTheDocument();
        expect(screen.getByText('Balance Details')).toBeInTheDocument();
      });
    });
  });
});