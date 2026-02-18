const mongoose = require('mongoose');

const userBalanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userType: { type: String, required: true }, 
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  currentBalance: { type: Number, default: 0.00 },
  totalEarnings: { type: Number, default: 0.00 },
  totalWithdrawals: { type: Number, default: 0.00 },
  pendingAmount: { type: Number, default: 0.00 },
  lastTransactionAt: Date
}, {
  timestamps: true
});

userBalanceSchema.index({ userId: 1, hospitalId: 1 }, { unique: true });

userBalanceSchema.statics.findByUserId = function(userId, hospitalId = null) {
  let query = { userId };
  if (hospitalId) query.hospitalId = hospitalId;
  return this.findOne(query);
};

userBalanceSchema.statics.getOrCreateBalance = async function(userId, userType, hospitalId = null) {
  let query = { userId };
  if (hospitalId) query.hospitalId = hospitalId;
  else query.hospitalId = null;

  let balance = await this.findOne(query);

  if (!balance) {
    balance = await this.create({
      userId,
      userType,
      hospitalId,
      currentBalance: 0,
      totalEarnings: 0,
      totalWithdrawals: 0,
      pendingAmount: 0
    });
  }
  return balance;
};

userBalanceSchema.statics.updateBalance = async function(userId, hospitalId, amount, transactionType, transactionId = null, description = null) {
  // If userType is unknown, we might need to fetch user or let getOrCreate handle it if we passed generic 'user'
  // But usually this calls on existing balance.
  // We use findOne primarily.
  let balance = await this.findOne({ userId, hospitalId });
  if (!balance) {
      // Lazy create
      balance = await this.create({
          userId,
          userType: 'unknown', // Placeholder
          hospitalId,
          currentBalance: 0
      });
  }
  
  const balanceBefore = balance.currentBalance;
  let amountFloat = parseFloat(amount);
  
  // Update current balance
  balance.currentBalance += amountFloat;
  
  // KPI updates
  switch (transactionType) {
      case 'payment_received':
      case 'service_charge':
        balance.totalEarnings += amountFloat;
        break;
      case 'refund_processed':
          // Reduces total earnings
        balance.totalEarnings += amountFloat; 
        break;
      case 'withdrawal':
          // Increases total withdrawals (absolute value)
        balance.totalWithdrawals += Math.abs(amountFloat);
        break;
      case 'adjustment':
        // Logic depends on adjustment.
        // If positive, earnings? If negative, undefined? 
        // For now leave KPI untouched or handle specifically.
        break;
  }

  balance.lastTransactionAt = new Date();
  await balance.save();

  // Log BalanceTransaction
  // Need to require model dynamically to avoid circular dependency if it imports UserBalance
  const BalanceTransaction = mongoose.model('BalanceTransaction');
  await BalanceTransaction.create({
      balanceId: balance._id,
      transactionId,
      transactionType,
      amount: amountFloat,
      balanceBefore,
      balanceAfter: balance.currentBalance,
      description,
      processedBy: userId // Or system
  });

  return balance;
};

userBalanceSchema.statics.getBalanceSummary = async function(userType, hospitalId = null) {
  const match = {};
  if (userType) match.userType = userType;
  if (hospitalId) match.hospitalId = new mongoose.Types.ObjectId(hospitalId);

  const summary = await this.aggregate([
    { $match: match },
    { $group: {
      _id: null,
      totalBalance: { $sum: '$currentBalance' },
      totalEarnings: { $sum: '$totalEarnings' },
      totalWithdrawals: { $sum: '$totalWithdrawals' },
      avgBalance: { $avg: '$currentBalance' },
      count: { $sum: 1 }
    }}
  ]);

  return summary[0] || {
    totalBalance: 0,
    totalEarnings: 0,
    totalWithdrawals: 0,
    avgBalance: 0,
    count: 0
  };
};

userBalanceSchema.statics.getLowBalanceAccounts = async function(threshold) {
    return this.find({ currentBalance: { $lt: threshold } }).populate('hospitalId', 'name');
};

userBalanceSchema.statics.getAdminBalances = async function() {
    return this.find({ userType: 'admin' });
};

const UserBalance = mongoose.model('UserBalance', userBalanceSchema);

module.exports = UserBalance;