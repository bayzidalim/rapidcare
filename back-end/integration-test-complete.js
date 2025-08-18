#!/usr/bin/env node

/**
 * Complete bKash Financial System Integration Test
 * Tests all components working together with Taka currency support
 */

const axios = require('axios');
const { formatTaka, parseTaka } = require('./utils/currencyUtils');

// Test configuration
const BASE_URL = 'http://localhost:5000/api';
const TEST_TIMEOUT = 30000;

// Test data
const testData = {
  admin: {
    email: 'admin@hospital.com',
    password: 'admin123'
  },
  hospitalAuthority: {
    email: 'hospital@test.com',
    password: 'password123'
  },
  patient: {
    email: 'user@test.com',
    password: 'password123'
  },
  hospital: {
    id: 1,
    name: 'Test Hospital'
  },
  booking: {
    hospitalId: 1,
    resourceType: 'beds',
    patientName: 'Test Patient',
    estimatedDuration: 24,
    paymentAmount: 2500.00 // 2500 Taka
  },
  bkashPayment: {
    mobileNumber: '01712345678',
    pin: '1234',
    amount: 2500.00
  }
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  }[type] || '📋';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function assert(condition, message) {
  if (condition) {
    testResults.passed++;
    log(`PASS: ${message}`, 'success');
  } else {
    testResults.failed++;
    testResults.errors.push(message);
    log(`FAIL: ${message}`, 'error');
    throw new Error(message);
  }
}

async function makeRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...(data && { data })
    };

    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`HTTP ${error.response.status}: ${error.response.data.error || error.response.data.message || 'Unknown error'}`);
    }
    throw error;
  }
}

// Test suite functions
async function testAuthentication() {
  log('Testing authentication system...');
  
  // Test admin login
  const adminLogin = await makeRequest('POST', '/auth/login', {
    email: testData.admin.email,
    password: testData.admin.password
  });
  
  assert(adminLogin.success, 'Admin login successful');
  assert(adminLogin.token, 'Admin token received');
  
  testData.tokens = { admin: adminLogin.token };
  
  // Test hospital authority login
  const hospitalLogin = await makeRequest('POST', '/auth/login', {
    email: testData.hospitalAuthority.email,
    password: testData.hospitalAuthority.password
  });
  
  assert(hospitalLogin.success, 'Hospital authority login successful');
  assert(hospitalLogin.token, 'Hospital authority token received');
  
  testData.tokens.hospitalAuthority = hospitalLogin.token;
  
  // Test patient login
  const patientLogin = await makeRequest('POST', '/auth/login', {
    email: testData.patient.email,
    password: testData.patient.password
  });
  
  assert(patientLogin.success, 'Patient login successful');
  assert(patientLogin.token, 'Patient token received');
  
  testData.tokens.patient = patientLogin.token;
}

async function testPricingManagement() {
  log('Testing pricing management with Taka currency...');
  
  // Test getting current pricing
  const currentPricing = await makeRequest('GET', `/hospitals/${testData.hospital.id}/pricing`);
  assert(currentPricing.success, 'Current pricing retrieved successfully');
  
  // Test updating pricing with Taka amounts
  const pricingUpdate = {
    resourceType: 'beds',
    baseRate: 2000.00, // 2000 Taka
    hourlyRate: 100.00, // 100 Taka per hour
    minimumCharge: 1500.00, // 1500 Taka minimum
    maximumCharge: 10000.00, // 10000 Taka maximum
    currency: 'BDT'
  };
  
  const updatedPricing = await makeRequest('PUT', `/hospitals/${testData.hospital.id}/pricing`, 
    pricingUpdate, testData.tokens.hospitalAuthority);
  
  assert(updatedPricing.success, 'Pricing updated successfully with Taka amounts');
  assert(updatedPricing.data.pricing.baseRate, 'Base rate set correctly');
  
  // Test pricing calculation
  const calculation = await makeRequest('POST', '/pricing/calculate', {
    hospitalId: testData.hospital.id,
    resourceType: 'beds',
    duration: 24
  });
  
  assert(calculation.success, 'Booking amount calculated successfully');
  assert(calculation.data.calculatedAmount > 0, 'Calculated amount is positive');
  
  testData.calculatedAmount = calculation.data.calculatedAmount;
}

async function testBookingCreation() {
  log('Testing booking creation...');
  
  // Create a booking
  const booking = await makeRequest('POST', '/bookings', {
    hospitalId: testData.hospital.id,
    resourceType: testData.booking.resourceType,
    patientName: testData.booking.patientName,
    estimatedDuration: testData.booking.estimatedDuration,
    paymentAmount: testData.calculatedAmount || testData.booking.paymentAmount
  }, testData.tokens.patient);
  
  assert(booking.success, 'Booking created successfully');
  assert(booking.data.id, 'Booking ID assigned');
  assert(booking.data.paymentStatus === 'pending', 'Booking payment status is pending');
  
  testData.bookingId = booking.data.id;
}

async function testBkashPaymentProcessing() {
  log('Testing bKash payment processing with Taka currency...');
  
  // Process bKash payment
  const paymentData = {
    bookingId: testData.bookingId,
    paymentData: {
      mobileNumber: testData.bkashPayment.mobileNumber,
      pin: testData.bkashPayment.pin,
      paymentMethod: 'bkash'
    }
  };
  
  const paymentResult = await makeRequest('POST', '/payments/process', 
    paymentData, testData.tokens.patient);
  
  assert(paymentResult.success, 'bKash payment processed successfully');
  assert(paymentResult.data.transaction, 'Transaction record created');
  assert(paymentResult.data.transaction.status === 'completed', 'Transaction status is completed');
  assert(paymentResult.data.transaction.paymentMethod === 'bkash', 'Payment method is bKash');
  
  testData.transactionId = paymentResult.data.transaction.id;
  testData.transactionRef = paymentResult.data.transaction.transactionId;
  
  // Verify Taka amounts in transaction
  const transaction = paymentResult.data.transaction;
  assert(transaction.amount > 0, 'Transaction amount is positive');
  assert(transaction.serviceCharge > 0, 'Service charge calculated');
  assert(transaction.hospitalAmount > 0, 'Hospital amount calculated');
  assert(
    Math.abs(transaction.amount - (transaction.serviceCharge + transaction.hospitalAmount)) < 0.01,
    'Amount distribution is correct'
  );
}

async function testRevenueDistribution() {
  log('Testing revenue distribution with Taka currency...');
  
  // Check hospital balance
  const hospitalBalance = await makeRequest('GET', `/balances/hospital/${testData.hospital.id}`, 
    null, testData.tokens.hospitalAuthority);
  
  assert(hospitalBalance.success, 'Hospital balance retrieved successfully');
  assert(hospitalBalance.data.balance, 'Hospital balance exists');
  assert(hospitalBalance.data.balance.currentBalance > 0, 'Hospital balance is positive');
  
  // Check admin balance
  const adminBalance = await makeRequest('GET', '/balances/admin', 
    null, testData.tokens.admin);
  
  assert(adminBalance.success, 'Admin balance retrieved successfully');
  assert(adminBalance.data.balances.length > 0, 'Admin balances exist');
  assert(adminBalance.data.balances[0].currentBalance > 0, 'Admin balance is positive');
}

async function testPaymentReceipt() {
  log('Testing bKash-style payment receipt generation...');
  
  // Get payment receipt
  const receipt = await makeRequest('GET', `/payments/${testData.transactionId}/receipt`, 
    null, testData.tokens.patient);
  
  assert(receipt.success, 'Payment receipt retrieved successfully');
  assert(receipt.data.receipt, 'Receipt data exists');
  assert(receipt.data.receipt.receiptType === 'bkash_payment', 'Receipt type is bKash payment');
  assert(receipt.data.receipt.currency === 'BDT', 'Receipt currency is BDT');
  assert(receipt.data.receipt.currencySymbol === '৳', 'Receipt uses Taka symbol');
  
  // Verify receipt contains all required bKash-style information
  const receiptData = receipt.data.receipt;
  assert(receiptData.transactionId, 'Receipt contains transaction ID');
  assert(receiptData.bkashTransactionId, 'Receipt contains bKash transaction ID');
  assert(receiptData.mobileNumber, 'Receipt contains mobile number');
  assert(receiptData.amount, 'Receipt contains amount');
  assert(receiptData.paymentMethod === 'bKash', 'Receipt shows bKash payment method');
}

async function testRevenueAnalytics() {
  log('Testing revenue analytics with Taka formatting...');
  
  // Test hospital revenue analytics
  const hospitalRevenue = await makeRequest('GET', `/revenue/hospital/${testData.hospital.id}`, 
    null, testData.tokens.hospitalAuthority);
  
  assert(hospitalRevenue.success, 'Hospital revenue analytics retrieved successfully');
  assert(hospitalRevenue.data.totalRevenue, 'Total revenue data exists');
  assert(hospitalRevenue.data.currentBalance, 'Current balance data exists');
  
  // Test admin revenue analytics
  const adminRevenue = await makeRequest('GET', '/revenue/admin', 
    null, testData.tokens.admin);
  
  assert(adminRevenue.success, 'Admin revenue analytics retrieved successfully');
  assert(adminRevenue.data.platformRevenue, 'Platform revenue data exists');
  assert(adminRevenue.data.serviceChargeAnalytics, 'Service charge analytics exist');
}

async function testFinancialReconciliation() {
  log('Testing financial reconciliation with BDT support...');
  
  // Test reconciliation report
  const reconciliation = await makeRequest('GET', '/revenue/reconciliation', 
    null, testData.tokens.admin);
  
  assert(reconciliation.success, 'Reconciliation report retrieved successfully');
  assert(reconciliation.data.summary, 'Reconciliation summary exists');
  assert(reconciliation.data.summary.totalRevenue >= 0, 'Total revenue is valid');
  assert(reconciliation.data.summary.totalServiceCharges >= 0, 'Total service charges is valid');
  assert(reconciliation.data.summary.totalHospitalRevenue >= 0, 'Total hospital revenue is valid');
}

async function testPaymentHistory() {
  log('Testing payment history with Taka amounts...');
  
  // Test patient payment history
  const patientHistory = await makeRequest('GET', '/payments/history', 
    null, testData.tokens.patient);
  
  assert(patientHistory.success, 'Patient payment history retrieved successfully');
  assert(Array.isArray(patientHistory.data), 'Payment history is an array');
  assert(patientHistory.data.length > 0, 'Payment history contains transactions');
  
  // Verify the recent transaction is in history
  const recentTransaction = patientHistory.data.find(t => t.id === testData.transactionId);
  assert(recentTransaction, 'Recent transaction found in history');
  assert(recentTransaction.status === 'completed', 'Transaction status is completed in history');
  assert(recentTransaction.paymentMethod === 'bkash', 'Payment method is bKash in history');
}

async function testCurrencyFormatting() {
  log('Testing Taka currency formatting throughout system...');
  
  // Test various amounts with Taka formatting
  const testAmounts = [100, 1000, 10000, 100000];
  
  for (const amount of testAmounts) {
    const formatted = formatTaka(amount);
    assert(formatted.includes('৳'), `Amount ${amount} formatted with Taka symbol: ${formatted}`);
    
    const parsed = parseTaka(formatted);
    assert(Math.abs(parsed - amount) < 0.01, `Amount ${amount} parsed correctly from ${formatted}`);
  }
}

async function testErrorHandling() {
  log('Testing error handling and validation...');
  
  // Test invalid payment data
  try {
    await makeRequest('POST', '/payments/process', {
      bookingId: 99999, // Non-existent booking
      paymentData: {
        mobileNumber: 'invalid',
        pin: '123',
        paymentMethod: 'bkash'
      }
    }, testData.tokens.patient);
    
    assert(false, 'Should have thrown error for invalid booking');
  } catch (error) {
    assert(true, 'Invalid booking payment correctly rejected');
  }
  
  // Test invalid pricing data
  try {
    await makeRequest('PUT', `/hospitals/${testData.hospital.id}/pricing`, {
      resourceType: 'beds',
      baseRate: -100, // Negative rate
      currency: 'BDT'
    }, testData.tokens.hospitalAuthority);
    
    assert(false, 'Should have thrown error for negative rate');
  } catch (error) {
    assert(true, 'Negative pricing rate correctly rejected');
  }
}

async function testSystemIntegration() {
  log('Testing complete system integration...');
  
  // Verify all components are working together
  
  // 1. Check that booking status was updated after payment
  const updatedBooking = await makeRequest('GET', `/bookings/${testData.bookingId}`, 
    null, testData.tokens.patient);
  
  assert(updatedBooking.success, 'Updated booking retrieved successfully');
  assert(updatedBooking.data.paymentStatus === 'paid', 'Booking payment status updated to paid');
  assert(updatedBooking.data.transactionId === testData.transactionRef, 'Booking linked to transaction');
  
  // 2. Verify transaction integrity
  const transactionDetails = await makeRequest('GET', `/payments/transaction/${testData.transactionRef}`, 
    null, testData.tokens.patient);
  
  assert(transactionDetails.success, 'Transaction details retrieved successfully');
  assert(transactionDetails.data.transaction.bookingId === testData.bookingId, 'Transaction linked to booking');
  
  // 3. Check balance consistency
  const finalHospitalBalance = await makeRequest('GET', `/balances/hospital/${testData.hospital.id}`, 
    null, testData.tokens.hospitalAuthority);
  
  const finalAdminBalance = await makeRequest('GET', '/balances/admin', 
    null, testData.tokens.admin);
  
  assert(finalHospitalBalance.success && finalAdminBalance.success, 'Final balances retrieved successfully');
  
  // 4. Verify revenue analytics reflect the transaction
  const finalRevenue = await makeRequest('GET', `/revenue/hospital/${testData.hospital.id}`, 
    null, testData.tokens.hospitalAuthority);
  
  assert(finalRevenue.success, 'Final revenue analytics retrieved successfully');
  assert(finalRevenue.data.totalRevenue.totalRevenue > 0, 'Revenue analytics show positive revenue');
}

// Main test execution
async function runIntegrationTests() {
  console.log('🚀 Starting Complete bKash Financial System Integration Test');
  console.log('================================================================');
  console.log('📋 Testing all components with Taka currency support:');
  console.log('   ✅ Authentication system');
  console.log('   ✅ Pricing management with Taka amounts');
  console.log('   ✅ Booking creation and management');
  console.log('   ✅ bKash payment processing');
  console.log('   ✅ Revenue distribution in BDT currency');
  console.log('   ✅ Payment receipt generation');
  console.log('   ✅ Revenue analytics with Taka formatting');
  console.log('   ✅ Financial reconciliation');
  console.log('   ✅ Payment history tracking');
  console.log('   ✅ Currency formatting utilities');
  console.log('   ✅ Error handling and validation');
  console.log('   ✅ Complete system integration');
  console.log('================================================================\n');
  
  const startTime = Date.now();
  
  try {
    // Run all test suites
    await testAuthentication();
    await testPricingManagement();
    await testBookingCreation();
    await testBkashPaymentProcessing();
    await testRevenueDistribution();
    await testPaymentReceipt();
    await testRevenueAnalytics();
    await testFinancialReconciliation();
    await testPaymentHistory();
    await testCurrencyFormatting();
    await testErrorHandling();
    await testSystemIntegration();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n================================================================');
    console.log('🎉 INTEGRATION TEST RESULTS');
    console.log('================================================================');
    console.log(`✅ Tests Passed: ${testResults.passed}`);
    console.log(`❌ Tests Failed: ${testResults.failed}`);
    console.log(`⏱️  Total Duration: ${duration.toFixed(2)} seconds`);
    
    if (testResults.failed === 0) {
      console.log('\n🎊 ALL TESTS PASSED! bKash Financial System is fully integrated and working correctly.');
      console.log('💰 Taka currency support is functioning properly throughout the system.');
      console.log('🔒 Financial integrity and security measures are in place.');
      console.log('📊 Analytics and reporting are working with proper Taka formatting.');
      process.exit(0);
    } else {
      console.log('\n❌ SOME TESTS FAILED:');
      testResults.errors.forEach(error => console.log(`   - ${error}`));
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 INTEGRATION TEST FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️  Integration test interrupted by user');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runIntegrationTests();
}

module.exports = {
  runIntegrationTests,
  testResults
};