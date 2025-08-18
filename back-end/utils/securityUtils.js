const crypto = require('crypto');

class SecurityUtils {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    this.saltLength = 32;
    
    // Use environment variable or generate a secure key
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateSecureKey();
  }

  /**
   * Generate a secure encryption key
   */
  generateSecureKey() {
    return crypto.randomBytes(this.keyLength);
  }

  /**
   * Encrypt sensitive payment data (mobile numbers, PINs)
   */
  encryptPaymentData(data) {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey, iv);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive payment data
   */
  decryptPaymentData(encryptedData) {
    try {
      const { encrypted, iv, tag } = encryptedData;
      const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey, Buffer.from(iv, 'hex'));
      
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Hash sensitive data for storage (one-way)
   */
  hashSensitiveData(data, salt = null) {
    const actualSalt = salt || crypto.randomBytes(this.saltLength);
    const hash = crypto.pbkdf2Sync(data, actualSalt, 100000, 64, 'sha512');
    
    return {
      hash: hash.toString('hex'),
      salt: actualSalt.toString('hex')
    };
  }

  /**
   * Verify hashed data
   */
  verifyHashedData(data, storedHash, salt) {
    const { hash } = this.hashSensitiveData(data, Buffer.from(salt, 'hex'));
    return hash === storedHash;
  }

  /**
   * Mask sensitive data for logging (show only partial information)
   */
  maskMobileNumber(mobileNumber) {
    if (!mobileNumber || mobileNumber.length < 4) return '****';
    return mobileNumber.substring(0, 3) + '*'.repeat(mobileNumber.length - 6) + mobileNumber.substring(mobileNumber.length - 3);
  }

  /**
   * Mask PIN for logging
   */
  maskPIN(pin) {
    return '*'.repeat(pin ? pin.length : 4);
  }

  /**
   * Generate secure transaction reference
   */
  generateSecureTransactionRef() {
    const timestamp = Date.now().toString();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    return `BKS${timestamp}${randomBytes}`.toUpperCase();
  }

  /**
   * Validate mobile number format for bKash
   */
  validateBkashMobileNumber(mobileNumber) {
    // Bangladesh mobile number format: +880XXXXXXXXX or 01XXXXXXXXX
    const bdMobileRegex = /^(\+880|880|0)?1[3-9]\d{8}$/;
    return bdMobileRegex.test(mobileNumber);
  }

  /**
   * Validate PIN format
   */
  validatePINFormat(pin) {
    // bKash PIN is typically 4-6 digits
    const pinRegex = /^\d{4,6}$/;
    return pinRegex.test(pin);
  }

  /**
   * Generate audit trail hash for integrity verification
   */
  generateAuditHash(auditData) {
    const dataString = JSON.stringify(auditData, Object.keys(auditData).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Verify audit trail integrity
   */
  verifyAuditIntegrity(auditData, storedHash) {
    const calculatedHash = this.generateAuditHash(auditData);
    return calculatedHash === storedHash;
  }

  /**
   * Generate CSRF token for booking operations
   */
  generateCSRFToken(userId, sessionId) {
    const timestamp = Date.now();
    const data = `${userId}:${sessionId}:${timestamp}`;
    const hash = crypto.createHmac('sha256', this.encryptionKey).update(data).digest('hex');
    
    return {
      token: `${timestamp}.${hash}`,
      expires: timestamp + (30 * 60 * 1000) // 30 minutes
    };
  }

  /**
   * Verify CSRF token
   */
  verifyCSRFToken(token, userId, sessionId) {
    try {
      const [timestamp, hash] = token.split('.');
      const now = Date.now();
      
      // Check if token is expired
      if (now > parseInt(timestamp) + (30 * 60 * 1000)) {
        return { valid: false, reason: 'Token expired' };
      }
      
      // Verify token integrity
      const data = `${userId}:${sessionId}:${timestamp}`;
      const expectedHash = crypto.createHmac('sha256', this.encryptionKey).update(data).digest('hex');
      
      if (hash !== expectedHash) {
        return { valid: false, reason: 'Invalid token' };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, reason: 'Malformed token' };
    }
  }

  /**
   * Rate limiting tracker
   */
  rateLimitTracker = new Map();

  /**
   * Check rate limit for booking operations
   */
  checkRateLimit(userId, operation = 'booking', windowMs = 60000, maxRequests = 5) {
    const key = `${userId}:${operation}`;
    const now = Date.now();
    
    if (!this.rateLimitTracker.has(key)) {
      this.rateLimitTracker.set(key, []);
    }
    
    const requests = this.rateLimitTracker.get(key);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return {
        allowed: false,
        retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000),
        remaining: 0
      };
    }
    
    // Add current request
    validRequests.push(now);
    this.rateLimitTracker.set(key, validRequests);
    
    return {
      allowed: true,
      remaining: maxRequests - validRequests.length
    };
  }

  /**
   * Sanitize input to prevent XSS and injection attacks
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/script/gi, '') // Remove script references
      .trim();
  }

  /**
   * Validate booking reference format
   */
  validateBookingReference(reference) {
    // Format: BK-YYYYMMDD-XXXXXX (BK-20241201-ABC123)
    const referenceRegex = /^BK-\d{8}-[A-Z0-9]{6}$/;
    return referenceRegex.test(reference);
  }

  /**
   * Generate secure booking reference
   */
  generateBookingReference() {
    const date = new Date();
    const dateStr = date.getFullYear().toString() + 
                   (date.getMonth() + 1).toString().padStart(2, '0') + 
                   date.getDate().toString().padStart(2, '0');
    
    const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
    
    return `BK-${dateStr}-${randomPart}`;
  }

  /**
   * Log security events for audit
   */
  logSecurityEvent(event, userId, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      userId,
      ip: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown',
      details: details.additionalInfo || {}
    };
    
    // In a production environment, this would be sent to a security monitoring system
    console.log('SECURITY_EVENT:', JSON.stringify(logEntry));
    
    return logEntry;
  }

  /**
   * Detect suspicious booking patterns
   */
  detectSuspiciousActivity(userId, bookingData) {
    const suspiciousIndicators = [];
    
    // Check for rapid booking attempts
    const rateLimit = this.checkRateLimit(userId, 'booking', 300000, 3); // 3 bookings per 5 minutes
    if (!rateLimit.allowed) {
      suspiciousIndicators.push('Rapid booking attempts detected');
    }
    
    // Check for unusual patterns in booking data
    if (bookingData.patientName && bookingData.patientName.length < 2) {
      suspiciousIndicators.push('Suspicious patient name format');
    }
    
    if (bookingData.medicalCondition && bookingData.medicalCondition.includes('<script')) {
      suspiciousIndicators.push('Potential XSS attempt in medical condition');
    }
    
    // Check for booking far in the future
    if (bookingData.scheduledDate) {
      const scheduledDate = new Date(bookingData.scheduledDate);
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      
      if (scheduledDate > sixMonthsFromNow) {
        suspiciousIndicators.push('Booking scheduled unusually far in future');
      }
    }
    
    return {
      isSuspicious: suspiciousIndicators.length > 0,
      indicators: suspiciousIndicators,
      riskLevel: suspiciousIndicators.length > 2 ? 'high' : 
                 suspiciousIndicators.length > 0 ? 'medium' : 'low'
    };
  }

  /**
   * Clean up rate limit tracker periodically
   */
  cleanupRateLimitTracker() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    for (const [key, requests] of this.rateLimitTracker.entries()) {
      const validRequests = requests.filter(timestamp => timestamp > oneHourAgo);
      
      if (validRequests.length === 0) {
        this.rateLimitTracker.delete(key);
      } else {
        this.rateLimitTracker.set(key, validRequests);
      }
    }
  }
}

module.exports = new SecurityUtils();