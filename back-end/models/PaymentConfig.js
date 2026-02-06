const mongoose = require('mongoose');

const paymentConfigSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' }, // If null, global config
  serviceChargeRate: { type: Number, default: 0.05 },
  cancellationWindow: { type: Number, default: 24 },
  refundPercentage: { type: Number, default: 0.80 },
  minimumBookingAmount: { type: Number, default: 10.00 },
  paymentMethods: [String],
  cancellationPolicy: String,
  refundPolicy: String,
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Methods like getConfigForHospital
paymentConfigSchema.statics.getConfigForHospital = async function(hospitalId) {
    let config = null;
    if (hospitalId) {
        config = await this.findOne({ hospitalId, isActive: true }).sort({ createdAt: -1 });
    }
    
    if (!config) {
        config = await this.findOne({ hospitalId: null, isActive: true }).sort({ createdAt: -1 });
    }
    
    // Default fallback (memory)
    if (!config) {
        return {
            serviceChargeRate: 0.05,
            cancellationWindow: 24,
            refundPercentage: 0.80,
            minimumBookingAmount: 10.00,
            paymentMethods: ['credit_card', 'debit_card']
        };
    }
    
    return config;
};

const PaymentConfig = mongoose.model('PaymentConfig', paymentConfigSchema);

module.exports = PaymentConfig;