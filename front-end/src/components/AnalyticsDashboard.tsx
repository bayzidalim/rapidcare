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
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { hospitalAPI } from '@/lib/api';
import { 
  AnalyticsDashboard as AnalyticsDashboardType,
  ResourceUtilizationAnalytics,
  BookingHistoryAnalytics,
  ResourceUsagePatterns,
  PerformanceMetrics,
  AnalyticsFilters
} from '@/lib/types';

interface AnalyticsDashboardProps {
  hospitalId: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ hospitalId }) => {
  const [analytics, setAnalytics] = useState<AnalyticsDashboardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0], // today
  });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalytics();
  }, [hospitalId, filters]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await hospitalAPI.getAnalyticsDashboard(hospitalId, filters);
      setAnalytics(response.data.data);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.response?.data?.error || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof AnalyticsFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    });
  };

  const formatUtilizationData = (utilization: ResourceUtilizationAnalytics) => {
    return utilization.currentResources.map(resource => ({
      name: resource.resourceType.charAt(0).toUpperCase() + resource.resourceType.slice(1),
      utilization: resource.utilizationPercentage,
      available: resource.availabilityPercentage,
      total: resource.total,
      occupied: resource.occupied
    }));
  };

  const formatBookingTrendsData = (bookingHistory: BookingHistoryAnalytics) => {
    const trendsByDate = bookingHistory.bookingTrends.reduce((acc, trend) => {
      const date = trend.date;
      if (!acc[date]) {
        acc[date] = { date, approved: 0, declined: 0, pending: 0, total: 0 };
      }
      acc[date][trend.status as keyof typeof acc[typeof date]] += trend.count;
      acc[date].total += trend.count;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(trendsByDate).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const formatResourceDemandData = (bookingHistory: BookingHistoryAnalytics) => {
    const demandByResource = bookingHistory.resourceDemand.reduce((acc, demand) => {
      const key = demand.resourceType;
      if (!acc[key]) {
        acc[key] = { name: key, value: 0 };
      }
      acc[key].value += demand.demandCount;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(demandByResource);
  };

  const formatHourlyPatternsData = (usagePatterns: ResourceUsagePatterns) => {
    return usagePatterns.hourlyPatterns.map(pattern => ({
      hour: `${pattern.hour}:00`,
      bookings: pattern.bookingCount,
      approvalRate: Math.round(pattern.approvalRate * 100)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading analytics...</span>
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

  if (!analytics) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>No analytics data available</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive analytics and reporting for hospital resource management
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={fetchAnalytics}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="resourceType">Resource Type</Label>
                <Select value={filters.resourceType || ''} onValueChange={(value) => handleFilterChange('resourceType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Resources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Resources</SelectItem>
                    <SelectItem value="beds">Beds</SelectItem>
                    <SelectItem value="icu">ICU</SelectItem>
                    <SelectItem value="operationTheatres">Operation Theatres</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={resetFilters}>
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="utilization">Resource Utilization</TabsTrigger>
          <TabsTrigger value="bookings">Booking Analytics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.bookingHistory.approvalMetrics.totalBookings}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.bookingHistory.approvalMetrics.approvalRate}% approval rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.bookingHistory.approvalMetrics.avgApprovalTimeHours.toFixed(1)}h
                </div>
                <p className="text-xs text-muted-foreground">
                  Average approval time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Efficiency Score</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.performance.efficiencyMetrics.efficiencyScore}%</div>
                <p className="text-xs text-muted-foreground">
                  Overall efficiency
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.bookingHistory.approvalMetrics.pendingBookings}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting approval
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Resource Utilization Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Resource Utilization Overview</CardTitle>
              <CardDescription>Current utilization across all resource types</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={formatUtilizationData(analytics.resourceUtilization)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="utilization" fill="#8884d8" name="Utilization %" />
                  <Bar dataKey="available" fill="#82ca9d" name="Available %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Booking Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Trends</CardTitle>
              <CardDescription>Daily booking trends over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={formatBookingTrendsData(analytics.bookingHistory)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="approved" stroke="#82ca9d" name="Approved" />
                  <Line type="monotone" dataKey="declined" stroke="#ff7c7c" name="Declined" />
                  <Line type="monotone" dataKey="pending" stroke="#ffc658" name="Pending" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resource Utilization Tab */}
        <TabsContent value="utilization" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Resource Status */}
            <Card>
              <CardHeader>
                <CardTitle>Current Resource Status</CardTitle>
                <CardDescription>Real-time resource availability</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.resourceUtilization.currentResources.map((resource, index) => (
                    <div key={resource.resourceType} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium capitalize">{resource.resourceType}</span>
                        <Badge variant={resource.utilizationPercentage > 80 ? "destructive" : 
                                     resource.utilizationPercentage > 60 ? "default" : "secondary"}>
                          {resource.utilizationPercentage}% utilized
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${resource.utilizationPercentage}%` }}
                        ></div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {resource.occupied}/{resource.total} occupied • {resource.available} available
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Resource Demand Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Resource Demand Distribution</CardTitle>
                <CardDescription>Demand by resource type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={formatResourceDemandData(analytics.bookingHistory)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {formatResourceDemandData(analytics.bookingHistory).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Hourly Usage Patterns */}
          <Card>
            <CardHeader>
              <CardTitle>Hourly Usage Patterns</CardTitle>
              <CardDescription>Booking patterns throughout the day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={formatHourlyPatternsData(analytics.usagePatterns)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="bookings" stackId="1" stroke="#8884d8" fill="#8884d8" name="Bookings" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Booking Analytics Tab */}
        <TabsContent value="bookings" className="space-y-6">
          {/* Approval Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {analytics.bookingHistory.approvalMetrics.approvedBookings}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics.bookingHistory.approvalMetrics.approvalRate}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Declined</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {analytics.bookingHistory.approvalMetrics.declinedBookings}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics.bookingHistory.approvalMetrics.declineRate}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {analytics.bookingHistory.approvalMetrics.pendingBookings}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting decision
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Patient Demographics */}
          <Card>
            <CardHeader>
              <CardTitle>Patient Demographics</CardTitle>
              <CardDescription>Breakdown of patients by age group and gender</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.values(
                  analytics.bookingHistory.patientDemographics
                    .reduce((acc, demo) => {
                      const key = `${demo.ageGroup}-${demo.patientGender}`;
                      if (!acc[key]) {
                        acc[key] = { ageGroup: demo.ageGroup, gender: demo.patientGender, count: 0 };
                      }
                      acc[key].count += demo.count;
                      return acc;
                    }, {} as Record<string, any>)
                ).slice(0, 10).map((demo: any, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span>{demo.ageGroup} - {demo.gender}</span>
                    <Badge variant="outline">{demo.count} patients</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {/* Response Time Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Response Time Metrics</CardTitle>
              <CardDescription>Average response times by resource type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.performance.responseTimeMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="resourceType" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} minutes`, 'Response Time']} />
                  <Legend />
                  <Bar dataKey="avgResponseMinutes" fill="#8884d8" name="Avg Response Time (min)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Capacity Recommendations */}
          {analytics.performance.capacityRecommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Capacity Planning Recommendations</CardTitle>
                <CardDescription>AI-generated recommendations for resource optimization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.performance.capacityRecommendations.map((rec, index) => (
                    <Alert key={index} className={
                      rec.priority === 'high' ? 'border-red-200 bg-red-50' :
                      rec.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                      'border-blue-200 bg-blue-50'
                    }>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex justify-between items-start">
                          <div>
                            <strong className="capitalize">{rec.resourceType}</strong>
                            <p className="mt-1">{rec.message}</p>
                          </div>
                          <Badge variant={
                            rec.priority === 'high' ? 'destructive' :
                            rec.priority === 'medium' ? 'default' : 'secondary'
                          }>
                            {rec.priority} priority
                          </Badge>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;