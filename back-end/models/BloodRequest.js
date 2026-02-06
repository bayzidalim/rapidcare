const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema({
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requesterName: {
    type: String,
    required: true
  },
  requesterPhone: {
    type: String,
    required: true
  },
  bloodType: {
    type: String,
    required: true
  },
  units: {
    type: Number,
    required: true
  },
  urgency: {
    type: String,
    default: 'medium'
  },
  hospitalName: String,
  hospitalAddress: String,
  hospitalContact: String,
  patientName: String,
  patientAge: Number,
  medicalCondition: String,
  requiredBy: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'fulfilled', 'cancelled', 'expired'],
    default: 'pending'
  },
  notes: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for matched donors
bloodRequestSchema.virtual('matchedDonors', {
  ref: 'MatchedDonor',
  localField: '_id',
  foreignField: 'bloodRequestId'
});

// Static methods
bloodRequestSchema.statics.getAll = function() {
    return this.find().sort({ createdAt: -1 });
};

bloodRequestSchema.statics.findByRequesterId = function(requesterId) {
    return this.find({ requesterId }).sort({ createdAt: -1 });
};

bloodRequestSchema.statics.search = function(searchTerm) {
    const regex = new RegExp(searchTerm, 'i');
    return this.find({
        $or: [
            { bloodType: regex },
            { hospitalName: regex },
            { patientName: regex }
        ]
    }).sort({ createdAt: -1 });
};

bloodRequestSchema.statics.getByStatus = function(status) {
    return this.find({ status }).sort({ createdAt: -1 });
};

bloodRequestSchema.statics.getByBloodType = function(bloodType) {
    return this.find({ bloodType, status: 'pending' })
        .sort({ urgency: -1, createdAt: 1 }); // Sort by urgency (desc) then created (asc) like SQL
};

bloodRequestSchema.statics.updateStatus = async function(id, status) {
    return this.findByIdAndUpdate(id, { status, updatedAt: new Date() }, { new: true });
};

// Matched Donors methods wrapper
bloodRequestSchema.statics.addMatchedDonor = async function(bloodRequestId, donorData) {
    const MatchedDonor = mongoose.model('MatchedDonor');
    const match = await MatchedDonor.create({
        bloodRequestId,
        donorId: donorData.donorId,
        donorName: donorData.donorName,
        donorPhone: donorData.donorPhone
    });
    return match._id;
};

bloodRequestSchema.statics.getMatchedDonors = function(bloodRequestId) {
    const MatchedDonor = mongoose.model('MatchedDonor');
    return MatchedDonor.find({ bloodRequestId }).sort({ matchedAt: -1 });
};

bloodRequestSchema.statics.updateMatchedDonorStatus = async function(matchId, status) {
    const MatchedDonor = mongoose.model('MatchedDonor');
    return MatchedDonor.findByIdAndUpdate(matchId, { status }, { new: true });
};

const BloodRequest = mongoose.model('BloodRequest', bloodRequestSchema);

module.exports = BloodRequest;