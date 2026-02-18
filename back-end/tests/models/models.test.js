const { expect } = require('chai');
const dbHandler = require('../setup');

// Models
const User = require('../../models/User');
const Hospital = require('../../models/Hospital');
const Booking = require('../../models/Booking');
const Transaction = require('../../models/Transaction');
const UserBalance = require('../../models/UserBalance');
const BalanceTransaction = require('../../models/BalanceTransaction');
const Review = require('../../models/Review');

describe('Model CRUD Operations', function () {
  this.timeout(30000);

  before(async () => {
    await dbHandler.connect();
  });

  afterEach(async () => {
    await dbHandler.clearDatabase();
  });

  after(async () => {
    await dbHandler.closeDatabase();
  });

  // ─── User Model ─────────────────────────────────────────────────
  describe('User Model', () => {
    const sampleUser = {
      email: 'test@example.com',
      password: 'hashedpassword123',
      name: 'Test User',
      phone: '+880-1700-000001',
      userType: 'user'
    };

    it('should create a user successfully', async () => {
      const user = await User.create(sampleUser);

      expect(user).to.exist;
      expect(user._id).to.exist;
      expect(user.email).to.equal('test@example.com');
      expect(user.name).to.equal('Test User');
      expect(user.userType).to.equal('user');
      expect(user.isActive).to.equal(true);
      expect(user.balance).to.equal(10000.00);
      expect(user.createdAt).to.exist;
    });

    it('should find a user by email', async () => {
      await User.create(sampleUser);
      const found = await User.findByEmail('test@example.com');

      expect(found).to.exist;
      expect(found.name).to.equal('Test User');
    });

    it('should return null for non-existent email', async () => {
      const found = await User.findByEmail('nonexistent@example.com');
      expect(found).to.be.null;
    });

    it('should enforce unique email constraint', async () => {
      await User.create(sampleUser);
      try {
        await User.create(sampleUser);
        expect.fail('Should have thrown a duplicate key error');
      } catch (error) {
        expect(error).to.exist;
        expect(error.code).to.equal(11000); // MongoDB duplicate key error
      }
    });

    it('should enforce required fields', async () => {
      try {
        await User.create({ email: 'test@example.com' });
        expect.fail('Should have thrown a validation error');
      } catch (error) {
        expect(error).to.exist;
        expect(error.name).to.equal('ValidationError');
      }
    });

    it('should enforce userType enum', async () => {
      try {
        await User.create({ ...sampleUser, email: 'enum@test.com', userType: 'invalid-type' });
        expect.fail('Should have thrown a validation error');
      } catch (error) {
        expect(error).to.exist;
        expect(error.name).to.equal('ValidationError');
      }
    });

    it('should update user balance', async () => {
      const user = await User.create(sampleUser);

      const result = await User.updateBalance(user._id, 500, 'subtract', 'Test deduction');

      expect(result.previousBalance).to.equal(10000);
      expect(result.newBalance).to.equal(9500);
      expect(result.amount).to.equal(500);
      expect(result.operation).to.equal('subtract');
    });

    it('should throw on insufficient balance', async () => {
      const user = await User.create({ ...sampleUser, balance: 100 });

      try {
        await User.updateBalance(user._id, 500, 'subtract');
        expect.fail('Should have thrown insufficient balance error');
      } catch (error) {
        expect(error.message).to.equal('Insufficient balance');
      }
    });

    it('should add balance', async () => {
      const user = await User.create(sampleUser);
      const result = await User.updateBalance(user._id, 500, 'add', 'Top-up');

      expect(result.newBalance).to.equal(10500);
    });

    it('should check sufficient balance', async () => {
      const user = await User.create(sampleUser);

      const hasFunds = await User.hasSufficientBalance(user._id, 5000);
      expect(hasFunds).to.be.true;

      const noFunds = await User.hasSufficientBalance(user._id, 20000);
      expect(noFunds).to.be.false;
    });

    it('should get all users sorted by createdAt', async () => {
      await User.create(sampleUser);
      await User.create({ ...sampleUser, email: 'second@example.com', name: 'Second User' });

      const users = await User.getAll();
      expect(users).to.have.lengthOf(2);
    });

    it('should support matchPassword method', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPwd = await bcrypt.hash('mypassword', 10);
      const user = await User.create({ ...sampleUser, password: hashedPwd });

      const match = await user.matchPassword('mypassword');
      expect(match).to.be.true;

      const noMatch = await user.matchPassword('wrongpassword');
      expect(noMatch).to.be.false;
    });

    it('should create hospital authority user with permissions', async () => {
      const haUser = await User.create({
        ...sampleUser,
        email: 'authority@hospital.com',
        userType: 'hospital-authority',
        hospitalRole: 'admin',
        permissions: ['view_hospital', 'update_hospital']
      });

      expect(haUser.userType).to.equal('hospital-authority');
      expect(haUser.hospitalRole).to.equal('admin');
      expect(haUser.permissions).to.include('view_hospital');
      expect(haUser.permissions).to.include('update_hospital');
    });
  });

  // ─── Hospital Model ─────────────────────────────────────────────
  describe('Hospital Model', () => {
    const sampleHospital = {
      name: 'Test General Hospital',
      description: 'A comprehensive testing hospital',
      type: 'General',
      street: '123 Main St',
      city: 'Dhaka',
      state: 'Dhaka',
      zipCode: '1205',
      country: 'Bangladesh',
      phone: '+880-2-12345678',
      email: 'contact@testgeneral.com',
      emergency: '+880-2-99999999',
      total_beds: 200,
      icu_beds: 20,
      operation_theaters: 5,
      approval_status: 'approved'
    };

    it('should create a hospital successfully', async () => {
      const hospital = await Hospital.create(sampleHospital);

      expect(hospital).to.exist;
      expect(hospital.name).to.equal('Test General Hospital');
      expect(hospital.total_beds).to.equal(200);
      expect(hospital.icu_beds).to.equal(20);
      expect(hospital.approval_status).to.equal('approved');
      expect(hospital.isActive).to.be.true;
    });

    it('should enforce required name field', async () => {
      try {
        await Hospital.create({ city: 'Dhaka' });
        expect.fail('Should have thrown a validation error');
      } catch (error) {
        expect(error.name).to.equal('ValidationError');
      }
    });

    it('should get all active hospitals', async () => {
      await Hospital.create(sampleHospital);
      await Hospital.create({ ...sampleHospital, name: 'Second Hospital' });
      await Hospital.create({ ...sampleHospital, name: 'Inactive Hospital', isActive: false });

      const hospitals = await Hospital.getAll();
      expect(hospitals).to.have.lengthOf(2);
    });

    it('should search hospitals by name', async () => {
      await Hospital.create(sampleHospital);
      await Hospital.create({ ...sampleHospital, name: 'Dhaka Cardiac Center' });

      const results = await Hospital.search('cardiac');
      expect(results).to.have.lengthOf(1);
      expect(results[0].name).to.equal('Dhaka Cardiac Center');
    });

    it('should search hospitals by city', async () => {
      await Hospital.create(sampleHospital);
      await Hospital.create({ ...sampleHospital, name: 'Chittagong Hospital', city: 'Chittagong' });

      const results = await Hospital.search('Chittagong');
      expect(results).to.have.lengthOf(1);
      expect(results[0].city).to.equal('Chittagong');
    });

    it('should have default values for approval_status', async () => {
      const hospital = await Hospital.create({ name: 'Minimal Hospital' });
      expect(hospital.approval_status).to.equal('pending');
    });

    it('should enforce approval_status enum', async () => {
      try {
        await Hospital.create({ name: 'Bad Status', approval_status: 'invalid' });
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).to.equal('ValidationError');
      }
    });

    it('should update hospital rating', async () => {
      const hospital = await Hospital.create(sampleHospital);
      // Create a review for this hospital
      const Review = require('../../models/Review');
      const user = await User.create({
        email: 'reviewer@test.com',
        password: 'password123',
        name: 'Reviewer',
        userType: 'user'
      });

      await Review.create({
        userId: user._id,
        hospitalId: hospital._id,
        rating: 4,
        title: 'Good hospital',
        comment: 'Nice experience',
        isActive: true
      });

      await Review.create({
        userId: user._id,
        hospitalId: hospital._id,
        rating: 5,
        title: 'Excellent',
        comment: 'Best hospital',
        isActive: true
      });

      const newRating = await Hospital.updateRating(hospital._id);
      expect(newRating).to.equal(4.5);
    });
  });

  // ─── Booking Model ──────────────────────────────────────────────
  describe('Booking Model', () => {
    let testUser, testHospital;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'patient@test.com',
        password: 'password123',
        name: 'Patient User',
        userType: 'user'
      });

      testHospital = await Hospital.create({
        name: 'Booking Test Hospital',
        approval_status: 'approved'
      });
    });

    const createBooking = (overrides = {}) => {
      return Booking.create({
        userId: testUser._id,
        hospitalId: testHospital._id,
        resourceType: 'beds',
        patientName: 'John Doe',
        patientAge: 35,
        patientGender: 'Male',
        medicalCondition: 'Chest pain',
        scheduledDate: new Date('2026-03-01'),
        paymentAmount: 2000,
        ...overrides
      });
    };

    it('should create a booking successfully', async () => {
      const booking = await createBooking();

      expect(booking).to.exist;
      expect(booking.patientName).to.equal('John Doe');
      expect(booking.status).to.equal('pending');
      expect(booking.paymentStatus).to.equal('pending');
      expect(booking.paymentAmount).to.equal(2000);
    });

    it('should enforce required fields', async () => {
      try {
        await Booking.create({ userId: testUser._id });
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).to.equal('ValidationError');
      }
    });

    it('should approve a pending booking', async () => {
      const booking = await createBooking();

      const adminUser = await User.create({
        email: 'admin@test.com',
        password: 'password123',
        name: 'Admin',
        userType: 'admin'
      });

      const result = await Booking.approve(booking._id, adminUser._id, 'Approved for treatment');
      expect(result).to.be.true;

      const updated = await Booking.findById(booking._id);
      expect(updated.status).to.equal('approved');
      expect(updated.approvedBy.toString()).to.equal(adminUser._id.toString());
      expect(updated.approvedAt).to.exist;
    });

    it('should decline a pending booking', async () => {
      const booking = await createBooking();
      const adminUser = await User.create({
        email: 'admin2@test.com',
        password: 'password123',
        name: 'Admin',
        userType: 'admin'
      });

      const result = await Booking.decline(booking._id, adminUser._id, 'No beds available', 'Sorry');
      expect(result).to.be.true;

      const updated = await Booking.findById(booking._id);
      expect(updated.status).to.equal('declined');
      expect(updated.declineReason).to.equal('No beds available');
    });

    it('should fail to approve a non-pending booking', async () => {
      const booking = await createBooking({ status: 'completed' });

      try {
        await Booking.approve(booking._id);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.equal('Only pending bookings can be approved');
      }
    });

    it('should complete an approved booking', async () => {
      const booking = await createBooking({ status: 'approved' });
      const result = await Booking.complete(booking._id, testUser._id);
      expect(result).to.be.true;

      const updated = await Booking.findById(booking._id);
      expect(updated.status).to.equal('completed');
    });

    it('should cancel a booking', async () => {
      const booking = await createBooking();
      const result = await Booking.cancel(booking._id, testUser._id, 'Changed plans');
      expect(result).to.be.true;

      const updated = await Booking.findById(booking._id);
      expect(updated.status).to.equal('cancelled');
    });

    it('should fail to cancel a completed booking', async () => {
      const booking = await createBooking({ status: 'completed' });
      try {
        await Booking.cancel(booking._id, testUser._id, 'Too late');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.equal('Only pending or approved bookings can be cancelled');
      }
    });

    it('should get all bookings', async () => {
      await createBooking();
      await createBooking({ patientName: 'Jane Doe' });

      const bookings = await Booking.getAll();
      expect(bookings).to.have.lengthOf(2);
    });

    it('should get bookings by hospital', async () => {
      await createBooking();

      const otherHospital = await Hospital.create({ name: 'Other Hospital' });
      await createBooking({ hospitalId: otherHospital._id, patientName: 'Other Patient' });

      const bookings = await Booking.getByHospital(testHospital._id);
      expect(bookings).to.have.lengthOf(1);
    });

    it('should get bookings by status', async () => {
      await createBooking();
      await createBooking({ status: 'approved', patientName: 'Approved Patient' });
      await createBooking({ status: 'approved', patientName: 'Another Approved' });

      const approved = await Booking.getByStatus('approved');
      expect(approved).to.have.lengthOf(2);
    });
  });

  // ─── Transaction Model ──────────────────────────────────────────
  describe('Transaction Model', () => {
    let testUser, testHospital, testBooking;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'txuser@test.com',
        password: 'password123',
        name: 'Transaction User',
        userType: 'user'
      });

      testHospital = await Hospital.create({
        name: 'Transaction Hospital',
        approval_status: 'approved'
      });

      testBooking = await Booking.create({
        userId: testUser._id,
        hospitalId: testHospital._id,
        resourceType: 'beds',
        patientName: 'TX Patient',
        patientAge: 40,
        patientGender: 'Female',
        medicalCondition: 'Surgery',
        scheduledDate: new Date('2026-04-01'),
        paymentAmount: 5000
      });
    });

    const createTransaction = (overrides = {}) => {
      return Transaction.create({
        bookingId: testBooking._id,
        userId: testUser._id,
        hospitalId: testHospital._id,
        amount: 5000,
        serviceCharge: 250,
        hospitalAmount: 4750,
        paymentMethod: 'balance',
        transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        status: 'completed',
        ...overrides
      });
    };

    it('should create a transaction', async () => {
      const tx = await createTransaction();

      expect(tx).to.exist;
      expect(tx.amount).to.equal(5000);
      expect(tx.serviceCharge).to.equal(250);
      expect(tx.hospitalAmount).to.equal(4750);
      expect(tx.status).to.equal('completed');
    });

    it('should find transactions by booking', async () => {
      await createTransaction();
      const txns = await Transaction.findByBookingId(testBooking._id);
      expect(txns).to.have.lengthOf(1);
    });

    it('should find transactions by user', async () => {
      await createTransaction();
      const txns = await Transaction.findByUserId(testUser._id);
      expect(txns).to.have.lengthOf(1);
    });

    it('should find transactions by hospital', async () => {
      await createTransaction();
      const txns = await Transaction.findByHospitalId(testHospital._id);
      expect(txns).to.have.lengthOf(1);
    });

    it('should update transaction status', async () => {
      const tx = await createTransaction({ status: 'pending' });
      const updated = await Transaction.updateStatus(tx._id, 'completed');
      expect(updated.status).to.equal('completed');
      expect(updated.processedAt).to.exist;
    });

    it('should get revenue analytics', async () => {
      await createTransaction();
      await createTransaction({ transactionId: `TXN-2-${Date.now()}`, amount: 3000, hospitalAmount: 2850, serviceCharge: 150 });

      const analytics = await Transaction.getRevenueAnalytics();
      expect(analytics).to.have.lengthOf.at.least(1);

      const dayData = analytics[0];
      expect(dayData.transactionCount).to.equal(2);
      expect(dayData.totalAmount).to.equal(8000);
    });

    it('should get total revenue', async () => {
      await createTransaction();
      const totals = await Transaction.getTotalRevenue();

      expect(totals.totalTransactions).to.equal(1);
      expect(totals.totalRevenue).to.equal(5000);
      expect(totals.totalServiceCharge).to.equal(250);
      expect(totals.totalHospitalRevenue).to.equal(4750);
    });

    it('should enforce required fields', async () => {
      try {
        await Transaction.create({
          bookingId: testBooking._id,
          paymentMethod: 'balance'
        });
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).to.equal('ValidationError');
      }
    });
  });

  // ─── UserBalance Model ──────────────────────────────────────────
  describe('UserBalance Model', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'baluser@test.com',
        password: 'password123',
        name: 'Balance User',
        userType: 'user'
      });
    });

    it('should get or create balance', async () => {
      const balance = await UserBalance.getOrCreateBalance(testUser._id, 'user');
      expect(balance).to.exist;
      expect(balance.currentBalance).to.equal(0);
      expect(balance.userType).to.equal('user');
    });

    it('should return existing balance on second call', async () => {
      const first = await UserBalance.getOrCreateBalance(testUser._id, 'user');
      first.currentBalance = 500;
      await first.save();

      const second = await UserBalance.getOrCreateBalance(testUser._id, 'user');
      expect(second.currentBalance).to.equal(500);
      expect(second._id.toString()).to.equal(first._id.toString());
    });

    it('should update balance and log transaction', async () => {
      const balance = await UserBalance.getOrCreateBalance(testUser._id, 'user');

      const updated = await UserBalance.updateBalance(
        testUser._id,
        null,
        1000,
        'payment_received',
        null,
        'Payment for booking'
      );

      expect(updated.currentBalance).to.equal(1000);
      expect(updated.totalEarnings).to.equal(1000);

      // Check that a BalanceTransaction was created
      const txns = await BalanceTransaction.find({ balanceId: balance._id });
      expect(txns).to.have.lengthOf(1);
      expect(txns[0].amount).to.equal(1000);
      expect(txns[0].transactionType).to.equal('payment_received');
    });

    it('should get low balance accounts', async () => {
      const hospital = await Hospital.create({ name: 'Low Balance Hospital' });

      await UserBalance.create({
        userId: testUser._id,
        userType: 'hospital-authority',
        hospitalId: hospital._id,
        currentBalance: 50
      });

      const alerts = await UserBalance.getLowBalanceAccounts(100);
      expect(alerts).to.have.lengthOf(1);
    });

    it('should get balance summary', async () => {
      await UserBalance.create({
        userId: testUser._id,
        userType: 'user',
        currentBalance: 1000,
        totalEarnings: 5000,
        totalWithdrawals: 4000
      });

      const user2 = await User.create({
        email: 'user2@test.com',
        password: 'password123',
        name: 'User2',
        userType: 'user'
      });

      await UserBalance.create({
        userId: user2._id,
        userType: 'user',
        currentBalance: 2000,
        totalEarnings: 3000,
        totalWithdrawals: 1000
      });

      const summary = await UserBalance.getBalanceSummary('user');
      expect(summary.count).to.equal(2);
      expect(summary.totalBalance).to.equal(3000);
      expect(summary.totalEarnings).to.equal(8000);
    });
  });

  // ─── BalanceTransaction Model ───────────────────────────────────
  describe('BalanceTransaction Model', () => {
    let testBalance;

    beforeEach(async () => {
      const user = await User.create({
        email: 'btuser@test.com',
        password: 'password123',
        name: 'BT User',
        userType: 'user'
      });

      testBalance = await UserBalance.create({
        userId: user._id,
        userType: 'user',
        currentBalance: 1000
      });
    });

    it('should create a balance transaction', async () => {
      const bt = await BalanceTransaction.create({
        balanceId: testBalance._id,
        transactionType: 'payment_received',
        amount: 500,
        balanceBefore: 500,
        balanceAfter: 1000,
        description: 'Test payment'
      });

      expect(bt).to.exist;
      expect(bt.amount).to.equal(500);
    });

    it('should find transactions by balance ID', async () => {
      await BalanceTransaction.create({
        balanceId: testBalance._id,
        transactionType: 'payment_received',
        amount: 500,
        balanceBefore: 0,
        balanceAfter: 500,
        description: 'First'
      });

      await BalanceTransaction.create({
        balanceId: testBalance._id,
        transactionType: 'service_charge',
        amount: 50,
        balanceBefore: 500,
        balanceAfter: 550,
        description: 'Second'
      });

      const history = await BalanceTransaction.findByBalanceId(testBalance._id);
      expect(history).to.have.lengthOf(2);
    });

    it('should enforce transactionType enum', async () => {
      try {
        await BalanceTransaction.create({
          balanceId: testBalance._id,
          transactionType: 'invalid_type',
          amount: 100,
          balanceBefore: 0,
          balanceAfter: 100
        });
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).to.equal('ValidationError');
      }
    });

    it('should get audit trail with filters', async () => {
      await BalanceTransaction.create({
        balanceId: testBalance._id,
        transactionType: 'payment_received',
        amount: 500,
        balanceBefore: 0,
        balanceAfter: 500
      });

      await BalanceTransaction.create({
        balanceId: testBalance._id,
        transactionType: 'withdrawal',
        amount: -200,
        balanceBefore: 500,
        balanceAfter: 300
      });

      const all = await BalanceTransaction.getAuditTrail({ limit: 10 });
      expect(all).to.have.lengthOf(2);

      const withdrawalsOnly = await BalanceTransaction.getAuditTrail({ transactionType: 'withdrawal' });
      expect(withdrawalsOnly).to.have.lengthOf(1);
    });
  });

  // ─── Review Model ──────────────────────────────────────────────
  describe('Review Model', () => {
    let testUser, testHospital;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'reviewer@test.com',
        password: 'password123',
        name: 'Review User',
        userType: 'user'
      });

      testHospital = await Hospital.create({
        name: 'Review Hospital',
        approval_status: 'approved'
      });
    });

    it('should create a review successfully', async () => {
      const review = await Review.create({
        userId: testUser._id,
        hospitalId: testHospital._id,
        rating: 5,
        title: 'Excellent care',
        comment: 'Best hospital I have ever visited.',
        isActive: true
      });

      expect(review).to.exist;
      expect(review.rating).to.equal(5);
      expect(review.title).to.equal('Excellent care');
      expect(review.isActive).to.be.true;
    });

    it('should store and query multiple reviews', async () => {
      await Review.create({
        userId: testUser._id,
        hospitalId: testHospital._id,
        rating: 4,
        title: 'Good',
        comment: 'Nice place',
        isActive: true
      });

      await Review.create({
        userId: testUser._id,
        hospitalId: testHospital._id,
        rating: 3,
        title: 'Average',
        comment: 'Could be better',
        isActive: true
      });

      const reviews = await Review.find({ hospitalId: testHospital._id, isActive: true });
      expect(reviews).to.have.lengthOf(2);
    });
  });
});
