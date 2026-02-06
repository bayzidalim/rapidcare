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
        .populate('transactionId', 'transactionId paymentMethod')
        .sort({ createdAt: -1 })
        .limit(limit);
};

const BalanceTransaction = mongoose.model('BalanceTransaction', balanceTransactionSchema);

module.exports = BalanceTransaction;