const HospitalService = require('./hospitalService');
const ValidationService = require('./validationService');
const HospitalPricing = require('../models/HospitalPricing');
const Booking = require('../models/Booking');
const Surgeon = require('../models/Surgeon');
const Hospital = require('../models/Hospital'); // Needed for getById checks? Or just HospitalService.

class BookingService {
  // Create new booking
  static async create(bookingData) {
    // Check resource availability (only approved hospitals)
    const hospital = await HospitalService.getById(bookingData.hospitalId, false);
    if (!hospital) {
      throw new Error('Hospital not found or not approved');
    }

    const resource = hospital.resources[bookingData.resourceType];
    // resource is an object { total, available, occupied } from the service response
    if (!resource || resource.available < 1) {
      throw new Error(`${bookingData.resourceType} not available at this hospital`);
    }

    // Calculate payment amount using hospital pricing
    // HospitalPricing.calculateBookingCost is likely an async method now if it queries DB?
    // Let's check HospitalPricing model usage. The helper might be static async.
    // Assuming standard Mongoose static usage:
    // If it was synchronous before because it queried SQL synchronously, it should be async now.
    // I previously saw HospitalPricing.js converted to Mongoose.
    // I will assume it is async or I might need to check it.
    // Safest is to await it.
    
    // In Mongoose migration, I should have made static methods async.
    const costBreakdown = await HospitalPricing.calculateBookingCost(
      bookingData.hospitalId,
      bookingData.resourceType,
      bookingData.estimatedDuration || 24
    );
    let totalAmount = costBreakdown.total_cost;

    let rapidAssistanceCharge = 0;
    let rapidAssistantName = null;
    let rapidAssistantPhone = null;

    if (bookingData.rapidAssistance) {
      // Validate rapid assistance eligibility
      const validation = ValidationService.validateRapidAssistanceEligibility(bookingData.patientAge, bookingData.rapidAssistance);
      if (!validation.isValid) {
        throw new Error(validation.errors[0]);
      }

      // Set rapid assistance charge
      rapidAssistanceCharge = ValidationService.calculateRapidAssistanceCharge(bookingData.rapidAssistance);
      totalAmount += rapidAssistanceCharge;

      // Assign random assistant
      const assistantInfo = this.assignRapidAssistant();
      rapidAssistantName = assistantInfo.name;
      rapidAssistantPhone = assistantInfo.phone;
    }

    const booking = await Booking.create({
        userId: bookingData.userId,
        hospitalId: bookingData.hospitalId,
        resourceType: bookingData.resourceType,
        patientName: bookingData.patientName,
        patientAge: bookingData.patientAge,
        patientGender: bookingData.patientGender,
        emergencyContactName: bookingData.emergencyContactName,
        emergencyContactPhone: bookingData.emergencyContactPhone,
        emergencyContactRelationship: bookingData.emergencyContactRelationship,
        medicalCondition: bookingData.medicalCondition,
        urgency: bookingData.urgency || 'medium',
        surgeonId: bookingData.surgeonId || null,
        scheduledDate: bookingData.scheduledDate,
        estimatedDuration: bookingData.estimatedDuration || 24,
        status: 'pending',
        paymentAmount: totalAmount,
        paymentStatus: 'pending',
        notes: bookingData.notes,
        rapidAssistance: bookingData.rapidAssistance ? true : false,
        rapidAssistanceCharge: rapidAssistanceCharge,
        rapidAssistantName: rapidAssistantName,
        rapidAssistantPhone: rapidAssistantPhone
    });

    return this.getById(booking._id);
  }

  // Get booking by ID
  static async getById(id) {
    const booking = await Booking.findById(id)
        .populate('hospitalId', 'name')
        .populate('surgeonId', 'name');

    if (!booking) return null;

    // Transform to match previous format
    const b = booking.toObject();
    return {
      ...b,
      hospital: b.hospitalId ? {
        id: b.hospitalId._id,
        name: b.hospitalId.name
      } : { id: b.hospitalId, name: 'Unknown' }, // Fallback if populate failed or null
      surgeon: b.surgeonId ? {
        id: b.surgeonId._id,
        name: b.surgeonId.name
      } : null
    };
  }

  // Get bookings by user ID
  static async getByUserId(userId) {
    const bookings = await Booking.find({ userId })
        .populate('hospitalId', 'name')
        .populate('surgeonId', 'name')
        .sort({ createdAt: -1 });

    return bookings.map(booking => {
        const b = booking.toObject();
        return {
          ...b,
          hospital: b.hospitalId ? {
            id: b.hospitalId._id,
            name: b.hospitalId.name
          } : null,
          surgeon: b.surgeonId ? {
            id: b.surgeonId._id,
            name: b.surgeonId.name
          } : null
        };
    });
  }

  // Get bookings by hospital ID
  static async getByHospitalId(hospitalId) {
    const bookings = await Booking.find({ hospitalId })
        .populate('hospitalId', 'name')
        .populate('surgeonId', 'name')
        .populate('userId', 'name email')
        .sort({ createdAt: -1 });

    return bookings.map(booking => {
        const b = booking.toObject();
        return {
          ...b,
          hospital: b.hospitalId ? {
            id: b.hospitalId._id,
            name: b.hospitalId.name
          } : null,
          surgeon: b.surgeonId ? {
            id: b.surgeonId._id,
            name: b.surgeonId.name
          } : null,
          user: b.userId ? {
            id: b.userId._id,
            name: b.userId.name,
            email: b.userId.email
          } : null
        };
    });
  }

  // Get all bookings (admin)
  static async getAll() {
    const bookings = await Booking.find()
        .populate('hospitalId', 'name')
        .populate('surgeonId', 'name')
        .sort({ createdAt: -1 });

    return bookings.map(booking => {
        const b = booking.toObject();
        return {
          ...b,
          hospital: b.hospitalId ? {
            id: b.hospitalId._id,
            name: b.hospitalId.name
          } : null,
          surgeon: b.surgeonId ? {
            id: b.surgeonId._id,
            name: b.surgeonId.name
          } : null
        };
    });
  }

  // Update booking status
  static async updateStatus(id, status) {
    return Booking.findByIdAndUpdate(id, { 
        status, 
        updatedAt: new Date() 
    });
  }

  // Update payment status
  static async updatePaymentStatus(id, paymentStatus, paymentMethod = null, transactionId = null) {
    return Booking.findByIdAndUpdate(id, { 
        paymentStatus, 
        paymentMethod, 
        transactionId,
        updatedAt: new Date()
    });
  }
      
  // Cancel booking
  static async cancel(id) {
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    if (booking.status === 'cancelled') {
      throw new Error('Booking is already cancelled');
    }

    // Update booking status
    booking.status = 'cancelled';
    booking.updatedAt = new Date();
    await booking.save();

    // Restore resource availability
    // Using ResourceManagementService logic (or HospitalService wrapper)
    // Note: 'updateResourceAvailability' was in HospitalService.
    await HospitalService.updateResourceAvailability(
      booking.hospitalId,
      booking.resourceType,
      1,
      booking.userId
    );

    return this.getById(id);
  }

  // Get booking statistics
  static async getStats() {
    const stats = await Booking.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                confirmed: { $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] } },
                pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
                completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                totalRevenue: { $sum: "$paymentAmount" },
                averageAmount: { $avg: "$paymentAmount" }
            }
        }
    ]);

    if (!stats || stats.length === 0) {
        return {
          total: 0,
          confirmed: 0,
          pending: 0,
          cancelled: 0,
          completed: 0,
          totalRevenue: 0,
          averageAmount: 0
        };
    }

    return {
      total: stats[0].total,
      confirmed: stats[0].confirmed,
      pending: stats[0].pending,
      cancelled: stats[0].cancelled,
      completed: stats[0].completed,
      totalRevenue: stats[0].totalRevenue || 0,
      averageAmount: stats[0].averageAmount || 0
    };
  }

  // Get base amount for resource type (deprecated - use HospitalPricing.calculateBookingCost instead)
  static async getBaseAmount(resourceType, duration = 24, hospitalId = null) {
    if (hospitalId) {
      // Assuming calculateBookingCost handles the async DB lookup
      const costBreakdown = await HospitalPricing.calculateBookingCost(hospitalId, resourceType, duration);
      return costBreakdown.hospital_share; 
    }
    
    // Fallback to default rates
    const baseRates = {
      beds: 120, // ৳120 per day
      icu: 600,  // ৳600 per day
      operationTheatres: 1200 // ৳1200 per day
    };

    const baseRate = baseRates[resourceType] || 120;
    return baseRate * (duration / 24); // Convert hours to days
  }

  // Get available surgeons for hospital
  static async getAvailableSurgeons(hospitalId, scheduledDate) {
    const surgeons = await Surgeon.find({ 
        hospitalId, 
        available: true 
    });

    return surgeons.map(surgeon => ({
      id: surgeon._id,
      name: surgeon.name,
      specialization: surgeon.specialization,
      available: surgeon.available,
      schedule: {
        days: surgeon.scheduleDays || [],
        hours: surgeon.scheduleHours
      }
    }));
  }

  // Update rapid assistance details for a booking
  static async updateRapidAssistance(id, rapidAssistance, rapidAssistanceCharge = 0) {
    const booking = await Booking.findById(id);
    if (!booking) {
      throw new Error('Booking not found');
    }

    let rapidAssistantName = null;
    let rapidAssistantPhone = null;

    if (rapidAssistance) {
      // Validate rapid assistance eligibility
      const validation = ValidationService.validateRapidAssistanceEligibility(booking.patientAge, rapidAssistance);
      if (!validation.isValid) {
        throw new Error(validation.errors[0]);
      }

      // Assign assistant if not already assigned
      if (!booking.rapidAssistantName) {
        const assistantInfo = this.assignRapidAssistant();
        rapidAssistantName = assistantInfo.name;
        rapidAssistantPhone = assistantInfo.phone;
      } else {
        rapidAssistantName = booking.rapidAssistantName;
        rapidAssistantPhone = booking.rapidAssistantPhone;
      }
    }

    booking.rapidAssistance = rapidAssistance ? true : false;
    booking.rapidAssistanceCharge = rapidAssistanceCharge;
    booking.rapidAssistantName = rapidAssistantName;
    booking.rapidAssistantPhone = rapidAssistantPhone;
    booking.updatedAt = new Date();
    
    await booking.save();
    return this.getById(id);
  }

  // Generate random Bangladeshi assistant name and phone number
  static assignRapidAssistant() {
    // Random Bangladeshi first names
    const firstNames = [
      'Ahmed', 'Mohammad', 'Abdul', 'Md', 'Shah', 'Karim', 'Rahman', 'Hassan', 'Ali', 'Omar',
      'Fatima', 'Rashida', 'Nasreen', 'Salma', 'Rehana', 'Ruma', 'Shahida', 'Sultana', 'Bilkis', 'Rokeya',
      'Aminul', 'Rafiqul', 'Shamsul', 'Nurul', 'Mizanur', 'Abdur', 'Motiur', 'Shahjahan', 'Golam', 'Delwar'
    ];

    // Random Bangladeshi last names
    const lastNames = [
      'Islam', 'Rahman', 'Ahmed', 'Hassan', 'Ali', 'Khan', 'Hossain', 'Uddin', 'Alam', 'Sheikh',
      'Begum', 'Khatun', 'Akter', 'Parvin', 'Sultana', 'Bibi', 'Nessa', 'Banu', 'Yasmin', 'Rashid',
      'Miah', 'Sarkar', 'Mondal', 'Das', 'Roy', 'Chowdhury', 'Talukder', 'Bepari', 'Molla', 'Sikder'
    ];

    // Generate random name
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = `${firstName} ${lastName}`;

    // Generate random Bangladeshi phone number
    const operators = ['17', '19', '15', '18', '16', '13']; // Common BD mobile operators
    const operator = operators[Math.floor(Math.random() * operators.length)];
    const randomDigits = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    const phoneNumber = `+880${operator}${randomDigits}`;

      return {
      name: fullName,
      phone: phoneNumber
    };
  }
}

module.exports = BookingService;