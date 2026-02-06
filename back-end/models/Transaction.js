const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  amount: { type: Number, required: true },
  serviceCharge: { type: Number, default: 0 },
  hospitalAmount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  transactionId: { type: String, unique: true }, // External ID (Stripe/Payment Gateway)
  status: { 
    type: String, 
    required: true, 
    enum: ['pending', 'completed', 'failed', 'refunded'], 
    default: 'pending' 
  },
  paymentData: { type: Object }, // Store full JSON response from gateway
  processedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Static methods for analytics
transactionSchema.statics.findByBookingId = function(bookingId) {
    return this.find({ bookingId }).sort({ createdAt: -1 });
};

transactionSchema.statics.findByUserId = function(userId) {
    return this.find({ userId })
        .populate('bookingId', 'patientName resourceType scheduledDate')
        .populate('hospitalId', 'name')
        .sort({ createdAt: -1 });
};

transactionSchema.statics.findByHospitalId = function(hospitalId) {
    return this.find({ hospitalId })
        .populate('bookingId', 'patientName resourceType scheduledDate')
        .populate('userId', 'name email')
        .sort({ createdAt: -1 });
};

transactionSchema.statics.updateStatus = function(id, status, processedAt = null) {
    return this.findByIdAndUpdate(id, { 
        status, 
        processedAt: processedAt || new Date(),
        updatedAt: new Date()
    }, { new: true });
};

transactionSchema.statics.getByStatus = function(status) {
    return this.find({ status })
        .populate('bookingId', 'patientName resourceType scheduledDate')
        .populate('hospitalId', 'name')
        .populate('userId', 'name')
        .sort({ createdAt: -1 });
};

transactionSchema.statics.getRevenueAnalytics = async function(hospitalId = null, dateRange = {}) {
    const match = { status: 'completed' };
    if (hospitalId) match.hospitalId = new mongoose.Types.ObjectId(hospitalId);
    if (dateRange.startDate) match.createdAt = { $gte: new Date(dateRange.startDate) };
    if (dateRange.endDate) match.createdAt = { ...match.createdAt, $lte: new Date(dateRange.endDate) };

    return this.aggregate([
        { $match: match },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                transactionCount: { $sum: 1 },
                totalAmount: { $sum: "$amount" },
                totalServiceCharge: { $sum: "$serviceCharge" },
                totalHospitalAmount: { $sum: "$hospitalAmount" },
                averageAmount: { $avg: "$amount" }
            }
        },
        { $sort: { _id: -1 } },
        { 
            $project: { 
                date: "$_id", 
                transactionCount: 1, 
                totalAmount: 1, 
                totalServiceCharge: 1, 
                totalHospitalAmount: 1, 
                averageAmount: 1,
                _id: 0 
            } 
        }
    ]);
};

transactionSchema.statics.getTotalRevenue = async function(hospitalId = null, dateRange = {}) {
    const match = { status: 'completed' };
    if (hospitalId) match.hospitalId = new mongoose.Types.ObjectId(hospitalId);
    if (dateRange.startDate) match.createdAt = { $gte: new Date(dateRange.startDate) };
    if (dateRange.endDate) match.createdAt = { ...match.createdAt, $lte: new Date(dateRange.endDate) };

    const result = await this.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                totalTransactions: { $sum: 1 },
                totalRevenue: { $sum: "$amount" },
                totalServiceCharge: { $sum: "$serviceCharge" },
                totalHospitalRevenue: { $sum: "$hospitalAmount" },
                averageTransactionAmount: { $avg: "$amount" }
            }
        }
    ]);

    return result[0] || { 
        totalTransactions: 0, 
        totalRevenue: 0, 
        totalServiceCharge: 0, 
        totalHospitalRevenue: 0, 
        averageTransactionAmount: 0 
    };
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;