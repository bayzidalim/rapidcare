const { expect } = require('chai');
const sinon = require('sinon');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../../config/config');
const db = require('../../config/database');

// Import routes and middleware
const bookingRoutes = require('../../routes/bookings');
const { authenticate } = require('../../middleware/auth');

describe('Booking API Integration Tests', () => {
  let app;
  let sandbox;
  let testUser;
  let testHospitalAuthority;
  let testHospital;
  let userToken;
  let hospitalAuthorityToken;

  before(() => {
    // Create Express app
    app = express();
    app.use(express.json());
    
    // Add authentication middleware
    app.use('/api/bookings', authenticate);
    
    // Add booking routes
    app.use('/api/bookings', bookingRoutes);
    
    // Error handling middleware
    app.use((error, req, res, next) => {
      res.status(500).json({
        success: false,
        error: error.message
      });
    });
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock test data
    testUser = {
      id: 1,
      email: 'user@test.com',
      name: 'Test User',
      userType: 'user',
      isActive: true
    };
    
    testHospitalAuthority = {
      id: 2,
      email: 'authority@test.com',
      name: 'Hospital Authority',
      userType: 'hospital-authority',
      hospital_id: 1,
      isActive: true
    };
    
    testHospital = {
      id: 1,
      name: 'Test Hospital',
      isActive: true,
      approval_status: 'approved'
    };
    
    // Generate test tokens
    userToken = jwt.sign(
      { userId: testUser.id, email: testUser.email, userType: testUser.userType },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    
    hospitalAuthorityToken = jwt.sign(
      { 
        userId: testHospitalAuthority.id, 
        email: testHospitalAuthority.email, 
        userType: testHospitalAuthority.userType,
        hospital_id: testHospitalAuthority.hospital_id
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('POST /api/bookings', () => {
    it('should create booking with valid user token and data', async () => {
      const bookingData = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'John Doe',
        patientAge: 30,
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required for appendicitis',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 48,
        notes: 'Patient requires immediate attention'
      };

      // Mock database operations
      const mockBookingId = 1;
      const mockBookingReference = 'BK-20241201-ABC123';
      
      // Mock user lookup
      sandbox.stub(db, 'prepare').callsFake((query) => {
        if (query.includes('SELECT * FROM users WHERE id = ?')) {
          return {
            get: sandbox.stub().returns(testUser)
          };
        }
        
        if (query.includes('SELECT * FROM hospitals WHERE id = ?')) {
          return {
            get: sandbox.stub().returns(testHospital)
          };
        }
        
        if (query.includes('SELECT available, total, occupied, reserved')) {
          return {
            get: sandbox.stub().returns({
              available: 5,
              total: 10,
              occupied: 3,
              reserved: 2
            })
          };
        }
        
        if (query.includes('SELECT id FROM bookings WHERE userId = ?')) {
          return {
            get: sandbox.stub().returns(null) // No duplicate
          };
        }
        
        if (query.includes('INSERT INTO bookings')) {
          return {
            run: sandbox.stub().returns({
              lastInsertRowid: mockBookingId,
              changes: 1
            })
          };
        }
        
        if (query.includes('SELECT COUNT(*) as count FROM bookings')) {
          return {
            get: sandbox.stub().returns({ count: 1 }) // Under rate limit
          };
        }
        
        // Default mock
        return {
          get: sandbox.stub().returns(null),
          run: sandbox.stub().returns({ changes: 1 }),
          all: sandbox.stub().returns([])
        };
      });

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(bookingData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('id');
      expect(response.body.message).to.include('Booking request submitted successfully');
    });

    it('should reject booking without authentication', async () => {
      const bookingData = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'John Doe',
        patientAge: 30,
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 48
      };

      const response = await request(app)
        .post('/api/bookings')
        .send(bookingData)
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Access token required');
    });

    it('should reject booking with invalid token', async () => {
      const bookingData = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'John Doe',
        patientAge: 30,
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 48
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', 'Bearer invalid_token')
        .send(bookingData)
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Invalid token');
    });

    it('should handle rate limiting', async () => {
      const bookingData = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'John Doe',
        patientAge: 30,
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 48
      };

      // Mock user lookup
      sandbox.stub(db, 'prepare').callsFake((query) => {
        if (query.includes('SELECT * FROM users WHERE id = ?')) {
          return {
            get: sandbox.stub().returns(testUser)
          };
        }
        
        if (query.includes('SELECT COUNT(*) as count FROM bookings')) {
          return {
            get: sandbox.stub().returns({ count: 5 }) // Over rate limit
          };
        }
        
        return {
          get: sandbox.stub().returns(null),
          run: sandbox.stub().returns({ changes: 1 }),
          all: sandbox.stub().returns([])
        };
      });

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(bookingData)
        .expect(429);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Too many booking requests');
    });
  });

  describe('PUT /api/bookings/:id/approve', () => {
    it('should approve booking with hospital authority token', async () => {
      const mockBooking = {
        id: 1,
        userId: 1,
        hospitalId: 1,
        status: 'pending',
        resourceType: 'beds',
        patientName: 'John Doe',
        hospitalName: 'Test Hospital'
      };

      // Mock database operations
      sandbox.stub(db, 'prepare').callsFake((query) => {
        if (query.includes('SELECT * FROM users WHERE id = ?')) {
          if (query.includes('id = 2')) {
            return { get: sandbox.stub().returns(testHospitalAuthority) };
          }
          return { get: sandbox.stub().returns(testUser) };
        }
        
        if (query.includes('SELECT userId, hospitalId FROM bookings WHERE id = ?')) {
          return {
            get: sandbox.stub().returns({
              userId: mockBooking.userId,
              hospitalId: mockBooking.hospitalId
            })
          };
        }
        
        // Mock booking lookup
        if (query.includes('SELECT b.*, h.name as hospitalName')) {
          return {
            get: sandbox.stub().returns(mockBooking)
          };
        }
        
        if (query.includes('SELECT available, total, occupied, reserved')) {
          return {
            get: sandbox.stub().returns({
              available: 5,
              total: 10,
              occupied: 3,
              reserved: 2
            })
          };
        }
        
        if (query.includes('UPDATE bookings SET status = \'approved\'')) {
          return {
            run: sandbox.stub().returns({ changes: 1 })
          };
        }
        
        return {
          get: sandbox.stub().returns(null),
          run: sandbox.stub().returns({ changes: 1 }),
          all: sandbox.stub().returns([])
        };
      });

      const response = await request(app)
        .put('/api/bookings/1/approve')
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send({ notes: 'Approved for admission', resourcesAllocated: 1 })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.message).to.include('Booking approved successfully');
    });

    it('should reject approval by regular user', async () => {
      const mockBooking = {
        id: 1,
        userId: 1,
        hospitalId: 1,
        status: 'pending'
      };

      sandbox.stub(db, 'prepare').callsFake((query) => {
        if (query.includes('SELECT * FROM users WHERE id = ?')) {
          return { get: sandbox.stub().returns(testUser) };
        }
        
        if (query.includes('SELECT userId, hospitalId FROM bookings WHERE id = ?')) {
          return {
            get: sandbox.stub().returns({
              userId: mockBooking.userId,
              hospitalId: mockBooking.hospitalId
            })
          };
        }
        
        return {
          get: sandbox.stub().returns(null),
          run: sandbox.stub().returns({ changes: 1 }),
          all: sandbox.stub().returns([])
        };
      });

      const response = await request(app)
        .put('/api/bookings/1/approve')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ notes: 'Approved for admission' })
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Access denied');
    });

    it('should reject approval for different hospital', async () => {
      const mockBooking = {
        id: 1,
        userId: 1,
        hospitalId: 2, // Different hospital
        status: 'pending'
      };

      sandbox.stub(db, 'prepare').callsFake((query) => {
        if (query.includes('SELECT * FROM users WHERE id = ?')) {
          return { get: sandbox.stub().returns(testHospitalAuthority) };
        }
        
        if (query.includes('SELECT userId, hospitalId FROM bookings WHERE id = ?')) {
          return {
            get: sandbox.stub().returns({
              userId: mockBooking.userId,
              hospitalId: mockBooking.hospitalId
            })
          };
        }
        
        return {
          get: sandbox.stub().returns(null),
          run: sandbox.stub().returns({ changes: 1 }),
          all: sandbox.stub().returns([])
        };
      });

      const response = await request(app)
        .put('/api/bookings/1/approve')
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .send({ notes: 'Approved for admission' })
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('You can only access your own bookings');
    });
  });

  describe('GET /api/bookings/hospital/:hospitalId/pending', () => {
    it('should return pending bookings for hospital authority', async () => {
      const mockPendingBookings = [
        {
          id: 1,
          patientName: 'John Doe',
          urgency: 'high',
          status: 'pending',
          resourceType: 'beds',
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          patientName: 'Jane Smith',
          urgency: 'medium',
          status: 'pending',
          resourceType: 'icu',
          createdAt: new Date().toISOString()
        }
      ];

      sandbox.stub(db, 'prepare').callsFake((query) => {
        if (query.includes('SELECT * FROM users WHERE id = ?')) {
          return { get: sandbox.stub().returns(testHospitalAuthority) };
        }
        
        if (query.includes('SELECT b.*, h.name as hospitalName') && query.includes('status = \'pending\'')) {
          return {
            all: sandbox.stub().returns(mockPendingBookings)
          };
        }
        
        return {
          get: sandbox.stub().returns(null),
          run: sandbox.stub().returns({ changes: 1 }),
          all: sandbox.stub().returns([])
        };
      });

      const response = await request(app)
        .get('/api/bookings/hospital/1/pending')
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      expect(response.body.data).to.have.length(2);
      expect(response.body.summary).to.have.property('totalPending', 2);
    });

    it('should reject access to different hospital\'s bookings', async () => {
      sandbox.stub(db, 'prepare').callsFake((query) => {
        if (query.includes('SELECT * FROM users WHERE id = ?')) {
          return { get: sandbox.stub().returns(testHospitalAuthority) };
        }
        
        return {
          get: sandbox.stub().returns(null),
          run: sandbox.stub().returns({ changes: 1 }),
          all: sandbox.stub().returns([])
        };
      });

      const response = await request(app)
        .get('/api/bookings/hospital/2/pending') // Different hospital
        .set('Authorization', `Bearer ${hospitalAuthorityToken}`)
        .expect(403);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('You can only manage bookings for your assigned hospital');
    });
  });

  describe('GET /api/bookings/user', () => {
    it('should return user\'s bookings', async () => {
      const mockUserBookings = [
        {
          id: 1,
          patientName: 'John Doe',
          status: 'pending',
          hospitalName: 'Test Hospital',
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          patientName: 'John Doe',
          status: 'approved',
          hospitalName: 'Test Hospital',
          createdAt: new Date().toISOString()
        }
      ];

      sandbox.stub(db, 'prepare').callsFake((query) => {
        if (query.includes('SELECT * FROM users WHERE id = ?')) {
          return { get: sandbox.stub().returns(testUser) };
        }
        
        if (query.includes('SELECT b.*, h.name as hospitalName') && query.includes('b.userId = ?')) {
          return {
            all: sandbox.stub().returns(mockUserBookings)
          };
        }
        
        return {
          get: sandbox.stub().returns(null),
          run: sandbox.stub().returns({ changes: 1 }),
          all: sandbox.stub().returns([])
        };
      });

      const response = await request(app)
        .get('/api/bookings/user')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      expect(response.body.data).to.have.length(2);
      expect(response.body.count).to.equal(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      sandbox.stub(db, 'prepare').throws(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/bookings/user')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(500);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Database connection failed');
    });

    it('should handle malformed request data', async () => {
      sandbox.stub(db, 'prepare').callsFake((query) => {
        if (query.includes('SELECT * FROM users WHERE id = ?')) {
          return { get: sandbox.stub().returns(testUser) };
        }
        
        return {
          get: sandbox.stub().returns(null),
          run: sandbox.stub().returns({ changes: 1 }),
          all: sandbox.stub().returns([])
        };
      });

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ invalidData: 'test' }) // Invalid booking data
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Validation failed');
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent booking requests', async () => {
      const bookingData = {
        hospitalId: 1,
        resourceType: 'beds',
        patientName: 'John Doe',
        patientAge: 30,
        patientGender: 'male',
        medicalCondition: 'Emergency surgery required',
        urgency: 'high',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 48
      };

      // Mock successful database operations
      sandbox.stub(db, 'prepare').callsFake((query) => {
        if (query.includes('SELECT * FROM users WHERE id = ?')) {
          return { get: sandbox.stub().returns(testUser) };
        }
        
        if (query.includes('SELECT * FROM hospitals WHERE id = ?')) {
          return { get: sandbox.stub().returns(testHospital) };
        }
        
        if (query.includes('SELECT COUNT(*) as count FROM bookings')) {
          return { get: sandbox.stub().returns({ count: 1 }) };
        }
        
        return {
          get: sandbox.stub().returns(null),
          run: sandbox.stub().returns({ 
            lastInsertRowid: Math.floor(Math.random() * 1000),
            changes: 1 
          }),
          all: sandbox.stub().returns([])
        };
      });

      // Create multiple concurrent requests
      const requests = Array(5).fill().map(() => 
        request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${userToken}`)
          .send(bookingData)
      );

      const responses = await Promise.all(requests);

      // At least some should succeed (rate limiting may block some)
      const successfulResponses = responses.filter(res => res.status === 201);
      const rateLimitedResponses = responses.filter(res => res.status === 429);

      expect(successfulResponses.length + rateLimitedResponses.length).to.equal(5);
    });
  });
});