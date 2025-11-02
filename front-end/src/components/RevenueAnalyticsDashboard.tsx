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
  Area,
  AreaChart
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
  Search
} from 'lucide-react';
import { revenueAPI, paymentAPI } from '@/lib/api';
import { 
  RevenueAnalytics,
  UserBalance,
  Transaction,
  BalanceTransaction
} from '@/lib/types';

interface RevenueAnalyticsDashboardProps {
  hospitalId?: number;
  userType: 'hospital-authority' | 'admin';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

const RevenueAnalyticsDashboard: React.FC<RevenueAnalyticsDashboardProps> = ({ 
  hospitalId, 
  userType 
}) => {
  const [revenueData, setRevenueData] = useState<RevenueAnalytics | null>(null);
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balanceHistory, setBalanceHistory] = useState<BalanceTransaction[]>([]);
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

  useEffect(() => {
    fetchRevenueData();
  }, [hospitalId, userType, dateRange, period]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        period
      };

      // Fetch revenue analytics
      let revenueResponse;
      if (userType === 'hospital-authority' && hospitalId) {
        revenueResponse = await revenueAPI.getHospitalRevenue(hospitalId, params);
      } else if (userType === 'admin') {
        revenueResponse = await revenueAPI.getAdminRevenue(params);
      }

      if (revenueResponse) {
        setRevenueData(revenueResponse.data.data);
      }

      // Fetch balance information
      let balanceResponse;
      if (userType === 'hospital-authority' && hospitalId) {
        balanceResponse = await revenueAPI.getHospitalBalance(hospitalId);
      } else if (userType === 'admin') {
        balanceResponse = await revenueAPI.getAdminBalance();
      }

      if (balanceResponse) {
        const balanceData = balanceResponse.data.data;
        if (userType === 'hospital-authority') {
          setBalance(balanceData.balance);
          setBalanceHistory(balanceData.history || []);
        } else {
          setBalance(balanceData.balances?.[0] || null);
          setBalanceHistory(balanceData.history || []);
        }
      }

      // Fetch transaction history
      if (userType === 'hospital-authority' && hospitalId) {
        const transactionResponse = await paymentAPI.getPaymentHistory(undefined, {
          hospitalId,
          ...params
        });
        setTransactions(transactionResponse.data.data || []);
      } else if (userType === 'admin') {
        const transactionResponse = await paymentAPI.getPaymentHistory(undefined, params);
        setTransactions(transactionResponse.data.data || []);
      }

    } catch (err: any) {
      console.error('Error fetching revenue data:', err);
      setError(err.response?.data?.error || 'Failed to fetch revenue data');
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
    // Reset custom date range when using predefined periods
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

  const formatRevenueChartData = () => {
    if (!revenueData?.dailyAnalytics) return [];
    
    return revenueData.dailyAnalytics.map(item => ({
      date: formatDate(item.date),
      revenue: userType === 'hospital-authority' ? item.totalHospitalAmount : item.totalServiceCharge,
      transactions: item.transactionCount,
      avgAmount: item.averageAmount
    }));
  };

  const formatResourceBreakdownData = () => {
    if (!revenueData?.resourceBreakdown) return [];
    
    return revenueData.resourceBreakdown.map(item => ({
      name: item.resourceType.charAt(0).toUpperCase() + item.resourceType.slice(1),
      revenue: item.totalRevenue,
      transactions: item.transactionCount,
      avgRevenue: item.averageRevenue
    }));
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = searchTerm === '' || 
      transaction.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.hospitalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.transactionId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const exportRevenueData = () => {
    if (!revenueData) return;

    const csvData = [
      ['Date', 'Revenue', 'Transactions', 'Average Amount'],
      ...revenueData.dailyAnalytics.map(item => [
        item.date,
        userType === 'hospital-authority' ? item.totalHospitalAmount : item.totalServiceCharge,
        item.transactionCount,
        item.averageAmount
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${dateRange.startDate}-${dateRange.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading revenue analytics...</span>
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

  if (!revenueData) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>No revenue data available</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Revenue Analytics</h1>
          <p className="text-muted-foreground">
            {userType === 'hospital-authority' 
              ? 'Track your hospital\'s earnings and financial performance'
              : 'Monitor platform-wide revenue and service charges'
            }
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportRevenueData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={fetchRevenueData}>
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

      {/* Revenue Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="charts">Revenue Charts</TabsTrigger>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          <TabsTrigger value="balance">Balance Details</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(revenueData.totalRevenue.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {revenueData.totalRevenue.totalTransactions} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {balance ? formatCurrency(balance.currentBalance) : '$0.00'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Available balance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Transaction</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(revenueData.totalRevenue.averageTransactionAmount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per transaction
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
                  {balance ? formatCurrency(balance.totalEarnings) : '$0.00'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Lifetime earnings
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Resource Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Resource Type</CardTitle>
              <CardDescription>
                Breakdown of earnings by different resource types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={formatResourceBreakdownData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(Number(value)) : value,
                      name === 'revenue' ? 'Revenue' : 'Transactions'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#0088FE" name="Revenue" />
                  <Bar dataKey="transactions" fill="#00C49F" name="Transactions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-6">
          {/* Revenue Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>
                Daily revenue trends over the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={formatRevenueChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(Number(value)) : value,
                      name === 'revenue' ? 'Revenue' : name === 'transactions' ? 'Transactions' : 'Avg Amount'
                    ]}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#0088FE" 
                    strokeWidth={2}
                    name="Revenue"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="transactions" 
                    stroke="#00C49F" 
                    strokeWidth={2}
                    name="Transactions"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Resource Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Resource Revenue Distribution</CardTitle>
              <CardDescription>
                Percentage breakdown of revenue by resource type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={formatResourceBreakdownData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {formatResourceBreakdownData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          {/* Transaction Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                Detailed view of all revenue transactions
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
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
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
                      <TableHead>Patient</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
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
                          <TableCell>{transaction.patientName || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {transaction.resourceType || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(
                              userType === 'hospital-authority' 
                                ? transaction.hospitalAmount 
                                : transaction.serviceCharge
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                transaction.status === 'completed' ? 'default' :
                                transaction.status === 'pending' ? 'secondary' :
                                transaction.status === 'failed' ? 'destructive' :
                                'outline'
                              }
                            >
                              {transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <FileText className="h-4 w-4" />
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
        </TabsContent>

        {/* Balance Tab */}
        <TabsContent value="balance" className="space-y-6">
          {/* Balance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {balance ? formatCurrency(balance.currentBalance) : '$0.00'}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Available for withdrawal
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {balance ? formatCurrency(balance.totalEarnings) : '$0.00'}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Lifetime earnings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">
                  {balance ? formatCurrency(balance.pendingAmount) : '$0.00'}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Processing transactions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Balance History */}
          <Card>
            <CardHeader>
              <CardTitle>Balance History</CardTitle>
              <CardDescription>
                Recent balance changes and transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Balance Before</TableHead>
                      <TableHead>Balance After</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balanceHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          No balance history available
                        </TableCell>
                      </TableRow>
                    ) : (
                      balanceHistory.map((history) => (
                        <TableRow key={history.id}>
                          <TableCell>
                            {formatDate(history.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {history.transactionType.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className={
                            history.amount > 0 ? 'text-green-600' : 'text-red-600'
                          }>
                            {history.amount > 0 ? '+' : ''}{formatCurrency(history.amount)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(history.balanceBefore)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(history.balanceAfter)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {history.description || 'N/A'}
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
      </Tabs>
    </div>
  );
};

export default RevenueAnalyticsDashboard;