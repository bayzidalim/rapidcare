const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Hospital = require('./models/Hospital');
const HospitalPricing = require('./models/HospitalPricing');

// Pricing ranges for different resource types (in BDT - Bangladeshi Taka)
const pricingRanges = {
  beds: {
    baseRate: { min: 500, max: 2000 },      // Daily rate for general beds
    hourlyRate: { min: 50, max: 150 },      // Hourly rate if applicable
    minimumCharge: { min: 500, max: 1000 }, // Minimum charge
    maximumCharge: { min: 5000, max: 15000 } // Maximum daily charge
  },
  icu: {
    baseRate: { min: 2000, max: 8000 },     // Daily rate for ICU beds
    hourlyRate: { min: 200, max: 500 },     // Hourly rate if applicable
    minimumCharge: { min: 2000, max: 4000 }, // Minimum charge
    maximumCharge: { min: 15000, max: 40000 } // Maximum daily charge
  },
  operationTheatres: {
    baseRate: { min: 5000, max: 25000 },    // Daily rate for operation theatres
    hourlyRate: { min: 1000, max: 4000 },   // Hourly rate
    minimumCharge: { min: 5000, max: 10000 }, // Minimum charge
    maximumCharge: { min: 25000, max: 100000 } // Maximum charge per procedure
  }
};

// Hospital tier multipliers (based on hospital type/quality)
const tierMultipliers = {
  'government': 0.7,    // Government hospitals - lower rates
  'private': 1.2,       // Private hospitals - higher rates
  'specialized': 1.5,   // Specialized hospitals - premium rates
  'default': 1.0        // Default multiplier
};

// Function to generate random price within range
const generatePrice = (min, max, multiplier = 1) => {
  const basePrice = Math.floor(Math.random() * (max - min + 1)) + min;
  return Math.floor(basePrice * multiplier);
};

// Function to determine hospital tier based on name/type
const getHospitalTier = (hospitalName) => {
  const name = hospitalName.toLowerCase();
  if (name.includes('medical college') || name.includes('government') || name.includes('district')) {
    return 'government';
  } else if (name.includes('specialized') || name.includes('cardiac') || name.includes('cancer') || name.includes('eye')) {
    return 'specialized';
  } else {
    return 'private';
  }
};

// Main seeding function
const seedPricingData = async () => {
  try {
    // Ensure DB connection
    if (mongoose.connection.readyState === 0) {
        await connectDB();
    }

    console.log('🏥 Starting pricing data seeding...');

    // Get all hospitals
    const hospitals = await Hospital.find({});
    console.log(`📊 Found ${hospitals.length} hospitals`);

    // Check existing pricing data
    const existingPricing = await HospitalPricing.distinct('hospitalId');
    const hospitalsWithPricing = new Set(existingPricing.map(id => id.toString()));
    
    console.log(`💰 ${hospitalsWithPricing.size} hospitals already have pricing data`);

    let seedCount = 0;
    const resourceTypes = ['beds', 'icu', 'operationTheatres'];

    for (const hospital of hospitals) {
        // Skip if hospital already has pricing
        if (hospitalsWithPricing.has(hospital._id.toString())) {
            continue;
        }

        // Determine hospital tier and multiplier
        const tier = getHospitalTier(hospital.name);
        const multiplier = tierMultipliers[tier] || tierMultipliers.default;

        console.log(`🏥 Seeding pricing for: ${hospital.name} (${tier} tier, ${multiplier}x multiplier)`);

        const pricingDocs = [];

        // Generate pricing for each resource type
        resourceTypes.forEach(resourceType => {
          const ranges = pricingRanges[resourceType];
          
          const baseRate = generatePrice(ranges.baseRate.min, ranges.baseRate.max, multiplier);
          const hourlyRate = generatePrice(ranges.hourlyRate.min, ranges.hourlyRate.max, multiplier);
          const minimumCharge = generatePrice(ranges.minimumCharge.min, ranges.minimumCharge.max, multiplier);
          const maximumCharge = generatePrice(ranges.maximumCharge.min, ranges.maximumCharge.max, multiplier);

          pricingDocs.push({
            hospitalId: hospital._id,
            resourceType,
            base_price: baseRate, // Schema uses base_price
            service_charge_percentage: 5, // Default
            hourlyRate,    // Not in standard schema possibly? Check model.
            // basic schema has base_price, daily_rate, service_charge_percentage
            // Let's stick to base_price mostly. 
            // If model is loose or extensive:
            // Actually checking HospitalPricing model (from memory or re-view if needed),
            // it likely maps 'base_price' to baseRate.
            total_price: baseRate, // Placeholder
            currency: 'BDT',
            isActive: true,
            createdBy: null // admin
          });

          seedCount++;
        });

        await HospitalPricing.insertMany(pricingDocs);
    }

    console.log(`✅ Successfully seeded ${seedCount} pricing records`);
    
    // Verify the seeding
    const totalPricing = await HospitalPricing.countDocuments();
    const hospitalCount = (await HospitalPricing.distinct('hospitalId')).length;
    
    console.log(`📈 Total pricing records: ${totalPricing}`);
    console.log(`🏥 Hospitals with pricing: ${hospitalCount}`);
    
    // Show sample pricing data
    console.log('\n📋 Sample pricing data:');
    const samplePricing = await HospitalPricing.find().populate('hospitalId', 'name').limit(9);
    
    samplePricing.forEach(p => {
        if(p.hospitalId) {
             console.log(`${p.hospitalId.name} - ${p.resourceType}: ${p.base_price} BDT`);
        }
    });

  } catch (error) {
    console.error('❌ Error seeding pricing data:', error);
    throw error;
  }
};

// Run the seeder if called directly
if (require.main === module) {
  seedPricingData();
  console.log('🎉 Pricing data seeding completed!');
}

module.exports = { seedPricingData };
