const request = require('supertest');
const Database = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../../index');
const { formatTaka } = require('../../utils/currencyUtils');

describe('Reconciliation API Integration Tests', () => {
  let db;
  let adminToken;
  let adminUserId;
  let testAccountId;

  beforeAll(async () => {
    // Initialize test database
    db = new Database(':memory:');
    
    // Create all necessary tables
    require('../../migrations/008_create_reconciliation_tables').createReconciliationTables(db);
    
    // Create users table
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

    // Create test admin user
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    const adminUser = db.prepare(`
      INSERT INTO users (name, email, password, role)
      VALUES (?, ?, ?, ?)
    `).run('Test Admin', 'admin@test.com', hashedPassword, 'admin');
    
    adminUserId = adminUser.lastInsertRowid;

    // Generate admin JWT token
    adminToken = jwt.sign(
      { id: adminUserId, email: 'admin@test.com', role: 'admin' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test account
    testAccountId = 'TEST_ACCOUNT_001';
    db.prepare(`
      INSERT INTO account_balances (account_id, balance, currency)
      VALUES (?, ?, ?)
    `).run(testAccountId, 5000.00, 'BDT');

    // Initialize reconciliation service with test database
    const { initializeReconciliationService } = require('../../routes/reconciliation');
    initializeReconciliationService(db);
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

  describe('POST /api/reconciliation/daily/trigger', () => {
    test('should trigger daily reconciliation successfully', async () => {
      // Create test transaction
      db.prepare(`
        INSERT INTO transactions (id, account_id, amount, type, status, created_at)
        VALUES (?, ?, ?, ?, 'COMPLETED', ?)
      `).run('TXN_001', testAccountId, 1000.00, 'CREDIT', new Date().toISOString());

      // Update balance to match
      db.prepare(`
        UPDATE account_balances SET balance = ? WHERE account_id = ?
      `).run(6000.00, testAccountId);

      const response = await request(app)
        .post('/api/reconciliation/daily/trigger')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Daily reconciliation completed');
      expect(response.body.data.status).toBe('RECONCILED');
    });

    test('should detect discrepancies during reconciliation', async () => {
      // Create transaction without updating balance
      db.prepare(`
        INSERT INTO transactions (id, account_id, amount, type, status, created_at)
        VALUES (?, ?, ?, ?, 'COMPLETED', ?)
      `).run('TXN_002', testAccountId, 2000.00, 'CREDIT', new Date().toISOString());

      const response = await request(app)
        .post('/api/reconciliation/daily/trigger')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('DISCREPANCY_FOUND');
      expect(response.body.data.discrepancies).toHaveLength(1);
    });

    test('should require admin authentication', async () => {
      const response = await request(app)
        .post('/api/reconciliation/daily/trigger')
        .send({});

      expect(response.status).toBe(401);
    });

    test('should accept specific date for reconciliation', async () => {
      const testDate = '2024-01-15';
      
      const response = await request(app)
        .post('/api/reconciliation/daily/trigger')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: testDate });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid date format', async () => {
      const response = await request(app)
        .post('/api/reconciliation/daily/trigger')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: 'invalid-date' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid date format');
    });
  });

  describe('GET /api/reconciliation/daily/:date', () => {
    test('should retrieve daily reconciliation record', async () => {
      // First create a reconciliation record
      const testDate = new Date().toISOString().split('T')[0];
      
      await request(app)
        .post('/api/reconciliation/daily/trigger')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ date: testDate });

      // Then retrieve it
      const response = await request(app)
        .get(`/api/reconciliation/daily/${testDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.date).toBeDefined();
    });

    test('should return 404 for non-existent reconciliation', async () => {
      const response = await request(app)
        .get('/api/reconciliation/daily/2020-01-01')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Reconciliation record not found for this date');
    });

    test('should reject invalid date format', async () => {
      const response = await request(app)
        .get('/api/reconciliation/daily/invalid-date')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid date format');
    });
  });

  describe('GET /api/reconciliation/history', () => {
    test('should retrieve reconciliation history with pagination', async () => {
      // Create multiple reconciliation records
      for (let i = 0; i < 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        await request(app)
          .post('/api/reconciliation/daily/trigger')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ date: date.toISOString() });
      }

      const response = await request(app)
        .get('/api/reconciliation/history?page=1&limit=3')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(3);
    });

    test('should filter by status', async () => {
      // Create reconciliation with discrepancy
      db.prepare(`
        INSERT INTO transactions (id, account_id, amount, type, status, created_at)
        VALUES (?, ?, ?, ?, 'COMPLETED', ?)
      `).run('TXN_DISC', testAccountId, 1000.00, 'CREDIT', new Date().toISOString());

      await request(app)
        .post('/api/reconciliation/daily/trigger')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      const response = await request(app)
        .get('/api/reconciliation/history?status=DISCREPANCY_FOUND')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.every(record => record.status === 'DISCREPANCY_FOUND')).toBe(true);
    });

    test('should filter by date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const response = await request(app)
        .get(`/api/reconciliation/history?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/reconciliation/discrepancies', () => {
    test('should retrieve outstanding discrepancies', async () => {
      // Create reconciliation with discrepancy
      db.prepare(`
        INSERT INTO transactions (id, account_id, amount, type, status, created_at)
        VALUES (?, ?, ?, ?, 'COMPLETED', ?)
      `).run('TXN_DISC_001', testAccountId, 3000.00, 'CREDIT', new Date().toISOString());

      await request(app)
        .post('/api/reconciliation/daily/trigger')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      const response = await request(app)
        .get('/api/reconciliation/discrepancies')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].account_id).toBe(testAccountId);
      expect(response.body.data[0].expected_amount).toMatch(/৳/);
    });

    test('should filter discrepancies by severity', async () => {
      // Create high severity discrepancy
      const reconciliationId = db.prepare(`
        INSERT INTO reconciliation_records (date, status, expected_balances, actual_balances, discrepancies)
        VALUES (?, 'DISCREPANCY_FOUND', '{}', '{}', '[]')
      `).run(new Date().toISOString()).lastInsertRowid;

      db.prepare(`
        INSERT INTO discrepancy_alerts 
        (reconciliation_id, account_id, expected_amount, actual_amount, difference_amount, severity, status)
        VALUES (?, ?, ?, ?, ?, 'HIGH', 'OPEN')
      `).run(reconciliationId, testAccountId, 10000.00, 5000.00, -5000.00);

      const response = await request(app)
        .get('/api/reconciliation/discrepancies?severity=HIGH')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.every(d => d.severity === 'HIGH')).toBe(true);
    });

    test('should filter discrepancies by account ID', async () => {
      const response = await request(app)
        .get(`/api/reconciliation/discrepancies?accountId=${testAccountId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/reconciliation/discrepancies/:id/resolve', () => {
    test('should resolve discrepancy successfully', async () => {
      // Create discrepancy
      const reconciliationId = db.prepare(`
        INSERT INTO reconciliation_records (date, status, expected_balances, actual_balances, discrepancies)
        VALUES (?, 'DISCREPANCY_FOUND', '{}', '{}', '[]')
      `).run(new Date().toISOString()).lastInsertRowid;

      const discrepancyId = db.prepare(`
        INSERT INTO discrepancy_alerts 
        (reconciliation_id, account_id, expected_amount, actual_amount, difference_amount, severity, status)
        VALUES (?, ?, ?, ?, ?, 'MEDIUM', 'OPEN')
      `).run(reconciliationId, testAccountId, 5000.00, 4800.00, -200.00).lastInsertRowid;

      const response = await request(app)
        .put(`/api/reconciliation/discrepancies/${discrepancyId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resolutionNotes: 'Manual verification completed - discrepancy resolved' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Discrepancy resolved successfully');

      // Verify discrepancy is marked as resolved
      const resolvedDiscrepancy = db.prepare(`
        SELECT status FROM discrepancy_alerts WHERE id = ?
      `).get(discrepancyId);

      expect(resolvedDiscrepancy.status).toBe('RESOLVED');
    });

    test('should require resolution notes', async () => {
      const response = await request(app)
        .put('/api/reconciliation/discrepancies/1/resolve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Resolution notes are required');
    });

    test('should reject empty resolution notes', async () => {
      const response = await request(app)
        .put('/api/reconciliation/discrepancies/1/resolve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ resolutionNotes: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Resolution notes are required');
    });
  });

  describe('POST /api/reconciliation/transaction/:id/verify', () => {
    test('should verify transaction integrity', async () => {
      // Create valid transaction
      const transactionId = 'TXN_VERIFY_001';
      db.prepare(`
        INSERT INTO transactions (id, account_id, amount, type, reference, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?)
      `).run(transactionId, testAccountId, 1500.00, 'CREDIT', 'Test payment', new Date().toISOString());

      const response = await request(app)
        .post(`/api/reconciliation/transaction/${transactionId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transactionId).toBe(transactionId);
      expect(response.body.data.isValid).toBeDefined();
      expect(response.body.data.checks).toBeDefined();
    });

    test('should handle non-existent transaction', async () => {
      const response = await request(app)
        .post('/api/reconciliation/transaction/NON_EXISTENT/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Transaction not found');
    });
  });

  describe('POST /api/reconciliation/audit-trail', () => {
    test('should generate audit trail in JSON format', async () => {
      // Create test data
      db.prepare(`
        INSERT INTO transactions (id, account_id, amount, type, status, created_at)
        VALUES (?, ?, ?, ?, 'COMPLETED', ?)
      `).run('TXN_AUDIT_001', testAccountId, 2500.00, 'CREDIT', new Date().toISOString());

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();

      const response = await request(app)
        .post('/api/reconciliation/audit-trail')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          format: 'json'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBeDefined();
      expect(response.body.data.transactions).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
    });

    test('should generate audit trail in CSV format', async () => {
      // Create test data
      db.prepare(`
        INSERT INTO transactions (id, account_id, amount, type, status, created_at)
        VALUES (?, ?, ?, ?, 'COMPLETED', ?)
      `).run('TXN_CSV_001', testAccountId, 1800.00, 'DEBIT', new Date().toISOString());

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();

      const response = await request(app)
        .post('/api/reconciliation/audit-trail')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          format: 'csv'
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('Transaction ID');
    });

    test('should require start and end dates', async () => {
      const response = await request(app)
        .post('/api/reconciliation/audit-trail')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Start date and end date are required');
    });

    test('should validate date range', async () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1); // End before start

      const response = await request(app)
        .post('/api/reconciliation/audit-trail')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Start date must be before end date');
    });
  });

  describe('POST /api/reconciliation/balance/correct', () => {
    test('should correct account balance successfully', async () => {
      const correctionData = {
        accountId: testAccountId,
        currentBalance: formatTaka(5000.00),
        correctBalance: formatTaka(5500.00),
        reason: 'Manual adjustment for reconciliation test',
        evidence: 'Test ticket #12345'
      };

      const response = await request(app)
        .post('/api/reconciliation/balance/correct')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(correctionData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Balance correction applied successfully');
      expect(response.body.data.transactionId).toBeDefined();
      expect(response.body.data.correction.from).toBe(formatTaka(5000.00));
      expect(response.body.data.correction.to).toBe(formatTaka(5500.00));

      // Verify balance was updated
      const updatedBalance = db.prepare(`
        SELECT balance FROM account_balances WHERE account_id = ?
      `).get(testAccountId);

      expect(parseFloat(updatedBalance.balance)).toBe(5500.00);
    });

    test('should require all mandatory fields', async () => {
      const response = await request(app)
        .post('/api/reconciliation/balance/correct')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          accountId: testAccountId,
          currentBalance: formatTaka(5000.00)
          // Missing correctBalance and reason
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    test('should validate Taka amount format', async () => {
      const response = await request(app)
        .post('/api/reconciliation/balance/correct')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          accountId: testAccountId,
          currentBalance: 'invalid_amount',
          correctBalance: formatTaka(5500.00),
          reason: 'Test correction'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid Taka amount format');
    });

    test('should handle negative corrections', async () => {
      const correctionData = {
        accountId: testAccountId,
        currentBalance: formatTaka(5000.00),
        correctBalance: formatTaka(4500.00),
        reason: 'Correction for overpayment'
      };

      const response = await request(app)
        .post('/api/reconciliation/balance/correct')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(correctionData);

      expect(response.status).toBe(200);
      expect(response.body.data.correction.difference).toBe(formatTaka(-500.00));
    });
  });

  describe('GET /api/reconciliation/health', () => {
    test('should return financial health status', async () => {
      const response = await request(app)
        .get('/api/reconciliation/health')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBeDefined();
      expect(response.body.data.metrics).toBeDefined();
      expect(response.body.data.alerts).toBeDefined();
      expect(response.body.data.checkedAt).toBeDefined();
    });

    test('should detect issues when discrepancies exist', async () => {
      // Create discrepancy
      const reconciliationId = db.prepare(`
        INSERT INTO reconciliation_records (date, status, expected_balances, actual_balances, discrepancies)
        VALUES (?, 'DISCREPANCY_FOUND', '{}', '{}', '[]')
      `).run(new Date().toISOString()).lastInsertRowid;

      db.prepare(`
        INSERT INTO discrepancy_alerts 
        (reconciliation_id, account_id, expected_amount, actual_amount, difference_amount, severity, status)
        VALUES (?, ?, ?, ?, ?, 'HIGH', 'OPEN')
      `).run(reconciliationId, testAccountId, 5000.00, 4000.00, -1000.00);

      const response = await request(app)
        .get('/api/reconciliation/health')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('ISSUES_DETECTED');
      expect(response.body.data.alerts.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/reconciliation/health/history', () => {
    test('should return health check history', async () => {
      // Trigger health check to create history
      await request(app)
        .get('/api/reconciliation/health')
        .set('Authorization', `Bearer ${adminToken}`);

      const response = await request(app)
        .get('/api/reconciliation/health/history')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should filter by days parameter', async () => {
      const response = await request(app)
        .get('/api/reconciliation/health/history?days=7')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/reconciliation/corrections/history', () => {
    test('should return balance correction history', async () => {
      // Create a correction first
      await request(app)
        .post('/api/reconciliation/balance/correct')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          accountId: testAccountId,
          currentBalance: formatTaka(5000.00),
          correctBalance: formatTaka(5200.00),
          reason: 'Test correction for history'
        });

      const response = await request(app)
        .get('/api/reconciliation/corrections/history')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].reason).toBe('Test correction for history');
      expect(response.body.data[0].original_balance).toMatch(/৳/);
      expect(response.body.pagination).toBeDefined();
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get('/api/reconciliation/corrections/history?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('Authentication and Authorization', () => {
    test('should require authentication for all endpoints', async () => {
      const endpoints = [
        { method: 'post', path: '/api/reconciliation/daily/trigger' },
        { method: 'get', path: '/api/reconciliation/daily/2024-01-01' },
        { method: 'get', path: '/api/reconciliation/history' },
        { method: 'get', path: '/api/reconciliation/discrepancies' },
        { method: 'get', path: '/api/reconciliation/health' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        expect(response.status).toBe(401);
      }
    });

    test('should require admin role for all endpoints', async () => {
      // Create regular user token
      const regularUserToken = jwt.sign(
        { id: 999, email: 'user@test.com', role: 'user' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/reconciliation/health')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll test with invalid data that causes database constraints
      const response = await request(app)
        .post('/api/reconciliation/balance/correct')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          accountId: 'NON_EXISTENT_ACCOUNT',
          currentBalance: formatTaka(1000.00),
          correctBalance: formatTaka(1100.00),
          reason: 'Test with non-existent account'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/reconciliation/daily/trigger')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });
  });

  describe('Taka Currency Formatting', () => {
    test('should format all monetary values in Taka', async () => {
      // Create discrepancy with specific amounts
      const reconciliationId = db.prepare(`
        INSERT INTO reconciliation_records (date, status, expected_balances, actual_balances, discrepancies)
        VALUES (?, 'DISCREPANCY_FOUND', '{}', '{}', '[]')
      `).run(new Date().toISOString()).lastInsertRowid;

      db.prepare(`
        INSERT INTO discrepancy_alerts 
        (reconciliation_id, account_id, expected_amount, actual_amount, difference_amount, severity, status)
        VALUES (?, ?, ?, ?, ?, 'MEDIUM', 'OPEN')
      `).run(reconciliationId, testAccountId, 12345.67, 11234.56, -1111.11);

      const response = await request(app)
        .get('/api/reconciliation/discrepancies')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data[0].expected_amount).toMatch(/৳12,345\.67/);
      expect(response.body.data[0].actual_amount).toMatch(/৳11,234\.56/);
      expect(response.body.data[0].difference_amount).toMatch(/৳-1,111\.11/);
    });

    test('should handle large amounts with proper formatting', async () => {
      const correctionData = {
        accountId: testAccountId,
        currentBalance: formatTaka(1234567.89),
        correctBalance: formatTaka(1334567.89),
        reason: 'Large amount correction test'
      };

      const response = await request(app)
        .post('/api/reconciliation/balance/correct')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(correctionData);

      expect(response.status).toBe(200);
      expect(response.body.data.correction.from).toMatch(/৳1,234,567\.89/);
      expect(response.body.data.correction.to).toMatch(/৳1,334,567\.89/);
      expect(response.body.data.correction.difference).toMatch(/৳100,000\.00/);
    });
  });
});