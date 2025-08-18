"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Pagination, PaginationInfo, ItemsPerPageSelector } from '@/components/ui/pagination';
import { BookingCardLoading } from '@/components/ui/loading-states';
import { useDebounce } from '@/hooks/use-debounce';
import { bookingAPI } from '@/lib/api';
import { performanceMonitor } from '@/lib/performance';
import {
    Calendar,
    Clock,
    User,
    Building2,
    Search,
    Filter,
    Download,
    RefreshCw,
    Bed,
    Heart,
    Scissors,
    Activity
} from 'lucide-react';

interface Booking {
    id: number;
    bookingReference: string;
    patientName: string;
    patientAge: number;
    patientGender: string;
    medicalCondition: string;
    urgency: string;
    resourceType: string;
    scheduledDate: string;
    estimatedDuration: number;
    status: string;
    createdAt: string;
    hospitalName: string;
    hospitalCity?: string;
    hospitalState?: string;
}

interface PaginatedBookingHistoryProps {
    userId?: number;
    hospitalId?: number;
    className?: string;
}

const PaginatedBookingHistory: React.FC<PaginatedBookingHistoryProps> = ({
    userId,
    hospitalId,
    className
}) => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // Filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [urgencyFilter, setUrgencyFilter] = useState('');
    const [resourceFilter, setResourceFilter] = useState('');
    const [dateRange, setDateRange] = useState('');

    // Debounce search to avoid excessive API calls
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // Memoized filtered bookings
    const filteredBookings = useMemo(() => {
        return bookings.filter(booking => {
            // Search filter
            if (debouncedSearchTerm) {
                const searchLower = debouncedSearchTerm.toLowerCase();
                const matchesSearch =
                    booking.patientName.toLowerCase().includes(searchLower) ||
                    booking.bookingReference.toLowerCase().includes(searchLower) ||
                    booking.hospitalName.toLowerCase().includes(searchLower) ||
                    booking.medicalCondition.toLowerCase().includes(searchLower);
                if (!matchesSearch) return false;
            }

            // Status filter
            if (statusFilter && booking.status !== statusFilter) {
                return false;
            }

            // Urgency filter
            if (urgencyFilter && booking.urgency !== urgencyFilter) {
                return false;
            }

            // Resource filter
            if (resourceFilter && booking.resourceType !== resourceFilter) {
                return false;
            }

            // Date range filter
            if (dateRange) {
                const bookingDate = new Date(booking.createdAt);
                const now = new Date();

                switch (dateRange) {
                    case 'today':
                        if (bookingDate.toDateString() !== now.toDateString()) return false;
                        break;
                    case 'week':
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        if (bookingDate < weekAgo) return false;
                        break;
                    case 'month':
                        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        if (bookingDate < monthAgo) return false;
                        break;
                    case 'year':
                        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                        if (bookingDate < yearAgo) return false;
                        break;
                }
            }

            return true;
        });
    }, [bookings, debouncedSearchTerm, statusFilter, urgencyFilter, resourceFilter, dateRange]);

    // Memoized paginated bookings
    const paginatedBookings = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredBookings.slice(startIndex, endIndex);
    }, [filteredBookings, currentPage, itemsPerPage]);

    // Calculate total pages
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

    // Load bookings
    const loadBookings = async () => {
        setLoading(true);
        setError('');

        try {
            await performanceMonitor.measureAsync('loadBookingHistory', async () => {
                let response;

                if (userId) {
                    response = await bookingAPI.getUserBookings(userId);
                } else if (hospitalId) {
                    response = await bookingAPI.getHospitalBookings(hospitalId);
                } else {
                    throw new Error('Either userId or hospitalId must be provided');
                }

                if (response.data.success) {
                    setBookings(response.data.data || []);
                    setTotalItems(response.data.data?.length || 0);
                } else {
                    setError('Failed to load booking history');
                }
            });
        } catch (err: any) {
            console.error('Error loading bookings:', err);
            setError(err.response?.data?.error || 'Failed to load booking history');
        } finally {
            setLoading(false);
        }
    };

    // Load bookings on mount and when filters change
    useEffect(() => {
        loadBookings();
    }, [userId, hospitalId]);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, statusFilter, urgencyFilter, resourceFilter, dateRange, itemsPerPage]);

    // Update total items when filtered bookings change
    useEffect(() => {
        setTotalItems(filteredBookings.length);
    }, [filteredBookings.length]);

    const getResourceIcon = (type: string) => {
        switch (type) {
            case 'beds': return <Bed className="w-4 h-4" />;
            case 'icu': return <Heart className="w-4 h-4" />;
            case 'operationTheatres': return <Scissors className="w-4 h-4" />;
            default: return <Activity className="w-4 h-4" />;
        }
    };

    const getResourceLabel = (type: string) => {
        switch (type) {
            case 'beds': return 'Hospital Bed';
            case 'icu': return 'ICU';
            case 'operationTheatres': return 'Operation Theatre';
            default: return type;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'approved': return 'bg-green-100 text-green-800 border-green-200';
            case 'declined': return 'bg-red-100 text-red-800 border-red-200';
            case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getUrgencyColor = (urgency: string) => {
        switch (urgency) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('');
        setUrgencyFilter('');
        setResourceFilter('');
        setDateRange('');
    };

    const exportBookings = () => {
        const csvContent = [
            // Header
            ['Reference', 'Patient', 'Hospital', 'Resource', 'Status', 'Urgency', 'Date', 'Scheduled'].join(','),
            // Data
            ...filteredBookings.map(booking => [
                booking.bookingReference,
                booking.patientName,
                booking.hospitalName,
                getResourceLabel(booking.resourceType),
                booking.status,
                booking.urgency,
                new Date(booking.createdAt).toLocaleDateString(),
                new Date(booking.scheduledDate).toLocaleDateString()
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `booking-history-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className={className}>
            {/* Filters */}
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Filter className="w-5 h-5" />
                                Filter Booking History
                            </CardTitle>
                            <CardDescription>
                                Search and filter your booking history
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={exportBookings} disabled={filteredBookings.length === 0}>
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </Button>
                            <Button variant="outline" onClick={loadBookings} disabled={loading}>
                                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Search
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Patient, reference, hospital..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Status
                            </label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All statuses</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="declined">Declined</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Urgency
                            </label>
                            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All urgencies" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All urgencies</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Resource
                            </label>
                            <Select value={resourceFilter} onValueChange={setResourceFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All resources" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All resources</SelectItem>
                                    <SelectItem value="beds">Hospital Bed</SelectItem>
                                    <SelectItem value="icu">ICU</SelectItem>
                                    <SelectItem value="operationTheatres">Operation Theatre</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Date Range
                            </label>
                            <Select value={dateRange} onValueChange={setDateRange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All time" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All time</SelectItem>
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="week">Last 7 days</SelectItem>
                                    <SelectItem value="month">Last 30 days</SelectItem>
                                    <SelectItem value="year">Last year</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-end">
                            <Button variant="outline" onClick={clearFilters} className="w-full">
                                Clear Filters
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Results header */}
            <div className="flex items-center justify-between mb-4">
                <PaginationInfo
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                />
                <ItemsPerPageSelector
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                    options={[5, 10, 20, 50]}
                />
            </div>

            {/* Error state */}
            {error && (
                <Card className="mb-6 border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                        <div className="text-center text-red-800">
                            <p>{error}</p>
                            <Button variant="outline" onClick={loadBookings} className="mt-2">
                                Try Again
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Loading state */}
            {loading && (
                <div className="space-y-4">
                    {Array.from({ length: itemsPerPage }).map((_, i) => (
                        <BookingCardLoading key={i} />
                    ))}
                </div>
            )}

            {/* Booking list */}
            {!loading && (
                <div className="space-y-4">
                    {paginatedBookings.length === 0 ? (
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center py-8">
                                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-xl font-medium text-gray-900 mb-2">
                                        No bookings found
                                    </h3>
                                    <p className="text-gray-600 mb-4">
                                        {filteredBookings.length === 0 && bookings.length > 0
                                            ? "Try adjusting your search criteria or filters."
                                            : "No booking history available."}
                                    </p>
                                    {filteredBookings.length === 0 && bookings.length > 0 && (
                                        <Button onClick={clearFilters} variant="outline">
                                            Clear All Filters
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        paginatedBookings.map((booking) => (
                            <Card key={booking.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                {getResourceIcon(booking.resourceType)}
                                                <span className="font-medium">{getResourceLabel(booking.resourceType)}</span>
                                            </div>
                                            <Badge className={getStatusColor(booking.status)}>
                                                {booking.status}
                                            </Badge>
                                            <Badge className={getUrgencyColor(booking.urgency)}>
                                                {booking.urgency}
                                            </Badge>
                                        </div>
                                        <span className="text-sm text-gray-500">
                                            {booking.bookingReference}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                                <User className="w-4 h-4" />
                                                <span>Patient</span>
                                            </div>
                                            <p className="font-medium">{booking.patientName}</p>
                                            <p className="text-sm text-gray-600">
                                                {booking.patientAge} years, {booking.patientGender}
                                            </p>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                                <Building2 className="w-4 h-4" />
                                                <span>Hospital</span>
                                            </div>
                                            <p className="font-medium">{booking.hospitalName}</p>
                                            {booking.hospitalCity && (
                                                <p className="text-sm text-gray-600">
                                                    {booking.hospitalCity}, {booking.hospitalState}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                                <Calendar className="w-4 h-4" />
                                                <span>Scheduled</span>
                                            </div>
                                            <p className="font-medium">
                                                {new Date(booking.scheduledDate).toLocaleDateString()}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                {booking.estimatedDuration}h duration
                                            </p>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                                <Clock className="w-4 h-4" />
                                                <span>Created</span>
                                            </div>
                                            <p className="font-medium">
                                                {new Date(booking.createdAt).toLocaleDateString()}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                {new Date(booking.createdAt).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>

                                    {booking.medicalCondition && (
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                            <p className="text-sm text-gray-600 mb-1">Medical Condition:</p>
                                            <p className="text-sm">{booking.medicalCondition}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div className="mt-6 flex justify-center">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}
        </div>
    );
};

export default PaginatedBookingHistory;