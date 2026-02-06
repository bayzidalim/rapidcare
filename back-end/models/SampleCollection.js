const mongoose = require('mongoose');

const sampleCollectionRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'CollectionAgent' },
  testTypes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TestType' }], // List of TestType IDs
  patientName: { type: String, required: true },
  patientPhone: { type: String, required: true },
  collectionAddress: { type: String, required: true },
  preferredTime: { type: Date, required: true },
  specialInstructions: String,
  
  status: { 
    type: String, 
    enum: ['pending', 'assigned', 'collected', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  
  approvalStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  rejectionReason: String,
  
  collectionDate: Date,
  collectionTime: String,
  estimatedPrice: Number
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Static methods
sampleCollectionRequestSchema.statics.getAllTestTypes = async function() {
    const TestType = mongoose.model('TestType');
    return TestType.find().sort('name');
};

sampleCollectionRequestSchema.statics.getHospitalTestTypes = async function(hospitalId) {
    const HospitalTestService = mongoose.model('HospitalTestService');
    return HospitalTestService.find({ hospitalId, isAvailable: true, homeCollectionAvailable: true })
        .populate('testTypeId', 'name description') // Populate TestType details
        .sort('price'); // Sort cannot be done on populated field directly easily, but we can sort by logical order
};

sampleCollectionRequestSchema.statics.calculateEstimatedPrice = async function(hospitalId, testTypeIds) {
    const HospitalTestService = mongoose.model('HospitalTestService');
    const TestType = mongoose.model('TestType');
    
    if (!testTypeIds || testTypeIds.length === 0) return { total: 0, breakdown: [] };
    
    const services = await HospitalTestService.find({ 
        hospitalId, 
        testTypeId: { $in: testTypeIds } 
    }).populate('testTypeId', 'name');
    
    let total = 0;
    const breakdown = services.map(svc => {
        const cost = (svc.price || 0) + (svc.homeCollectionFee || 0);
        total += cost;
        return {
            name: svc.testTypeId.name,
            price: svc.price,
            homeCollectionFee: svc.homeCollectionFee,
            total: cost
        };
    });
    
    return { total, breakdown };
};

const SampleCollectionRequest = mongoose.model('SampleCollectionRequest', sampleCollectionRequestSchema);

module.exports = SampleCollectionRequest;