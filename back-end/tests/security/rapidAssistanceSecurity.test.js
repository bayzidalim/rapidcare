const { expect } = require('chai');
const sinon = require('sinon');
const request = require('supertest');
const app = require('../../index');
const db = require('../../config/database');
const ValidationService = require('../../services/validationService');
const BookingService = require('../../services/bookingService');
const UserService = require('../../services/userService');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');

describe('Rapid Assistance Security Tests', () => {
  let authToken, testUser;

  before(async () => {
    // Clean up any existing test users
    db.prepare('DELETE FROM users WHERE email LIKE ?').run('test%@rapidassistance.security.test');
    
    // Create a test user for authentication
    const userResult = await UserService.register({
      name: 'Test User Security',
      email: 'testuser@rapidassistance.security.test',
      password: 'password123',
      userType: 'user'
    });
    testUser = User.findById(userResult.userId);
    
    // Generate a valid auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testuser@rapidassistance.security.test',
        password: 'password123'
      });
    authToken = loginResponse.body.token;
  });

  after(() => {
    // Clean up test users
    db.prepare('DELETE FROM users WHERE email LIKE ?').run('test%@rapidassistance.security.test');
  });

  let validationServiceStub, bookingServiceStub;

  beforeEach(() => {
    validationServiceStub = sinon.stub(ValidationService, 'validateRapidAssistanceEligibility');
    bookingServiceStub = sinon.stub(BookingService, 'create');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Prevention of Rapid Assistance Selection Manipulation', () => {
    it('should reject rapid assistance when client sends true but age is under 60', async () => {
      // Mock validation to reject ineligible patient
      validationServiceStub.returns({
        isValid: false,
        errors: ['Rapid Assistance is only available for patients aged 60 and above']
      });

      const maliciousPayload = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'Young Patient',
        patientAge: 25,
        patientGender: 'male',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'brother',
        medicalCondition: 'Test condition',
        urgency: 'medium',
        estimatedDuration: 24,
        rapidAssistance: true // Malicious attempt to enable for ineligible patient
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousPayload);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Rapid Assistance is only available for patients aged 60 and above');
      expect(bookingServiceStub.called).to.be.false; // Should not create booking
    });

    it('should reject rapid assistance when client manipulates age to appear eligible', async () => {
      // Test case where client sends age 60+ but backend validates against stored data
      validationServiceStub.returns({
        isValid: false,
        errors: ['Rapid Assistance is only available for patients aged 60 and above']
      });

      const manipulatedPayload = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'Manipulated Patient',
        patientAge: 65, // Client claims patient is 65
        patientGender: 'female',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'daughter',
        medicalCondition: 'Test condition',
        urgency: 'high',
        estimatedDuration: 24,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(manipulatedPayload);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(validationServiceStub.calledWith(65, true)).to.be.true;
      expect(bookingServiceStub.called).to.be.false;
    });

    it('should prevent rapid assistance charge manipulation in payment requests', async () => {
      const paymentPayload = {
        bookingId: 1,
        transactionId: 'TXN123456',
        amount: 1000, // Client tries to pay base amount only
        rapidAssistance: true // But requests rapid assistance
      };

      // Mock booking model to return ineligible patient
      const bookingModel = require('../../models/Booking');
      // Restore any existing stub and create a new one
      if (bookingModel.findById.restore && bookingModel.findById.isSinonProxy) {
        bookingModel.findById.restore();
      }
      const findByIdStub = sinon.stub(bookingModel, 'findById').returns({
        id: 1,
        userId: testUser.id, // Use actual test user ID
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 25, // Ineligible age
        estimatedDuration: 24,
        paymentStatus: 'pending',
        rapidAssistance: 0
      });

      validationServiceStub.returns({
        isValid: false,
        errors: ['Rapid Assistance is only available for patients aged 60 and above']
      });

      const response = await request(app)
        .post('/api/bookings/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentPayload);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Rapid Assistance is only available for patients aged 60 and above');
      
      // Clean up the stub
      findByIdStub.restore();
    });

    it('should reject requests with tampered rapid assistance flags in headers or body', async () => {
      validationServiceStub.returns({
        isValid: false,
        errors: ['Rapid Assistance is only available for patients aged 60 and above']
      });

      const tamperedPayload = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'Test Patient',
        patientAge: 30,
        patientGender: 'male',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'son',
        medicalCondition: 'Test condition',
        urgency: 'medium',
        estimatedDuration: 24,
        rapidAssistance: 'true', // String instead of boolean (potential manipulation)
        rapidAssistanceCharge: 0 // Client tries to set charge to 0
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Rapid-Assistance', 'true') // Potential header manipulation
        .send(tamperedPayload);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(bookingServiceStub.called).to.be.false;
    });
  });

  describe('Backend Rejection of Invalid Rapid Assistance Requests', () => {
    it('should reject requests with invalid rapid assistance data types', async () => {
      const invalidPayloads = [
        {
          rapidAssistance: 'yes', // String instead of boolean
          patientAge: 65
        },
        {
          rapidAssistance: 1, // Number instead of boolean
          patientAge: 65
        },
        {
          rapidAssistance: [], // Array instead of boolean
          patientAge: 65
        },
        {
          rapidAssistance: {}, // Object instead of boolean
          patientAge: 65
        }
      ];

      for (const invalidData of invalidPayloads) {
        validationServiceStub.returns({
          isValid: false,
          errors: ['Invalid rapid assistance data type']
        });

        const payload = {
          hospitalId: 1,
          resourceType: 'beds',
          patientName: 'Test Patient',
          patientGender: 'male',
          emergencyContactName: 'Emergency Contact',
          emergencyContactPhone: '+8801234567890',
          emergencyContactRelationship: 'son',
          medicalCondition: 'Test condition',
          urgency: 'medium',
          estimatedDuration: 24,
          ...invalidData
        };

        const response = await request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${authToken}`)
          .send(payload);

        expect(response.status).to.equal(400);
        expect(response.body.success).to.be.false;
      }
    });

    it('should reject requests with missing required fields when rapid assistance is requested', async () => {
      validationServiceStub.returns({
        isValid: false,
        errors: ['Patient age is required to determine Rapid Assistance eligibility']
      });

      const incompletePayload = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'Test Patient',
        // patientAge is missing
        patientGender: 'male',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'son',
        medicalCondition: 'Test condition',
        urgency: 'medium',
        estimatedDuration: 24,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompletePayload);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Patient age is required to determine Rapid Assistance eligibility');
    });

    it('should reject requests with SQL injection attempts in rapid assistance fields', async () => {
      validationServiceStub.returns({
        isValid: false,
        errors: ['Invalid input detected']
      });

      const sqlInjectionPayload = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: "'; DROP TABLE bookings; --",
        patientAge: "65; UPDATE bookings SET rapidAssistance = 1; --",
        patientGender: 'male',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'son',
        medicalCondition: 'Test condition',
        urgency: 'medium',
        estimatedDuration: 24,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sqlInjectionPayload);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
    });

    it('should reject requests with XSS attempts in rapid assistance related fields', async () => {
      validationServiceStub.returns({
        isValid: false,
        errors: ['Invalid input detected']
      });

      const xssPayload = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: '<script>alert("xss")</script>',
        patientAge: 65,
        patientGender: 'male',
        emergencyContactName: '<img src=x onerror=alert("xss")>',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'son',
        medicalCondition: 'Test condition',
        urgency: 'medium',
        estimatedDuration: 24,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(xssPayload);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
    });
  });

  describe('Edge Cases Testing', () => {
    it('should handle exactly 60 years old patient (boundary condition)', async () => {
      validationServiceStub.returns({
        isValid: true,
        errors: []
      });

      bookingServiceStub.returns({
        id: 1,
        userId: testUser.id,
        hospitalId: 1,
        patientAge: 60,
        rapidAssistance: 1,
        rapidAssistanceCharge: 200,
        rapidAssistantName: 'Ahmed Hassan',
        rapidAssistantPhone: '+8801712345678'
      });

      const boundaryPayload = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'Boundary Patient',
        patientAge: 60, // Exactly 60 years old
        patientGender: 'female',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'daughter',
        medicalCondition: 'Test condition',
        urgency: 'medium',
        scheduledDate: '2023-12-01T10:00:00Z',
        estimatedDuration: 24,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(boundaryPayload);

      expect(response.status).to.equal(201);
      expect(response.body.success).to.be.true;
      expect(response.body.data.rapidAssistance).to.equal(1);
      expect(validationServiceStub.calledWith(60, true)).to.be.true;
    });

    it('should handle 59.9 years old patient (just under boundary)', async () => {
      validationServiceStub.returns({
        isValid: false,
        errors: ['Rapid Assistance is only available for patients aged 60 and above']
      });

      const justUnderBoundaryPayload = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'Almost Eligible Patient',
        patientAge: 59.9, // Just under 60
        patientGender: 'male',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'son',
        medicalCondition: 'Test condition',
        urgency: 'medium',
        estimatedDuration: 24,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(justUnderBoundaryPayload);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Rapid Assistance is only available for patients aged 60 and above');
    });

    it('should handle missing age field', async () => {
      validationServiceStub.returns({
        isValid: false,
        errors: ['Patient age is required to determine Rapid Assistance eligibility']
      });

      const missingAgePayload = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'No Age Patient',
        // patientAge is completely missing
        patientGender: 'female',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'daughter',
        medicalCondition: 'Test condition',
        urgency: 'high',
        estimatedDuration: 24,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(missingAgePayload);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Patient age is required to determine Rapid Assistance eligibility');
    });

    it('should handle null age field', async () => {
      validationServiceStub.returns({
        isValid: false,
        errors: ['Patient age is required to determine Rapid Assistance eligibility']
      });

      const nullAgePayload = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'Null Age Patient',
        patientAge: null,
        patientGender: 'male',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'son',
        medicalCondition: 'Test condition',
        urgency: 'medium',
        estimatedDuration: 24,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(nullAgePayload);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Patient age is required to determine Rapid Assistance eligibility');
    });

    it('should handle undefined age field', async () => {
      validationServiceStub.returns({
        isValid: false,
        errors: ['Patient age is required to determine Rapid Assistance eligibility']
      });

      const undefinedAgePayload = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'Undefined Age Patient',
        patientAge: undefined,
        patientGender: 'female',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'daughter',
        medicalCondition: 'Test condition',
        urgency: 'low',
        estimatedDuration: 24,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(undefinedAgePayload);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Patient age is required to determine Rapid Assistance eligibility');
    });

    it('should handle invalid age inputs (string, negative, extremely large)', async () => {
      const invalidAgeInputs = [
        'sixty', // String
        -5, // Negative
        999 // Extremely large
      ];

      for (const invalidAge of invalidAgeInputs) {
        validationServiceStub.returns({
          isValid: false,
          errors: ['Invalid patient age detected']
        });

        const invalidAgePayload = {
          hospitalId: 1,
          resourceType: 'beds',
          patientName: 'Invalid Age Patient',
          patientAge: invalidAge,
          patientGender: 'male',
          emergencyContactName: 'Emergency Contact',
          emergencyContactPhone: '+8801234567890',
          emergencyContactRelationship: 'son',
          medicalCondition: 'Test condition',
          urgency: 'medium',
          estimatedDuration: 24,
          rapidAssistance: true
        };

        const response = await request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidAgePayload);

        expect(response.status).to.equal(400);
        expect(response.body.success).to.be.false;
        expect(response.body.error).to.equal('Invalid patient age detected');
      }
    });

    it('should handle very old age (120+ years)', async () => {
      validationServiceStub.returns({
        isValid: true,
        errors: []
      });

      bookingServiceStub.returns({
        id: 1,
        userId: testUser.id,
        hospitalId: 1,
        patientAge: 125,
        rapidAssistance: 1,
        rapidAssistanceCharge: 200,
        rapidAssistantName: 'Ahmed Hassan',
        rapidAssistantPhone: '+8801712345678'
      });

      const veryOldAgePayload = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'Very Old Patient',
        patientAge: 125, // Very old but still valid for rapid assistance
        patientGender: 'female',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'granddaughter',
        medicalCondition: 'Test condition',
        urgency: 'high',
        scheduledDate: '2023-12-01T10:00:00Z',
        estimatedDuration: 24,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(veryOldAgePayload);

      expect(response.status).to.equal(201);
      expect(response.body.success).to.be.true;
      expect(response.body.data.rapidAssistance).to.equal(1);
      expect(validationServiceStub.calledWith(125, true)).to.be.true;
    });

    it('should handle decimal ages near boundary (59.5, 60.1)', async () => {
      const testCases = [
        { age: 59.5, shouldPass: false },
        { age: 59.9, shouldPass: false },
        { age: 60.0, shouldPass: true },
        { age: 60.1, shouldPass: true },
        { age: 60.5, shouldPass: true }
      ];

      for (const testCase of testCases) {
        if (testCase.shouldPass) {
          validationServiceStub.returns({
            isValid: true,
            errors: []
          });

          bookingServiceStub.returns({
            id: 1,
            userId: testUser.id,
            hospitalId: 1,
            patientAge: testCase.age,
            rapidAssistance: 1,
            rapidAssistanceCharge: 200,
            rapidAssistantName: 'Ahmed Hassan',
            rapidAssistantPhone: '+8801712345678'
          });
        } else {
          validationServiceStub.returns({
            isValid: false,
            errors: ['Rapid Assistance is only available for patients aged 60 and above']
          });
        }

        const decimalAgePayload = {
          hospitalId: 1,
          resourceType: 'beds',
          patientName: 'Decimal Age Patient',
          patientAge: testCase.age,
          patientGender: 'male',
          emergencyContactName: 'Emergency Contact',
          emergencyContactPhone: '+8801234567890',
          emergencyContactRelationship: 'son',
          medicalCondition: 'Test condition',
          urgency: 'medium',
          scheduledDate: '2023-12-01T10:00:00Z',
          estimatedDuration: 24,
          rapidAssistance: true
        };

        const response = await request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${authToken}`)
          .send(decimalAgePayload);

        if (testCase.shouldPass) {
          expect(response.status).to.equal(201);
          expect(response.body.success).to.be.true;
          expect(response.body.data.rapidAssistance).to.equal(1);
        } else {
          expect(response.status).to.equal(400);
          expect(response.body.success).to.be.false;
          expect(response.body.error).to.equal('Rapid Assistance is only available for patients aged 60 and above');
        }
      }
    });
  });

  describe('Concurrent Request Security', () => {
    it('should handle multiple simultaneous requests with rapid assistance manipulation attempts', async () => {
      const promises = [];
      
      // Create multiple concurrent requests with different manipulation attempts
      for (let i = 0; i < 5; i++) {
        validationServiceStub.returns({
          isValid: false,
          errors: ['Rapid Assistance is only available for patients aged 60 and above']
        });

        const maliciousPayload = {
          hospitalId: 1,
          resourceType: 'beds',
          patientName: `Malicious Patient ${i}`,
          patientAge: 25 + i, // All under 60
          patientGender: 'male',
          emergencyContactName: 'Emergency Contact',
          emergencyContactPhone: '+8801234567890',
          emergencyContactRelationship: 'son',
          medicalCondition: 'Test condition',
          urgency: 'medium',
          scheduledDate: '2023-12-01T10:00:00Z',
          estimatedDuration: 24,
          rapidAssistance: true // All trying to enable rapid assistance
        };

        const promise = request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${authToken}`)
          .send(maliciousPayload);
        
        promises.push(promise);
      }

      const responses = await Promise.all(promises);

      // All requests should be rejected
      responses.forEach(response => {
        expect(response.status).to.equal(400);
        expect(response.body.success).to.be.false;
        expect(response.body.error).to.equal('Rapid Assistance is only available for patients aged 60 and above');
      });

      // No bookings should have been created
      expect(bookingServiceStub.called).to.be.false;
    });
  });

  describe('Authorization and Authentication Security', () => {
    it('should reject rapid assistance requests without valid authentication', async () => {
      const payload = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'Unauthenticated Patient',
        patientAge: 65,
        patientGender: 'male',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'son',
        medicalCondition: 'Test condition',
        urgency: 'medium',
        scheduledDate: '2023-12-01T10:00:00Z',
        estimatedDuration: 24,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings')
        // No Authorization header
        .send(payload);

      expect(response.status).to.equal(401);
      expect(bookingServiceStub.called).to.be.false;
    });

    it('should reject rapid assistance requests with invalid/expired tokens', async () => {
      const invalidToken = 'invalid.jwt.token';

      const payload = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'Invalid Token Patient',
        patientAge: 65,
        patientGender: 'female',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'daughter',
        medicalCondition: 'Test condition',
        urgency: 'high',
        scheduledDate: '2023-12-01T10:00:00Z',
        estimatedDuration: 24,
        rapidAssistance: true
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send(payload);

      expect(response.status).to.equal(401);
      expect(bookingServiceStub.called).to.be.false;
    });
  });
});