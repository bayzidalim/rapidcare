const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Environment variable validation
const requiredEnvVars = ['JWT_SECRET', 'NODE_ENV'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env file and ensure all required variables are set.');
  process.exit(1);
}

// Validate JWT_SECRET strength in production
if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters long in production');
  process.exit(1);
}

console.log('✅ Environment variables validated successfully');

// Import database
const db = require('./config/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'RapidCare API is running - Emergency Care, Delivered Fast',
    service: 'RapidCare',
    timestamp: new Date().toISOString()
  });
});

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
  // Start reconciliation scheduler
  reconciliationScheduler = new ReconciliationScheduler(db);
  reconciliationScheduler.startAll();
  
  app.listen(PORT, () => {
    console.log(`🚀 RapidCare API server running on port ${PORT}`);
    console.log(`🏥 Emergency Care, Delivered Fast - Ready to serve critical medical needs`);
    console.log(`📊 Health check available at: http://localhost:${PORT}/api/health`);
    console.log(`💰 Financial reconciliation scheduler started`);
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