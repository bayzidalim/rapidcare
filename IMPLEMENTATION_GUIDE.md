# 🔧 RapidCare - Critical Fixes Implementation Guide

**Step-by-step implementation guide for the most critical issues.**

---

## 1. Adding Basic Tests

### Backend Tests Setup

#### Step 1: Create Test Structure
```bash
cd back-end
mkdir -p tests/unit/services
mkdir -p tests/integration
```

#### Step 2: Create User Service Test
**File:** `back-end/tests/unit/services/userService.test.js`

```javascript
const { expect } = require('chai');
const UserService = require('../../../services/userService');
const db = require('../../../config/database');

describe('UserService', () => {
  beforeEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM users WHERE email LIKE ?').run('%@test.com');
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@test.com',
        password: 'Test@123',
        name: 'Test User',
        phone: '1234567890',
        userType: 'user'
      };

      const user = await UserService.register(userData);

      expect(user).to.have.property('id');
      expect(user.email).to.equal('test@test.com');
      expect(user.name).to.equal('Test User');
      expect(user).to.not.have.property('password'); // Password should not be returned
    });

    it('should reject duplicate email', async () => {
      const userData = {
        email: 'duplicate@test.com',
        password: 'Test@123',
        name: 'Test User',
        phone: '1234567890',
        userType: 'user'
      };

      await UserService.register(userData);

      try {
        await UserService.register(userData);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('already exists');
      }
    });
  });

  describe('login', () => {
    it('should login with correct credentials', async () => {
      // First register a user
      await UserService.register({
        email: 'login@test.com',
        password: 'Test@123',
        name: 'Login Test',
        phone: '1234567890',
        userType: 'user'
      });

      const result = await UserService.login('login@test.com', 'Test@123');

      expect(result).to.have.property('token');
      expect(result).to.have.property('user');
      expect(result.user.email).to.equal('login@test.com');
    });

    it('should reject invalid password', async () => {
      await UserService.register({
        email: 'wrongpass@test.com',
        password: 'Test@123',
        name: 'Test User',
        phone: '1234567890',
        userType: 'user'
      });

      try {
        await UserService.login('wrongpass@test.com', 'WrongPassword');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('Invalid email or password');
      }
    });
  });
});
```

#### Step 3: Create Integration Test
**File:** `back-end/tests/integration/auth.test.js`

```javascript
const request = require('supertest');
const { expect } = require('chai');
const app = require('../../index');
const db = require('../../config/database');

describe('Auth API Integration Tests', () => {
  beforeEach(() => {
    db.prepare('DELETE FROM users WHERE email LIKE ?').run('%@integration.com');
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@integration.com',
          password: 'Test@123456',
          name: 'New User',
          phone: '1234567890',
          userType: 'user'
        });

      expect(response.status).to.equal(201);
      expect(response.body.success).to.be.true;
      expect(response.body.data.user).to.have.property('id');
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'weak@integration.com',
          password: '123', // Too weak
          name: 'Weak Password User',
          userType: 'user'
        });

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login existing user', async () => {
      // First register
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'logintest@integration.com',
          password: 'Test@123456',
          name: 'Login Test',
          userType: 'user'
        });

      // Then login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@integration.com',
          password: 'Test@123456'
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('token');
    });
  });
});
```

#### Step 4: Run Tests
```bash
npm test
```

---

### Frontend Tests Setup

#### Step 1: Create Test Structure
```bash
cd front-end
mkdir -p src/__tests__/components
mkdir -p src/__tests__/lib
```

#### Step 2: Create Component Test
**File:** `front-end/src/__tests__/components/Navbar.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navbar from '@/components/Navbar';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
  }),
  usePathname: () => '/',
}));

describe('Navbar Component', () => {
  it('renders navigation links', () => {
    render(<Navbar />);
    
    expect(screen.getByText(/RapidCare/i)).toBeInTheDocument();
    expect(screen.getByText(/Hospitals/i)).toBeInTheDocument();
    expect(screen.getByText(/Blood Donation/i)).toBeInTheDocument();
  });

  it('shows login button when not authenticated', () => {
    render(<Navbar />);
    
    expect(screen.getByText(/Login/i)).toBeInTheDocument();
  });
});
```

#### Step 3: Create API Test
**File:** `front-end/src/__tests__/lib/api.test.ts`

```typescript
import { hospitalAPI } from '@/lib/api';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Hospital API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch all hospitals', async () => {
    const mockHospitals = [
      { id: 1, name: 'Test Hospital 1' },
      { id: 2, name: 'Test Hospital 2' },
    ];

    mockedAxios.get.mockResolvedValue({
      data: { success: true, data: mockHospitals }
    });

    const result = await hospitalAPI.getAll();
    
    expect(result.data.data).toEqual(mockHospitals);
    expect(mockedAxios.get).toHaveBeenCalledWith('/hospitals');
  });
});
```

---

## 2. Security Hardening

### Password Strength Validation

#### Backend Implementation
**File:** `back-end/utils/passwordValidator.js`

```javascript
/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {object} - { valid: boolean, errors: string[] }
 */
function validatePassword(password) {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = { validatePassword };
```

#### Update Auth Controller
**File:** `back-end/controllers/authController.js`

```javascript
const { validatePassword } = require('../utils/passwordValidator');

exports.register = async (req, res) => {
  try {
    const { email, password, name, phone, userType, hospital } = req.body;

    // Validate required fields
    if (!email || !password || !name || !userType) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, name, and userType are required'
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Password does not meet requirements',
        details: passwordValidation.errors
      });
    }

    // ... rest of the code
  } catch (error) {
    // ... error handling
  }
};
```

#### Frontend Validation
**File:** `front-end/src/lib/passwordValidator.ts`

```typescript
export interface PasswordValidation {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }
  
  // Calculate strength
  const criteriasMet = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
  if (password.length >= 12 && criteriasMet === 4) {
    strength = 'strong';
  } else if (password.length >= 8 && criteriasMet >= 3) {
    strength = 'medium';
  }
  
  return {
    valid: errors.length === 0,
    errors,
    strength
  };
}
```

---

### Rate Limiting

#### Install Dependencies
```bash
cd back-end
npm install express-rate-limit --save
```

#### Create Rate Limiter
**File:** `back-end/middleware/rateLimiter.js`

```javascript
const rateLimit = require('express-rate-limit');

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    error: 'Too many login attempts. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: true,
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for password reset
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: {
    success: false,
    error: 'Too many password reset attempts. Please try again after 1 hour.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
});

module.exports = {
  authLimiter,
  apiLimiter,
  passwordResetLimiter
};
```

#### Apply to Routes
**File:** `back-end/routes/auth.js`

```javascript
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Apply rate limiting to auth endpoints
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/change-password', authenticate, authController.changePassword);

module.exports = router;
```

---

### CORS Configuration

#### Update CORS Settings
**File:** `back-end/index.js`

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000', // Always allow local development
];

// Add production URL if exists
if (process.env.PRODUCTION_FRONTEND_URL) {
  allowedOrigins.push(process.env.PRODUCTION_FRONTEND_URL);
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Rest of your code...
```

---

### JWT Secret Validation

#### Update Config
**File:** `back-end/config/config.js`

```javascript
require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET;
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

// Validate JWT secret
if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required');
}

if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long for security');
}

// Check for default/weak secrets
const weakSecrets = [
  'your-super-secure-jwt-secret-key-change-this-in-production',
  'secret',
  'jwt-secret',
  'change-me'
];

if (weakSecrets.includes(jwtSecret.toLowerCase())) {
  console.error('⚠️  CRITICAL SECURITY WARNING: Using a weak/default JWT_SECRET!');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot use default JWT_SECRET in production environment');
  }
}

module.exports = {
  jwtSecret,
  jwtExpiresIn,
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
};
```

---

## 3. Deployment Guide

### Frontend Deployment (Vercel)

#### Step 1: Prepare for Deployment
```bash
cd front-end

# Test production build locally
npm run build
npm run start

# If successful, commit changes
git add .
git commit -m "Prepare for deployment"
git push origin main
```

#### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with GitHub
3. Click "New Project"
4. Import your repository
5. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `front-end`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

#### Step 3: Environment Variables
Add in Vercel dashboard:
```
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com/api
```

#### Step 4: Deploy
- Click "Deploy"
- Wait for build to complete
- Copy deployment URL

---

### Backend Deployment (Render)

#### Step 1: Prepare for Deployment
```bash
cd back-end

# Test that it starts correctly
npm start

# Commit changes
git add .
git commit -m "Prepare backend for deployment"
git push origin main
```

#### Step 2: Deploy to Render
1. Go to [render.com](https://render.com)
2. Sign up/Login with GitHub
3. Click "New +" → "Web Service"
4. Connect your repository
5. Configure:
   - **Name:** rapidcare-backend
   - **Root Directory:** `back-end`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

#### Step 3: Environment Variables
Add in Render dashboard:
```
NODE_ENV=production
PORT=5000
JWT_SECRET=<generate-strong-secret-here>
FRONTEND_URL=https://your-frontend-url.vercel.app
```

**Generate strong JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Step 4: Deploy
- Click "Create Web Service"
- Wait for deployment
- Copy service URL

#### Step 5: Update Frontend
Go back to Vercel:
1. Settings → Environment Variables
2. Update `NEXT_PUBLIC_API_URL` with Render URL
3. Redeploy frontend

---

## 4. Logging Setup

### Install Winston
```bash
cd back-end
npm install winston --save
```

### Create Logger
**File:** `back-end/utils/logger.js`

```javascript
const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'rapidcare-api' },
  transports: [
    // Write errors to error.log
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

module.exports = logger;
```

### Create logs directory
```bash
mkdir -p back-end/logs
echo "logs/" >> back-end/.gitignore
```

### Replace console.log
**Before:**
```javascript
console.log('User registered:', user.id);
console.error('Database error:', error);
```

**After:**
```javascript
const logger = require('../utils/logger');

logger.info('User registered', { userId: user.id });
logger.error('Database error', { error: error.message, stack: error.stack });
```

---

## 5. Quick Verification

### Test Everything Works

```bash
# Backend
cd back-end
npm test                    # All tests should pass
npm run lint               # No errors
npm start                  # Server starts without errors

# Frontend
cd front-end
npm test                   # All tests should pass
npm run lint              # No errors
npm run build             # Build succeeds
npm run start             # Production server starts

# Integration
# Test full flow:
# 1. Register user
# 2. Login
# 3. Search hospitals
# 4. Create booking
# 5. View dashboard
```

---

## 📞 Need Help?

If you get stuck:
1. Check error messages carefully
2. Review the documentation
3. Search Stack Overflow
4. Ask in Discord/Reddit communities
5. Use ChatGPT for specific code issues

**Remember:** Working code > Perfect code. Focus on getting it working first!

---

**Good luck! 🚀**
