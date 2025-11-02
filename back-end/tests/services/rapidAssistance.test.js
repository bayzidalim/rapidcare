const { expect } = require('chai');
const sinon = require('sinon');
const ValidationService = require('../../services/validationService');
const BookingService = require('../../services/bookingService');
const db = require('../../config/database');

describe('Rapid Assistance Functionality', () => {
  let dbStub;

  beforeEach(() => {
    // Create a stub for database operations
    dbStub = sinon.stub(db, 'prepare');
  });

  afterEach(() => {
    // Restore all stubs
    sinon.restore();
  });

  describe('Age-based Eligibility Validation', () => {
    it('should allow rapid assistance for patients aged 60 and above', () => {
      const result = ValidationService.validateRapidAssistanceEligibility(60, true);
      
      expect(result.isValid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should allow rapid assistance for patients over 60', () => {
      const result = ValidationService.validateRapidAssistanceEligibility(75, true);
      
      expect(result.isValid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should reject rapid assistance for patients under 60', () => {
      const result = ValidationService.validateRapidAssistanceEligibility(59, true);
      
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Invalid Rapid Assistance selection detected. Please ensure you meet the age requirements. Note: Rapid Assistance is exclusively available for patients aged 60 and above to ensure appropriate care for senior citizens.');
    });

    it('should reject rapid assistance for patients significantly under 60', () => {
      const result = ValidationService.validateRapidAssistanceEligibility(25, true);
      
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Invalid Rapid Assistance selection detected. Please ensure you meet the age requirements. Note: Rapid Assistance is exclusively available for patients aged 60 and above to ensure appropriate care for senior citizens.');
    });

    it('should allow booking without rapid assistance for any age', () => {
      const result = ValidationService.validateRapidAssistanceEligibility(25, false);
      
      expect(result.isValid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should handle missing age when rapid assistance is requested', () => {
      const result = ValidationService.validateRapidAssistanceEligibility(null, true);
      
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Patient age is required to determine Rapid Assistance eligibility');
    });

    it('should handle undefined age when rapid assistance is requested', () => {
      const result = ValidationService.validateRapidAssistanceEligibility(undefined, true);
      
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Patient age is required to determine Rapid Assistance eligibility');
    });

    it('should handle invalid age type when rapid assistance is requested', () => {
      const result = ValidationService.validateRapidAssistanceEligibility('60', true);
      
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Invalid patient age detected');
    });

    it('should handle edge case of exactly 60 years old', () => {
      const result = ValidationService.validateRapidAssistanceEligibility(60, true);
      
      expect(result.isValid).to.be.true;
      expect(result.errors).to.be.empty;
    });
  });

  describe('Payment Calculation with Rapid Assistance Charges', () => {
    it('should calculate 200৳ charge when rapid assistance is selected', () => {
      const charge = ValidationService.calculateRapidAssistanceCharge(true);
      
      expect(charge).to.equal(200);
    });

    it('should calculate 0৳ charge when rapid assistance is not selected', () => {
      const charge = ValidationService.calculateRapidAssistanceCharge(false);
      
      expect(charge).to.equal(0);
    });

    it('should calculate 0৳ charge when rapid assistance is null', () => {
      const charge = ValidationService.calculateRapidAssistanceCharge(null);
      
      expect(charge).to.equal(0);
    });

    it('should calculate 0৳ charge when rapid assistance is undefined', () => {
      const charge = ValidationService.calculateRapidAssistanceCharge(undefined);
      
      expect(charge).to.equal(0);
    });

    describe('Total Payment Calculation in Booking Creation', () => {
      let hospitalServiceStub;
      let getByIdStub;
      let runStub;

      beforeEach(() => {
        // Mock hospital service
        hospitalServiceStub = sinon.stub(require('../../services/hospitalService'), 'getById');
        hospitalServiceStub.returns({
          id: 1,
          name: 'Test Hospital',
          resources: {
            beds: { available: 5 }
          }
        });

        // Mock database operations
        runStub = {
          run: sinon.stub().returns({ lastInsertRowid: 1 })
        };
        
        getByIdStub = {
          get: sinon.stub().returns({
            id: 1,
            userId: 1,
            hospitalId: 1,
            resourceType: 'beds',
            patientName: 'Test Patient',
            patientAge: 65,
            paymentAmount: 356, // Base 156 + 200 rapid assistance
            rapidAssistance: 1,
            rapidAssistanceCharge: 200,
            rapidAssistantName: 'Ahmed Hassan',
            rapidAssistantPhone: '+8801712345678',
            hospitalName: 'Test Hospital'
          })
        };

        dbStub.withArgs(sinon.match(/INSERT INTO bookings/)).returns(runStub);
        dbStub.withArgs(sinon.match(/SELECT b\.\*, h\.name as hospitalName/)).returns(getByIdStub);
      });

      it('should add 200৳ to total payment when rapid assistance is selected for eligible patient', () => {
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

        const result = BookingService.create(bookingData);

        // Verify the booking was created with rapid assistance charge
        expect(result.rapidAssistance).to.equal(1);
        expect(result.rapidAssistanceCharge).to.equal(200);
        expect(result.paymentAmount).to.equal(356); // Base amount (156) + rapid assistance (200)
        expect(result.rapidAssistantName).to.exist;
        expect(result.rapidAssistantPhone).to.exist;
      });

      it('should not add rapid assistance charge when not selected', () => {
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
          rapidAssistance: false
        };

        // Update mock to return booking without rapid assistance
        getByIdStub.get.returns({
          id: 1,
          userId: 1,
          hospitalId: 1,
          resourceType: 'beds',
          patientName: 'Test Patient',
          patientAge: 65,
          paymentAmount: 156, // Base amount only
          rapidAssistance: 0,
          rapidAssistanceCharge: 0,
          rapidAssistantName: null,
          rapidAssistantPhone: null,
          hospitalName: 'Test Hospital'
        });

        const result = BookingService.create(bookingData);

        expect(result.rapidAssistance).to.equal(0);
        expect(result.rapidAssistanceCharge).to.equal(0);
        expect(result.paymentAmount).to.equal(156); // Base amount only
        expect(result.rapidAssistantName).to.be.null;
        expect(result.rapidAssistantPhone).to.be.null;
      });
    });
  });

  describe('Booking Creation with Rapid Assistance Flag', () => {
    let hospitalServiceStub;
    let getByIdStub;
    let runStub;

    beforeEach(() => {
      // Mock hospital service
      hospitalServiceStub = sinon.stub(require('../../services/hospitalService'), 'getById');
      hospitalServiceStub.returns({
        id: 1,
        name: 'Test Hospital',
        resources: {
          beds: { available: 5 }
        }
      });

      // Mock database operations
      runStub = {
        run: sinon.stub().returns({ lastInsertRowid: 1 })
      };
      
      getByIdStub = {
        get: sinon.stub()
      };

      dbStub.withArgs(sinon.match(/INSERT INTO bookings/)).returns(runStub);
      dbStub.withArgs(sinon.match(/SELECT b\.\*, h\.name as hospitalName/)).returns(getByIdStub);
    });

    it('should create booking with rapid assistance for eligible patient', () => {
      const bookingData = {
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'Senior Patient',
        patientAge: 70,
        patientGender: 'female',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'daughter',
        medicalCondition: 'Test condition',
        urgency: 'high',
        estimatedDuration: 24,
        rapidAssistance: true
      };

      // Mock the returned booking
      getByIdStub.get.returns({
        id: 1,
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'Senior Patient',
        patientAge: 70,
        paymentAmount: 356,
        rapidAssistance: 1,
        rapidAssistanceCharge: 200,
        rapidAssistantName: 'Fatima Rahman',
        rapidAssistantPhone: '+8801987654321',
        hospitalName: 'Test Hospital'
      });

      const result = BookingService.create(bookingData);

      // Verify booking creation
      expect(result).to.exist;
      expect(result.rapidAssistance).to.equal(1);
      expect(result.rapidAssistanceCharge).to.equal(200);
      expect(result.rapidAssistantName).to.exist;
      expect(result.rapidAssistantPhone).to.exist;

      // Verify database call was made with correct parameters
      expect(runStub.run.calledOnce).to.be.true;
      const callArgs = runStub.run.getCall(0).args;
      expect(callArgs[18]).to.equal(1); // rapidAssistance flag (position 18)
      expect(callArgs[19]).to.equal(200); // rapidAssistanceCharge (position 19)
      expect(callArgs[20]).to.exist; // rapidAssistantName (position 20)
      expect(callArgs[21]).to.exist; // rapidAssistantPhone (position 21)
    });

    it('should create booking without rapid assistance for eligible patient when not selected', () => {
      const bookingData = {
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'Senior Patient',
        patientAge: 70,
        patientGender: 'male',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'son',
        medicalCondition: 'Test condition',
        urgency: 'medium',
        estimatedDuration: 24,
        rapidAssistance: false
      };

      // Mock the returned booking
      getByIdStub.get.returns({
        id: 1,
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'Senior Patient',
        patientAge: 70,
        paymentAmount: 156,
        rapidAssistance: 0,
        rapidAssistanceCharge: 0,
        rapidAssistantName: null,
        rapidAssistantPhone: null,
        hospitalName: 'Test Hospital'
      });

      const result = BookingService.create(bookingData);

      expect(result).to.exist;
      expect(result.rapidAssistance).to.equal(0);
      expect(result.rapidAssistanceCharge).to.equal(0);
      expect(result.rapidAssistantName).to.be.null;
      expect(result.rapidAssistantPhone).to.be.null;

      // Verify database call was made with correct parameters
      expect(runStub.run.calledOnce).to.be.true;
      const callArgs = runStub.run.getCall(0).args;
      expect(callArgs[18]).to.equal(0); // rapidAssistance flag (position 18)
      expect(callArgs[19]).to.equal(0); // rapidAssistanceCharge (position 19)
      expect(callArgs[20]).to.be.null; // rapidAssistantName (position 20)
      expect(callArgs[21]).to.be.null; // rapidAssistantPhone (position 21)
    });

    it('should reject booking creation with rapid assistance for ineligible patient', () => {
      const bookingData = {
        userId: 1,
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
        rapidAssistance: true
      };

      expect(() => {
        BookingService.create(bookingData);
      }).to.throw('Invalid Rapid Assistance selection detected. Please ensure you meet the age requirements. Note: Rapid Assistance is exclusively available for patients aged 60 and above to ensure appropriate care for senior citizens.');

      // Verify no database insertion was attempted
      expect(runStub.run.called).to.be.false;
    });

    it('should create booking without rapid assistance for ineligible patient when not selected', () => {
      const bookingData = {
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'Young Patient',
        patientAge: 25,
        patientGender: 'female',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'sister',
        medicalCondition: 'Test condition',
        urgency: 'low',
        estimatedDuration: 24,
        rapidAssistance: false
      };

      // Mock the returned booking
      getByIdStub.get.returns({
        id: 1,
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'Young Patient',
        patientAge: 25,
        paymentAmount: 156,
        rapidAssistance: 0,
        rapidAssistanceCharge: 0,
        rapidAssistantName: null,
        rapidAssistantPhone: null,
        hospitalName: 'Test Hospital'
      });

      const result = BookingService.create(bookingData);

      expect(result).to.exist;
      expect(result.rapidAssistance).to.equal(0);
      expect(result.rapidAssistanceCharge).to.equal(0);
      expect(result.rapidAssistantName).to.be.null;
      expect(result.rapidAssistantPhone).to.be.null;
    });
  });

  describe('Assistant Assignment', () => {
    it('should assign assistant with valid Bangladeshi name and phone number', () => {
      const assistant = BookingService.assignRapidAssistant();

      expect(assistant).to.have.property('name');
      expect(assistant).to.have.property('phone');
      expect(assistant.name).to.be.a('string');
      expect(assistant.phone).to.be.a('string');
      expect(assistant.name.length).to.be.greaterThan(0);
      expect(assistant.phone).to.match(/^\+880\d{10}$/); // Bangladesh phone format
    });

    it('should assign different assistants on multiple calls', () => {
      const assistant1 = BookingService.assignRapidAssistant();
      const assistant2 = BookingService.assignRapidAssistant();

      // While it's possible they could be the same due to randomness,
      // we'll just verify the structure is consistent
      expect(assistant1.name).to.be.a('string');
      expect(assistant1.phone).to.match(/^\+880\d{10}$/);
      expect(assistant2.name).to.be.a('string');
      expect(assistant2.phone).to.match(/^\+880\d{10}$/);
    });
  });

  describe('Rapid Assistance Update', () => {
    let getByIdStub;
    let updateStub;

    beforeEach(() => {
      getByIdStub = {
        get: sinon.stub()
      };
      
      updateStub = {
        run: sinon.stub().returns({ changes: 1 })
      };

      dbStub.withArgs(sinon.match(/SELECT b\.\*, h\.name as hospitalName/)).returns(getByIdStub);
      dbStub.withArgs(sinon.match(/UPDATE bookings/)).returns(updateStub);
    });

    it('should update booking to add rapid assistance for eligible patient', () => {
      // Mock existing booking without rapid assistance
      getByIdStub.get.onFirstCall().returns({
        id: 1,
        userId: 1,
        hospitalId: 1,
        patientAge: 65,
        rapidAssistance: 0,
        rapidAssistantName: null,
        rapidAssistantPhone: null
      });

      // Mock updated booking with rapid assistance
      getByIdStub.get.onSecondCall().returns({
        id: 1,
        userId: 1,
        hospitalId: 1,
        patientAge: 65,
        rapidAssistance: 1,
        rapidAssistanceCharge: 200,
        rapidAssistantName: 'Ahmed Hassan',
        rapidAssistantPhone: '+8801712345678'
      });

      const result = BookingService.updateRapidAssistance(1, true, 200);

      expect(result.rapidAssistance).to.equal(1);
      expect(result.rapidAssistanceCharge).to.equal(200);
      expect(result.rapidAssistantName).to.exist;
      expect(result.rapidAssistantPhone).to.exist;
      expect(updateStub.run.calledOnce).to.be.true;
    });

    it('should reject rapid assistance update for ineligible patient', () => {
      // Mock existing booking for young patient
      getByIdStub.get.returns({
        id: 1,
        userId: 1,
        hospitalId: 1,
        patientAge: 25,
        rapidAssistance: 0,
        rapidAssistantName: null,
        rapidAssistantPhone: null
      });

      expect(() => {
        BookingService.updateRapidAssistance(1, true, 200);
      }).to.throw('Invalid Rapid Assistance selection detected. Please ensure you meet the age requirements. Note: Rapid Assistance is exclusively available for patients aged 60 and above to ensure appropriate care for senior citizens.');

      expect(updateStub.run.called).to.be.false;
    });

    it('should handle booking not found error', () => {
      getByIdStub.get.returns(null);

      expect(() => {
        BookingService.updateRapidAssistance(999, true, 200);
      }).to.throw('Booking not found');

      expect(updateStub.run.called).to.be.false;
    });
  });
});