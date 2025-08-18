const { expect } = require('chai');
const sinon = require('sinon');
const BookingService = require('../../services/bookingService');
const Booking = require('../../models/Booking');
const Hospital = require('../../models/Hospital');
const User = require('../../models/User');
const BookingNotification = require('../../models/BookingNotification');
const BookingStatusHistory = require('../../models/BookingStatusHistory');
const db = require('../../config/database');

describe('BookingService', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('create', () => {
    it('should create booking with valid data and notifications', () => {
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

      const mockBooking = { id: 1, ...bookingData, bookingReference: 'BK-20241201-ABC123' };
      const mockAvailability = { available: true, message: 'Resources available' };
      const mockHospital = { id: 1, isActive: true, approval_status: 'approved' };
      const mockUser = { id: 1, isActive: true };

      // Mock database transaction
      const transactionStub = sandbox.stub(db, 'transaction').callsFake((fn) => fn());
      
      // Mock availability check
      sandbox.stub(Hospital, 'checkResourceAvailability').returns(mockAvailability);
      sandbox.stub(Hospital, 'findById').returns(mockHospital);
      sandbox.stub(User, 'findById').returns(mockUser);
      
      // Mock duplicate check
      const prepareStub = sandbox.stub(db, 'prepare');
      const getStub = sandbox.stub().returns(null); // No duplicate
      prepareStub.returns({ get: getStub });

      // Mock booking creation
      sandbox.stub(Booking, 'create').returns({ id: 1, bookingReference: 'BK-20241201-ABC123' });
      sandbox.stub(Booking, 'findById').returns(mockBooking);
      
      // Mock status history creation
      sandbox.stub(BookingStatusHistory, 'create').returns(true);
      
      // Mock notification creation
      sandbox.stub(BookingService, 'createBookingNotifications').returns(true);

      const result = BookingService.create(bookingData);

      expect(result).to.have.property('id', 1);
      expect(result).to.have.property('bookingReference');
      expect(transactionStub.calledOnce).to.be.true;
    });

    it('should throw error when resources are not available', () => {
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

      const mockAvailability = { available: false, message: 'No beds available' };
      const mockHospital = { id: 1, isActive: true, approval_status: 'approved' };
      const mockUser = { id: 1, isActive: true };

      // Mock database transaction
      sandbox.stub(db, 'transaction').callsFake((fn) => fn());
      
      sandbox.stub(Hospital, 'checkResourceAvailability').returns(mockAvailability);
      sandbox.stub(Hospital, 'findById').returns(mockHospital);
      sandbox.stub(User, 'findById').returns(mockUser);
      
      const prepareStub = sandbox.stub(db, 'prepare');
      const getStub = sandbox.stub().returns(null);
      prepareStub.returns({ get: getStub });

      expect(() => BookingService.create(bookingData)).to.throw('Insufficient beds available');
    });

    it('should throw error for duplicate booking', () => {
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

      const mockAvailability = { available: true, message: 'Resources available' };
      const mockHospital = { id: 1, isActive: true, approval_status: 'approved' };
      const mockUser = { id: 1, isActive: true };

      sandbox.stub(db, 'transaction').callsFake((fn) => fn());
      sandbox.stub(Hospital, 'checkResourceAvailability').returns(mockAvailability);
      sandbox.stub(Hospital, 'findById').returns(mockHospital);
      sandbox.stub(User, 'findById').returns(mockUser);
      
      // Mock duplicate found
      const prepareStub = sandbox.stub(db, 'prepare');
      const getStub = sandbox.stub().returns({ id: 2 }); // Duplicate exists
      prepareStub.returns({ get: getStub });

      expect(() => BookingService.create(bookingData)).to.throw('You already have a booking');
    });

    it('should throw error for inactive hospital', () => {
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

      const mockHospital = { id: 1, isActive: false, approval_status: 'approved' };
      const mockUser = { id: 1, isActive: true };

      sandbox.stub(db, 'transaction').callsFake((fn) => fn());
      sandbox.stub(Hospital, 'findById').returns(mockHospital);
      sandbox.stub(User, 'findById').returns(mockUser);

      expect(() => BookingService.create(bookingData)).to.throw('Hospital is not available');
    });
  });

  describe('approve', () => {
    it('should approve booking and allocate resources', () => {
      const mockBooking = {
        id: 1,
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
        status: 'pending',
        hospitalName: 'Test Hospital'
      };

      const mockApprover = { id: 2, isActive: true, userType: 'hospital-authority', hospital_id: 1 };
      const mockAvailability = { available: true, message: 'Resources available' };
      const mockUpdatedBooking = { ...mockBooking, status: 'approved' };

      // Mock database transaction
      sandbox.stub(db, 'transaction').callsFake((fn) => fn());
      
      sandbox.stub(Booking, 'findById')
        .onFirstCall().returns(mockBooking)
        .onSecondCall().returns(mockBooking) // For verification
        .onThirdCall().returns(mockUpdatedBooking); // Final result
      
      sandbox.stub(User, 'findById').returns(mockApprover);
      sandbox.stub(Hospital, 'checkResourceAvailability').returns(mockAvailability);
      sandbox.stub(Booking, 'approve').returns(true);
      sandbox.stub(Hospital, 'allocateResources').returns(true);
      sandbox.stub(BookingStatusHistory, 'create').returns(true);
      sandbox.stub(BookingNotification, 'createBookingApproved').returns(true);

      const result = BookingService.approve(1, 2, { notes: 'Approved for admission' });

      expect(result).to.have.property('status', 'approved');
    });

    it('should throw error for non-pending booking', () => {
      const mockBooking = {
        id: 1,
        status: 'approved' // Already approved
      };

      sandbox.stub(db, 'transaction').callsFake((fn) => fn());
      sandbox.stub(Booking, 'findById').returns(mockBooking);

      expect(() => BookingService.approve(1, 2)).to.throw('Only pending bookings can be approved');
    });

    it('should throw error when approver lacks permission', () => {
      const mockBooking = {
        id: 1,
        hospitalId: 1,
        status: 'pending'
      };

      const mockApprover = { 
        id: 2, 
        isActive: true, 
        userType: 'hospital-authority', 
        hospital_id: 2 // Different hospital
      };

      sandbox.stub(db, 'transaction').callsFake((fn) => fn());
      sandbox.stub(Booking, 'findById').returns(mockBooking);
      sandbox.stub(User, 'findById').returns(mockApprover);

      expect(() => BookingService.approve(1, 2)).to.throw('Approver can only approve bookings for their assigned hospital');
    });

    it('should throw error when resources become unavailable', () => {
      const mockBooking = {
        id: 1,
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
        status: 'pending'
      };

      const mockApprover = { id: 2, isActive: true, userType: 'admin' };
      const mockAvailability = { available: false, message: 'No resources available' };

      sandbox.stub(db, 'transaction').callsFake((fn) => fn());
      sandbox.stub(Booking, 'findById').returns(mockBooking);
      sandbox.stub(User, 'findById').returns(mockApprover);
      sandbox.stub(Hospital, 'checkResourceAvailability').returns(mockAvailability);

      expect(() => BookingService.approve(1, 2)).to.throw('Insufficient resources available');
    });
  });

  describe('decline', () => {
    it('should decline booking with reason', () => {
      const mockBooking = {
        id: 1,
        userId: 1,
        hospitalId: 1,
        status: 'pending',
        hospitalName: 'Test Hospital'
      };

      const mockUpdatedBooking = { ...mockBooking, status: 'declined' };

      sandbox.stub(Booking, 'findById')
        .onFirstCall().returns(mockBooking)
        .onSecondCall().returns(mockUpdatedBooking);
      
      sandbox.stub(Booking, 'decline').returns(true);
      sandbox.stub(BookingNotification, 'createBookingDeclined').returns(true);

      const result = BookingService.decline(1, 2, { reason: 'No beds available' });

      expect(result).to.have.property('status', 'declined');
    });

    it('should throw error when decline reason is missing', () => {
      const mockBooking = { id: 1, status: 'pending' };
      
      sandbox.stub(Booking, 'findById').returns(mockBooking);

      expect(() => BookingService.decline(1, 2, {})).to.throw('Decline reason is required');
    });
  });

  describe('cancel', () => {
    it('should cancel approved booking and release resources', () => {
      const mockBooking = {
        id: 1,
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
        status: 'approved',
        hospitalName: 'Test Hospital'
      };

      const mockCanceller = { id: 1, isActive: true, userType: 'user' };
      const mockUpdatedBooking = { ...mockBooking, status: 'cancelled' };

      sandbox.stub(db, 'transaction').callsFake((fn) => fn());
      sandbox.stub(Booking, 'findById')
        .onFirstCall().returns(mockBooking)
        .onSecondCall().returns(mockBooking) // For verification
        .onThirdCall().returns(mockUpdatedBooking);
      
      sandbox.stub(User, 'findById').returns(mockCanceller);
      sandbox.stub(Hospital, 'releaseResources').returns(true);
      sandbox.stub(BookingStatusHistory, 'create').returns(true);
      sandbox.stub(Booking, 'cancel').returns(true);
      sandbox.stub(BookingNotification, 'createBookingCancelled').returns(true);

      const result = BookingService.cancel(1, 1, 'Change of plans');

      expect(result).to.have.property('status', 'cancelled');
    });

    it('should throw error when user tries to cancel another user\'s booking', () => {
      const mockBooking = {
        id: 1,
        userId: 2, // Different user
        status: 'pending'
      };

      const mockCanceller = { id: 1, isActive: true, userType: 'user' };

      sandbox.stub(db, 'transaction').callsFake((fn) => fn());
      sandbox.stub(Booking, 'findById').returns(mockBooking);
      sandbox.stub(User, 'findById').returns(mockCanceller);

      expect(() => BookingService.cancel(1, 1)).to.throw('Users can only cancel their own bookings');
    });
  });

  describe('complete', () => {
    it('should complete booking and release resources', () => {
      const mockBooking = {
        id: 1,
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
        status: 'approved',
        hospitalName: 'Test Hospital'
      };

      const mockUpdatedBooking = { ...mockBooking, status: 'completed' };

      sandbox.stub(Booking, 'findById')
        .onFirstCall().returns(mockBooking)
        .onSecondCall().returns(mockUpdatedBooking);
      
      sandbox.stub(Hospital, 'releaseResources').returns(true);
      sandbox.stub(Booking, 'complete').returns(true);
      sandbox.stub(BookingNotification, 'createBookingCompleted').returns(true);

      const result = BookingService.complete(1, 2, 'Treatment completed');

      expect(result).to.have.property('status', 'completed');
    });

    it('should throw error for non-approved booking', () => {
      const mockBooking = { id: 1, status: 'pending' };
      
      sandbox.stub(Booking, 'findById').returns(mockBooking);

      expect(() => BookingService.complete(1, 2)).to.throw('Only approved bookings can be completed');
    });
  });

  describe('validateDataConsistency', () => {
    it('should return valid result for consistent data', () => {
      const mockBooking = {
        id: 1,
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
        status: 'approved',
        createdAt: '2024-01-01T10:00:00Z',
        scheduledDate: '2024-01-02T10:00:00Z'
      };

      const mockUser = { id: 1, isActive: true };
      const mockHospital = { id: 1, isActive: true, approval_status: 'approved' };
      const mockResource = {
        total: 10,
        available: 5,
        occupied: 3,
        reserved: 1,
        maintenance: 1
      };

      const mockStatusHistory = [
        { newStatus: 'pending' },
        { newStatus: 'approved' }
      ];

      const mockNotifications = { count: 2 };

      sandbox.stub(Booking, 'findById').returns(mockBooking);
      sandbox.stub(User, 'findById').returns(mockUser);
      sandbox.stub(Hospital, 'findById').returns(mockHospital);
      
      const prepareStub = sandbox.stub(db, 'prepare');
      const getStub = sandbox.stub();
      const allStub = sandbox.stub();
      
      getStub.onFirstCall().returns(mockResource);
      allStub.onFirstCall().returns(mockStatusHistory);
      getStub.onSecondCall().returns(mockNotifications);
      
      prepareStub.onFirstCall().returns({ get: getStub });
      prepareStub.onSecondCall().returns({ all: allStub });
      prepareStub.onThirdCall().returns({ get: getStub });

      const result = BookingService.validateDataConsistency(1);

      expect(result.isValid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should detect resource allocation inconsistencies', () => {
      const mockBooking = {
        id: 1,
        userId: 1,
        hospitalId: 1,
        resourceType: 'beds',
        status: 'approved',
        createdAt: '2024-01-01T10:00:00Z',
        scheduledDate: '2024-01-02T10:00:00Z'
      };

      const mockUser = { id: 1, isActive: true };
      const mockHospital = { id: 1, isActive: true, approval_status: 'approved' };
      const mockResource = {
        total: 10,
        available: 5,
        occupied: 4, // Total doesn't add up
        reserved: 1,
        maintenance: 1
      };

      sandbox.stub(Booking, 'findById').returns(mockBooking);
      sandbox.stub(User, 'findById').returns(mockUser);
      sandbox.stub(Hospital, 'findById').returns(mockHospital);
      
      const prepareStub = sandbox.stub(db, 'prepare');
      const getStub = sandbox.stub().returns(mockResource);
      const allStub = sandbox.stub().returns([]);
      
      prepareStub.onFirstCall().returns({ get: getStub });
      prepareStub.onSecondCall().returns({ all: allStub });
      prepareStub.onThirdCall().returns({ get: sandbox.stub().returns({ count: 0 }) });

      const result = BookingService.validateDataConsistency(1);

      expect(result.isValid).to.be.false;
      expect(result.errors).to.include('Resource counts do not add up to total');
    });
  });

  describe('runIntegrityChecks', () => {
    it('should run integrity checks on all bookings', () => {
      const mockBookings = [{ id: 1 }, { id: 2 }];
      
      const prepareStub = sandbox.stub(db, 'prepare');
      const allStub = sandbox.stub().returns(mockBookings);
      prepareStub.returns({ all: allStub });

      // Mock validation results
      sandbox.stub(BookingService, 'validateDataConsistency')
        .onFirstCall().returns({ isValid: true, errors: [], warnings: [] })
        .onSecondCall().returns({ isValid: false, errors: ['Test error'], warnings: ['Test warning'] });

      const result = BookingService.runIntegrityChecks();

      expect(result.totalBookings).to.equal(2);
      expect(result.validBookings).to.equal(1);
      expect(result.invalidBookings).to.equal(1);
      expect(result.warnings).to.equal(1);
    });
  });

  describe('search', () => {
    it('should search bookings with multiple criteria', () => {
      const mockBookings = [
        { id: 1, patientName: 'John Doe', status: 'pending' },
        { id: 2, patientName: 'Jane Smith', status: 'approved' }
      ];

      const prepareStub = sandbox.stub(db, 'prepare');
      const allStub = sandbox.stub().returns(mockBookings);
      prepareStub.returns({ all: allStub });

      const searchCriteria = {
        patientName: 'John',
        status: 'pending',
        hospitalId: 1
      };

      const result = BookingService.search(searchCriteria);

      expect(result).to.deep.equal(mockBookings);
      expect(allStub.calledOnce).to.be.true;
    });
  });
});