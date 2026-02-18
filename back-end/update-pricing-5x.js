const mongoose = require('mongoose');
const HospitalPricing = require('./models/HospitalPricing');
const PaymentConfig = require('./models/PaymentConfig');
const connectDB = require('./config/database');

/**
 * Update all hospital pricing to 5x the current values
 */

const updatePricing5x = async () => {
  console.log('💰 Updating hospital pricing to 5x...');

  try {
    await connectDB();

    // Update HospitalPricing
    const currentPricing = await HospitalPricing.find();
    
    if (currentPricing.length === 0) {
      console.log('⚠️  No pricing records found in HospitalPricing collection.');
    } else {
      console.log(`📊 Found ${currentPricing.length} pricing records to update`);

      let updatedCount = 0;
      for (const pricing of currentPricing) {
        const newBaseRate = pricing.baseRate * 5;
        const newHourlyRate = pricing.hourlyRate ? pricing.hourlyRate * 5 : undefined;
        const newMinimumCharge = pricing.minimumCharge ? pricing.minimumCharge * 5 : undefined;
        const newMaximumCharge = pricing.maximumCharge ? pricing.maximumCharge * 5 : undefined;

        pricing.baseRate = newBaseRate;
        if (newHourlyRate !== undefined) pricing.hourlyRate = newHourlyRate;
        if (newMinimumCharge !== undefined) pricing.minimumCharge = newMinimumCharge;
        if (newMaximumCharge !== undefined) pricing.maximumCharge = newMaximumCharge;
        
        await pricing.save();

        console.log(`   ✓ Hospital ${pricing.hospitalId} - ${pricing.resourceType}:`);
        console.log(`     Base Rate: ${newBaseRate/5} → ${newBaseRate}`);
        updatedCount++;
      }
      
      console.log(`   - Updated ${updatedCount} pricing records`);
    }

    // Update PaymentConfig
    const paymentConfigs = await PaymentConfig.find();
    
    if (paymentConfigs.length > 0) {
      console.log(`\n⚙️  Updating ${paymentConfigs.length} payment configurations...`);
      
      for (const config of paymentConfigs) {
        const newMinimum = (config.minimumBookingAmount || 200) * 5;
        
        config.minimumBookingAmount = newMinimum;
        await config.save();
        
        console.log(`   ✓ Hospital ${config.hospitalId}: Minimum ${(newMinimum/5)} → ${newMinimum}`);
      }
    }

    console.log('\n✅ Pricing update completed successfully!');
    console.log(`   - All prices increased by 5x`);

    // Show summary
    console.log('\n📊 New Pricing Summary:');
    const summary = await HospitalPricing.aggregate([
      {
        $group: {
          _id: '$resourceType',
          avgBaseRate: { $avg: '$baseRate' },
          minBaseRate: { $min: '$baseRate' },
          maxBaseRate: { $max: '$baseRate' }
        }
      }
    ]);

    summary.forEach(row => {
      console.log(`   ${row._id}:`);
      console.log(`     Average: $${row.avgBaseRate.toFixed(2)}`);
      console.log(`     Range: $${row.minBaseRate.toFixed(2)} - $${row.maxBaseRate.toFixed(2)}`);
    });

  } catch (error) {
    console.error('❌ Pricing update failed:', error.message);
    throw error;
  }
};

// Run update if called directly
if (require.main === module) {
  updatePricing5x()
    .then(() => {
        console.log('\n✨ Pricing update completed!');
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { updatePricing5x };
