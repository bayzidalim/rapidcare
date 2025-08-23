const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Environment variable validation
const validateEnvironment = () => {
  const requiredEnvVars = ['JWT_SECRET', 'NODE_ENV'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
    console.error('Please check your .env file and ensure all required variables are set.');
    console.error('Required variables:');
    requiredEnvVars.forEach(envVar => {
      const status = process.env[envVar] ? '✅' : '❌';
      console.error(`  ${status} ${envVar}`);
    });
    return false;
  }

  // Validate JWT_SECRET strength in production
  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters long in production');
    console.error('Current length:', process.env.JWT_SECRET.length);
    return false;
  }

  // Validate PORT
  const port = process.env.PORT || 5000;
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error('❌ Invalid PORT value:', process.env.PORT);
    return false;
  }

  // Validate FRONTEND_URL in production
  if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
    console.warn('⚠️  FRONTEND_URL not set in production - CORS may not work properly');
  }

  return true;
};

if (!validateEnvironment()) {
  console.error('💥 Environment validation failed. Application cannot start.');
  process.exit(1);
}

console.log('✅ Environment variables validated successfully');

// Import database
const { db, dbPromise } = require('./config/database');

const app = express();

// CORS Configuration for production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',  // Development frontend
      'http://localhost:3001',  // Alternative development port
      process.env.FRONTEND_URL, // Production frontend URL
    ].filter(Boolean); // Remove undefined values
    
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
console.log('RapidCare: Connected to SQLite database');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/hospitals', require('./routes/hospitals'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/blood', require('./routes/blood'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/pricing', require('./routes/pricing'));
app.use('/api/revenue', require('./routes/revenue'));
app.use('/api/polling', require('./routes/polling'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/hospital-resources', require('./routes/hospitalResources'));
app.use('/api/audit', require('./routes/audit'));
// Initialize reconciliation routes
const { router: reconciliationRouter, initializeReconciliationService } = require('./routes/reconciliation');
initializeReconciliationService(db);
app.use('/api/reconciliation', reconciliationRouter);
app.use('/api/security', require('./routes/security'));

// Health check routes (comprehensive monitoring)
app.use('/api', require('./routes/health'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('RapidCare API Error:', err.stack);
  res.status(500).json({ 
    error: 'We\'re experiencing technical difficulties. Our team has been notified.',
    service: 'RapidCare',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

// Initialize reconciliation scheduler
const ReconciliationScheduler = require('./jobs/reconciliationScheduler');
let reconciliationScheduler;

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  // Wait for database initialization before starting server
  dbPromise.then(() => {
    // Start reconciliation scheduler
    reconciliationScheduler = new ReconciliationScheduler(db);
    reconciliationScheduler.startAll();
    
    app.listen(PORT, () => {
      console.log(`🚀 RapidCare API server running on port ${PORT}`);
      console.log(`🏥 Emergency Care, Delivered Fast - Ready to serve critical medical needs`);
      console.log(`📊 Health check available at: http://localhost:${PORT}/api/health`);
      console.log(`💰 Financial reconciliation scheduler started`);
    });
  }).catch((error) => {
    console.error('💥 Failed to start server due to database initialization error:', error.message);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    if (reconciliationScheduler) {
      reconciliationScheduler.stopAll();
    }
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    if (reconciliationScheduler) {
      reconciliationScheduler.stopAll();
    }
    process.exit(0);
  });
}

module.exports = app;
