const mongoose = require('mongoose');

const hospitalPricingSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  resourceType: { type: String, required: true },
  basePrice: { type: Number, required: true }, // Maps to base_price/baseRate
  serviceChargePercentage: { type: Number, default: 10.00 },
  currency: { type: String, default: 'BDT' }, // Assuming BDT based on context, existing code said USD in SQL but usage implies local.
  effectiveFrom: { type: Date, default: Date.now },
  effectiveTo: Date,
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Helper for normalization
hospitalPricingSchema.statics.normalizeResourceType = function(resourceType) {
    const typeMap = {
      'bed': 'bed',
      'beds': 'bed',
      'icu': 'icu',
      'operationTheatres': 'operationTheatres',
      'operationTheaters': 'operationTheatres',
      'operation_theatres': 'operationTheatres',
      'rapid_collection': 'rapid_collection',
      'rapidCollection': 'rapid_collection',
      'rapidService': 'rapid_collection'
    };
    return typeMap[resourceType] || resourceType;
};

hospitalPricingSchema.statics.setPricing = async function(hospitalId, resourceType, basePrice, serviceChargePercentage = 10.00) {
    const normalizedType = this.normalizeResourceType(resourceType);
    
    // Deactivate old pricing if keeping history? Or just upsert?
    // SQL used INSERT OR REPLACE. Mongoose findOneAndUpdate with upsert.
    
    const pricing = await this.findOneAndUpdate(
        { hospitalId, resourceType: normalizedType },
        { 
            basePrice, 
            serviceChargePercentage, 
            isActive: true,
            updatedAt: new Date()
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    
    // Return formatted for compatibility
    return this.getPricing(hospitalId, normalizedType);
};

hospitalPricingSchema.statics.getPricing = async function(hospitalId, resourceType) {
    const normalizedType = this.normalizeResourceType(resourceType);
    const pricing = await this.findOne({ hospitalId, resourceType: normalizedType });
    
    if (!pricing) {
        // Default prices
        const defaultPrices = {
            'bed': 120.00,
            'icu': 600.00,
            'operationTheatres': 1200.00,
            'rapid_collection': 500.00
        };
        const basePrice = defaultPrices[normalizedType] || 100.00;
        const serviceChargePercentage = 10.00;
        
        return {
            hospital_id: hospitalId,
            resource_type: resourceType,
            base_price: basePrice, // camelCase -> snake_case for compact
            service_charge_percentage: serviceChargePercentage,
            service_charge_amount: (basePrice * serviceChargePercentage) / 100,
            total_price: basePrice + ((basePrice * serviceChargePercentage) / 100),
            is_default: true
        };
    }
    
    const serviceChargeAmount = (pricing.basePrice * pricing.serviceChargePercentage) / 100;
    
    return {
        _id: pricing._id,
        hospital_id: pricing.hospitalId,
        resource_type: pricing.resourceType,
        base_price: pricing.basePrice,
        service_charge_percentage: pricing.serviceChargePercentage,
        service_charge_amount: parseFloat(serviceChargeAmount.toFixed(2)),
        total_price: parseFloat((pricing.basePrice + serviceChargeAmount).toFixed(2)),
        is_default: false
    };
};

hospitalPricingSchema.statics.getHospitalPricing = async function(hospitalId) {
    const resourceTypes = ['beds', 'icu', 'operationTheatres', 'rapid_collection'];
    return Promise.all(resourceTypes.map(type => this.getPricing(hospitalId, type)));
};

hospitalPricingSchema.statics.calculateBookingCost = async function(hospitalId, resourceType, duration = 24) {
    const pricing = await this.getPricing(hospitalId, resourceType);
    
    const dailyRate = pricing.total_price;
    const days = duration / 24;
    const totalCost = dailyRate * days;
    const hospitalShare = pricing.base_price * days;
    const serviceChargeShare = pricing.service_charge_amount * days;
    
    return {
        base_price: pricing.base_price,
        service_charge_percentage: pricing.service_charge_percentage,
        service_charge_amount: pricing.service_charge_amount,
        daily_rate: dailyRate,
        duration_hours: duration,
        duration_days: parseFloat(days.toFixed(2)),
        hospital_share: parseFloat(hospitalShare.toFixed(2)),
        service_charge_share: parseFloat(serviceChargeShare.toFixed(2)),
        total_cost: parseFloat(totalCost.toFixed(2))
    };
};

const HospitalPricing = mongoose.model('HospitalPricing', hospitalPricingSchema);

module.exports = HospitalPricing;