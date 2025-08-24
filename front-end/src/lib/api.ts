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

// Public API client for guest access (no authentication required)
const publicApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Public API request interceptor (adds guest session but no auth)
publicApi.interceptors.request.use(
  (config) => {
    // Add guest session ID if available
    const guestSession = localStorage.getItem('guestSession');
    if (guestSession) {
      try {
        const session = JSON.parse(guestSession);
        config.headers['X-Guest-Session'] = session.sessionId;
      } catch (error) {
        // Invalid guest session, ignore
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Public API response interceptor (no auth redirects)
publicApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect on 401 for public endpoints
    return Promise.reject(error);
  }
);

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
      // Retry attempt ${attempt}/${maxRetries} after ${waitTime}ms
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
};

// Request interceptor with guest session support
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add guest session ID if in guest mode
    const guestSession = localStorage.getItem('guestSession');
    if (guestSession && !token) {
      try {
        const session = JSON.parse(guestSession);
        config.headers['X-Guest-Session'] = session.sessionId;
      } catch (error) {
        // Invalid guest session, ignore
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with guest mode support
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect to login if it's not a login request itself
      // This prevents redirecting when login fails due to wrong credentials
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      const isPublicEndpoint = error.config?.url?.includes('/hospitals') || 
                              error.config?.url?.includes('/blood');
      
      if (!isLoginRequest && !isPublicEndpoint) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Store current path for redirect after login
        const currentPath = window.location.pathname;
        const returnUrl = currentPath !== '/' ? `?returnUrl=${encodeURIComponent(currentPath)}` : '';
        
        window.location.href = `/login${returnUrl}`;
      }
    }
    return Promise.reject(error);
  }
);

// Hospital API with guest support
export const hospitalAPI = {
  // Public endpoints (work for both authenticated and guest users)
  getAll: () => publicApi.get('/hospitals'),
  getById: (id: number) => publicApi.get(`/hospitals/${id}`),
  search: (params: any) => publicApi.get('/hospitals/search', { params }),
  getWithResources: (params?: any) => publicApi.get('/hospital-resources', { params }),
  getHospitalsWithResources: (params?: any) => publicApi.get('/hospital-resources', { params }),
  getHospitalResources: (id: number) => publicApi.get(`/hospital-resources/${id}`),
  updateResources: (id: number, data: any) => api.put(`/hospital-resources/${id}`, data),
  updateResourceType: (id: number, resourceType: string, data: any) => 
    api.put(`/hospital-resources/${id}/${resourceType}`, data),
  checkResourceAvailability: (id: number, resourceType: string, params?: any) =>
    api.get(`/hospital-resources/${id}/${resourceType}/availability`, { params }),
  getResourceUtilization: (id: number) => api.get(`/hospital-resources/${id}/utilization`),
  getResourceAuditLog: (id: number, params?: any) => api.get(`/hospital-resources/${id}/audit-log`, { params }),
  initializeResources: (id: number) => api.post(`/hospital-resources/${id}/initialize`),
  getResourceSummary: () => api.get('/hospital-resources/summary'),
  
  create: (data: any) => api.post('/hospitals', data),
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
  cancel: (id: number, data?: any) => api.delete(`/bookings/${id}`, { data }),
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

// Blood Request API with guest support
export const bloodAPI = {
  // Public endpoints (work for both authenticated and guest users)
  createRequest: (data: any) => publicApi.post('/blood/request', data),
  getAllRequests: (params?: any) => publicApi.get('/blood/requests', { params }),
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
  getHospitalPricing: (hospitalId: number) => api.get(`/hospitals/${hospitalId}/pricing`),
  updateHospitalPricing: (hospitalId: number, data: any) => api.put(`/hospitals/${hospitalId}/pricing`, data),
  getPricingHistory: (hospitalId: number, params?: any) => api.get(`/hospitals/${hospitalId}/pricing/history`, { params }),
  calculateBookingAmount: (data: any) => api.post('/pricing/calculate', data),
  bulkUpdatePricing: (hospitalId: number, data: any) => api.post(`/hospitals/${hospitalId}/pricing/bulk`, data),
  getPricingComparison: (params?: any) => api.get('/pricing/comparison', { params }),
};

// Revenue API
export const revenueAPI = {
  getHospitalRevenue: (hospitalId: number, params?: any) => api.get(`/revenue/hospital/${hospitalId}`, { params }),
  getAdminRevenue: (params?: any) => api.get('/revenue/admin', { params }),
  getRevenueAnalytics: (params?: any) => api.get('/revenue/analytics', { params }),
  getAdminServiceCharges: (params?: any) => api.get('/admin/service-charges', { params }),
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
  markAllAsRead: () => api.put('/notifications/read-all'),
  bulkMarkAsRead: (notificationIds: number[]) => api.put('/notifications/bulk-read', { notificationIds }),
  deleteNotification: (id: number) => api.delete(`/notifications/${id}`),
  getNotificationStatistics: (params?: any) => api.get('/notifications/statistics', { params }),
  getHospitalNotifications: (hospitalId: number, params?: any) => 
    api.get(`/notifications/hospital/${hospitalId}`, { params }),
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

// Health check
export const healthAPI = {
  check: () => api.get('/health'),
};

// API client selection utility
export const getApiClient = (requireAuth: boolean = true) => {
  return requireAuth ? api : publicApi;
};

// Guest-specific API methods
export const guestAPI = {
  // Hospital browsing for guests
  getHospitals: (params?: any) => publicApi.get('/hospitals', { params }),
  getHospitalDetails: (id: number) => publicApi.get(`/hospitals/${id}`),
  getHospitalResources: (id: number) => publicApi.get(`/hospital-resources/${id}`),
  searchHospitals: (params: any) => publicApi.get('/hospitals/search', { params }),
  
  // Blood donation for guests
  createBloodRequest: (data: any) => publicApi.post('/blood/request', data),
  getBloodRequests: (params?: any) => publicApi.get('/blood/requests', { params }),
  
  // Analytics tracking for guests (if implemented)
  trackActivity: (data: any) => publicApi.post('/analytics/guest-activity', data),
};

// Utility to check if an endpoint requires authentication
export const requiresAuthentication = (endpoint: string): boolean => {
  const publicEndpoints = [
    '/hospitals',
    '/hospital-resources',
    '/blood/requests',
    '/blood/request',
    '/auth/login',
    '/auth/register',
    '/health',
  ];
  
  return !publicEndpoints.some(publicEndpoint => 
    endpoint.includes(publicEndpoint)
  );
};

// Enhanced API call wrapper with guest support
export const apiCall = async <T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    params?: any;
    requireAuth?: boolean;
  } = {}
): Promise<T> => {
  const { method = 'GET', data, params, requireAuth } = options;
  
  // Determine if auth is required
  const needsAuth = requireAuth !== undefined ? requireAuth : requiresAuthentication(endpoint);
  const client = getApiClient(needsAuth);
  
  try {
    let response;
    
    switch (method) {
      case 'GET':
        response = await client.get(endpoint, { params });
        break;
      case 'POST':
        response = await client.post(endpoint, data);
        break;
      case 'PUT':
        response = await client.put(endpoint, data);
        break;
      case 'DELETE':
        response = await client.delete(endpoint, { data });
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
    
    return response.data;
  } catch (error: any) {
    // Enhanced error handling for guest vs authenticated users
    if (error.response?.status === 401 && !needsAuth) {
      // This shouldn't happen for public endpoints, but handle gracefully
      console.warn('Unexpected 401 on public endpoint:', endpoint);
    }
    
    throw error;
  }
};

export { publicApi };
export default api; 