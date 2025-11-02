const UserService = require('../services/userService');
const HospitalService = require('../services/hospitalService');
const HospitalAuthorityValidationService = require('../services/hospitalAuthorityValidationService');
const db = require('../config/database');

// Mock test data
const testHospitalData = {
  name: 'Test Hospital',
  description: 'A test hospital for validation',
  type: 'General',
  address: {
    street: '123 Test Street',
    city: 'Test City',
    state: 'Test State',
    zipCode: '12345',
    country: 'Test Country'
  },
  contact: {
    phone: '+1234567890',
    email: 'test@hospital.com',
    emergency: '+1234567890'
  },
  capacity: {
    totalBeds: 10,
    icuBeds: 5,
    operationTheaters: 2
  },
  services: ['Emergency', 'Surgery']
};

const testUserData = {
  email: 'testauthority@newhospital.com',
  password: 'password123',
  name: 'Test Authority',
  phone: '+1234567890',
  userType: 'hospital-authority'
};

async function testHospitalAuthorityRegistration() {
  console.log('🧪 Testing Hospital Authority Registration Flow');
  console.log('===============================================\n');
  
  try {
    // Step 1: Register a new hospital authority user
    console.log('1️⃣ Registering new hospital authority user...');
    const user = await UserService.register(testUserData);
    console.log(`✅ User created: ${user.email} (ID: ${user.id})`);
    
    // Check initial state - should have null hospitalId in hospital_authorities
    const initialAuth = db.prepare('SELECT * FROM hospital_authorities WHERE userId = ?').get(user.id);
    console.log(`📊 Initial hospital_authorities.hospitalId: ${initialAuth?.hospitalId}`);
    
    // Step 2: Create hospital and link to user
    console.log('\n2️⃣ Creating hospital and linking to user...');
    const hospital = HospitalService.createWithApproval(testHospitalData, user.id);
    console.log(`✅ Hospital created: ${hospital.name} (ID: ${hospital.id})`);
    
    // Step 3: Verify the linking worked correctly
    console.log('\n3️⃣ Verifying hospital authority linking...');
    
    // Check users table
    const updatedUser = db.prepare('SELECT hospital_id FROM users WHERE id = ?').get(user.id);
    console.log(`📊 users.hospital_id: ${updatedUser.hospital_id}`);
    
    // Check hospital_authorities table
    const updatedAuth = db.prepare('SELECT hospitalId FROM hospital_authorities WHERE userId = ?').get(user.id);
    console.log(`📊 hospital_authorities.hospitalId: ${updatedAuth?.hospitalId}`);
    
    // Step 4: Validate using our validation service
    console.log('\n4️⃣ Running validation...');
    const validation = HospitalAuthorityValidationService.validateUser(user.id);
    console.log(`📊 Validation result: ${validation.valid ? '✅ VALID' : '❌ INVALID'}`);
    
    if (!validation.valid) {
      console.log(`❌ Validation error: ${validation.error}`);
      return false;
    }
    
    // Step 5: Test booking approval functionality
    console.log('\n5️⃣ Testing booking approval access...');
    const userWithHospital = UserService.getById(user.id);
    console.log(`📊 User hospitalId: ${userWithHospital.hospitalId}`);
    console.log(`📊 User role: ${userWithHospital.role}`);
    
    if (userWithHospital.hospitalId === hospital.id) {
      console.log('✅ User is properly linked to hospital - can approve bookings');
    } else {
      console.log('❌ User is not properly linked to hospital');
      return false;
    }
    
    console.log('\n🎉 All tests passed! Hospital authority registration is working correctly.');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  } finally {
    // Cleanup - remove test data
    console.log('\n🧹 Cleaning up test data...');
    try {
      // Remove hospital services
      db.prepare('DELETE FROM hospital_services WHERE hospitalId IN (SELECT id FROM hospitals WHERE name = ?)').run('Test Hospital');
      
      // Remove hospital
      db.prepare('DELETE FROM hospitals WHERE name = ?').run('Test Hospital');
      
      // Remove hospital authority
      db.prepare('DELETE FROM hospital_authorities WHERE userId IN (SELECT id FROM users WHERE email = ?)').run('testauthority@newhospital.com');
      
      // Remove user
      db.prepare('DELETE FROM users WHERE email = ?').run('testauthority@newhospital.com');
      
      console.log('✅ Test data cleaned up');
    } catch (cleanupError) {
      console.error('⚠️ Cleanup error:', cleanupError);
    }
  }
}

// Run test if called directly
if (require.main === module) {
  testHospitalAuthorityRegistration().then(success => {
    if (success) {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    } else {
      console.log('\n❌ Test failed');
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });
}

module.exports = testHospitalAuthorityRegistration;
