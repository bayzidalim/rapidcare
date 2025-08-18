const { expect } = require('chai');
const sinon = require('sinon');
const ValidationService = require('../../services/validationService');
const db = require('../../config/database');

describe('ValidationService', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('validateBookingData', () => {
    it('should validate correct booking data', () => {
      const validBookingData = {
        patientName: 'John Doe',
        patientAge: 30,
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required for appendicitis',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 48,
        resourceType: 'beds'
      };

      const result = ValidationService.validateBookingData(validBookingData);

      expect(result.isValid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should reject booking with missing patient name', () => {
      const invalidBookingData = {
        patientName: '', // Empty name
        patientAge: 30,
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 48,
        resourceType: 'beds'
      };

      const result = ValidationService.validateBookingData(invalidBookingData);

      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Patient name is required and must be at least 2 characters');
    });

    it('should reject booking with invalid patient age', () => {
      const invalidBookingData = {
        patientName: 'John Doe',
        patientAge: 200, // Invalid age
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 48,
        resourceType: 'beds'
      };

      const result = ValidationService.validateBookingData(invalidBookingData);

      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Patient age must be between 1 and 150');
    });

    it('should reject booking with invalid gender', () => {
      const invalidBookingData = {
        patientName: 'John Doe',
        patientAge: 30,
        patientGender: 'invalid_gender',
        medicalCondition: 'Emergency surgery required',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 48,
        resourceType: 'beds'
      };

      const result = ValidationService.validateBookingData(invalidBookingData);

      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Patient gender is required and must be male, female, or other');
    });

    it('should reject booking with short medical condition', () => {
      const invalidBookingData = {
        patientName: 'John Doe',
        patientAge: 30,
        patientGender: 'male',
        medicalCondition: 'Cold', // Too short
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 48,
        resourceType: 'beds'
      };

      const result = ValidationService.validateBookingData(invalidBookingData);

      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Medical condition is required and must be at least 5 characters');
    });

    it('should reject booking with invalid urgency level', () => {
      const invalidBookingData = {
        patientName: 'John Doe',
        patientAge: 30,
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'invalid_urgency',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 48,
        resourceType: 'beds'
      };

      const result = ValidationService.validateBookingData(invalidBookingData);

      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Urgency level is required and must be low, medium, high, or critical');
    });

    it('should reject booking with invalid phone number', () => {
      const invalidBookingData = {
        patientName: 'John Doe',
        patientAge: 30,
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: 'invalid_phone',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 48,
        resourceType: 'beds'
      };

      const result = ValidationService.validateBookingData(invalidBookingData);

      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Valid emergency contact phone number is required');
    });

    it('should reject booking with past scheduled date', () => {
      const invalidBookingData = {
        patientName: 'John Doe',
        patientAge: 30,
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Past date
        estimatedDuration: 48,
        resourceType: 'beds'
      };

      const result = ValidationService.validateBookingData(invalidBookingData);

      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Scheduled date cannot be in the past');
    });

    it('should reject booking with date too far in future', () => {
      const invalidBookingData = {
        patientName: 'John Doe',
        patientAge: 30,
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString(), // > 1 year
        estimatedDuration: 48,
        resourceType: 'beds'
      };

      const result = ValidationService.validateBookingData(invalidBookingData);

      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Scheduled date cannot be more than 1 year in the future');
    });

    it('should reject booking with invalid estimated duration', () => {
      const invalidBookingData = {
        patientName: 'John Doe',
        patientAge: 30,
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 1000, // Too long
        resourceType: 'beds'
      };

      const result = ValidationService.validateBookingData(invalidBookingData);

      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Estimated duration must be between 1 and 720 hours (30 days)');
    });

    it('should reject booking with invalid resource type', () => {
      const invalidBookingData = {
        patientName: 'John Doe',
        patientAge: 30,
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 48,
        resourceType: 'invalid_resource'
      };

      const result = ValidationService.validateBookingData(invalidBookingData);

      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Resource type is required and must be beds, icu, or operationTheatres');
    });
  });

  describe('sanitizeBookingData', () => {
    it('should sanitize and format booking data correctly', () => {
      const rawData = {
        patientName: '  John Doe  ',
        patientAge: '30',
        patientGender: 'MALE',
        medicalCondition: '  Emergency surgery required  ',
        urgency: 'HIGH',
        emergencyContactName: '  Jane Doe  ',
        emergencyContactPhone: '  +8801234567890  ',
        emergencyContactRelationship: '  spouse  ',
        scheduledDate: '2024-12-01T10:00:00Z',
        estimatedDuration: '48',
        resourceType: 'BEDS',
        notes: '  Patient requires immediate attention  '
      };

      const result = ValidationService.sanitizeBookingData(rawData);

      expect(result.patientName).to.equal('John Doe');
      expect(result.patientAge).to.equal(30);
      expect(result.patientGender).to.equal('male');
      expect(result.medicalCondition).to.equal('Emergency surgery required');
      expect(result.urgency).to.equal('high');
      expect(result.emergencyContactName).to.equal('Jane Doe');
      expect(result.emergencyContactPhone).to.equal('+8801234567890');
      expect(result.emergencyContactRelationship).to.equal('spouse');
      expect(result.estimatedDuration).to.equal(48);
      expect(result.resourceType).to.equal('beds');
      expect(result.notes).to.equal('Patient requires immediate attention');
    });

    it('should handle missing optional fields', () => {
      const rawData = {
        patientName: 'John Doe',
        patientAge: '30',
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: '2024-12-01T10:00:00Z',
        resourceType: 'beds'
        // Missing estimatedDuration and notes
      };

      const result = ValidationService.sanitizeBookingData(rawData);

      expect(result.estimatedDuration).to.equal(24); // Default value
      expect(result.notes).to.equal(''); // Default empty string
    });
  });

  describe('validateResourceAvailability', () => {
    it('should return valid for available resources', () => {
      const mockResource = {
        available: 5,
        total: 10,
        occupied: 3,
        reserved: 2
      };

      const prepareStub = sandbox.stub(db, 'prepare');
      const getStub = sandbox.stub().returns(mockResource);
      prepareStub.returns({ get: getStub });

      const result = ValidationService.validateResourceAvailability(1, 'beds', '2024-12-01', 24);

      expect(result.isValid).to.be.true;
    });

    it('should return invalid for unavailable resources', () => {
      const mockResource = {
        available: 0,
        total: 10,
        occupied: 8,
        reserved: 2
      };

      const prepareStub = sandbox.stub(db, 'prepare');
      const getStub = sandbox.stub().returns(mockResource);
      prepareStub.returns({ get: getStub });

      const result = ValidationService.validateResourceAvailability(1, 'beds', '2024-12-01', 24);

      expect(result.isValid).to.be.false;
      expect(result.error).to.include('No resources available');
    });

    it('should return invalid for non-existent resource type', () => {
      const prepareStub = sandbox.stub(db, 'prepare');
      const getStub = sandbox.stub().returns(null);
      prepareStub.returns({ get: getStub });

      const result = ValidationService.validateResourceAvailability(1, 'beds', '2024-12-01', 24);

      expect(result.isValid).to.be.false;
      expect(result.error).to.include('Resource type not available');
    });
  });

  describe('validateBookingStatusTransition', () => {
    it('should allow valid status transitions', () => {
      // Pending to approved by hospital authority
      expect(ValidationService.validateBookingStatusTransition('pending', 'approved', 'hospital-authority')).to.be.true;
      
      // Pending to declined by hospital authority
      expect(ValidationService.validateBookingStatusTransition('pending', 'declined', 'hospital-authority')).to.be.true;
      
      // Approved to completed by hospital authority
      expect(ValidationService.validateBookingStatusTransition('approved', 'completed', 'hospital-authority')).to.be.true;
      
      // Pending to cancelled by user
      expect(ValidationService.validateBookingStatusTransition('pending', 'cancelled', 'user')).to.be.true;
    });

    it('should reject invalid status transitions', () => {
      // User trying to approve
      expect(ValidationService.validateBookingStatusTransition('pending', 'approved', 'user')).to.be.false;
      
      // Trying to change declined booking
      expect(ValidationService.validateBookingStatusTransition('declined', 'approved', 'hospital-authority')).to.be.false;
      
      // Trying to change completed booking
      expect(ValidationService.validateBookingStatusTransition('completed', 'cancelled', 'user')).to.be.false;
    });
  });

  describe('validateBookingRateLimit', () => {
    it('should allow booking within rate limit', () => {
      const prepareStub = sandbox.stub(db, 'prepare');
      const getStub = sandbox.stub().returns({ count: 2 }); // Under limit
      prepareStub.returns({ get: getStub });

      const result = ValidationService.validateBookingRateLimit(1, 60, 5);

      expect(result.isValid).to.be.true;
      expect(result.currentCount).to.equal(2);
      expect(result.maxAllowed).to.equal(5);
    });

    it('should reject booking over rate limit', () => {
      const prepareStub = sandbox.stub(db, 'prepare');
      const getStub = sandbox.stub().returns({ count: 6 }); // Over limit
      prepareStub.returns({ get: getStub });

      const result = ValidationService.validateBookingRateLimit(1, 60, 5);

      expect(result.isValid).to.be.false;
      expect(result.currentCount).to.equal(6);
      expect(result.maxAllowed).to.equal(5);
    });
  });

  describe('validateHospitalBookingAccess', () => {
    it('should allow booking at approved active hospital', () => {
      const mockHospital = {
        approval_status: 'approved',
        isActive: true
      };

      const mockUser = { isActive: true };

      const prepareStub = sandbox.stub(db, 'prepare');
      const getStub = sandbox.stub();
      getStub.onFirstCall().returns(mockHospital);
      getStub.onSecondCall().returns(mockUser);
      prepareStub.returns({ get: getStub });

      const result = ValidationService.validateHospitalBookingAccess(1, 1);

      expect(result.isValid).to.be.true;
    });

    it('should reject booking at non-approved hospital', () => {
      const mockHospital = {
        approval_status: 'pending',
        isActive: true
      };

      const prepareStub = sandbox.stub(db, 'prepare');
      const getStub = sandbox.stub().returns(mockHospital);
      prepareStub.returns({ get: getStub });

      const result = ValidationService.validateHospitalBookingAccess(1, 1);

      expect(result.isValid).to.be.false;
      expect(result.error).to.include('Hospital is not approved');
    });

    it('should reject booking at inactive hospital', () => {
      const mockHospital = {
        approval_status: 'approved',
        isActive: false
      };

      const prepareStub = sandbox.stub(db, 'prepare');
      const getStub = sandbox.stub().returns(mockHospital);
      prepareStub.returns({ get: getStub });

      const result = ValidationService.validateHospitalBookingAccess(1, 1);

      expect(result.isValid).to.be.false;
      expect(result.error).to.include('Hospital is currently inactive');
    });

    it('should reject booking for inactive user', () => {
      const mockHospital = {
        approval_status: 'approved',
        isActive: true
      };

      const mockUser = { isActive: false };

      const prepareStub = sandbox.stub(db, 'prepare');
      const getStub = sandbox.stub();
      getStub.onFirstCall().returns(mockHospital);
      getStub.onSecondCall().returns(mockUser);
      prepareStub.returns({ get: getStub });

      const result = ValidationService.validateHospitalBookingAccess(1, 1);

      expect(result.isValid).to.be.false;
      expect(result.error).to.include('User account is inactive');
    });
  });

  describe('validateAndSanitizeBooking', () => {
    it('should validate and sanitize valid booking data', () => {
      const rawData = {
        patientName: '  John Doe  ',
        patientAge: '30',
        patientGender: 'male',
        medicalCondition: '  Emergency surgery required  ',
        urgency: 'high',
        emergencyContactName: '  Jane Doe  ',
        emergencyContactPhone: '  +8801234567890  ',
        emergencyContactRelationship: '  spouse  ',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: '48',
        resourceType: 'beds'
      };

      const result = ValidationService.validateAndSanitizeBooking(rawData);

      expect(result.isValid).to.be.true;
      expect(result.data.patientName).to.equal('John Doe');
      expect(result.data.patientAge).to.equal(30);
    });

    it('should reject and not sanitize invalid booking data', () => {
      const invalidData = {
        patientName: '', // Invalid
        patientAge: '30',
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: '48',
        resourceType: 'beds'
      };

      const result = ValidationService.validateAndSanitizeBooking(invalidData);

      expect(result.isValid).to.be.false;
      expect(result.errors).to.not.be.empty;
      expect(result.data).to.be.undefined;
    });
  });

  describe('sanitizeInput', () => {
    it('should remove script tags', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const result = ValidationService.sanitizeInput(maliciousInput);
      
      expect(result).to.equal('Hello World');
    });

    it('should remove javascript protocol', () => {
      const maliciousInput = 'javascript:alert("xss")';
      const result = ValidationService.sanitizeInput(maliciousInput);
      
      expect(result).to.equal('alert("xss")');
    });

    it('should remove event handlers', () => {
      const maliciousInput = 'onclick="alert(\'xss\')" Hello';
      const result = ValidationService.sanitizeInput(maliciousInput);
      
      expect(result).to.equal('Hello');
    });

    it('should handle non-string input', () => {
      expect(ValidationService.sanitizeInput(123)).to.equal(123);
      expect(ValidationService.sanitizeInput(null)).to.equal(null);
      expect(ValidationService.sanitizeInput(undefined)).to.equal(undefined);
    });
  });
});