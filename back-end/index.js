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

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 RapidCare API server running on port ${PORT}`);
    console.log(`🏥 Emergency Care, Delivered Fast - Ready to serve critical medical needs`);
    console.log(`📊 Health check available at: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app; 