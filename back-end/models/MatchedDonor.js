const mongoose = require('mongoose');

const matchedDonorSchema = new mongoose.Schema({
  bloodRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodRequest',
    required: true
  },
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  donorName: {
    type: String,
    required: true
  },
  donorPhone: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'completed'],
    default: 'pending'
  },
  matchedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const MatchedDonor = mongoose.model('MatchedDonor', matchedDonorSchema);

module.exports = MatchedDonor;
