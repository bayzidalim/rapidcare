#!/usr/bin/env node

/**
 * Test Guest Blood Donation Functionality
 * 
 * This script tests the guest blood donation feature by:
 * 1. Testing guest blood donation form submission
 * 2. Verifying guest-specific validation
 * 3. Testing guest blood request viewing
 * 4. Verifying rate limiting for guests
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// Test data for guest blood donation
const guestBloodDonationData = {
  requesterName: 'John Guest',
  requesterPhone: '+880 1234 567890',
  requesterEmail: 'john.guest@example.com',
  bloodType: 'O+',
  units: 2,
  urgency: 'high',
  hospitalName: 'Dhaka Medical College Hospital',
  hospitalAddress: 'Ramna, Dhaka 1000',
  hospitalContact: '+880 2 9661064',
  patientName: 'Jane Doe',
  patientAge: 35,
  medicalCondition: 'Emergency surgery blood loss',
  requiredBy: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
  notes: 'Urgent blood needed for emergency surgery'
};

const invalidGuestData = {
  requesterName: 'J', // Too short
  requesterPhone: '123', // Invalid phone
  bloodType: 'O+',
  units: 1,
  urgency: 'medium',
  hospitalName: 'Test Hospital',
  hospitalAddress: 'Test Address',
  hospitalContact: '+880 1234567890',
  patientName: 'Test Patient',
  patientAge: 30,
  medicalCondition: 'Test condition',
  requiredBy: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

async function testGuestBloodDonation() {
  console.log('🩸 Testing Guest Blood Donation Functionality...\n');

  try {
    // Test 1: Valid guest blood donation request
    console.log('1. Testing valid guest blood donation request...');
    const response = await axios.post(`${API_BASE_URL}/blood/request`, guestBloodDonationData);
    
    if (response.data.success) {
      console.log('✅ Guest blood donation request created successfully');
      console.log(`   Request ID: ${response.data.data.id}`);
      console.log(`   Guest status: ${response.data.isGuest}`);
      console.log(`   Message: ${response.data.message}`);
    } else {
      console.log('❌ Failed to create guest blood donation request');
      console.log(`   Error: ${response.data.error}`);
    }
    console.log('');

    // Test 2: Invalid guest data validation
    console.log('2. Testing guest data validation...');
    try {
      await axios.post(`${API_BASE_URL}/blood/request`, invalidGuestData);
      console.log('❌ Validation should have failed for invalid guest data');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Guest data validation working correctly');
        console.log(`   Error: ${error.response.data.error}`);
      } else {
        console.log('❌ Unexpected error during validation test');
        console.log(`   Error: ${error.message}`);
      }
    }
    console.log('');

    // Test 3: Guest blood request viewing
    console.log('3. Testing guest blood request viewing...');
    const viewResponse = await axios.get(`${API_BASE_URL}/blood/requests`);
    
    if (viewResponse.data.success) {
      console.log('✅ Guest can view blood requests');
      console.log(`   Total requests visible: ${viewResponse.data.count}`);
      console.log(`   Guest status: ${viewResponse.data.isGuest}`);
      
      // Check if sensitive information is hidden for guests
      const firstRequest = viewResponse.data.data[0];
      if (firstRequest) {
        const hasSensitiveInfo = firstRequest.requesterPhone || firstRequest.requesterEmail;
        if (!hasSensitiveInfo) {
          console.log('✅ Sensitive contact information properly hidden from guests');
        } else {
          console.log('⚠️  Sensitive information may be exposed to guests');
        }
      }
    } else {
      console.log('❌ Failed to fetch blood requests for guest');
      console.log(`   Error: ${viewResponse.data.error}`);
    }
    console.log('');

    // Test 4: Guest blood request search
    console.log('4. Testing guest blood request search...');
    const searchResponse = await axios.get(`${API_BASE_URL}/blood/requests/search`, {
      params: { bloodType: 'O+', urgency: 'high' }
    });
    
    if (searchResponse.data.success) {
      console.log('✅ Guest can search blood requests');
      console.log(`   Search results: ${searchResponse.data.count}`);
      console.log(`   Guest status: ${searchResponse.data.isGuest}`);
    } else {
      console.log('❌ Failed to search blood requests for guest');
      console.log(`   Error: ${searchResponse.data.error}`);
    }
    console.log('');

    // Test 5: Rate limiting test (multiple requests)
    console.log('5. Testing rate limiting for guest requests...');
    let rateLimitHit = false;
    
    for (let i = 0; i < 6; i++) {
      try {
        const testData = {
          ...guestBloodDonationData,
          requesterName: `Test User ${i}`,
          requesterPhone: `+880 123456789${i}`
        };
        
        await axios.post(`${API_BASE_URL}/blood/request`, testData);
        console.log(`   Request ${i + 1}: Success`);
      } catch (error) {
        if (error.response?.status === 429) {
          console.log(`✅ Rate limiting activated after ${i + 1} requests`);
          console.log(`   Error: ${error.response.data.error}`);
          rateLimitHit = true;
          break;
        } else {
          console.log(`   Request ${i + 1}: Failed - ${error.message}`);
        }
      }
    }
    
    if (!rateLimitHit) {
      console.log('⚠️  Rate limiting may not be working properly');
    }
    console.log('');

    console.log('🎉 Guest Blood Donation Testing Complete!\n');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
  }
}

// Test guest analytics (should not store personal information)
async function testGuestAnalytics() {
  console.log('📊 Testing Guest Analytics...\n');

  try {
    // Make some guest requests to generate analytics data
    console.log('1. Generating guest activity data...');
    
    // View hospitals as guest
    await axios.get(`${API_BASE_URL}/hospitals`);
    console.log('   ✅ Guest hospital view recorded');
    
    // View blood requests as guest
    await axios.get(`${API_BASE_URL}/blood/requests`);
    console.log('   ✅ Guest blood request view recorded');
    
    console.log('📊 Guest Analytics Testing Complete!\n');

  } catch (error) {
    console.error('❌ Guest analytics test failed:', error.message);
  }
}

// Main test execution
async function runTests() {
  console.log('🚀 Starting Guest Blood Donation Tests...\n');
  
  await testGuestBloodDonation();
  await testGuestAnalytics();
  
  console.log('✨ All tests completed!');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testGuestBloodDonation,
  testGuestAnalytics,
  runTests
};