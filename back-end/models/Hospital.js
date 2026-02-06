const mongoose = require('mongoose');
const ResourceAuditLog = require('./ResourceAuditLog'); // Assuming this will be migrated too

const hospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  type: {
    type: String,
    default: 'General'
  },
  street: String,
  city: String,
  state: String,
  zipCode: String,
  country: String,
  phone: String,
  email: String,
  emergency: String,
  total_beds: { type: Number, default: 0 },
  icu_beds: { type: Number, default: 0 },
  operation_theaters: { type: Number, default: 0 },
  approval_status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approved_at: Date,
  rejection_reason: String,
  submitted_at: { type: Date, default: Date.now },
  rating: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for resources
hospitalSchema.virtual('resources', {
  ref: 'HospitalResource',
  localField: '_id',
  foreignField: 'hospitalId'
});

// Static methods
hospitalSchema.statics.getAll = function() {
  return this.find({ isActive: true }).sort('name');
};

hospitalSchema.statics.search = function(searchTerm) {
  const regex = new RegExp(searchTerm, 'i');
  return this.find({
    isActive: true,
    $or: [{ name: regex }, { city: regex }, { state: regex }]
  }).sort('name');
};

hospitalSchema.statics.getWithResources = async function() {
  // This is a bit complex to mimic exact SQL join behavior in one query
  // But we can populate. 
  // For migration, we might return all hospitals and let caller populate?
  // Or use aggregation.
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: 'hospital_resources', // Collection name
        localField: '_id',
        foreignField: 'hospitalId',
        as: 'resourceList'
      }
    },
    { $unwind: { path: '$resourceList', preserveNullAndEmptyArrays: true } },
    { $sort: { name: 1, 'resourceList.resourceType': 1 } },
    {
      $project: {
        _id: 1,
        name: 1,
        // ... projects other fields, and flatten resourceList fields if needed
        resourceType: '$resourceList.resourceType',
        total: '$resourceList.total',
        available: '$resourceList.available',
        occupied: '$resourceList.occupied'
      }
    }
  ]);
};

// Rating update method
hospitalSchema.statics.updateRating = async function(hospitalId) {
  try {
    const Review = mongoose.model('Review');
    const result = await Review.aggregate([
      { $match: { hospitalId: new mongoose.Types.ObjectId(hospitalId), isActive: true } },
      { $group: { _id: null, averageRating: { $avg: '$rating' } } }
    ]);
    
    const rating = result.length > 0 ? result[0].averageRating : 0;
    
    await this.findByIdAndUpdate(hospitalId, { 
      rating, 
      lastUpdated: new Date() 
    });
    
    return rating;
  } catch (error) {
    console.error('Error updating hospital rating:', error);
    return null;
  }
};

// ... Resources methods would likely move to HospitalResource model or stay here using HospitalResource model
// For now, let's keep the schema definition.

const Hospital = mongoose.model('Hospital', hospitalSchema);

module.exports = Hospital;