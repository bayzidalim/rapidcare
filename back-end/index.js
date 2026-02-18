const express = require('express');
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

// Import database
const connectDB = require('./config/database');

const app = express();

// Middleware
// Configure CORS to allow requests from frontend
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : [];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. curl, server-to-server)
    if (!origin) return callback(null, true);
    // Check exact match from env
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any Vercel preview deployment for the project
    if (origin.match(/^https:\/\/rapidcare[a-z0-9-]*\.vercel\.app$/)) return callback(null, true);
    // Allow localhost for development
    if (origin.match(/^http:\/\/localhost:\d+$/)) return callback(null, true);
    // Fallback: if no FRONTEND_URL set, allow all
    if (allowedOrigins.length === 0) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

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
// app.use('/api/audit', require('./routes/audit'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/social', require('./routes/social'));
app.use('/api/security', require('./routes/security'));
app.use('/api/setup', require('./routes/setup'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.json({ 
    status: 'OK', 
    message: 'RapidCare API is running - Emergency Care, Delivered Fast',
    service: 'RapidCare',
    database: dbStatus[dbState] || 'unknown',
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
  
  console.error('RapidCare API Error:', err);
  console.error('Error stack:', err.stack);
  console.error('Request details:', {
    method: req.method,
    url: req.url,
    body: req.body,
    params: req.params,
    user: req.user ? { id: req.user.id, userType: req.user.userType } : null
  });
  _next();
  
  // Return detailed error in development, generic in production
  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  
  res.status(err.status || 500).json({ 
    success: false,
    error: isDevelopment ? err.message : 'We\'re experiencing technical difficulties. Our team has been notified.',
    details: isDevelopment ? {
      message: err.message,
      stack: err.stack,
      code: err.code
    } : undefined,
    service: 'RapidCare',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

// Initialize reconciliation scheduler
const ReconciliationScheduler = require('./jobs/reconciliationScheduler');
let reconciliationScheduler;
let server;

// Start server function
const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();
    console.log('✅ Database connection established successfully');

    // Start server with graceful EADDRINUSE fallback
    const listen = (portToUse) => {
      server = app.listen(portToUse, '0.0.0.0', () => {
        console.log(`🚀 RapidCare API server running on 0.0.0.0:${portToUse}`);
        console.log(`🏥 Emergency Care, Delivered Fast - Ready to serve critical medical needs`);
        console.log(`📊 Health check available at: http://localhost:${portToUse}/api/health`);
        console.log(`💰 Financial reconciliation scheduler started`);
      });

      server.on('error', (err) => {
        if (err && err.code === 'EADDRINUSE') {
          const nextPort = Number(portToUse) + 1;
          console.warn(`⚠️  Port ${portToUse} in use, retrying on ${nextPort}...`);
          listen(nextPort);
        } else {
          console.error('Failed to start server:', err);
          process.exit(1);
        }
      });
    };

    // Only start server if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      listen(PORT);
      
      // Initialize scheduler after server starts (optional, but good practice)
      // reconciliationScheduler = new ReconciliationScheduler(mongoose.connection); // Assuming it takes connection or creates its own
      // reconciliationScheduler.startAll();
    }
  } catch (error) {
    console.error('❌ Failed to start server due to database connection error:', error);
    process.exit(1);
  }
};

// Start the application
startServer();

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`${signal} received, shutting down gracefully`);
  
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
    });
  }

  if (reconciliationScheduler) {
    reconciliationScheduler.stopAll();
  }

  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('Error closing MongoDB connection:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app; 