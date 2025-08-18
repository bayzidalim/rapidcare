const UserService = require('../services/userService');

// Authentication middleware
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = UserService.verifyToken(token);
    
    // Get user from database (handle both userId and id for compatibility)
    const userId = decoded.userId || decoded.id;
    const user = UserService.getById(userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

// Authorization middleware for user types
const authorizeUserType = (allowedTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!allowedTypes.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// Authorization middleware for specific permissions
const authorizePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!UserService.hasPermission(req.user, permission)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// Authorization middleware for hospital authorities
const authorizeHospitalAuthority = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (req.user.userType !== 'hospital-authority') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Hospital authority required.'
    });
  }

  if (!req.user.hospitalId) {
    return res.status(403).json({
      success: false,
      error: 'Hospital authority not assigned to any hospital'
    });
  }

  next();
};

// Authorization middleware for specific hospital
const authorizeHospitalAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const hospitalId = parseInt(req.params.hospitalId || req.body.hospitalId);
  
  if (!hospitalId) {
    return res.status(400).json({
      success: false,
      error: 'Hospital ID required'
    });
  }

  // Regular users can access any hospital for booking
  if (req.user.userType === 'user') {
    return next();
  }

  // Hospital authorities can only access their assigned hospital
  if (req.user.userType === 'hospital-authority' && req.user.hospitalId === hospitalId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Access denied. You can only access your assigned hospital.'
  });
};

// Optional authentication middleware (for public endpoints)
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without user
    }

    const token = authHeader.substring(7);
    const decoded = UserService.verifyToken(token);
    
    const user = UserService.getById(decoded.userId);
    if (user) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    next(); // Continue without user
  }
};

// Admin-only access middleware
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.user.userType !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin privileges required.',
      code: 'ACCESS_DENIED',
      redirectTo: '/dashboard'
    });
  }

  next();
};

// Hospital authority access middleware
const requireHospitalAuthority = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.user.userType !== 'hospital-authority') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Hospital authority privileges required.',
      code: 'ACCESS_DENIED'
    });
  }

  next();
};

// Hospital ownership verification middleware
const requireOwnHospital = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  // Get hospital ID from params or body
  const hospitalId = parseInt(req.params.id || req.params.hospitalId || req.body.hospitalId);
  
  if (!hospitalId) {
    return res.status(400).json({
      success: false,
      error: 'Hospital ID required',
      code: 'INVALID_REQUEST'
    });
  }

  // Admin users can access any hospital
  if (req.user.userType === 'admin') {
    return next();
  }

  // Hospital authorities can only access their assigned hospital
  if (req.user.userType === 'hospital-authority') {
    if (!req.user.hospital_id) {
      return res.status(403).json({
        success: false,
        error: 'No hospital assigned to your account',
        code: 'HOSPITAL_NOT_ASSIGNED'
      });
    }

    if (req.user.hospital_id !== hospitalId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only manage your assigned hospital.',
        code: 'HOSPITAL_NOT_OWNED'
      });
    }

    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Access denied. Insufficient permissions.',
    code: 'ACCESS_DENIED'
  });
};

// Role-based access helper
const hasRole = (user, roles) => {
  if (!user || !user.userType) return false;
  return Array.isArray(roles) ? roles.includes(user.userType) : user.userType === roles;
};

// Hospital assignment helper
const hasHospitalAccess = (user, hospitalId) => {
  if (!user) return false;
  if (user.userType === 'admin') return true;
  if (user.userType === 'hospital-authority') {
    return user.hospital_id === parseInt(hospitalId);
  }
  return false;
};

// Generic role requirement middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        code: 'ACCESS_DENIED'
      });
    }

    next();
  };
};

// Booking access control middleware
const authorizeBookingAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  const bookingId = req.params.id;
  
  if (!bookingId) {
    return res.status(400).json({
      success: false,
      error: 'Booking ID required',
      code: 'INVALID_REQUEST'
    });
  }

  // Get booking details to check ownership/access
  const db = require('../config/database');
  const booking = db.prepare('SELECT userId, hospitalId FROM bookings WHERE id = ?').get(bookingId);
  
  if (!booking) {
    return res.status(404).json({
      success: false,
      error: 'Booking not found',
      code: 'BOOKING_NOT_FOUND'
    });
  }

  // Admin users can access any booking
  if (req.user.userType === 'admin') {
    return next();
  }

  // Regular users can only access their own bookings
  if (req.user.userType === 'user' && booking.userId === req.user.id) {
    return next();
  }

  // Hospital authorities can access bookings for their hospital
  if (req.user.userType === 'hospital-authority' && 
      req.user.hospital_id === booking.hospitalId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Access denied. You can only access your own bookings or bookings for your hospital.',
    code: 'BOOKING_ACCESS_DENIED'
  });
};

// Hospital booking management access
const authorizeHospitalBookingManagement = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  const hospitalId = parseInt(req.params.hospitalId);
  
  if (!hospitalId) {
    return res.status(400).json({
      success: false,
      error: 'Hospital ID required',
      code: 'INVALID_REQUEST'
    });
  }

  // Admin users can manage any hospital's bookings
  if (req.user.userType === 'admin') {
    return next();
  }

  // Hospital authorities can only manage their assigned hospital's bookings
  if (req.user.userType === 'hospital-authority') {
    if (!req.user.hospital_id) {
      return res.status(403).json({
        success: false,
        error: 'No hospital assigned to your account',
        code: 'HOSPITAL_NOT_ASSIGNED'
      });
    }

    if (req.user.hospital_id !== hospitalId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only manage bookings for your assigned hospital.',
        code: 'HOSPITAL_BOOKING_ACCESS_DENIED'
      });
    }

    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Access denied. Hospital authority or admin role required.',
    code: 'ACCESS_DENIED'
  });
};

module.exports = {
  authenticate,
  authorizeUserType,
  authorizePermission,
  authorizeHospitalAuthority,
  authorizeHospitalAccess,
  optionalAuth,
  requireAdmin,
  requireHospitalAuthority,
  requireOwnHospital,
  requireRole,
  hasRole,
  hasHospitalAccess,
  authorizeBookingAccess,
  authorizeHospitalBookingManagement
}; 