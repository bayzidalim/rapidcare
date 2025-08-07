const { expect } = require('chai');
const PaymentProcessingService = require('../../services/paymentProcessingService');
const RevenueManagementService = require('../../services/revenueManagementService');
const Transaction = require('../../models/Transaction');
const UserBalance = require('../../models/UserBalance');
const { formatTaka, roundTaka } = require('../../utils/currencyUtils');
const db = require('../../config/database');

describe('Financial Data Consistency Tests with Concurrent Operations', function() {
  this.timeout(30000);

  let testHospitalId = 9004;
  let testUserId = 9004;
  let testAdminId = 9005;
  let consistencyTestTransactions = [];

  before(function() {
    // Setup test data for consistency tests
    try {
      db.exec(`INSERT OR REPLACE INTO users (id, email, userType, name) VALUES (${testUserId}, 'consistency-test@example.com', 'hospital-authority', 'Consistency Test User')`);
      db.exec(`INSERT OR REPLACE INTO users (id, email, userType, name) VALUES (${testAdminId}, 'admin-consistency@example.com', 'admin', 'Admin Consistency User')`);
      db.exec(`INSERT OR REPLACE INTO hospitals (id, name, city, contactNumber) VALUES (${testHospitalId}, 'Consistency Test Hospital', 'Dhaka', '01712345678')`);
      
      // Initialize balances with known values
      db.exec(`INSERT OR REPLACE INTO user_balances (userId, userType, hospitalId, currentBalance, totalEarnings) VALUES (${testUserId}, 'hospital-authority', ${testHospitalId}, 1000.00, 1000.00)`);
      db.exec(`INSERT OR REPLACE INTO user_balances (userId, userType, currentBalance, totalEarnings) VALUES (${testAdminId}, 'admin', 500.00, 500.00)`);
    } catch (error) {
      console.log('Consistency test setup error (expected):', error.message);
    }
  });

  after(function() {
    // Cleanup consistency test data
    try {
      consistencyTestTransactions.forEach(txnId => {
        db.exec(`DELETE FROM transactions WHERE id = ${txnId}`);
      });
      db.exec(`DELETE FROM balance_transactions WHERE balanceId IN (SELECT id FROM user_balances WHERE userId IN (${testUserId}, ${testAdminId}))`);
      db.exec(`DELETE FROM user_balances WHERE userId IN (${testUserId}, ${testAdminId})`);
      db.exec(`DELETE FROM users WHERE id IN (${testUserId}, ${testAdminId})`);
      db.exec(`DELETE FROM hospitals WHERE id = ${testHospitalId}`);
    } catch (error) {
      console.log('Consistency cleanup error (expected):', error.message);
    }
  });

  describe('Concurrent Payment Processing Consistency', function() {
    it('should maintain transaction integrity during concurrent payments', async function() {
      const concurrentPayments = 50;
      const baseAmount = 1000; // 1000 Taka base amount

      console.log(`\n🔄 Testing transaction integrity with ${concurrentPayments} concurrent payments`);

      // Record initial state
      const initialHospitalBalance = UserBalance.getBalance(testUserId, testHospitalId);
      const initialAdminBalance = UserBalance.getAdminBalance(testAdminId);
      const initialTransactionCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get().count;

      // Create concurrent payment operations
      const paymentPromises = [];
      for (let i = 0; i < concurrentPayments; i++) {
        const amount = baseAmount + (i * 10); // Varying amounts
        
        // Create a booking for each payment
        const bookingId = 5000 + i;
        try {
          db.exec(`INSERT OR REPLACE INTO bookings (id, userId, hospitalId, resourceType, patientName, paymentAmount, status, paymentStatus) VALUES (${bookingId}, ${testUserId}, ${testHospitalId}, 'beds', 'Test Patient ${i}', ${amount}, 'confirmed', 'pending')`);
        } catch (error) {
          // Expected for test setup
        }

        const paymentData = {
          mobileNumber: `0175${String(i).padStart(4, '0')}`,
          pin: '1234',
          amount: amount
        };

        paymentPromises.push(
          PaymentProcessingService.processBookingPayment(bookingId, paymentData, testUserId)
            .then(result => {
              if (result.success && result.transaction) {
                consistencyTestTransactions.push(result.transaction.id);
              }
              return result;
            })
            .catch(error => ({ success: false, error: error.message }))
        );
      }

      // Execute all payments concurrently
      const results = await Promise.allSettled(paymentPromises);
      
      // Analyze results
      const successfulPayments = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).map(r => r.value);
      
      const failedPayments = results.filter(r => 
        r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
      );

      console.log(`✅ Successful payments: ${successfulPayments.length}/${concurrentPayments}`);
      console.log(`❌ Failed payments: ${failedPayments.length}/${concurrentPayments}`);

      // Verify transaction consistency
      const finalTransactionCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get().count;
      const newTransactions = finalTransactionCount - initialTransactionCount;

      expect(newTransactions).to.equal(successfulPayments.length, 'Transaction count should match successful payments');

      // Verify balance consistency
      const finalHospitalBalance = UserBalance.getBalance(testUserId, testHospitalId);
      const finalAdminBalance = UserBalance.getAdminBalance(testAdminId);

      // Calculate expected balance changes
      let expectedHospitalIncrease = 0;
      let expectedAdminIncrease = 0;

      successfulPayments.forEach(payment => {
        expectedHospitalIncrease += payment.transaction.hospitalAmount;
        expectedAdminIncrease += payment.transaction.serviceCharge;
      });

      const actualHospitalIncrease = finalHospitalBalance.currentBalance - initialHospitalBalance.currentBalance;
      const actualAdminIncrease = finalAdminBalance.currentBalance - initialAdminBalance.currentBalance;

      expect(actualHospitalIncrease).to.be.closeTo(expectedHospitalIncrease, 0.01, 'Hospital balance increase should match expected amount');
      expect(actualAdminIncrease).to.be.closeTo(expectedAdminIncrease, 0.01, 'Admin balance increase should match expected amount');

      console.log(`💰 Balance verification:`);
      console.log(`   Hospital: Expected +${formatTaka(expectedHospitalIncrease)}, Actual +${formatTaka(actualHospitalIncrease)}`);
      console.log(`   Admin: Expected +${formatTaka(expectedAdminIncrease)}, Actual +${formatTaka(actualAdminIncrease)}`);
    });

    it('should handle race conditions in balance updates correctly', async function() {
      const raceConditionTests = 20;
      const testAmount = 500; // 500 Taka per transaction

      console.log(`\n🏁 Testing race conditions with ${raceConditionTests} simultaneous balance updates`);

      // Get initial balance
      const initialBalance = UserBalance.getBalance(testUserId, testHospitalId);

      // Create multiple simultaneous balance update operations
      const updatePromises = [];
      for (let i = 0; i < raceConditionTests; i++) {
        updatePromises.push(
          RevenueManagementService.updateHospitalBalance(
            testHospitalId,
            testAmount,
            `RACE_TEST_${Date.now()}_${i}`
          ).catch(error => ({ success: false, error: error.message }))
        );
      }

      const updateResults = await Promise.allSettled(updatePromises);
      const successfulUpdates = updateResults.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;

      // Verify final balance
      const finalBalance = UserBalance.getBalance(testUserId, testHospitalId);
      const expectedIncrease = successfulUpdates * testAmount;
      const actualIncrease = finalBalance.currentBalance - initialBalance.currentBalance;

      console.log(`🔍 Race condition results:`);
      console.log(`   Successful updates: ${successfulUpdates}/${raceConditionTests}`);
      console.log(`   Expected increase: ${formatTaka(expectedIncrease)}`);
      console.log(`   Actual increase: ${formatTaka(actualIncrease)}`);

      expect(actualIncrease).to.be.closeTo(expectedIncrease, 0.01, 'Balance should reflect all successful updates');
    });

    it('should maintain referential integrity during concurrent operations', async function() {
      const integrityTests = 30;
      
      console.log(`\n🔗 Testing referential integrity with ${integrityTests} concurrent operations`);

      const operations = [];
      
      // Mix of different operations that could affect referential integrity
      for (let i = 0; i < integrityTests; i++) {
        const operationType = i % 3;
        
        switch (operationType) {
          case 0: // Create transaction
            operations.push(
              Promise.resolve().then(() => {
                try {
                  const transaction = Transaction.create({
                    bookingId: 6000 + i,
                    userId: testUserId,
                    hospitalId: testHospitalId,
                    amount: 800 + (i * 5),
                    serviceCharge: 40 + (i * 0.25),
                    hospitalAmount: 760 + (i * 4.75),
                    paymentMethod: 'bkash',
                    transactionId: `INTEGRITY_TEST_${Date.now()}_${i}`,
                    status: 'completed'
                  });
                  consistencyTestTransactions.push(transaction.id);
                  return { success: true, operation: 'create_transaction', id: transaction.id };
                } catch (error) {
                  return { success: false, operation: 'create_transaction', error: error.message };
                }
              })
            );
            break;
            
          case 1: // Update balance
            operations.push(
              RevenueManagementService.updateHospitalBalance(
                testHospitalId,
                100 + (i * 2),
                `INTEGRITY_BALANCE_${Date.now()}_${i}`
              ).then(result => ({ ...result, operation: 'update_balance' }))
              .catch(error => ({ success: false, operation: 'update_balance', error: error.message }))
            );
            break;
            
          case 2: // Query operations
            operations.push(
              Promise.resolve().then(() => {
                try {
                  const balance = UserBalance.getBalance(testUserId, testHospitalId);
                  return { success: true, operation: 'query_balance', balance: balance.currentBalance };
                } catch (error) {
                  return { success: false, operation: 'query_balance', error: error.message };
                }
              })
            );
            break;
        }
      }

      const results = await Promise.allSettled(operations);
      
      // Analyze integrity results
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

      console.log(`✅ Successful operations: ${successful}/${integrityTests}`);
      console.log(`❌ Failed operations: ${failed}/${integrityTests}`);

      // Verify database integrity
      const integrityCheck = this.performIntegrityCheck();
      expect(integrityCheck.isValid).to.be.true;
      
      if (!integrityCheck.isValid) {
        console.log('❌ Integrity violations:', integrityCheck.violations);
      }

      expect(successful).to.be.above(integrityTests * 0.8); // At least 80% success rate
    });
  });

  describe('Revenue Distribution Consistency', function() {
    it('should ensure atomic revenue distribution operations', async function() {
      const atomicTests = 25;
      const testAmounts = Array.from({ length: atomicTests }, (_, i) => 1200 + (i * 20));

      console.log(`\n⚛️  Testing atomic revenue distribution with ${atomicTests} operations`);

      // Record initial state
      const initialHospitalBalance = UserBalance.getBalance(testUserId, testHospitalId);
      const initialAdminBalance = UserBalance.getAdminBalance(testAdminId);

      // Create transactions for distribution
      const transactionIds = [];
      for (let i = 0; i < atomicTests; i++) {
        try {
          const transaction = Transaction.create({
            bookingId: 7000 + i,
            userId: testUserId,
            hospitalId: testHospitalId,
            amount: testAmounts[i],
            serviceCharge: RevenueManagementService.calculateServiceCharge(testAmounts[i], testHospitalId),
            hospitalAmount: testAmounts[i] - RevenueManagementService.calculateServiceCharge(testAmounts[i], testHospitalId),
            paymentMethod: 'bkash',
            transactionId: `ATOMIC_TEST_${Date.now()}_${i}`,
            status: 'pending'
          });
          transactionIds.push(transaction.id);
          consistencyTestTransactions.push(transaction.id);
        } catch (error) {
          console.log(`Transaction creation error for ${i}: ${error.message}`);
        }
      }

      // Perform concurrent revenue distributions
      const distributionPromises = transactionIds.map(txnId => 
        RevenueManagementService.distributeRevenue(txnId, testAmounts[transactionIds.indexOf(txnId)], testHospitalId)
          .catch(error => ({ success: false, error: error.message }))
      );

      const distributionResults = await Promise.allSettled(distributionPromises);
      const successfulDistributions = distributionResults.filter(r => 
        r.status === 'fulfilled' && r.value.success
      );

      console.log(`💰 Distribution results: ${successfulDistributions.length}/${atomicTests} successful`);

      // Verify atomicity - either all parts of a distribution succeed or none do
      const finalHospitalBalance = UserBalance.getBalance(testUserId, testHospitalId);
      const finalAdminBalance = UserBalance.getAdminBalance(testAdminId);

      const hospitalIncrease = finalHospitalBalance.currentBalance - initialHospitalBalance.currentBalance;
      const adminIncrease = finalAdminBalance.currentBalance - initialAdminBalance.currentBalance;

      // Calculate expected increases based on successful distributions
      let expectedHospitalIncrease = 0;
      let expectedAdminIncrease = 0;

      successfulDistributions.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          expectedHospitalIncrease += result.value.hospitalAmount;
          expectedAdminIncrease += result.value.serviceCharge;
        }
      });

      expect(hospitalIncrease).to.be.closeTo(expectedHospitalIncrease, 0.01, 'Hospital balance should match successful distributions');
      expect(adminIncrease).to.be.closeTo(expectedAdminIncrease, 0.01, 'Admin balance should match successful distributions');

      console.log(`🔍 Atomicity verification:`);
      console.log(`   Hospital: Expected +${formatTaka(expectedHospitalIncrease)}, Actual +${formatTaka(hospitalIncrease)}`);
      console.log(`   Admin: Expected +${formatTaka(expectedAdminIncrease)}, Actual +${formatTaka(adminIncrease)}`);
    });

    it('should handle partial failures gracefully', async function() {
      console.log('\n🛡️  Testing graceful handling of partial failures');

      // Create a mix of valid and invalid operations
      const operations = [
        // Valid operations
        { type: 'valid', amount: 1000, hospitalId: testHospitalId },
        { type: 'valid', amount: 1500, hospitalId: testHospitalId },
        { type: 'valid', amount: 2000, hospitalId: testHospitalId },
        
        // Invalid operations (should fail gracefully)
        { type: 'invalid', amount: -500, hospitalId: testHospitalId }, // Negative amount
        { type: 'invalid', amount: 1000, hospitalId: 999999 }, // Invalid hospital
        { type: 'invalid', amount: null, hospitalId: testHospitalId }, // Null amount
      ];

      const results = [];
      for (const operation of operations) {
        try {
          if (operation.type === 'valid') {
            const transaction = Transaction.create({
              bookingId: 8000 + results.length,
              userId: testUserId,
              hospitalId: operation.hospitalId,
              amount: operation.amount,
              serviceCharge: RevenueManagementService.calculateServiceCharge(operation.amount, operation.hospitalId),
              hospitalAmount: operation.amount - RevenueManagementService.calculateServiceCharge(operation.amount, operation.hospitalId),
              paymentMethod: 'bkash',
              transactionId: `PARTIAL_TEST_${Date.now()}_${results.length}`,
              status: 'pending'
            });
            consistencyTestTransactions.push(transaction.id);

            const distributionResult = await RevenueManagementService.distributeRevenue(
              transaction.id,
              operation.amount,
              operation.hospitalId
            );
            results.push({ ...operation, result: distributionResult, success: distributionResult.success });
          } else {
            // Simulate invalid operation
            const distributionResult = await RevenueManagementService.distributeRevenue(
              null, // Invalid transaction ID
              operation.amount,
              operation.hospitalId
            );
            results.push({ ...operation, result: distributionResult, success: distributionResult.success });
          }
        } catch (error) {
          results.push({ ...operation, result: { error: error.message }, success: false });
        }
      }

      // Verify that valid operations succeeded and invalid ones failed gracefully
      const validResults = results.filter(r => r.type === 'valid');
      const invalidResults = results.filter(r => r.type === 'invalid');

      const validSuccesses = validResults.filter(r => r.success).length;
      const invalidFailures = invalidResults.filter(r => !r.success).length;

      console.log(`✅ Valid operations succeeded: ${validSuccesses}/${validResults.length}`);
      console.log(`🛡️  Invalid operations failed gracefully: ${invalidFailures}/${invalidResults.length}`);

      expect(validSuccesses).to.equal(validResults.length, 'All valid operations should succeed');
      expect(invalidFailures).to.equal(invalidResults.length, 'All invalid operations should fail gracefully');
    });
  });

  describe('Data Consistency Verification', function() {
    it('should maintain consistency across all financial tables', function() {
      console.log('\n🔍 Performing comprehensive data consistency check');

      const consistencyReport = this.performComprehensiveConsistencyCheck();
      
      console.log(`📊 Consistency check results:`);
      console.log(`   Total checks: ${consistencyReport.totalChecks}`);
      console.log(`   Passed: ${consistencyReport.passed}`);
      console.log(`   Failed: ${consistencyReport.failed}`);

      if (consistencyReport.violations.length > 0) {
        console.log(`❌ Violations found:`);
        consistencyReport.violations.forEach((violation, index) => {
          console.log(`   ${index + 1}. ${violation}`);
        });
      }

      expect(consistencyReport.failed).to.equal(0, 'No consistency violations should be found');
      expect(consistencyReport.isConsistent).to.be.true;
    });

    it('should verify Taka precision consistency', function() {
      console.log('\n৳ Verifying Taka precision consistency across all operations');

      // Check all monetary values in the database for proper Taka precision
      const precisionChecks = [
        {
          table: 'transactions',
          columns: ['amount', 'serviceCharge', 'hospitalAmount'],
          query: 'SELECT amount, serviceCharge, hospitalAmount FROM transactions WHERE id IN (' + consistencyTestTransactions.join(',') + ')'
        },
        {
          table: 'user_balances',
          columns: ['currentBalance', 'totalEarnings'],
          query: `SELECT currentBalance, totalEarnings FROM user_balances WHERE userId IN (${testUserId}, ${testAdminId})`
        }
      ];

      let precisionViolations = [];

      precisionChecks.forEach(check => {
        try {
          const rows = db.prepare(check.query).all();
          rows.forEach((row, rowIndex) => {
            check.columns.forEach(column => {
              const value = row[column];
              if (value !== null && typeof value === 'number') {
                // Check if value has more than 2 decimal places
                const decimalPlaces = (value.toString().split('.')[1] || '').length;
                if (decimalPlaces > 2) {
                  precisionViolations.push(`${check.table}.${column}[${rowIndex}]: ${value} has ${decimalPlaces} decimal places`);
                }
                
                // Check if value is properly rounded to Taka precision
                const rounded = roundTaka(value);
                if (Math.abs(value - rounded) > 0.001) {
                  precisionViolations.push(`${check.table}.${column}[${rowIndex}]: ${value} not properly rounded (should be ${rounded})`);
                }
              }
            });
          });
        } catch (error) {
          console.log(`Precision check error for ${check.table}: ${error.message}`);
        }
      });

      console.log(`🔍 Precision check results:`);
      console.log(`   Violations found: ${precisionViolations.length}`);

      if (precisionViolations.length > 0) {
        console.log(`❌ Precision violations:`);
        precisionViolations.forEach((violation, index) => {
          console.log(`   ${index + 1}. ${violation}`);
        });
      }

      expect(precisionViolations.length).to.equal(0, 'No Taka precision violations should be found');
    });
  });

  // Helper methods for consistency checking
  function performIntegrityCheck() {
    const violations = [];
    
    try {
      // Check foreign key constraints
      const orphanedTransactions = db.prepare(`
        SELECT COUNT(*) as count FROM transactions t 
        LEFT JOIN users u ON t.userId = u.id 
        LEFT JOIN hospitals h ON t.hospitalId = h.id 
        WHERE u.id IS NULL OR h.id IS NULL
      `).get();
      
      if (orphanedTransactions.count > 0) {
        violations.push(`${orphanedTransactions.count} orphaned transactions found`);
      }

      // Check balance consistency
      const balanceCheck = db.prepare(`
        SELECT ub.userId, ub.currentBalance, 
               COALESCE(SUM(bt.amount), 0) as calculatedBalance
        FROM user_balances ub
        LEFT JOIN balance_transactions bt ON ub.id = bt.balanceId
        WHERE ub.userId IN (${testUserId}, ${testAdminId})
        GROUP BY ub.id, ub.userId, ub.currentBalance
      `).all();

      balanceCheck.forEach(row => {
        if (Math.abs(row.currentBalance - row.calculatedBalance) > 0.01) {
          violations.push(`Balance mismatch for user ${row.userId}: stored=${row.currentBalance}, calculated=${row.calculatedBalance}`);
        }
      });

    } catch (error) {
      violations.push(`Integrity check error: ${error.message}`);
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }

  function performComprehensiveConsistencyCheck() {
    let totalChecks = 0;
    let passed = 0;
    let failed = 0;
    const violations = [];

    const checks = [
      // Check 1: Transaction amount consistency
      () => {
        totalChecks++;
        try {
          const inconsistentTransactions = db.prepare(`
            SELECT id, amount, serviceCharge, hospitalAmount 
            FROM transactions 
            WHERE ABS((serviceCharge + hospitalAmount) - amount) > 0.01
            AND id IN (${consistencyTestTransactions.join(',') || '0'})
          `).all();
          
          if (inconsistentTransactions.length === 0) {
            passed++;
          } else {
            failed++;
            violations.push(`${inconsistentTransactions.length} transactions with amount inconsistencies`);
          }
        } catch (error) {
          failed++;
          violations.push(`Transaction amount check failed: ${error.message}`);
        }
      },

      // Check 2: Balance transaction history consistency
      () => {
        totalChecks++;
        try {
          const balanceInconsistencies = db.prepare(`
            SELECT bt.id, bt.amount, bt.balanceBefore, bt.balanceAfter
            FROM balance_transactions bt
            WHERE ABS((bt.balanceBefore + bt.amount) - bt.balanceAfter) > 0.01
          `).all();
          
          if (balanceInconsistencies.length === 0) {
            passed++;
          } else {
            failed++;
            violations.push(`${balanceInconsistencies.length} balance transaction inconsistencies`);
          }
        } catch (error) {
          failed++;
          violations.push(`Balance transaction check failed: ${error.message}`);
        }
      },

      // Check 3: Revenue distribution totals
      () => {
        totalChecks++;
        try {
          const revenueCheck = db.prepare(`
            SELECT 
              SUM(hospitalAmount) as totalHospitalRevenue,
              SUM(serviceCharge) as totalServiceCharge,
              SUM(amount) as totalAmount
            FROM transactions 
            WHERE status = 'completed'
            AND id IN (${consistencyTestTransactions.join(',') || '0'})
          `).get();
          
          if (revenueCheck && Math.abs((revenueCheck.totalHospitalRevenue + revenueCheck.totalServiceCharge) - revenueCheck.totalAmount) <= 0.01) {
            passed++;
          } else {
            failed++;
            violations.push('Revenue distribution totals do not match transaction amounts');
          }
        } catch (error) {
          failed++;
          violations.push(`Revenue distribution check failed: ${error.message}`);
        }
      }
    ];

    // Execute all checks
    checks.forEach(check => check());

    return {
      totalChecks,
      passed,
      failed,
      violations,
      isConsistent: failed === 0
    };
  }
});