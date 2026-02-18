const mongoose = require('mongoose');

const balanceTransactionSchema = new mongoose.Schema({
  balanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserBalance', required: true },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  transactionType: { 
    type: String, 
    required: true,
    enum: ['payment_received', 'service_charge', 'refund_processed', 'withdrawal', 'adjustment']
  },
  amount: { type: Number, required: true },
  balanceBefore: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  description: String,
  referenceId: String,
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Static methods for querying history
balanceTransactionSchema.statics.findByBalanceId = function(balanceId, limit = 50) {
    return this.find({ balanceId })
        .populate('processedBy', 'name')
        .populate({
            path: 'transactionId',
            select: 'transactionId paymentMethod amount status'
        })
        .sort({ createdAt: -1 })
        .limit(limit);
};

balanceTransactionSchema.statics.getAuditTrail = async function(options = {}) {
    const query = {};

    if (options.userId) {
        // Find balances for this user first
        const UserBalance = mongoose.model('UserBalance');
        const balances = await UserBalance.find({ userId: options.userId });
        const balanceIds = balances.map(b => b._id);
        query.balanceId = { $in: balanceIds };
    }

    if (options.transactionType) {
        query.transactionType = options.transactionType;
    }

    if (options.startDate || options.endDate) {
        query.createdAt = {};
        if (options.startDate) query.createdAt.$gte = new Date(options.startDate);
        if (options.endDate) query.createdAt.$lte = new Date(options.endDate);
    }
    
    // Hospital ID filtering is tricky because BalanceTransaction doesn't have hospitalId directly.
    // It has balanceId which has hospitalId.
    if (options.hospitalId) {
        // Find balances for this hospital
        const UserBalance = mongoose.model('UserBalance');
        const balances = await UserBalance.find({ hospitalId: options.hospitalId });
        const balanceIds = balances.map(b => b._id);
        
        // Intersect with existing balanceIds if userId was also provided
        if (query.balanceId) {
            const existingIds = query.balanceId.$in.map(id => id.toString());
            const newIds = balanceIds.map(id => id.toString());
            const intersection = existingIds.filter(id => newIds.includes(id));
            query.balanceId = { $in: intersection };
        } else {
            query.balanceId = { $in: balanceIds };
        }
    }

    const limit = options.limit || 50;
    
    return this.find(query)
        .populate('balanceId', 'currentBalance userType')
        .populate('processedBy', 'name')
        .populate({
            path: 'transactionId',
            select: 'transactionId paymentMethod amount status'
        })
        .sort({ createdAt: -1 })
        .limit(limit);
};

const BalanceTransaction = mongoose.model('BalanceTransaction', balanceTransactionSchema);

module.exports = BalanceTransaction;