const BookingService = require('../services/bookingService');
const BookingApprovalService = require('../services/bookingApprovalService');
const BookingNotification = require('../models/BookingNotification');
const User = require('../models/User');
const HospitalPricing = require('../models/HospitalPricing');
const ValidationService = require('../services/validationService');
const SecurityUtils = require('../utils/securityUtils');
const AuditService = require('../services/auditService');
const cacheService = require('../services/cacheService');
const QueryOptimizer = require('../utils/queryOptimizer');
const db = require('../config/database');

// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Rate limiting check
    const rateLimit = SecurityUtils.checkRateLimit(userId, 'booking', 300000, 3); // 3 bookings per 5 minutes
    if (!rateLimit.allowed) {
      // Log rate limit event
      AuditService.logRateLimitEvent({
        userId,
        operation: 'booking',
        ipAddress,
        userAgent,
        requestCount: rateLimit.remaining + 3,
        windowMs: 300000,
        maxRequests: 3
      });

      return res.status(429).json({
        success: false,
        error: 'Too many booking requests. Please try again later.',
        retryAfter: rateLimit.retryAfter
      });
    }

    const {
      hospitalId,
      resourceType,
      patientName,
      patientAge,
      patientGender,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      medicalCondition,
      urgency,
      scheduledDate,
      estimatedDuration,
      notes
    } = req.body;

    // Comprehensive validation and sanitization
    const validationResult = ValidationService.validateAndSanitizeBooking({
      hospitalId,
      resourceType,
      patientName,
      patientAge,
      patientGender,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      medicalCondition,
      urgency,
      scheduledDate,
      estimatedDuration,
      notes
    });

    if (!validationResult.isValid) {
      // Log validation failure
      AuditService.logBookingSecurityEvent({
        eventType: 'validation_failure',
        userId,
        ipAddress,
        userAgent,
        details: { errors: validationResult.errors },
        severity: 'WARNING'
      });

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.errors
      });
    }

    const sanitizedData = validationResult.data;

    // Validate hospital booking access
    const hospitalAccess = ValidationService.validateHospitalBookingAccess(userId, parseInt(hospitalId));
    if (!hospitalAccess.isValid) {
      return res.status(400).json({
        success: false,
        error: hospitalAccess.error
      });
    }

    // Validate resource availability
    const resourceAvailability = ValidationService.validateResourceAvailability(
      parseInt(hospitalId),
      sanitizedData.resourceType,
      sanitizedData.scheduledDate,
      sanitizedData.estimatedDuration
    );

    if (!resourceAvailability.isValid) {
      return res.status(400).json({
        success: false,
        error: resourceAvailability.error
      });
    }

    // Check for suspicious activity
    const suspiciousActivity = SecurityUtils.detectSuspiciousActivity(userId, sanitizedData);
    if (suspiciousActivity.isSuspicious) {
      // Log suspicious activity
      AuditService.logSuspiciousBookingActivity({
        userId,
        suspiciousIndicators: suspiciousActivity.indicators,
        riskLevel: suspiciousActivity.riskLevel,
        ipAddress,
        userAgent,
        bookingData: sanitizedData
      });

      // For high risk, reject the booking
      if (suspiciousActivity.riskLevel === 'high') {
        return res.status(403).json({
          success: false,
          error: 'Booking request flagged for security review. Please contact support.'
        });
      }
    }

    // Generate secure booking reference
    const bookingReference = SecurityUtils.generateBookingReference();

    const bookingData = {
      userId,
      hospitalId: parseInt(hospitalId),
      ...sanitizedData,
      bookingReference,
      paymentAmount: 0 // Simplified for university project
    };

    const booking = BookingService.create(bookingData);

    // Log successful booking creation
    AuditService.logBookingSecurityEvent({
      eventType: 'booking_created',
      userId,
      bookingId: booking.id,
      hospitalId: booking.hospitalId,
      ipAddress,
      userAgent,
      details: {
        resourceType: booking.resourceType,
        urgency: booking.urgency,
        bookingReference: booking.bookingReference
      },
      severity: 'INFO'
    });

    res.status(201).json({
      success: true,
      data: booking,
      message: 'Booking request submitted successfully. You will be notified once the hospital reviews your request.'
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    
    // Log error
    AuditService.logBookingSecurityEvent({
      eventType: 'booking_creation_error',
      userId: req.user?.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { error: error.message },
      severity: 'ERROR'
    });

    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Process booking payment
exports.processBookingPayment = async (req, res) => {
  try {
    const { bookingId, paymentMethod, transactionId } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!bookingId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID and payment method are required'
      });
    }

    // Get booking and verify ownership
    const booking = BookingService.getById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    if (booking.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Check if booking is in a payable state
    if (booking.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Booking must be approved before payment'
      });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Booking has already been paid'
      });
    }

    // Process payment (simplified for university project)
    const paymentData = {
      bookingId,
      paymentMethod,
      transactionId,
      amount: booking.paymentAmount || 0,
      status: 'paid'
    };

    // Update booking payment status
    const updateStmt = db.prepare(`
      UPDATE bookings 
      SET paymentStatus = ?, paymentMethod = ?, transactionId = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    updateStmt.run('paid', paymentMethod, transactionId, bookingId);

    // Log the payment processing
    AuditService.logActivity({
      userId,
      action: 'PAYMENT_PROCESSED',
      resourceType: 'booking',
      resourceId: bookingId,
      details: {
        paymentMethod,
        transactionId,
        amount: booking.paymentAmount || 0
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        bookingId,
        paymentStatus: 'paid',
        transactionId
      }
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    
    // Log the error
    AuditService.logActivity({
      userId: req.user?.id,
      action: 'PAYMENT_PROCESSING_ERROR',
      resourceType: 'booking',
      resourceId: req.body.bookingId,
      details: { error: error.message },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(500).json({
      success: false,
      error: 'Payment processing failed'
    });
  }
};

// Get user bookings
exports.getUserBookings = async (req, res) => {
  try {
    const bookings = BookingService.getByUserId(req.user.id);

    res.json({
      success: true,
      data: bookings,
      count: bookings.length
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings'
    });
  }
};

// Get specific booking
exports.getBookingById = async (req, res) => {
  try {
    const booking = BookingService.getById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch booking'
    });
  }
};

// Update booking status
exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Get current booking
    const currentBooking = BookingService.getById(id);
    if (!currentBooking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Validate status transition
    const isValidTransition = ValidationService.validateBookingStatusTransition(
      currentBooking.status,
      status,
      req.user.userType
    );

    if (!isValidTransition) {
      // Log invalid status transition attempt
      AuditService.logBookingSecurityEvent({
        eventType: 'invalid_status_transition',
        userId,
        bookingId: parseInt(id),
        hospitalId: currentBooking.hospitalId,
        ipAddress,
        userAgent,
        details: {
          currentStatus: currentBooking.status,
          attemptedStatus: status,
          userType: req.user.userType
        },
        severity: 'WARNING'
      });

      return res.status(403).json({
        success: false,
        error: `Invalid status transition from ${currentBooking.status} to ${status} for user type ${req.user.userType}`
      });
    }

    // Sanitize notes
    const sanitizedNotes = notes ? SecurityUtils.sanitizeInput(notes.trim()) : null;

    BookingService.updateStatus(id, status, sanitizedNotes);
    const booking = BookingService.getById(id);

    // Log successful status update
    AuditService.logBookingSecurityEvent({
      eventType: 'status_updated',
      userId,
      bookingId: parseInt(id),
      hospitalId: booking.hospitalId,
      ipAddress,
      userAgent,
      details: {
        oldStatus: currentBooking.status,
        newStatus: status,
        notes: sanitizedNotes
      },
      severity: 'INFO'
    });

    res.json({
      success: true,
      data: booking,
      message: 'Booking status updated successfully'
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    
    // Log error
    AuditService.logBookingSecurityEvent({
      eventType: 'status_update_error',
      userId: req.user?.id,
      bookingId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { error: error.message },
      severity: 'ERROR'
    });

    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get all bookings (for hospital authority use)
exports.getAllBookings = async (req, res) => {
  try {
    let bookings;
    
    // If hospital authority, only show bookings for their hospital
    if (req.user.userType === 'hospital-authority' && req.user.hospitalId) {
      bookings = BookingService.getByHospitalId(req.user.hospitalId);
    } else {
      bookings = BookingService.getAll();
    }

    res.json({
      success: true,
      data: bookings,
      count: bookings.length
    });
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings'
    });
  }
};

// Cancel booking
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = BookingService.cancel(id);

    res.json({
      success: true,
      data: booking,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get current user's bookings (for profile page)
exports.getCurrentUserBookings = async (req, res) => {
  try {
    const bookings = BookingService.getByUserId(req.user.id);

    res.json({
      success: true,
      data: bookings,
      count: bookings.length
    });
  } catch (error) {
    console.error('Error fetching current user bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings'
    });
  }
};

// Booking approval endpoints

// Get pending bookings for a hospital
exports.getPendingBookings = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { urgency, resourceType, limit, sortBy, sortOrder } = req.query;

    // Check if user has permission to view this hospital's bookings
    if (req.user.userType === 'hospital-authority' && req.user.hospital_id !== parseInt(hospitalId)) {
      return res.status(403).json({
        success: false,
        error: 'You can only view bookings for your assigned hospital'
      });
    }

    const options = {
      urgency,
      resourceType,
      limit: limit ? parseInt(limit) : 50,
      sortBy: sortBy || 'urgency',
      sortOrder: sortOrder || 'asc'
    };

    // Get pending bookings using our enhanced service
    const bookings = BookingService.getPendingBookings(parseInt(hospitalId), options);
    
    // Calculate summary statistics
    const summary = {
      totalPending: bookings.length,
      critical: bookings.filter(b => b.urgency === 'critical').length,
      high: bookings.filter(b => b.urgency === 'high').length,
      medium: bookings.filter(b => b.urgency === 'medium').length,
      low: bookings.filter(b => b.urgency === 'low').length,
      avgWaitingDays: bookings.length > 0 ? 
        bookings.reduce((sum, b) => {
          const waitingHours = (new Date() - new Date(b.createdAt)) / (1000 * 60 * 60);
          return sum + (waitingHours / 24);
        }, 0) / bookings.length : 0
    };

    // Add waiting time to each booking
    const bookingsWithWaitTime = bookings.map(booking => ({
      ...booking,
      waitingTime: (new Date() - new Date(booking.createdAt)) / (1000 * 60 * 60) // in hours
    }));

    res.json({
      success: true,
      data: bookingsWithWaitTime,
      totalCount: bookings.length,
      summary,
      filters: options
    });

  } catch (error) {
    console.error('Error fetching pending bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending bookings'
    });
  }
};

// Approve a booking
exports.approveBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, resourcesAllocated, autoAllocateResources } = req.body || {};
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Get booking to check hospital ownership
    const booking = BookingService.getById(id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Validate booking status
    if (booking.status !== 'pending') {
      AuditService.logBookingAccess({
        userId,
        bookingId: parseInt(id),
        accessType: 'approve',
        success: false,
        reason: `Invalid status: ${booking.status}`,
        ipAddress,
        userAgent
      });

      return res.status(400).json({
        success: false,
        error: `Cannot approve booking with status: ${booking.status}`
      });
    }

    // Check if user has permission to approve this booking
    if (req.user.userType === 'hospital-authority' && req.user.hospital_id !== booking.hospitalId) {
      AuditService.logBookingAccess({
        userId,
        bookingId: parseInt(id),
        accessType: 'approve',
        success: false,
        reason: 'Hospital access denied',
        ipAddress,
        userAgent
      });

      return res.status(403).json({
        success: false,
        error: 'You can only approve bookings for your assigned hospital'
      });
    }

    // Validate and sanitize approval data
    const sanitizedNotes = notes ? SecurityUtils.sanitizeInput(notes.trim()) : null;
    const validatedResourcesAllocated = resourcesAllocated ? 
      Math.max(1, Math.min(10, parseInt(resourcesAllocated))) : 1; // Limit between 1-10

    // Final resource availability check
    const resourceCheck = ValidationService.validateResourceAvailability(
      booking.hospitalId,
      booking.resourceType,
      booking.scheduledDate,
      booking.estimatedDuration
    );

    if (!resourceCheck.isValid) {
      return res.status(400).json({
        success: false,
        error: resourceCheck.error
      });
    }

    const approvalData = {
      notes: sanitizedNotes,
      resourcesAllocated: validatedResourcesAllocated,
      autoAllocateResources: autoAllocateResources !== false
    };

    const updatedBooking = BookingService.approve(parseInt(id), userId, approvalData);

    // Log successful approval
    AuditService.logBookingAccess({
      userId,
      bookingId: parseInt(id),
      accessType: 'approve',
      success: true,
      reason: 'Booking approved successfully',
      ipAddress,
      userAgent
    });

    AuditService.logBookingSecurityEvent({
      eventType: 'booking_approved',
      userId,
      bookingId: parseInt(id),
      hospitalId: booking.hospitalId,
      ipAddress,
      userAgent,
      details: {
        resourcesAllocated: validatedResourcesAllocated,
        notes: sanitizedNotes
      },
      severity: 'INFO'
    });

    res.json({
      success: true,
      data: updatedBooking,
      message: 'Booking approved successfully. Patient has been notified.'
    });

  } catch (error) {
    console.error('Error approving booking:', error);
    
    // Log error
    AuditService.logBookingSecurityEvent({
      eventType: 'booking_approval_error',
      userId: req.user?.id,
      bookingId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { error: error.message },
      severity: 'ERROR'
    });

    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Decline a booking
exports.declineBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body || {};

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Decline reason is required'
      });
    }

    // Get booking to check hospital ownership
    const booking = BookingService.getById(id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check if user has permission to decline this booking
    if (req.user.userType === 'hospital-authority' && req.user.hospital_id !== booking.hospitalId) {
      return res.status(403).json({
        success: false,
        error: 'You can only decline bookings for your assigned hospital'
      });
    }

    const declineData = {
      reason: reason.trim(),
      notes: notes?.trim()
    };

    const updatedBooking = BookingService.decline(parseInt(id), req.user.id, declineData);

    res.json({
      success: true,
      data: updatedBooking,
      message: 'Booking declined successfully. Patient has been notified.'
    });

  } catch (error) {
    console.error('Error declining booking:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get booking history for a hospital
exports.getBookingHistory = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { status, startDate, endDate, limit, offset } = req.query;

    // Check if user has permission to view this hospital's history
    if (req.user.userType === 'hospital-authority' && req.user.hospital_id !== parseInt(hospitalId)) {
      return res.status(403).json({
        success: false,
        error: 'You can only view booking history for your assigned hospital'
      });
    }

    const options = {
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    };

    const result = await BookingApprovalService.getBookingHistory(parseInt(hospitalId), options);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message
      });
    }

    res.json({
      success: true,
      data: result.data.bookings,
      totalCount: result.data.totalCount,
      currentPage: result.data.currentPage,
      totalPages: result.data.totalPages,
      filters: result.data.filters
    });

  } catch (error) {
    console.error('Error fetching booking history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch booking history'
    });
  }
};

// Complete a booking
exports.completeBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body || {};

    // Get booking to check hospital ownership
    const booking = BookingService.getById(id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check if user has permission to complete this booking
    if (req.user.userType === 'hospital-authority' && req.user.hospital_id !== booking.hospitalId) {
      return res.status(403).json({
        success: false,
        error: 'You can only complete bookings for your assigned hospital'
      });
    }

    const updatedBooking = BookingService.complete(parseInt(id), req.user.id, notes?.trim());

    res.json({
      success: true,
      data: updatedBooking,
      message: 'Booking completed successfully. Patient has been notified.'
    });

  } catch (error) {
    console.error('Error completing booking:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get booking by reference
exports.getBookingByReference = async (req, res) => {
  try {
    const { reference } = req.params;

    const booking = BookingService.getByReference(reference);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check if user has permission to view this booking
    if (req.user.userType === 'user' && booking.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own bookings'
      });
    }

    if (req.user.userType === 'hospital-authority' && req.user.hospital_id !== booking.hospitalId) {
      return res.status(403).json({
        success: false,
        error: 'You can only view bookings for your assigned hospital'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Error fetching booking by reference:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch booking'
    });
  }
};

// Get booking statistics
exports.getBookingStatistics = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { startDate, endDate } = req.query;

    // Check if user has permission to view statistics
    if (req.user.userType === 'hospital-authority' && req.user.hospital_id !== parseInt(hospitalId)) {
      return res.status(403).json({
        success: false,
        error: 'You can only view statistics for your assigned hospital'
      });
    }

    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    const statistics = BookingService.getStatistics(parseInt(hospitalId), options);

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error fetching booking statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch booking statistics'
    });
  }
};

// Search bookings
exports.searchBookings = async (req, res) => {
  try {
    const { 
      patientName, 
      bookingReference, 
      status, 
      urgency, 
      resourceType, 
      hospitalId,
      startDate,
      endDate,
      limit 
    } = req.query;

    // Build search criteria
    const searchCriteria = {};
    if (patientName) searchCriteria.patientName = patientName;
    if (bookingReference) searchCriteria.bookingReference = bookingReference;
    if (status) searchCriteria.status = status;
    if (urgency) searchCriteria.urgency = urgency;
    if (resourceType) searchCriteria.resourceType = resourceType;
    if (startDate) searchCriteria.startDate = startDate;
    if (endDate) searchCriteria.endDate = endDate;
    if (limit) searchCriteria.limit = parseInt(limit);

    // Apply user-specific filters
    if (req.user.userType === 'user') {
      searchCriteria.userId = req.user.id;
    } else if (req.user.userType === 'hospital-authority') {
      searchCriteria.hospitalId = req.user.hospital_id;
    } else if (hospitalId) {
      searchCriteria.hospitalId = parseInt(hospitalId);
    }

    const bookings = BookingService.search(searchCriteria);

    res.json({
      success: true,
      data: bookings,
      count: bookings.length
    });
  } catch (error) {
    console.error('Error searching bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search bookings'
    });
  }
};

// Get user notifications
exports.getUserNotifications = async (req, res) => {
  try {
    const { limit, isRead } = req.query;
    
    const options = {
      limit: limit ? parseInt(limit) : 50
    };
    
    if (isRead !== undefined) {
      options.isRead = isRead === 'true';
    }

    const notifications = BookingNotification.getByUser(req.user.id, options);
    const unreadCount = BookingNotification.getUnreadCount(req.user.id);

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      count: notifications.length
    });
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
};

// Mark notification as read
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const success = BookingNotification.markAsRead(parseInt(id), req.user.id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
};

// Mark all notifications as read
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    const updatedCount = BookingNotification.markAllAsRead(req.user.id);

    res.json({
      success: true,
      message: `${updatedCount} notifications marked as read`
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notifications as read'
    });
  }
}; 