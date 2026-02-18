const mongoose = require('mongoose');

const financialHealthCheckSchema = new mongoose.Schema({
  checkDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['HEALTHY', 'ISSUES_DETECTED'], default: 'HEALTHY' },
  metrics: { type: Object }, // JSON of metrics
  alerts: { type: Array, default: [] } // Array of alerts
}, {
  timestamps: true
});

module.exports = mongoose.model('FinancialHealthCheck', financialHealthCheckSchema);
