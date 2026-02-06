const mongoose = require('mongoose');

const collectionAgentSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  specialization: { type: String, default: 'Sample Collection Specialist' },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

collectionAgentSchema.statics.getAvailableAgent = async function(hospitalId) {
    // Basic round-robin or load balancing: find agent with least 'assigned'/'pending' requests.
    // This requires looking up SampleCollectionRequest.
    // For now, let's just pick a random active agent to match naive SQL implementation, 
    // or better: use aggregation if possible.
    
    // Naive random for now as per SQL "ORDER BY RANDOM() LIMIT 1"
    const count = await this.countDocuments({ hospitalId, isActive: true });
    const random = Math.floor(Math.random() * count);
    return this.findOne({ hospitalId, isActive: true }).skip(random);
    
    // TODO: Implement load balancing by checking assignments
};

const CollectionAgent = mongoose.model('CollectionAgent', collectionAgentSchema);

module.exports = CollectionAgent;