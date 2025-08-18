const RevenueManagementService = require('../../services/revenueManagementService');
const Transaction = require('../../models/Transaction');
const UserBalance = require('../../models/UserBalance');
const PaymentConfig = require('../../models/PaymentConfig');
const db = require('../../config/database');

describe('RevenueManagementService', () => {
  beforeEach(() => {
    // Clean up test data
    db.exec('DELETE FROM transactions WHERE transactionId LIKE "TEST_%"');
    db.exec('DELETE FROM user_balances WHERE userId IN (9998, 9999)');
  });

  afterAll(() => {
    // Clean up test data
    db.exec('DELETE FROM transactions WHERE transactionId LIKE "TEST_%"');
    db.exec('DELETE FROM user_balances WHERE userId IN (9998, 9999)');
  });

  describe('calculateServiceCharge', () => {
    test('should calculate service charge with default rate', () => {
      const serviceCharge = RevenueManagementService.calculateServiceCharge(100.00, 1);
      
      // Should use default 5% rate if no config found
      expect(serviceCharge).toBeCloseTo(5.00, 2);
    });

    test('should calculate service charge with custom rate', () => {
      const serviceCharge = RevenueManagementService.calculateServiceCharge(100.00, 1, 0.10);
      
      expect(serviceCharge).toBeCloseTo(10.00, 2);
    });

    test('should handle zero amount', () => {
      const serviceCharge = RevenueManagementService.calculateServiceCharge(0, 1);
      
      expect(serviceCharge).toBe(0);
    });
  });

  describe('getDateRangeForPeriod', () => {
    test('should return correct date range for different periods', () => {
      const todayRange = RevenueManagementService.getDateRangeForPeriod('today');
      const weekRange = RevenueManagementService.getDateRangeForPeriod('week');
      const monthRange = RevenueManagementService.getDateRangeForPeriod('month');

      expect(todayRange).toHaveProperty('startDate');
      expect(todayRange).toHaveProperty('endDate');
      expect(weekRange).toHaveProperty('startDate');
      expect(weekRange).toHaveProperty('endDate');
      expect(monthRange).toHaveProperty('startDate');
      expect(monthRange).toHaveProperty('endDate');

      // Verify date format (YYYY-MM-DD)
      expect(todayRange.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(weekRange.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(monthRange.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should default to month for invalid period', () => {
      const defaultRange = RevenueManagementService.getDateRangeForPeriod('invalid');
      const monthRange = RevenueManagementService.getDateRangeForPeriod('month');

      expect(defaultRange.startDate).toBe(monthRange.startDate);
      expect(defaultRange.endDate).toBe(monthRange.endDate);
    });
  });

  describe('getResourceRevenueBreakdown', () => {
    test('should return empty array for hospital with no transactions', () => {
      const breakdown = RevenueManagementService.getResourceRevenueBreakdown(9999);
      
      expect(Array.isArray(breakdown)).toBe(true);
      expect(breakdown).toHaveLength(0);
    });

    test('should handle date range filtering', () => {
      const dateRange = {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };
      
      const breakdown = RevenueManagementService.getResourceRevenueBreakdown(1, dateRange);
      
      expect(Array.isArray(breakdown)).toBe(true);
      // Should not throw error even if no data
    });
  });

  describe('getServiceChargeAnalytics', () => {
    test('should return service charge analytics', () => {
      const analytics = RevenueManagementService.getServiceChargeAnalytics();
      
      expect(Array.isArray(analytics)).toBe(true);
      // Each item should have expected properties if data exists
      if (analytics.length > 0) {
        expect(analytics[0]).toHaveProperty('hospitalId');
        expect(analytics[0]).toHaveProperty('hospitalName');
        expect(analytics[0]).toHaveProperty('totalServiceCharge');
      }
    });

    test('should handle date range filtering', () => {
      const dateRange = {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };
      
      const analytics = RevenueManagementService.getServiceChargeAnalytics(dateRange);
      
      expect(Array.isArray(analytics)).toBe(true);
    });
  });

  describe('getHospitalRevenueDistribution', () => {
    test('should return hospital revenue distribution', () => {
      const distribution = RevenueManagementService.getHospitalRevenueDistribution();
      
      expect(Array.isArray(distribution)).toBe(true);
      // Each item should have expected properties if data exists
      if (distribution.length > 0) {
        expect(distribution[0]).toHaveProperty('hospitalId');
        expect(distribution[0]).toHaveProperty('hospitalName');
        expect(distribution[0]).toHaveProperty('totalHospitalRevenue');
        expect(distribution[0]).toHaveProperty('totalServiceCharge');
      }
    });
  });

  describe('reconcileBalances', () => {
    test('should return reconciliation report', () => {
      const report = RevenueManagementService.reconcileBalances();
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('discrepancies');
      expect(report).toHaveProperty('summary');
      expect(Array.isArray(report.discrepancies)).toBe(true);
      expect(report.summary).toHaveProperty('totalTransactions');
      expect(report.summary).toHaveProperty('totalRevenue');
      expect(report.summary).toHaveProperty('balanceDiscrepancies');
    });

    test('should handle date range in reconciliation', () => {
      const dateRange = {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };
      
      const report = RevenueManagementService.reconcileBalances(dateRange);
      
      expect(report.dateRange).toEqual(dateRange);
    });
  });

  describe('getRevenueMetrics', () => {
    test('should return admin revenue metrics when no hospital specified', () => {
      const metrics = RevenueManagementService.getRevenueMetrics();
      
      expect(metrics).toHaveProperty('platformRevenue');
      expect(metrics).toHaveProperty('serviceChargeAnalytics');
      expect(metrics).toHaveProperty('adminBalances');
      expect(metrics).toHaveProperty('hospitalDistribution');
    });

    test('should return hospital revenue metrics when hospital specified', () => {
      const metrics = RevenueManagementService.getRevenueMetrics(1);
      
      expect(metrics).toHaveProperty('totalRevenue');
      expect(metrics).toHaveProperty('dailyAnalytics');
      expect(metrics).toHaveProperty('resourceBreakdown');
    });
  });

  describe('getLowBalanceAlerts', () => {
    test('should return low balance alerts', () => {
      const alerts = RevenueManagementService.getLowBalanceAlerts(100.00);
      
      expect(alerts).toHaveProperty('threshold');
      expect(alerts).toHaveProperty('alertCount');
      expect(alerts).toHaveProperty('accounts');
      expect(alerts).toHaveProperty('generatedAt');
      expect(alerts.threshold).toBe(100.00);
      expect(Array.isArray(alerts.accounts)).toBe(true);
      expect(typeof alerts.alertCount).toBe('number');
    });

    test('should use default threshold when not specified', () => {
      const alerts = RevenueManagementService.getLowBalanceAlerts();
      
      expect(alerts.threshold).toBe(100.00);
    });
  });

  describe('processBulkRevenueDistribution', () => {
    test('should handle empty transaction list', async () => {
      const result = await RevenueManagementService.processBulkRevenueDistribution([]);
      
      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(result.totalProcessed).toBe(0);
      expect(result.totalFailed).toBe(0);
    });

    test('should handle non-existent transactions', async () => {
      const result = await RevenueManagementService.processBulkRevenueDistribution([99999]);
      
      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(result.totalProcessed).toBe(0);
      expect(result.totalFailed).toBe(0);
    });
  });

  describe('error handling', () => {
    test('should handle database errors gracefully', () => {
      // Test with invalid hospital ID
      expect(() => {
        RevenueManagementService.getResourceRevenueBreakdown('invalid');
      }).toThrow();
    });
  });
});

module.exports = {};