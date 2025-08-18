const { expect } = require('chai');
const RevenueManagementService = require('../../services/revenueManagementService');
const PaymentProcessingService = require('../../services/paymentProcessingService');
const UserBalance = require('../../models/UserBalance');
const Transaction = require('../../models/Transaction');
const { formatTaka, roundTaka } = require('../../utils/currencyUtils');
const db = require('../../config/database');

describe('Revenue Distribution and Balance Management Integration Tests', function() {
  this.timeout(20000);

  let testHospitalId = 9002;
  let testUserId = 9002;
  let testAdminId = 9003;
  let testTransactions = [];

  before(function() {
    // Setup test data
    try {
      db.exec(`INSERT OR REPLACE INTO users (id, email, userType, name) VALUES (${testUserId}, 'revenue-test@example.com', 'user', 'Revenue Test User')`);
      db.exec(`INSERT OR REPLACE INTO users (id, email, userType, name) VALUES (${testAdminId}, 'admin-test@example.com', 'admin', 'Admin Test User')`);
      db.exec(`INSERT OR REPLACE INTO hospitals (id, name, city, contactNumber) VALUES (${testHospitalId}, 'Revenue Test Hospital', 'Dhaka', '01712345678')`);
      
      // Initialize balances
      db.exec(`INSERT OR REPLACE INTO user_balances (userId, userType, hospitalId, currentBalance, totalEarnings) VALUES (${testUserId}, 'hospital-authority', ${testHospitalId}, 0.00, 0.00)`);
      db.exec(`INSERT OR REPLACE INTO user_balances (userId, userType, currentBalance, totalEarnings) VALUES (${testAdminId}, 'admin', 0.00, 0.00)`);
    } catch (error) {
      console.log('Test data setup error (expected):', error.message);
    }
  });

  after(function() {
    // Cleanup test data
    try {
      testTransactions.forEach(txnId => {
        db.exec(`DELETE FROM transactions WHERE id = ${txnId}`);
      });
      db.exec(`DELETE FROM user_balances WHERE userId IN (${testUserId}, ${testAdminId})`);
      db.exec(`DELETE FROM balance_transactions WHERE balanceId IN (SELECT id FROM user_balances WHERE userId IN (${testUserId}, ${testAdminId}))`);
      db.exec(`DELETE FROM users WHERE id IN (${testUserId}, ${testAdminId})`);
      db.exec(`DELETE FROM hospitals WHERE id = ${testHospitalId}`);
    } catch (error) {
      console.log('Cleanup error (expected):', error.message);
    }
  });

  describe('Service Charge Calculation', function() {
    it('should calculate service charges accurately for various amounts', function() {
      const testCases = [
        { amount: 100.00, expectedRate: 0.05, description: '100 Taka' },
        { amount: 1000.00, expectedRate: 0.05, description: '1000 Taka' },
        { amount: 5000.00, expectedRate: 0.05, description: '5000 Taka' },
        { amount: 10000.00, expectedRate: 0.05, description: '10000 Taka' }
      ];

      testCases.forEach(({ amount, expectedRate, description }) => {
        const serviceCharge = RevenueManagementService.calculateServiceCharge(amount, testHospitalId);
        const expectedCharge = roundTaka(amount * expectedRate);
        
        expect(serviceCharge).to.be.closeTo(expectedCharge, 0.01, `Service charge calculation failed for ${description}`);
        expect(serviceCharge).to.be.above(0, `Service charge should be positive for ${description}`);
      });
    });

    it('should handle edge cases in service charge calculation', function() {
      const edgeCases = [
        { amount: 0, expected: 0, description: 'Zero amount' },
        { amount: 0.01, expected: 0.0005, description: 'Minimum amount' },
        { amount: 999999.99, expected: 49999.9995, description: 'Maximum amount' }
      ];

      edgeCases.forEach(({ amount, expected, description }) => {
        const serviceCharge = RevenueManagementService.calculateServiceCharge(amount, testHospitalId);
        expect(serviceCharge).to.be.closeTo(expected, 0.01, `Edge case failed: ${description}`);
      });
    });

    it('should maintain precision in Taka calculations', function() {
      const testAmount = 1234.56;
      const serviceCharge = RevenueManagementService.calculateServiceCharge(testAmount, testHospitalId);
      const hospitalAmount = roundTaka(testAmount - serviceCharge);

      // Verify total equals original amount (within Taka precision)
      expect(serviceCharge + hospitalAmount).to.be.closeTo(testAmount, 0.01);
      
      // Verify both amounts are properly rounded to Taka precision
      expect(serviceCharge % 0.01).to.be.closeTo(0, 0.001);
      expect(hospitalAmount % 0.01).to.be.closeTo(0, 0.001);
    });
  });

  describe('Revenue Distribution Process', function() {
    it('should distribute revenue correctly between hospital and admin', async function() {
      const testAmount = 2000.00; // 2000 Taka
      
      // Get initial balances
      const initialHospitalBalance = UserBalance.getBalance(testUserId, testHospitalId);
      const initialAdminBalance = UserBalance.getAdminBalance(testAdminId);

      // Create a test transaction
      const transaction = Transaction.create({
        bookingId: 1,
        userId: testUserId,
        hospitalId: testHospitalId,
        amount: testAmount,
        serviceCharge: RevenueManagementService.calculateServiceCharge(testAmount, testHospitalId),
        hospitalAmount: testAmount - RevenueManagementService.calculateServiceCharge(testAmount, testHospitalId),
        paymentMethod: 'bkash',
        transactionId: `REVENUE_TEST_${Date.now()}`,
        status: 'completed'
      });

      testTransactions.push(transaction.id);

      // Distribute revenue
      const distributionResult = await RevenueManagementService.distributeRevenue(
        transaction.id,
        testAmount,
        testHospitalId
      );

      expect(distributionResult.success).to.be.true;
      expect(distributionResult.hospitalAmount).to.be.above(0);
      expect(distributionResult.serviceCharge).to.be.above(0);
      expect(distributionResult.hospitalAmount + distributionResult.serviceCharge).to.be.closeTo(testAmount, 0.01);

      // Verify balance updates
      const finalHospitalBalance = UserBalance.getBalance(testUserId, testHospitalId);
      const finalAdminBalance = UserBalance.getAdminBalance(testAdminId);

      expect(finalHospitalBalance.currentBalance).to.be.above(initialHospitalBalance.currentBalance);
      expect(finalAdminBalance.currentBalance).to.be.above(initialAdminBalance.currentBalance);
    });

    it('should handle multiple concurrent revenue distributions', async function() {
      const concurrentDistributions = [];
      const testAmounts = [500, 750, 1000, 1250, 1500]; // Various Taka amounts

      // Create multiple transactions concurrently
      for (let i = 0; i < testAmounts.length; i++) {
        const amount = testAmounts[i];
        const transaction = Transaction.create({
          bookingId: i + 10,
          userId: testUserId,
          hospitalId: testHospitalId,
          amount: amount,
          serviceCharge: RevenueManagementService.calculateServiceCharge(amount, testHospitalId),
          hospitalAmount: amount - RevenueManagementService.calculateServiceCharge(amount, testHospitalId),
          paymentMethod: 'bkash',
          transactionId: `CONCURRENT_TEST_${Date.now()}_${i}`,
          status: 'completed'
        });

        testTransactions.push(transaction.id);

        concurrentDistributions.push(
          RevenueManagementService.distributeRevenue(transaction.id, amount, testHospitalId)
        );
      }

      // Execute all distributions concurrently
      const results = await Promise.allSettled(concurrentDistributions);

      // Verify all distributions succeeded
      results.forEach((result, index) => {
        expect(result.status).to.equal('fulfilled', `Concurrent distribution ${index} failed`);
        if (result.status === 'fulfilled') {
          expect(result.value.success).to.be.true;
        }
      });

      // Verify balance consistency
      const finalBalance = UserBalance.getBalance(testUserId, testHospitalId);
      expect(finalBalance.currentBalance).to.be.above(0);
    });

    it('should maintain transaction integrity during revenue distribution', async function() {
      const testAmount = 1800.00;
      
      // Get initial state
      const initialHospitalBalance = UserBalance.getBalance(testUserId, testHospitalId);
      const initialAdminBalance = UserBalance.getAdminBalance(testAdminId);

      // Create transaction
      const transaction = Transaction.create({
        bookingId: 20,
        userId: testUserId,
        hospitalId: testHospitalId,
        amount: testAmount,
        serviceCharge: RevenueManagementService.calculateServiceCharge(testAmount, testHospitalId),
        hospitalAmount: testAmount - RevenueManagementService.calculateServiceCharge(testAmount, testHospitalId),
        paymentMethod: 'bkash',
        transactionId: `INTEGRITY_TEST_${Date.now()}`,
        status: 'completed'
      });

      testTransactions.push(transaction.id);

      // Distribute revenue
      const distributionResult = await RevenueManagementService.distributeRevenue(
        transaction.id,
        testAmount,
        testHospitalId
      );

      // Verify integrity
      const integrityCheck = await RevenueManagementService.verifyRevenueDistributionIntegrity(
        transaction.id,
        testAmount,
        distributionResult.serviceCharge,
        distributionResult.hospitalAmount
      );

      expect(integrityCheck.isValid).to.be.true;
      if (!integrityCheck.isValid) {
        console.log('Integrity errors:', integrityCheck.errors);
      }
    });
  });

  describe('Balance Management', function() {
    it('should update hospital balances correctly', async function() {
      const testAmount = 1200.00;
      const serviceCharge = RevenueManagementService.calculateServiceCharge(testAmount, testHospitalId);
      const hospitalAmount = roundTaka(testAmount - serviceCharge);

      const initialBalance = UserBalance.getBalance(testUserId, testHospitalId);

      // Update hospital balance
      const updateResult = await RevenueManagementService.updateHospitalBalance(
        testHospitalId,
        hospitalAmount,
        `BALANCE_TEST_${Date.now()}`
      );

      expect(updateResult.success).to.be.true;

      const finalBalance = UserBalance.getBalance(testUserId, testHospitalId);
      expect(finalBalance.currentBalance).to.be.closeTo(
        initialBalance.currentBalance + hospitalAmount,
        0.01
      );
    });

    it('should update admin balances correctly', async function() {
      const testAmount = 1600.00;
      const serviceCharge = RevenueManagementService.calculateServiceCharge(testAmount, testHospitalId);

      const initialBalance = UserBalance.getAdminBalance(testAdminId);

      // Update admin balance
      const updateResult = await RevenueManagementService.updateAdminBalance(
        serviceCharge,
        `ADMIN_BALANCE_TEST_${Date.now()}`
      );

      expect(updateResult.success).to.be.true;

      const finalBalance = UserBalance.getAdminBalance(testAdminId);
      expect(finalBalance.currentBalance).to.be.closeTo(
        initialBalance.currentBalance + serviceCharge,
        0.01
      );
    });

    it('should track balance transaction history', async function() {
      const testAmount = 900.00;
      const serviceCharge = RevenueManagementService.calculateServiceCharge(testAmount, testHospitalId);
      const hospitalAmount = roundTaka(testAmount - serviceCharge);

      // Create transaction and distribute revenue
      const transaction = Transaction.create({
        bookingId: 30,
        userId: testUserId,
        hospitalId: testHospitalId,
        amount: testAmount,
        serviceCharge: serviceCharge,
        hospitalAmount: hospitalAmount,
        paymentMethod: 'bkash',
        transactionId: `HISTORY_TEST_${Date.now()}`,
        status: 'completed'
      });

      testTransactions.push(transaction.id);

      await RevenueManagementService.distributeRevenue(transaction.id, testAmount, testHospitalId);

      // Verify transaction history is recorded
      const hospitalBalance = UserBalance.getBalance(testUserId, testHospitalId);
      expect(hospitalBalance.lastTransactionAt).to.exist;

      const adminBalance = UserBalance.getAdminBalance(testAdminId);
      expect(adminBalance.lastTransactionAt).to.exist;
    });
  });

  describe('Financial Analytics Integration', function() {
    it('should provide accurate revenue analytics', function() {
      const dateRange = {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };

      const hospitalAnalytics = RevenueManagementService.getRevenueAnalytics(testHospitalId, dateRange);
      expect(hospitalAnalytics).to.exist;
      expect(hospitalAnalytics.totalRevenue).to.be.a('number');

      const adminAnalytics = RevenueManagementService.getAdminRevenueAnalytics(dateRange);
      expect(adminAnalytics).to.exist;
      expect(adminAnalytics.platformRevenue).to.be.a('number');
    });

    it('should calculate revenue metrics correctly', function() {
      const metrics = RevenueManagementService.getRevenueMetrics(testHospitalId, 'month');
      expect(metrics).to.exist;
      expect(metrics.totalRevenue).to.be.a('number');
      expect(metrics.dailyAnalytics).to.be.an('array');
    });

    it('should provide resource-wise revenue breakdown', function() {
      const breakdown = RevenueManagementService.getResourceRevenueBreakdown(testHospitalId);
      expect(breakdown).to.be.an('array');
    });
  });

  describe('Reconciliation and Audit', function() {
    it('should perform balance reconciliation', function() {
      const reconciliationReport = RevenueManagementService.reconcileBalances();
      
      expect(reconciliationReport).to.exist;
      expect(reconciliationReport.timestamp).to.exist;
      expect(reconciliationReport.summary).to.exist;
      expect(reconciliationReport.summary.totalTransactions).to.be.a('number');
      expect(reconciliationReport.summary.totalRevenue).to.be.a('number');
      expect(reconciliationReport.discrepancies).to.be.an('array');
    });

    it('should detect low balance alerts', function() {
      const threshold = 100.00; // 100 Taka
      const alerts = RevenueManagementService.getLowBalanceAlerts(threshold);
      
      expect(alerts).to.exist;
      expect(alerts.threshold).to.equal(threshold);
      expect(alerts.alertCount).to.be.a('number');
      expect(alerts.accounts).to.be.an('array');
    });

    it('should handle bulk revenue distribution', async function() {
      // Create multiple test transactions
      const transactionIds = [];
      for (let i = 0; i < 3; i++) {
        const transaction = Transaction.create({
          bookingId: 40 + i,
          userId: testUserId,
          hospitalId: testHospitalId,
          amount: 800 + (i * 100),
          serviceCharge: RevenueManagementService.calculateServiceCharge(800 + (i * 100), testHospitalId),
          hospitalAmount: (800 + (i * 100)) - RevenueManagementService.calculateServiceCharge(800 + (i * 100), testHospitalId),
          paymentMethod: 'bkash',
          transactionId: `BULK_TEST_${Date.now()}_${i}`,
          status: 'pending'
        });
        
        transactionIds.push(transaction.id);
        testTransactions.push(transaction.id);
      }

      const bulkResult = await RevenueManagementService.processBulkRevenueDistribution(transactionIds);
      
      expect(bulkResult.totalProcessed).to.be.above(0);
      expect(bulkResult.successful).to.be.an('array');
      expect(bulkResult.failed).to.be.an('array');
    });
  });

  describe('Error Handling and Edge Cases', function() {
    it('should handle invalid transaction IDs gracefully', async function() {
      const invalidResult = await RevenueManagementService.distributeRevenue(
        999999, // Non-existent transaction
        1000,
        testHospitalId
      );

      expect(invalidResult.success).to.be.false;
      expect(invalidResult.error).to.exist;
    });

    it('should handle negative amounts appropriately', function() {
      expect(() => {
        RevenueManagementService.calculateServiceCharge(-100, testHospitalId);
      }).to.not.throw();

      const negativeCharge = RevenueManagementService.calculateServiceCharge(-100, testHospitalId);
      expect(negativeCharge).to.equal(0);
    });

    it('should maintain data consistency during errors', async function() {
      const initialBalance = UserBalance.getBalance(testUserId, testHospitalId);

      // Attempt invalid operation
      try {
        await RevenueManagementService.distributeRevenue(null, 1000, testHospitalId);
      } catch (error) {
        // Expected to fail
      }

      // Verify balance unchanged
      const finalBalance = UserBalance.getBalance(testUserId, testHospitalId);
      expect(finalBalance.currentBalance).to.equal(initialBalance.currentBalance);
    });
  });

  describe('Currency Formatting in Revenue Operations', function() {
    it('should format all revenue amounts in Taka', function() {
      const testAmount = 1500.75;
      const serviceCharge = RevenueManagementService.calculateServiceCharge(testAmount, testHospitalId);
      const hospitalAmount = roundTaka(testAmount - serviceCharge);

      expect(formatTaka(testAmount)).to.match(/^৳[\d,]+\.\d{2}$/);
      expect(formatTaka(serviceCharge)).to.match(/^৳[\d,]+\.\d{2}$/);
      expect(formatTaka(hospitalAmount)).to.match(/^৳[\d,]+\.\d{2}$/);
    });

    it('should maintain Taka precision in all calculations', function() {
      const amounts = [100.555, 1000.444, 5000.999];
      
      amounts.forEach(amount => {
        const serviceCharge = RevenueManagementService.calculateServiceCharge(amount, testHospitalId);
        const hospitalAmount = roundTaka(amount - serviceCharge);
        
        // Verify precision
        expect(serviceCharge % 0.01).to.be.closeTo(0, 0.001);
        expect(hospitalAmount % 0.01).to.be.closeTo(0, 0.001);
        expect(serviceCharge + hospitalAmount).to.be.closeTo(amount, 0.01);
      });
    });
  });
});