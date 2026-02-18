const mongoose = require('mongoose');

const discrepancyAlertSchema = new mongoose.Schema({
  reconciliationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReconciliationRecord', required: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserBalance', required: true }, // Referencing UserBalance _id or userId? Likely userId usually used as accountId in service.
  expectedAmount: { type: Number, required: true },
  actualAmount: { type: Number, required: true },
  differenceAmount: { type: Number, required: true },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
  status: { type: String, enum: ['OPEN', 'RESOLVED', 'IGNORED'], default: 'OPEN' },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  resolutionNotes: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('DiscrepancyAlert', discrepancyAlertSchema);
