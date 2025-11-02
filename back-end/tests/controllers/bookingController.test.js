const { expect } = require('chai');
const sinon = require('sinon');
const bookingController = require('../../controllers/bookingController');
const BookingService = require('../../services/bookingService');
const ValidationService = require('../../services/validationService');

describe('Booking Controller - Rapid Assistance', () => {
  let req, res, next;
  let bookingServiceStub, validationServiceStub;

  beforeEach(() => {
    req = {
      user: { id: 1 },
      body: {},
      params: {}
    };
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };
    next = sinon.stub();

    // Stub services
    bookingServiceStub = sinon.stub(BookingService, 'create');
    validationServiceStub = sinon.stub(ValidationService, 'validateRapidAssistanceEligibility');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('createBooking with Rapid Assistance', () => {
    it('should create booking with rapid assistance for eligible patient', async () => {
      req.body = {
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
        rapidAssistance: true
      };

      // Mock validation success
      validationServiceStub.returns({
        isValid: true,
        errors: []
      });

      // Mock booking creation success
      const mockBooking = {
        id: 1,
        userId: 1,
        hospitalId: 1,
        patientAge: 70,
        rapidAssistance: 1,
        rapidAssistanceCharge: 200,
        rapidAssistantName: 'Ahmed Hassan',
        rapidAssistantPhone: '+8801712345678'
      };
      bookingServiceStub.returns(mockBooking);

      await bookingController.createBooking(req, res);

      expect(validationServiceStub.calledOnce).to.be.true;
      expect(validationServiceStub.calledWith(70, true)).to.be.true;
      expect(bookingServiceStub.calledOnce).to.be.true;
      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.true;
      expect(responseData.data.rapidAssistance).to.equal(1);
      expect(responseData.data.rapidAssistanceCharge).to.equal(200);
    });

    it('should reject booking with rapid assistance for ineligible patient', async () => {
      req.body = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'Young Patient',
        patientAge: 25,
        patientGender: 'female',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'sister',
        medicalCondition: 'Test condition',
        urgency: 'high',
        estimatedDuration: 24,
        rapidAssistance: true
      };

      // Mock validation failure
      validationServiceStub.returns({
        isValid: false,
        errors: ['Rapid Assistance is only available for patients aged 60 and above']
      });

      await bookingController.createBooking(req, res);

      expect(validationServiceStub.calledOnce).to.be.true;
      expect(validationServiceStub.calledWith(25, true)).to.be.true;
      expect(bookingServiceStub.called).to.be.false; // Should not create booking
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.error).to.equal('Rapid Assistance is only available for patients aged 60 and above');
    });

    it('should create booking without rapid assistance for any age', async () => {
      req.body = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'Any Patient',
        patientAge: 30,
        patientGender: 'male',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'friend',
        medicalCondition: 'Test condition',
        urgency: 'low',
        estimatedDuration: 24,
        rapidAssistance: false
      };

      // Mock validation success (should pass for any age when rapidAssistance is false)
      validationServiceStub.returns({
        isValid: true,
        errors: []
      });

      // Mock booking creation success
      const mockBooking = {
        id: 1,
        userId: 1,
        hospitalId: 1,
        patientAge: 30,
        rapidAssistance: 0,
        rapidAssistanceCharge: 0,
        rapidAssistantName: null,
        rapidAssistantPhone: null
      };
      bookingServiceStub.returns(mockBooking);

      await bookingController.createBooking(req, res);

      expect(validationServiceStub.calledOnce).to.be.true;
      expect(validationServiceStub.calledWith(30, false)).to.be.true;
      expect(bookingServiceStub.calledOnce).to.be.true;
      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.true;
      expect(responseData.data.rapidAssistance).to.equal(0);
      expect(responseData.data.rapidAssistanceCharge).to.equal(0);
    });

    it('should handle missing patient age when rapid assistance is requested', async () => {
      req.body = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'Patient',
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

      // Mock validation failure for missing age
      validationServiceStub.returns({
        isValid: false,
        errors: ['Patient age is required to determine Rapid Assistance eligibility']
      });

      await bookingController.createBooking(req, res);

      expect(validationServiceStub.calledOnce).to.be.true;
      expect(bookingServiceStub.called).to.be.false;
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.error).to.equal('Patient age is required to determine Rapid Assistance eligibility');
    });

    it('should handle booking service errors gracefully', async () => {
      req.body = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'Senior Patient',
        patientAge: 65,
        patientGender: 'female',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'daughter',
        medicalCondition: 'Test condition',
        urgency: 'high',
        estimatedDuration: 24,
        rapidAssistance: true
      };

      // Mock validation success
      validationServiceStub.returns({
        isValid: true,
        errors: []
      });

      // Mock booking service error
      bookingServiceStub.throws(new Error('Hospital not found or not approved'));

      await bookingController.createBooking(req, res);

      expect(validationServiceStub.calledOnce).to.be.true;
      expect(bookingServiceStub.calledOnce).to.be.true;
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;

      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.error).to.equal('Hospital not found or not approved');
    });
  });
});