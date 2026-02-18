const mongoose = require('mongoose');

const reconciliationRecordSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  status: { type: String, enum: ['PENDING', 'RECONCILED', 'DISCREPANCY_FOUND', 'ISSUES_DETECTED'], default: 'PENDING' },
  expectedBalances: { type: Map, of: Number }, // Map of accountId -> balance
  actualBalances: { type: Map, of: Number },
  discrepancies: { type: Array, default: [] }, // Array of discrepancy objects
  summary: { type: Object },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('ReconciliationRecord', reconciliationRecordSchema);
