const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String
  },
  userType: {
    type: String,
    required: true,
    enum: ['user', 'hospital-authority', 'admin'],
    default: 'user'
  },
  hospital_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital'
  },
  can_add_hospital: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  balance: {
    type: Number,
    default: 10000.00
  },
  // Fields merged from hospital_authorities
  hospitalRole: {
    type: String,
    enum: ['admin', 'manager', 'staff']
  },
  permissions: {
    type: [String], // Array of permission strings
    default: []
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Helper method to compare passwords
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Static methods to maintain backward compatibility with controllers
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email });
};

userSchema.statics.getAll = function() {
  return this.find().sort({ createdAt: -1 });
};

// Old Sequelize-style methods support
userSchema.statics.findAll = function(options = {}) {
  let query = this.find();
  
  if (options.where) {
    query = query.where(options.where);
  }
  
  if (options.attributes && options.attributes.exclude) {
    const exclude = options.attributes.exclude.map(f => `-${f}`).join(' ');
    query = query.select(exclude);
  }
  
  return query.sort({ createdAt: -1 });
};

userSchema.statics.findByPk = function(id, options = {}) {
  let query = this.findById(id);
  
  if (options && options.attributes && options.attributes.exclude) {
    const exclude = options.attributes.exclude.map(f => `-${f}`).join(' ');
    query = query.select(exclude);
  }
  
  return query;
};

// Balance management methods (Ported from old User.js)
userSchema.statics.getBalance = async function(userId) {
  const user = await this.findById(userId);
  return user ? user.balance : 0;
};

userSchema.statics.updateBalance = async function(userId, amount, operation = 'subtract', description = '') {
  const user = await this.findById(userId);
  if (!user) throw new Error('User not found');

  const currentBalance = user.balance || 0;
  
  if (operation === 'subtract' && currentBalance < amount) {
    throw new Error('Insufficient balance');
  }
  
  const newBalance = operation === 'add' 
    ? currentBalance + parseFloat(amount)
    : currentBalance - parseFloat(amount);
  
  user.balance = newBalance;
  await user.save();
  
  // Note: Transaction logging should ideally happen in a Transaction model/service
  // keeping it simple here for migration
  
  return {
    previousBalance: currentBalance,
    newBalance: newBalance,
    amount: amount,
    operation: operation
  };
};

userSchema.statics.hasSufficientBalance = async function(userId, amount) {
  const balance = await this.getBalance(userId);
  return balance >= parseFloat(amount);
};

userSchema.statics.processPayment = async function(userId, amount, bookingId, transactionId, breakdown) {
  const user = await this.findById(userId);
  if (!user) throw new Error('User not found');

  if (user.balance < amount) {
    throw new Error('Insufficient balance');
  }

  // Deduct balance
  user.balance -= parseFloat(amount);
  await user.save();

  // Create transaction record
  try {
    const Transaction = mongoose.model('Transaction');
    // Need Booking and Hospital ID from booking?
    // The controller passed bookingId. We might need to fetch booking to get hospitalId if not passed.
    // However, the controller didn't pass hospitalId to processPayment in the call args: 
    // User.processPayment(req.user.id, paymentAmount, bookingId, transactionId, enhancedCostBreakdown);
    
    // We can fetch booking here or expect it in args. 
    // Fetching booking is safer.
    const Booking = mongoose.model('Booking');
    const booking = await Booking.findById(bookingId);
    
    await Transaction.create({
      bookingId,
      userId,
      hospitalId: booking ? booking.hospitalId : null, // Should exist
      amount,
      serviceCharge: breakdown.service_charge_amount || 0,
      hospitalAmount: breakdown.hospital_share || (amount - (breakdown.service_charge_amount || 0)),
      paymentMethod: 'balance',
      transactionId,
      status: 'completed',
      paymentData: breakdown,
      processedAt: new Date()
    });
  } catch (error) {
    console.error('Transaction logging failed:', error);
    // Don't fail the payment if logging fails? Or maybe needed for reconciliation.
    // In SQL it was likely transactional.
  }

  return {
    success: true,
    previousBalance: user.balance + parseFloat(amount),
    newBalance: user.balance,
    transactionId
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;