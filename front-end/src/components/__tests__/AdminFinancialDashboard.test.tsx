import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminFinancialDashboard from '../AdminFinancialDashboard';
import { revenueAPI } from '@/lib/api';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the API modules
jest.mock('@/lib/api', () => ({
  revenueAPI: {
    getRevenueAnalytics: jest.fn(),
    getServiceCharges: jest.fn(),
    getAuditTrail: jest.fn(),
    getReconciliationReport: jest.fn(),
    getHospitalDistribution: jest.fn(),
  },
  paymentAPI: {
    getPaymentHistory: jest.fn(),
  },
  adminAPI: {
    getStats: jest.fn(),
  },
}));

// Mock recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  Line: () => <div data-testid="line" />,
  Pie: () => <div data-testid="pie" />,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  Cell: () => <div data-testid="cell" />,
}));

const mockPlatformFinancials = {
  totalRevenue: 150000,
  totalServiceCharges: 7500,
  totalHospitalEarnings: 142500,
  totalTransactions: 500,
  averageTransactionAmount: 300,
  serviceChargeRate: 0.05,
  revenueGrowth: 12.5,
  transactionGrowth: 8.3,
};

const mockServiceChargeAnalytics = {
  totalServiceCharges: 7500,
  earningsByHospital: [
    {
      hospitalId: 1,
      hospitalName: 'General Hospital',
      totalServiceCharges: 3000,
      transactionCount: 100,
      averageServiceCharge: 30,
    },
  ],
  earningsByTimePeriod: [
    {
      date: '2024-01-01',
      serviceCharges: 1000,
      transactionCount: 30,
    },
  ],
  topPerformingHospitals: [
    {
      hospitalId: 1,
      hospitalName: 'General Hospital',
      totalRevenue: 60000,
      serviceCharges: 3000,
      transactionCount: 100,
    },
  ],
};

const mockTransactionMonitoring = {
  totalTransactions: 500,
  successfulTransactions: 475,
  failedTransactions: 15,
  pendingTransactions: 8,
  refundedTransactions: 2,
  anomalies: [
    {
      id: 1,
      type: 'high_amount' as const,
      severity: 'high' as const,
      description: 'Transaction amount significantly higher than average',
      transactionId: 'TXN-001',
      hospitalId: 1,
      detectedAt: '2024-01-15T10:30:00Z',
      status: 'new' as const,
    },
  ],
  recentTransactions: [
    {
      id: 1,
      transactionId: 'TXN-001',
      amount: 500,
      serviceCharge: 25,
      hospitalAmount: 475,
      hospitalName: 'General Hospital',
      patientName: 'John Doe',
      status: 'completed',
      createdAt: '2024-01-15T09:00:00Z',
      isAnomaly: true,
    },
  ],
};

const mockReconciliationData = {
  lastReconciliationDate: '2024-01-14T23:59:59Z',
  totalDiscrepancies: 3,
  resolvedDiscrepancies: 1,
  pendingDiscrepancies: 2,
  balanceVerification: {
    totalCalculatedBalance: 50000,
    totalActualBalance: 49950,
    difference: 50,
    isBalanced: false,
  },
  discrepancies: [
    {
      id: 1,
      type: 'balance_mismatch' as const,
      description: 'Hospital balance does not match calculated amount',
      amount: 50,
      hospitalId: 1,
      hospitalName: 'General Hospital',
      transactionId: 'TXN-003',
      detectedAt: '2024-01-15T08:00:00Z',
      status: 'pending' as const,
    },
  ],
};

const mockHospitalDistribution = {
  totalHospitals: 10,
  activeHospitals: 8,
  hospitalBreakdown: [
    {
      hospitalId: 1,
      hospitalName: 'General Hospital',
      totalRevenue: 60000,
      serviceChargesGenerated: 3000,
      transactionCount: 100,
      averageTransactionAmount: 600,
      revenuePercentage: 40,
      lastTransactionDate: '2024-01-15T12:00:00Z',
      status: 'active' as const,
    },
  ],
  revenueDistribution: [
    {
      hospitalId: 1,
      hospitalName: 'General Hospital',
      revenue: 60000,
      percentage: 40,
    },
  ],
};

describe('AdminFinancialDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup successful API responses
    (revenueAPI.getRevenueAnalytics as jest.Mock).mockResolvedValue({
      data: { success: true, data: mockPlatformFinancials }
    });
    (revenueAPI.getServiceCharges as jest.Mock).mockResolvedValue({
      data: { success: true, data: mockServiceChargeAnalytics }
    });
    (revenueAPI.getAuditTrail as jest.Mock).mockResolvedValue({
      data: { success: true, data: mockTransactionMonitoring }
    });
    (revenueAPI.getReconciliationReport as jest.Mock).mockResolvedValue({
      data: { success: true, data: mockReconciliationData }
    });
    (revenueAPI.getHospitalDistribution as jest.Mock).mockResolvedValue({
      data: { success: true, data: mockHospitalDistribution }
    });
  });

  it('renders the dashboard header correctly', async () => {
    render(<AdminFinancialDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Admin Financial Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Monitor platform-wide revenue, service charges, and financial integrity')).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('displays loading state initially', () => {
    render(<AdminFinancialDashboard />);
    expect(screen.getByText('Loading admin financial dashboard...')).toBeInTheDocument();
  });

  it('displays platform financial metrics after loading', async () => {
    render(<AdminFinancialDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('$150,000.00')).toBeInTheDocument(); // Total Platform Revenue
      expect(screen.getByText('$7,500.00')).toBeInTheDocument(); // Service Charges Earned
      expect(screen.getByText('500')).toBeInTheDocument(); // Total Transactions
      expect(screen.getByText('8')).toBeInTheDocument(); // Active Hospitals
    }, { timeout: 10000 });
  });

  it('renders all dashboard tabs', async () => {
    render(<AdminFinancialDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Service Charges')).toBeInTheDocument();
      expect(screen.getByText('Transaction Monitoring')).toBeInTheDocument();
      expect(screen.getByText('Reconciliation')).toBeInTheDocument();
      expect(screen.getByText('Hospital Distribution')).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('displays revenue growth indicators', async () => {
    render(<AdminFinancialDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('+12.5%')).toBeInTheDocument();
      expect(screen.getByText('+8.3%')).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('handles API errors gracefully', async () => {
    (revenueAPI.getRevenueAnalytics as jest.Mock).mockRejectedValue(
      new Error('API Error')
    );
    
    render(<AdminFinancialDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch financial data')).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('handles refresh functionality', async () => {
    render(<AdminFinancialDashboard />);
    
    await waitFor(() => {
      const refreshButton = screen.getByText('Refresh');
      expect(refreshButton).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('handles export functionality', async () => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
    
    // Mock document.createElement and click
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    
    render(<AdminFinancialDashboard />);
    
    await waitFor(() => {
      const exportButton = screen.getByText('Export Report');
      fireEvent.click(exportButton);
      
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    }, { timeout: 10000 });
    
    // Cleanup
    createElementSpy.mockRestore();
  });

  it('displays charts correctly', async () => {
    render(<AdminFinancialDashboard />);
    
    await waitFor(() => {
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('formats currency correctly', async () => {
    render(<AdminFinancialDashboard />);
    
    await waitFor(() => {
      // Check that currency values are formatted with $ and commas
      expect(screen.getByText('$150,000.00')).toBeInTheDocument();
      expect(screen.getByText('$7,500.00')).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('calls all required APIs on mount', async () => {
    render(<AdminFinancialDashboard />);
    
    await waitFor(() => {
      expect(revenueAPI.getRevenueAnalytics).toHaveBeenCalled();
      expect(revenueAPI.getServiceCharges).toHaveBeenCalled();
      expect(revenueAPI.getAuditTrail).toHaveBeenCalled();
      expect(revenueAPI.getReconciliationReport).toHaveBeenCalled();
      expect(revenueAPI.getHospitalDistribution).toHaveBeenCalled();
    }, { timeout: 10000 });
  });

  it('displays filter controls', async () => {
    render(<AdminFinancialDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByText('Time Period')).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('displays top performing hospitals', async () => {
    render(<AdminFinancialDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Top Performing Hospitals')).toBeInTheDocument();
      expect(screen.getByText('General Hospital')).toBeInTheDocument();
    }, { timeout: 10000 });
  });
});