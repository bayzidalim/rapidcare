const mongoose = require('mongoose');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const HospitalPricing = require('../models/HospitalPricing');
const UserBalance = require('../models/UserBalance');
const Transaction = require('../models/Transaction');
const Booking = require('../models/Booking');
const PaymentConfig = require('../models/PaymentConfig');

/**
 * Financial Data Seeder
 * Seeds initial financial data for testing and development
 */

const seedFinancialData = async () => {
  console.log('🌱 Seeding financial data...');

  try {
    // Get existing hospitals and users for seeding
    const hospitals = await Hospital.find({ isActive: true }).limit(3);
    const hospitalAuthorities = await User.find({ userType: 'hospital-authority' }).limit(3);
    const admin = await User.findOne({ userType: 'admin' });

    if (hospitals.length === 0) {
      console.log('⚠️  No hospitals found. Please run the main seeder first.');
      return;
    }

    // Seed hospital pricing data (5x increased prices)
    console.log('📊 Seeding hospital pricing data...');
    const pricingData = [];
    
    // Hospital 1
    if (hospitals[0]) {
        pricingData.push(
          { hospitalId: hospitals[0]._id, resourceType: 'beds', baseRate: 750.00, hourlyRate: 125.00, minimumCharge: 500.00, maximumCharge: 2500.00 },
          { hospitalId: hospitals[0]._id, resourceType: 'icu', baseRate: 1500.00, hourlyRate: 250.00, minimumCharge: 1000.00, maximumCharge: 5000.00 },
          { hospitalId: hospitals[0]._id, resourceType: 'operationTheatres', baseRate: 2500.00, hourlyRate: 500.00, minimumCharge: 2000.00, maximumCharge: 10000.00 }
        );
    }
    
    // Hospital 2
    if (hospitals[1]) {
      pricingData.push(
        { hospitalId: hospitals[1]._id, resourceType: 'beds', baseRate: 600.00, hourlyRate: 100.00, minimumCharge: 400.00, maximumCharge: 2000.00 },
        { hospitalId: hospitals[1]._id, resourceType: 'icu', baseRate: 1250.00, hourlyRate: 200.00, minimumCharge: 750.00, maximumCharge: 4000.00 },
        { hospitalId: hospitals[1]._id, resourceType: 'operationTheatres', baseRate: 2250.00, hourlyRate: 400.00, minimumCharge: 1750.00, maximumCharge: 7500.00 }
      );
    }

    for (const pricing of pricingData) {
        // Find creator
        const creator = hospitalAuthorities.find(auth => auth.hospital_id && auth.hospital_id.equals(pricing.hospitalId));
        const createdBy = creator ? creator._id : (admin ? admin._id : null);
        
        await HospitalPricing.findOneAndUpdate(
            { hospitalId: pricing.hospitalId, resourceType: pricing.resourceType },
            { ...pricing, createdBy, updatedAt: new Date() },
            { upsert: true, new: true }
        );
    }

    // Seed user balances for hospital authorities
    console.log('💰 Seeding user balances...');
    for (const auth of hospitalAuthorities) {
      if (auth.hospital_id) {
         await UserBalance.findOneAndUpdate(
             { userId: auth._id },
             {
                 userType: 'hospital-authority',
                 hospitalId: auth.hospital_id,
                 currentBalance: Math.floor(Math.random() * 5000) + 1000,
                 totalEarnings: Math.floor(Math.random() * 10000) + 2000,
                 lastTransactionAt: new Date()
             },
             { upsert: true }
         );
      }
    }

    // Seed admin balance
    if (admin) {
        await UserBalance.findOneAndUpdate(
            { userId: admin._id },
            {
                userType: 'admin',
                currentBalance: Math.floor(Math.random() * 20000) + 5000,
                totalEarnings: Math.floor(Math.random() * 50000) + 10000,
                lastTransactionAt: new Date()
            },
            { upsert: true }
        );
    }

    // Seed some sample transactions
    console.log('💳 Seeding sample transactions...');
    const bookings = await Booking.find().limit(5);
    
    let seededTransactions = 0;
    for (const booking of bookings) {
        const amount = booking.paymentAmount || 200.00; // paymentAmount might not exist in Booking model? 
        // Asking Booking model? Step 239. It has paymentAmount? No. Use dummy.
        // Or if Booking has paymentStatus 'paid'
        
        const serviceCharge = amount * 0.05;
        const hospitalAmount = amount - serviceCharge;
        const transactionId = `TXN_${Date.now()}_${bookedTransactions++}`; // bookedTransactions undefined
        
        // Check if transaction exists
        const existing = await Transaction.findOne({ bookingId: booking._id });
        if (!existing) {
             await Transaction.create({
                 bookingId: booking._id,
                 userId: booking.userId,
                 hospitalId: booking.hospitalId,
                 amount,
                 serviceCharge,
                 hospitalAmount,
                 paymentMethod: 'credit_card',
                 transactionId: `TXN_SEED_${booking._id}`,
                 status: 'completed',
                 processedAt: new Date()
             });
             seededTransactions++;
        }
    }

    // Seed payment configurations for hospitals
    console.log('⚙️  Seeding payment configurations...');
    for (const hospital of hospitals) {
        await PaymentConfig.findOneAndUpdate(
            { hospitalId: hospital._id },
            {
                serviceChargeRate: 0.05,
                cancellationWindow: 24,
                refundPercentage: 0.80,
                minimumBookingAmount: 250.00,
                paymentMethods: ['credit_card', 'debit_card', 'bkash'],
                cancellationPolicy: 'Bookings can be cancelled up to 24 hours before the scheduled date for an 80% refund.',
                refundPolicy: 'Refunds will be processed within 3-5 business days.'
            },
            { upsert: true }
        );
    }

    console.log('✅ Financial data seeding completed successfully!');
    console.log(`   - Seeded pricing for ${pricingData.length} resource types`);
    console.log(`   - Created balances for ${hospitalAuthorities.length + (admin ? 1 : 0)} users`);
    console.log(`   - Generated ${seededTransactions} sample transactions`);
    console.log(`   - Configured payment settings for ${hospitals.length} hospitals`);

  } catch (error) {
    console.error('❌ Financial data seeding failed:', error.message);
    throw error;
  }
};

let bookedTransactions = 0; // Helper counter

// Run seeder if called directly
if (require.main === module) {
  const connectDB = require('../config/database');
  connectDB().then(() => seedFinancialData()).then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}

module.exports = { seedFinancialData };