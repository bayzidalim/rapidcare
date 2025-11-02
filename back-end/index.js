const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import database
const db = require('./config/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
console.log('RapidCare: Connected to SQLite database');

// Run startup validation for hospital authorities
const runStartupValidation = require('./scripts/startup-validation');
runStartupValidation().then(success => {
  if (success) {
    console.log('✅ Hospital authority validation completed successfully');
  } else {
    console.log('⚠️  Hospital authority validation completed with issues');
  }
}).catch(error => {
  console.error('❌ Error during hospital authority validation:', error);
});

// Initialize admin balance
const AdminBalanceService = require('./services/adminBalanceService');
AdminBalanceService.initializeAdminBalance().then(result => {
  if (result.success) {
    console.log('✅ Admin balance initialized successfully');
  } else {
    console.log('⚠️  Admin balance initialization:', result.message);
  }
}).catch(error => {
  console.error('❌ Error initializing admin balance:', error);
});

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
app.use('/api/audit', require('./routes/audit'));
app.use('/api/reviews', require('./routes/reviews'));
// Initialize reconciliation routes
const { router: reconciliationRouter, initializeReconciliationService } = require('./routes/reconciliation');
initializeReconciliationService(db);
app.use('/api/reconciliation', reconciliationRouter);

// Initialize sample collection routes
const { router: sampleCollectionRouter, initializeSampleCollectionService } = require('./routes/sampleCollection');
initializeSampleCollectionService(db);
app.use('/api/sample-collection', sampleCollectionRouter);

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
app.use((err, req, res, _next) => {
  // Handle JSON parsing errors specifically
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format in request body'
    });
  }
  
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
  
  // Start server with graceful EADDRINUSE fallback
  const startServer = (portToUse) => {
    const server = app.listen(portToUse, () => {
      console.log(`🚀 RapidCare API server running on port ${portToUse}`);
      console.log(`🏥 Emergency Care, Delivered Fast - Ready to serve critical medical needs`);
      console.log(`📊 Health check available at: http://localhost:${portToUse}/api/health`);
      console.log(`💰 Financial reconciliation scheduler started`);
    });

    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        const nextPort = Number(portToUse) + 1;
        console.warn(`⚠️  Port ${portToUse} in use, retrying on ${nextPort}...`);
        startServer(nextPort);
      } else {
        console.error('Failed to start server:', err);
      }
    });
  };

  startServer(PORT);

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