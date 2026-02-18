const AuditLog = require('../models/AuditLog');
const auditService = require('./auditService');
const mongoose = require('mongoose');

class FraudDetectionService {
  constructor() {
    this.riskThresholds = {
      LOW: 25,
      MEDIUM: 50,
      HIGH: 75,
      CRITICAL: 90
    };

    this.fraudRules = {
      // Amount-based rules
      LARGE_AMOUNT: { threshold: 50000, weight: 20 },
      UNUSUAL_AMOUNT: { weight: 15 },
      
      // Frequency-based rules
      HIGH_FREQUENCY: { threshold: 5, timeWindow: 3600, weight: 25 },
      RAPID_SUCCESSION: { threshold: 3, timeWindow: 300, weight: 30 },
      
      // Pattern-based rules
      MULTIPLE_FAILED_ATTEMPTS: { threshold: 3, timeWindow: 1800, weight: 35 },
      UNUSUAL_TIME: { weight: 10 },
      NEW_DEVICE: { weight: 15 },
      
      // Geographic rules
      UNUSUAL_LOCATION: { weight: 20 },
      VPN_USAGE: { weight: 25 }
    };
  }

  /**
   * Analyze transaction for fraud risk
   */
  async analyzeTransaction(transactionData) {
    try {
      const {
        userId,
        amountTaka,
        mobileNumber,
        ipAddress,
        userAgent,
        sessionId,
        transactionTime = new Date()
      } = transactionData;

      let riskScore = 0;
      const fraudFlags = [];
      const analysisDetails = [];

      // Run all fraud detection rules
      const amountRisk = await this.checkAmountRisk(amountTaka, userId);
      riskScore += amountRisk.score;
      if (amountRisk.flags.length > 0) {
        fraudFlags.push(...amountRisk.flags);
        analysisDetails.push(amountRisk.details);
      }

      const frequencyRisk = await this.checkFrequencyRisk(userId, transactionTime);
      riskScore += frequencyRisk.score;
      if (frequencyRisk.flags.length > 0) {
        fraudFlags.push(...frequencyRisk.flags);
        analysisDetails.push(frequencyRisk.details);
      }

      const patternRisk = await this.checkPatternRisk(userId, ipAddress, userAgent);
      riskScore += patternRisk.score;
      if (patternRisk.flags.length > 0) {
        fraudFlags.push(...patternRisk.flags);
        analysisDetails.push(patternRisk.details);
      }

      const deviceRisk = await this.checkDeviceRisk(userId, userAgent, ipAddress);
      riskScore += deviceRisk.score;
      if (deviceRisk.flags.length > 0) {
        fraudFlags.push(...deviceRisk.flags);
        analysisDetails.push(deviceRisk.details);
      }

      const timeRisk = this.checkTimeRisk(transactionTime);
      riskScore += timeRisk.score;
      if (timeRisk.flags.length > 0) {
        fraudFlags.push(...timeRisk.flags);
        analysisDetails.push(timeRisk.details);
      }

      // Determine risk level
      const riskLevel = this.determineRiskLevel(riskScore);
      const recommendation = this.getRecommendation(riskLevel, fraudFlags);

      const result = {
        riskScore: Math.min(riskScore, 100),
        riskLevel,
        fraudFlags,
        recommendation,
        analysisDetails,
        timestamp: new Date().toISOString()
      };

      // Log the fraud analysis (AuditService handles Mongoose save)
      await auditService.logSecurityEvent({
        eventType: 'FRAUD_ANALYSIS',
        userId,
        ipAddress,
        userAgent,
        sessionId,
        eventData: {
          riskScore: result.riskScore,
          riskLevel: result.riskLevel,
          fraudFlags: result.fraudFlags,
          amountTaka
        },
        severity: riskLevel === 'CRITICAL' ? 'CRITICAL' : riskLevel === 'HIGH' ? 'HIGH' : 'INFO'
      });

      return { success: true, analysis: result };
    } catch (error) {
      console.error('Fraud analysis failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check amount-based fraud risks
   */
  async checkAmountRisk(amountTaka, userId) {
    let score = 0;
    const flags = [];
    const details = [];

    // Large amount check
    if (amountTaka > this.fraudRules.LARGE_AMOUNT.threshold) {
      score += this.fraudRules.LARGE_AMOUNT.weight;
      flags.push('LARGE_AMOUNT');
      details.push(`Large transaction amount: ${amountTaka} BDT`);
    }

    // Unusual amount pattern
    const userAverage = await this.getUserAverageAmount(userId);
    if (userAverage && amountTaka > userAverage * 5) {
      score += this.fraudRules.UNUSUAL_AMOUNT.weight;
      flags.push('UNUSUAL_AMOUNT');
      details.push(`Amount significantly higher than user average: ${amountTaka} vs ${userAverage} BDT`);
    }

    return { score, flags, details };
  }

  /**
   * Check frequency-based fraud risks
   */
  async checkFrequencyRisk(userId, transactionTime) {
    let score = 0;
    const flags = [];
    const details = [];

    try {
      const now = new Date(transactionTime);
      const oneHourAgo = new Date(now.getTime() - this.fraudRules.HIGH_FREQUENCY.timeWindow * 1000);
      const fiveMinutesAgo = new Date(now.getTime() - this.fraudRules.RAPID_SUCCESSION.timeWindow * 1000);

      // High frequency check
      const hourlyCount = await this.getTransactionCount(userId, oneHourAgo, now);
      if (hourlyCount >= this.fraudRules.HIGH_FREQUENCY.threshold) {
        score += this.fraudRules.HIGH_FREQUENCY.weight;
        flags.push('HIGH_FREQUENCY');
        details.push(`High transaction frequency: ${hourlyCount} transactions in last hour`);
      }

      // Rapid succession check
      const rapidCount = await this.getTransactionCount(userId, fiveMinutesAgo, now);
      if (rapidCount >= this.fraudRules.RAPID_SUCCESSION.threshold) {
        score += this.fraudRules.RAPID_SUCCESSION.weight;
        flags.push('RAPID_SUCCESSION');
        details.push(`Rapid transaction succession: ${rapidCount} transactions in last 5 minutes`);
      }

    } catch (error) {
      console.error('Frequency risk check failed:', error);
    }

    return { score, flags, details };
  }

  /**
   * Check pattern-based fraud risks
   */
  async checkPatternRisk(userId, ipAddress, userAgent) {
    let score = 0;
    const flags = [];
    const details = [];

    try {
      const thirtyMinutesAgo = new Date(Date.now() - this.fraudRules.MULTIPLE_FAILED_ATTEMPTS.timeWindow * 1000);

      // Multiple failed attempts check
      const failedCount = await this.getFailedTransactionCount(userId, thirtyMinutesAgo);
      if (failedCount >= this.fraudRules.MULTIPLE_FAILED_ATTEMPTS.threshold) {
        score += this.fraudRules.MULTIPLE_FAILED_ATTEMPTS.weight;
        flags.push('MULTIPLE_FAILED_ATTEMPTS');
        details.push(`Multiple failed attempts: ${failedCount} failed transactions in last 30 minutes`);
      }

      // Check for suspicious IP patterns
      if (this.isSuspiciousIP(ipAddress)) {
        score += this.fraudRules.VPN_USAGE.weight;
        flags.push('SUSPICIOUS_IP');
        details.push(`Suspicious IP address detected: ${ipAddress}`);
      }

    } catch (error) {
      console.error('Pattern risk check failed:', error);
    }

    return { score, flags, details };
  }

  /**
   * Check device-based fraud risks
   */
  async checkDeviceRisk(userId, userAgent, ipAddress) {
    let score = 0;
    const flags = [];
    const details = [];

    try {
      // New device check
      const isNewDevice = !(await this.isKnownDevice(userId, userAgent));
      if (isNewDevice) {
        score += this.fraudRules.NEW_DEVICE.weight;
        flags.push('NEW_DEVICE');
        details.push('Transaction from new/unknown device');
      }

      // Unusual location check
      const isUnusualLocation = await this.isUnusualLocation(userId, ipAddress);
      if (isUnusualLocation) {
        score += this.fraudRules.UNUSUAL_LOCATION.weight;
        flags.push('UNUSUAL_LOCATION');
        details.push('Transaction from unusual geographic location');
      }

    } catch (error) {
      console.error('Device risk check failed:', error);
    }

    return { score, flags, details };
  }

  /**
   * Check time-based fraud risks
   */
  checkTimeRisk(transactionTime) {
    let score = 0;
    const flags = [];
    const details = [];

    const hour = new Date(transactionTime).getHours();
    
    // Unusual time check (late night/early morning transactions)
    if (hour >= 2 && hour <= 5) {
      score += this.fraudRules.UNUSUAL_TIME.weight;
      flags.push('UNUSUAL_TIME');
      details.push(`Transaction at unusual time: ${hour}:00`);
    }

    return { score, flags, details };
  }

  /**
   * Get user's average transaction amount
   */
  async getUserAverageAmount(userId) {
    try {
      const result = await AuditLog.aggregate([
        { 
          $match: { 
            entityType: 'financial',
            userId: new mongoose.Types.ObjectId(userId),
            'metadata.status': 'completed',
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        { 
          $group: { 
            _id: null, 
            average: { $avg: '$metadata.amountTaka' } 
          }
        }
      ]);
      
      return result.length > 0 ? result[0].average : null;
    } catch (error) {
      console.error('Failed to get user average amount:', error);
      return null;
    }
  }

  /**
   * Get transaction count for a user within a time window
   */
  async getTransactionCount(userId, startTime, endTime) {
    try {
      return await AuditLog.countDocuments({
        entityType: 'financial',
        userId: userId,
        createdAt: { $gte: startTime, $lte: endTime }
      });
    } catch (error) {
      console.error('Failed to get transaction count:', error);
      return 0;
    }
  }

  /**
   * Get failed transaction count for a user within a time window
   */
  async getFailedTransactionCount(userId, startTime) {
    try {
      return await AuditLog.countDocuments({
        entityType: 'financial',
        userId: userId,
        'metadata.status': 'failed',
        createdAt: { $gte: startTime }
      });
    } catch (error) {
      console.error('Failed to get failed transaction count:', error);
      return 0;
    }
  }

  /**
   * Check if IP address is suspicious
   */
  isSuspiciousIP(ipAddress) {
    const suspiciousPatterns = [
      /^10\./, // Private network
      /^192\.168\./, // Private network
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private network
      /^127\./, // Loopback
      /^0\.0\.0\.0$/, // Invalid
      /^255\.255\.255\.255$/ // Broadcast
    ];

    return suspiciousPatterns.some(pattern => pattern.test(ipAddress));
  }

  /**
   * Check if device is known for the user
   */
  async isKnownDevice(userId, userAgent) {
    try {
      const count = await AuditLog.countDocuments({
        entityType: 'financial',
        userId: userId,
        'metadata.userAgent': userAgent,
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      });
      
      return count > 0;
    } catch (error) {
      console.error('Failed to check known device:', error);
      return true; // Default to known to avoid false positive blocks
    }
  }

  /**
   * Check if location is unusual for the user
   */
  async isUnusualLocation(userId, ipAddress) {
    try {
      const result = await AuditLog.aggregate([
        {
          $match: {
            entityType: 'financial',
            userId: new mongoose.Types.ObjectId(userId),
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: null,
            uniqueIps: { $addToSet: '$metadata.ipAddress' }
          }
        }
      ]);
      
      // If user has used many different IPs recently (e.g. > 10), current one might be normal but if uniqueIPs count is low and this is new...
      // The old SQL was `COUNT(DISTINCT ip_address) > 10`. Logic: if user roams a lot, "unusual location" check is less reliable or maybe MORE reliable if suddenly new IP?
      // Actually the comment said: "If user has used many different IPs recently, this might be unusual".
      // Wait, if user uses many IPs, it's HARDER to determine unusual location.
      // But maybe the check meant: if user usually uses 1 IP, and suddenly uses another...
      // The SQL was checking specifically for > 10 unique IPs.
      // Let's stick to the SQL logic: if unique IPs > 10 in last 30 days, return true (unusual behavior).
      
      const uniqueCount = result.length > 0 ? result[0].uniqueIps.length : 0;
      return uniqueCount > 10;
    } catch (error) {
      console.error('Failed to check unusual location:', error);
      return false;
    }
  }

  /**
   * Determine risk level based on score
   */
  determineRiskLevel(riskScore) {
    if (riskScore >= this.riskThresholds.CRITICAL) return 'CRITICAL';
    if (riskScore >= this.riskThresholds.HIGH) return 'HIGH';
    if (riskScore >= this.riskThresholds.MEDIUM) return 'MEDIUM';
    if (riskScore >= this.riskThresholds.LOW) return 'LOW';
    return 'MINIMAL';
  }

  /**
   * Get recommendation based on risk level and flags
   */
  getRecommendation(riskLevel, fraudFlags) {
    const recommendations = {
      CRITICAL: {
        action: 'BLOCK',
        message: 'Transaction blocked due to critical fraud risk',
        requiresManualReview: true
      },
      HIGH: {
        action: 'CHALLENGE',
        message: 'Additional verification required',
        requiresManualReview: true
      },
      MEDIUM: {
        action: 'MONITOR',
        message: 'Transaction flagged for monitoring',
        requiresManualReview: false
      },
      LOW: {
        action: 'ALLOW',
        message: 'Transaction allowed with low risk monitoring',
        requiresManualReview: false
      },
      MINIMAL: {
        action: 'ALLOW',
        message: 'Transaction approved',
        requiresManualReview: false
      }
    };

    const baseRecommendation = { ...recommendations[riskLevel] };

    // Adjust recommendation based on specific fraud flags
    if (fraudFlags.includes('MULTIPLE_FAILED_ATTEMPTS')) {
      baseRecommendation.action = 'BLOCK';
      baseRecommendation.requiresManualReview = true;
    } else if (fraudFlags.includes('SUSPICIOUS_IP')) {
      baseRecommendation.action = 'CHALLENGE';
      baseRecommendation.requiresManualReview = true;
    }

    return baseRecommendation;
  }

  /**
   * Update fraud rules configuration
   */
  updateFraudRules(newRules) {
    try {
      this.fraudRules = { ...this.fraudRules, ...newRules };
      
      // Log the configuration change
      auditService.logSecurityEvent({
        eventType: 'FRAUD_RULES_UPDATE',
        userId: null,
        ipAddress: null,
        userAgent: null,
        sessionId: null,
        eventData: { updatedRules: Object.keys(newRules) },
        severity: 'INFO'
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to update fraud rules:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get fraud statistics
   */
  async getFraudStatistics(timeRange = '30 days') {
    // Parse timeRange e.g. "30 days"
    const days = parseInt(timeRange) || 30;
    
    try {
       const stats = await AuditLog.aggregate([
         { 
           $match: { 
             entityType: 'financial', // Assuming reports use financial logs or FRAUD_ANALYSIS events?
             // Actually fraud score is logged in FRAUD_ANALYSIS events in security logs usually?
             // Or financial logs have riskScore.
             // PaymentProcessingService logs riskScore in Transaction (stored in DB) and logFinancialOperation (AuditLog).
             // Let's use AuditLog with entityType='financial' and sort by riskScore in metadata.
             createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
           }
         },
         {
           $group: {
             _id: null,
             total_transactions: { $sum: 1 },
             high_risk_transactions: { 
               $sum: { $cond: [{ $gte: ["$metadata.riskScore", this.riskThresholds.HIGH] }, 1, 0] }
             },
             medium_risk_transactions: {
               $sum: { $cond: [{ $gte: ["$metadata.riskScore", this.riskThresholds.MEDIUM] }, 1, 0] }
             },
             average_risk_score: { $avg: "$metadata.riskScore" },
             max_risk_score: { $max: "$metadata.riskScore" }
           }
         }
       ]);
       
       return { success: true, statistics: stats[0] || {} };
    } catch (error) {
      console.error('Failed to get fraud statistics:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new FraudDetectionService();