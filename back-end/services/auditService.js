const AuditLog = require('../models/AuditLog');
const securityUtils = require('../utils/securityUtils');

class AuditService {
  constructor() {
    // No initialization needed for Mongoose
  }

  async logFinancialOperation(operationData) {
    try {
      const log = new AuditLog({
        eventType: operationData.operationType || 'FINANCIAL_OP',
        entityType: 'financial',
        entityId: operationData.transactionId || 'UNKNOWN_TX',
        userId: operationData.userId,
        // Store financial details in metadata or changes
        metadata: {
          amountTaka: operationData.amountTaka,
          currency: operationData.currency,
          paymentMethod: operationData.paymentMethod,
          mobileNumber: securityUtils.maskMobileNumber(operationData.mobileNumber),
          status: operationData.status,
          ipAddress: operationData.ipAddress,
          userAgent: operationData.userAgent,
          riskScore: operationData.riskScore,
          fraudFlags: operationData.fraudFlags
        }
      });
      
      await log.save();
      return { success: true, auditId: log._id };
    } catch (error) {
      console.error('Audit logging failed:', error);
      // Failsafe: don't crash main flow
      return { success: false, error: error.message };
    }
  }

  async logSecurityEvent(eventData) {
    try {
      const log = new AuditLog({
        eventType: eventData.eventType || 'SECURITY_EVENT',
        entityType: 'security',
        entityId: 'SYSTEM', // or specific entity
        userId: eventData.userId,
        metadata: {
          ipAddress: eventData.ipAddress,
          userAgent: eventData.userAgent,
          sessionId: eventData.sessionId,
          eventData: eventData.eventData,
          severity: eventData.severity
        }
      });
      
      await log.save();
      return { success: true, auditId: log._id };
    } catch (error) {
      console.error('Security audit logging failed:', error);
      return { success: false, error: error.message };
    }
  }

  async logEncryptionOperation(operationData) {
    // Optional: Log encryption ops if needed
    // Usually too verbose for DB, maybe console or file log
    return { success: true, auditId: 'skipped' };
  }

  async getFinancialAuditLogs(filters = {}) {
    try {
       const query = { entityType: 'financial' };
       if (filters.userId) query.userId = filters.userId;
       if (filters.startDate) query.createdAt = { $gte: new Date(filters.startDate) };
       if (filters.endDate) query.createdAt = { ...query.createdAt, $lte: new Date(filters.endDate) };
       
       const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(filters.limit || 100);
       return { success: true, logs };
    } catch (error) {
       return { success: false, error: error.message };
    }
  }
}

module.exports = new AuditService();