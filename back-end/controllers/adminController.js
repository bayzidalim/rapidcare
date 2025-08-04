const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Booking = require('../models/Booking');
const BloodRequest = require('../models/BloodRequest');
const HospitalService = require('../services/hospitalService');
const bcrypt = require('bcryptjs');

// Middleware to check if user is admin
const checkAdmin = (req, res, next) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Apply admin check to all routes
const adminController = {
  // User Management
  getAllUsers: (req, res) => {
    try {
      checkAdmin(req, res, () => {
        const users = User.getAll();
        // Exclude password field
        const usersWithoutPassword = users.map(({ password, ...rest }) => rest);
        res.json({
          success: true,
          data: usersWithoutPassword
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users'
      });
    }
  },

  getUserById: (req, res) => {
    try {
      checkAdmin(req, res, () => {
        const user = User.findById(req.params.id);
        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }
        const { password, ...userWithoutPassword } = user;
        res.json({
          success: true,
          data: userWithoutPassword
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user'
      });
    }
  },

  createUser: (req, res) => {
    try {
      checkAdmin(req, res, () => {
        const { name, email, password, phone, userType } = req.body;
        // Check if user already exists
        const existingUser = User.findByEmail(email);
        if (existingUser) {
          return res.status(400).json({
            success: false,
            error: 'User with this email already exists'
          });
        }
        // Hash password
        const bcrypt = require('bcryptjs');
        const hashedPassword = bcrypt.hashSync(password, 10);
        const userId = User.create({
          name,
          email,
          password: hashedPassword,
          phone,
          userType: userType || 'user'
        });
        const user = User.findById(userId);
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json({
          success: true,
          data: userWithoutPassword
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create user'
      });
    }
  },

  updateUser: (req, res) => {
    try {
      checkAdmin(req, res, () => {
        const { name, phone, userType, isActive } = req.body;
        const user = User.findById(req.params.id);
        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }
        User.update(req.params.id, {
          name: name || user.name,
          phone: phone || user.phone,
          userType: userType || user.userType,
          isActive: isActive !== undefined ? isActive : user.isActive
        });
        const updatedUser = User.findById(req.params.id);
        const { password, ...userWithoutPassword } = updatedUser;
        res.json({
          success: true,
          data: userWithoutPassword
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update user'
      });
    }
  },

  deleteUser: (req, res) => {
    try {
      checkAdmin(req, res, () => {
        const user = User.findById(req.params.id);
        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }
        User.delete(req.params.id);
        res.json({
          success: true,
          message: 'User deleted successfully'
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete user'
      });
    }
  },

  // Hospital Management
  getAllHospitals: (req, res) => {
    try {
      checkAdmin(req, res, () => {
        const hospitals = HospitalService.getAll(true); // Include unapproved for admin
        res.json({
          success: true,
          data: hospitals
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch hospitals'
      });
    }
  },

  getPendingHospitals: (req, res) => {
    try {
      checkAdmin(req, res, () => {
        const hospitals = HospitalService.getPendingApprovals();
        res.json({
          success: true,
          data: hospitals
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pending hospitals'
      });
    }
  },

  getHospitalApprovalStats: (req, res) => {
    try {
      checkAdmin(req, res, () => {
        const stats = HospitalService.getApprovalStats();
        res.json({
          success: true,
          data: stats
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch approval stats'
      });
    }
  },

  approveHospital: (req, res) => {
    try {
      checkAdmin(req, res, () => {
        const hospital = HospitalService.approveHospital(req.params.id, req.user.id);
        if (!hospital) {
          return res.status(404).json({
            success: false,
            error: 'Hospital not found'
          });
        }
        res.json({
          success: true,
          data: hospital,
          message: 'Hospital approved successfully'
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to approve hospital'
      });
    }
  },

  rejectHospital: (req, res) => {
    try {
      checkAdmin(req, res, () => {
        const { reason } = req.body;
        if (!reason) {
          return res.status(400).json({
            success: false,
            error: 'Rejection reason is required'
          });
        }
        
        const hospital = HospitalService.rejectHospital(req.params.id, req.user.id, reason);
        if (!hospital) {
          return res.status(404).json({
            success: false,
            error: 'Hospital not found'
          });
        }
        res.json({
          success: true,
          data: hospital,
          message: 'Hospital rejected successfully'
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to reject hospital'
      });
    }
  },

  getHospitalById: (req, res) => {
    try {
      checkAdmin(req, res, () => {
        const hospital = Hospital.findById(req.params.id);
        if (!hospital) {
          return res.status(404).json({
            success: false,
            error: 'Hospital not found'
          });
        }
        res.json({
          success: true,
          data: hospital
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch hospital'
      });
    }
  },

  createHospital: (req, res) => {
    try {
      checkAdmin(req, res, () => {
        const hospitalId = Hospital.create(req.body);
        const hospital = Hospital.findById(hospitalId);
        res.status(201).json({
          success: true,
          data: hospital
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create hospital'
      });
    }
  },

  updateHospital: (req, res) => {
    try {
      checkAdmin(req, res, () => {
        const hospital = Hospital.findById(req.params.id);
        if (!hospital) {
          return res.status(404).json({
            success: false,
            error: 'Hospital not found'
          });
        }
        Hospital.update(req.params.id, req.body);
        const updatedHospital = Hospital.findById(req.params.id);
        res.json({
          success: true,
          data: updatedHospital
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update hospital'
      });
    }
  },

  deleteHospital: (req, res) => {
    try {
      checkAdmin(req, res, () => {
        const hospital = Hospital.findById(req.params.id);
        if (!hospital) {
          return res.status(404).json({
            success: false,
            error: 'Hospital not found'
          });
        }
        Hospital.delete(req.params.id);
        res.json({
          success: true,
          message: 'Hospital deleted successfully'
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete hospital'
      });
    }
  },

  // Booking Management
  getAllBookings: (req, res) => {
    try {
      checkAdmin(req, res, () => {
        const bookings = Booking.getAll();
        res.json({
          success: true,
          data: bookings
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bookings'
      });
    }
  },

  getBookingById: (req, res) => {
    try {
      checkAdmin(req, res, () => {
        const booking = Booking.findById(req.params.id);
        if (!booking) {
          return res.status(404).json({
            success: false,
            error: 'Booking not found'
          });
        }
        res.json({
          success: true,
          data: booking
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch booking'
      });
    }
  },

  updateBooking: (req, res) => {
    try {
      checkAdmin(req, res, () => {
        const booking = Booking.findById(req.params.id);
        if (!booking) {
          return res.status(404).json({
            success: false,
            error: 'Booking not found'
          });
        }
        // Only allow status and payment updates for simplicity
        if (req.body.status) {
          Booking.updateStatus(req.params.id, req.body.status);
        }
        if (req.body.paymentStatus) {
          Booking.updatePaymentStatus(
            req.params.id,
            req.body.paymentStatus,
            req.body.paymentMethod || null,
            req.body.transactionId || null
          );
        }
        const updatedBooking = Booking.findById(req.params.id);
        res.json({
          success: true,
          data: updatedBooking
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update booking'
      });
    }
  },

  deleteBooking: (req, res) => {
    try {
      checkAdmin(req, res, () => {
        const booking = Booking.findById(req.params.id);
        if (!booking) {
          return res.status(404).json({
            success: false,
            error: 'Booking not found'
          });
        }
        Booking.delete(req.params.id);
        res.json({
          success: true,
          message: 'Booking deleted successfully'
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete booking'
      });
    }
  },

  // Blood Request Management
  getAllBloodRequests: (req, res) => {
    try {
      checkAdmin(req, res, () => {
        const requests = BloodRequest.getAll();
        res.json({
          success: true,
          data: requests
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch blood requests'
      });
    }
  },

  getBloodRequestById: (req, res) => {
    try {
      checkAdmin(req, res, () => {
        const request = BloodRequest.findById(req.params.id);
        if (!request) {
          return res.status(404).json({
            success: false,
            error: 'Blood request not found'
          });
        }
        res.json({
          success: true,
          data: request
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch blood request'
      });
    }
  },

  updateBloodRequest: (req, res) => {
    try {
      checkAdmin(req, res, () => {
        const request = BloodRequest.findById(req.params.id);
        if (!request) {
          return res.status(404).json({
            success: false,
            error: 'Blood request not found'
          });
        }
        if (req.body.status) {
          BloodRequest.updateStatus(req.params.id, req.body.status);
        }
        const updatedRequest = BloodRequest.findById(req.params.id);
        res.json({
          success: true,
          data: updatedRequest
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update blood request'
      });
    }
  },

  deleteBloodRequest: (req, res) => {
    try {
      checkAdmin(req, res, () => {
        const request = BloodRequest.findById(req.params.id);
        if (!request) {
          return res.status(404).json({
            success: false,
            error: 'Blood request not found'
          });
        }
        BloodRequest.delete(req.params.id);
        res.json({
          success: true,
          message: 'Blood request deleted successfully'
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete blood request'
      });
    }
  },

  // Stats
  getStats: (req, res) => {
    try {
      checkAdmin(req, res, () => {
        const totalUsers = User.count();
        const activeUsers = User.count({ where: { isActive: 1 } });
        const totalHospitals = Hospital.count();
        const activeHospitals = Hospital.count({ where: { isActive: 1 } });
        const totalBookings = Booking.count();
        const pendingBookings = Booking.count({ where: { status: 'pending' } });
        const totalBloodRequests = BloodRequest.count();
        const pendingBloodRequests = BloodRequest.count({ where: { status: 'pending' } });
        
        res.json({
          success: true,
          data: {
            totalUsers,
            activeUsers,
            totalHospitals,
            activeHospitals,
            totalBookings,
            pendingBookings,
            totalBloodRequests,
            pendingBloodRequests
          }
        });
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch stats'
      });
    }
  }
};

module.exports = adminController; 