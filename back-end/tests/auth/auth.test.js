const { expect } = require('chai');
const request = require('supertest');
const dbHandler = require('../setup');

// We need to import the Express app, but we need to ensure it uses our test DB
// Instead, we'll build a lightweight Express app for integration testing
const express = require('express');
const jwt = require('jsonwebtoken');

// Models
const User = require('../../models/User');
const Hospital = require('../../models/Hospital');

// Services & Controllers
const UserService = require('../../services/userService');
const config = require('../../config/config');

// Middleware
const { authenticate, requireAdmin, requireRole, hasRole } = require('../../middleware/auth');

// ─── Helper: Build a mini Express app for auth route testing ─────
function buildApp() {
  const app = express();
  app.use(express.json());

  // Mount auth routes
  const authRoutes = require('../../routes/auth');
  app.use('/api/auth', authRoutes);

  // A test-only protected endpoint
  app.get('/api/protected', authenticate, (req, res) => {
    res.json({ success: true, user: req.user });
  });

  // A test-only admin endpoint
  app.get('/api/admin-only', authenticate, requireAdmin, (req, res) => {
    res.json({ success: true, message: 'Admin access granted' });
  });

  // A test-only role-restricted endpoint
  app.get('/api/hospital-only', authenticate, requireRole('hospital-authority'), (req, res) => {
    res.json({ success: true, message: 'Hospital authority access granted' });
  });

  return app;
}

describe('Auth Integration Tests', function () {
  this.timeout(30000);
  let app;

  before(async () => {
    await dbHandler.connect();
    app = buildApp();
  });

  afterEach(async () => {
    await dbHandler.clearDatabase();
  });

  after(async () => {
    await dbHandler.closeDatabase();
  });

  // ─── Registration ────────────────────────────────────────────────
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          name: 'New User',
          phone: '+880-1700-000001',
          userType: 'user'
        });

      expect(res.status).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(res.body.data.user).to.exist;
      expect(res.body.data.user.email).to.equal('newuser@test.com');
      expect(res.body.data.user.name).to.equal('New User');
      expect(res.body.data.user.password).to.not.exist; // Password excluded

      // Verify the user was persisted in the database  
      const dbUser = await User.findOne({ email: 'newuser@test.com' });
      expect(dbUser).to.exist;
    });

    it('should reject registration with missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'incomplete@test.com'
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
    });

    it('should reject registration with invalid userType', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'badtype@test.com',
          password: 'password123',
          name: 'Bad Type User',
          userType: 'superadmin'
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
    });

    it('should reject duplicate email registration', async () => {
      // Register first
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'dupe@test.com',
          password: 'password123',
          name: 'First User',
          userType: 'user'
        });

      // Try to register again
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'dupe@test.com',
          password: 'password123',
          name: 'Second User',
          userType: 'user'
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.error).to.include('already exists');
    });

    it('should reject password shorter than 6 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'shortpw@test.com',
          password: '12345',
          name: 'Short PW',
          userType: 'user'
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
      expect(res.body.error).to.include('6 characters');
    });

    it('should set default balance of 10000 for new users', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'balance@test.com',
          password: 'password123',
          name: 'Balance User',
          userType: 'user'
        });

      const user = await User.findOne({ email: 'balance@test.com' });
      expect(user.balance).to.equal(10000);
    });
  });

  // ─── Login ──────────────────────────────────────────────────────
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a user via the service (properly hashed password)
      await UserService.register({
        email: 'login@test.com',
        password: 'securepassword',
        name: 'Login User',
        userType: 'user'
      });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'securepassword'
        });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.token).to.exist;
      expect(res.body.data.user).to.exist;
      expect(res.body.data.user.email).to.equal('login@test.com');
      expect(res.body.data.user.password).to.not.exist;
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'wrongpassword'
        });

      expect(res.status).to.equal(401);
      expect(res.body.success).to.be.false;
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'ghost@test.com',
          password: 'password123'
        });

      expect(res.status).to.equal(401);
      expect(res.body.success).to.be.false;
    });

    it('should reject login with missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com' });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
    });

    it('should return a valid JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'securepassword'
        });

      const decoded = jwt.verify(res.body.data.token, config.jwtSecret);
      expect(decoded.userId).to.exist;
      expect(decoded.email).to.equal('login@test.com');
      expect(decoded.userType).to.equal('user');
    });

    it('should not login deactivated user', async () => {
      // Deactivate
      const user = await User.findOne({ email: 'login@test.com' });
      await UserService.deactivateUser(user._id);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'securepassword'
        });

      expect(res.status).to.equal(401);
      expect(res.body.success).to.be.false;
    });
  });

  // ─── Protected Routes & Authentication Middleware ────────────────
  describe('Authentication Middleware', () => {
    let token;
    let userId;

    beforeEach(async () => {
      const user = await UserService.register({
        email: 'authuser@test.com',
        password: 'securepassword',
        name: 'Auth User',
        userType: 'user'
      });
      userId = user._id;
      const loginResult = await UserService.login('authuser@test.com', 'securepassword');
      token = loginResult.token;
    });

    it('should allow access with valid token', async () => {
      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.user).to.exist;
      expect(res.body.user.email).to.equal('authuser@test.com');
    });

    it('should reject request without token', async () => {
      const res = await request(app)
        .get('/api/protected');

      expect(res.status).to.equal(401);
      expect(res.body.success).to.be.false;
      expect(res.body.error).to.include('Access token required');
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).to.equal(401);
      expect(res.body.success).to.be.false;
    });

    it('should reject request with expired token', async () => {
      const expiredToken = jwt.sign(
        { userId, email: 'authuser@test.com', userType: 'user' },
        config.jwtSecret,
        { expiresIn: '0s' }
      );

      // Small delay to ensure token has expired
      await new Promise(resolve => setTimeout(resolve, 100));

      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).to.equal(401);
    });

    it('should reject request with malformed Authorization header', async () => {
      const res = await request(app)
        .get('/api/protected')
        .set('Authorization', 'NotBearer token');

      expect(res.status).to.equal(401);
      expect(res.body.error).to.include('Access token required');
    });
  });

  // ─── Profile ────────────────────────────────────────────────────
  describe('GET /api/auth/profile', () => {
    let token;

    beforeEach(async () => {
      await UserService.register({
        email: 'profile@test.com',
        password: 'securepassword',
        name: 'Profile User',
        userType: 'user'
      });
      const loginResult = await UserService.login('profile@test.com', 'securepassword');
      token = loginResult.token;
    });

    it('should return user profile', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.email).to.equal('profile@test.com');
      expect(res.body.data.name).to.equal('Profile User');
      expect(res.body.data.password).to.not.exist;
    });
  });

  // ─── Update Profile ─────────────────────────────────────────────
  describe('PUT /api/auth/profile', () => {
    let token;

    beforeEach(async () => {
      await UserService.register({
        email: 'update@test.com',
        password: 'securepassword',
        name: 'Update User',
        userType: 'user'
      });
      const loginResult = await UserService.login('update@test.com', 'securepassword');
      token = loginResult.token;
    });

    it('should update user profile', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Name',
          phone: '+880-1800-000001'
        });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.name).to.equal('Updated Name');
      expect(res.body.data.phone).to.equal('+880-1800-000001');
    });

    it('should reject profile update without name', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '123' });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
    });
  });

  // ─── Change Password ───────────────────────────────────────────
  describe('PUT /api/auth/change-password', () => {
    let token;

    beforeEach(async () => {
      await UserService.register({
        email: 'changepw@test.com',
        password: 'oldpassword',
        name: 'PW User',
        userType: 'user'
      });
      const loginResult = await UserService.login('changepw@test.com', 'oldpassword');
      token = loginResult.token;
    });

    it('should change password successfully', async () => {
      const res = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123'
        });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;

      // Verify new password works
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'changepw@test.com',
          password: 'newpassword123'
        });
      expect(loginRes.status).to.equal(200);
    });

    it('should reject with wrong current password', async () => {
      const res = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        });

      expect(res.status).to.equal(400);
      expect(res.body.success).to.be.false;
    });

    it('should reject new password shorter than 6 chars', async () => {
      const res = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'oldpassword',
          newPassword: '12345'
        });

      expect(res.status).to.equal(400);
      expect(res.body.error).to.include('6 characters');
    });
  });

  // ─── Authorization (Role-Based Access) ──────────────────────────
  describe('Role-Based Access Control', () => {
    it('should deny non-admin access to admin-only route', async () => {
      await UserService.register({
        email: 'regular@test.com',
        password: 'password123',
        name: 'Regular User',
        userType: 'user'
      });
      const loginResult = await UserService.login('regular@test.com', 'password123');

      const res = await request(app)
        .get('/api/admin-only')
        .set('Authorization', `Bearer ${loginResult.token}`);

      expect(res.status).to.equal(403);
      expect(res.body.success).to.be.false;
      expect(res.body.error).to.include('Admin privileges required');
    });

    it('should allow admin access to admin-only route', async () => {
      await UserService.register({
        email: 'admin@test.com',
        password: 'password123',
        name: 'Admin User',
        userType: 'admin'
      });
      const loginResult = await UserService.login('admin@test.com', 'password123');

      const res = await request(app)
        .get('/api/admin-only')
        .set('Authorization', `Bearer ${loginResult.token}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
    });

    it('should restrict hospital-only routes to hospital authorities', async () => {
      await UserService.register({
        email: 'ha@test.com',
        password: 'password123',
        name: 'Hospital Authority',
        userType: 'hospital-authority'
      });
      const loginResult = await UserService.login('ha@test.com', 'password123');

      const res = await request(app)
        .get('/api/hospital-only')
        .set('Authorization', `Bearer ${loginResult.token}`);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
    });

    it('should deny regular user from hospital-only route', async () => {
      await UserService.register({
        email: 'notha@test.com',
        password: 'password123',
        name: 'Regular',
        userType: 'user'
      });
      const loginResult = await UserService.login('notha@test.com', 'password123');

      const res = await request(app)
        .get('/api/hospital-only')
        .set('Authorization', `Bearer ${loginResult.token}`);

      expect(res.status).to.equal(403);
      expect(res.body.success).to.be.false;
    });
  });

  // ─── hasRole Utility ────────────────────────────────────────────
  describe('hasRole Utility', () => {
    it('should return true for matching role', () => {
      expect(hasRole({ userType: 'admin' }, 'admin')).to.be.true;
    });

    it('should return true for matching role in array', () => {
      expect(hasRole({ userType: 'admin' }, ['admin', 'user'])).to.be.true;
    });

    it('should return false for non-matching role', () => {
      expect(hasRole({ userType: 'user' }, 'admin')).to.be.false;
    });

    it('should return false for null user', () => {
      expect(hasRole(null, 'admin')).to.be.false;
    });
  });

  // ─── UserService Unit Tests ────────────────────────────────────
  describe('UserService', () => {
    it('should hash passwords during registration', async () => {
      const user = await UserService.register({
        email: 'hash@test.com',
        password: 'plainpassword',
        name: 'Hash User',
        userType: 'user'
      });

      // The returned user should not have a password
      expect(user.password).to.not.exist;

      // The DB user should have a hashed password
      const dbUser = await User.findById(user._id);
      expect(dbUser.password).to.not.equal('plainpassword');
      expect(dbUser.password.startsWith('$2')).to.be.true; // bcrypt hash prefix
    });

    it('should generate valid JWT tokens', async () => {
      const user = await UserService.register({
        email: 'jwt@test.com',
        password: 'password123',
        name: 'JWT User',
        userType: 'user'
      });

      const token = await UserService.generateToken(user._id);
      expect(token).to.be.a('string');

      const decoded = jwt.verify(token, config.jwtSecret);
      expect(decoded.email).to.equal('jwt@test.com');
    });

    it('should verify valid tokens', async () => {
      const token = jwt.sign(
        { userId: 'test123', email: 'test@test.com', userType: 'user' },
        config.jwtSecret,
        { expiresIn: '1h' }
      );

      const decoded = UserService.verifyToken(token);
      expect(decoded.userId).to.equal('test123');
    });

    it('should throw on invalid token verification', () => {
      expect(() => UserService.verifyToken('bad.token')).to.throw('Invalid token');
    });

    it('should deactivate a user', async () => {
      const user = await UserService.register({
        email: 'deactivate@test.com',
        password: 'password123',
        name: 'Deactivate User',
        userType: 'user'
      });

      await UserService.deactivateUser(user._id);

      const dbUser = await User.findById(user._id);
      expect(dbUser.isActive).to.be.false;
    });

    it('should assign hospital to user', async () => {
      const user = await UserService.register({
        email: 'assign@test.com',
        password: 'password123',
        name: 'Assign User',
        userType: 'hospital-authority'
      });

      const hospital = await Hospital.create({
        name: 'Assignment Hospital',
        approval_status: 'approved'
      });

      const updated = await UserService.assignHospital(user._id, hospital._id, 'manager');
      expect(updated.hospitalRole).to.equal('manager');
      expect(updated.permissions).to.include('view_hospital');
      expect(updated.permissions).to.include('update_hospital');
    });

    it('should return correct permissions for each role', () => {
      const adminPerms = UserService.getPermissionsForRole('admin');
      expect(adminPerms).to.include('delete_hospital');

      const managerPerms = UserService.getPermissionsForRole('manager');
      expect(managerPerms).to.include('update_hospital');
      expect(managerPerms).to.not.include('delete_hospital');

      const staffPerms = UserService.getPermissionsForRole('staff');
      expect(staffPerms).to.include('view_hospital');
      expect(staffPerms).to.not.include('update_hospital');
    });

    it('should get all users without passwords', async () => {
      await UserService.register({
        email: 'all1@test.com',
        password: 'password123',
        name: 'User 1',
        userType: 'user'
      });

      await UserService.register({
        email: 'all2@test.com',
        password: 'password123',
        name: 'User 2',
        userType: 'admin'
      });

      const users = await UserService.getAll();
      expect(users).to.have.lengthOf(2);
      users.forEach(u => {
        expect(u.password).to.not.exist;
      });
    });

    it('should get hospital authorities with populated hospital', async () => {
      const hospital = await Hospital.create({
        name: 'HA Hospital',
        approval_status: 'approved'
      });

      const user = await UserService.register({
        email: 'ha@test.com',
        password: 'password123',
        name: 'Hospital Authority',
        userType: 'hospital-authority'
      });

      await UserService.assignHospital(user._id, hospital._id, 'admin');

      const authorities = await UserService.getHospitalAuthorities();
      expect(authorities).to.have.lengthOf(1);
      expect(authorities[0].hospitalName).to.equal('HA Hospital');
      expect(authorities[0].password).to.not.exist;
    });
  });

  // ─── Test Isolation Verification ─────────────────────────────────
  describe('Test Isolation', () => {
    it('should start with empty database in first test', async () => {
      const users = await User.find();
      expect(users).to.have.lengthOf(0);
    });

    it('should create data in second test', async () => {
      await User.create({
        email: 'isolation@test.com',
        password: 'password123',
        name: 'Isolation User',
        userType: 'user'
      });

      const users = await User.find();
      expect(users).to.have.lengthOf(1);
    });

    it('should have empty database again in third test (data from second test cleared)', async () => {
      const users = await User.find();
      expect(users).to.have.lengthOf(0);
    });
  });
});
