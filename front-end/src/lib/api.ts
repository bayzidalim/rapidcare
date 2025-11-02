import axios from 'axios';
import { safeApiCall, validateRejectionReason, rateLimiter, getUserFriendlyErrorMessage } from './errorHandling';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Retry utility for critical operations
const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on client errors (4xx) except for 408 (timeout) and 429 (rate limit)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        if (error.response.status !== 408 && error.response.status !== 429) {
          throw error;
        }
      }
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff
      const waitTime = delay * Math.pow(2, attempt - 1);
      console.log(`Retry attempt ${attempt}/${maxRetries} after ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`Making request to: ${config.baseURL}${config.url}`);
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('API Error:', error);
    if (error.response?.status === 401) {
      // Only redirect to login if it's not a login request itself
      // This prevents redirecting when login fails due to wrong credentials
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      if (!isLoginRequest) {
        console.log('Token expired or invalid, removing token and redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Use window.location.href for navigation outside of React components
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Hospital API
export const hospitalAPI = {
  getAll: () => api.get('/hospitals'),
  getById: (id: number) => api.get(`/hospitals/${id}`),
  search: (params: any) => api.get('/hospitals/search', { params }),
  getWithResources: (params: any) => api.get('/hospitals/resources', { params }),
  create: (data: any) => api.post('/hospitals', data),
  updateResources: (id: number, data: any) => api.put(`/hospitals/${id}/resources`, data),
  update: (id: number, data: any) => api.put(`/hospitals/${id}`, data),
  delete: (id: number) => api.delete(`/hospitals/${id}`),
  getMyHospitals: () => api.get('/hospitals/my-hospitals'),
  getMyHospital: () => api.get('/hospitals/my-hospital'),
  updateMyHospitalResources: (data: any) => api.put('/hospitals/my-hospital/resources', data),
  resubmitHospital: (data: any) => api.put('/hospitals/my-hospital', data),
  getResourceHistory: (id: number, params?: any) => api.get(`/hospitals/${id}/resources/history`, { params }),
  validateResourceUpdate: (id: number, data: any) => api.post(`/hospitals/${id}/resources/validate`, data),

  // Analytics endpoints
  getAnalyticsDashboard: (id: number, params?: any) => api.get(`/hospitals/${id}/analytics/dashboard`, { params }),
  getResourceUtilizationAnalytics: (id: number, params?: any) => api.get(`/hospitals/${id}/analytics/resource-utilization`, { params }),
  getBookingHistoryAnalytics: (id: number, params?: any) => api.get(`/hospitals/${id}/analytics/booking-history`, { params }),
  getResourceUsagePatterns: (id: number, params?: any) => api.get(`/hospitals/${id}/analytics/usage-patterns`, { params }),
  getPerformanceMetrics: (id: number, params?: any) => api.get(`/hospitals/${id}/analytics/performance`, { params }),
};

// Booking API
export const bookingAPI = {
  create: (data: any) => api.post('/bookings', data),
  getUserBookings: (params?: any) => api.get('/bookings/user', { params }),
  getMyBookings: () => api.get('/bookings/my-bookings'),
  getById: (id: number) => api.get(`/bookings/${id}`),
  updateStatus: (id: number, data: any) => api.put(`/bookings/${id}/status`, data),
  cancel: (id: number, data?: any) => api.put(`/bookings/${id}/cancel`, data),
  getAll: (params?: any) => api.get('/bookings', { params }),

  // Payment endpoint
  processPayment: (data: any) => api.post('/bookings/payment', data),

  // Booking approval endpoints
  getPendingBookings: (hospitalId: number, params?: any) =>
    api.get(`/bookings/hospital/${hospitalId}/pending`, { params }),
  approveBooking: (id: number, data?: any) => api.put(`/bookings/${id}/approve`, data),
  declineBooking: (id: number, data: any) => api.put(`/bookings/${id}/decline`, data),
  getBookingHistory: (hospitalId: number, params?: any) =>
    api.get(`/bookings/hospital/${hospitalId}/history`, { params }),
};

// Blood Request API
export const bloodAPI = {
  createRequest: (data: any) => api.post('/blood/request', data),
  getAllRequests: (params?: any) => api.get('/blood/requests', { params }),
  getMyRequests: () => api.get('/blood/my-requests'),
  searchRequests: (params: any) => api.get('/blood/requests/search', { params }),
  getRequestById: (id: number) => api.get(`/blood/requests/${id}`),
  updateRequestStatus: (id: number, data: any) =>
    api.put(`/blood/requests/${id}/status`, data),
  matchDonor: (id: number, data: any) =>
    api.post(`/blood/requests/${id}/match`, data),
  updateDonorStatus: (id: number, donorId: number, data: any) =>
    api.put(`/blood/requests/${id}/donors/${donorId}`, data),
};

// Auth API
export const authAPI = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  changePassword: (data: any) => api.put('/auth/change-password', data),
  // Add a method to get user profile with balance
  getUserWithBalance: () => api.get('/auth/profile'),
};

// Admin API
export const adminAPI = {
  // Users
  getAllUsers: () => api.get('/admin/users'),
  getUserById: (id: number) => api.get(`/admin/users/${id}`),
  createUser: (data: any) => api.post('/admin/users', data),
  updateUser: (id: number, data: any) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),

  // Hospitals
  getAllHospitals: () => api.get('/admin/hospitals'),
  getHospitalById: (id: number) => api.get(`/admin/hospitals/${id}`),
  createHospital: (data: any) => api.post('/admin/hospitals', data),
  updateHospital: (id: number, data: any) => api.put(`/admin/hospitals/${id}`, data),
  deleteHospital: (id: number) => api.delete(`/admin/hospitals/${id}`),

  // Bookings
  getAllBookings: () => api.get('/admin/bookings'),
  getBookingById: (id: number) => api.get(`/admin/bookings/${id}`),
  updateBooking: (id: number, data: any) => api.put(`/admin/bookings/${id}`, data),
  deleteBooking: (id: number) => api.delete(`/admin/bookings/${id}`),

  // Blood Requests
  getAllBloodRequests: () => api.get('/admin/blood-requests'),
  getBloodRequestById: (id: number) => api.get(`/admin/blood-requests/${id}`),
  updateBloodRequest: (id: number, data: any) => api.put(`/admin/blood-requests/${id}`, data),
  deleteBloodRequest: (id: number) => api.delete(`/admin/blood-requests/${id}`),

  // Stats
  getStats: () => api.get('/admin/stats'),

  // Hospital Approvals with enhanced error handling
  getPendingHospitals: async () => {
    try {
      const response = await api.get('/admin/hospitals/pending');
      return response;
    } catch (error: any) {
      console.error('Error fetching pending hospitals:', error);
      throw new Error(
        error.response?.data?.error || 
        'Failed to fetch pending hospitals. Please check your connection and try again.'
      );
    }
  },

  approveHospital: async (id: number, data?: any) => {
    if (!id || isNaN(id)) {
      throw new Error('Invalid hospital ID provided');
    }

    return retryOperation(async () => {
      try {
        const response = await api.put(`/admin/hospitals/${id}/approve`, data || {});
        return response;
      } catch (error: any) {
        console.error(`Error approving hospital ${id}:`, error);
        
        // Handle specific error codes
        if (error.response?.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        } else if (error.response?.status === 404) {
          throw new Error('Hospital not found or may have been deleted.');
        } else if (error.response?.status === 409) {
          throw new Error(
            error.response?.data?.error || 
            'Hospital cannot be approved in its current state. It may have already been processed.'
          );
        } else if (error.response?.data?.error) {
          throw new Error(error.response.data.error);
        } else {
          throw new Error('Failed to approve hospital. Please try again.');
        }
      }
    }, 2, 1500); // 2 retries with 1.5s initial delay
  },

  rejectHospital: async (id: number, data: { reason: string }) => {
    if (!id || isNaN(id)) {
      throw new Error('Invalid hospital ID provided');
    }

    if (!data?.reason || typeof data.reason !== 'string') {
      throw new Error('Rejection reason is required');
    }

    const trimmedReason = data.reason.trim();
    if (trimmedReason.length < 10) {
      throw new Error('Rejection reason must be at least 10 characters long');
    }

    if (trimmedReason.length > 500) {
      throw new Error('Rejection reason must be less than 500 characters');
    }

    return retryOperation(async () => {
      try {
        const response = await api.put(`/admin/hospitals/${id}/reject`, { 
          reason: trimmedReason 
        });
        return response;
      } catch (error: any) {
        console.error(`Error rejecting hospital ${id}:`, error);
        
        // Handle specific error codes
        if (error.response?.status === 403) {
          throw new Error('Access denied. Admin privileges required.');
        } else if (error.response?.status === 404) {
          throw new Error('Hospital not found or may have been deleted.');
        } else if (error.response?.status === 409) {
          throw new Error(
            error.response?.data?.error || 
            'Hospital cannot be rejected in its current state. It may have already been processed.'
          );
        } else if (error.response?.data?.error) {
          throw new Error(error.response.data.error);
        } else {
          throw new Error('Failed to reject hospital. Please try again.');
        }
      }
    }, 2, 1500); // 2 retries with 1.5s initial delay
  },

  getHospitalApprovalStats: async () => {
    try {
      const response = await api.get('/admin/hospitals/approval-stats');
      return response;
    } catch (error: any) {
      console.error('Error fetching approval statistics:', error);
      throw new Error(
        error.response?.data?.error || 
        'Failed to fetch approval statistics. Please check your connection and try again.'
      );
    }
  },

  // Get detailed approval analytics with time range
  getDetailedApprovalAnalytics: async (timeRange: string = '30d') => {
    try {
      const response = await api.get(`/admin/hospitals/detailed-analytics?timeRange=${timeRange}`);
      return response;
    } catch (error: any) {
      console.error('Error fetching detailed analytics:', error);
      throw new Error(
        error.response?.data?.error || 
        'Failed to fetch detailed approval analytics. Please check your connection and try again.'
      );
    }
  },

  // Get approval workflow efficiency metrics
  getApprovalWorkflowEfficiency: async () => {
    try {
      const response = await api.get('/admin/hospitals/workflow-efficiency');
      return response;
    } catch (error: any) {
      console.error('Error fetching workflow efficiency:', error);
      throw new Error(
        error.response?.data?.error || 
        'Failed to fetch workflow efficiency metrics. Please check your connection and try again.'
      );
    }
  },

  // Admin Balance API
  getAdminBalance: () => api.get('/admin/balance'),
  getAdminBalanceSummary: (params?: any) => api.get('/admin/balance/summary', { params }),
  getAdminTransactionHistory: (params?: any) => api.get('/admin/balance/transactions', { params }),
  processWithdrawal: (data: any) => api.post('/admin/balance/withdraw', data),
  initializeAdminBalance: () => api.post('/admin/balance/initialize'),
};



// Sample Collection API
export const sampleCollectionAPI = {
  getHospitals: () => api.get('/sample-collection/hospitals'),
  getTestTypes: () => api.get('/sample-collection/test-types'),
  getHospitalTestTypes: (hospitalId: number) => api.get(`/sample-collection/hospitals/${hospitalId}/test-types`),
  calculatePricing: (data: { hospitalId: number; testTypeIds: number[] }) => api.post('/sample-collection/calculate-pricing', data),
  submitRequest: (data: any) => api.post('/sample-collection/submit-request', data),
  getUserRequests: (params?: any) => api.get('/sample-collection/requests', { params }),
  getRequestById: (requestId: number) => api.get(`/sample-collection/requests/${requestId}`),
  cancelRequest: (requestId: number, reason?: string) => api.put(`/sample-collection/requests/${requestId}/cancel`, { reason }),
};

// Payment API
export const paymentAPI = {
  processPayment: (data: any) => api.post('/payments/process', data),
  getReceipt: (transactionId: string) => api.get(`/payments/${transactionId}/receipt`),
  processRefund: (transactionId: string, data: any) => api.post(`/payments/${transactionId}/refund`, data),
  getPaymentHistory: (userId?: number, params?: any) =>
    userId ? api.get(`/payments/history/${userId}`, { params }) : api.get('/payments/history', { params }),
  retryPayment: (transactionId: string, data: any) => api.post(`/payments/${transactionId}/retry`, data),
  getTransactionDetails: (transactionId: string) => api.get(`/payments/transaction/${transactionId}`),
  validatePaymentData: (data: any) => api.post('/payments/validate', data),
};

// Pricing API
export const pricingAPI = {
  getHospitalPricing: (hospitalId: number) => api.get(`/pricing/hospitals/${hospitalId}/pricing`),
  updateHospitalPricing: (hospitalId: number, data: any) => api.put(`/pricing/hospitals/${hospitalId}/pricing`, data),
  getPricingHistory: (hospitalId: number, params?: any) => api.get(`/pricing/hospitals/${hospitalId}/pricing/history`, { params }),
  calculateBookingAmount: (data: any) => api.post('/pricing/calculate', data),
  bulkUpdatePricing: (hospitalId: number, data: any) => api.post(`/pricing/hospitals/${hospitalId}/pricing/bulk`, data),
  getPricingComparison: (params?: any) => api.get('/pricing/comparison', { params }),
};

// Revenue API
export const revenueAPI = {
  getHospitalRevenue: (hospitalId: number, params?: any) => api.get(`/revenue/hospital/${hospitalId}`, { params }),
  getAdminRevenue: (params?: any) => api.get('/revenue/admin', { params }),
  getFinancialAnalytics: (params?: any) => api.get('/admin/financials', { params }),
  getAdminServiceCharges: (params?: any) => api.get('/admin/service-charges', { params }),
  getRevenueAnalytics: (params?: any) => api.get('/revenue/analytics', { params }),
  getHospitalBalance: (hospitalId: number) => api.get(`/balances/hospital/${hospitalId}`),
  getAdminBalance: () => api.get('/balances/admin'),
  getReconciliationReport: (params?: any) => api.get('/revenue/reconciliation', { params }),
  getLowBalanceAlerts: (params?: any) => api.get('/revenue/low-balance-alerts', { params }),
  distributeRevenue: (data: any) => api.post('/revenue/distribute', data),
  bulkDistributeRevenue: (data: any) => api.post('/revenue/bulk-distribute', data),
  getServiceCharges: (params?: any) => api.get('/revenue/service-charges', { params }),
  getHospitalDistribution: (params?: any) => api.get('/revenue/hospital-distribution', { params }),
  getBalanceSummary: (params?: any) => api.get('/revenue/balance-summary', { params }),
  getAuditTrail: (params?: any) => api.get('/revenue/audit-trail', { params }),
};

// Notification API
export const notificationAPI = {
  getUserNotifications: (params?: any) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
  deleteNotification: (id: number) => api.delete(`/notifications/${id}`),
};

// Audit API
export const auditAPI = {
  getEntityAuditTrail: (entityType: string, entityId: number, params?: any) =>
    api.get(`/audit/entity/${entityType}/${entityId}`, { params }),
  getApprovalMetrics: (params?: any) => api.get('/audit/metrics/approval', { params }),
  getApprovalEfficiency: () => api.get('/audit/efficiency/approval'),
  getUserAuditTrail: (userId: number, params?: any) =>
    api.get(`/audit/user/${userId}`, { params }),
};

// Review API
export const reviewAPI = {
  // Get reviews for a hospital
  getHospitalReviews: (hospitalId: number, params?: {
    page?: number;
    limit?: number;
    rating?: number;
    sortBy?: string;
    sortOrder?: string;
  }) => api.get(`/reviews/hospitals/${hospitalId}`, { params }),
  
  // Get user's reviews
  getUserReviews: (params?: {
    page?: number;
    limit?: number;
  }) => api.get('/reviews/user', { params }),
  
  // Create a review
  createReview: (data: {
    hospitalId: number;
    bookingId?: number;
    rating: number;
    title?: string;
    comment?: string;
    isAnonymous?: boolean;
  }) => api.post('/reviews', data),
  
  // Update a review
  updateReview: (id: number, data: {
    rating?: number;
    title?: string;
    comment?: string;
    isAnonymous?: boolean;
  }) => api.put(`/reviews/${id}`, data),
  
  // Delete a review
  deleteReview: (id: number) => api.delete(`/reviews/${id}`),
  
  // Add helpful vote
  addHelpfulVote: (id: number, isHelpful: boolean) => api.post(`/reviews/${id}/helpful`, { isHelpful }),
  
  // Get all reviews (admin)
  getAllReviews: (params?: {
    page?: number;
    limit?: number;
    hospitalId?: number;
    userId?: number;
    rating?: number;
  }) => api.get('/reviews/admin/all', { params }),
};

// Health check
export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;