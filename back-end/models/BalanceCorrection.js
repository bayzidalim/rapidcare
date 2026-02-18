const mongoose = require('mongoose');

const balanceCorrectionSchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserBalance', required: true }, // or User?
  adminUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalBalance: { type: Number, required: true },
  correctedBalance: { type: Number, required: true },
  differenceAmount: { type: Number, required: true },
  reason: { type: String, required: true },
  evidence: { type: String },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' } // Linked transaction
}, {
  timestamps: true
});

module.exports = mongoose.model('BalanceCorrection', balanceCorrectionSchema);
