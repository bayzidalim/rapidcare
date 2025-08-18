const winston = require('winston');
const path = require('path');
const fs = require('fs');

/**
 * Production Logging Configuration
 * 
 * This module configures comprehensive logging for production environments
 * with proper log rotation, levels, and formatting.
 */

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}] ${message}`;
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    let log = `${timestamp} ${level} ${message}`;
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'rapidcare-api',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true
    }),
    
    // Application log file
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      level: 'info',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3
    })
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    requestId: req.id
  });
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger.log(logLevel, 'HTTP Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id,
      requestId: req.id
    });
  });
  
  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  logger.error('HTTP Error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    requestId: req.id,
    body: req.body,
    params: req.params,
    query: req.query
  });
  
  next(err);
};

// Database operation logger
const dbLogger = {
  query: (sql, params = []) => {
    if (process.env.LOG_LEVEL === 'debug') {
      logger.debug('Database Query', {
        sql: sql.replace(/\s+/g, ' ').trim(),
        params: params.length > 0 ? params : undefined
      });
    }
  },
  
  error: (error, sql, params = []) => {
    logger.error('Database Error', {
      error: error.message,
      sql: sql.replace(/\s+/g, ' ').trim(),
      params: params.length > 0 ? params : undefined,
      stack: error.stack
    });
  },
  
  transaction: (action, duration) => {
    logger.info('Database Transaction', {
      action,
      duration: `${duration}ms`
    });
  }
};

// Authentication logger
const authLogger = {
  login: (userId, email, ip, success = true) => {
    const level = success ? 'info' : 'warn';
    logger.log(level, 'User Login', {
      userId,
      email,
      ip,
      success,
      timestamp: new Date().toISOString()
    });
  },
  
  logout: (userId, email, ip) => {
    logger.info('User Logout', {
      userId,
      email,
      ip,
      timestamp: new Date().toISOString()
    });
  },
  
  tokenRefresh: (userId, ip, success = true) => {
    const level = success ? 'info' : 'warn';
    logger.log(level, 'Token Refresh', {
      userId,
      ip,
      success,
      timestamp: new Date().toISOString()
    });
  },
  
  unauthorized: (ip, userAgent, url) => {
    logger.warn('Unauthorized Access Attempt', {
      ip,
      userAgent,
      url,
      timestamp: new Date().toISOString()
    });
  }
};

// Payment logger
const paymentLogger = {
  initiated: (bookingId, userId, amount, paymentMethod) => {
    logger.info('Payment Initiated', {
      bookingId,
      userId,
      amount,
      paymentMethod,
      timestamp: new Date().toISOString()
    });
  },
  
  completed: (transactionId, bookingId, userId, amount) => {
    logger.info('Payment Completed', {
      transactionId,
      bookingId,
      userId,
      amount,
      timestamp: new Date().toISOString()
    });
  },
  
  failed: (transactionId, bookingId, userId, amount, reason) => {
    logger.error('Payment Failed', {
      transactionId,
      bookingId,
      userId,
      amount,
      reason,
      timestamp: new Date().toISOString()
    });
  },
  
  webhook: (event, data, success = true) => {
    const level = success ? 'info' : 'error';
    logger.log(level, 'Payment Webhook', {
      event,
      data,
      success,
      timestamp: new Date().toISOString()
    });
  }
};

// Booking logger
const bookingLogger = {
  created: (bookingId, userId, hospitalId, resourceType) => {
    logger.info('Booking Created', {
      bookingId,
      userId,
      hospitalId,
      resourceType,
      timestamp: new Date().toISOString()
    });
  },
  
  statusChanged: (bookingId, oldStatus, newStatus, changedBy) => {
    logger.info('Booking Status Changed', {
      bookingId,
      oldStatus,
      newStatus,
      changedBy,
      timestamp: new Date().toISOString()
    });
  },
  
  approved: (bookingId, hospitalId, approvedBy) => {
    logger.info('Booking Approved', {
      bookingId,
      hospitalId,
      approvedBy,
      timestamp: new Date().toISOString()
    });
  },
  
  declined: (bookingId, hospitalId, declinedBy, reason) => {
    logger.warn('Booking Declined', {
      bookingId,
      hospitalId,
      declinedBy,
      reason,
      timestamp: new Date().toISOString()
    });
  }
};

// Security logger
const securityLogger = {
  rateLimitExceeded: (ip, userAgent, endpoint) => {
    logger.warn('Rate Limit Exceeded', {
      ip,
      userAgent,
      endpoint,
      timestamp: new Date().toISOString()
    });
  },
  
  suspiciousActivity: (userId, ip, activity, details) => {
    logger.error('Suspicious Activity Detected', {
      userId,
      ip,
      activity,
      details,
      timestamp: new Date().toISOString()
    });
  },
  
  dataAccess: (userId, resource, action, success = true) => {
    logger.info('Data Access', {
      userId,
      resource,
      action,
      success,
      timestamp: new Date().toISOString()
    });
  }
};

// System logger
const systemLogger = {
  startup: (port, environment) => {
    logger.info('Application Started', {
      port,
      environment,
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    });
  },
  
  shutdown: (signal) => {
    logger.info('Application Shutdown', {
      signal,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  },
  
  healthCheck: (status, checks) => {
    const level = status === 'healthy' ? 'info' : 'error';
    logger.log(level, 'Health Check', {
      status,
      checks,
      timestamp: new Date().toISOString()
    });
  },
  
  migration: (filename, success = true, duration) => {
    const level = success ? 'info' : 'error';
    logger.log(level, 'Database Migration', {
      filename,
      success,
      duration: duration ? `${duration}ms` : undefined,
      timestamp: new Date().toISOString()
    });
  }
};

// Performance logger
const performanceLogger = {
  slowQuery: (sql, duration, params = []) => {
    logger.warn('Slow Database Query', {
      sql: sql.replace(/\s+/g, ' ').trim(),
      duration: `${duration}ms`,
      params: params.length > 0 ? params : undefined,
      timestamp: new Date().toISOString()
    });
  },
  
  slowRequest: (method, url, duration, statusCode) => {
    logger.warn('Slow HTTP Request', {
      method,
      url,
      duration: `${duration}ms`,
      statusCode,
      timestamp: new Date().toISOString()
    });
  },
  
  memoryUsage: (usage) => {
    logger.info('Memory Usage', {
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  logger,
  requestLogger,
  errorLogger,
  dbLogger,
  authLogger,
  paymentLogger,
  bookingLogger,
  securityLogger,
  systemLogger,
  performanceLogger
};