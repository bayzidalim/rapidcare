const { expect } = require('chai');
const securityUtils = require('../../utils/securityUtils');
const auditService = require('../../services/auditService');
const fraudDetectionService = require('../../services/fraudDetectionService');
const securePaymentDataService = require('../../services/securePaymentDataService');

describe('bKash Payment Security - Simple Tests', () => {
  describe('SecurityUtils', () => {
    describe('Mobile Number Validation', () => {
      it('should validate correct bKash mobile numbers', () => {
        const validNumbers = [
          '01712345678',
          '01812345678',
          '01912345678'
        ];

        validNumbers.forEach(number => {
          expect(securityUtils.validateBkashMobileNumber(number)).to.be.true;
        });
      });

      it('should reject invalid mobile numbers', () => {
        const invalidNumbers = [
          '0171234567', // too short
          '017123456789', // too long
          '01012345678', // invalid prefix
          'abc1712345678', // contains letters
          ''
        ];

        invalidNumbers.forEach(number => {
          expect(securityUtils.validateBkashMobileNumber(number)).to.be.false;
        });
      });
    });

    describe('PIN Validation', () => {
      it('should validate correct PIN formats', () => {
        const validPINs = ['1234', '12345', '123456'];
        
        validPINs.forEach(pin => {
          expect(securityUtils.validatePINFormat(pin)).to.be.true;
        });
      });

      it('should reject invalid PIN formats', () => {
        const invalidPINs = ['123', '1234567', 'abcd', '12a4', ''];
        
        invalidPINs.forEach(pin => {
          expect(securityUtils.validatePINFormat(pin)).to.be.false;
        });
      });
    });

    describe('Data Masking', () => {
      it('should mask mobile numbers correctly', () => {
        expect(securityUtils.maskMobileNumber('01712345678')).to.equal('017*****678');
        expect(securityUtils.maskMobileNumber('123')).to.equal('****');
      });

      it('should mask PINs correctly', () => {
        expect(securityUtils.maskPIN('1234')).to.equal('****');
        expect(securityUtils.maskPIN('123456')).to.equal('******');
        expect(securityUtils.maskPIN('')).to.equal('****');
      });
    });

    describe('Secure Transaction Reference Generation', () => {
      it('should generate unique transaction references', () => {
        const ref1 = securityUtils.generateSecureTransactionRef();
        const ref2 = securityUtils.generateSecureTransactionRef();
        
        expect(ref1).to.be.a('string');
        expect(ref2).to.be.a('string');
        expect(ref1).to.not.equal(ref2);
        expect(ref1).to.match(/^BKS\d+[A-F0-9]+$/);
      });
    });

    describe('Audit Hash Generation', () => {
      it('should generate consistent hashes for same data', () => {
        const testData = {
          transaction_id: 'TXN123',
          user_id: 1,
          amount_taka: 1000
        };

        const hash1 = securityUtils.generateAuditHash(testData);
        const hash2 = securityUtils.generateAuditHash(testData);
        
        expect(hash1).to.equal(hash2);
        expect(hash1).to.be.a('string');
        expect(hash1.length).to.equal(64); // SHA-256 hex length
      });

      it('should generate different hashes for different data', () => {
        const testData1 = { transaction_id: 'TXN123', amount: 1000 };
        const testData2 = { transaction_id: 'TXN124', amount: 1000 };

        const hash1 = securityUtils.generateAuditHash(testData1);
        const hash2 = securityUtils.generateAuditHash(testData2);
        
        expect(hash1).to.not.equal(hash2);
      });
    });
  });

  describe('Fraud Detection Service', () => {
    describe('Risk Level Determination', () => {
      it('should determine correct risk levels', () => {
        expect(fraudDetectionService.determineRiskLevel(10)).to.equal('MINIMAL');
        expect(fraudDetectionService.determineRiskLevel(30)).to.equal('LOW');
        expect(fraudDetectionService.determineRiskLevel(60)).to.equal('MEDIUM');
        expect(fraudDetectionService.determineRiskLevel(80)).to.equal('HIGH');
        expect(fraudDetectionService.determineRiskLevel(95)).to.equal('CRITICAL');
      });
    });

    describe('Recommendations', () => {
      it('should provide correct recommendations for different risk levels', () => {
        const criticalRec = fraudDetectionService.getRecommendation('CRITICAL', []);
        expect(criticalRec.action).to.equal('BLOCK');
        expect(criticalRec.requiresManualReview).to.be.true;

        const lowRec = fraudDetectionService.getRecommendation('LOW', []);
        expect(lowRec.action).to.equal('ALLOW');
        expect(lowRec.requiresManualReview).to.be.false;

        // Test with fraud flags
        const flaggedRec = fraudDetectionService.getRecommendation('MEDIUM', ['MULTIPLE_FAILED_ATTEMPTS']);
        expect(flaggedRec.action).to.equal('BLOCK');
        expect(flaggedRec.requiresManualReview).to.be.true;
      });
    });

    describe('IP Address Validation', () => {
      it('should detect suspicious IP addresses', () => {
        const suspiciousIPs = [
          '10.0.0.1',
          '192.168.1.1',
          '172.16.0.1',
          '127.0.0.1'
        ];

        suspiciousIPs.forEach(ip => {
          expect(fraudDetectionService.isSuspiciousIP(ip)).to.be.true;
        });
      });

      it('should allow valid public IP addresses', () => {
        const validIPs = [
          '8.8.8.8',
          '1.1.1.1',
          '203.112.2.4'
        ];

        validIPs.forEach(ip => {
          expect(fraudDetectionService.isSuspiciousIP(ip)).to.be.false;
        });
      });
    });
  });

  describe('Secure Payment Data Service', () => {
    describe('Data Validation', () => {
      it('should validate correct payment data', () => {
        const validPaymentData = {
          mobile_number: '01712345678',
          pin: '1234',
          amount: 5000,
          transaction_ref: 'TXN123456789'
        };

        const validation = securePaymentDataService.validatePaymentData(validPaymentData);
        expect(validation.isValid).to.be.true;
        expect(validation.errors).to.be.empty;
      });

      it('should reject invalid payment data', () => {
        const invalidPaymentData = {
          mobile_number: '123', // Invalid format
          pin: 'abc', // Invalid format
          amount: -100 // Invalid amount
        };

        const validation = securePaymentDataService.validatePaymentData(invalidPaymentData);
        expect(validation.isValid).to.be.false;
        expect(validation.errors.length).to.be.greaterThan(0);
      });
    });

    describe('Data Sanitization', () => {
      it('should sanitize payment data for logging', () => {
        const paymentData = {
          mobile_number: '01712345678',
          pin: '1234',
          otp: '567890',
          account_number: '1234567890',
          amount: 5000
        };

        const sanitized = securePaymentDataService.sanitizeForLogging(paymentData);
        
        expect(sanitized.mobile_number).to.equal('017*****678');
        expect(sanitized.pin).to.equal('****');
        expect(sanitized.otp).to.equal('****');
        expect(sanitized.account_number).to.equal('****7890');
        expect(sanitized.amount).to.equal(5000); // Non-sensitive data unchanged
      });
    });

    describe('Secure Reference Generation', () => {
      it('should generate secure payment references', () => {
        const ref1 = securePaymentDataService.generateSecurePaymentReference('BKASH');
        const ref2 = securePaymentDataService.generateSecurePaymentReference('BKASH');
        
        expect(ref1).to.be.a('string');
        expect(ref2).to.be.a('string');
        expect(ref1).to.not.equal(ref2);
      });
    });
  });

  describe('Audit Service', () => {
    describe('Audit Log Creation', () => {
      it('should create financial operation audit logs', () => {
        const operationData = {
          transactionId: 'TXN123456789',
          userId: 1,
          operationType: 'BKASH_PAYMENT',
          amountTaka: 5000,
          paymentMethod: 'bKash',
          mobileNumber: '01712345678',
          status: 'completed',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          sessionId: 'test-session'
        };

        const result = auditService.logFinancialOperation(operationData);
        
        expect(result.success).to.be.true;
        expect(result.auditId).to.be.a('number');
      });
    });

    describe('Security Event Logging', () => {
      it('should log security events', () => {
        const eventData = {
          eventType: 'FRAUD_ANALYSIS',
          userId: 1,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          sessionId: 'test-session',
          eventData: { riskScore: 25, fraudFlags: [] },
          severity: 'INFO'
        };

        const result = auditService.logSecurityEvent(eventData);
        
        expect(result.success).to.be.true;
        expect(result.auditId).to.be.a('number');
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle basic security workflow', async () => {
      // 1. Validate mobile number
      const mobileNumber = '01712345678';
      expect(securityUtils.validateBkashMobileNumber(mobileNumber)).to.be.true;

      // 2. Generate secure transaction reference
      const transactionRef = securityUtils.generateSecureTransactionRef();
      expect(transactionRef).to.be.a('string');

      // 3. Mask sensitive data
      const maskedNumber = securityUtils.maskMobileNumber(mobileNumber);
      expect(maskedNumber).to.equal('017*****678');

      // 4. Determine risk level
      const riskLevel = fraudDetectionService.determineRiskLevel(25);
      expect(riskLevel).to.equal('LOW');

      // 5. Get recommendation
      const recommendation = fraudDetectionService.getRecommendation(riskLevel, []);
      expect(recommendation.action).to.equal('ALLOW');
    });

    it('should handle high-risk scenario', () => {
      // High risk score
      const riskLevel = fraudDetectionService.determineRiskLevel(95);
      expect(riskLevel).to.equal('CRITICAL');

      // Should recommend blocking for critical risk
      const recommendation = fraudDetectionService.getRecommendation(riskLevel, []);
      expect(recommendation.action).to.equal('BLOCK');
      expect(recommendation.requiresManualReview).to.be.true;
    });
  });
});