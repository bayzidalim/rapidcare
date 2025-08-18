# RapidCare Hospital Booking System - Troubleshooting Guide

## Table of Contents
1. [Common Issues](#common-issues)
2. [Frontend Issues](#frontend-issues)
3. [Backend Issues](#backend-issues)
4. [Database Issues](#database-issues)
5. [Authentication Issues](#authentication-issues)
6. [Payment Issues](#payment-issues)
7. [Performance Issues](#performance-issues)
8. [Deployment Issues](#deployment-issues)
9. [Network Issues](#network-issues)
10. [Monitoring and Debugging](#monitoring-and-debugging)

## Common Issues

### Application Won't Start

#### Symptoms
- Server fails to start
- Port already in use errors
- Module not found errors

#### Diagnosis
```bash
# Check if ports are already in use
netstat -tlnp | grep :3000  # Frontend port
netstat -tlnp | grep :5000  # Backend port

# Check Node.js version
node --version
npm --version

# Check for missing dependencies
npm list --depth=0
```

#### Solutions
```bash
# Kill processes using the ports
sudo kill -9 $(lsof -t -i:3000)
sudo kill -9 $(lsof -t -i:5000)

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Use different ports
export PORT=3001  # For frontend
export PORT=5001  # For backend
```

### Environment Variables Not Loading

#### Symptoms
- Configuration values are undefined
- API endpoints returning 500 errors
- Database connection failures

#### Diagnosis
```bash
# Check if .env files exist
ls -la back-end/.env
ls -la front-end/.env.local

# Verify environment variables are loaded
node -e "console.log(process.env.JWT_SECRET)"
```

#### Solutions
```bash
# Create missing environment files
cp back-end/.env.example back-end/.env
cp front-end/.env.example front-end/.env.local

# Verify file permissions
chmod 644 back-end/.env
chmod 644 front-end/.env.local

# Restart applications after changes
npm run dev
```

### CORS Errors

#### Symptoms
- Browser console shows CORS errors
- API requests blocked by browser
- "Access-Control-Allow-Origin" errors

#### Diagnosis
```bash
# Check browser developer tools console
# Look for CORS-related error messages

# Test API directly
curl -X GET http://localhost:5000/api/hospitals \
  -H "Origin: http://localhost:3000"
```

#### Solutions
```javascript
// back-end/index.js - Update CORS configuration
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-domain.com',
    'https://www.your-domain.com'
  ],
  credentials: true
}));
```

## Frontend Issues

### Next.js Build Failures

#### Symptoms
- Build process fails with errors
- TypeScript compilation errors
- Missing dependencies

#### Diagnosis
```bash
cd front-end

# Check for TypeScript errors
npx tsc --noEmit

# Check for ESLint errors
npm run lint

# Verbose build output
npm run build -- --debug
```

#### Solutions
```bash
# Clear Next.js cache
rm -rf .next

# Update dependencies
npm update

# Fix TypeScript errors
npx tsc --noEmit --skipLibCheck

# Disable strict mode temporarily
# In tsconfig.json: "strict": false
```

### Component Rendering Issues

#### Symptoms
- Components not displaying correctly
- Hydration mismatches
- CSS styles not applying

#### Diagnosis
```bash
# Check browser console for errors
# Look for hydration warnings

# Check CSS compilation
npm run build
```

#### Solutions
```javascript
// Fix hydration issues
import { useEffect, useState } from 'react';

const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

if (!mounted) return null;
```

### API Connection Issues

#### Symptoms
- API requests failing
- Network errors in browser
- Timeout errors

#### Diagnosis
```bash
# Check API URL configuration
echo $NEXT_PUBLIC_API_URL

# Test API connectivity
curl -X GET $NEXT_PUBLIC_API_URL/health
```

#### Solutions
```bash
# Update API URL in environment
# front-end/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Add error handling to API calls
try {
  const response = await fetch('/api/endpoint');
  if (!response.ok) throw new Error('API Error');
} catch (error) {
  console.error('API Error:', error);
}
```

### Authentication State Issues

#### Symptoms
- User login state not persisting
- Automatic logouts
- Token refresh failures

#### Diagnosis
```bash
# Check localStorage in browser
# Application > Storage > Local Storage

# Check token expiration
# Decode JWT token to check exp claim
```

#### Solutions
```javascript
// Implement proper token refresh
const refreshToken = async () => {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('refreshToken')}`
      }
    });
    
    if (response.ok) {
      const { token } = await response.json();
      localStorage.setItem('token', token);
      return token;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    // Redirect to login
  }
};
```

## Backend Issues

### Database Connection Failures

#### Symptoms
- "Database is locked" errors
- Connection timeout errors
- Migration failures

#### Diagnosis
```bash
cd back-end

# Check database file permissions
ls -la database.sqlite

# Test database connection
node -e "
const db = require('./config/database');
console.log('Database connected successfully');
"

# Check for database locks
lsof database.sqlite
```

#### Solutions
```bash
# Fix database permissions
chmod 664 database.sqlite

# Kill processes locking database
sudo kill -9 $(lsof -t database.sqlite)

# Backup and recreate database
cp database.sqlite database.backup.sqlite
rm database.sqlite
npm run migrate
```

### API Endpoint Errors

#### Symptoms
- 500 Internal Server Error
- Route not found errors
- Middleware errors

#### Diagnosis
```bash
# Check server logs
tail -f logs/app.log

# Test specific endpoints
curl -X GET http://localhost:5000/api/hospitals
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

#### Solutions
```javascript
// Add proper error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// Add request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});
```

### JWT Token Issues

#### Symptoms
- "Invalid token" errors
- Token verification failures
- Expired token errors

#### Diagnosis
```bash
# Check JWT secret configuration
echo $JWT_SECRET

# Decode JWT token (use online JWT decoder)
# Check token expiration and claims
```

#### Solutions
```javascript
// Implement proper token validation
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(400).json({ error: 'Invalid token' });
  }
};
```

## Database Issues

### Migration Failures

#### Symptoms
- Migration scripts fail to run
- Database schema inconsistencies
- Foreign key constraint errors

#### Diagnosis
```bash
cd back-end

# Check migration status
sqlite3 database.sqlite "SELECT * FROM migrations;"

# Check database schema
sqlite3 database.sqlite ".schema"

# Check for constraint violations
sqlite3 database.sqlite "PRAGMA foreign_key_check;"
```

#### Solutions
```bash
# Reset database (development only)
rm database.sqlite
npm run migrate

# Run specific migration
node migrations/001_hospital_approval_system.js

# Fix constraint violations
sqlite3 database.sqlite "PRAGMA foreign_keys = OFF;"
# Fix data issues
sqlite3 database.sqlite "PRAGMA foreign_keys = ON;"
```

### Data Integrity Issues

#### Symptoms
- Orphaned records
- Constraint violation errors
- Data inconsistencies

#### Diagnosis
```sql
-- Check for orphaned bookings
SELECT b.id, b.userId, b.hospitalId 
FROM bookings b 
LEFT JOIN users u ON b.userId = u.id 
LEFT JOIN hospitals h ON b.hospitalId = h.id 
WHERE u.id IS NULL OR h.id IS NULL;

-- Check resource consistency
SELECT hospitalId, resourceType, total, available, occupied 
FROM hospital_resources 
WHERE total < (available + occupied);
```

#### Solutions
```sql
-- Clean up orphaned records
DELETE FROM bookings 
WHERE userId NOT IN (SELECT id FROM users);

-- Fix resource counts
UPDATE hospital_resources 
SET available = total - occupied 
WHERE available + occupied > total;
```

### Performance Issues

#### Symptoms
- Slow query execution
- Database locks
- High CPU usage

#### Diagnosis
```sql
-- Analyze query performance
EXPLAIN QUERY PLAN SELECT * FROM bookings WHERE status = 'pending';

-- Check database size
SELECT 
  page_count * page_size as size_bytes,
  page_count,
  page_size
FROM pragma_page_count(), pragma_page_size();
```

#### Solutions
```sql
-- Add missing indexes
CREATE INDEX idx_bookings_status_hospital ON bookings(status, hospitalId);
CREATE INDEX idx_notifications_user_read ON booking_notifications(userId, isRead);

-- Optimize database
VACUUM;
ANALYZE;

-- Enable WAL mode for better concurrency
PRAGMA journal_mode = WAL;
```

## Authentication Issues

### Login Failures

#### Symptoms
- Invalid credentials errors
- Password hash mismatches
- Account lockouts

#### Diagnosis
```bash
# Check user exists in database
sqlite3 back-end/database.sqlite "SELECT id, email, role FROM users WHERE email = 'user@example.com';"

# Test password hashing
node -e "
const bcrypt = require('bcryptjs');
console.log(bcrypt.compareSync('password', 'stored_hash'));
"
```

#### Solutions
```javascript
// Reset user password
const bcrypt = require('bcryptjs');
const hashedPassword = bcrypt.hashSync('newpassword', 10);

// Update in database
db.prepare('UPDATE users SET password = ? WHERE email = ?')
  .run(hashedPassword, 'user@example.com');
```

### Session Management Issues

#### Symptoms
- Users logged out unexpectedly
- Session persistence problems
- Multiple login issues

#### Diagnosis
```bash
# Check token expiration settings
grep -r "expiresIn" back-end/

# Check session storage
# Browser > Application > Local Storage
```

#### Solutions
```javascript
// Implement refresh token mechanism
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};
```

### Role-Based Access Issues

#### Symptoms
- Unauthorized access errors
- Permission denied messages
- Role verification failures

#### Diagnosis
```bash
# Check user roles in database
sqlite3 back-end/database.sqlite "SELECT id, email, role FROM users;"

# Check middleware implementation
grep -r "role" back-end/middleware/
```

#### Solutions
```javascript
// Fix role-based middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Usage
app.get('/api/admin/users', verifyToken, requireRole(['admin']), getUsersController);
```

## Payment Issues

### bKash Integration Problems

#### Symptoms
- Payment gateway errors
- Transaction failures
- Webhook not receiving data

#### Diagnosis
```bash
# Check bKash configuration
echo $BKASH_APP_KEY
echo $BKASH_BASE_URL

# Test bKash API connectivity
curl -X POST https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/token/grant \
  -H "Content-Type: application/json" \
  -d '{
    "app_key":"'$BKASH_APP_KEY'",
    "app_secret":"'$BKASH_APP_SECRET'"
  }'
```

#### Solutions
```javascript
// Add proper error handling for payments
const processPayment = async (paymentData) => {
  try {
    const response = await fetch(bkashConfig.baseUrl + '/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-APP-Key': bkashConfig.appKey
      },
      body: JSON.stringify(paymentData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Payment failed: ${error.errorMessage}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Payment processing error:', error);
    throw error;
  }
};
```

### Transaction Status Issues

#### Symptoms
- Payment status not updating
- Duplicate transactions
- Reconciliation mismatches

#### Diagnosis
```sql
-- Check transaction status distribution
SELECT status, COUNT(*) FROM transactions GROUP BY status;

-- Check for duplicate transactions
SELECT gatewayTransactionId, COUNT(*) 
FROM transactions 
WHERE gatewayTransactionId IS NOT NULL 
GROUP BY gatewayTransactionId 
HAVING COUNT(*) > 1;
```

#### Solutions
```javascript
// Implement idempotency for payments
const createTransaction = async (transactionData) => {
  const existingTransaction = await db.prepare(
    'SELECT * FROM transactions WHERE gatewayTransactionId = ?'
  ).get(transactionData.gatewayTransactionId);
  
  if (existingTransaction) {
    return existingTransaction;
  }
  
  return await db.prepare(`
    INSERT INTO transactions (bookingId, amount, gatewayTransactionId, status)
    VALUES (?, ?, ?, ?)
  `).run(
    transactionData.bookingId,
    transactionData.amount,
    transactionData.gatewayTransactionId,
    'pending'
  );
};
```

## Performance Issues

### Slow API Responses

#### Symptoms
- High response times
- Timeout errors
- Poor user experience

#### Diagnosis
```bash
# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5000/api/hospitals

# Create curl-format.txt:
echo "     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n" > curl-format.txt
```

#### Solutions
```javascript
// Add database query optimization
const getHospitals = async (filters) => {
  let query = `
    SELECT h.*, 
           hr.total as beds_total,
           hr.available as beds_available
    FROM hospitals h
    LEFT JOIN hospital_resources hr ON h.id = hr.hospitalId AND hr.resourceType = 'beds'
    WHERE h.status = 'approved'
  `;
  
  // Add indexes for better performance
  // CREATE INDEX idx_hospitals_status ON hospitals(status);
  // CREATE INDEX idx_resources_hospital_type ON hospital_resources(hospitalId, resourceType);
  
  return db.prepare(query).all();
};

// Implement caching
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

const getCachedHospitals = async () => {
  const cacheKey = 'hospitals_list';
  let hospitals = cache.get(cacheKey);
  
  if (!hospitals) {
    hospitals = await getHospitals();
    cache.set(cacheKey, hospitals);
  }
  
  return hospitals;
};
```

### Memory Leaks

#### Symptoms
- Increasing memory usage over time
- Application crashes
- Out of memory errors

#### Diagnosis
```bash
# Monitor memory usage
ps aux | grep node
top -p $(pgrep node)

# Use Node.js memory profiling
node --inspect index.js
# Open chrome://inspect in Chrome
```

#### Solutions
```javascript
// Fix common memory leaks
// 1. Remove event listeners
const cleanup = () => {
  process.removeAllListeners('SIGINT');
  process.removeAllListeners('SIGTERM');
};

// 2. Clear intervals and timeouts
const intervalId = setInterval(() => {}, 1000);
clearInterval(intervalId);

// 3. Close database connections properly
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});
```

### Database Performance

#### Symptoms
- Slow database queries
- High CPU usage
- Database locks

#### Diagnosis
```sql
-- Check slow queries
EXPLAIN QUERY PLAN SELECT * FROM bookings 
WHERE status = 'pending' AND hospitalId = 1;

-- Check database statistics
SELECT name, COUNT(*) as row_count 
FROM sqlite_master m, pragma_table_info(m.name) 
WHERE m.type = 'table' 
GROUP BY name;
```

#### Solutions
```sql
-- Add missing indexes
CREATE INDEX idx_bookings_status_hospital ON bookings(status, hospitalId);
CREATE INDEX idx_bookings_user_status ON bookings(userId, status);
CREATE INDEX idx_notifications_user_read ON booking_notifications(userId, isRead);

-- Optimize database
VACUUM;
ANALYZE;
REINDEX;

-- Enable WAL mode
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
```

## Deployment Issues

### Docker Container Problems

#### Symptoms
- Container fails to start
- Port binding errors
- Volume mounting issues

#### Diagnosis
```bash
# Check container logs
docker logs container_name

# Check container status
docker ps -a

# Inspect container configuration
docker inspect container_name
```

#### Solutions
```bash
# Fix port conflicts
docker run -p 3001:3000 your-image

# Fix volume permissions
sudo chown -R 1000:1000 ./data
docker run -v $(pwd)/data:/app/data your-image

# Rebuild container
docker build --no-cache -t your-image .
```

### SSL Certificate Issues

#### Symptoms
- SSL certificate errors
- HTTPS not working
- Certificate expiration warnings

#### Diagnosis
```bash
# Check certificate validity
openssl x509 -in certificate.crt -text -noout

# Test SSL connection
openssl s_client -connect your-domain.com:443

# Check certificate expiration
openssl x509 -in certificate.crt -noout -dates
```

#### Solutions
```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Update certificate in Nginx
sudo cp new-certificate.crt /etc/ssl/certs/
sudo cp new-private.key /etc/ssl/private/
sudo systemctl reload nginx

# Test SSL configuration
sudo nginx -t
```

### Load Balancer Issues

#### Symptoms
- Uneven load distribution
- Health check failures
- Session persistence problems

#### Diagnosis
```bash
# Check backend server status
curl -f http://backend1:5000/api/health
curl -f http://backend2:5000/api/health

# Check load balancer logs
tail -f /var/log/nginx/access.log
```

#### Solutions
```nginx
# Fix Nginx load balancing
upstream backend {
    least_conn;
    server backend1:5000 max_fails=3 fail_timeout=30s;
    server backend2:5000 max_fails=3 fail_timeout=30s;
}

# Add health checks
location /api/health {
    access_log off;
    proxy_pass http://backend;
    proxy_set_header Host $host;
}
```

## Network Issues

### API Connectivity Problems

#### Symptoms
- Network timeout errors
- Connection refused errors
- DNS resolution failures

#### Diagnosis
```bash
# Test network connectivity
ping api.your-domain.com
telnet api.your-domain.com 443

# Check DNS resolution
nslookup api.your-domain.com
dig api.your-domain.com

# Test API endpoints
curl -v https://api.your-domain.com/api/health
```

#### Solutions
```bash
# Fix DNS issues
echo "nameserver 8.8.8.8" >> /etc/resolv.conf

# Check firewall rules
sudo ufw status
sudo iptables -L

# Test with different network
curl --interface eth1 https://api.your-domain.com/api/health
```

### CORS and Security Headers

#### Symptoms
- CORS policy errors
- Security header warnings
- Content Security Policy violations

#### Diagnosis
```bash
# Check response headers
curl -I https://your-domain.com

# Test CORS
curl -H "Origin: https://different-domain.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS https://api.your-domain.com/api/bookings
```

#### Solutions
```javascript
// Fix CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://your-domain.com',
      'https://www.your-domain.com',
      'http://localhost:3000'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Add security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
```

## Monitoring and Debugging

### Log Analysis

#### Common Log Patterns
```bash
# Find error patterns
grep -i "error" logs/app.log | tail -20

# Find specific user issues
grep "userId: 123" logs/app.log

# Find payment issues
grep -i "payment\|transaction" logs/app.log

# Find database issues
grep -i "database\|sqlite" logs/app.log
```

#### Log Rotation Setup
```bash
# Configure logrotate
sudo nano /etc/logrotate.d/rapidcare

/path/to/rapidcare/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Performance Monitoring

#### System Monitoring
```bash
# Monitor system resources
htop
iotop
nethogs

# Monitor disk usage
df -h
du -sh /path/to/rapidcare/*

# Monitor network connections
netstat -tulpn
ss -tulpn
```

#### Application Monitoring
```bash
# Monitor PM2 processes
pm2 monit
pm2 status
pm2 logs --lines 100

# Monitor database performance
sqlite3 database.sqlite "PRAGMA optimize;"
```

### Debugging Tools

#### Backend Debugging
```javascript
// Add debug logging
const debug = require('debug')('rapidcare:api');

app.use((req, res, next) => {
  debug(`${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    headers: req.headers
  });
  next();
});

// Add error tracking
const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'your-sentry-dsn' });

app.use(Sentry.Handlers.errorHandler());
```

#### Frontend Debugging
```javascript
// Add error boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}
```

### Health Checks

#### Comprehensive Health Check
```javascript
// back-end/routes/health.js
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  };

  try {
    // Test database connection
    const dbTest = db.prepare('SELECT 1').get();
    health.database = 'connected';
    
    // Test external services
    const bkashTest = await fetch(process.env.BKASH_BASE_URL + '/health');
    health.paymentGateway = bkashTest.ok ? 'connected' : 'disconnected';
    
    res.json(health);
  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
    res.status(503).json(health);
  }
});
```

---

This troubleshooting guide covers the most common issues you might encounter with the RapidCare system. For issues not covered here, please check the application logs and contact the development team with specific error messages and steps to reproduce the problem.