const { expect } = require('chai');
const sinon = require('sinon');
const bookingController = require('../../controllers/bookingController');
const BookingService = require('../../services/bookingService');
const ValidationService = require('../../services/validationService');
const User = require('../../models/User');
const HospitalPricing = require('../../models/HospitalPricing');

describe('Payment Processing - Rapid Assistance', () => {
  let req, res;
  let bookingServiceStub, validationServiceStub, userStub, hospitalPricingStub;

  beforeEach(() => {
    req = {
      user: { id: 1 },
      body: {}
    };
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };

    // Stub services
    bookingServiceStub = {
      getById: sinon.stub(),
      updateRapidAssistance: sinon.stub(),
      updatePaymentStatus: sinon.stub()
    };
    sinon.stub(BookingService, 'getById').callsFake(bookingServiceStub.getById);
    sinon.stub(BookingService, 'updateRapidAssistance').callsFake(bookingServiceStub.updateRapidAssistance);
    sinon.stub(BookingService, 'updatePaymentStatus').callsFake(bookingServiceStub.updatePaymentStatus);

    validationServiceStub = {
      validateRapidAssistanceEligibility: sinon.stub(),
      calculateRapidAssistanceCharge: sinon.stub()
    };
    sinon.stub(ValidationService, 'validateRapidAssistanceEligibility').callsFake(validationServiceStub.validateRapidAssistanceEligibility);
    sinon.stub(ValidationService, 'calculateRapidAssistanceCharge').callsFake(validationServiceStub.calculateRapidAssistanceCharge);

    userStub = {
      hasSufficientBalance: sinon.stub(),
      getBalance: sinon.stub(),
      processPayment: sinon.stub()
    };
    sinon.stub(User, 'hasSufficientBalance').callsFake(userStub.hasSufficientBalance);
    sinon.stub(User, 'getBalance').callsFake(userStub.getBalance);
    sinon.stub(User, 'processPayment').callsFake(userStub.processPayment);

    hospitalPricingStub = {
      calculateBookingCost: sinon.stub()
    };
    sinon.stub(HospitalPricing, 'calculateBookingCost').callsFake(hospitalPricingStub.calculateBookingCost);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('processBookingPayment with Rapid Assistance', () => {
    it('should process payment with rapid assistance charge for eligible patient', async () => {
      req.body = {
        bookingId: 1,
        transactionId: 'TXN123456',
        amount: 1200,
        rapidAssistance: true
      };

      // Mock existing booking
      const mockBooking = {
        id: 1,
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 65,
        estimatedDuration: 24,
        paymentStatus: 'pending',
        rapidAssistance: 0 // Not previously selected
      };
      bookingServiceStub.getById.returns(mockBooking);

      // Mock hospital pricing
      hospitalPricingStub.calculateBookingCost.returns({
        total_cost: 1000,
        base_price: 800,
        service_charge_percentage: 25,
        service_charge_amount: 200,
        hospital_share: 800,
        duration_days: 1
      });

      // Mock rapid assistance validation
      validationServiceStub.validateRapidAssistanceEligibility.returns({
        isValid: true,
        errors: []
      });
      validationServiceStub.calculateRapidAssistanceCharge.returns(200);

      // Mock user balance
      userStub.hasSufficientBalance.returns(true);
      userStub.processPayment.returns({
        previousBalance: 2000,
        newBalance: 800
      });

      // Mock updated booking after payment
      const updatedBooking = {
        ...mockBooking,
        paymentStatus: 'paid',
        rapidAssistance: 1,
        rapidAssistanceCharge: 200,
        rapidAssistantName: 'Ahmed Hassan',
        rapidAssistantPhone: '+8801712345678'
      };
      bookingServiceStub.getById.onSecondCall().returns(updatedBooking);

      await bookingController.processBookingPayment(req, res);

      expect(validationServiceStub.validateRapidAssistanceEligibility.calledWith(65, true)).to.be.true;
      expect(validationServiceStub.calculateRapidAssistanceCharge.calledWith(true)).to.be.true;
      expect(userStub.hasSufficientBalance.calledWith(1, 1200)).to.be.true;
      expect(userStub.processPayment.calledOnce).to.be.true;
      expect(bookingServiceStub.updateRapidAssistance.calledWith(1, true, 200)).to.be.true;
      expect(bookingServiceStub.updatePaymentStatus.calledWith(1, 'paid', 'balance', 'TXN123456')).to.be.true;

      expect(res.json.calledOnce).to.be.true;
      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.true;
      expect(responseData.data.payment.amount).to.equal(1200);
      expect(responseData.data.payment.cost_breakdown.rapid_assistance_charge).to.equal(200);
      expect(responseData.data.payment.rapid_assistance.requested).to.be.true;
      expect(responseData.data.payment.rapid_assistance.charge).to.equal(200);
    });

    it('should reject payment with rapid assistance for ineligible patient', async () => {
      req.body = {
        bookingId: 1,
        transactionId: 'TXN123456',
        amount: 1200,
        rapidAssistance: true
      };

      // Mock existing booking for young patient
      const mockBooking = {
        id: 1,
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 25, // Ineligible age
        estimatedDuration: 24,
        paymentStatus: 'pending',
        rapidAssistance: 0
      };
      bookingServiceStub.getById.returns(mockBooking);

      // Mock hospital pricing
      hospitalPricingStub.calculateBookingCost.returns({
        total_cost: 1000,
        base_price: 800,
        service_charge_percentage: 25,
        service_charge_amount: 200,
        hospital_share: 800,
        duration_days: 1
      });

      // Mock rapid assistance validation failure
      validationServiceStub.validateRapidAssistanceEligibility.returns({
        isValid: false,
        errors: ['Rapid Assistance is only available for patients aged 60 and above']
      });

      await bookingController.processBookingPayment(req, res);

      expect(validationServiceStub.validateRapidAssistanceEligibility.calledWith(25, true)).to.be.true;
      expect(userStub.processPayment.called).to.be.false;
      expect(bookingServiceStub.updateRapidAssistance.called).to.be.false;
      expect(bookingServiceStub.updatePaymentStatus.called).to.be.false;

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.error).to.equal('Rapid Assistance is only available for patients aged 60 and above');
    });

    it('should process payment without rapid assistance charge when not requested', async () => {
      req.body = {
        bookingId: 1,
        transactionId: 'TXN123456',
        amount: 1000
        // rapidAssistance not specified
      };

      // Mock existing booking without rapid assistance
      const mockBooking = {
        id: 1,
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 65,
        estimatedDuration: 24,
        paymentStatus: 'pending',
        rapidAssistance: 0
      };
      bookingServiceStub.getById.returns(mockBooking);

      // Mock hospital pricing
      hospitalPricingStub.calculateBookingCost.returns({
        total_cost: 1000,
        base_price: 800,
        service_charge_percentage: 25,
        service_charge_amount: 200,
        hospital_share: 800,
        duration_days: 1
      });

      // Mock user balance
      userStub.hasSufficientBalance.returns(true);
      userStub.processPayment.returns({
        previousBalance: 2000,
        newBalance: 1000
      });

      // Mock updated booking after payment
      const updatedBooking = {
        ...mockBooking,
        paymentStatus: 'paid'
      };
      bookingServiceStub.getById.onSecondCall().returns(updatedBooking);

      await bookingController.processBookingPayment(req, res);

      // Since rapidAssistance is not requested and booking.rapidAssistance is 0, 
      // the validation should not be called
      expect(validationServiceStub.validateRapidAssistanceEligibility.called).to.be.false;
      expect(userStub.hasSufficientBalance.calledWith(1, 1000)).to.be.true;
      expect(userStub.processPayment.calledOnce).to.be.true;
      expect(bookingServiceStub.updatePaymentStatus.calledWith(1, 'paid', 'balance', 'TXN123456')).to.be.true;

      expect(res.json.calledOnce).to.be.true;
      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.true;
      expect(responseData.data.payment.amount).to.equal(1000);
      expect(responseData.data.payment.cost_breakdown.rapid_assistance_charge).to.equal(0);
      expect(responseData.data.payment.rapid_assistance.requested).to.equal(0);
      expect(responseData.data.payment.rapid_assistance.charge).to.equal(0);
    });

    it('should handle payment amount mismatch with rapid assistance', async () => {
      req.body = {
        bookingId: 1,
        transactionId: 'TXN123456',
        amount: 1000, // Incorrect amount (should be 1200 with rapid assistance)
        rapidAssistance: true
      };

      // Mock existing booking
      const mockBooking = {
        id: 1,
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 65,
        estimatedDuration: 24,
        paymentStatus: 'pending',
        rapidAssistance: 0
      };
      bookingServiceStub.getById.returns(mockBooking);

      // Mock hospital pricing
      hospitalPricingStub.calculateBookingCost.returns({
        total_cost: 1000,
        base_price: 800,
        service_charge_percentage: 25,
        service_charge_amount: 200,
        hospital_share: 800,
        duration_days: 1
      });

      // Mock rapid assistance validation
      validationServiceStub.validateRapidAssistanceEligibility.returns({
        isValid: true,
        errors: []
      });
      validationServiceStub.calculateRapidAssistanceCharge.returns(200);

      await bookingController.processBookingPayment(req, res);

      expect(userStub.processPayment.called).to.be.false;
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.error).to.include('Payment amount mismatch');
    });

    it('should handle insufficient balance for payment with rapid assistance', async () => {
      req.body = {
        bookingId: 1,
        transactionId: 'TXN123456',
        amount: 1200,
        rapidAssistance: true
      };

      // Mock existing booking
      const mockBooking = {
        id: 1,
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
        patientAge: 65,
        estimatedDuration: 24,
        paymentStatus: 'pending',
        rapidAssistance: 0
      };
      bookingServiceStub.getById.returns(mockBooking);

      // Mock hospital pricing
      hospitalPricingStub.calculateBookingCost.returns({
        total_cost: 1000,
        base_price: 800,
        service_charge_percentage: 25,
        service_charge_amount: 200,
        hospital_share: 800,
        duration_days: 1
      });

      // Mock rapid assistance validation
      validationServiceStub.validateRapidAssistanceEligibility.returns({
        isValid: true,
        errors: []
      });
      validationServiceStub.calculateRapidAssistanceCharge.returns(200);

      // Mock insufficient balance
      userStub.hasSufficientBalance.returns(false);
      userStub.getBalance.returns(500);

      await bookingController.processBookingPayment(req, res);

      expect(userStub.hasSufficientBalance.calledWith(1, 1200)).to.be.true;
      expect(userStub.processPayment.called).to.be.false;
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const responseData = res.json.getCall(0).args[0];
      expect(responseData.success).to.be.false;
      expect(responseData.error).to.include('Insufficient balance');
      expect(responseData.data.required_amount).to.equal(1200);
      expect(responseData.data.current_balance).to.equal(500);
      expect(responseData.data.shortfall).to.equal(700);
    });
  });
});