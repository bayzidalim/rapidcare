#!/usr/bin/env node

const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testMyHospitalEndpoint() {
  console.log('🧪 Testing /api/hospitals/my-hospital endpoint...');
  
  // Create a test JWT token for the hospital authority user
  const config = require('./config/config');
  const token = jwt.sign(
    { 
      id: 829, 
      email: 'hospital@test.com', 
      userType: 'hospital-authority',
      hospital_id: 770
    }, 
    config.jwtSecret,
    { expiresIn: '1h' }
  );

  console.log('✅ Token created for hospital authority user (ID: 829)');

  // Start the server
  const app = require('./index.js');
  const server = app.listen(5001, async () => {
    console.log('🚀 Test server started on port 5001');
    
    try {
      // Wait a moment for server to fully start
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test the endpoint
      const response = await axios.get('http://localhost:5001/api/hospitals/my-hospital', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ API Response Status:', response.status);
      console.log('✅ API Response Data:', JSON.stringify(response.data, null, 2));
      
      if (response.data.success && response.data.data) {
        console.log('🎉 Hospital data retrieved successfully!');
        console.log('   Hospital Name:', response.data.data.name);
        console.log('   Approval Status:', response.data.data.approvalStatus);
      }
      
    } catch (error) {
      console.log('❌ API Error Status:', error.response?.status);
      console.log('❌ API Error Data:', JSON.stringify(error.response?.data, null, 2));
      console.log('❌ Error Message:', error.message);
    } finally {
      server.close();
      console.log('🔚 Test server stopped');
    }
  });
}

// Run the test
testMyHospitalEndpoint().catch(console.error);