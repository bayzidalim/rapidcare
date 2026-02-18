// User Types
export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  userType: 'user' | 'hospital-authority' | 'admin';
  role?: string;
  hospitalId?: number;
  permissions?: string;
  balance?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Hydration-Safe Authentication Types
export type HydrationSafeAuthState = boolean | null;

export interface HydrationSafeAuthData {
  isAuthenticated: HydrationSafeAuthState;
  isHydrated: boolean;
  user: User | null;
  hasAuthChecked: boolean;
  error: string | null;
  isRetrying: boolean;
}

export interface UseHydrationSafeAuthReturn {
  auth: HydrationSafeAuthData;
  checkAuth: () => void;
  refreshAuth: () => void;
  clearError: () => void;
}

export interface HydrationState {
  isHydrated: boolean;
  hasAuthChecked: boolean;
  initialRenderComplete: boolean;
}

export type AuthenticationState = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContext {
  state: AuthenticationState;
  user: User | null;
  isHydrated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  checkAuthStatus: () => void;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// Hospital Types
export interface Hospital {
  id: number;
  name: string;
  description?: string;
  type?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contact: {
    phone: string;
    email: string;
    emergency: string;
  };
  capacity?: {
    totalBeds: number;
    icuBeds: number;
    operationTheaters: number;
  };
  resources?: {
    beds: {
      total: number;
      available: number;
      occupied: number;
    };
    icu: {
      total: number;
      available: number;
      occupied: number;
    };
    operationTheatres: {
      total: number;
      available: number;
      occupied: number;
    };
  };
  pricing?: {
    beds: {
      baseRate: number;
      hourlyRate?: number;
      minimumCharge?: number;
      maximumCharge?: number;
      currency: string;
    };
    icu: {
      baseRate: number;
      hourlyRate?: number;
      minimumCharge?: number;
      maximumCharge?: number;
      currency: string;
    };
    operationTheatres: {
      baseRate: number;
      hourlyRate?: number;
      minimumCharge?: number;
      maximumCharge?: number;
      currency: string;
    };
  };
  surgeons?: Surgeon[];
  services: string[];
  rating?: number;
  isActive: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedBy?: number;
  approvedAt?: string;
  rejectionReason?: string;
  submittedAt?: string;
  lastUpdated?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Surgeon {
  id?: number;
  name: string;
  specialization: string;
  available: boolean;
  schedule: {
    days: string[];
    hours: string;
  };
}

// Hospital Approval Types
export interface PendingHospital extends Hospital {
  authority: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
}

export interface HospitalApprovalStats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  averageApprovalTime: number;
  recentApprovals: Array<{
    hospitalId: number;
    hospitalName: string;
    approvedAt: string;
    approvedBy: number;
  }>;
  recentRejections: Array<{
    hospitalId: number;
    hospitalName: string;
    rejectedAt: string;
    rejectionReason: string;
  }>;
}

// Booking Types
export interface Booking {
  id: number;
  userId: number;
  hospitalId: number | Hospital;
  resourceType: 'bed' | 'icu' | 'operationTheatres';
  patientName: string;
  patientAge: number;
  patientGender: 'male' | 'female' | 'other';
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalCondition: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  surgeonId?: number;
  scheduledDate: string;
  estimatedDuration: number;
  status: 'pending' | 'approved' | 'declined' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  payment: {
    amount: number;
    status: 'pending' | 'paid' | 'refunded';
    method?: string;
    transactionId?: string;
  };
  notes?: string;
  rapidAssistance?: boolean;
  rapidAssistanceCharge?: number;
  rapidAssistantName?: string;
  rapidAssistantPhone?: string;
  createdAt: string;
  updatedAt: string;

  // Booking approval fields
  approvedBy?: number;
  approvedAt?: string;
  declineReason?: string;
  authorityNotes?: string;
  resourcesAllocated?: number;
  expiresAt?: string;

  // Enhanced fields for approval interface
  userName?: string;
  userPhone?: string;
  userEmail?: string;
  hospitalName?: string;
  urgencyOrder?: number;
  daysSinceCreated?: number;
  waitingTime?: number;
  estimatedCompletionDate?: string;
  resourceAvailability?: {
    available: boolean;
    current: number;
    total: number;
    message?: string;
  };
  canApprove?: boolean;
}

// Blood Request Types
export interface BloodRequest {
  id: number | string;
  requesterId: number;
  requesterName: string;
  requesterPhone: string;
  bloodType: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  units: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  hospital: {
    name: string;
    address: string;
    contact: string;
  };
  patientName?: string;
  patientAge?: number;
  medicalCondition?: string;
  requiredBy: string;
  status: 'pending' | 'matched' | 'completed' | 'cancelled';
  matchedDonors: MatchedDonor[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchedDonor {
  donorId: number;
  donorName: string;
  donorPhone: string;
  matchedAt: string;
  status: 'pending' | 'confirmed' | 'donated' | 'cancelled';
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
  error?: string;
}

// Form Types
export interface BookingFormData {
  userId: number;
  hospitalId: number;
  resourceType: 'bed' | 'icu' | 'operationTheatres';
  patientName: string;
  patientAge: number;
  patientGender: 'male' | 'female' | 'other';
  // Flat emergency contact fields to match backend
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  medicalCondition: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  surgeonId?: number;
  scheduledDate: string;
  estimatedDuration: number;
  payment: {
    amount: number;
    status: 'pending';
  };
}

export interface BloodRequestFormData {
  requesterId: number;
  requesterName: string;
  requesterPhone: string;
  bloodType: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  units: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  hospital: {
    name: string;
    address: string;
    contact: string;
  };
  patientName?: string;
  patientAge?: number;
  medicalCondition?: string;
  requiredBy: string;
  notes?: string;
}

// Notification Types
export interface Notification {
  id: number;
  userId: number;
  type: 'hospital_approved' | 'hospital_rejected' | 'hospital_resubmitted' | 'general';
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Audit Trail Types
export interface AuditTrailEntry {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  userId?: number;
  userType?: string;
  userName?: string;
  userEmail?: string;
  oldData: any;
  newData: any;
  metadata: any;
  createdAt: string;
}

export interface ApprovalMetrics {
  action: string;
  count: number;
  avg_approval_time_hours?: number;
}

export interface ApprovalEfficiency {
  total_submissions: number;
  total_approvals: number;
  total_rejections: number;
  total_resubmissions: number;
  avg_approval_time_hours: number;
  approval_rate: string;
  rejection_rate: string;
  resubmission_rate: string;
}

// Search and Filter Types
export interface HospitalSearchParams {
  q?: string;
  city?: string;
  service?: string;
  resourceType?: 'beds' | 'icu' | 'operationTheatres';
  minAvailable?: number;
}

export interface BloodRequestSearchParams {
  bloodType?: string;
  city?: string;
  urgency?: string;
  status?: string;
}

// Payment Types
export interface PaymentData {
  paymentMethod: 'credit_card' | 'debit_card' | 'bank_transfer' | 'digital_wallet';
  cardNumber?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cvv?: string;
  cardHolderName?: string;
  cardType?: string;
  bankAccount?: string;
  routingNumber?: string;
  walletId?: string;
  walletProvider?: string;
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface Transaction {
  id: number;
  bookingId: number;
  userId: number;
  hospitalId: number;
  amount: number;
  serviceCharge: number;
  hospitalAmount: number;
  paymentMethod: string;
  transactionId: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentData?: any;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Related data
  patientName?: string;
  resourceType?: string;
  scheduledDate?: string;
  hospitalName?: string;
  userName?: string;
  userEmail?: string;
  rapidAssistance?: boolean;
  rapidAssistanceCharge?: number;
  rapidAssistantName?: string;
  rapidAssistantPhone?: string;
}

export interface PaymentReceipt {
  receiptId: string;
  transactionId: string;
  bookingId: number;
  patientName?: string;
  hospitalName?: string;
  resourceType?: string;
  scheduledDate?: string;
  amount: number;
  serviceCharge: number;
  hospitalAmount: number;
  paymentMethod: string;
  paymentDate?: string;
  status: string;
  receiptDate: string;
  rapidAssistance?: boolean;
  rapidAssistanceCharge?: number;
  rapidAssistantName?: string;
  rapidAssistantPhone?: string;
}

export interface PaymentValidation {
  isValid: boolean;
  errors: string[];
}

export interface PaymentResult {
  success: boolean;
  transaction?: Transaction;
  paymentResult?: any;
  error?: string;
  message: string;
}

// Hospital Pricing Types
export interface HospitalPricing {
  id: number;
  hospitalId: number;
  resourceType: 'beds' | 'icu' | 'operationTheatres';
  baseRate: number;
  hourlyRate?: number;
  minimumCharge?: number;
  maximumCharge?: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  // Additional fields from joins
  hospitalName?: string;
  createdByName?: string;
}

export interface PricingFormData {
  resourceType: 'beds' | 'icu' | 'operationTheatres';
  baseRate: number;
  hourlyRate?: number;
  minimumCharge?: number;
  maximumCharge?: number;
  currency?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface PricingValidation {
  isValid: boolean;
  errors: string[];
}

export interface PricingHistoryItem extends HospitalPricing {
  changeReason?: string;
  previousRate?: number;
}

export interface PricingComparison {
  hospitalName: string;
  city: string;
  baseRate: number;
  hourlyRate?: number;
  minimumCharge?: number;
  maximumCharge?: number;
  currency: string;
}

export interface PricingPreview {
  resourceType: string;
  duration: number;
  baseRate: number;
  hourlyRate?: number;
  calculatedAmount: number;
  minimumCharge?: number;
  maximumCharge?: number;
  finalAmount: number;
  breakdown: Array<{
    description: string;
    amount: number;
  }>;
}

export interface BookingCalculation {
  baseRate: number;
  hourlyRate?: number;
  duration: number;
  calculatedAmount: number;
  minimumCharge?: number;
  maximumCharge?: number;
  currency: string;
  discount?: number;
  discountPercentage?: number;
  surcharge?: number;
  finalAmount?: number;
  calculatedAt: string;
}

// Revenue Types
export interface UserBalance {
  id: number;
  userId: number;
  userType: 'hospital-authority' | 'admin';
  hospitalId?: number;
  currentBalance: number;
  totalEarnings: number;
  totalWithdrawals: number;
  pendingAmount: number;
  lastTransactionAt?: string;
  createdAt: string;
  updatedAt: string;
  // Related data
  userName?: string;
  userEmail?: string;
  hospitalName?: string;
}

export interface BalanceTransaction {
  id: number;
  balanceId: number;
  transactionId?: number;
  transactionType: 'payment_received' | 'service_charge' | 'refund_processed' | 'withdrawal' | 'adjustment';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  referenceId?: string;
  processedBy?: number;
  createdAt: string;
}

export interface RevenueAnalytics {
  totalRevenue: {
    totalTransactions: number;
    totalRevenue: number;
    totalServiceCharge: number;
    totalHospitalRevenue: number;
    averageTransactionAmount: number;
  };
  dailyAnalytics: Array<{
    date: string;
    transactionCount: number;
    totalAmount: number;
    totalServiceCharge: number;
    totalHospitalAmount: number;
    averageAmount: number;
  }>;
  currentBalance?: UserBalance;
  resourceBreakdown: Array<{
    resourceType: string;
    transactionCount: number;
    totalRevenue: number;
    averageRevenue: number;
    totalBookingAmount: number;
  }>;
  dateRange: {
    startDate?: string;
    endDate?: string;
  };
}

// Resource Management Types
export interface ResourceHistoryItem {
  id: number;
  hospitalId: number;
  resourceType: 'beds' | 'icu' | 'operationTheatres';
  changeType: 'manual_update' | 'booking_approved' | 'booking_completed' | 'booking_cancelled';
  oldValue: number;
  newValue: number;
  quantity: number;
  bookingId?: number;
  changedBy: number;
  changedByName?: string;
  reason?: string;
  timestamp: string;
}

export interface ResourceValidation {
  valid: boolean;
  message: string;
  availabilityChecks?: {
    [resourceType: string]: {
      currentlyBooked: number;
      totalCapacity: number;
      utilizationRate: number;
    };
  };
  recommendations?: Array<{
    type: 'warning' | 'info' | 'error';
    resourceType: string;
    message: string;
  }>;
}

// Booking Approval Types
export interface BookingApprovalData {
  notes?: string;
  resourcesAllocated?: number;
  scheduledDate?: string;
  autoAllocateResources?: boolean;
}

export interface BookingDeclineData {
  reason: string;
  notes?: string;
  alternativeSuggestions?: string[];
}

export interface PendingBookingsSummary {
  totalPending: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  beds: number;
  icu: number;
  operationTheatres: number;
  avgWaitingDays: number;
}

export interface BookingApprovalFilters {
  urgency?: string;
  resourceType?: string;
  limit?: number;
  sortBy?: 'urgency' | 'date' | 'patient' | 'amount';
  sortOrder?: 'asc' | 'desc';
}

// Analytics Types
export interface ResourceUtilizationMetrics {
  currentUtilization: number;
  averageUtilization: number;
  peakUtilization: number;
  totalChanges: number;
  manualUpdates: number;
  bookingAllocations: number;
}

export interface ResourceUtilizationAnalytics {
  hospitalId: number;
  period: {
    startDate?: string;
    endDate?: string;
  };
  currentResources: Array<{
    resourceType: string;
    total: number;
    available: number;
    occupied: number;
    utilizationPercentage: number;
    availabilityPercentage: number;
  }>;
  utilizationMetrics: Record<string, ResourceUtilizationMetrics>;
  peakUsagePatterns: {
    peakHours: Record<string, any[]>;
    peakDays: Record<string, any[]>;
    resourceDemand: Record<string, any[]>;
  };
  efficiencyMetrics: Array<{
    resourceType: string;
    avgProcessingTime: number;
    approvalRate: number;
    declineRate: number;
    totalRequests: number;
  }>;
  totalAuditEvents: number;
  generatedAt: string;
}

export interface BookingStatistics {
  status: string;
  resourceType: string;
  urgency: string;
  count: number;
  avgAmount: number;
  totalAmount: number;
}

export interface BookingTrend {
  date: string;
  status: string;
  resourceType: string;
  count: number;
}

export interface ResourceDemandPattern {
  resourceType: string;
  urgency: string;
  hour: string;
  dayOfWeek: string;
  demandCount: number;
}

export interface ApprovalMetrics {
  totalBookings: number;
  approvedBookings: number;
  declinedBookings: number;
  pendingBookings: number;
  avgApprovalTime: number;
  approvalRate: number;
  declineRate: number;
  avgApprovalTimeHours: number;
}

export interface PatientDemographics {
  patientGender: string;
  ageGroup: string;
  urgency: string;
  count: number;
}

export interface BookingHistoryAnalytics {
  hospitalId: number;
  period: {
    startDate?: string;
    endDate?: string;
  };
  bookingStats: BookingStatistics[];
  bookingTrends: BookingTrend[];
  resourceDemand: ResourceDemandPattern[];
  approvalMetrics: ApprovalMetrics;
  patientDemographics: PatientDemographics[];
  generatedAt: string;
}

export interface UsagePattern {
  hour?: string;
  dayOfWeek?: string;
  week?: string;
  month?: string;
  resourceType: string;
  bookingCount: number;
  approvalRate: number;
}

export interface ResourceUsagePatterns {
  hospitalId: number;
  period: {
    startDate?: string;
    endDate?: string;
  };
  hourlyPatterns: UsagePattern[];
  dailyPatterns: UsagePattern[];
  weeklyPatterns: UsagePattern[];
  seasonalPatterns: UsagePattern[];
  correlationAnalysis: Array<{
    date: string;
    resourceType: string;
    dailyDemand: number;
  }>;
  generatedAt: string;
}

export interface ResponseTimeMetrics {
  resourceType: string;
  avgResponseMinutes: number;
  minResponseMinutes: number;
  maxResponseMinutes: number;
  totalProcessed: number;
}

export interface TurnoverMetrics {
  resourceType: string;
  completedBookings: number;
  avgDuration: number;
  totalBookings: number;
}

export interface SatisfactionMetrics {
  resourceType: string;
  approvedCount: number;
  declinedCount: number;
  avgResponseHours: number;
  totalRequests: number;
  satisfactionScore: number;
  approvalRate: number;
}

export interface CapacityRecommendation {
  resourceType: string;
  type: 'increase_capacity' | 'optimize_capacity';
  priority: 'high' | 'medium' | 'low';
  message: string;
  suggestedIncrease?: number;
  potentialReduction?: number;
}

export interface PerformanceMetrics {
  hospitalId: number;
  period: {
    startDate?: string;
    endDate?: string;
  };
  responseTimeMetrics: ResponseTimeMetrics[];
  turnoverMetrics: TurnoverMetrics[];
  satisfactionMetrics: SatisfactionMetrics[];
  efficiencyMetrics: {
    resourceUtilization: any[];
    auditStats: any[];
    efficiencyScore: number;
  };
  capacityRecommendations: CapacityRecommendation[];
  generatedAt: string;
}

export interface AnalyticsDashboard {
  hospitalId: number;
  period: {
    startDate?: string;
    endDate?: string;
  };
  resourceUtilization: ResourceUtilizationAnalytics;
  bookingHistory: BookingHistoryAnalytics;
  usagePatterns: ResourceUsagePatterns;
  performance: PerformanceMetrics;
  generatedAt: string;
}

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  resourceType?: string;
  status?: string;
  urgency?: string;
}

// Notification Types
export interface Notification {
  id: number;
  recipientId: number;
  type: 'booking_approved' | 'booking_declined' | 'booking_completed' | 'booking_cancelled' | 'resource_threshold' | 'system_alert';
  channel: 'email' | 'sms' | 'push';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  content: string;
  metadata?: string;
  status: 'queued' | 'processing' | 'delivered' | 'failed' | 'cancelled';
  retryCount: number;
  maxRetries: number;
  scheduledAt: string;
  lastError?: string;
  deliveryDetails?: string;
  createdAt: string;
  updatedAt: string;
  actualDeliveredAt?: string;
}

export interface NotificationContent {
  subject?: string;
  body?: string;
  message?: string;
}

export interface NotificationMetadata {
  booking?: {
    id: number;
    patientName: string;
    resourceType: string;
    hospitalName: string;
    scheduledDate: string;
    resourcesAllocated?: number;
  };
  details?: {
    approvedAt?: string;
    declinedAt?: string;
    completedAt?: string;
    cancelledAt?: string;
    notes?: string;
    reason?: string;
    nextSteps?: string[];
    alternativeSuggestions?: string[];
    followUpInstructions?: string[];
    supportContact?: {
      phone: string;
      email: string;
      hours: string;
    };
    refundInfo?: string;
    rebookingAllowed?: boolean;
    feedbackRequest?: boolean;
  };
  recipient?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
}

export interface NotificationHistory {
  notifications: Notification[];
  totalCount: number;
  unreadCount: number;
  filters: {
    type?: string;
    status?: string;
    limit?: number;
  };
}

export interface NotificationStatistics {
  status: string;
  channel: string;
  count: number;
  avgDeliveryTimeMinutes?: number;
}

export interface NotificationPreferences {
  userId: number;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  bookingApprovalEmail: boolean;
  bookingApprovalSms: boolean;
  bookingDeclineEmail: boolean;
  bookingDeclineSms: boolean;
  bookingCompletionEmail: boolean;
  bookingCompletionSms: boolean;
  bookingCancellationEmail: boolean;
  bookingCancellationSms: boolean;
  resourceThresholdEmail: boolean;
  resourceThresholdSms: boolean;
  systemAlertEmail: boolean;
  systemAlertSms: boolean;
  updatedAt: string;
}

// Review Types
export interface Review {
  id: number;
  userId: number;
  hospitalId: number;
  bookingId?: number;
  rating: number;
  title?: string;
  comment?: string;
  isVerified: boolean;
  isAnonymous: boolean;
  helpfulCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  userEmail?: string;
  hospitalName?: string;
  hospitalCity?: string;
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    fiveStar: number;
    fourStar: number;
    threeStar: number;
    twoStar: number;
    oneStar: number;
  };
}

export interface ReviewResponse {
  reviews: Review[];
  stats: ReviewStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateReviewData {
  hospitalId: number;
  bookingId?: number;
  rating: number;
  title?: string;
  comment?: string;
  isAnonymous?: boolean;
}

export interface UpdateReviewData {
  rating?: number;
  title?: string;
  comment?: string;
  isAnonymous?: boolean;
}

// Social Post Types
export interface SocialPost {
  id: number;
  userId: number;
  hospitalId: number;
  postType: 'experience' | 'complaint' | 'problem' | 'moment';
  title: string;
  content: string;
  isAdminVerified: boolean;
  verifiedBy?: number;
  verifiedAt?: string;
  isActive: boolean;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  userEmail?: string;
  hospitalName?: string;
  hospitalCity?: string;
  verifiedByName?: string;
  hasUserLiked?: boolean;
  comments?: SocialComment[];
}

export interface SocialComment {
  id: number;
  postId: number;
  userId: number;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  userEmail?: string;
}

export interface CreateSocialPostData {
  hospitalId: number;
  postType: 'experience' | 'complaint' | 'problem' | 'moment';
  title: string;
  content: string;
}

export interface UpdateSocialPostData {
  title?: string;
  content?: string;
  postType?: 'experience' | 'complaint' | 'problem' | 'moment';
}

export interface SocialPostFilters {
  hospitalId?: number;
  postType?: string;
  isAdminVerified?: boolean;
  limit?: number;
  offset?: number;
}

export interface SocialStats {
  totalPosts: number;
  verifiedPosts: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
}