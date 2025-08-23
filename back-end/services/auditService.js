const { dbPromise } = require('../config/database');
const securityUtils = require('../utils/securityUtils');

class AuditService {
  constructor() {
    this.db = null;
    this.initialized = false;
    // Don't call async method in constructor
    this.initializeAuditTables().catch(error => {
      console.error('Failed to initialize audit tables in constructor:', error);
    });
  }

  /**
   * Ensure the service is initialized
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeAuditTables();
    }
  }

  /**
   * Initialize audit tables if they don't exist
   */
  async initializeAuditTables() {
    if (this.initialized) {
      return;
    }

    try {
      // Wait for database connection
      this.db = await dbPromise;
      
      const execSQL = async (sql) => {
        if (this.db && this.db.useBetterSqlite3) {
          this.db.exec(sql);
        } else if (this.db && this.db.exec) {
          await this.db.exec(sql);
        } else {
          throw new Error('Database connection not available or exec method not found');
        }
      };

      // Financial operations audit table
      await execSQL(`
        CREATE TABLE IF NOT EXISTS financial_audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          transaction_id TEXT NOT NULL,
          user_id INTEGER,
          operation_type TEXT NOT NULL,
          amount_taka DECIMAL(10,2),
          currency TEXT DEFAULT 'BDT',
          payment_method TEXT,
          mobile_number_masked TEXT,
          status TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          session_id TEXT,
          risk_score INTEGER DEFAULT 0,
          fraud_flags TEXT,
          audit_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Security events audit table
      await execSQL(`
        CREATE TABLE IF NOT EXISTS security_audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_type TEXT NOT NULL,
          user_id INTEGER,
          ip_address TEXT,
          user_agent TEXT,
          session_id TEXT,
          event_data TEXT,
          severity TEXT DEFAULT 'INFO',
          audit_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Payment data encryption log
      await execSQL(`
        CREATE TABLE IF NOT EXISTS encryption_audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          data_type TEXT NOT NULL,
          operation TEXT NOT NULL,
          user_id INTEGER,
          success BOOLEAN NOT NULL,
          error_message TEXT,
          audit_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      console.log('✅ Audit tables initialized successfully');
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize audit tables:', error);
      this.initialized = false;
    }
  }

  /**
   * Helper method to execute database operations with compatibility
   */
  async executeQuery(stmt, params = []) {
    if (!this.db) {
      this.db = await dbPromise;
    }

    if (this.db.useBetterSqlite3) {
      if (params.length > 0) {
        return stmt.run(...params);
      } else {
        return stmt.run();
      }
    } else {
      if (params.length > 0) {
        return await stmt.run(params);
      } else {
        return await stmt.run();
      }
    }
  }

  /**
   * Helper method to get data with compatibility
   */
  async getData(stmt, params = []) {
    if (!this.db) {
      this.db = await dbPromise;
    }

    if (this.db.useBetterSqlite3) {
      if (params.length > 0) {
        return stmt.get(...params);
      } else {
        return stmt.get();
      }
    } else {
      if (params.length > 0) {
        return await stmt.get(params);
      } else {
        return await stmt.get();
      }
    }
  }

  /**
   * Helper method to get all data with compatibility
   */
  async getAllData(stmt, params = []) {
    if (!this.db) {
      this.db = await dbPromise;
    }

    if (this.db.useBetterSqlite3) {
      if (params.length > 0) {
        return stmt.all(...params);
      } else {
        return stmt.all();
      }
    } else {
      if (params.length > 0) {
        return await stmt.all(params);
      } else {
        return await stmt.all();
      }
    }
  }

  /**
   * Log financial operations with comprehensive audit trail
   */
  async logFinancialOperation(operationData) {
    try {
      // Ensure service is initialized
      await this.ensureInitialized();
      
      // Ensure database is initialized
      if (!this.db) {
        this.db = await dbPromise;
      }

      const {
        transactionId,
        userId,
        operationType,
        amountTaka,
        currency = 'BDT',
        paymentMethod,
        mobileNumber,
        status,
        ipAddress,
        userAgent,
        sessionId,
        riskScore = 0,
        fraudFlags = []
      } = operationData;

      // Mask sensitive data
      const maskedMobileNumber = mobileNumber ? securityUtils.maskMobileNumber(mobileNumber) : null;
      
      const auditData = {
        transaction_id: transactionId,
        user_id: userId,
        operation_type: operationType,
        amount_taka: amountTaka,
        currency,
        payment_method: paymentMethod,
        mobile_number_masked: maskedMobileNumber,
        status,
        ip_address: ipAddress,
        user_agent: userAgent,
        session_id: sessionId,
        risk_score: riskScore,
        fraud_flags: JSON.stringify(fraudFlags)
      };

      // Generate audit hash for integrity
      const auditHash = securityUtils.generateAuditHash(auditData);
      auditData.audit_hash = auditHash;

      const stmt = this.db.prepare(`
        INSERT INTO financial_audit_log (
          transaction_id, user_id, operation_type, amount_taka, currency,
          payment_method, mobile_number_masked, status, ip_address,
          user_agent, session_id, risk_score, fraud_flags, audit_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Handle case where user_id might not exist in users table
      let validUserId = auditData.user_id;
      if (validUserId) {
        try {
          const userCheckStmt = this.db.prepare('SELECT id FROM users WHERE id = ?');
          const userCheck = await this.getData(userCheckStmt, [validUserId]);
          if (!userCheck) {
            validUserId = null; // Set to null if user doesn't exist
          }
        } catch (error) {
          validUserId = null; // Set to null if users table doesn't exist or other error
        }
      }

      const result = await this.executeQuery(stmt, [
        auditData.transaction_id,
        validUserId,
        auditData.operation_type,
        auditData.amount_taka,
        auditData.currency,
        auditData.payment_method,
        auditData.mobile_number_masked,
        auditData.status,
        auditData.ip_address,
        auditData.user_agent,
        auditData.session_id,
        auditData.risk_score,
        auditData.fraud_flags,
        auditData.audit_hash
      ]);

      return { success: true, auditId: result.lastID || result.lastInsertRowid };
    } catch (error) {
      console.error('Failed to log financial operation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log security events
   */
  async logSecurityEvent(eventData) {
    try {
      await this.ensureInitialized();
      
      if (!this.db) {
        this.db = await dbPromise;
      }

      const {
        eventType,
        userId,
        ipAddress,
        userAgent,
        sessionId,
        eventData: data,
        severity = 'INFO'
      } = eventData;

      const auditData = {
        event_type: eventType,
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        session_id: sessionId,
        event_data: JSON.stringify(data),
        severity
      };

      // Generate audit hash for integrity
      const auditHash = securityUtils.generateAuditHash(auditData);
      auditData.audit_hash = auditHash;

      const stmt = this.db.prepare(`
        INSERT INTO security_audit_log (
          event_type, user_id, ip_address, user_agent,
          session_id, event_data, severity, audit_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Handle case where user_id might not exist in users table
      let validUserId = auditData.user_id;
      if (validUserId) {
        try {
          const userCheckStmt = this.db.prepare('SELECT id FROM users WHERE id = ?');
          const userCheck = await this.getData(userCheckStmt, [validUserId]);
          if (!userCheck) {
            validUserId = null;
          }
        } catch (error) {
          validUserId = null;
        }
      }

      const result = await this.executeQuery(stmt, [
        auditData.event_type,
        validUserId,
        auditData.ip_address,
        auditData.user_agent,
        auditData.session_id,
        auditData.event_data,
        auditData.severity,
        auditData.audit_hash
      ]);

      return { success: true, auditId: result.lastID || result.lastInsertRowid };
    } catch (error) {
      console.error('Failed to log security event:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log encryption operations
   */
  async logEncryptionOperation(operationData) {
    try {
      await this.ensureInitialized();
      
      if (!this.db) {
        this.db = await dbPromise;
      }

      const {
        dataType,
        operation,
        userId,
        success,
        errorMessage
      } = operationData;

      const auditData = {
        data_type: dataType,
        operation,
        user_id: userId,
        success,
        error_message: errorMessage
      };

      // Generate audit hash for integrity
      const auditHash = securityUtils.generateAuditHash(auditData);
      auditData.audit_hash = auditHash;

      const stmt = this.db.prepare(`
        INSERT INTO encryption_audit_log (
          data_type, operation, user_id, success, error_message, audit_hash
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      // Handle case where user_id might not exist in users table
      let validUserId = auditData.user_id;
      if (validUserId) {
        try {
          const userCheckStmt = this.db.prepare('SELECT id FROM users WHERE id = ?');
          const userCheck = await this.getData(userCheckStmt, [validUserId]);
          if (!userCheck) {
            validUserId = null;
          }
        } catch (error) {
          validUserId = null;
        }
      }

      const result = await this.executeQuery(stmt, [
        auditData.data_type,
        auditData.operation,
        validUserId,
        auditData.success,
        auditData.error_message,
        auditData.audit_hash
      ]);

      return { success: true, auditId: result.lastID || result.lastInsertRowid };
    } catch (error) {
      console.error('Failed to log encryption operation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filters = {}) {
    try {
      await this.ensureInitialized();
      
      if (!this.db) {
        this.db = await dbPromise;
      }

      const {
        logType = 'financial',
        userId,
        startDate,
        endDate,
        limit = 100,
        offset = 0
      } = filters;

      let tableName;
      switch (logType) {
        case 'financial':
          tableName = 'financial_audit_log';
          break;
        case 'security':
          tableName = 'security_audit_log';
          break;
        case 'encryption':
          tableName = 'encryption_audit_log';
          break;
        default:
          throw new Error('Invalid log type');
      }

      let query = `SELECT * FROM ${tableName} WHERE 1=1`;
      const params = [];

      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }

      if (startDate) {
        query += ' AND created_at >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND created_at <= ?';
        params.push(endDate);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const stmt = this.db.prepare(query);
      const logs = await this.getAllData(stmt, params);

      return { success: true, logs };
    } catch (error) {
      console.error('Failed to get audit logs:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Simple method to get basic financial summary
   */
  async getFinancialSummary() {
    try {
      await this.ensureInitialized();
      
      if (!this.db) {
        this.db = await dbPromise;
      }

      const stmt = this.db.prepare(`
        SELECT 
          operation_type,
          COUNT(*) as count,
          SUM(amount_taka) as total_amount
        FROM financial_audit_log 
        WHERE created_at >= date('now', '-30 days')
        GROUP BY operation_type
      `);

      const summary = await this.getAllData(stmt);
      return { success: true, summary };
    } catch (error) {
      console.error('Failed to get financial summary:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean old audit logs
   */
  async cleanOldLogs(daysToKeep = 90) {
    try {
      await this.ensureInitialized();
      
      if (!this.db) {
        this.db = await dbPromise;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffDateStr = cutoffDate.toISOString();

      const tables = ['financial_audit_log', 'security_audit_log', 'encryption_audit_log'];
      const results = {};

      for (const table of tables) {
        try {
          const stmt = this.db.prepare(`DELETE FROM ${table} WHERE created_at < ?`);
          const result = await this.executeQuery(stmt, [cutoffDateStr]);
          results[table] = result.changes;
        } catch (error) {
          console.error(`Error cleaning ${table}:`, error.message);
          results[table] = 0;
        }
      }

      return { success: true, results };
    } catch (error) {
      console.error('Failed to clean old logs:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create and export singleton instance
const auditService = new AuditService();
module.exports = auditService;