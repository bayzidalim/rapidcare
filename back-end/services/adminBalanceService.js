const UserBalance = require('../models/UserBalance');
const BalanceTransaction = require('../models/BalanceTransaction');
const User = require('../models/User');
const ErrorHandler = require('../utils/errorHandler');
const mongoose = require('mongoose');

/**
 * Admin Balance Service (Mongoose Version)
 */
class AdminBalanceService {
  /**
   * Initialize admin balance if it doesn't exist
   */
  static async initializeAdminBalance() {
    try {
      // Find admin user
      const admin = await User.findOne({ userType: 'admin' });

      if (!admin) {
        throw new Error('No admin user found in the system');
      }

      // Check if admin already has a balance record
      const existingBalance = await UserBalance.findOne({ userId: admin._id });

      if (existingBalance) {
        return {
          success: true,
          message: 'Admin balance already exists',
          balance: existingBalance,
          admin: admin
        };
      }

      // Create admin balance record
      const balanceData = {
        userId: admin._id,
        userType: 'admin',
        hospitalId: null, // Admin balance is not hospital-specific
        currentBalance: 0.00,
        totalEarnings: 0.00,
        totalWithdrawals: 0.00,
        pendingAmount: 0.00
      };

      const newBalance = await UserBalance.create(balanceData);

      console.log(`✅ Admin balance initialized for user: ${admin.email} (ID: ${admin._id})`);

      return {
        success: true,
        message: 'Admin balance initialized successfully',
        balance: newBalance,
        admin: admin
      };

    } catch (error) {
      console.error('❌ Error initializing admin balance:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get admin balance information
   */
  static async getAdminBalance() {
    try {
      // Find admin user
      let admin = await User.findOne({ userType: 'admin' });

      if (!admin) {
         // Create default admin? No, throws error usually.
         // Or just log and return null.
         throw new Error('No admin user found in the system');
      }

      // Get admin balance
      let balance = await UserBalance.findOne({ userId: admin._id });

      if (!balance) {
        // Initialize balance if it doesn't exist
        const initResult = await this.initializeAdminBalance();
        if (!initResult.success) {
          throw new Error(initResult.error);
        }
        balance = initResult.balance;
      }

      return balance;

    } catch (error) {
      console.error('Error getting admin balance:', error);
      throw error;
    }
  }

  /**
   * Add service charge to admin balance
   */
  static async addServiceCharge(amount, transactionId, description = null) {
    try {
      // Get admin balance
      const adminBalance = await this.getAdminBalance();
      
      if (!adminBalance) {
        throw new Error('Admin balance not found');
      }

      // Update admin balance with service charge using UserBalance static or manual update
      // Assuming UserBalance has updateBalance static (seen in User model but UserBalance should have it too or we implement logic here)
      // Check UserBalance model capabilities if viewed, or just implement update here.
      // Implementing logic here is safer if static doesn't exist or is for SQL.
      
      adminBalance.currentBalance += amount;
      adminBalance.totalEarnings += amount;
      adminBalance.lastTransactionAt = new Date();
      await adminBalance.save();

      // Create transaction record
      const transaction = await BalanceTransaction.create({
          balanceId: adminBalance._id,
          userId: adminBalance.userId,
          amount: amount,
          transactionType: 'service_charge',
          referenceId: transactionId,
          description: description || `Service charge from transaction ${transactionId}`,
          status: 'completed',
          processedBy: null
      });

      console.log(`✅ Service charge of ৳${amount.toFixed(2)} added to admin balance`);

      return {
        success: true,
        balance: adminBalance,
        message: `Service charge of ৳${amount.toFixed(2)} added to admin balance`
      };

    } catch (error) {
      console.error('Error adding service charge to admin balance:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get admin balance transaction history
   */
  static async getAdminTransactionHistory(options = {}) {
    try {
      const adminBalance = await this.getAdminBalance();
      
      if (!adminBalance) {
        return [];
      }

      const query = { balanceId: adminBalance._id };
      
      if (options.startDate || options.endDate) {
          query.createdAt = {};
          if (options.startDate) query.createdAt.$gte = new Date(options.startDate);
          if (options.endDate) query.createdAt.$lte = new Date(options.endDate);
      }
      
      if (options.transactionType) {
          query.transactionType = options.transactionType;
      }

      let dbQuery = BalanceTransaction.find(query)
          .populate('processedBy', 'name email')
          .sort({ createdAt: -1 });
          
      if (options.limit) {
          dbQuery = dbQuery.limit(parseInt(options.limit));
      }

      const transactions = await dbQuery.exec();
      
      // Map to flatten processedBy if needed or keep populated
      return transactions.map(t => ({
          ...t.toObject(),
          processedByName: t.processedBy ? t.processedBy.name : null,
          processedByEmail: t.processedBy ? t.processedBy.email : null
      }));

    } catch (error) {
      console.error('Error getting admin transaction history:', error);
      return [];
    }
  }

  /**
   * Get admin financial summary
   */
  static async getAdminFinancialSummary(options = {}) {
    try {
      const adminBalance = await this.getAdminBalance();
      
      if (!adminBalance) {
        return { currentBalance: 0, totalEarnings: 0, totalWithdrawals: 0, pendingAmount: 0, transactionCount: 0, averageTransactionAmount: 0 };
      }

      const matchStage = { balanceId: adminBalance._id };
      if (options.startDate || options.endDate) {
          matchStage.createdAt = {};
          if (options.startDate) matchStage.createdAt.$gte = new Date(options.startDate);
          if (options.endDate) matchStage.createdAt.$lte = new Date(options.endDate);
      }

      const stats = await BalanceTransaction.aggregate([
          { $match: matchStage },
          { $group: {
              _id: null,
              transactionCount: { $sum: 1 },
              totalAmount: { $sum: "$amount" },
              averageAmount: { $avg: "$amount" },
              serviceChargeCount: { $sum: { $cond: [{ $eq: ["$transactionType", "service_charge"] }, 1, 0] } },
              totalServiceCharges: { $sum: { $cond: [{ $eq: ["$transactionType", "service_charge"] }, "$amount", 0] } }
          }}
      ]);
      
      const stat = stats[0] || { transactionCount: 0, totalAmount: 0, averageAmount: 0, serviceChargeCount: 0, totalServiceCharges: 0 };

      return {
        currentBalance: adminBalance.currentBalance,
        totalEarnings: adminBalance.totalEarnings,
        totalWithdrawals: adminBalance.totalWithdrawals,
        pendingAmount: adminBalance.pendingAmount,
        transactionCount: stat.transactionCount,
        averageTransactionAmount: stat.averageAmount,
        serviceChargeCount: stat.serviceChargeCount,
        totalServiceCharges: stat.totalServiceCharges,
        lastTransactionAt: adminBalance.lastTransactionAt
      };

    } catch (error) {
      console.error('Error getting admin financial summary:', error);
      return { currentBalance: 0, totalEarnings: 0, totalWithdrawals: 0, pendingAmount: 0, transactionCount: 0, averageTransactionAmount: 0, serviceChargeCount: 0, totalServiceCharges: 0 };
    }
  }

  /**
   * Process admin withdrawal
   */
  static async processWithdrawal(amount, description, processedBy) {
    try {
      const adminBalance = await this.getAdminBalance();
      
      if (!adminBalance) {
        throw new Error('Admin balance not found');
      }

      // Check if sufficient balance
      if (adminBalance.currentBalance < amount) {
        throw new Error('Insufficient balance for withdrawal');
      }

      // Process withdrawal
      adminBalance.currentBalance -= amount;
      adminBalance.totalWithdrawals += amount;
      adminBalance.lastTransactionAt = new Date();
      await adminBalance.save();

      await BalanceTransaction.create({
          balanceId: adminBalance._id,
          userId: adminBalance.userId,
          amount: -amount, // Negative for withdrawal
          transactionType: 'withdrawal',
          description: description || `Admin withdrawal`,
          status: 'completed',
          processedBy: processedBy
      });

      console.log(`✅ Admin withdrawal of ৳${amount.toFixed(2)} processed`);

      return {
        success: true,
        balance: adminBalance,
        message: `Withdrawal of ৳${amount.toFixed(2)} processed successfully`
      };

    } catch (error) {
      console.error('Error processing admin withdrawal:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = AdminBalanceService;
