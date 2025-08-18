const { expect } = require('chai');
const sinon = require('sinon');
const Booking = require('../../models/Booking');
const db = require('../../config/database');

describe('Booking Model', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('create', () => {
    it('should create a booking with valid data', () => {
      const bookingData = {
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
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
        notes: 'Patient requires immediate attention'
      };

      const mockResult = {
        lastInsertRowid: 1,
        changes: 1
      };

      const mockBookingReference = 'BK-20241201-ABC123';
      
      // Mock database operations
      const prepareStub = sandbox.stub(db, 'prepare');
      const runStub = sandbox.stub().returns(mockResult);
      const getStub = sandbox.stub().returns({ bookingReference: mockBookingReference });
      
      prepareStub.onFirstCall().returns({ run: runStub });
      prepareStub.onSecondCall().returns({ run: sandbox.stub() });
      prepareStub.onThirdCall().returns({ get: getStub });

      const result = Booking.create(bookingData);

      expect(result).to.have.property('id', 1);
      expect(result).to.have.property('bookingReference');
      expect(prepareStub.calledThrice).to.be.true;
    });

    it('should throw error for invalid resource type', () => {
      const bookingData = {
        userId: 1,
        hospitalId: 1,
        resourceType: 'invalid_type',
        patientName: 'John Doe',
        patientAge: 30,
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 48
      };

      expect(() => Booking.create(bookingData)).to.throw();
    });

    it('should generate unique booking reference', () => {
      const mockResult = { lastInsertRowid: 1, changes: 1 };
      
      const prepareStub = sandbox.stub(db, 'prepare');
      const runStub = sandbox.stub().returns(mockResult);
      const getStub = sandbox.stub().returns({ bookingReference: 'BK-20241201-ABC123' });
      
      prepareStub.onFirstCall().returns({ run: runStub });
      prepareStub.onSecondCall().returns({ run: sandbox.stub() });
      prepareStub.onThirdCall().returns({ get: getStub });

      const bookingData = {
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'John Doe',
        patientAge: 30,
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 48
      };

      const result = Booking.create(bookingData);
      expect(result.bookingReference).to.match(/^BK-\d{8}-[A-Z0-9]{6}$/);
    });
  });

  describe('findById', () => {
    it('should return booking with hospital and user details', () => {
      const mockBooking = {
        id: 1,
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'John Doe',
        status: 'pending',
        hospitalName: 'Test Hospital',
        userName: 'Test User'
      };

      const prepareStub = sandbox.stub(db, 'prepare');
      const getStub = sandbox.stub().returns(mockBooking);
      prepareStub.returns({ get: getStub });

      const result = Booking.findById(1);

      expect(result).to.deep.equal(mockBooking);
      expect(getStub.calledWith(1)).to.be.true;
    });

    it('should return null for non-existent booking', () => {
      const prepareStub = sandbox.stub(db, 'prepare');
      const getStub = sandbox.stub().returns(undefined);
      prepareStub.returns({ get: getStub });

      const result = Booking.findById(999);

      expect(result).to.be.undefined;
    });
  });

  describe('updateStatus', () => {
    it('should update booking status and create history entry', () => {
      const mockBooking = {
        id: 1,
        status: 'pending'
      };

      const prepareStub = sandbox.stub(db, 'prepare');
      const getStub = sandbox.stub().returns(mockBooking);
      const runStub = sandbox.stub().returns({ changes: 1 });
      
      prepareStub.onFirstCall().returns({ get: getStub });
      prepareStub.onSecondCall().returns({ run: runStub });
      prepareStub.onThirdCall().returns({ run: runStub });

      const result = Booking.updateStatus(1, 'approved', 1, 'Approved by hospital', 'All requirements met');

      expect(result).to.be.true;
      expect(prepareStub.calledThrice).to.be.true;
    });

    it('should return false for non-existent booking', () => {
      const prepareStub = sandbox.stub(db, 'prepare');
      const getStub = sandbox.stub().returns(undefined);
      prepareStub.returns({ get: getStub });

      const result = Booking.updateStatus(999, 'approved');

      expect(result).to.be.false;
    });
  });

  describe('approve', () => {
    it('should approve booking and update timestamps', () => {
      const prepareStub = sandbox.stub(db, 'prepare');
      const runStub = sandbox.stub().returns({ changes: 1 });
      prepareStub.returns({ run: runStub });

      const result = Booking.approve(1, 2, 'Approved for admission');

      expect(result).to.be.true;
      expect(runStub.calledOnce).to.be.true;
    });
  });

  describe('decline', () => {
    it('should decline booking with reason', () => {
      const prepareStub = sandbox.stub(db, 'prepare');
      const runStub = sandbox.stub().returns({ changes: 1 });
      prepareStub.returns({ run: runStub });

      const result = Booking.decline(1, 2, 'Insufficient resources', 'No beds available');

      expect(result).to.be.true;
      expect(runStub.calledOnce).to.be.true;
    });
  });

  describe('cancel', () => {
    it('should cancel booking', () => {
      const prepareStub = sandbox.stub(db, 'prepare');
      const runStub = sandbox.stub().returns({ changes: 1 });
      prepareStub.returns({ run: runStub });

      const result = Booking.cancel(1, 1, 'Patient cancelled', 'Change of plans');

      expect(result).to.be.true;
      expect(runStub.calledOnce).to.be.true;
    });
  });

  describe('complete', () => {
    it('should complete booking', () => {
      const prepareStub = sandbox.stub(db, 'prepare');
      const runStub = sandbox.stub().returns({ changes: 1 });
      prepareStub.returns({ run: runStub });

      const result = Booking.complete(1, 2, 'Treatment completed successfully');

      expect(result).to.be.true;
      expect(runStub.calledOnce).to.be.true;
    });
  });

  describe('findByReference', () => {
    it('should find booking by reference number', () => {
      const mockBooking = {
        id: 1,
        bookingReference: 'BK-20241201-ABC123',
        patientName: 'John Doe'
      };

      const prepareStub = sandbox.stub(db, 'prepare');
      const getStub = sandbox.stub().returns(mockBooking);
      prepareStub.returns({ get: getStub });

      const result = Booking.findByReference('BK-20241201-ABC123');

      expect(result).to.deep.equal(mockBooking);
      expect(getStub.calledWith('BK-20241201-ABC123')).to.be.true;
    });
  });

  describe('getPendingByHospital', () => {
    it('should return pending bookings for hospital with urgency sorting', () => {
      const mockBookings = [
        { id: 1, urgency: 'critical', patientName: 'John Doe' },
        { id: 2, urgency: 'high', patientName: 'Jane Smith' }
      ];

      const prepareStub = sandbox.stub(db, 'prepare');
      const allStub = sandbox.stub().returns(mockBookings);
      prepareStub.returns({ all: allStub });

      const result = Booking.getPendingByHospital(1, { sortBy: 'urgency' });

      expect(result).to.deep.equal(mockBookings);
      expect(allStub.calledWith(1)).to.be.true;
    });

    it('should filter by resource type when specified', () => {
      const mockBookings = [
        { id: 1, resourceType: 'icu', patientName: 'John Doe' }
      ];

      const prepareStub = sandbox.stub(db, 'prepare');
      const allStub = sandbox.stub().returns(mockBookings);
      prepareStub.returns({ all: allStub });

      const result = Booking.getPendingByHospital(1, { resourceType: 'icu' });

      expect(result).to.deep.equal(mockBookings);
    });
  });

  describe('getStatistics', () => {
    it('should return booking statistics for hospital', () => {
      const mockStats = {
        totalBookings: 10,
        pendingBookings: 3,
        approvedBookings: 5,
        completedBookings: 2,
        avgApprovalTime: 2.5
      };

      const prepareStub = sandbox.stub(db, 'prepare');
      const getStub = sandbox.stub().returns(mockStats);
      prepareStub.returns({ get: getStub });

      const result = Booking.getStatistics(1);

      expect(result).to.deep.equal(mockStats);
    });
  });

  describe('validation', () => {
    it('should validate required fields', () => {
      expect(() => Booking.create({})).to.throw();
    });

    it('should validate patient age range', () => {
      const invalidData = {
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'John Doe',
        patientAge: 200, // Invalid age
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 48
      };

      expect(() => Booking.create(invalidData)).to.throw();
    });

    it('should validate urgency levels', () => {
      const invalidData = {
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'John Doe',
        patientAge: 30,
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'invalid_urgency', // Invalid urgency
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 48
      };

      expect(() => Booking.create(invalidData)).to.throw();
    });
  });
});