const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

class UserService {
  // Register new user
  static async register(userData) {
    const { email, password, name, phone, userType } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // In synchronous world this threw error.
      throw new Error('User with this email already exists');
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    // Permissions and role logic for hospital authority
    let permissions = [];
    let hospitalRole = undefined;

    if (userType === 'hospital-authority') {
      hospitalRole = 'staff';
      permissions = ['view_hospital', 'update_resources'];
    }

    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      phone,
      userType,
      balance: 10000.00,
      hospitalRole,
      permissions
    });

    return this.getById(user._id);
  }

  // Login user
  static async login(email, password) {
    const user = await User.findOne({ email, isActive: true });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check password
    // Use the method on the model instance (if available, which it is)
    // Or direct bcrypt compare
    const isValidPassword = await bcrypt.compare(password, user.password);
    // OR const isValidPassword = await user.matchPassword(password);
    
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        userType: user.userType,
        role: user.hospitalRole, // Mapped from role
        hospitalId: user.hospital_id
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    // Remove password from response
    const userObj = user.toObject();
    delete userObj.password;
    
    return {
      user: userObj,
      token
    };
  }

  // Get user by ID
  static async getById(id) {
    const user = await User.findOne({ _id: id, isActive: true });

    if (!user) return null;

    const userObj = user.toObject();
    delete userObj.password;

    // Backward compatibility for hospitalId alias
    if (user.userType === 'hospital-authority') {
      userObj.hospitalId = userObj.hospital_id;
    }
    
    return userObj;
  }

  // Get user by email
  static async getByEmail(email) {
    const user = await User.findOne({ email, isActive: true });

    if (!user) return null;

    const userObj = user.toObject();
    delete userObj.password;
    return userObj;
  }

  // Update user profile
  static async updateProfile(id, updateData) {
    const { name, phone } = updateData;
    
    await User.findByIdAndUpdate(id, { 
      name, 
      phone, 
      updatedAt: new Date() 
    });
    
    return this.getById(id);
  }

  // Change password
  static async changePassword(id, currentPassword, newPassword) {
    const user = await User.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password = hashedPassword;
    await user.save();
    
    return { message: 'Password updated successfully' };
  }

  // Assign hospital to hospital authority
  static async assignHospital(userId, hospitalId, role = 'staff') {
    const permissions = this.getPermissionsForRole(role);
    
    await User.findByIdAndUpdate(userId, {
        hospital_id: hospitalId,
        hospitalRole: role,
        permissions: permissions,
        updatedAt: new Date()
    });
    
    return this.getById(userId);
  }

  // Get permissions for role
  static getPermissionsForRole(role) {
    const permissions = {
      'admin': [
        'view_hospital', 'update_hospital', 'delete_hospital',
        'view_resources', 'update_resources', 'delete_resources',
        'view_surgeons', 'update_surgeons', 'delete_surgeons',
        'view_bookings', 'update_bookings', 'delete_bookings',
        'view_staff', 'update_staff', 'delete_staff'
      ],
      'manager': [
        'view_hospital', 'update_hospital',
        'view_resources', 'update_resources',
        'view_surgeons', 'update_surgeons',
        'view_bookings', 'update_bookings',
        'view_staff'
      ],
      'staff': [
        'view_hospital',
        'view_resources', 'update_resources',
        'view_surgeons',
        'view_bookings', 'update_bookings'
      ]
    };
    
    return permissions[role] || [];
  }

  // Check if user has permission
  static hasPermission(user, permission) {
    if (!user || !user.permissions) return false;
    
    // In Mongoose permissions is Array of Strings
    return user.permissions.includes(permission);
  }

  // Get all users (admin only)
  static async getAll() {
    const users = await User.find({ isActive: true }).sort({ createdAt: -1 });

    return users.map(user => {
        const userObj = user.toObject();
        delete userObj.password;
        return userObj;
    });
  }

  // Get hospital authorities
  static async getHospitalAuthorities() {
    // Join with Hospital to get name? 
    // Mongoose populate.
    const authorities = await User.find({ 
        userType: 'hospital-authority', 
        isActive: true 
    })
    .populate('hospital_id', 'name')
    .sort({ createdAt: -1 });

    return authorities.map(u => {
        const userObj = u.toObject();
        // Flat map hospital name if needed for frontend compat
        if (userObj.hospital_id && userObj.hospital_id.name) {
            userObj.hospitalName = userObj.hospital_id.name;
        }
        delete userObj.password;
        return userObj;
    });
  }

  // Deactivate user
  static async deactivateUser(id) {
    return User.findByIdAndUpdate(id, { isActive: false });
  }

  // Verify JWT token
  static verifyToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Create user (for testing purposes)
  static async create(userData) {
    const { email, password, name, phone, userType, hospital_id, balance } = userData;

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await User.create({
        email, 
        password: hashedPassword, 
        name, 
        phone, 
        userType, 
        hospital_id, 
        balance: balance || 10000.00
    });
    
    const userObj = user.toObject();
    delete userObj.password;
    return userObj;
  }

  // Generate JWT token (for testing purposes)
  static async generateToken(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return jwt.sign(
      {
        userId: user._id,
        email: user.email,
        userType: user.userType,
        hospital_id: user.hospital_id
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
  }
}

module.exports = UserService;