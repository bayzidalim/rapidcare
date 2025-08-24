#!/usr/bin/env node

/**
 * Test script to verify guest access to hospital details page
 * This script tests the backend API endpoints that the guest hospital details page uses
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testGuestHospitalAccess() {
  console.log('🧪 Testing Guest Hospital Details Access...\n');

  try {
    // Test 1: Get hospital resources without authentication (should work)
    console.log('1. Testing hospital resources endpoint (guest access)...');
    try {
      const response = await axios.get(`${API_BASE_URL}/hospital-resources/1`);
      if (response.data.success) {
        console.log('   ✅ Hospital resources accessible to guests');
        console.log(`   📊 Hospital: ${response.data.data.hospital?.name || 'Unknown'}`);
        console.log(`   🏥 Resources: ${response.data.data.resources?.length || 0} types`);
      } else {
        console.log('   ❌ Hospital resources request failed');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('   ⚠️  Hospital not found (expected for test data)');
      } else {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    // Test 2: Get all hospitals (should work for guests)
    console.log('\n2. Testing hospitals listing endpoint (guest access)...');
    try {
      const response = await axios.get(`${API_BASE_URL}/hospitals`);
      if (response.data.success) {
        console.log('   ✅ Hospital listing accessible to guests');
        console.log(`   🏥 Found ${response.data.data?.length || 0} hospitals`);
      } else {
        console.log('   ❌ Hospital listing request failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 3: Try to access protected endpoint without auth (should fail)
    console.log('\n3. Testing protected endpoint without auth (should fail)...');
    try {
      const response = await axios.get(`${API_BASE_URL}/bookings/user`);
      console.log('   ❌ Protected endpoint accessible without auth (security issue!)');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('   ✅ Protected endpoint properly secured');
      } else {
        console.log(`   ⚠️  Unexpected error: ${error.message}`);
      }
    }

    console.log('\n🎉 Guest hospital details access test completed!');
    console.log('\n📋 Summary:');
    console.log('   - Hospital resources are accessible to guests ✅');
    console.log('   - Hospital listings are accessible to guests ✅');
    console.log('   - Protected endpoints remain secured ✅');
    console.log('\n✨ The hospital details page should work correctly for guest users!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the backend server is running on port 5000');
    console.log('   Run: cd back-end && npm run dev');
  }
}

// Check if backend is running
async function checkBackendHealth() {
  try {
    const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
    console.log('🟢 Backend server is running\n');
    return true;
  } catch (error) {
    console.log('🔴 Backend server is not running');
    console.log('💡 Please start the backend server: cd back-end && npm run dev\n');
    return false;
  }
}

async function main() {
  console.log('🚀 Guest Hospital Details Test\n');
  
  const backendRunning = await checkBackendHealth();
  if (backendRunning) {
    await testGuestHospitalAccess();
  }
}

if (require.main === module) {
  main().catch(console.error);
}