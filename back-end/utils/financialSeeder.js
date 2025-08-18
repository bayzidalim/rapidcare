const db = require('../config/database');

/**
 * Financial Data Seeder
 * Seeds initial financial data for testing and development
 */

const seedFinancialData = () => {
  console.log('🌱 Seeding financial data...');

  try {
    // Begin transaction
    db.exec('BEGIN TRANSACTION');

    // Get existing hospitals and users for seeding
    const hospitals = db.prepare('SELECT id FROM hospitals WHERE isActive = 1 LIMIT 3').all();
    const hospitalAuthorities = db.prepare("SELECT id, hospital_id FROM users WHERE userType = 'hospital-authority' LIMIT 3").all();
    const admins = db.prepare("SELECT id FROM users WHERE userType = 'admin' LIMIT 1").all();

    if (hospitals.length === 0) {
      console.log('⚠️  No hospitals found. Please run the main seeder first.');
      db.exec('ROLLBACK');
      return;
    }

    // Seed hospital pricing data
    console.log('📊 Seeding hospital pricing data...');
    const pricingData = [
      { hospitalId: hospitals[0].id, resourceType: 'beds', baseRate: 150.00, hourlyRate: 25.00, minimumCharge: 100.00, maximumCharge: 500.00 },
      { hospitalId: hospitals[0].id, resourceType: 'icu', baseRate: 300.00, hourlyRate: 50.00, minimumCharge: 200.00, maximumCharge: 1000.00 },
      { hospitalId: hospitals[0].id, resourceType: 'operationTheatres', baseRate: 500.00, hourlyRate: 100.00, minimumCharge: 400.00, maximumCharge: 2000.00 },
    ];

    if (hospitals.length > 1) {
      pricingData.push(
        { hospitalId: hospitals[1].id, resourceType: 'beds', baseRate: 120.00, hourlyRate: 20.00, minimumCharge: 80.00, maximumCharge: 400.00 },
        { hospitalId: hospitals[1].id, resourceType: 'icu', baseRate: 250.00, hourlyRate: 40.00, minimumCharge: 150.00, maximumCharge: 800.00 },
        { hospitalId: hospitals[1].id, resourceType: 'operationTheatres', baseRate: 450.00, hourlyRate: 80.00, minimumCharge: 350.00, maximumCharge: 1500.00 }
      );
    }

    const insertPricing = db.prepare(`
      INSERT OR REPLACE INTO hospital_pricing 
      (hospitalId, resourceType, baseRate, hourlyRate, minimumCharge, maximumCharge, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    pricingData.forEach(pricing => {
      const createdBy = hospitalAuthorities.find(auth => auth.hospital_id === pricing.hospitalId)?.id || 1;
      insertPricing.run(
        pricing.hospitalId,
        pricing.resourceType,
        pricing.baseRate,
        pricing.hourlyRate,
        pricing.minimumCharge,
        pricing.maximumCharge,
        createdBy
      );
    });

    // Seed user balances for hospital authorities
    console.log('💰 Seeding user balances...');
    const insertBalance = db.prepare(`
      INSERT OR REPLACE INTO user_balances 
      (userId, userType, hospitalId, currentBalance, totalEarnings)
      VALUES (?, ?, ?, ?, ?)
    `);

    hospitalAuthorities.forEach(auth => {
      if (auth.hospital_id) {
        insertBalance.run(
          auth.id,
          'hospital-authority',
          auth.hospital_id,
          Math.floor(Math.random() * 5000) + 1000, // Random balance between 1000-6000
          Math.floor(Math.random() * 10000) + 2000  // Random total earnings between 2000-12000
        );
      }
    });

    // Seed admin balance
    if (admins.length > 0) {
      insertBalance.run(
        admins[0].id,
        'admin',
        null,
        Math.floor(Math.random() * 20000) + 5000, // Random balance between 5000-25000
        Math.floor(Math.random() * 50000) + 10000  // Random total earnings between 10000-60000
      );
    }

    // Seed some sample transactions
    console.log('💳 Seeding sample transactions...');
    const bookings = db.prepare('SELECT id, userId, hospitalId, paymentAmount FROM bookings LIMIT 5').all();
    
    if (bookings.length > 0) {
      const insertTransaction = db.prepare(`
        INSERT OR REPLACE INTO transactions 
        (bookingId, userId, hospitalId, amount, serviceCharge, hospitalAmount, paymentMethod, transactionId, status, processedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      bookings.forEach((booking, index) => {
        const amount = booking.paymentAmount || 200.00;
        const serviceCharge = amount * 0.05; // 5% service charge
        const hospitalAmount = amount - serviceCharge;
        const transactionId = `TXN_${Date.now()}_${index + 1}`;
        
        insertTransaction.run(
          booking.id,
          booking.userId,
          booking.hospitalId,
          amount,
          serviceCharge,
          hospitalAmount,
          'credit_card',
          transactionId,
          'completed',
          new Date().toISOString()
        );
      });
    }

    // Seed payment configurations for hospitals
    console.log('⚙️  Seeding payment configurations...');
    const insertPaymentConfig = db.prepare(`
      INSERT OR REPLACE INTO payment_config 
      (hospitalId, serviceChargeRate, cancellationWindow, refundPercentage, minimumBookingAmount, paymentMethods, cancellationPolicy, refundPolicy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    hospitals.forEach(hospital => {
      insertPaymentConfig.run(
        hospital.id,
        0.05, // 5% service charge
        24,   // 24 hours cancellation window
        0.80, // 80% refund
        50.00, // $50 minimum booking
        JSON.stringify(['credit_card', 'debit_card', 'bank_transfer']),
        'Bookings can be cancelled up to 24 hours before the scheduled date for an 80% refund.',
        'Refunds will be processed within 3-5 business days to the original payment method.'
      );
    });

    // Commit transaction
    db.exec('COMMIT');

    console.log('✅ Financial data seeding completed successfully!');
    console.log(`   - Seeded pricing for ${pricingData.length} resource types`);
    console.log(`   - Created balances for ${hospitalAuthorities.length + admins.length} users`);
    console.log(`   - Generated ${bookings.length} sample transactions`);
    console.log(`   - Configured payment settings for ${hospitals.length} hospitals`);

  } catch (error) {
    db.exec('ROLLBACK');
    console.error('❌ Financial data seeding failed:', error.message);
    throw error;
  }
};

// Run seeder if called directly
if (require.main === module) {
  seedFinancialData();
}

module.exports = { seedFinancialData };