'use client';

import React, { useState, useEffect } from 'react';
import { History, Filter, Download, Search, Calendar, Bell, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { notificationAPI } from '@/lib/api';
import { Notification, NotificationMetadata, NotificationContent } from '@/lib/types';

interface NotificationHistoryProps {
  userId: number;
  className?: string;
}

const NotificationHistory: React.FC<NotificationHistoryProps> = ({
  userId,
  className = ''
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    loadNotifications();
  }, [userId, typeFilter, statusFilter, channelFilter, dateRange]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { limit: 100 };
      
      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await notificationAPI.getHistory(params);
      
      if (response.data.success) {
        let notificationData = response.data.data || [];
        
        // Apply client-side filters
        if (channelFilter !== 'all') {
          notificationData = notificationData.filter((n: Notification) => n.channel === channelFilter);
        }
        
        if (dateRange !== 'all') {
          const now = new Date();
          const filterDate = new Date();
          
          switch (dateRange) {
            case '24h':
              filterDate.setHours(now.getHours() - 24);
              break;
            case '7d':
              filterDate.setDate(now.getDate() - 7);
              break;
            case '30d':
              filterDate.setDate(now.getDate() - 30);
              break;
            case '90d':
              filterDate.setDate(now.getDate() - 90);
              break;
          }
          
          if (dateRange !== 'all') {
            notificationData = notificationData.filter((n: Notification) => 
              new Date(n.createdAt) >= filterDate
            );
          }
        }
        
        setNotifications(notificationData);
      } else {
        setError(response.data.message || 'Failed to load notification history');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load notification history');
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string, status: string) => {
    if (status === 'failed') return <XCircle className="h-4 w-4 text-red-500" />;
    if (status === 'delivered') {
      switch (type) {
        case 'booking_approved':
          return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'booking_declined':
          return <XCircle className="h-4 w-4 text-red-500" />;
        case 'booking_completed':
          return <CheckCircle className="h-4 w-4 text-blue-500" />;
        case 'booking_cancelled':
          return <AlertTriangle className="h-4 w-4 text-orange-500" />;
        default:
          return <Bell className="h-4 w-4 text-gray-500" />;
      }
    }
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="default" className="bg-green-100 text-green-800">Delivered</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'queued':
        return <Badge variant="outline">Queued</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const parseNotificationContent = (contentStr: string): NotificationContent => {
    try {
      return JSON.parse(contentStr);
    } catch {
      return { message: contentStr };
    }
  };

  const parseNotificationMetadata = (metadataStr?: string): NotificationMetadata => {
    if (!metadataStr) return {};
    try {
      return JSON.parse(metadataStr);
    } catch {
      return {};
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getNotificationTitle = (type: string) => {
    switch (type) {
      case 'booking_approved':
        return 'Booking Approved';
      case 'booking_declined':
        return 'Booking Declined';
      case 'booking_completed':
        return 'Booking Completed';
      case 'booking_cancelled':
        return 'Booking Cancelled';
      case 'resource_threshold':
        return 'Resource Alert';
      case 'system_alert':
        return 'System Alert';
      default:
        return 'Notification';
    }
  };

  // Filter notifications based on search term
  const filteredNotifications = notifications.filter(notification => {
    if (!searchTerm) return true;
    
    const content = parseNotificationContent(notification.content);
    const metadata = parseNotificationMetadata(notification.metadata);
    
    const searchableText = [
      getNotificationTitle(notification.type),
      content.subject || '',
      content.message || '',
      metadata.booking?.hospitalName || '',
      metadata.booking?.patientName || '',
      metadata.details?.notes || '',
      metadata.details?.reason || ''
    ].join(' ').toLowerCase();
    
    return searchableText.includes(searchTerm.toLowerCase());
  });

  // Paginate results
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNotifications = filteredNotifications.slice(startIndex, startIndex + itemsPerPage);

  const exportToCSV = () => {
    const csvData = filteredNotifications.map(notification => {
      const content = parseNotificationContent(notification.content);
      const metadata = parseNotificationMetadata(notification.metadata);
      
      return {
        Date: formatDate(notification.createdAt),
        Type: getNotificationTitle(notification.type),
        Status: notification.status,
        Channel: notification.channel,
        Priority: notification.priority,
        Hospital: metadata.booking?.hospitalName || '',
        Patient: metadata.booking?.patientName || '',
        Subject: content.subject || '',
        Message: content.message || '',
        DeliveredAt: notification.actualDeliveredAt ? formatDate(notification.actualDeliveredAt) : ''
      };
    });

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Notification History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Notification History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={loadNotifications} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Notification History
          {filteredNotifications.length > 0 && (
            <Badge variant="secondary">{filteredNotifications.length}</Badge>
          )}
        </CardTitle>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="booking_approved">Booking Approved</SelectItem>
              <SelectItem value="booking_declined">Booking Declined</SelectItem>
              <SelectItem value="booking_completed">Booking Completed</SelectItem>
              <SelectItem value="booking_cancelled">Booking Cancelled</SelectItem>
              <SelectItem value="resource_threshold">Resource Alert</SelectItem>
              <SelectItem value="system_alert">System Alert</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <div className="flex gap-2">
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="push">Push</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notifications found</p>
            <p className="text-sm">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Delivered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedNotifications.map((notification) => {
                    const content = parseNotificationContent(notification.content);
                    const metadata = parseNotificationMetadata(notification.metadata);
                    
                    return (
                      <TableRow key={notification.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getNotificationIcon(notification.type, notification.status)}
                            <div>
                              <p className="font-medium text-sm">
                                {getNotificationTitle(notification.type)}
                              </p>
                              <Badge className="text-xs" variant="outline">
                                {notification.priority}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          {getStatusBadge(notification.status)}
                          {notification.retryCount > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              Retries: {notification.retryCount}
                            </p>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {notification.channel}
                          </Badge>
                        </TableCell>
                        
                        <TableCell className="max-w-xs">
                          {metadata.booking && (
                            <div className="text-sm">
                              <p className="font-medium">{metadata.booking.hospitalName}</p>
                              <p className="text-gray-600">{metadata.booking.patientName}</p>
                              <p className="text-gray-500">{metadata.booking.resourceType}</p>
                            </div>
                          )}
                          {content.subject && (
                            <p className="text-sm font-medium truncate">{content.subject}</p>
                          )}
                          {content.message && (
                            <p className="text-xs text-gray-600 truncate">{content.message}</p>
                          )}
                        </TableCell>
                        
                        <TableCell className="text-sm">
                          {formatDate(notification.createdAt)}
                        </TableCell>
                        
                        <TableCell className="text-sm">
                          {notification.actualDeliveredAt ? (
                            <div>
                              <p>{formatDate(notification.actualDeliveredAt)}</p>
                              <p className="text-xs text-gray-500">
                                {Math.round((new Date(notification.actualDeliveredAt).getTime() - 
                                           new Date(notification.createdAt).getTime()) / 1000)}s
                              </p>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredNotifications.length)} of {filteredNotifications.length} notifications
                </p>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  
                  <span className="flex items-center px-3 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationHistory;