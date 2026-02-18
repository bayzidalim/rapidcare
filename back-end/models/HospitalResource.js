const mongoose = require('mongoose');

const hospitalResourceSchema = new mongoose.Schema({
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital'
  },
  resourceType: {
    type: String,
    required: true
  },
  total: {
    type: Number,
    default: 0
  },
  available: {
    type: Number,
    default: 0
  },
  occupied: {
    type: Number,
    default: 0
  },
  reserved: {
    type: Number,
    default: 0
  },
  maintenance: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'hospital_resources' // Explicitly match SQL table name style for aggregations
});

// Composite unique index
hospitalResourceSchema.index({ hospitalId: 1, resourceType: 1 }, { unique: true });

const HospitalResource = mongoose.model('HospitalResource', hospitalResourceSchema);

module.exports = HospitalResource;
