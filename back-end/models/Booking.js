const mongoose = require('mongoose');
const BookingStatusHistory = require('./BookingStatusHistory');

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital'
  },
  resourceType: {
    type: String,
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  patientAge: {
    type: Number,
    required: true
  },
  patientGender: {
    type: String,
    required: true
  },
  emergencyContactName: String,
  emergencyContactPhone: String,
  emergencyContactRelationship: String,
  medicalCondition: {
    type: String,
    required: true
  },
  urgency: {
    type: String,
    default: 'medium'
  },
  surgeonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Surgeon'
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  estimatedDuration: {
    type: Number, // Assuming hours
    default: 24
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'approved', 'declined', 'completed', 'cancelled']
  },
  paymentAmount: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    default: 'pending'
  },
  paymentMethod: String,
  transactionId: String,
  notes: String,
  rapidAssistance: {
    type: Boolean,
    default: false
  },
  rapidAssistantName: String,
  rapidAssistantPhone: String,
  declineReason: String,
  authorityNotes: String,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  expiresAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Instance methods wrapping statics to maintain controller compat where possible,
// but Controllers likely use Booking.create, Booking.findById etc.

// Static methods
bookingSchema.statics.getAll = function() {
  return this.find()
    .populate('hospitalId', 'name')
    .populate('userId', 'name')
    .sort({ createdAt: -1 });
};

bookingSchema.statics.getByHospital = function(hospitalId) {
  return this.find({ hospitalId })
    .populate('userId', 'name')
    .sort({ createdAt: -1 });
};

bookingSchema.statics.getByStatus = function(status) {
  return this.find({ status })
    .populate('hospitalId', 'name')
    .populate('userId', 'name')
    .sort({ createdAt: -1 });
};

bookingSchema.statics.getPendingByHospital = function(hospitalId, options = {}) {
  let query = this.find({ hospitalId, status: 'pending' });

  if (options.urgency) {
    query = query.where('urgency').equals(options.urgency);
  }

  if (options.resourceType) {
    query = query.where('resourceType').equals(options.resourceType);
  }

  // Populate needed fields
  query = query
    .populate('userId', 'name phone')
    .populate('hospitalId', 'name');

  // Sorting logic needs to be handled carefully or just sort by createdAt
  // MongoDB doesn't exacty support custom CASE order easily in sort without aggregation.
  // For now simple sort:
  return query.sort({ createdAt: 1 }).limit(options.limit || 0);
};

// Status update methods
bookingSchema.statics.updateStatus = async function(id, status, changedBy = null, reason = null, notes = null) {
  const booking = await this.findById(id);
  if (!booking) throw new Error('Booking not found');
  
  const oldStatus = booking.status;
  booking.status = status;
  booking.updatedAt = new Date(); // Mongoose does this automatically but explicit for clarity
  
  await booking.save();

  if (changedBy) {
    try {
        // Need to require BookingStatusHistory dynamically or ensure it's loaded?
        // It is required at top.
        const BookingStatusHistoryModel = mongoose.model('BookingStatusHistory');
        await BookingStatusHistoryModel.create({
            bookingId: id,
            oldStatus,
            newStatus: status,
            changedBy,
            reason,
            notes
        });
    } catch(e) {
        console.error("Error logging history", e);
    }
  }
  return true;
};

// ... other wrapper methods like approve, decline, complete to maintain API compatibility
bookingSchema.statics.approve = async function(id, approvedBy, notes = null) {
  const booking = await this.findById(id);
  if (!booking) throw new Error('Booking not found');
  if (booking.status !== 'pending') throw new Error('Only pending bookings can be approved');

  booking.status = 'approved';
  booking.approvedBy = approvedBy;
  booking.approvedAt = new Date();
  booking.authorityNotes = notes;
  await booking.save();

  const BookingStatusHistoryModel = mongoose.model('BookingStatusHistory');
  // Should call logApproval but that's static on History model (which we need to port)
  // Or just create history entry directly
  await BookingStatusHistoryModel.create({
      bookingId: id,
      oldStatus: 'pending',
      newStatus: 'approved',
      changedBy: approvedBy,
      notes,
      reason: 'Approved'
  });
  return true;
};

bookingSchema.statics.decline = async function(id, declinedBy, reason, notes = null) {
    const booking = await this.findById(id);
    if (!booking) throw new Error('Booking not found');
    if (booking.status !== 'pending') throw new Error('Only pending bookings can be declined');
  
    booking.status = 'declined';
    booking.approvedBy = declinedBy; // reusing field or should be declinedBy? SQL used approvedBy
    booking.approvedAt = new Date();
    booking.declineReason = reason;
    booking.authorityNotes = notes;
    await booking.save();
  
    const BookingStatusHistoryModel = mongoose.model('BookingStatusHistory');
    await BookingStatusHistoryModel.create({
        bookingId: id,
        oldStatus: 'pending',
        newStatus: 'declined',
        changedBy: declinedBy,
        reason,
        notes
    });
    return true;
};

bookingSchema.statics.complete = async function(id, completedBy, notes = null) {
    const booking = await this.findById(id);
    if (!booking) throw new Error('Booking not found');
    if (booking.status !== 'approved') throw new Error('Only approved bookings can be completed');

    booking.status = 'completed';
    await booking.save();

    const BookingStatusHistoryModel = mongoose.model('BookingStatusHistory');
    await BookingStatusHistoryModel.create({
        bookingId: id,
        oldStatus: 'approved',
        newStatus: 'completed',
        changedBy: completedBy,
        notes,
        reason: 'Completed'
    });
    return true;
};

bookingSchema.statics.cancel = async function(id, cancelledBy, reason, notes = null) {
    const booking = await this.findById(id);
    if (!booking) throw new Error('Booking not found');
    const oldStatus = booking.status;
    if (!['pending', 'approved'].includes(oldStatus)) {
        throw new Error('Only pending or approved bookings can be cancelled');
    }

    booking.status = 'cancelled';
    booking.declineReason = reason;
    booking.authorityNotes = notes;
    await booking.save();

    const BookingStatusHistoryModel = mongoose.model('BookingStatusHistory');
    await BookingStatusHistoryModel.create({
        bookingId: id,
        oldStatus,
        newStatus: 'cancelled',
        changedBy: cancelledBy,
        reason,
        notes
    });
    return true;
};

bookingSchema.statics.getExpired = function() {
  return this.find({
    expiresAt: { $lt: new Date() },
    status: { $in: ['pending', 'approved'] }
  })
  .populate('hospitalId', 'name')
  .populate('userId', 'name');
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;