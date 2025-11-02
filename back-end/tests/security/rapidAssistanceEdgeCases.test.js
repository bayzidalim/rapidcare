const { expect } = require('chai');
const sinon = require('sinon');
const request = require('supertest');
const app = require('../../index');
const db = require('../../config/database');
const ValidationService = require('../../services/validationService');
const BookingService = require('../../services/bookingService');
const UserService = require('../../services/userService');
const User = require('../../models/User');

describe('Rapid Assistance Edge Cases and Boundary Testing', () => {
  let validationServiceStub, bookingServiceStub;
  let authToken, testUser;

  before(async () => {
    // Clean up any existing test users
    db.prepare('DELETE FROM users WHERE email LIKE ?').run('test%@rapidassistance.edge.test');
    
    // Create a test user for authentication
    const userResult = await UserService.register({
      name: 'Test User Edge Cases',
      email: 'testuser@rapidassistance.edge.test',
      password: 'password123',
      userType: 'user'
    });
    testUser = User.findById(userResult.userId);
    
    // Generate a valid auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testuser@rapidassistance.edge.test',
        password: 'password123'
      });
    authToken = loginResponse.body.token;
  });

  after(() => {
    // Clean up test users
    db.prepare('DELETE FROM users WHERE email LIKE ?').run('test%@rapidassistance.edge.test');
  });

  beforeEach(() => {
    validationServiceStub = sinon.stub(ValidationService, 'validateRapidAssistanceEligibility');
    bookingServiceStub = sinon.stub(BookingService, 'create');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Age Boundary Conditions', () => {
    it('should handle exactly 60.0 years old (precise boundary)', () => {
      const result = ValidationService.validateRapidAssistanceEligibility(60.0, true);
      
      expect(result.isValid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should handle 59.999999 years old (just under boundary)', () => {
      const result = ValidationService.validateRapidAssistanceEligibility(59.999999, true);
      
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Rapid Assistance is only available for patients aged 60 and above');
    });

    it('should handle 60.000001 years old (just over boundary)', () => {
      const result = ValidationService.validateRapidAssistanceEligibility(60.000001, true);
      
      expect(result.isValid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should handle floating point precision issues', () => {
      // Test cases that might cause floating point precision issues
      const testCases = [
        { age: 59.9999999999999, expected: false },
        { age: 60.0000000000001, expected: true },
        { age: 59 + 0.9999999999999, expected: false },
        { age: 60 + Number.EPSILON, expected: true },
        { age: 60 - Number.EPSILON, expected: false }
      ];

      testCases.forEach(testCase => {
        const result = ValidationService.validateRapidAssistanceEligibility(testCase.age, true);
        
        if (testCase.expected) {
          expect(result.isValid).to.be.true;
          expect(result.errors).to.be.empty;
        } else {
          expect(result.isValid).to.be.false;
          expect(result.errors).to.include('Invalid Rapid Assistance selection detected. Please ensure you meet the age requirements. Note: Rapid Assistance is exclusively available for patients aged 60 and above to ensure appropriate care for senior citizens.');
        }
      });
    });
  });

  describe('Invalid Age Input Handling', () => {
    it('should handle various string representations of age', () => {
      const invalidStringAges = [
        '60', // String number
        '60.5', // String decimal
        'sixty', // Word
        '60 years', // With units
        '60years', // Without space
        '60.0', // String decimal with zero
        ' 60 ', // With whitespace
        '60.', // Trailing decimal
        '.60', // Leading decimal
        '60e0', // Scientific notation
        '6e1', // Scientific notation
        '+60', // With plus sign
        '060', // With leading zero
        '60.00000', // Many decimals
        'NaN', // Not a number string
        'Infinity', // Infinity string
        '-Infinity', // Negative infinity string
        'undefined', // Undefined string
        'null' // Null string
      ];

      invalidStringAges.forEach(age => {
        const result = ValidationService.validateRapidAssistanceEligibility(age, true);
        
        expect(result.isValid).to.be.false;
        expect(result.errors).to.include('Invalid patient age detected');
      });
    });

    it('should handle special numeric values', () => {
      const specialValues = [
        NaN,
        Infinity,
        -Infinity,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.NaN
      ];

      specialValues.forEach(age => {
        const result = ValidationService.validateRapidAssistanceEligibility(age, true);
        
        expect(result.isValid).to.be.false;
        expect(result.errors).to.include('Invalid patient age detected');
      });
    });

    it('should handle negative ages', () => {
      const negativeAges = [-1, -60, -0.1, -999, Number.MIN_SAFE_INTEGER];

      negativeAges.forEach(age => {
        const result = ValidationService.validateRapidAssistanceEligibility(age, true);
        
        expect(result.isValid).to.be.false;
        expect(result.errors).to.include('Invalid patient age detected');
      });
    });

    it('should handle extremely large ages', () => {
      const largeAges = [
        999,
        1000,
        Number.MAX_SAFE_INTEGER,
        Number.MAX_VALUE,
        1e10,
        1e100
      ];

      largeAges.forEach(age => {
        // Ages over reasonable human lifespan should still be valid if >= 60
        // but might be rejected by business logic
        const result = ValidationService.validateRapidAssistanceEligibility(age, true);
        
        if (age >= 60 && age <= 150) { // Reasonable human age range
          expect(result.isValid).to.be.true;
          expect(result.errors).to.be.empty;
        } else {
          // Extremely large ages should be rejected
          expect(result.isValid).to.be.false;
        }
      });
    });

    it('should handle zero and very small positive ages', () => {
      const smallAges = [0, 0.1, 0.001, Number.MIN_VALUE, Number.EPSILON];

      smallAges.forEach(age => {
        const result = ValidationService.validateRapidAssistanceEligibility(age, true);
        
        expect(result.isValid).to.be.false;
        expect(result.errors).to.include('Invalid Rapid Assistance selection detected. Please ensure you meet the age requirements. Note: Rapid Assistance is exclusively available for patients aged 60 and above to ensure appropriate care for senior citizens.');
      });
    });
  });

  describe('Rapid Assistance Flag Edge Cases', () => {
    it('should handle various truthy values for rapid assistance flag', () => {
      const truthyValues = [
        true,
        1,
        '1',
        'true',
        'TRUE',
        'True',
        'yes',
        'YES',
        'Yes',
        'on',
        'ON',
        'On'
      ];

      truthyValues.forEach(flag => {
        // For eligible age
        const result1 = ValidationService.validateRapidAssistanceEligibility(65, flag);
        expect(result1.isValid).to.be.true;

        // For ineligible age
        const result2 = ValidationService.validateRapidAssistanceEligibility(25, flag);
        expect(result2.isValid).to.be.false;
      });
    });

    it('should handle various falsy values for rapid assistance flag', () => {
      const falsyValues = [
        false,
        0,
        '0',
        'false',
        'FALSE',
        'False',
        'no',
        'NO',
        'No',
        'off',
        'OFF',
        'Off',
        null,
        undefined,
        '',
        NaN
      ];

      falsyValues.forEach(flag => {
        // Should be valid for any age when rapid assistance is not requested
        const result1 = ValidationService.validateRapidAssistanceEligibility(65, flag);
        expect(result1.isValid).to.be.true;

        const result2 = ValidationService.validateRapidAssistanceEligibility(25, flag);
        expect(result2.isValid).to.be.true;
      });
    });

    it('should handle object and array values for rapid assistance flag', () => {
      const objectValues = [
        {},
        { rapidAssistance: true },
        [],
        [true],
        [1],
        new Boolean(true),
        new Boolean(false)
      ];

      objectValues.forEach(flag => {
        const result = ValidationService.validateRapidAssistanceEligibility(65, flag);
        
        // Objects and arrays should be treated as truthy, but validation should handle them appropriately
        // This depends on implementation - they might be rejected as invalid input
        expect(result).to.have.property('isValid');
        expect(result).to.have.property('errors');
      });
    });
  });

  describe('Concurrent Validation Edge Cases', () => {
    it('should handle multiple simultaneous validations with same parameters', () => {
      const promises = [];
      
      // Create multiple simultaneous validation calls
      for (let i = 0; i < 10; i++) {
        promises.push(
          Promise.resolve(ValidationService.validateRapidAssistanceEligibility(65, true))
        );
      }

      return Promise.all(promises).then(results => {
        results.forEach(result => {
          expect(result.isValid).to.be.true;
          expect(result.errors).to.be.empty;
        });
      });
    });

    it('should handle rapid validation calls with different parameters', () => {
      const testCases = [
        { age: 65, rapidAssistance: true, expected: true },
        { age: 25, rapidAssistance: true, expected: false },
        { age: 60, rapidAssistance: true, expected: true },
        { age: 59, rapidAssistance: true, expected: false },
        { age: 25, rapidAssistance: false, expected: true }
      ];

      const promises = testCases.map(testCase => 
        Promise.resolve(ValidationService.validateRapidAssistanceEligibility(testCase.age, testCase.rapidAssistance))
          .then(result => ({ ...testCase, result }))
      );

      return Promise.all(promises).then(results => {
        results.forEach(({ expected, result }) => {
          expect(result.isValid).to.equal(expected);
        });
      });
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle validation with very long patient names', () => {
      const longName = 'A'.repeat(10000); // Very long name
      
      validationServiceStub.returns({
        isValid: true,
        errors: []
      });

      bookingServiceStub.returns({
        id: 1,
        patientName: longName,
        rapidAssistance: 1
      });

      const bookingData = {
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
        patientName: longName,
        patientAge: 65,
        patientGender: 'male',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'son',
        medicalCondition: 'Test condition',
        urgency: 'medium',
        estimatedDuration: 24,
        rapidAssistance: true
      };

      expect(() => {
        BookingService.create(bookingData);
      }).to.not.throw();
    });

    it('should handle validation with unicode and special characters in names', () => {
      const unicodeNames = [
        'আহমেদ হাসান', // Bengali
        'محمد علي', // Arabic
        '张三', // Chinese
        'José María', // Spanish with accents
        'Müller', // German with umlaut
        'Øyvind', // Norwegian with special chars
        '🙂 Happy Patient', // With emoji
        'Patient\nWith\nNewlines', // With newlines
        'Patient\tWith\tTabs', // With tabs
        'Patient"With"Quotes', // With quotes
        "Patient'With'Apostrophes", // With apostrophes
        'Patient<With>Brackets', // With brackets
        'Patient&With&Ampersands' // With ampersands
      ];

      unicodeNames.forEach(name => {
        validationServiceStub.returns({
          isValid: true,
          errors: []
        });

        bookingServiceStub.returns({
          id: 1,
          patientName: name,
          rapidAssistance: 1
        });

        const bookingData = {
          userId: 1,
          hospitalId: 1,
          resourceType: 'beds',
          patientName: name,
          patientAge: 65,
          patientGender: 'male',
          emergencyContactName: 'Emergency Contact',
          emergencyContactPhone: '+8801234567890',
          emergencyContactRelationship: 'son',
          medicalCondition: 'Test condition',
          urgency: 'medium',
          estimatedDuration: 24,
          rapidAssistance: true
        };

        expect(() => {
          BookingService.create(bookingData);
        }).to.not.throw();
      });
    });
  });

  describe('Charge Calculation Edge Cases', () => {
    it('should consistently return 200 for rapid assistance charge', () => {
      // Test multiple calls to ensure consistency
      for (let i = 0; i < 100; i++) {
        const charge = ValidationService.calculateRapidAssistanceCharge(true);
        expect(charge).to.equal(200);
      }
    });

    it('should consistently return 0 when rapid assistance is not selected', () => {
      const falsyValues = [false, null, undefined, 0, '', NaN];
      
      falsyValues.forEach(value => {
        const charge = ValidationService.calculateRapidAssistanceCharge(value);
        expect(charge).to.equal(0);
      });
    });

    it('should handle rapid assistance charge calculation with various input types', () => {
      const testCases = [
        { input: true, expected: 200 },
        { input: false, expected: 0 },
        { input: 1, expected: 200 },
        { input: 0, expected: 0 },
        { input: '1', expected: 200 },
        { input: '0', expected: 0 },
        { input: 'true', expected: 200 },
        { input: 'false', expected: 0 },
        { input: null, expected: 0 },
        { input: undefined, expected: 0 },
        { input: [], expected: 200 }, // Arrays are truthy
        { input: {}, expected: 200 }, // Objects are truthy
        { input: '', expected: 0 },
        { input: 'yes', expected: 200 },
        { input: 'no', expected: 0 }
      ];

      testCases.forEach(testCase => {
        const charge = ValidationService.calculateRapidAssistanceCharge(testCase.input);
        expect(charge).to.equal(testCase.expected);
      });
    });
  });

  describe('Assistant Assignment Edge Cases', () => {
    it('should always return valid assistant data structure', () => {
      for (let i = 0; i < 50; i++) {
        const assistant = BookingService.assignRapidAssistant();
        
        expect(assistant).to.be.an('object');
        expect(assistant).to.have.property('name');
        expect(assistant).to.have.property('phone');
        expect(assistant.name).to.be.a('string');
        expect(assistant.phone).to.be.a('string');
        expect(assistant.name.length).to.be.greaterThan(0);
        expect(assistant.phone).to.match(/^\+880\d{10}$/);
      }
    });

    it('should handle assistant assignment under memory pressure', () => {
      // Simulate memory pressure by creating many assignments
      const assignments = [];
      
      for (let i = 0; i < 1000; i++) {
        const assistant = BookingService.assignRapidAssistant();
        assignments.push(assistant);
        
        // Verify each assignment is valid
        expect(assistant.name).to.be.a('string');
        expect(assistant.phone).to.match(/^\+880\d{10}$/);
      }
      
      // Verify we got different assignments (randomization working)
      const uniqueNames = new Set(assignments.map(a => a.name));
      const uniquePhones = new Set(assignments.map(a => a.phone));
      
      expect(uniqueNames.size).to.be.greaterThan(1);
      expect(uniquePhones.size).to.be.greaterThan(1);
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle validation service errors gracefully', () => {
      // Test when validation service throws an error
      validationServiceStub.throws(new Error('Validation service error'));

      expect(() => {
        ValidationService.validateRapidAssistanceEligibility(65, true);
      }).to.throw('Validation service error');
    });

    it('should handle booking service errors gracefully', () => {
      validationServiceStub.returns({
        isValid: true,
        errors: []
      });

      bookingServiceStub.throws(new Error('Database connection error'));

      const bookingData = {
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'Test Patient',
        patientAge: 65,
        patientGender: 'male',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'son',
        medicalCondition: 'Test condition',
        urgency: 'medium',
        estimatedDuration: 24,
        rapidAssistance: true
      };

      expect(() => {
        BookingService.create(bookingData);
      }).to.throw('Database connection error');
    });
  });
});