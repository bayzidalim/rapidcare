const { expect } = require('chai');
const sinon = require('sinon');
const securityUtils = require('../../utils/securityUtils');
const auditService = require('../../services/auditService');
const fraudDetectionService = require('../../services/fraudDetectionService');
const securePaymentDataService = require('../../services/securePaymentDataService');
const financialAuth = require('../../middleware/financialAuth');

describe('bKash Payment Security Tests', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('SecurityUtils', () => {
    describe('Payment Data Encryption', () => {
      it('should encrypt sensitive payment data', () => {
        const testData = {
          mobile_number: '01712345678',
          pin: '1234',
          amount: 1000
        };

        const encrypted = securityUtils.encryptPaymentData(testData);
        
        expect(encrypted).to.have.property('encrypted');
        expect(encrypted).to.have.property('iv');
        expect(encrypted).to.have.property('tag');
        expect(encrypted.encrypted).to.be.a('string');
        expect(encrypted.iv).to.be.a('string');
        expect(encrypted.tag).to.be.a('string');
      });

      it('should decrypt payment data correctly', () => {
        const testData = {
          mobile_number: '01712345678',
          pin: '1234',
          amount: 1000
        };

        const encrypted = securityUtils.encryptPaymentData(testData);
        const decrypted = securityUtils.decryptPaymentData(encrypted);
        
        expect(decrypted).to.deep.equal(testData);
      });

      it('should fail decryption with tampered data', () => {
        const testData = { mobile_number: '01712345678' };
        const encrypted = securityUtils.encryptPaymentData(testData);
        
        // Tamper with encrypted data
        encrypted.encrypted = encrypted.encrypted.slice(0, -2) + 'XX';
        
        expect(() => {
          securityUtils.decryptPaymentData(encrypted);
        }).to.throw();
      });
    });

    describe('Mobile Number Validation', () => {
      it('should validate correct bKash mobile numbers', () => {
        const validNumbers = [
          '01712345678',
          '01812345678',
          '01912345678',
          '+8801712345678',
          '8801712345678'
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
          '1712345678', // missing 0
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
  });

  describe('Fraud Detection Service', () => {
    describe('Transaction Analysis', () => {
      it('should analyze low-risk transactions correctly', async () => {
        const transactionData = {
          userId: 1,
          amountTaka: 1000,
          mobileNumber: '01712345678',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          sessionId: 'test-session'
        };

        // Mock database calls to return low-risk data
        sandbox.stub(fraudDetectionService, 'getUserAverageAmount').returns(1200);
        sandbox.stub(fraudDetectionService, 'getTransactionCount').returns(1);
        sandbox.stub(fraudDetectionService, 'getFailedTransactionCount').returns(0);
        sandbox.stub(fraudDetectionService, 'isKnownDevice').returns(true);
        sandbox.stub(fraudDetectionService, 'isUnusualLocation').returns(false);

        const result = await fraudDetectionService.analyzeTransaction(transactionData);
        
        expect(result.success).to.be.true;
        expect(result.analysis.riskLevel).to.be.oneOf(['MINIMAL', 'LOW']);
        expect(result.analysis.recommendation.action).to.equal('ALLOW');
      });

      it('should detect high-risk transactions', async () => {
        const transactionData = {
          userId: 1,
          amountTaka: 100000, // Large amount
          mobileNumber: '01712345678',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          sessionId: 'test-session'
        };

        // Mock database calls to return high-risk data
        sandbox.stub(fraudDetectionService, 'getUserAverageAmount').returns(1000);
        sandbox.stub(fraudDetectionService, 'getTransactionCount').returns(10); // High frequency
        sandbox.stub(fraudDetectionService, 'getFailedTransactionCount').returns(5); // Multiple failures
        sandbox.stub(fraudDetectionService, 'isKnownDevice').returns(false); // New device
        sandbox.stub(fraudDetectionService, 'isUnusualLocation').returns(true); // Unusual location

        const result = await fraudDetectionService.analyzeTransaction(transactionData);
        
        expect(result.success).to.be.true;
        expect(result.analysis.riskLevel).to.be.oneOf(['HIGH', 'CRITICAL']);
        expect(result.analysis.fraudFlags).to.include.members(['LARGE_AMOUNT', 'HIGH_FREQUENCY']);
      });

      it('should handle rapid succession transactions', async () => {
        const transactionData = {
          userId: 1,
          amountTaka: 5000,
          mobileNumber: '01712345678',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          sessionId: 'test-session'
        };

        // Mock rapid succession scenario
        sandbox.stub(fraudDetectionService, 'getTransactionCount')
          .onFirstCall().returns(2) // Hourly count
          .onSecondCall().returns(4); // Rapid succession count

        const result = await fraudDetectionService.analyzeTransaction(transactionData);
        
        expect(result.success).to.be.true;
        expect(result.analysis.fraudFlags).to.include('RAPID_SUCCESSION');
      });
    });

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
        const criticalRec = fraudDetectionService.getRecommendation('CRITICAL', ['MULTIPLE_FAILED_ATTEMPTS']);
        expect(criticalRec.action).to.equal('BLOCK');
        expect(criticalRec.requiresManualReview).to.be.true;

        const lowRec = fraudDetectionService.getRecommendation('LOW', []);
        expect(lowRec.action).to.equal('ALLOW');
        expect(lowRec.requiresManualReview).to.be.false;
      });
    });
  });

  describe('Secure Payment Data Service', () => {
    describe('Payment Data Processing', () => {
      it('should process payment data securely', async () => {
        const paymentData = {
          mobile_number: '01712345678',
          pin: '1234',
          amount: 5000,
          transaction_ref: 'TXN123456789'
        };

        // Mock audit service
        sandbox.stub(auditService, 'logEncryptionOperation').resolves({ success: true });
        sandbox.stub(auditService, 'logSecurityEvent').resolves({ success: true });

        const result = await securePaymentDataService.processPaymentData(paymentData, 1);
        
        expect(result.success).to.be.true;
        expect(result.processedData).to.have.property('mobile_number_encrypted');
        expect(result.processedData).to.have.property('pin_encrypted');
        expect(result.processedData).to.not.have.property('mobile_number');
        expect(result.processedData).to.not.have.property('pin');
        expect(result.encryptedFields).to.include.members(['mobile_number', 'pin']);
      });

      it('should validate payment data before processing', async () => {
        const invalidPaymentData = {
          mobile_number: '123', // Invalid format
          pin: 'abc', // Invalid format
          amount: -100 // Invalid amount
        };

        const result = await securePaymentDataService.processPaymentData(invalidPaymentData, 1);
        
        expect(result.success).to.be.false;
        expect(result.error).to.include('validation failed');
      });
    });

    describe('Data Retrieval', () => {
      it('should retrieve and decrypt payment data', async () => {
        const originalData = {
          mobile_number: '01712345678',
          pin: '1234'
        };

        // Mock audit service
        sandbox.stub(auditService, 'logEncryptionOperation').resolves({ success: true });
        sandbox.stub(auditService, 'logSecurityEvent').resolves({ success: true });

        // First process the data
        const processResult = await securePaymentDataService.processPaymentData(originalData, 1);
        expect(processResult.success).to.be.true;

        // Then retrieve it
        const retrieveResult = await securePaymentDataService.retrievePaymentData(
          processResult.processedData, 
          1, 
          ['mobile_number', 'pin']
        );

        expect(retrieveResult.success).to.be.true;
        expect(retrieveResult.data.mobile_number).to.equal(originalData.mobile_number);
        expect(retrieveResult.data.pin).to.equal(originalData.pin);
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

    describe('Compliance Validation', () => {
      it('should validate payment compliance', () => {
        const compliantData = {
          mobile_number_encrypted: { encrypted: 'test', iv: 'test', tag: 'test' },
          security_metadata: {
            encrypted_at: new Date().toISOString(),
            compliance_level: 'PCI_DSS_LEVEL_1'
          }
        };

        const compliance = securePaymentDataService.validateCompliance(compliantData, 'PROCESS');
        
        expect(compliance.isCompliant).to.be.true;
        expect(compliance.complianceLevel).to.equal('FULL');
      });
    });
  });

  describe('Financial Authorization Middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        header: sinon.stub(),
        ip: '192.168.1.1',
        get: sinon.stub().returns('Mozilla/5.0'),
        sessionID: 'test-session',
        path: '/api/payment',
        method: 'POST',
        body: {}
      };
      res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub()
      };
      next = sinon.stub();
    });

    describe('Financial Access Control', () => {
      it('should deny access without token', async () => {
        req.header.returns(null);
        
        // Mock audit service
        sandbox.stub(auditService, 'logSecurityEvent').resolves({ success: true });

        const middleware = financialAuth.requireFinancialAccess();
        await middleware(req, res, next);

        expect(res.status.calledWith(401)).to.be.true;
        expect(next.called).to.be.false;
      });

      it('should allow access with valid token and role', async () => {
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ id: 1, role: 'user' }, process.env.JWT_SECRET || 'test-secret');
        req.header.returns(`Bearer ${token}`);
        
        // Mock audit service
        sandbox.stub(auditService, 'logSecurityEvent').resolves({ success: true });

        const middleware = financialAuth.requireFinancialAccess(['user']);
        await middleware(req, res, next);

        expect(next.called).to.be.true;
        expect(req.user).to.have.property('id', 1);
        expect(req.user).to.have.property('role', 'user');
      });

      it('should deny access with insufficient role', async () => {
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ id: 1, role: 'user' }, process.env.JWT_SECRET || 'test-secret');
        req.header.returns(`Bearer ${token}`);
        
        // Mock audit service
        sandbox.stub(auditService, 'logSecurityEvent').resolves({ success: true });

        const middleware = financialAuth.requireFinancialAccess(['admin']);
        await middleware(req, res, next);

        expect(res.status.calledWith(403)).to.be.true;
        expect(next.called).to.be.false;
      });
    });

    describe('Fraud Detection Middleware', () => {
      it('should allow low-risk transactions', async () => {
        req.user = { id: 1 };
        req.body = { amount: 1000, mobile_number: '01712345678' };

        // Mock fraud detection to return low risk
        sandbox.stub(fraudDetectionService, 'analyzeTransaction').resolves({
          success: true,
          analysis: {
            riskScore: 10,
            riskLevel: 'LOW',
            fraudFlags: [],
            recommendation: { action: 'ALLOW' }
          }
        });

        await financialAuth.fraudDetection(req, res, next);

        expect(next.called).to.be.true;
        expect(req.fraudAnalysis).to.exist;
      });

      it('should block high-risk transactions', async () => {
        req.user = { id: 1 };
        req.body = { amount: 100000, mobile_number: '01712345678' };

        // Mock fraud detection to return high risk
        sandbox.stub(fraudDetectionService, 'analyzeTransaction').resolves({
          success: true,
          analysis: {
            riskScore: 95,
            riskLevel: 'CRITICAL',
            fraudFlags: ['LARGE_AMOUNT', 'SUSPICIOUS_IP'],
            recommendation: { action: 'BLOCK' }
          }
        });

        // Mock audit service
        sandbox.stub(auditService, 'logSecurityEvent').resolves({ success: true });

        await financialAuth.fraudDetection(req, res, next);

        expect(res.status.calledWith(403)).to.be.true;
        expect(next.called).to.be.false;
      });

      it('should require additional verification for medium-risk transactions', async () => {
        req.user = { id: 1 };
        req.body = { amount: 25000, mobile_number: '01712345678' };

        // Mock fraud detection to return medium risk
        sandbox.stub(fraudDetectionService, 'analyzeTransaction').resolves({
          success: true,
          analysis: {
            riskScore: 60,
            riskLevel: 'MEDIUM',
            fraudFlags: ['NEW_DEVICE'],
            recommendation: { action: 'CHALLENGE' }
          }
        });

        await financialAuth.fraudDetection(req, res, next);

        expect(next.called).to.be.true;
        expect(req.requiresAdditionalVerification).to.be.true;
        expect(req.fraudRiskLevel).to.equal('MEDIUM');
      });
    });

    describe('Transaction Limits', () => {
      it('should enforce single transaction limits', async () => {
        req.user = { id: 1 };
        req.body = { amount: 60000 }; // Exceeds default single limit of 50000

        // Mock audit service
        sandbox.stub(auditService, 'logSecurityEvent').resolves({ success: true });

        const middleware = financialAuth.validateTransactionLimits(100000, 50000);
        await middleware(req, res, next);

        expect(res.status.calledWith(400)).to.be.true;
        expect(next.called).to.be.false;
      });

      it('should enforce daily transaction limits', async () => {
        req.user = { id: 1 };
        req.body = { amount: 30000 };

        // Mock daily total to be close to limit
        sandbox.stub(financialAuth, 'getDailyTransactionTotal').resolves(80000);
        sandbox.stub(auditService, 'logSecurityEvent').resolves({ success: true });

        const middleware = financialAuth.validateTransactionLimits(100000, 50000);
        await middleware(req, res, next);

        expect(res.status.calledWith(400)).to.be.true;
        expect(next.called).to.be.false;
      });
    });
  });

  describe('Audit Service Integration', () => {
    it('should log financial operations with proper audit trail', async () => {
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

    it('should verify audit log integrity', () => {
      // This would require actual database setup for full testing
      // For now, we test the hash generation
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
  });

  describe('Integration Tests', () => {
    it('should handle complete secure payment flow', async () => {
      const paymentData = {
        mobile_number: '01712345678',
        pin: '1234',
        amount: 5000,
        transaction_ref: 'TXN123456789'
      };

      // Mock all required services
      sandbox.stub(auditService, 'logEncryptionOperation').resolves({ success: true });
      sandbox.stub(auditService, 'logSecurityEvent').resolves({ success: true });
      sandbox.stub(auditService, 'logFinancialOperation').returns({ success: true, auditId: 1 });

      // 1. Process payment data securely
      const processResult = await securePaymentDataService.processPaymentData(paymentData, 1);
      expect(processResult.success).to.be.true;

      // 2. Analyze for fraud
      sandbox.stub(fraudDetectionService, 'analyzeTransaction').resolves({
        success: true,
        analysis: {
          riskScore: 15,
          riskLevel: 'LOW',
          fraudFlags: [],
          recommendation: { action: 'ALLOW' }
        }
      });

      const fraudResult = await fraudDetectionService.analyzeTransaction({
        userId: 1,
        amountTaka: paymentData.amount,
        mobileNumber: paymentData.mobile_number,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: 'test-session'
      });

      expect(fraudResult.success).to.be.true;
      expect(fraudResult.analysis.recommendation.action).to.equal('ALLOW');

      // 3. Log the operation
      const auditResult = auditService.logFinancialOperation({
        transactionId: paymentData.transaction_ref,
        userId: 1,
        operationType: 'BKASH_PAYMENT',
        amountTaka: paymentData.amount,
        paymentMethod: 'bKash',
        mobileNumber: paymentData.mobile_number,
        status: 'completed',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: 'test-session',
        riskScore: fraudResult.analysis.riskScore,
        fraudFlags: fraudResult.analysis.fraudFlags
      });

      expect(auditResult.success).to.be.true;
    });
  });
});