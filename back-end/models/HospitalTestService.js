const mongoose = require('mongoose');

const hospitalTestServiceSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  testTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TestType', required: true },
  price: { type: Number, required: true },
  homeCollectionFee: { type: Number, default: 0 },
  estimatedDuration: String,
  isAvailable: { type: Boolean, default: true },
  homeCollectionAvailable: { type: Boolean, default: true }
}, {
  timestamps: true
});

hospitalTestServiceSchema.index({ hospitalId: 1, testTypeId: 1 }, { unique: true });

const HospitalTestService = mongoose.model('HospitalTestService', hospitalTestServiceSchema);

module.exports = HospitalTestService;
