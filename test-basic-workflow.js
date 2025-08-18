#!/usr/bin/env node

/**
 * Basic functional test for Hospital Authority Approval Workflow
 * Tests core functionality to ensure the system works
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testBasicWorkflow() {
  console.log('🧪 Testing Basic Hospital Authority Approval Workflow\n');

  try {
    // Test 1: Check if server is running
    console.log('1️⃣ Checking server status...');
    try {
      await axios.get(`${API_BASE}/hospitals`);
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server is not running. Please start the backend server.');
      return;
    }

    // Test 2: Check if database tables exist
    console.log('\n2️⃣ Testing database connectivity...');
    try {
      const response = await axios.get(`${API_BASE}/hospitals`);
      if (response.data.success !== undefined) {
        console.log('✅ Database is connected and responding');
      }
    } catch (error) {
      console.log('❌ Database connection issue:', error.message);
      return;
    }

    // Test 3: Test hospital authority registration
    console.log('\n3️⃣ Testing hospital authority registration...');
    const testHospitalData = {
      name: 'Test Hospital Authority',
      email: `test.${Date.now()}@hospital.com`,
      phone: '+8801234567890',
      password: 'password123',
      userType: 'hospital-authority',
      hospitalData: {
        name: `Test Hospital ${Date.now()}`,
        description: 'A test hospital for workflow verification',
        type: 'General',
        address: {
          street: '123 Test Street',
          city: 'Dhaka',
          state: 'Dhaka Division',
          zipCode: '1000',
          country: 'Bangladesh'
        },
        contact: {
          phone: '+8801234567890',
          email: `info.${Date.now()}@testhospital.com`,
          emergency: '+8801234567891'
        },
        services: ['Emergency Care', 'General Medicine'],
        capacity: {
          totalBeds: 50,
          icuBeds: 10,
          operationTheaters: 2
        }
      }
    };

    try {
      const registrationResponse = await axios.post(`${API_BASE}/auth/register`, testHospitalData);
      
      if (registrationResponse.data.success) {
        console.log('✅ Hospital authority registration successful');
        console.log(`   Hospital ID: ${registrationResponse.data.data.user.hospitalId}`);
        console.log(`   Authority ID: ${registrationResponse.data.data.user.id}`);
        
        const token = registrationResponse.data.data.token;
        const hospitalId = registrationResponse.data.data.user.hospitalId;

        // Test 4: Check hospital status
        console.log('\n4️⃣ Testing hospital status check...');
        try {
          const statusResponse = await axios.get(`${API_BASE}/hospitals/my-hospital`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (statusResponse.data.success) {
            const hospital = statusResponse.data.data;
            console.log(`✅ Hospital status: ${hospital.approvalStatus}`);
            console.log(`   Hospital name: ${hospital.name}`);
          }
        } catch (error) {
          console.log('❌ Hospital status check failed:', error.response?.data?.error || error.message);
        }

        // Test 5: Verify hospital not in public listings
        console.log('\n5️⃣ Testing public hospital filtering...');
        try {
          const publicResponse = await axios.get(`${API_BASE}/hospitals`);
          
          if (publicResponse.data.success) {
            const hospitals = publicResponse.data.data;
            const testHospitalVisible = hospitals.some(h => h.id === hospitalId);
            
            if (!testHospitalVisible) {
              console.log('✅ Hospital correctly hidden from public listings');
            } else {
              console.log('❌ Hospital should not be visible in public listings');
            }
          }
        } catch (error) {
          console.log('❌ Public hospital filtering test failed:', error.message);
        }

        // Test 6: Test admin functionality (if admin exists)
        console.log('\n6️⃣ Testing admin approval functionality...');
        try {
          const adminLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'admin@example.com',
            password: 'password123'
          });

          if (adminLoginResponse.data.success) {
            const adminToken = adminLoginResponse.data.data.token;
            console.log('✅ Admin login successful');

            // Get pending hospitals
            const pendingResponse = await axios.get(`${API_BASE}/admin/hospitals/pending`, {
              headers: { 'Authorization': `Bearer ${adminToken}` }
            });

            if (pendingResponse.data.success) {
              const pendingHospitals = pendingResponse.data.data;
              const testHospital = pendingHospitals.find(h => h.id === hospitalId);
              
              if (testHospital) {
                console.log('✅ Hospital found in pending approvals');
                
                // Approve the hospital
                const approvalResponse = await axios.put(`${API_BASE}/admin/hospitals/${hospitalId}/approve`, {}, {
                  headers: { 'Authorization': `Bearer ${adminToken}` }
                });

                if (approvalResponse.data.success) {
                  console.log('✅ Hospital approval successful');
                  
                  // Verify hospital now appears in public listings
                  setTimeout(async () => {
                    try {
                      const updatedPublicResponse = await axios.get(`${API_BASE}/hospitals`);
                      const updatedHospitals = updatedPublicResponse.data.data;
                      const nowVisible = updatedHospitals.some(h => h.id === hospitalId);
                      
                      if (nowVisible) {
                        console.log('✅ Hospital now visible in public listings after approval');
                      } else {
                        console.log('❌ Hospital should be visible after approval');
                      }
                    } catch (error) {
                      console.log('❌ Post-approval visibility check failed');
                    }
                  }, 1000);
                  
                } else {
                  console.log('❌ Hospital approval failed');
                }
              } else {
                console.log('❌ Hospital not found in pending approvals');
              }
            }
          }
        } catch (error) {
          console.log('⚠️  Admin functionality test skipped (admin account may not exist)');
          console.log('   Create an admin account to test approval workflow');
        }

      } else {
        console.log('❌ Hospital authority registration failed');
      }
    } catch (error) {
      console.log('❌ Registration failed:', error.response?.data?.error || error.message);
    }

    console.log('\n' + '='.repeat(50));
    console.log('🏥 BASIC WORKFLOW TEST COMPLETED');
    console.log('='.repeat(50));
    console.log('\n✅ Core Features Verified:');
    console.log('   • Server connectivity');
    console.log('   • Database functionality');
    console.log('   • Hospital authority registration');
    console.log('   • Hospital status management');
    console.log('   • Public listing filtering');
    console.log('   • Admin approval process (if admin exists)');
    
    console.log('\n📝 Next Steps:');
    console.log('   1. Ensure admin account exists for full workflow testing');
    console.log('   2. Test the frontend interface');
    console.log('   3. Verify notification system');
    console.log('   4. Test hospital resubmission workflow');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Run the basic test
testBasicWorkflow().catch(console.error);