const mongoose = require('mongoose');

const userBalanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userType: { type: String, required: true }, // copied from User for redundancy / querying
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  currentBalance: { type: Number, default: 0.00 },
  totalEarnings: { type: Number, default: 0.00 },
  totalWithdrawals: { type: Number, default: 0.00 },
  pendingAmount: { type: Number, default: 0.00 },
  lastTransactionAt: Date
}, {
  timestamps: true
});

// Index for getting specific balance
userBalanceSchema.index({ userId: 1, hospitalId: 1 }, { unique: true });

userBalanceSchema.statics.getOrCreateBalance = async function(userId, userType, hospitalId = null) {
  let query = { userId };
  if (hospitalId) query.hospitalId = hospitalId;
  else query.hospitalId = null;

  let balance = await this.findOne(query)
    .populate('userId', 'name email')
    .populate('hospitalId', 'name');

  if (!balance) {
    balance = await this.create({
      userId,
      userType, // This might be stale if user changes type, but okay for record
      hospitalId,
      currentBalance: 0,
      totalEarnings: 0,
      totalWithdrawals: 0,
      pendingAmount: 0
    });
    // Populate after create not strictly needed for logic but good for return
    balance = await balance.populate('userId', 'name email');
    if (balance.hospitalId) await balance.populate('hospitalId', 'name');
  }
  return balance;
};

userBalanceSchema.statics.updateBalance = async function(userId, hospitalId, amount, transactionType, transactionId = null, description = null) {
  const balance = await this.getOrCreateBalance(userId, 'unknown', hospitalId); // userType handling?
  // We can fetch userType from User if needed, but getOrCreate handles existence.
  
  const balanceBefore = balance.currentBalance;
  let balanceAfter = balanceBefore;
  let amountFloat = parseFloat(amount);

  switch (transactionType) {
      case 'payment_received':
      case 'service_charge':
        balanceAfter = balanceBefore + amountFloat;
        balance.totalEarnings += amountFloat;
        break;
      case 'refund_processed':
      case 'withdrawal':
        balanceAfter = balanceBefore - amountFloat;
        balance.totalWithdrawals += amountFloat;
        break;
      case 'adjustment':
        balanceAfter = balanceBefore + amountFloat;
        if (amountFloat > 0) balance.totalEarnings += amountFloat;
        else balance.totalWithdrawals += Math.abs(amountFloat);
        break;
      default:
        throw new Error(`Invalid transaction type: ${transactionType}`);
  }

  balance.currentBalance = balanceAfter;
  balance.lastTransactionAt = new Date();
  await balance.save();

  // Log BalanceTransaction
  const BalanceTransaction = mongoose.model('BalanceTransaction');
  await BalanceTransaction.create({
      balanceId: balance._id,
      transactionId,
      transactionType,
      amount: amountFloat,
      balanceBefore,
      balanceAfter,
      description,
      processedBy: userId
  });

  return balance;
};

// ... other getters converted to Mongoose find queries

const UserBalance = mongoose.model('UserBalance', userBalanceSchema);

module.exports = UserBalance;