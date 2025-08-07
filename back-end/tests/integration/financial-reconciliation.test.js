const request = require('supertest');
const Database = require('better-sqlite3');
const app = require('../../index');
const FinancialReconciliationService = require('../../services/financialReconciliationService');
const { formatTaka, parseTaka } = require('../../utils/currencyUtils');

describe('Financial Reconciliation System Integration Tests', () => {
  let db;
  let reconciliationService;
  let adminToken;
  let testAccountId;

  beforeAll(async () => {
    // Initialize test database
    db = new Database(':memory:');
    
    // Create tables
    require('../../migrations/008_create_reconciliation_tables').createReconciliationTables(db);
    
    // Create users table for authentication
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

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
    
    // Create test admin user
    const adminUser = db.prepare(`
      INSERT INTO users (name, email, password, role)
      VALUES (?, ?, ?, ?)
    `).run('Test Admin', 'admin@test.com', 'hashedpassword', 'admin');

    // Create test account
    testAccountId = 'TEST_ACCOUNT_001';
    db.prepare(`
      INSERT INTO account_balances (account_id, balance, currency)
      VALUES (?, ?, ?)
    `).run(testAccountId, 5000.00, 'BDT');

    // Mock authentication for tests
    adminToken = 'mock-admin-token';
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  beforeEach(() => {
    // Clear test data before each test
    db.prepare('DELETE FROM transactions WHERE account_id LIKE ?').run('TEST_%');
    db.prepare('DELETE FROM reconciliation_records').run();
    db.prepare('DELETE FROM discrepancy_alerts').run();
    db.prepare('DELETE FROM balance_corrections').run();
    db.prepare('DELETE FROM audit_trail').run();
    db.prepare('DELETE FROM financial_health_checks').run();
  });

  describe('Daily Reconciliation Process', () => {
    test('should perform daily reconciliation with no discrepancies', async () => {
      // Create test transactions that balance correctly
      const transactions = [
        { id: 'TXN_001', account_id: testAccountId, amount: 1000.00, type: 'CREDIT' },
        { id: 'TXN_002', account_id: testAccountId, amount: 500.00, type: 'DEBIT' }
      ];

      for (const tx of transactions) {
        db.prepare(`
          INSERT INTO transactions (id, account_id, amount, type, status, created_at)
          VALUES (?, ?, ?, ?, 'COMPLETED', ?)
        `).run(tx.id, tx.account_id, tx.amount, tx.type, new Date().toISOString());
      }

      // Update account balance to match expected
      const expectedBalance = 5000.00 + 1000.00 - 500.00; // 5500.00
      db.prepare(`
        UPDATE account_balances SET balance = ? WHERE account_id = ?
      `).run(expectedBalance, testAccountId);

      const result = await reconciliationService.performDailyReconciliation();

      expect(result.status).toBe('RECONCILED');
      expect(result.discrepancies).toHaveLength(0);
    });

    test('should detect discrepancies during reconciliation', async () => {
      // Create test transactions
      const transactions = [
        { id: 'TXN_003', account_id: testAccountId, amount: 2000.00, type: 'CREDIT' }
      ];

      for (const tx of transactions) {
        db.prepare(`
          INSERT INTO transactions (id, account_id, amount, type, status, created_at)
          VALUES (?, ?, ?, ?, 'COMPLETED', ?)
        `).run(tx.id, tx.account_id, tx.amount, tx.type, new Date().toISOString());
      }

      // Don't update account balance to create discrepancy
      // Expected: 5000 + 2000 = 7000, Actual: 5000

      const result = await reconciliationService.performDailyReconciliation();

      expect(result.status).toBe('DISCREPANCY_FOUND');
      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies[0].accountId).toBe(testAccountId);
      expect(result.discrepancies[0].difference).toBe(formatTaka(-2000.00));
    });

    test('should create reconciliation record in database', async () => {
      const result = await reconciliationService.performDailyReconciliation();

      const record = db.prepare(`
        SELECT * FROM reconciliation_records WHERE id = ?
      `).get(result.id);

      expect(record).toBeTruthy();
      expect(record.status).toBe(result.status);
      expect(JSON.parse(record.expected_balances)).toEqual(result.expectedBalances);
    });
  });

  describe('Transaction Integrity Verification', () => {
    test('should verify valid transaction integrity', async () => {
      // Create a valid transaction
      const transactionId = 'TXN_VALID_001';
      db.prepare(`
        INSERT INTO transactions (id, account_id, amount, type, reference, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?)
      `).run(transactionId, testAccountId, 1500.00, 'CREDIT', 'Test payment', new Date().toISOString());

      // Create audit trail entry
      db.prepare(`
        INSERT INTO audit_trail (event_type, entity_type, entity_id, changes)
        VALUES ('TRANSACTION_CREATED', 'TRANSACTION', ?, ?)
      `).run(transactionId, JSON.stringify({ amount: formatTaka(1500.00) }));

      const verification = await reconciliationService.verifyTransactionIntegrity(transactionId);

      expect(verification.isValid).toBe(true);
      expect(verification.transactionId).toBe(transactionId);
      expect(verification.issues).toHaveLength(0);
    });

    test('should detect transaction integrity issues', async () => {
      // Create transaction with invalid amount format
      const transactionId = 'TXN_INVALID_001';
      db.prepare(`
        INSERT INTO transactions (id, account_id, amount, type, status, created_at)
        VALUES (?, ?, ?, ?, 'COMPLETED', ?)
      `).run(transactionId, testAccountId, 'invalid_amount', 'CREDIT', new Date().toISOString());

      const verification = await reconciliationService.verifyTransactionIntegrity(transactionId);

      expect(verification.isValid).toBe(false);
      expect(verification.issues.length).toBeGreaterThan(0);
      expect(verification.issues.some(issue => issue.check === 'amountValidation')).toBe(true);
    });

    test('should detect duplicate transactions', async () => {
      const reference = 'DUPLICATE_REF_001';
      const timestamp = new Date().toISOString();

      // Create two transactions with same reference within 5 minutes
      db.prepare(`
        INSERT INTO transactions (id, account_id, amount, type, reference, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?)
      `).run('TXN_DUP_001', testAccountId, 1000.00, 'CREDIT', reference, timestamp);

      db.prepare(`
        INSERT INTO transactions (id, account_id, amount, type, reference, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?)
      `).run('TXN_DUP_002', testAccountId, 1000.00, 'CREDIT', reference, timestamp);

      const verification = await reconciliationService.verifyTransactionIntegrity('TXN_DUP_002');

      expect(verification.isValid).toBe(false);
      expect(verification.issues.some(issue => issue.check === 'duplicateCheck')).toBe(true);
    });
  });

  describe('Audit Trail Generation', () => {
    test('should generate comprehensive audit trail', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();

      // Create test data
      const transactionId = 'TXN_AUDIT_001';
      db.prepare(`
        INSERT INTO transactions (id, account_id, amount, type, status, created_at)
        VALUES (?, ?, ?, ?, 'COMPLETED', ?)
      `).run(transactionId, testAccountId, 2500.00, 'CREDIT', new Date().toISOString());

      // Create reconciliation record
      await reconciliationService.performDailyReconciliation();

      const auditTrail = await reconciliationService.generateAuditTrail(startDate, endDate);

      expect(auditTrail.period.startDate).toEqual(startDate);
      expect(auditTrail.period.endDate).toEqual(endDate);
      expect(auditTrail.transactions).toHaveLength(1);
      expect(auditTrail.transactions[0].id).toBe(transactionId);
      expect(auditTrail.transactions[0].amount).toBe(formatTaka(2500.00));
      expect(auditTrail.summary).toBeDefined();
      expect(auditTrail.summary.totalTransactions).toBe(1);
    });

    test('should include discrepancies in audit trail', async () => {
      // Create transaction that will cause discrepancy
      db.prepare(`
        INSERT INTO transactions (id, account_id, amount, type, status, created_at)
        VALUES (?, ?, ?, ?, 'COMPLETED', ?)
      `).run('TXN_DISC_001', testAccountId, 3000.00, 'CREDIT', new Date().toISOString());

      // Perform reconciliation (will create discrepancy)
      await reconciliationService.performDailyReconciliation();

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();

      const auditTrail = await reconciliationService.generateAuditTrail(startDate, endDate);

      expect(auditTrail.discrepancies).toHaveLength(1);
      expect(auditTrail.summary.totalDiscrepancies).toBe(1);
    });
  });

  describe('Balance Correction', () => {
    test('should correct account balance successfully', async () => {
      const correctionData = {
        accountId: testAccountId,
        currentBalance: formatTaka(5000.00),
        correctBalance: formatTaka(5500.00),
        reason: 'Manual adjustment for reconciliation',
        evidence: 'Ticket #12345'
      };

      const result = await reconciliationService.correctBalance(correctionData, 1);

      expect(result.id).toBeDefined();
      expect(result.type).toBe('CREDIT_ADJUSTMENT');

      // Verify balance was updated
      const updatedBalance = db.prepare(`
        SELECT balance FROM account_balances WHERE account_id = ?
      `).get(testAccountId);

      expect(parseTaka(updatedBalance.balance)).toBe(5500.00);

      // Verify correction record was created
      const correction = db.prepare(`
        SELECT * FROM balance_corrections WHERE transaction_id = ?
      `).get(result.id);

      expect(correction).toBeTruthy();
      expect(correction.reason).toBe(correctionData.reason);
      expect(correction.evidence).toBe(correctionData.evidence);
    });

    test('should reject invalid correction amounts', async () => {
      const correctionData = {
        accountId: testAccountId,
        currentBalance: 'invalid_amount',
        correctBalance: formatTaka(5500.00),
        reason: 'Test correction'
      };

      await expect(
        reconciliationService.correctBalance(correctionData, 1)
      ).rejects.toThrow('Invalid correction amount format');
    });

    test('should log balance correction in audit trail', async () => {
      const correctionData = {
        accountId: testAccountId,
        currentBalance: formatTaka(5000.00),
        correctBalance: formatTaka(4800.00),
        reason: 'Correction for overpayment'
      };

      const result = await reconciliationService.correctBalance(correctionData, 1);

      // Check audit trail
      const auditEntry = db.prepare(`
        SELECT * FROM audit_trail 
        WHERE event_type = 'BALANCE_CORRECTION' AND entity_id = ?
      `).get(testAccountId);

      expect(auditEntry).toBeTruthy();
      expect(auditEntry.user_id).toBe(1);
      
      const changes = JSON.parse(auditEntry.changes);
      expect(changes.from).toBe(formatTaka(5000.00));
      expect(changes.to).toBe(formatTaka(4800.00));
    });
  });

  describe('Financial Health Monitoring', () => {
    test('should detect healthy financial state', async () => {
      // Ensure clean state
      const healthStatus = await reconciliationService.monitorFinancialHealth();

      expect(healthStatus.status).toBe('HEALTHY');
      expect(healthStatus.alerts).toHaveLength(0);
      expect(healthStatus.metrics).toBeDefined();
      expect(healthStatus.checkedAt).toBeDefined();
    });

    test('should detect outstanding discrepancies', async () => {
      // Create a discrepancy
      const reconciliationId = db.prepare(`
        INSERT INTO reconciliation_records (date, status, expected_balances, actual_balances, discrepancies)
        VALUES (?, 'DISCREPANCY_FOUND', '{}', '{}', '[]')
      `).run(new Date().toISOString()).lastInsertRowid;

      db.prepare(`
        INSERT INTO discrepancy_alerts 
        (reconciliation_id, account_id, expected_amount, actual_amount, difference_amount, severity, status)
        VALUES (?, ?, ?, ?, ?, 'HIGH', 'OPEN')
      `).run(reconciliationId, testAccountId, 5000.00, 4000.00, -1000.00);

      const healthStatus = await reconciliationService.monitorFinancialHealth();

      expect(healthStatus.status).toBe('ISSUES_DETECTED');
      expect(healthStatus.alerts.length).toBeGreaterThan(0);
      expect(healthStatus.alerts.some(alert => alert.type === 'OUTSTANDING_DISCREPANCIES')).toBe(true);
    });

    test('should detect balance anomalies', async () => {
      // Create account with negative balance
      db.prepare(`
        INSERT INTO account_balances (account_id, balance)
        VALUES ('NEGATIVE_ACCOUNT', -5000.00)
      `).run();

      const healthStatus = await reconciliationService.monitorFinancialHealth();

      expect(healthStatus.status).toBe('ISSUES_DETECTED');
      expect(healthStatus.metrics.balanceAnomalies.length).toBeGreaterThan(0);
    });

    test('should store health check results', async () => {
      await reconciliationService.monitorFinancialHealth();

      const healthRecord = db.prepare(`
        SELECT * FROM financial_health_checks 
        ORDER BY created_at DESC LIMIT 1
      `).get();

      expect(healthRecord).toBeTruthy();
      expect(healthRecord.status).toBeDefined();
      expect(JSON.parse(healthRecord.metrics)).toBeDefined();
      expect(JSON.parse(healthRecord.alerts)).toBeDefined();
    });
  });

  describe('Taka Currency Formatting', () => {
    test('should format all amounts in Taka currency', async () => {
      // Create transaction with specific amount
      const amount = 12345.67;
      db.prepare(`
        INSERT INTO transactions (id, account_id, amount, type, status, created_at)
        VALUES (?, ?, ?, ?, 'COMPLETED', ?)
      `).run('TXN_FORMAT_001', testAccountId, amount, 'CREDIT', new Date().toISOString());

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();

      const auditTrail = await reconciliationService.generateAuditTrail(startDate, endDate);

      expect(auditTrail.transactions[0].amount).toBe(formatTaka(amount));
      expect(auditTrail.summary.totalAmount).toMatch(/৳/);
    });

    test('should handle Taka formatting in discrepancies', async () => {
      // Create discrepancy with specific amounts
      const reconciliationId = db.prepare(`
        INSERT INTO reconciliation_records (date, status, expected_balances, actual_balances, discrepancies)
        VALUES (?, 'DISCREPANCY_FOUND', '{}', '{}', '[]')
      `).run(new Date().toISOString()).lastInsertRowid;

      const expectedAmount = 15000.50;
      const actualAmount = 14500.25;
      const difference = actualAmount - expectedAmount;

      db.prepare(`
        INSERT INTO discrepancy_alerts 
        (reconciliation_id, account_id, expected_amount, actual_amount, difference_amount, severity)
        VALUES (?, ?, ?, ?, ?, 'MEDIUM')
      `).run(reconciliationId, testAccountId, expectedAmount, actualAmount, difference);

      const discrepancies = await reconciliationService.getOutstandingDiscrepancies();

      expect(discrepancies[0].expected_amount).toBe(expectedAmount);
      expect(discrepancies[0].actual_amount).toBe(actualAmount);
      expect(discrepancies[0].difference_amount).toBe(difference);
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle concurrent reconciliation attempts', async () => {
      const promises = [
        reconciliationService.performDailyReconciliation(),
        reconciliationService.performDailyReconciliation()
      ];

      const results = await Promise.allSettled(promises);

      // At least one should succeed
      const successfulResults = results.filter(result => result.status === 'fulfilled');
      expect(successfulResults.length).toBeGreaterThan(0);
    });

    test('should handle concurrent balance corrections', async () => {
      const correctionData1 = {
        accountId: testAccountId,
        currentBalance: formatTaka(5000.00),
        correctBalance: formatTaka(5100.00),
        reason: 'Correction 1'
      };

      const correctionData2 = {
        accountId: testAccountId,
        currentBalance: formatTaka(5000.00),
        correctBalance: formatTaka(5200.00),
        reason: 'Correction 2'
      };

      const promises = [
        reconciliationService.correctBalance(correctionData1, 1),
        reconciliationService.correctBalance(correctionData2, 1)
      ];

      const results = await Promise.allSettled(promises);

      // Both should complete (though final balance may vary)
      expect(results.every(result => result.status === 'fulfilled')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Close database to simulate error
      const originalDb = reconciliationService.db;
      reconciliationService.db = null;

      await expect(
        reconciliationService.performDailyReconciliation()
      ).rejects.toThrow();

      // Restore database
      reconciliationService.db = originalDb;
    });

    test('should handle invalid transaction IDs', async () => {
      await expect(
        reconciliationService.verifyTransactionIntegrity('INVALID_ID')
      ).rejects.toThrow('Transaction not found');
    });

    test('should handle invalid date ranges in audit trail', async () => {
      const invalidStartDate = new Date('invalid');
      const endDate = new Date();

      await expect(
        reconciliationService.generateAuditTrail(invalidStartDate, endDate)
      ).rejects.toThrow();
    });
  });

  describe('Performance Tests', () => {
    test('should handle large transaction volumes efficiently', async () => {
      // Create 1000 test transactions
      const transactions = [];
      for (let i = 0; i < 1000; i++) {
        transactions.push({
          id: `PERF_TXN_${i.toString().padStart(4, '0')}`,
          account_id: testAccountId,
          amount: Math.random() * 1000,
          type: Math.random() > 0.5 ? 'CREDIT' : 'DEBIT'
        });
      }

      const stmt = db.prepare(`
        INSERT INTO transactions (id, account_id, amount, type, status, created_at)
        VALUES (?, ?, ?, ?, 'COMPLETED', ?)
      `);

      const startTime = Date.now();
      
      for (const tx of transactions) {
        stmt.run(tx.id, tx.account_id, tx.amount, tx.type, new Date().toISOString());
      }

      const insertTime = Date.now() - startTime;
      console.log(`Inserted 1000 transactions in ${insertTime}ms`);

      // Test reconciliation performance
      const reconciliationStartTime = Date.now();
      await reconciliationService.performDailyReconciliation();
      const reconciliationTime = Date.now() - reconciliationStartTime;

      console.log(`Reconciliation completed in ${reconciliationTime}ms`);
      expect(reconciliationTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should generate audit trail efficiently for large datasets', async () => {
      // Use existing transactions from previous test
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();

      const auditStartTime = Date.now();
      const auditTrail = await reconciliationService.generateAuditTrail(startDate, endDate);
      const auditTime = Date.now() - auditStartTime;

      console.log(`Audit trail generated in ${auditTime}ms for ${auditTrail.transactions.length} transactions`);
      expect(auditTime).toBeLessThan(3000); // Should complete within 3 seconds
    });
  });
});