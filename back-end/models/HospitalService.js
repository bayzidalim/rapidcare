const mongoose = require('mongoose');

const hospitalServiceSchema = new mongoose.Schema({
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital'
  },
  service: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

const HospitalService = mongoose.model('HospitalService', hospitalServiceSchema);

module.exports = HospitalService;
