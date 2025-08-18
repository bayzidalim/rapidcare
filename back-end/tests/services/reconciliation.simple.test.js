const { expect } = require('chai');
const Database = require('better-sqlite3');
const FinancialReconciliationService = require('../../services/financialReconciliationService');
const { createReconciliationTables } = require('../../migrations/008_create_reconciliation_tables');

describe('Financial Reconciliation Service - Simple Tests', () => {
  let db;
  let reconciliationService;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:');
    
    // Create necessary tables
    createReconciliationTables(db);
    
    // Create transactions table for testing
    db.exec(`
      CREATE TABLE transactions (
        id VARCHAR(100) PRIMARY KEY,
        account_id VARCHAR(100) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        type VARCHAR(50) NOT NULL,
        reference VARCHAR(200),
        status VARCHAR(50) DEFAULT 'PENDING',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create users table for testing
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(100) UNIQUE NOT NULL,
        role VARCHAR(50) NOT NULL
      )
    `);

    reconciliationService = new FinancialReconciliationService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should create reconciliation service instance', () => {
    expect(reconciliationService).to.be.instanceOf(FinancialReconciliationService);
  });

  it('should perform basic reconciliation with BDT amounts', async () => {
    const testDate = new Date('2024-01-15');
    
    // Insert test transaction with BDT amount
    db.prepare(`
      INSERT INTO transactions (id, account_id, amount, type, reference, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?)
    `).run('TXN001', 'ACC001', 1500.75, 'CREDIT', 'BDT test transaction', testDate.toISOString());

    // Set up matching account balance
    db.prepare(`
      INSERT INTO account_balances (account_id, balance, last_updated)
      VALUES (?, ?, ?)
    `).run('ACC001', 1500.75, testDate.toISOString());

    const result = await reconciliationService.performDailyReconciliation(testDate);

    expect(result).to.have.property('status');
    expect(result.status).to.equal('RECONCILED');
    expect(result.discrepancies).to.have.lengthOf(0);
    expect(result.expectedBalances['ACC001']).to.equal(1500.75);
    expect(result.actualBalances['ACC001']).to.equal(1500.75);
  });

  it('should detect BDT discrepancies correctly', async () => {
    const testDate = new Date('2024-01-15');
    
    // Insert transaction
    db.prepare(`
      INSERT INTO transactions (id, account_id, amount, type, reference, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?)
    `).run('TXN001', 'ACC001', 2000.50, 'CREDIT', 'BDT discrepancy test', testDate.toISOString());

    // Set incorrect balance to create discrepancy
    db.prepare(`
      INSERT INTO account_balances (account_id, balance, last_updated)
      VALUES (?, ?, ?)
    `).run('ACC001', 1900.25, testDate.toISOString());

    const result = await reconciliationService.performDailyReconciliation(testDate);

    expect(result.status).to.equal('DISCREPANCY_FOUND');
    expect(result.discrepancies).to.have.lengthOf(1);
    expect(result.discrepancies[0].accountId).to.equal('ACC001');
    expect(result.discrepancies[0].difference).to.equal('৳-100.25');
  });

  it('should verify transaction integrity with BDT validation', async () => {
    const transactionId = 'TXN001';
    
    // Insert valid BDT transaction
    db.prepare(`
      INSERT INTO transactions (id, account_id, amount, type, reference, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?)
    `).run(transactionId, 'ACC001', 1234.56, 'CREDIT', 'BDT integrity test', new Date().toISOString());

    const result = await reconciliationService.verifyTransactionIntegrity(transactionId);

    expect(result.transactionId).to.equal(transactionId);
    expect(result.checks.amountValidation.valid).to.be.true;
    expect(result.checks.currencyValidation.valid).to.be.true;
  });

  it('should generate audit trail with BDT formatting', async () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    // Insert transaction with BDT amount
    db.prepare(`
      INSERT INTO transactions (id, account_id, amount, type, reference, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?)
    `).run('TXN001', 'ACC001', 2500.99, 'CREDIT', 'BDT audit test', '2024-01-15T10:00:00.000Z');

    const auditTrail = await reconciliationService.generateAuditTrail(startDate, endDate);

    expect(auditTrail.transactions).to.have.lengthOf(1);
    expect(auditTrail.transactions[0].amount).to.equal('৳2,500.99');
    expect(auditTrail.summary.totalAmount).to.equal('৳2,500.99');
  });

  it('should monitor financial health with BDT amounts', async () => {
    // Set up healthy account balance in BDT
    db.prepare(`
      INSERT INTO account_balances (account_id, balance, last_updated)
      VALUES (?, ?, ?)
    `).run('ACC001', 5000.00, new Date().toISOString());

    const healthStatus = await reconciliationService.monitorFinancialHealth();

    expect(healthStatus.status).to.equal('HEALTHY');
    expect(healthStatus.alerts).to.have.lengthOf(0);
    expect(healthStatus.metrics.systemBalanceHealth.totalPositiveBalance).to.equal('৳5,000.00');
  });
});