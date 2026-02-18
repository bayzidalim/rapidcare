const User = require('../models/User');
const Hospital = require('../models/Hospital');
const UserService = require('./userService');

class HospitalAuthorityValidationService {
  /**
   * Validate all hospital authority users and fix any linking issues
   * @returns {Object} Validation results with fixes applied
   */
  static async validateAndFixAll() {
    try {
      console.log('Starting hospital authority validation...');
      
      const users = await User.find({ userType: 'hospital-authority' });
      const results = {
        total: users.length,
        fixed: 0,
        errors: [],
        details: []
      };
      
      for (const user of users) {
        const userResult = await this.validateAndFixUser(user);
        results.details.push(userResult);
        
        if (userResult.fixed) {
          results.fixed++;
        }
        
        if (userResult.error) {
          results.errors.push(userResult.error);
        }
      }
      
      console.log(`Validation completed: ${results.fixed}/${results.total} users fixed`);
      return results;
      
    } catch (error) {
      console.error('Error during hospital authority validation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Validate and fix a single hospital authority user
   * @param {Object} user - User document
   * @returns {Object} Validation result for this user
   */
  static async validateAndFixUser(user) {
    const result = {
      userId: user._id,
      email: user.email,
      status: 'OK',
      fixed: false,
      error: null
    };
    
    try {
      let needsSave = false;
      let updates = [];

      // Case 1: User has 'hospital-authority' type but no hospital_id
      // But maybe they are pending assignment? 
      // If checks strict requirement:
      if (!user.hospital_id) {
          // If they intend to add a hospital later, this is fine.
          // But usually authority implies existing hospital link or pending one.
          // If we can't fix it (don't know which hospital), we flag it.
          // Or if we know from other sources? No.
          // Only fix if permissions/role missing.
          result.status = 'NO_HOSPITAL_ASSIGNED';
          // Not an error per se, but state.
      } else {
           // Validate Hospital existence
           const hospital = await Hospital.findById(user.hospital_id);
           if (!hospital) {
               result.status = 'INVALID_HOSPITAL_LINK';
               result.error = `Hospital ${user.hospital_id} does not exist`;
               // Could remove link?
               // user.hospital_id = null; needsSave = true;
           }
      }

      // Fix missing role/permissions
      if (!user.hospitalRole) {
          user.hospitalRole = 'staff'; // Default
          needsSave = true;
          updates.push('SET_DEFAULT_ROLE');
      }

      // Fix missing permissions
      if (!user.permissions || user.permissions.length === 0) {
          user.permissions = UserService.getPermissionsForRole(user.hospitalRole || 'staff');
          needsSave = true;
          updates.push('SET_DEFAULT_PERMISSIONS');
      }
      
      if (needsSave) {
          await user.save();
          result.fixed = true;
          result.status = `FIXED: ${updates.join(', ')}`;
      }
      
      return result;
      
    } catch (error) {
      result.error = `Error fixing user ${user.email}: ${error.message}`;
      return result;
    }
  }
  
  /**
   * Get validation status for all hospital authority users
   * @returns {Array} Array of validation status objects
   */
  static async getValidationStatus() {
    try {
      const users = await User.find({ userType: 'hospital-authority' }).populate('hospital_id', 'name');
      return users.map(u => ({
          userId: u._id,
          email: u.email,
          userType: u.userType,
          hospitalId: u.hospital_id ? u.hospital_id._id : null,
          hospitalName: u.hospital_id ? u.hospital_id.name : null,
          role: u.hospitalRole,
          permissionsCount: u.permissions ? u.permissions.length : 0,
          status: u.hospital_id ? 'OK' : 'NO_HOSPITAL_ASSIGNED'
      }));
    } catch (error) {
      console.error('Error getting validation status:', error);
      return [];
    }
  }
  
  /**
   * Check if a specific user has proper hospital linking
   * @param {string} userId - User ID to check
   * @returns {Object} Validation result
   */
  static async validateUser(userId) {
    try {
      const user = await User.findById(userId).populate('hospital_id');
      
      if (!user || user.userType !== 'hospital-authority') {
        return {
          valid: false,
          error: 'User not found or not a hospital authority'
        };
      }
      
      const isValid = !!user.hospital_id; // Simple check
      
      return {
        valid: isValid,
        user: {
            userId: user._id,
            email: user.email,
            hospitalId: user.hospital_id ? user.hospital_id._id : null
        },
        status: isValid ? 'OK' : 'NO_HOSPITAL_LINK'
      };
      
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

module.exports = HospitalAuthorityValidationService;
