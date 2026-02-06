const mongoose = require('mongoose');

const surgeonSchema = new mongoose.Schema({
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital'
  },
  name: {
    type: String,
    required: true
  },
  specialization: String,
  available: {
    type: Boolean,
    default: true
  },
  scheduleDays: [String], // Stored as comma-separated string in SQL, array here
  scheduleHours: String
}, {
  timestamps: true
});

const Surgeon = mongoose.model('Surgeon', surgeonSchema);

module.exports = Surgeon;
