const Transaction = require('../models/Transaction');
const PaymentConfig = require('../models/PaymentConfig');
const Booking = require('../models/Booking');
const NotificationService = require('./notificationService');

class PaymentProcessingService {
  /**
   * Process booking payment through dummy payment gateway
   */
  static async processBookingPayment(bookingId, paymentData, userId) {
    try {
      // Validate booking exists and is payable
      const booking = Booking.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.paymentStatus === 'paid') {
        throw new Error('Booking has already been paid');
      }

      if (booking.status === 'cancelled') {
        throw new Error('Cannot pay for cancelled booking');
      }

      // Validate payment data
      const validation = this.validatePaymentData(paymentData);
      if (!validation.isValid) {
        throw new Error(`Payment validation failed: ${validation.errors.join(', ')}`);
      }

      // Get payment configuration
      const config = PaymentConfig.getConfigForHospital(booking.hospitalId);
      const serviceCharge = PaymentConfig.calculateServiceCharge(booking.paymentAmount, booking.hospitalId);
      const hospitalAmount = booking.paymentAmount - serviceCharge;

      // Generate unique transaction ID
      const transactionId = this.generateTransactionId();

      // Create transaction record
      const transactionData = {
        bookingId,
        userId,
        hospitalId: booking.hospitalId,
        amount: booking.paymentAmount,
        serviceCharge,
        hospitalAmount,
        paymentMethod: paymentData.paymentMethod,
        transactionId,
        status: 'pending',
        paymentData: {
          cardLast4: paymentData.cardNumber ? paymentData.cardNumber.slice(-4) : null,
          cardType: paymentData.cardType || null,
          paymentMethod: paymentData.paymentMethod,
          billingAddress: paymentData.billingAddress || null
        }
      };

      const transaction = Transaction.create(transactionData);

      // Process payment through dummy gateway
      const paymentResult = await this.processDummyPayment(paymentData, booking.paymentAmount);

      if (paymentResult.success) {
        // Payment successful - confirm transaction
        const confirmedTransaction = this.confirmPayment(transaction.id);
        
        // Update booking payment status
        Booking.updatePaymentStatus(bookingId, 'paid', paymentData.paymentMethod, transactionId);

        // Send payment confirmation notification
        try {
          await NotificationService.sendPaymentConfirmationNotification(
            transaction.id,
            userId,
            {
              hospitalName: booking.hospitalName || 'Hospital',
              paymentMethod: paymentData.paymentMethod
            }
          );
        } catch (notificationError) {
          console.error('Failed to send payment confirmation notification:', notificationError);
          // Don't fail the payment if notification fails
        }

        // Generate and send receipt
        try {
          await NotificationService.generateAndSendReceipt(transaction.id, userId);
        } catch (receiptError) {
          console.error('Failed to generate and send receipt:', receiptError);
          // Don't fail the payment if receipt generation fails
        }

        return {
          success: true,
          transaction: confirmedTransaction,
          paymentResult,
          message: 'Payment processed successfully'
        };
      } else {
        // Payment failed - update transaction status
        this.handlePaymentFailure(transaction.id, paymentResult.error);
        
        return {
          success: false,
          transaction,
          error: paymentResult.error,
          message: 'Payment processing failed'
        };
      }

    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
  }

  /**
   * Validate payment data
   */
  static validatePaymentData(paymentData) {
    const errors = [];

    if (!paymentData.paymentMethod) {
      errors.push('Payment method is required');
    }

    const validPaymentMethods = ['credit_card', 'debit_card', 'bank_transfer', 'digital_wallet'];
    if (paymentData.paymentMethod && !validPaymentMethods.includes(paymentData.paymentMethod)) {
      errors.push('Invalid payment method');
    }

    // Credit/Debit card validation
    if (['credit_card', 'debit_card'].includes(paymentData.paymentMethod)) {
      if (!paymentData.cardNumber || paymentData.cardNumber.length < 13) {
        errors.push('Valid card number is required');
      }

      if (!paymentData.expiryMonth || !paymentData.expiryYear) {
        errors.push('Card expiry date is required');
      }

      if (!paymentData.cvv || paymentData.cvv.length < 3) {
        errors.push('Valid CVV is required');
      }

      if (!paymentData.cardHolderName) {
        errors.push('Card holder name is required');
      }
    }

    // Bank transfer validation
    if (paymentData.paymentMethod === 'bank_transfer') {
      if (!paymentData.bankAccount || !paymentData.routingNumber) {
        errors.push('Bank account details are required');
      }
    }

    // Digital wallet validation
    if (paymentData.paymentMethod === 'digital_wallet') {
      if (!paymentData.walletId || !paymentData.walletProvider) {
        errors.push('Digital wallet details are required');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create transaction record
   */
  static createTransaction(bookingId, amount, paymentMethod, userId) {
    const booking = Booking.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const serviceCharge = PaymentConfig.calculateServiceCharge(amount, booking.hospitalId);
    const hospitalAmount = amount - serviceCharge;

    return Transaction.create({
      bookingId,
      userId,
      hospitalId: booking.hospitalId,
      amount,
      serviceCharge,
      hospitalAmount,
      paymentMethod,
      transactionId: this.generateTransactionId(),
      status: 'pending'
    });
  }

  /**
   * Confirm payment and update transaction status
   */
  static confirmPayment(transactionId) {
    const processedAt = new Date().toISOString();
    return Transaction.updateStatus(transactionId, 'completed', processedAt);
  }

  /**
   * Handle payment failure
   */
  static handlePaymentFailure(transactionId, errorReason) {
    const transaction = Transaction.findById(transactionId);
    if (transaction) {
      // Update transaction status to failed
      Transaction.updateStatus(transactionId, 'failed');
      
      // Log the failure reason
      console.error(`Payment failed for transaction ${transaction.transactionId}: ${errorReason}`);
    }
    
    return transaction;
  }

  /**
   * Generate payment receipt
   */
  static generatePaymentReceipt(transactionId) {
    const transaction = Transaction.findById(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const booking = Booking.findById(transaction.bookingId);
    
    return {
      receiptId: `RCPT_${transaction.transactionId}`,
      transactionId: transaction.transactionId,
      bookingId: transaction.bookingId,
      patientName: booking?.patientName,
      hospitalName: transaction.hospitalName,
      resourceType: booking?.resourceType,
      scheduledDate: booking?.scheduledDate,
      amount: transaction.amount,
      serviceCharge: transaction.serviceCharge,
      hospitalAmount: transaction.hospitalAmount,
      paymentMethod: transaction.paymentMethod,
      paymentDate: transaction.processedAt,
      status: transaction.status,
      receiptDate: new Date().toISOString()
    };
  }

  /**
   * Process refund
   */
  static async processRefund(transactionId, refundAmount, reason) {
    try {
      const transaction = Transaction.findById(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== 'completed') {
        throw new Error('Can only refund completed transactions');
      }

      // Validate refund amount
      if (refundAmount > transaction.amount) {
        throw new Error('Refund amount cannot exceed original transaction amount');
      }

      // Process dummy refund
      const refundResult = await this.processDummyRefund(transaction, refundAmount);

      if (refundResult.success) {
        // Update transaction status
        Transaction.updateStatus(transaction.id, 'refunded');

        // Update booking status
        const booking = Booking.findById(transaction.bookingId);
        if (booking) {
          Booking.updateStatus(booking.id, 'cancelled');
        }

        return {
          success: true,
          refundId: refundResult.refundId,
          amount: refundAmount,
          reason,
          processedAt: new Date().toISOString()
        };
      } else {
        throw new Error(`Refund processing failed: ${refundResult.error}`);
      }

    } catch (error) {
      console.error('Refund processing error:', error);
      throw error;
    }
  }

  /**
   * Dummy payment gateway simulation
   */
  static async processDummyPayment(paymentData, amount) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate different payment outcomes based on card number or amount
    const simulateFailure = this.shouldSimulateFailure(paymentData, amount);

    if (simulateFailure.shouldFail) {
      return {
        success: false,
        error: simulateFailure.reason,
        gatewayResponse: {
          code: simulateFailure.code,
          message: simulateFailure.reason
        }
      };
    }

    // Simulate successful payment
    return {
      success: true,
      gatewayTransactionId: `GATEWAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      gatewayResponse: {
        code: '00',
        message: 'Transaction approved',
        authCode: Math.random().toString(36).substr(2, 6).toUpperCase()
      },
      processedAt: new Date().toISOString()
    };
  }

  /**
   * Dummy refund processing simulation
   */
  static async processDummyRefund(transaction, refundAmount) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simulate refund success (95% success rate)
    const shouldFail = Math.random() < 0.05;

    if (shouldFail) {
      return {
        success: false,
        error: 'Refund processing failed - please try again later'
      };
    }

    return {
      success: true,
      refundId: `REFUND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      originalTransactionId: transaction.transactionId,
      refundAmount,
      processedAt: new Date().toISOString()
    };
  }

  /**
   * Determine if payment should be simulated as failed (for testing)
   */
  static shouldSimulateFailure(paymentData, amount) {
    // Simulate failures based on test card numbers
    if (paymentData.cardNumber) {
      const testFailureCards = {
        '4000000000000002': { code: '05', reason: 'Card declined' },
        '4000000000000119': { code: '14', reason: 'Invalid card number' },
        '4000000000000127': { code: '54', reason: 'Expired card' },
        '4000000000000069': { code: '51', reason: 'Insufficient funds' }
      };

      if (testFailureCards[paymentData.cardNumber]) {
        return {
          shouldFail: true,
          ...testFailureCards[paymentData.cardNumber]
        };
      }
    }

    // Simulate random failures (5% failure rate)
    if (Math.random() < 0.05) {
      const randomFailures = [
        { code: '05', reason: 'Card declined' },
        { code: '51', reason: 'Insufficient funds' },
        { code: '91', reason: 'Issuer unavailable' }
      ];
      
      return {
        shouldFail: true,
        ...randomFailures[Math.floor(Math.random() * randomFailures.length)]
      };
    }

    return { shouldFail: false };
  }

  /**
   * Generate unique transaction ID
   */
  static generateTransactionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `TXN_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Get payment history for user
   */
  static getPaymentHistory(userId, limit = 50) {
    return Transaction.findByUserId(userId).slice(0, limit);
  }

  /**
   * Get transaction by ID with receipt data
   */
  static getTransactionWithReceipt(transactionId) {
    const transaction = Transaction.findByTransactionId(transactionId);
    if (!transaction) {
      return null;
    }

    return {
      transaction,
      receipt: this.generatePaymentReceipt(transaction.id)
    };
  }

  /**
   * Retry failed payment
   */
  static async retryPayment(transactionId, newPaymentData) {
    const transaction = Transaction.findById(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'failed') {
      throw new Error('Can only retry failed transactions');
    }

    // Process new payment attempt
    return this.processBookingPayment(
      transaction.bookingId,
      newPaymentData,
      transaction.userId
    );
  }
}

module.exports = PaymentProcessingService;