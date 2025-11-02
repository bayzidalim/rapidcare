'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  DollarSign,
  TrendingUp, 
  TrendingDown, 
  Activity, 
  CreditCard,
  Download,
  RefreshCw,
  Calendar,
  Filter as FilterIcon,
  AlertTriangle,
  FileText,
  Search,
  Building2,
  Users,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Settings,
  BarChart3,
  PieChart as PieChartIcon,
  AlertCircle,
  Zap
} from 'lucide-react';
import { revenueAPI, paymentAPI, adminAPI } from '@/lib/api';

interface PlatformFinancials {
  totalRevenue: number;
  totalServiceCharges: number;
  totalHospitalEarnings: number;
  totalTransactions: number;
  averageTransactionAmount: number;
  serviceChargeRate: number;
  revenueGrowth: number;
  transactionGrowth: number;
}

interface ServiceChargeAnalytics {
  totalServiceCharges: number;
  earningsByHospital: Array<{
    hospitalId: number;
    hospitalName: string;
    totalServiceCharges: number;
    transactionCount: number;
    averageServiceCharge: number;
  }>;
  earningsByTimePeriod: Array<{
    date: string;
    serviceCharges: number;
    transactionCount: number;
  }>;
  topPerformingHospitals: Array<{
    hospitalId: number;
    hospitalName: string;
    totalRevenue: number;
    serviceCharges: number;
    transactionCount: number;
  }>;
}

interface TransactionMonitoring {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  refundedTransactions: number;
  anomalies: Array<{
    id: number;
    type: 'high_amount' | 'unusual_pattern' | 'failed_rate' | 'duplicate';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    transactionId?: string;
    hospitalId?: number;
    detectedAt: string;
    status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  }>;
  recentTransactions: Array<{
    id: number;
    transactionId: string;
    amount: number;
    serviceCharge: number;
    hospitalAmount: number;
    hospitalName: string;
    patientName: string;
    status: string;
    createdAt: string;
    isAnomaly: boolean;
  }>;
}

interface ReconciliationData {
  lastReconciliationDate: string;
  totalDiscrepancies: number;
  resolvedDiscrepancies: number;
  pendingDiscrepancies: number;
  balanceVerification: {
    totalCalculatedBalance: number;
    totalActualBalance: number;
    difference: number;
    isBalanced: boolean;
  };
  discrepancies: Array<{
    id: number;
    type: 'balance_mismatch' | 'missing_transaction' | 'duplicate_transaction' | 'amount_mismatch';
    description: string;
    amount: number;
    hospitalId?: number;
    hospitalName?: string;
    transactionId?: string;
    detectedAt: string;
    status: 'pending' | 'investigating' | 'resolved';
    resolvedAt?: string;
    resolvedBy?: string;
  }>;
}

interface HospitalDistribution {
  totalHospitals: number;
  activeHospitals: number;
  hospitalBreakdown: Array<{
    hospitalId: number;
    hospitalName: string;
    totalRevenue: number;
    serviceChargesGenerated: number;
    transactionCount: number;
    averageTransactionAmount: number;
    revenuePercentage: number;
    lastTransactionDate: string;
    status: 'active' | 'inactive';
  }>;
  revenueDistribution: Array<{
    hospitalId: number;
    hospitalName: string;
    revenue: number;
    percentage: number;
  }>;
}

interface AdminBalance {
  id: number;
  userId: number;
  userType: string;
  hospitalId: number | null;
  currentBalance: number;
  totalEarnings: number;
  totalWithdrawals: number;
  pendingAmount: number;
  lastTransactionAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AdminBalanceSummary {
  currentBalance: number;
  totalEarnings: number;
  totalWithdrawals: number;
  pendingAmount: number;
  transactionCount: number;
  averageTransactionAmount: number;
  serviceChargeCount: number;
  totalServiceCharges: number;
  lastTransactionAt: string | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#ff7300'];

const AdminFinancialDashboard: React.FC = () => {
  const [platformFinancials, setPlatformFinancials] = useState<PlatformFinancials | null>(null);
  const [serviceChargeAnalytics, setServiceChargeAnalytics] = useState<ServiceChargeAnalytics | null>(null);
  const [transactionMonitoring, setTransactionMonitoring] = useState<TransactionMonitoring | null>(null);
  const [reconciliationData, setReconciliationData] = useState<ReconciliationData | null>(null);
  const [hospitalDistribution, setHospitalDistribution] = useState<HospitalDistribution | null>(null);
  const [adminBalance, setAdminBalance] = useState<AdminBalance | null>(null);
  const [adminBalanceSummary, setAdminBalanceSummary] = useState<AdminBalanceSummary | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Filters
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [period, setPeriod] = useState<string>('month');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [anomalyFilter, setAnomalyFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Dialog states
  const [selectedAnomaly, setSelectedAnomaly] = useState<any>(null);
  const [anomalyDialogOpen, setAnomalyDialogOpen] = useState(false);
  const [reconciliationDialogOpen, setReconciliationDialogOpen] = useState(false);

  useEffect(() => {
    fetchFinancialData();
  }, [dateRange, period]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        period
      };

      // Fetch all financial data in parallel
      const [
        platformResponse,
        serviceChargeResponse,
        transactionResponse,
        reconciliationResponse,
        distributionResponse,
        adminBalanceResponse,
        adminBalanceSummaryResponse
      ] = await Promise.all([
        revenueAPI.getRevenueAnalytics(params),
        revenueAPI.getServiceCharges(params),
        revenueAPI.getAuditTrail(params),
        revenueAPI.getReconciliationReport(params),
        revenueAPI.getHospitalDistribution(params),
        adminAPI.getAdminBalance(),
        adminAPI.getAdminBalanceSummary(params)
      ]);

      // Process platform financials
      if (platformResponse.data.success) {
        setPlatformFinancials(platformResponse.data.data);
      }

      // Process service charge analytics
      if (serviceChargeResponse.data.success) {
        setServiceChargeAnalytics(serviceChargeResponse.data.data);
      }

      // Process transaction monitoring data
      if (transactionResponse.data.success) {
        const auditData = transactionResponse.data.data;
        setTransactionMonitoring({
          totalTransactions: auditData.totalTransactions || 0,
          successfulTransactions: auditData.successfulTransactions || 0,
          failedTransactions: auditData.failedTransactions || 0,
          pendingTransactions: auditData.pendingTransactions || 0,
          refundedTransactions: auditData.refundedTransactions || 0,
          anomalies: auditData.anomalies || [],
          recentTransactions: auditData.recentTransactions || []
        });
      }

      // Process reconciliation data
      if (reconciliationResponse.data.success) {
        setReconciliationData(reconciliationResponse.data.data);
      }

      // Process hospital distribution
      if (distributionResponse.data.success) {
        setHospitalDistribution(distributionResponse.data.data);
      }

      // Process admin balance data
      if (adminBalanceResponse.data.success) {
        setAdminBalance(adminBalanceResponse.data.data);
      }

      if (adminBalanceSummaryResponse.data.success) {
        setAdminBalanceSummary(adminBalanceSummaryResponse.data.data);
      }

    } catch (err: any) {
      console.error('Error fetching financial data:', err);
      setError(err.response?.data?.error || 'Failed to fetch financial data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (key: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    if (value !== 'custom') {
      setDateRange({
        startDate: '',
        endDate: ''
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-purple-100 text-purple-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'investigating': return 'bg-blue-100 text-blue-800';
      case 'new': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openAnomalyDialog = (anomaly: any) => {
    setSelectedAnomaly(anomaly);
    setAnomalyDialogOpen(true);
  };

  const handleAnomalyStatusUpdate = async (anomalyId: number, newStatus: string) => {
    try {
      // In a real implementation, this would call an API endpoint
      console.log(`Updating anomaly ${anomalyId} to status ${newStatus}`);
      // Refresh data after update
      await fetchFinancialData();
      setAnomalyDialogOpen(false);
    } catch (error) {
      console.error('Error updating anomaly status:', error);
    }
  };

  const exportFinancialReport = () => {
    if (!platformFinancials || !serviceChargeAnalytics) return;

    const reportData = {
      reportDate: new Date().toISOString(),
      dateRange: dateRange,
      platformFinancials,
      serviceChargeAnalytics,
      transactionMonitoring,
      reconciliationData,
      hospitalDistribution
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-financial-report-${dateRange.startDate}-${dateRange.endDate}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredAnomalies = transactionMonitoring?.anomalies.filter(anomaly => {
    const matchesSearch = searchTerm === '' || 
      anomaly.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      anomaly.transactionId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = anomalyFilter === 'all' || anomaly.status === anomalyFilter;
    const matchesSeverity = severityFilter === 'all' || anomaly.severity === severityFilter;
    
    return matchesSearch && matchesStatus && matchesSeverity;
  }) || [];

  const filteredTransactions = transactionMonitoring?.recentTransactions.filter(transaction => {
    const matchesSearch = searchTerm === '' || 
      transaction.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.hospitalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.transactionId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading admin financial dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Financial Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor platform-wide revenue, service charges, and financial integrity
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportFinancialReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" onClick={fetchFinancialData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FilterIcon className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period">Time Period</Label>
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {period === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Financial Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="admin-balance">Admin Balance</TabsTrigger>
          <TabsTrigger value="service-charges">Service Charges</TabsTrigger>
          <TabsTrigger value="monitoring">Transaction Monitoring</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="distribution">Hospital Distribution</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Platform Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {platformFinancials ? formatCurrency(platformFinancials.totalRevenue) : '$0.00'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {platformFinancials?.revenueGrowth && platformFinancials.revenueGrowth > 0 ? (
                    <span className="text-green-600">
                      <TrendingUp className="inline h-3 w-3 mr-1" />
                      +{platformFinancials.revenueGrowth.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-red-600">
                      <TrendingDown className="inline h-3 w-3 mr-1" />
                      {platformFinancials?.revenueGrowth?.toFixed(1) || 0}%
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Service Charges Earned</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {platformFinancials ? formatCurrency(platformFinancials.totalServiceCharges) : '$0.00'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {platformFinancials?.serviceChargeRate && 
                    `${(platformFinancials.serviceChargeRate * 100).toFixed(1)}% rate`
                  }
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {platformFinancials?.totalTransactions?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {platformFinancials?.transactionGrowth && platformFinancials.transactionGrowth > 0 ? (
                    <span className="text-green-600">
                      <TrendingUp className="inline h-3 w-3 mr-1" />
                      +{platformFinancials.transactionGrowth.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-red-600">
                      <TrendingDown className="inline h-3 w-3 mr-1" />
                      {platformFinancials?.transactionGrowth?.toFixed(1) || 0}%
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Hospitals</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {hospitalDistribution?.activeHospitals || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  of {hospitalDistribution?.totalHospitals || 0} total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Revenue Trend</CardTitle>
              <CardDescription>
                Daily revenue and service charges over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={serviceChargeAnalytics?.earningsByTimePeriod || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="serviceCharges" 
                    stackId="1"
                    stroke="#0088FE" 
                    fill="#0088FE"
                    name="Service Charges"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Performing Hospitals */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Hospitals</CardTitle>
              <CardDescription>
                Hospitals generating the most service charges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {serviceChargeAnalytics?.topPerformingHospitals?.slice(0, 5).map((hospital, index) => (
                  <div key={hospital.hospitalId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{hospital.hospitalName}</p>
                        <p className="text-sm text-muted-foreground">
                          {hospital.transactionCount} transactions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(hospital.serviceCharges)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(hospital.totalRevenue)} total
                      </p>
                    </div>
                  </div>
                )) || []}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Balance Tab */}
        <TabsContent value="admin-balance" className="space-y-6">
          {/* Admin Balance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {adminBalance ? formatCurrency(adminBalance.currentBalance) : '$0.00'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Available for withdrawal
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {adminBalance ? formatCurrency(adminBalance.totalEarnings) : '$0.00'}
                </div>
                <p className="text-xs text-muted-foreground">
                  From service charges
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {adminBalance ? formatCurrency(adminBalance.totalWithdrawals) : '$0.00'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total withdrawn
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Service Charges</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {adminBalanceSummary ? formatCurrency(adminBalanceSummary.totalServiceCharges) : '$0.00'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {adminBalanceSummary?.serviceChargeCount || 0} transactions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Admin Balance Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Admin Balance Management
              </CardTitle>
              <CardDescription>
                Manage your admin balance and view transaction history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Button 
                  onClick={() => {
                    // Initialize admin balance if needed
                    adminAPI.initializeAdminBalance().then(() => {
                      fetchFinancialData();
                    });
                  }}
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Initialize Balance
                </Button>
                <Button 
                  onClick={() => {
                    // Open withdrawal dialog
                    console.log('Open withdrawal dialog');
                  }}
                  disabled={!adminBalance || adminBalance.currentBalance <= 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Withdraw Funds
                </Button>
                <Button 
                  onClick={() => {
                    // Refresh balance data
                    fetchFinancialData();
                  }}
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Admin Balance Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Balance Summary</CardTitle>
              <CardDescription>
                Detailed breakdown of your admin balance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Average Transaction</p>
                  <p className="text-2xl font-bold">
                    {adminBalanceSummary ? formatCurrency(adminBalanceSummary.averageTransactionAmount) : '$0.00'}
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-bold">
                    {adminBalanceSummary?.transactionCount || 0}
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Last Transaction</p>
                  <p className="text-sm font-medium">
                    {adminBalance?.lastTransactionAt 
                      ? formatDate(adminBalance.lastTransactionAt)
                      : 'Never'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Charges Tab */}
        <TabsContent value="service-charges" className="space-y-6">
          {/* Service Charge Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Service Charges by Hospital</CardTitle>
                <CardDescription>
                  Revenue distribution across hospitals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={serviceChargeAnalytics?.earningsByHospital?.slice(0, 10) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="hospitalName" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="totalServiceCharges" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Service Charge Trends</CardTitle>
                <CardDescription>
                  Daily service charge earnings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={serviceChargeAnalytics?.earningsByTimePeriod || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Line 
                      type="monotone" 
                      dataKey="serviceCharges" 
                      stroke="#00C49F" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Service Charge Table */}
          <Card>
            <CardHeader>
              <CardTitle>Hospital Service Charge Details</CardTitle>
              <CardDescription>
                Detailed breakdown of service charges by hospital
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hospital</TableHead>
                      <TableHead>Total Service Charges</TableHead>
                      <TableHead>Transaction Count</TableHead>
                      <TableHead>Average Service Charge</TableHead>
                      <TableHead>Percentage of Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceChargeAnalytics?.earningsByHospital?.map((hospital) => (
                      <TableRow key={hospital.hospitalId}>
                        <TableCell className="font-medium">
                          {hospital.hospitalName}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(hospital.totalServiceCharges)}
                        </TableCell>
                        <TableCell>
                          {hospital.transactionCount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(hospital.averageServiceCharge)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {serviceChargeAnalytics.totalServiceCharges > 0 
                              ? ((hospital.totalServiceCharges / serviceChargeAnalytics.totalServiceCharges) * 100).toFixed(1)
                              : 0
                            }%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )) || []}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transaction Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          {/* Transaction Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {transactionMonitoring?.totalTransactions?.toLocaleString() || '0'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-600">Successful</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {transactionMonitoring?.successfulTransactions?.toLocaleString() || '0'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-yellow-600">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {transactionMonitoring?.pendingTransactions?.toLocaleString() || '0'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-600">Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {transactionMonitoring?.failedTransactions?.toLocaleString() || '0'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-purple-600">Refunded</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {transactionMonitoring?.refundedTransactions?.toLocaleString() || '0'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Anomaly Detection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                    Anomaly Detection
                  </CardTitle>
                  <CardDescription>
                    Detected anomalies and suspicious patterns
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-orange-600">
                  {filteredAnomalies.length} anomalies
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search anomalies..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={anomalyFilter} onValueChange={setAnomalyFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="false_positive">False Positive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Detected At</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAnomalies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          No anomalies found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAnomalies.map((anomaly) => (
                        <TableRow key={anomaly.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {anomaly.type.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getSeverityColor(anomaly.severity)}>
                              {anomaly.severity}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {anomaly.description}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(anomaly.detectedAt)}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(anomaly.status)}>
                              {anomaly.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openAnomalyDialog(anomaly)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                Latest transactions with anomaly indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search transactions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Hospital</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Service Charge</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Anomaly</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-mono text-sm">
                            {transaction.transactionId}
                          </TableCell>
                          <TableCell>
                            {formatDate(transaction.createdAt)}
                          </TableCell>
                          <TableCell>{transaction.hospitalName}</TableCell>
                          <TableCell>{transaction.patientName}</TableCell>
                          <TableCell>
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(transaction.serviceCharge)}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(transaction.status)}>
                              {transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {transaction.isAnomaly ? (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Anomaly
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Normal
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reconciliation Tab */}
        <TabsContent value="reconciliation" className="space-y-6">
          {/* Reconciliation Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Last Reconciliation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {reconciliationData?.lastReconciliationDate 
                    ? formatDate(reconciliationData.lastReconciliationDate)
                    : 'Never'
                  }
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Discrepancies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {reconciliationData?.totalDiscrepancies || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Resolved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {reconciliationData?.resolvedDiscrepancies || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {reconciliationData?.pendingDiscrepancies || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Balance Verification */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Balance Verification
              </CardTitle>
              <CardDescription>
                Automated balance verification and integrity checks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Calculated Balance</p>
                  <p className="text-2xl font-bold">
                    {reconciliationData?.balanceVerification 
                      ? formatCurrency(reconciliationData.balanceVerification.totalCalculatedBalance)
                      : '$0.00'
                    }
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Actual Balance</p>
                  <p className="text-2xl font-bold">
                    {reconciliationData?.balanceVerification 
                      ? formatCurrency(reconciliationData.balanceVerification.totalActualBalance)
                      : '$0.00'
                    }
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Difference</p>
                  <p className={`text-2xl font-bold ${
                    reconciliationData?.balanceVerification?.difference === 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {reconciliationData?.balanceVerification 
                      ? formatCurrency(reconciliationData.balanceVerification.difference)
                      : '$0.00'
                    }
                  </p>
                  <div className="mt-2">
                    {reconciliationData?.balanceVerification?.isBalanced ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Balanced
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        Unbalanced
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Discrepancies Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Financial Discrepancies</CardTitle>
                  <CardDescription>
                    Detected discrepancies requiring investigation
                  </CardDescription>
                </div>
                <Dialog open={reconciliationDialogOpen} onOpenChange={setReconciliationDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Settings className="h-4 w-4 mr-2" />
                      Run Reconciliation
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Run Financial Reconciliation</DialogTitle>
                      <DialogDescription>
                        This will perform a comprehensive reconciliation of all financial data.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p>This process will:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Verify all transaction amounts</li>
                        <li>Check balance calculations</li>
                        <li>Detect missing or duplicate transactions</li>
                        <li>Generate discrepancy reports</li>
                      </ul>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setReconciliationDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={() => {
                          // In a real implementation, this would trigger reconciliation
                          console.log('Running reconciliation...');
                          setReconciliationDialogOpen(false);
                        }}>
                          Run Reconciliation
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Hospital</TableHead>
                      <TableHead>Detected At</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconciliationData?.discrepancies?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          No discrepancies found
                        </TableCell>
                      </TableRow>
                    ) : (
                      reconciliationData?.discrepancies?.map((discrepancy) => (
                        <TableRow key={discrepancy.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {discrepancy.type.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {discrepancy.description}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(discrepancy.amount)}
                          </TableCell>
                          <TableCell>
                            {discrepancy.hospitalName || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(discrepancy.detectedAt)}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(discrepancy.status)}>
                              {discrepancy.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )) || []
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hospital Distribution Tab */}
        <TabsContent value="distribution" className="space-y-6">
          {/* Hospital Revenue Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Hospital Revenue Distribution</CardTitle>
              <CardDescription>
                Revenue breakdown across all hospitals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={hospitalDistribution?.revenueDistribution?.slice(0, 8) || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} ${percentage?.toFixed(1)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {(hospitalDistribution?.revenueDistribution?.slice(0, 8) || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Hospital Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Hospital Performance Breakdown</CardTitle>
              <CardDescription>
                Detailed performance metrics for all hospitals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hospital</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Service Charges Generated</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead>Avg Transaction</TableHead>
                      <TableHead>Revenue %</TableHead>
                      <TableHead>Last Transaction</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hospitalDistribution?.hospitalBreakdown?.map((hospital) => (
                      <TableRow key={hospital.hospitalId}>
                        <TableCell className="font-medium">
                          {hospital.hospitalName}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(hospital.totalRevenue)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(hospital.serviceChargesGenerated)}
                        </TableCell>
                        <TableCell>
                          {hospital.transactionCount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(hospital.averageTransactionAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {hospital.revenuePercentage.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatDate(hospital.lastTransactionDate)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(hospital.status)}>
                            {hospital.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )) || []}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Anomaly Detail Dialog */}
      <Dialog open={anomalyDialogOpen} onOpenChange={setAnomalyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
              Anomaly Details
            </DialogTitle>
            <DialogDescription>
              Review and manage detected anomaly
            </DialogDescription>
          </DialogHeader>
          {selectedAnomaly && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <p className="font-medium">{selectedAnomaly.type.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label>Severity</Label>
                  <Badge className={getSeverityColor(selectedAnomaly.severity)}>
                    {selectedAnomaly.severity}
                  </Badge>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusColor(selectedAnomaly.status)}>
                    {selectedAnomaly.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <Label>Detected At</Label>
                  <p className="font-medium">{formatDateTime(selectedAnomaly.detectedAt)}</p>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <p className="mt-1 p-3 bg-gray-50 rounded-md">{selectedAnomaly.description}</p>
              </div>
              {selectedAnomaly.transactionId && (
                <div>
                  <Label>Transaction ID</Label>
                  <p className="font-mono text-sm">{selectedAnomaly.transactionId}</p>
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleAnomalyStatusUpdate(selectedAnomaly.id, 'false_positive')}
                >
                  Mark as False Positive
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleAnomalyStatusUpdate(selectedAnomaly.id, 'investigating')}
                >
                  Start Investigation
                </Button>
                <Button 
                  onClick={() => handleAnomalyStatusUpdate(selectedAnomaly.id, 'resolved')}
                >
                  Mark as Resolved
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFinancialDashboard;