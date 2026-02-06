const mongoose = require('mongoose');

const bookingStatusHistorySchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  oldStatus: String,
  newStatus: {
    type: String,
    required: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: String,
  notes: String
}, {
  timestamps: { createdAt: 'timestamp', updatedAt: false }
});

// Static methods

bookingStatusHistorySchema.statics.getByBooking = function(bookingId) {
  return this.find({ bookingId })
    .populate('changedBy', 'name userType')
    .sort({ timestamp: 1 });
};

bookingStatusHistorySchema.statics.getByHospital = function(hospitalId, options = {}) {
  // complex join in SQL: join bookings b on bsh.bookingId = b.id where b.hospitalId = ?
  // In mongoose, we can't easily query child by parent field without aggregation or finding parent IDs first.
  // Finding bookings first is usually better.
  
  // However, for this migration, let's use aggregation to support filtering.
  const pipeline = [
    {
      $lookup: {
        from: 'bookings',
        localField: 'bookingId',
        foreignField: '_id',
        as: 'booking'
      }
    },
    { $unwind: '$booking' },
    { $match: { 'booking.hospitalId': new mongoose.Types.ObjectId(hospitalId) } }
  ];

  if (options.status) {
    pipeline.push({ $match: { newStatus: options.status } });
  }

  if (options.startDate) {
    pipeline.push({ $match: { timestamp: { $gte: new Date(options.startDate) } } });
  }

  if (options.endDate) {
    pipeline.push({ $match: { timestamp: { $lte: new Date(options.endDate) } } });
  }

  pipeline.push({ $sort: { timestamp: -1 } });

  if (options.limit) {
    pipeline.push({ $skip: options.offset || 0 });
    pipeline.push({ $limit: options.limit });
  }

  // Lookups for return values
  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'changedBy',
      foreignField: '_id',
      as: 'changedByUser'
    }
  });
  pipeline.push({ $unwind: { path: '$changedByUser', preserveNullAndEmptyArrays: true } });
  
  // Project to match expected output structure
  pipeline.push({
    $project: {
      _id: 1,
      bookingId: 1,
      oldStatus: 1,
      newStatus: 1,
      reason: 1,
      notes: 1,
      timestamp: 1,
      changedBy: 1,
      changedByName: '$changedByUser.name',
      changedByType: '$changedByUser.userType',
      patientName: '$booking.patientName',
      resourceType: '$booking.resourceType',
      urgency: '$booking.urgency'
    }
  });

  return this.aggregate(pipeline);
};

bookingStatusHistorySchema.statics.getByUser = function(userId, options = {}) {
  const pipeline = [
    { $match: { changedBy: new mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: 'bookings',
        localField: 'bookingId',
        foreignField: '_id',
        as: 'booking'
      }
    },
    { $unwind: '$booking' },
    {
        $lookup: {
            from: 'hospitals',
            localField: 'booking.hospitalId',
            foreignField: '_id',
            as: 'hospital'
        }
    },
    { $unwind: { path: '$hospital', preserveNullAndEmptyArrays: true } }
  ];

  if (options.startDate) {
    pipeline.push({ $match: { timestamp: { $gte: new Date(options.startDate) } } });
  }
  if (options.endDate) {
    pipeline.push({ $match: { timestamp: { $lte: new Date(options.endDate) } } });
  }

  pipeline.push({ $sort: { timestamp: -1 } });
  
  if (options.limit) {
    pipeline.push({ $limit: options.limit });
  }

  pipeline.push({
      $project: {
          _id: 1,
          bookingId: 1,
          oldStatus: 1,
          newStatus: 1,
          reason: 1,
          notes: 1,
          timestamp: 1,
          patientName: '$booking.patientName',
          resourceType: '$booking.resourceType',
          urgency: '$booking.urgency',
          hospitalName: '$hospital.name'
      }
  });

  return this.aggregate(pipeline);
};

bookingStatusHistorySchema.statics.getApprovalStatistics = function(hospitalId, options = {}) {
  const pipeline = [
    {
        $lookup: {
            from: 'bookings',
            localField: 'bookingId',
            foreignField: '_id',
            as: 'booking'
        }
    },
    { $unwind: '$booking' },
    { $match: { 
        'booking.hospitalId': new mongoose.Types.ObjectId(hospitalId),
        newStatus: { $in: ['approved', 'declined'] }
    }}
  ];

  if (options.startDate) {
    pipeline.push({ $match: { timestamp: { $gte: new Date(options.startDate) } } });
  }
  if (options.endDate) {
    pipeline.push({ $match: { timestamp: { $lte: new Date(options.endDate) } } });
  }

  pipeline.push({
    $project: {
        newStatus: 1,
        timeDiffHours: {
            $divide: [
                { $subtract: ['$timestamp', '$booking.createdAt'] },
                1000 * 60 * 60
            ]
        }
    }
  });

  pipeline.push({
    $group: {
        _id: '$newStatus',
        statusCount: { $sum: 1 },
        avgHoursToDecision: { $avg: '$timeDiffHours' }
    }
  });

  // remap _id to newStatus for compatibility
  pipeline.push({
      $project: {
          _id: 0,
          newStatus: '$_id',
          statusCount: 1,
          avgHoursToDecision: 1
      }
  });

  return this.aggregate(pipeline);
};

bookingStatusHistorySchema.statics.logApproval = function(bookingId, approvedBy, notes = null) {
  return this.create({
    bookingId,
    oldStatus: 'pending',
    newStatus: 'approved',
    changedBy: approvedBy,
    reason: 'Booking approved by hospital authority',
    notes
  });
};

bookingStatusHistorySchema.statics.logDecline = function(bookingId, declinedBy, reason, notes = null) {
  return this.create({
    bookingId,
    oldStatus: 'pending',
    newStatus: 'declined',
    changedBy: declinedBy,
    reason,
    notes
  });
};

bookingStatusHistorySchema.statics.logCompletion = function(bookingId, completedBy, notes = null) {
  return this.create({
    bookingId,
    oldStatus: 'approved',
    newStatus: 'completed',
    changedBy: completedBy,
    reason: 'Booking completed',
    notes
  });
};

bookingStatusHistorySchema.statics.logCancellation = async function(bookingId, cancelledBy, reason, notes = null, oldStatus = null) {
     if (!oldStatus) {
         // try to find latest
         const latest = await this.findOne({ bookingId }).sort({ timestamp: -1 });
         oldStatus = latest ? latest.newStatus : 'pending';
     }

     return this.create({
        bookingId,
        oldStatus: oldStatus,
        newStatus: 'cancelled',
        changedBy: cancelledBy,
        reason: reason || 'Cancelled by user',
        notes
     });
};

const BookingStatusHistory = mongoose.model('BookingStatusHistory', bookingStatusHistorySchema);

module.exports = BookingStatusHistory;