const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const BookingApprovalService = require('../services/bookingApprovalService');
const ValidationService = require('../services/validationService');

// Calculate payment amount based on resource type and duration
const calculatePaymentAmount = (resourceType, duration) => {
  // Base rates in Taka (৳)
  const baseRates = {
    beds: 120,        // ৳120 per day
    icu: 600,         // ৳600 per day  
    operationTheatres: 1200 // ৳1200 per day
  };

  const baseRate = baseRates[resourceType] || 120;
  const amount = baseRate * (duration / 24); // Daily rate
  
  // Add 30% service charge
  return Math.round(amount * 1.3);
};

/**
 * @route   GET /api/bookings/my-bookings
 * @desc    Get current user bookings (for profile page)
 * @access  Private
 */
router.get('/my-bookings', authenticate, async (req, res) => {
  try {
    console.log('Fetching bookings for user:', req.user.id);
    const bookings = Booking.findByUserId(req.user.id);
    console.log('Found bookings:', bookings);
    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/bookings/:id
 * @desc    Get booking by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const booking = Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    // Check if user has permission to view this booking
    if (booking.userId !== req.user.id && req.user.userType !== 'admin') {
      // Hospital authorities can only view bookings for their hospital
      if (req.user.userType === 'hospital-authority') {
        if (booking.hospitalId !== req.user.hospitalId) {
          return res.status(403).json({
            success: false,
            error: 'Access denied'
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
    }
    
    res.json({
      success: true,
      data: booking
    });
    
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   POST /api/bookings
 * @desc    Create new booking
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    console.log('Received booking request:', req.body);
    console.log('User:', req.user);
    
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
      surgeonId,
      scheduledDate, 
      estimatedDuration,
      rapidAssistance 
    } = req.body;
    
    // Validate rapid assistance eligibility if requested
    if (rapidAssistance) {
      const validation = ValidationService.validateRapidAssistanceEligibility(patientAge, rapidAssistance);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: validation.errors[0]
        });
      }
    }
    
    // Validate required fields
    if (!hospitalId || !resourceType || !patientName || !patientAge || !patientGender ||
        !emergencyContactName || !emergencyContactPhone || !emergencyContactRelationship ||
        !medicalCondition || !urgency || !scheduledDate || !estimatedDuration) {
      // Special handling for rapid assistance validation
      if (rapidAssistance) {
        // Validate rapid assistance eligibility first
        const validation = ValidationService.validateRapidAssistanceEligibility(patientAge, rapidAssistance);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            error: validation.errors[0]
          });
        }
        // If validation passes but other fields are missing, return generic error
        return res.status(400).json({
          success: false,
          error: 'All required fields must be provided'
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'All required fields must be provided'
        });
      }
    }
    
    // Validate that required fields are not empty strings
    if (hospitalId.toString().trim() === '' || resourceType.trim() === '' || 
        patientName.trim() === '' || patientAge.toString().trim() === '' || 
        patientGender.trim() === '' || emergencyContactName.trim() === '' || 
        emergencyContactPhone.trim() === '' || emergencyContactRelationship.trim() === '' || 
        medicalCondition.trim() === '' || urgency.trim() === '' || 
        scheduledDate.trim() === '' || estimatedDuration.toString().trim() === '') {
      // Special handling for rapid assistance validation
      if (rapidAssistance) {
        // Validate rapid assistance eligibility first
        const validation = ValidationService.validateRapidAssistanceEligibility(patientAge, rapidAssistance);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            error: validation.errors[0]
          });
        }
        // If validation passes but other fields are empty, return generic error
        return res.status(400).json({
          success: false,
          error: 'All required fields must be provided and not empty'
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'All required fields must be provided and not empty'
        });
      }
    }
    
    // Validate resource type
    const validResourceTypes = ['beds', 'icu', 'operationTheatres'];
    if (!validResourceTypes.includes(resourceType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid resource type. Must be one of: beds, icu, operationTheatres'
      });
    }
    
    // Create booking
    const bookingData = {
      userId: req.user.id,
      hospitalId: hospitalId ? parseInt(hospitalId) : null,
      resourceType,
      patientName,
      patientAge: patientAge ? parseInt(patientAge) : null,
      patientGender,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      medicalCondition,
      urgency,
      surgeonId: surgeonId ? parseInt(surgeonId) : null,
      scheduledDate,
      estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : 24,
      paymentAmount: calculatePaymentAmount(resourceType, estimatedDuration ? parseInt(estimatedDuration) : 24),
      rapidAssistance: rapidAssistance ? 1 : 0, // Convert boolean to number for SQLite
      rapidAssistantName: null,
      rapidAssistantPhone: null
    };
    
    // Validate that parsed values are valid numbers
    if (isNaN(bookingData.hospitalId) || bookingData.hospitalId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid hospital ID'
      });
    }
    
    if (isNaN(bookingData.patientAge) || bookingData.patientAge <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid patient age'
      });
    }
    
    if (isNaN(bookingData.estimatedDuration) || bookingData.estimatedDuration <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid estimated duration'
      });
    }
    
    if (surgeonId && isNaN(bookingData.surgeonId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid surgeon ID'
      });
    }
    
    console.log('Processed booking data:', bookingData);
    
    const bookingId = Booking.create(bookingData);
    
    // Get the created booking
    const booking = Booking.findById(bookingId);
    
    res.status(201).json({
      success: true,
      data: booking,
      message: 'Booking created successfully'
    });
    
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    });
  }
});

/**
 * @route   POST /api/bookings/payment
 * @desc    Process booking payment with rapid assistance support
 * @access  Private
 */
router.post('/payment', authenticate, async (req, res) => {
  try {
    const { bookingId, transactionId, amount, rapidAssistance } = req.body;
    
    // Validate required fields
    if (!bookingId || !transactionId) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID and transaction ID are required'
      });
    }
    
    // Get booking
    const booking = Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    // Check if user owns this booking
    if (booking.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Check if booking is already paid
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Booking is already paid'
      });
    }
    
    // Calculate base payment amount (excluding any existing rapid assistance charge)
    let baseBookingAmount = booking.paymentAmount;
    
    // If booking already has rapid assistance charge included, subtract it to get base amount
    if (booking.rapidAssistance && booking.rapidAssistanceCharge) {
      baseBookingAmount = booking.paymentAmount - booking.rapidAssistanceCharge;
    }
    
    let rapidAssistanceCharge = 0;
    
    // Handle rapid assistance charge calculation
    const requestedRapidAssistance = rapidAssistance !== undefined ? rapidAssistance : booking.rapidAssistance;
    
    if (requestedRapidAssistance) {
      // Validate rapid assistance eligibility
      if (!booking.patientAge || booking.patientAge < 60) {
        return res.status(400).json({
          success: false,
          error: 'Rapid Assistance is only available for patients aged 60 and above'
        });
      }
      
      rapidAssistanceCharge = 200; // Fixed charge of 200৳
    }
    
    // Calculate total payment amount
    const totalExpectedAmount = baseBookingAmount + rapidAssistanceCharge;
    
    // Validate amount if provided
    if (amount && Math.abs(parseFloat(amount) - totalExpectedAmount) > 0.01) {
      return res.status(400).json({
        success: false,
        error: `Payment amount mismatch. Expected: ${totalExpectedAmount}৳, Received: ${amount}৳`
      });
    }
    
    const paymentAmount = amount || totalExpectedAmount;
    
    // Create detailed cost breakdown for transparency
    const baseServiceChargeRate = 0.3; // 30% service charge on base booking
    const baseServiceCharge = Math.round(baseBookingAmount * baseServiceChargeRate);
    const hospitalShare = baseBookingAmount - baseServiceCharge;
    
    // Rapid assistance goes entirely to platform (no hospital share)
    const platformRevenue = baseServiceCharge + rapidAssistanceCharge;
    
    const itemizedBreakdown = {
      base_booking_cost: baseBookingAmount,
      base_service_charge: baseServiceCharge,
      base_service_charge_rate: baseServiceChargeRate,
      hospital_share: hospitalShare,
      rapid_assistance_charge: rapidAssistanceCharge,
      platform_revenue: platformRevenue,
      total_amount: paymentAmount,
      currency: 'BDT',
      currency_symbol: '৳',
      breakdown_items: [
        {
          item: 'Hospital Resource Booking',
          amount: baseBookingAmount,
          description: `${booking.resourceType} for ${booking.estimatedDuration || 24} hours`,
          category: 'medical_service'
        }
      ]
    };
    
    // Add rapid assistance line item if applicable
    if (rapidAssistanceCharge > 0) {
      itemizedBreakdown.breakdown_items.push({
        item: 'Rapid Assistance Service',
        amount: rapidAssistanceCharge,
        description: 'Senior citizen escort service from gate to bed/ICU',
        category: 'addon_service'
      });
    }
    
    // Process payment through mock gateway
    // In production, this would integrate with bKash or other payment gateways
    const paymentProcessingResult = await processPaymentGateway({
      amount: paymentAmount
    });
    
    if (!paymentProcessingResult.success) {
      return res.status(402).json({
        success: false,
        error: paymentProcessingResult.error || 'Payment processing failed',
        data: {
          breakdown: itemizedBreakdown,
          gateway_response: paymentProcessingResult.gatewayResponse
        }
      });
    }
    
    // Update booking with payment details
    Booking.updatePaymentStatus(bookingId, 'paid', 'bkash', transactionId);
    
    // Update booking payment amount to reflect total with rapid assistance
    if (paymentAmount !== booking.paymentAmount) {
      const updateAmountStmt = db.prepare(`
        UPDATE bookings 
        SET paymentAmount = ?
        WHERE id = ?
      `);
      updateAmountStmt.run(paymentAmount, bookingId);
    }
    
    // If Rapid Assistance is requested, add the assistant details
    if (requestedRapidAssistance && !booking.rapidAssistance) {
      // Generate random Rapid Assistant details
      const rapidAssistants = [
        { name: "আব্দুল কাদের", phone: "01712345678" },
        { name: "ফাতেমা বেগম", phone: "01723456789" },
        { name: "মোহাম্মদ আলী", phone: "01734567890" },
        { name: "সাবরিনা আক্তার", phone: "01745678901" },
        { name: "আবুল হোসেন", phone: "01756789012" },
        { name: "শাহজাহান মিয়া", phone: "01767890123" },
        { name: "নাসিমা খাতুন", phone: "01778901234" },
        { name: "রশিদ মিয়া", phone: "01789012345" }
      ];
      
      const randomAssistant = rapidAssistants[Math.floor(Math.random() * rapidAssistants.length)];
      
      const updateStmt = db.prepare(`
        UPDATE bookings 
        SET rapidAssistance = ?, 
            rapidAssistantName = ?, 
            rapidAssistantPhone = ?,
            rapidAssistanceCharge = ?
        WHERE id = ?
      `);
      updateStmt.run(true, randomAssistant.name, randomAssistant.phone, rapidAssistanceCharge, bookingId);
    }
    
    // Get updated booking with all changes
    const updatedBooking = Booking.findById(bookingId);
    
    // Create comprehensive payment response
    const paymentResult = {
      amount: parseFloat(paymentAmount),
      transaction_id: transactionId,
      gateway_transaction_id: paymentProcessingResult.gatewayTransactionId,
      payment_method: 'bkash',
      processed_at: new Date().toISOString(),
      cost_breakdown: itemizedBreakdown,
      rapid_assistance: {
        requested: requestedRapidAssistance,
        charge: rapidAssistanceCharge,
        assistant_name: updatedBooking.rapidAssistantName,
        assistant_phone: updatedBooking.rapidAssistantPhone
      }
    };
    
    res.json({
      success: true,
      data: {
        booking: updatedBooking,
        payment: paymentResult
      },
      message: 'Payment processed successfully'
    });
    
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Payment processing failed: ' + error.message
    });
  }
});

/**
 * Mock payment gateway processing function
 * In production, this would integrate with bKash API
 */
async function processPaymentGateway({ amount }) {
  try {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock payment gateway validation
    if (amount <= 0) {
      return {
        success: false,
        error: 'Invalid payment amount',
        gatewayResponse: { code: 'INVALID_AMOUNT', message: 'Amount must be greater than 0' }
      };
    }
    
    if (amount > 50000) {
      return {
        success: false,
        error: 'Payment amount exceeds limit',
        gatewayResponse: { code: 'AMOUNT_LIMIT_EXCEEDED', message: 'Maximum transaction limit is 50,000৳' }
      };
    }
    
    // Simulate random payment failures (5% failure rate for testing)
    if (Math.random() < 0.05) {
      const failures = [
        { error: 'Insufficient balance', code: 'INSUFFICIENT_BALANCE' },
        { error: 'Invalid PIN', code: 'INVALID_PIN' },
        { error: 'Network timeout', code: 'TIMEOUT' }
      ];
      const failure = failures[Math.floor(Math.random() * failures.length)];
      
      return {
        success: false,
        error: failure.error,
        gatewayResponse: { code: failure.code, message: failure.error }
      };
    }
    
    // Simulate successful payment
    const gatewayTransactionId = `BK${Date.now()}${Math.random().toString(36).substr(2, 6)}`.toUpperCase();
    
    return {
      success: true,
      gatewayTransactionId,
      gatewayResponse: {
        code: '0000',
        message: 'Transaction successful',
        transactionId: gatewayTransactionId,
        amount: amount.toString(),
        currency: 'BDT'
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: 'Gateway communication error',
      gatewayResponse: { code: 'GATEWAY_ERROR', message: error.message }
    };
  }
}

/**
 * @route   GET /api/bookings/user
 * @desc    Get current user bookings
 * @access  Private
 */
router.get('/user', authenticate, async (req, res) => {
  console.log('GET /api/bookings/user called');
  console.log('req.user:', req.user);
  try {
    const bookings = Booking.findByUserId(req.user.id);
    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});


/**
 * @route   PUT /api/bookings/:id/status
 * @desc    Update booking status
 * @access  Private
 */
router.put('/:id/status', authenticate, requireRole('hospital-authority'), async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validate required fields
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }
    
    // Get booking
    const booking = Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    // Check if user has permission to update this booking
    if (booking.hospitalId !== req.user.hospitalId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Update booking status
    Booking.updateStatus(req.params.id, status);
    
    // Get updated booking
    const updatedBooking = Booking.findById(req.params.id);
    
    res.json({
      success: true,
      data: updatedBooking,
      message: 'Booking status updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   PUT /api/bookings/:id/cancel
 * @desc    Cancel booking
 * @access  Private
 */
router.put('/:id/cancel', authenticate, async (req, res) => {
  try {
    // Get booking
    const booking = Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    // Check if user owns this booking
    if (booking.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Cancel booking
    Booking.cancel(req.params.id);
    
    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
    
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/bookings/hospital/:hospitalId/pending
 * @desc    Get pending bookings for a hospital
 * @access  Private
 */
router.get('/hospital/:hospitalId/pending', authenticate, requireRole(['hospital-authority', 'admin']), async (req, res) => {
  try {
    const bookings = Booking.getPendingByHospital(req.params.hospitalId);
    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('Error fetching pending bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   GET /api/bookings/hospital/:hospitalId/history
 * @desc    Get booking history for a hospital
 * @access  Private
 */
router.get('/hospital/:hospitalId/history', authenticate, requireRole(['hospital-authority', 'admin']), async (req, res) => {
  try {
    const bookings = Booking.findByHospitalId(req.params.hospitalId);
    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('Error fetching booking history:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

/**
 * @route   PUT /api/bookings/:id/approve
 * @desc    Approve a booking
 * @access  Private
 */
router.put('/:id/approve', authenticate, requireRole(['hospital-authority', 'admin']), async (req, res) => {
  try {
    // Get booking
    const booking = Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check if user has permission to approve this booking
    if (req.user.userType === 'hospital-authority' && booking.hospitalId !== req.user.hospitalId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const { notes, resourcesAllocated, scheduledDate, autoAllocateResources } = req.body || {};
    const approvalData = {
      notes,
      resourcesAllocated: resourcesAllocated ? parseInt(resourcesAllocated) : undefined,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      autoAllocateResources: autoAllocateResources !== false
    };

    const result = await BookingApprovalService.approveBooking(
      parseInt(req.params.id),
      req.user.id,
      approvalData
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.message });
    }

    res.json({ success: true, message: result.message, data: result.data });
  } catch (error) {
    console.error('Error approving booking:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   PUT /api/bookings/:id/decline
 * @desc    Decline a booking
 * @access  Private
 */
router.put('/:id/decline', authenticate, requireRole(['hospital-authority', 'admin']), async (req, res) => {
  try {
    // Get booking
    const booking = Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check if user has permission to decline this booking
    if (req.user.userType === 'hospital-authority' && booking.hospitalId !== req.user.hospitalId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const { reason, notes, alternativeSuggestions } = req.body || {};
    if (!reason) {
      return res.status(400).json({ success: false, error: 'Decline reason is required' });
    }

    const result = await BookingApprovalService.declineBooking(
      parseInt(req.params.id),
      req.user.id,
      { reason, notes, alternativeSuggestions: alternativeSuggestions || [] }
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.message });
    }

    res.json({ success: true, message: result.message, data: result.data });
  } catch (error) {
    console.error('Error declining booking:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   GET /api/bookings
 * @desc    Get all bookings
 * @access  Private
 */
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const bookings = Booking.findAll();
    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = router;