const Database = require('better-sqlite3');
const FinancialReconciliationService = require('../../services/financialReconciliationService');
const { formatTaka } = require('../../utils/currencyUtils');

describe('Financial Reconciliation Performance Tests', () => {
  let db;
  let reconciliationService;
  const PERFORMANCE_THRESHOLDS = {
    DAILY_RECONCILIATION: 10000, // 10 seconds max
    TRANSACTION_VERIFICATION: 100, // 100ms max per transaction
    AUDIT_TRAIL_GENERATION: 5000, // 5 seconds max
    HEALTH_MONITORING: 2000, // 2 seconds max
    BALANCE_CORRECTION: 500 // 500ms max
  };

  beforeAll(async () => {
    // Initialize test database
    db = new Database(':memory:');
    
    // Create tables
    require('../../migrations/008_create_reconciliation_tables').createReconciliationTables(db);
    
    // Create transactions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(100) PRIMARY KEY,
        account_id VARCHAR(100) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        type VARCHAR(50) NOT NULL,
        reference VARCHAR(255),
        status VARCHAR(50) DEFAULT 'PENDING',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Initialize reconciliation service
    reconciliationService = new FinancialReconciliationService(db);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  beforeEach(() => {
    // Clear test data
    db.prepare('DELETE FROM transactions').run();
    db.prepare('DELETE FROM reconciliation_records').run();
    db.prepare('DELETE FROM discrepancy_alerts').run();
    db.prepare('DELETE FROM balance_corrections').run();
    db.prepare('DELETE FROM audit_trail').run();
    db.prepare('DELETE FROM financial_health_checks').run();
    db.prepare('DELETE FROM account_balances').run();
  });

  describe('Daily Reconciliation Performance', () => {
    test('should handle 10,000 transactions within performance threshold', async () => {
      console.log('Creating 10,000 test transactions...');
      
      // Create test accounts
      const accountIds = [];
      for (let i = 0; i < 100; i++) {
        const accountId = `PERF_ACCOUNT_${i.toString().padStart(3, '0')}`;
        accountIds.push(accountId);
        db.prepare(`
          INSERT INTO account_balances (account_id, balance, currency)
          VALUES (?, ?, 'BDT')
        `).run(accountId, 10000.00);
      }

      // Create 10,000 transactions
      const transactionStmt = db.prepare(`
        INSERT INTO transactions (id, account_id, amount, type, status, created_at)
        VALUES (?, ?, ?, ?, 'COMPLETED', ?)
      `);

      const startInsert = Date.now();
      
      for (let i = 0; i < 10000; i++) {
        const accountId = accountIds[i % accountIds.length];
        const amount = Math.random() * 1000 + 100; // 100-1100 range
        const type = Math.random() > 0.5 ? 'CREDIT' : 'DEBIT';
        
        transactionStmt.run(
          `PERF_TXN_${i.toString().padStart(5, '0')}`,
          accountId,
          amount,
          type,
          new Date().toISOString()
        );
      }

      const insertTime = Date.now() - startInsert;
      console.log(`Transaction insertion completed in ${insertTime}ms`);

      // Update account balances to match transactions
      console.log('Updating account balances...');
      const balanceUpdateStart = Date.now();
      
      for (const accountId of accountIds) {
        const transactions = db.prepare(`
          SELECT SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE -amount END) as net_change
          FROM transactions WHERE account_id = ?
        `).get(accountId);
        
        const newBalance = 10000.00 + (transactions.net_change || 0);
        db.prepare(`
          UPDATE account_balances SET balance = ? WHERE account_id = ?
        `).run(newBalance, accountId);
      }

      const balanceUpdateTime = Date.now() - balanceUpdateStart;
      console.log(`Balance updates completed in ${balanceUpdateTime}ms`);

      // Perform reconciliation
      console.log('Starting reconciliation performance test...');
      const reconciliationStart = Date.now();
      
      const result = await reconciliationService.performDailyReconciliation();
      
      const reconciliationTime = Date.now() - reconciliationStart;
      console.log(`Reconciliation completed in ${reconciliationTime}ms`);
      console.log(`Status: ${result.status}, Discrepancies: ${result.discrepancies.length}`);

      expect(reconciliationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DAILY_RECONCILIATION);
      expect(result.status).toBe('RECONCILED');
    });

    test('should handle reconciliation with discrepancies efficiently', async () => {
      // Create accounts with intentional discrepancies
      const accountCount = 50;
      const transactionCount = 5000;

      console.log(`Creating ${accountCount} accounts with ${transactionCount} transactions and discrepancies...`);

      // Create accounts
      for (let i = 0; i < accountCount; i++) {
        const accountId = `DISC_ACCOUNT_${i.toString().padStart(3, '0')}`;
        db.prepare(`
          INSERT INTO account_balances (account_id, balance, currency)
          VALUES (?, ?, 'BDT')
        `).run(accountId, 5000.00); // Intentionally wrong balance
      }

      // Create transactions
      const transactionStmt = db.prepare(`
        INSERT INTO transactions (id, account_id, amount, type, status, created_at)
        VALUES (?, ?, ?, ?, 'COMPLETED', ?)
      `);

      for (let i = 0; i < transactionCount; i++) {
        const accountId = `DISC_ACCOUNT_${(i % accountCount).toString().padStart(3, '0')}`;
        transactionStmt.run(
          `DISC_TXN_${i.toString().padStart(5, '0')}`,
          accountId,
          1000.00,
          'CREDIT',
          new Date().toISOString()
        );
      }

      // Perform reconciliation
      const reconciliationStart = Date.now();
      const result = await reconciliationService.performDailyReconciliation();
      const reconciliationTime = Date.now() - reconciliationStart;

      console.log(`Reconciliation with discrepancies completed in ${reconciliationTime}ms`);
      console.log(`Discrepancies found: ${result.discrepancies.length}`);

      expect(reconciliationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DAILY_RECONCILIATION);
      expect(result.status).toBe('DISCREPANCY_FOUND');
      expect(result.discrepancies.length).toBe(accountCount);
    });
  });

  describe('Transaction Verification Performance', () => {
    test('should verify 1,000 transactions within performance threshold', async () => {
      const transactionCount = 1000;
      console.log(`Creating ${transactionCount} transactions for verification test...`);

      // Create test account
      const testAccountId = 'VERIFY_ACCOUNT_001';
      db.prepare(`
        INSERT INTO account_balances (account_id, balance, currency)
        VALUES (?, ?, 'BDT')
      `).run(testAccountId, 50000.00);

      // Create transactions
      const transactionIds = [];
      const transactionStmt = db.prepare(`
        INSERT INTO transactions (id, account_id, amount, type, reference, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?)
      `);

      for (let i = 0; i < transactionCount; i++) {
        const transactionId = `VERIFY_TXN_${i.toString().padStart(4, '0')}`;
        transactionIds.push(transactionId);
        
        transactionStmt.run(
          transactionId,
          testAccountId,
          Math.random() * 500 + 50,
          Math.random() > 0.5 ? 'CREDIT' : 'DEBIT',
          `REF_${i}`,
          new Date().toISOString()
        );

        // Create audit trail for some transactions
        if (i % 10 === 0) {
          db.prepare(`
            INSERT INTO audit_trail (event_type, entity_type, entity_id, changes)
            VALUES ('TRANSACTION_CREATED', 'TRANSACTION', ?, ?)
          `).run(transactionId, JSON.stringify({ amount: formatTaka(100) }));
        }
      }

      // Verify transactions
      console.log('Starting transaction verification performance test...');
      const verificationStart = Date.now();
      
      let successfulVerifications = 0;
      let failedVerifications = 0;

      for (const transactionId of transactionIds) {
        try {
          const verification = await reconciliationService.verifyTransactionIntegrity(transactionId);
          if (verification.isValid) {
            successfulVerifications++;
          } else {
            failedVerifications++;
          }
        } catch (error) {
          failedVerifications++;
        }
      }

      const verificationTime = Date.now() - verificationStart;
      const averageTimePerTransaction = verificationTime / transactionCount;

      console.log(`Verification completed in ${verificationTime}ms`);
      console.log(`Average time per transaction: ${averageTimePerTransaction.toFixed(2)}ms`);
      console.log(`Successful verifications: ${successfulVerifications}`);
      console.log(`Failed verifications: ${failedVerifications}`);

      expect(averageTimePerTransaction).toBeLessThan(PERFORMANCE_THRESHOLDS.TRANSACTION_VERIFICATION);
      expect(successfulVerifications + failedVerifications).toBe(transactionCount);
    });
  });

  describe('Audit Trail Generation Performance', () => {
    test('should generate audit trail for large dataset efficiently', async () => {
      const transactionCount = 5000;
      const reconciliationCount = 30;

      console.log(`Creating ${transactionCount} transactions and ${reconciliationCount} reconciliation records...`);

      // Create test accounts
      const accountIds = [];
      for (let i = 0; i < 20; i++) {
        const accountId = `AUDIT_ACCOUNT_${i.toString().padStart(2, '0')}`;
        accountIds.push(accountId);
        db.prepare(`
          INSERT INTO account_balances (account_id, balance, currency)
          VALUES (?, ?, 'BDT')
        `).run(accountId, 25000.00);
      }

      // Create transactions over the past 30 days
      const transactionStmt = db.prepare(`
        INSERT INTO transactions (id, account_id, amount, type, status, created_at)
        VALUES (?, ?, ?, ?, 'COMPLETED', ?)
      `);

      for (let i = 0; i < transactionCount; i++) {
        const accountId = accountIds[i % accountIds.length];
        const daysAgo = Math.floor(i / (transactionCount / 30));
        const transactionDate = new Date();
        transactionDate.setDate(transactionDate.getDate() - daysAgo);
        
        transactionStmt.run(
          `AUDIT_TXN_${i.toString().padStart(5, '0')}`,
          accountId,
          Math.random() * 2000 + 100,
          Math.random() > 0.5 ? 'CREDIT' : 'DEBIT',
          transactionDate.toISOString()
        );
      }

      // Create reconciliation records
      const reconciliationStmt = db.prepare(`
        INSERT INTO reconciliation_records (date, status, expected_balances, actual_balances, discrepancies)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < reconciliationCount; i++) {
        const reconciliationDate = new Date();
        reconciliationDate.setDate(reconciliationDate.getDate() - i);
        
        reconciliationStmt.run(
          reconciliationDate.toISOString().split('T')[0],
          i % 5 === 0 ? 'DISCREPANCY_FOUND' : 'RECONCILED',
          JSON.stringify({}),
          JSON.stringify({}),
          JSON.stringify([])
        );
      }

      // Generate audit trail
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      console.log('Starting audit trail generation performance test...');
      const auditStart = Date.now();
      
      const auditTrail = await reconciliationService.generateAuditTrail(startDate, endDate);
      
      const auditTime = Date.now() - auditStart;

      console.log(`Audit trail generated in ${auditTime}ms`);
      console.log(`Transactions in trail: ${auditTrail.transactions.length}`);
      console.log(`Reconciliations in trail: ${auditTrail.reconciliations.length}`);
      console.log(`Summary calculated: ${JSON.stringify(auditTrail.summary)}`);

      expect(auditTime).toBeLessThan(PERFORMANCE_THRESHOLDS.AUDIT_TRAIL_GENERATION);
      expect(auditTrail.transactions.length).toBe(transactionCount);
      expect(auditTrail.reconciliations.length).toBe(reconciliationCount);
    });
  });

  describe('Financial Health Monitoring Performance', () => {
    test('should monitor financial health efficiently with large dataset', async () => {
      console.log('Creating large dataset for health monitoring test...');

      // Create 200 accounts
      const accountCount = 200;
      for (let i = 0; i < accountCount; i++) {
        const accountId = `HEALTH_ACCOUNT_${i.toString().padStart(3, '0')}`;
        const balance = Math.random() * 100000 - 10000; // Some negative balances
        
        db.prepare(`
          INSERT INTO account_balances (account_id, balance, currency)
          VALUES (?, ?, 'BDT')
        `).run(accountId, balance);
      }

      // Create 10,000 transactions over the past week
      const transactionStmt = db.prepare(`
        INSERT INTO transactions (id, account_id, amount, type, status, created_at)
        VALUES (?, ?, ?, ?, 'COMPLETED', ?)
      `);

      for (let i = 0; i < 10000; i++) {
        const accountId = `HEALTH_ACCOUNT_${(i % accountCount).toString().padStart(3, '0')}`;
        const daysAgo = Math.floor(Math.random() * 7);
        const transactionDate = new Date();
        transactionDate.setDate(transactionDate.getDate() - daysAgo);
        
        transactionStmt.run(
          `HEALTH_TXN_${i.toString().padStart(5, '0')}`,
          accountId,
          Math.random() * 5000 + 100,
          Math.random() > 0.5 ? 'CREDIT' : 'DEBIT',
          transactionDate.toISOString()
        );
      }

      // Create some discrepancies
      const reconciliationId = db.prepare(`
        INSERT INTO reconciliation_records (date, status, expected_balances, actual_balances, discrepancies)
        VALUES (?, 'DISCREPANCY_FOUND', '{}', '{}', '[]')
      `).run(new Date().toISOString()).lastInsertRowid;

      for (let i = 0; i < 10; i++) {
        db.prepare(`
          INSERT INTO discrepancy_alerts 
          (reconciliation_id, account_id, expected_amount, actual_amount, difference_amount, severity, status)
          VALUES (?, ?, ?, ?, ?, ?, 'OPEN')
        `).run(
          reconciliationId,
          `HEALTH_ACCOUNT_${i.toString().padStart(3, '0')}`,
          5000.00,
          4000.00,
          -1000.00,
          i < 3 ? 'HIGH' : 'MEDIUM'
        );
      }

      // Monitor financial health
      console.log('Starting financial health monitoring performance test...');
      const healthStart = Date.now();
      
      const healthStatus = await reconciliationService.monitorFinancialHealth();
      
      const healthTime = Date.now() - healthStart;

      console.log(`Health monitoring completed in ${healthTime}ms`);
      console.log(`Status: ${healthStatus.status}`);
      console.log(`Alerts generated: ${healthStatus.alerts.length}`);
      console.log(`Balance anomalies: ${healthStatus.metrics.balanceAnomalies.length}`);

      expect(healthTime).toBeLessThan(PERFORMANCE_THRESHOLDS.HEALTH_MONITORING);
      expect(healthStatus.status).toBeDefined();
      expect(healthStatus.metrics).toBeDefined();
    });
  });

  describe('Balance Correction Performance', () => {
    test('should perform balance corrections efficiently', async () => {
      const correctionCount = 100;
      console.log(`Performing ${correctionCount} balance corrections...`);

      // Create test accounts
      const accountIds = [];
      for (let i = 0; i < correctionCount; i++) {
        const accountId = `CORRECTION_ACCOUNT_${i.toString().padStart(3, '0')}`;
        accountIds.push(accountId);
        
        db.prepare(`
          INSERT INTO account_balances (account_id, balance, currency)
          VALUES (?, ?, 'BDT')
        `).run(accountId, 10000.00);
      }

      // Perform corrections
      const correctionStart = Date.now();
      let successfulCorrections = 0;

      for (let i = 0; i < correctionCount; i++) {
        const accountId = accountIds[i];
        const correctionData = {
          accountId,
          currentBalance: formatTaka(10000.00),
          correctBalance: formatTaka(10000.00 + (Math.random() * 2000 - 1000)),
          reason: `Performance test correction ${i + 1}`
        };

        try {
          await reconciliationService.correctBalance(correctionData, 1);
          successfulCorrections++;
        } catch (error) {
          console.error(`Correction ${i + 1} failed:`, error.message);
        }
      }

      const correctionTime = Date.now() - correctionStart;
      const averageTimePerCorrection = correctionTime / correctionCount;

      console.log(`Balance corrections completed in ${correctionTime}ms`);
      console.log(`Average time per correction: ${averageTimePerCorrection.toFixed(2)}ms`);
      console.log(`Successful corrections: ${successfulCorrections}/${correctionCount}`);

      expect(averageTimePerCorrection).toBeLessThan(PERFORMANCE_THRESHOLDS.BALANCE_CORRECTION);
      expect(successfulCorrections).toBe(correctionCount);
    });
  });

  describe('Concurrent Operations Performance', () => {
    test('should handle concurrent reconciliations efficiently', async () => {
      console.log('Testing concurrent reconciliation performance...');

      // Create test data
      const accountId = 'CONCURRENT_ACCOUNT_001';
      db.prepare(`
        INSERT INTO account_balances (account_id, balance, currency)
        VALUES (?, ?, 'BDT')
      `).run(accountId, 50000.00);

      // Create transactions
      const transactionStmt = db.prepare(`
        INSERT INTO transactions (id, account_id, amount, type, status, created_at)
        VALUES (?, ?, ?, ?, 'COMPLETED', ?)
      `);

      for (let i = 0; i < 1000; i++) {
        transactionStmt.run(
          `CONCURRENT_TXN_${i.toString().padStart(4, '0')}`,
          accountId,
          Math.random() * 100 + 10,
          Math.random() > 0.5 ? 'CREDIT' : 'DEBIT',
          new Date().toISOString()
        );
      }

      // Run concurrent reconciliations
      const concurrentStart = Date.now();
      const concurrentPromises = [];

      for (let i = 0; i < 5; i++) {
        concurrentPromises.push(
          reconciliationService.performDailyReconciliation()
            .catch(error => ({ error: error.message }))
        );
      }

      const results = await Promise.all(concurrentPromises);
      const concurrentTime = Date.now() - concurrentStart;

      console.log(`Concurrent reconciliations completed in ${concurrentTime}ms`);
      
      const successfulResults = results.filter(result => !result.error);
      const failedResults = results.filter(result => result.error);

      console.log(`Successful reconciliations: ${successfulResults.length}`);
      console.log(`Failed reconciliations: ${failedResults.length}`);

      expect(concurrentTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DAILY_RECONCILIATION * 2);
      expect(successfulResults.length).toBeGreaterThan(0);
    });

    test('should handle concurrent transaction verifications efficiently', async () => {
      console.log('Testing concurrent transaction verification performance...');

      // Create test transactions
      const transactionIds = [];
      const transactionStmt = db.prepare(`
        INSERT INTO transactions (id, account_id, amount, type, status, created_at)
        VALUES (?, ?, ?, ?, 'COMPLETED', ?)
      `);

      for (let i = 0; i < 100; i++) {
        const transactionId = `CONCURRENT_VERIFY_TXN_${i.toString().padStart(3, '0')}`;
        transactionIds.push(transactionId);
        
        transactionStmt.run(
          transactionId,
          'CONCURRENT_ACCOUNT_001',
          Math.random() * 1000 + 100,
          Math.random() > 0.5 ? 'CREDIT' : 'DEBIT',
          new Date().toISOString()
        );
      }

      // Run concurrent verifications
      const verificationStart = Date.now();
      const verificationPromises = transactionIds.map(id =>
        reconciliationService.verifyTransactionIntegrity(id)
          .catch(error => ({ error: error.message, transactionId: id }))
      );

      const verificationResults = await Promise.all(verificationPromises);
      const verificationTime = Date.now() - verificationStart;

      console.log(`Concurrent verifications completed in ${verificationTime}ms`);
      
      const successfulVerifications = verificationResults.filter(result => !result.error);
      const failedVerifications = verificationResults.filter(result => result.error);

      console.log(`Successful verifications: ${successfulVerifications.length}`);
      console.log(`Failed verifications: ${failedVerifications.length}`);

      expect(verificationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.TRANSACTION_VERIFICATION * transactionIds.length);
      expect(successfulVerifications.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Usage Tests', () => {
    test('should maintain reasonable memory usage during large operations', async () => {
      const initialMemory = process.memoryUsage();
      console.log('Initial memory usage:', {
        rss: Math.round(initialMemory.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(initialMemory.heapUsed / 1024 / 1024) + 'MB'
      });

      // Create large dataset
      const accountCount = 500;
      const transactionCount = 20000;

      console.log(`Creating ${accountCount} accounts and ${transactionCount} transactions...`);

      // Create accounts
      for (let i = 0; i < accountCount; i++) {
        const accountId = `MEMORY_ACCOUNT_${i.toString().padStart(3, '0')}`;
        db.prepare(`
          INSERT INTO account_balances (account_id, balance, currency)
          VALUES (?, ?, 'BDT')
        `).run(accountId, Math.random() * 100000);
      }

      // Create transactions in batches to manage memory
      const batchSize = 1000;
      const transactionStmt = db.prepare(`
        INSERT INTO transactions (id, account_id, amount, type, status, created_at)
        VALUES (?, ?, ?, ?, 'COMPLETED', ?)
      `);

      for (let batch = 0; batch < transactionCount / batchSize; batch++) {
        for (let i = 0; i < batchSize; i++) {
          const transactionIndex = batch * batchSize + i;
          const accountId = `MEMORY_ACCOUNT_${(transactionIndex % accountCount).toString().padStart(3, '0')}`;
          
          transactionStmt.run(
            `MEMORY_TXN_${transactionIndex.toString().padStart(6, '0')}`,
            accountId,
            Math.random() * 1000 + 50,
            Math.random() > 0.5 ? 'CREDIT' : 'DEBIT',
            new Date().toISOString()
          );
        }

        // Check memory usage after each batch
        if (batch % 5 === 0) {
          const currentMemory = process.memoryUsage();
          console.log(`After batch ${batch + 1}: ${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB heap used`);
        }
      }

      const afterInsertMemory = process.memoryUsage();
      console.log('After data creation:', {
        rss: Math.round(afterInsertMemory.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(afterInsertMemory.heapUsed / 1024 / 1024) + 'MB'
      });

      // Perform reconciliation
      console.log('Performing reconciliation...');
      await reconciliationService.performDailyReconciliation();

      const afterReconciliationMemory = process.memoryUsage();
      console.log('After reconciliation:', {
        rss: Math.round(afterReconciliationMemory.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(afterReconciliationMemory.heapUsed / 1024 / 1024) + 'MB'
      });

      // Generate audit trail
      console.log('Generating audit trail...');
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();

      await reconciliationService.generateAuditTrail(startDate, endDate);

      const finalMemory = process.memoryUsage();
      console.log('Final memory usage:', {
        rss: Math.round(finalMemory.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(finalMemory.heapUsed / 1024 / 1024) + 'MB'
      });

      // Memory should not exceed reasonable limits (adjust based on system)
      const maxHeapUsage = 500 * 1024 * 1024; // 500MB
      expect(finalMemory.heapUsed).toBeLessThan(maxHeapUsage);
    });
  });
});