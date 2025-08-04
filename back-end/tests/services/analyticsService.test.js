const { describe, it, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');
const db = require('../../config/database');
const AnalyticsService = require('../../services/analyticsService');

describe('AnalyticsService', () => {
  let testHospitalId, testUserId, testBookingId;

  beforeEach(() => {
    // Create test data
    const hospitalStmt = db.prepare(`
      INSERT INTO hospitals (name, city, state, country, phone, email, emergency)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const hospitalResult = hospitalStmt.run(
      'Test Hospital',
      'Test City',
      'Test State',
      'Test Country',
      '123-456-7890',
      'test@hospital.com',
      '911'
    );
    testHospitalId = hospitalResult.lastInsertRowid;

    const userStmt = db.prepare(`
      INSERT INTO users (email, password, name, userType)
      VALUES (?, ?, ?, ?)
    `);
    const userResult = userStmt.run(
      'test@user.com',
      'hashedpassword',
      'Test User',
      'hospital-authority'
    );
    testUserId = userResult.lastInsertRowid;

    // Create hospital resources
    const resourceStmt = db.prepare(`
      INSERT INTO hospital_resources (hospitalId, resourceType, total, available, occupied)
      VALUES (?, ?, ?, ?, ?)
    `);
    resourceStmt.run(testHospitalId, 'beds', 50, 30, 20);
    resourceStmt.run(testHospitalId, 'icu', 20, 15, 5);
    resourceStmt.run(testHospitalId, 'operationTheatres', 10, 8, 2);

    // Create test bookings
    const bookingStmt = db.prepare(`
      INSERT INTO bookings (
        userId, hospitalId, resourceType, patientName, patientAge, 
        patientGender, emergencyContactName, emergencyContactPhone, 
        emergencyContactRelationship, medicalCondition, urgency, 
        status, paymentAmount, scheduledDate, estimatedDuration, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Create bookings with different statuses and dates
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    testBookingId = bookingStmt.run(
      testUserId, testHospitalId, 'beds', 'John Doe', 35, 'male',
      'Jane Doe', '123-456-7890', 'spouse', 'Emergency surgery',
      'critical', 'approved', 1500.00, tomorrow.toISOString(), 24,
      yesterday.toISOString(), now.toISOString()
    ).lastInsertRowid;

    bookingStmt.run(
      testUserId, testHospitalId, 'icu', 'Jane Smith', 28, 'female',
      'John Smith', '098-765-4321', 'spouse', 'Heart condition',
      'high', 'declined', 2000.00, tomorrow.toISOString(), 48,
      twoDaysAgo.toISOString(), yesterday.toISOString()
    );

    bookingStmt.run(
      testUserId, testHospitalId, 'operationTheatres', 'Bob Johnson', 45, 'male',
      'Alice Johnson', '555-123-4567', 'spouse', 'Appendectomy',
      'medium', 'pending', 3000.00, tomorrow.toISOString(), 12,
      now.toISOString(), now.toISOString()
    );

    // Create resource audit logs
    const auditStmt = db.prepare(`
      INSERT INTO resource_audit_log (
        hospitalId, resourceType, changeType, oldValue, newValue, 
        quantity, bookingId, changedBy, reason, timestamp
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    auditStmt.run(
      testHospitalId, 'beds', 'manual_update', 35, 30, -5,
      null, testUserId, 'Resource quantity updated', yesterday.toISOString()
    );

    auditStmt.run(
      testHospitalId, 'beds', 'booking_approved', null, null, -1,
      testBookingId, testUserId, 'Resource allocated for approved booking', now.toISOString()
    );
  });

  afterEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM resource_audit_log').run();
    db.prepare('DELETE FROM bookings').run();
    db.prepare('DELETE FROM hospital_resources').run();
    db.prepare('DELETE FROM hospital_authorities').run();
    db.prepare('DELETE FROM users').run();
    db.prepare('DELETE FROM hospitals').run();
  });

  describe('getResourceUtilizationAnalytics', () => {
    it('should return resource utilization analytics for a hospital', () => {
      const analytics = AnalyticsService.getResourceUtilizationAnalytics(testHospitalId);

      expect(analytics).to.be.an('object');
      expect(analytics.hospitalId).to.equal(testHospitalId);
      expect(analytics.currentResources).to.be.an('array');
      expect(analytics.currentResources).to.have.length(3);
      
      // Check beds resource
      const bedsResource = analytics.currentResources.find(r => r.resourceType === 'beds');
      expect(bedsResource).to.exist;
      expect(bedsResource.total).to.equal(50);
      expect(bedsResource.available).to.equal(30);
      expect(bedsResource.occupied).to.equal(20);
      expect(bedsResource.utilizationPercentage).to.equal(40); // 20/50 * 100

      expect(analytics.utilizationMetrics).to.be.an('object');
      expect(analytics.utilizationMetrics.beds).to.exist;
      expect(analytics.utilizationMetrics.beds.currentUtilization).to.equal(40);
      expect(analytics.utilizationMetrics.beds.totalChanges).to.equal(2); // manual update + booking approval

      expect(analytics.peakUsagePatterns).to.be.an('object');
      expect(analytics.efficiencyMetrics).to.be.an('array');
      expect(analytics.totalAuditEvents).to.equal(2);
      expect(analytics.generatedAt).to.be.a('string');
    });

    it('should filter analytics by resource type', () => {
      const analytics = AnalyticsService.getResourceUtilizationAnalytics(testHospitalId, {
        resourceType: 'beds'
      });

      expect(analytics.currentResources).to.have.length(3); // Still shows all current resources
      expect(analytics.totalAuditEvents).to.equal(2); // Only beds audit events
    });

    it('should filter analytics by date range', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const analytics = AnalyticsService.getResourceUtilizationAnalytics(testHospitalId, {
        startDate: yesterday.toISOString()
      });

      expect(analytics.totalAuditEvents).to.be.at.least(1); // Events within range
    });
  });

  describe('getBookingHistoryAnalytics', () => {
    it('should return booking history analytics for a hospital', () => {
      const analytics = AnalyticsService.getBookingHistoryAnalytics(testHospitalId);

      expect(analytics).to.be.an('object');
      expect(analytics.hospitalId).to.equal(testHospitalId);
      expect(analytics.bookingStats).to.be.an('array');
      expect(analytics.bookingTrends).to.be.an('array');
      expect(analytics.resourceDemand).to.be.an('array');
      expect(analytics.approvalMetrics).to.be.an('object');
      expect(analytics.patientDemographics).to.be.an('array');

      // Check approval metrics
      expect(analytics.approvalMetrics.totalBookings).to.equal(3);
      expect(analytics.approvalMetrics.approvedBookings).to.equal(1);
      expect(analytics.approvalMetrics.declinedBookings).to.equal(1);
      expect(analytics.approvalMetrics.pendingBookings).to.equal(1);
      expect(analytics.approvalMetrics.approvalRate).to.equal(33); // 1/3 * 100, rounded

      // Check patient demographics
      expect(analytics.patientDemographics).to.have.length.greaterThan(0);
      const malePatients = analytics.patientDemographics
        .filter(d => d.patientGender === 'male')
        .reduce((sum, d) => sum + d.count, 0);
      expect(malePatients).to.equal(2);
    });

    it('should filter booking analytics by status', () => {
      const analytics = AnalyticsService.getBookingHistoryAnalytics(testHospitalId, {
        status: 'approved'
      });

      expect(analytics.bookingStats).to.have.length.greaterThan(0);
      const approvedStats = analytics.bookingStats.filter(stat => stat.status === 'approved');
      expect(approvedStats).to.have.length.greaterThan(0);
    });

    it('should filter booking analytics by resource type', () => {
      const analytics = AnalyticsService.getBookingHistoryAnalytics(testHospitalId, {
        resourceType: 'beds'
      });

      expect(analytics.bookingStats).to.have.length.greaterThan(0);
      const bedsStats = analytics.bookingStats.filter(stat => stat.resourceType === 'beds');
      expect(bedsStats).to.have.length.greaterThan(0);
    });
  });

  describe('getResourceUsagePatterns', () => {
    it('should return resource usage patterns for a hospital', () => {
      const patterns = AnalyticsService.getResourceUsagePatterns(testHospitalId);

      expect(patterns).to.be.an('object');
      expect(patterns.hospitalId).to.equal(testHospitalId);
      expect(patterns.hourlyPatterns).to.be.an('array');
      expect(patterns.dailyPatterns).to.be.an('array');
      expect(patterns.weeklyPatterns).to.be.an('array');
      expect(patterns.seasonalPatterns).to.be.an('array');
      expect(patterns.correlationAnalysis).to.be.an('array');
      expect(patterns.generatedAt).to.be.a('string');
    });

    it('should include hourly patterns with booking counts', () => {
      const patterns = AnalyticsService.getResourceUsagePatterns(testHospitalId);

      expect(patterns.hourlyPatterns).to.have.length.greaterThan(0);
      patterns.hourlyPatterns.forEach(pattern => {
        expect(pattern).to.have.property('hour');
        expect(pattern).to.have.property('resourceType');
        expect(pattern).to.have.property('bookingCount');
        expect(pattern).to.have.property('approvalRate');
        expect(pattern.bookingCount).to.be.a('number');
        expect(pattern.approvalRate).to.be.a('number');
      });
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics for a hospital', () => {
      const metrics = AnalyticsService.getPerformanceMetrics(testHospitalId);

      expect(metrics).to.be.an('object');
      expect(metrics.hospitalId).to.equal(testHospitalId);
      expect(metrics.responseTimeMetrics).to.be.an('array');
      expect(metrics.turnoverMetrics).to.be.an('array');
      expect(metrics.satisfactionMetrics).to.be.an('array');
      expect(metrics.efficiencyMetrics).to.be.an('object');
      expect(metrics.capacityRecommendations).to.be.an('array');
      expect(metrics.generatedAt).to.be.a('string');
    });

    it('should calculate response time metrics correctly', () => {
      const metrics = AnalyticsService.getPerformanceMetrics(testHospitalId);

      expect(metrics.responseTimeMetrics).to.have.length.greaterThan(0);
      metrics.responseTimeMetrics.forEach(metric => {
        expect(metric).to.have.property('resourceType');
        expect(metric).to.have.property('avgResponseMinutes');
        expect(metric).to.have.property('totalProcessed');
        expect(metric.avgResponseMinutes).to.be.a('number');
        expect(metric.totalProcessed).to.be.a('number');
      });
    });

    it('should generate capacity recommendations based on utilization', () => {
      const metrics = AnalyticsService.getPerformanceMetrics(testHospitalId);

      expect(metrics.capacityRecommendations).to.be.an('array');
      // Since our test data has low utilization, we might get optimization recommendations
      if (metrics.capacityRecommendations.length > 0) {
        metrics.capacityRecommendations.forEach(rec => {
          expect(rec).to.have.property('resourceType');
          expect(rec).to.have.property('type');
          expect(rec).to.have.property('priority');
          expect(rec).to.have.property('message');
          expect(['increase_capacity', 'optimize_capacity']).to.include(rec.type);
          expect(['high', 'medium', 'low']).to.include(rec.priority);
        });
      }
    });
  });

  describe('getAnalyticsDashboard', () => {
    it('should return comprehensive analytics dashboard data', () => {
      const dashboard = AnalyticsService.getAnalyticsDashboard(testHospitalId);

      expect(dashboard).to.be.an('object');
      expect(dashboard.hospitalId).to.equal(testHospitalId);
      expect(dashboard.resourceUtilization).to.be.an('object');
      expect(dashboard.bookingHistory).to.be.an('object');
      expect(dashboard.usagePatterns).to.be.an('object');
      expect(dashboard.performance).to.be.an('object');
      expect(dashboard.generatedAt).to.be.a('string');

      // Verify that all sub-analytics are included
      expect(dashboard.resourceUtilization.hospitalId).to.equal(testHospitalId);
      expect(dashboard.bookingHistory.hospitalId).to.equal(testHospitalId);
      expect(dashboard.usagePatterns.hospitalId).to.equal(testHospitalId);
      expect(dashboard.performance.hospitalId).to.equal(testHospitalId);
    });

    it('should apply filters to all analytics components', () => {
      const options = {
        resourceType: 'beds',
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const dashboard = AnalyticsService.getAnalyticsDashboard(testHospitalId, options);

      expect(dashboard.period.startDate).to.equal(options.startDate);
      expect(dashboard.resourceUtilization.period.startDate).to.equal(options.startDate);
      expect(dashboard.bookingHistory.period.startDate).to.equal(options.startDate);
      expect(dashboard.usagePatterns.period.startDate).to.equal(options.startDate);
      expect(dashboard.performance.period.startDate).to.equal(options.startDate);
    });
  });

  describe('error handling', () => {
    it('should handle invalid hospital ID gracefully', () => {
      expect(() => {
        AnalyticsService.getResourceUtilizationAnalytics(99999);
      }).to.not.throw();

      const analytics = AnalyticsService.getResourceUtilizationAnalytics(99999);
      expect(analytics.currentResources).to.be.an('array').that.is.empty;
      expect(analytics.totalAuditEvents).to.equal(0);
    });

    it('should handle empty date ranges gracefully', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      
      expect(() => {
        AnalyticsService.getBookingHistoryAnalytics(testHospitalId, {
          startDate: futureDate,
          endDate: futureDate
        });
      }).to.not.throw();

      const analytics = AnalyticsService.getBookingHistoryAnalytics(testHospitalId, {
        startDate: futureDate,
        endDate: futureDate
      });
      
      expect(analytics.bookingStats).to.be.an('array').that.is.empty;
      expect(analytics.approvalMetrics.totalBookings).to.equal(0);
    });
  });

  describe('data aggregation accuracy', () => {
    it('should calculate utilization percentages correctly', () => {
      const analytics = AnalyticsService.getResourceUtilizationAnalytics(testHospitalId);
      
      const bedsResource = analytics.currentResources.find(r => r.resourceType === 'beds');
      expect(bedsResource.utilizationPercentage).to.equal(40); // 20 occupied / 50 total * 100
      expect(bedsResource.availabilityPercentage).to.equal(60); // 30 available / 50 total * 100

      const icuResource = analytics.currentResources.find(r => r.resourceType === 'icu');
      expect(icuResource.utilizationPercentage).to.equal(25); // 5 occupied / 20 total * 100
      expect(icuResource.availabilityPercentage).to.equal(75); // 15 available / 20 total * 100
    });

    it('should calculate approval rates correctly', () => {
      const analytics = AnalyticsService.getBookingHistoryAnalytics(testHospitalId);
      
      // We have 3 bookings: 1 approved, 1 declined, 1 pending
      expect(analytics.approvalMetrics.totalBookings).to.equal(3);
      expect(analytics.approvalMetrics.approvedBookings).to.equal(1);
      expect(analytics.approvalMetrics.declinedBookings).to.equal(1);
      expect(analytics.approvalMetrics.pendingBookings).to.equal(1);
      expect(analytics.approvalMetrics.approvalRate).to.equal(33); // 1/3 * 100, rounded
      expect(analytics.approvalMetrics.declineRate).to.equal(33); // 1/3 * 100, rounded
    });

    it('should aggregate patient demographics correctly', () => {
      const analytics = AnalyticsService.getBookingHistoryAnalytics(testHospitalId);
      
      const totalPatients = analytics.patientDemographics.reduce((sum, demo) => sum + demo.count, 0);
      expect(totalPatients).to.equal(3); // Total number of bookings

      const malePatients = analytics.patientDemographics
        .filter(demo => demo.patientGender === 'male')
        .reduce((sum, demo) => sum + demo.count, 0);
      expect(malePatients).to.equal(2);

      const femalePatients = analytics.patientDemographics
        .filter(demo => demo.patientGender === 'female')
        .reduce((sum, demo) => sum + demo.count, 0);
      expect(femalePatients).to.equal(1);
    });
  });
});