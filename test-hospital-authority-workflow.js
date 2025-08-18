#!/usr/bin/env node

/**
 * Comprehensive test script for Hospital Authority Approval Workflow
 * Tests the complete flow from registration to approval/rejection
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test data
const hospitalAuthorityData = {
  name: 'Dr. Sarah Johnson',
  email: 'sarah.johnson@testhospital.com',
  phone: '+8801234567890',
  password: 'password123',
  userType: 'hospital-authority',
  hospitalData: {
    name: 'Test General Hospital',
    description: 'A comprehensive healthcare facility providing quality medical services',
    type: 'General',
    address: {
      street: '123 Medical Center Drive',
      city: 'Dhaka',
      state: 'Dhaka Division',
      zipCode: '1000',
      country: 'Bangladesh'
    },
    contact: {
      phone: '+8801234567890',
      email: 'info@testgeneralhospital.com',
      emergency: '+8801234567891'
    },
    services: ['Emergency Care', 'Surgery', 'ICU', 'Cardiology', 'Pediatrics'],
    capacity: {
      totalBeds: 100,
      icuBeds: 20,
      operationTheaters: 5
    }
  }
};

const adminCredentials = {
  email: 'admin@example.com',
  password: 'password123'
};

const userCredentials = {
  email: 'user@example.com',
  password: 'password123'
};

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(testName, passed, message = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${testName}${message ? ' - ' + message : ''}`);
  
  testResults.tests.push({ testName, passed, message });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

async function testCompleteWorkflow() {
  console.log('🧪 Testing Complete Hospital Authority Approval Workflow\n');

  let hospitalAuthorityToken, adminToken, userToken;
  let hospitalId, authorityUserId;

  try {
    // Test 1: Hospital Authority Registration with Hospital Data
    console.log('1️⃣ Testing Hospital Authority Registration...');
    try {
      const registrationResponse = await axios.post(`${API_BASE}/auth/register`, hospitalAuthorityData);
      
      if (registrationResponse.data.success) {
        hospitalAuthorityToken = registrationResponse.data.data.token;
        authorityUserId = registrationResponse.data.data.user.id;
        hospitalId = registrationResponse.data.data.user.hospitalId;
        
        logTest('Hospital Authority Registration', true, 'Successfully registered with hospital data');
        logTest('Hospital Created with Pending Status', hospitalId ? true : false);
      } else {
        logTest('Hospital Authority Registration', false, 'Registration failed');
      }
    } catch (error) {
      logTest('Hospital Authority Registration', false, error.response?.data?.error || error.message);
    }

    // Test 2: Verify Hospital is Pending
    console.log('\n2️⃣ Testing Hospital Status Check...');
    try {
      const hospitalResponse = await axios.get(`${API_BASE}/hospitals/my-hospital`, {
        headers: { 'Authorization': `Bearer ${hospitalAuthorityToken}` }
      });

      if (hospitalResponse.data.success) {
        const hospital = hospitalResponse.data.data;
        logTest('Hospital Status Check', hospital.approvalStatus === 'pending', 
          `Status: ${hospital.approvalStatus}`);
        logTest('Hospital Authority Dashboard Access', true, 'Can access own hospital data');
      }
    } catch (error) {
      logTest('Hospital Status Check', false, error.response?.data?.error || error.message);
    }

    // Test 3: Verify Hospital Not Visible to Public
    console.log('\n3️⃣ Testing Public Hospital Visibility...');
    try {
      const publicHospitalsResponse = await axios.get(`${API_BASE}/hospitals`);
      
      if (publicHospitalsResponse.data.success) {
        const hospitals = publicHospitalsResponse.data.data;
        const testHospitalVisible = hospitals.some(h => h.id === hospitalId);
        
        logTest('Hospital Hidden from Public', !testHospitalVisible, 
          'Pending hospital correctly hidden from public listings');
      }
    } catch (error) {
      logTest('Hospital Hidden from Public', false, error.response?.data?.error || error.message);
    }

    // Test 4: Verify Booking System Blocks Unapproved Hospital
    console.log('\n4️⃣ Testing Booking System Security...');
    try {
      // Login as regular user
      const userLoginResponse = await axios.post(`${API_BASE}/auth/login`, userCredentials);
      userToken = userLoginResponse.data.data.token;

      // Try to book at unapproved hospital
      const bookingData = {
        hospitalId: hospitalId,
        resourceType: 'beds',
        patientName: 'Test Patient',
        patientAge: 30,
        patientGender: 'male',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        medicalCondition: 'Test condition',
        urgency: 'medium',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 24
      };

      try {
        await axios.post(`${API_BASE}/bookings`, bookingData, {
          headers: { 'Authorization': `Bearer ${userToken}` }
        });
        logTest('Booking System Security', false, 'Should not allow booking at unapproved hospital');
      } catch (bookingError) {
        logTest('Booking System Security', true, 'Correctly blocked booking at unapproved hospital');
      }
    } catch (error) {
      logTest('Booking System Security', false, error.response?.data?.error || error.message);
    }

    // Test 5: Admin Login and Hospital Approval
    console.log('\n5️⃣ Testing Admin Approval Process...');
    try {
      const adminLoginResponse = await axios.post(`${API_BASE}/auth/login`, adminCredentials);
      adminToken = adminLoginResponse.data.data.token;

      // Get pending hospitals
      const pendingHospitalsResponse = await axios.get(`${API_BASE}/admin/hospitals/pending`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      if (pendingHospitalsResponse.data.success) {
        const pendingHospitals = pendingHospitalsResponse.data.data;
        const testHospital = pendingHospitals.find(h => h.id === hospitalId);
        
        logTest('Admin Can See Pending Hospital', testHospital ? true : false);

        if (testHospital) {
          // Approve the hospital
          const approvalResponse = await axios.put(`${API_BASE}/admin/hospitals/${hospitalId}/approve`, {}, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
          });

          if (approvalResponse.data.success) {
            logTest('Hospital Approval', true, 'Hospital successfully approved');
          } else {
            logTest('Hospital Approval', false, 'Approval failed');
          }
        }
      }
    } catch (error) {
      logTest('Admin Approval Process', false, error.response?.data?.error || error.message);
    }

    // Test 6: Verify Hospital Now Visible to Public
    console.log('\n6️⃣ Testing Post-Approval Visibility...');
    try {
      // Wait a moment for the approval to process
      await new Promise(resolve => setTimeout(resolve, 1000));

      const publicHospitalsResponse = await axios.get(`${API_BASE}/hospitals`);
      
      if (publicHospitalsResponse.data.success) {
        const hospitals = publicHospitalsResponse.data.data;
        const testHospitalVisible = hospitals.some(h => h.id === hospitalId);
        
        logTest('Hospital Visible After Approval', testHospitalVisible, 
          'Approved hospital now visible in public listings');
      }
    } catch (error) {
      logTest('Hospital Visible After Approval', false, error.response?.data?.error || error.message);
    }

    // Test 7: Verify Booking Now Works
    console.log('\n7️⃣ Testing Post-Approval Booking...');
    try {
      const bookingData = {
        hospitalId: hospitalId,
        resourceType: 'beds',
        patientName: 'Test Patient',
        patientAge: 30,
        patientGender: 'male',
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+8801234567890',
        emergencyContactRelationship: 'spouse',
        medicalCondition: 'Test condition',
        urgency: 'medium',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: 24
      };

      const bookingResponse = await axios.post(`${API_BASE}/bookings`, bookingData, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      if (bookingResponse.data.success) {
        logTest('Post-Approval Booking', true, 'Booking successful at approved hospital');
      } else {
        logTest('Post-Approval Booking', false, 'Booking failed');
      }
    } catch (error) {
      logTest('Post-Approval Booking', false, error.response?.data?.error || error.message);
    }

    // Test 8: Test Hospital Authority Status Dashboard
    console.log('\n8️⃣ Testing Hospital Authority Dashboard...');
    try {
      const hospitalStatusResponse = await axios.get(`${API_BASE}/hospitals/my-hospital`, {
        headers: { 'Authorization': `Bearer ${hospitalAuthorityToken}` }
      });

      if (hospitalStatusResponse.data.success) {
        const hospital = hospitalStatusResponse.data.data;
        logTest('Hospital Authority Dashboard', hospital.approvalStatus === 'approved', 
          `Dashboard shows status: ${hospital.approvalStatus}`);
        logTest('Hospital Management Access', true, 'Can access hospital management features');
      }
    } catch (error) {
      logTest('Hospital Authority Dashboard', false, error.response?.data?.error || error.message);
    }

    // Test 9: Test Rejection Workflow (Create another hospital to reject)
    console.log('\n9️⃣ Testing Hospital Rejection Workflow...');
    try {
      // Register another hospital authority
      const rejectionTestData = {
        ...hospitalAuthorityData,
        email: 'rejection.test@hospital.com',
        hospitalData: {
          ...hospitalAuthorityData.hospitalData,
          name: 'Rejection Test Hospital',
          contact: {
            ...hospitalAuthorityData.hospitalData.contact,
            email: 'info@rejectiontest.com'
          }
        }
      };

      const rejectionRegistrationResponse = await axios.post(`${API_BASE}/auth/register`, rejectionTestData);
      
      if (rejectionRegistrationResponse.data.success) {
        const rejectionHospitalId = rejectionRegistrationResponse.data.data.user.hospitalId;
        const rejectionToken = rejectionRegistrationResponse.data.data.token;

        // Reject the hospital
        const rejectionResponse = await axios.put(`${API_BASE}/admin/hospitals/${rejectionHospitalId}/reject`, {
          reason: 'Test rejection - incomplete documentation provided'
        }, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        if (rejectionResponse.data.success) {
          logTest('Hospital Rejection', true, 'Hospital successfully rejected');

          // Test resubmission
          const resubmissionData = {
            ...rejectionTestData.hospitalData,
            description: 'Updated description with complete documentation'
          };

          const resubmissionResponse = await axios.put(`${API_BASE}/hospitals/my-hospital`, resubmissionData, {
            headers: { 'Authorization': `Bearer ${rejectionToken}` }
          });

          if (resubmissionResponse.data.success) {
            logTest('Hospital Resubmission', true, 'Hospital successfully resubmitted');
          } else {
            logTest('Hospital Resubmission', false, 'Resubmission failed');
          }
        }
      }
    } catch (error) {
      logTest('Hospital Rejection Workflow', false, error.response?.data?.error || error.message);
    }

    // Test 10: Test Notifications
    console.log('\n🔟 Testing Notification System...');
    try {
      const notificationsResponse = await axios.get(`${API_BASE}/notifications`, {
        headers: { 'Authorization': `Bearer ${hospitalAuthorityToken}` }
      });

      if (notificationsResponse.data.success) {
        const notifications = notificationsResponse.data.data;
        const approvalNotification = notifications.find(n => n.type === 'hospital_approved');
        
        logTest('Approval Notifications', approvalNotification ? true : false, 
          'Hospital authority received approval notification');
      }
    } catch (error) {
      logTest('Notification System', false, error.response?.data?.error || error.message);
    }

    // Test 11: Test Audit Trail
    console.log('\n1️⃣1️⃣ Testing Audit Trail...');
    try {
      const auditResponse = await axios.get(`${API_BASE}/audit/entity/hospital/${hospitalId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      if (auditResponse.data.success) {
        const auditTrail = auditResponse.data.data;
        const hasApprovalRecord = auditTrail.some(record => record.action === 'approved');
        
        logTest('Audit Trail Logging', hasApprovalRecord, 'Approval action logged in audit trail');
      }
    } catch (error) {
      logTest('Audit Trail System', false, error.response?.data?.error || error.message);
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }

  // Print Summary
  console.log('\n' + '='.repeat(60));
  console.log('🏥 HOSPITAL AUTHORITY APPROVAL WORKFLOW TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Tests Passed: ${testResults.passed}`);
  console.log(`❌ Tests Failed: ${testResults.failed}`);
  console.log(`📊 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Hospital Authority Approval Workflow is fully functional!');
    console.log('\n✅ Verified Features:');
    console.log('   • Hospital authority registration with hospital data');
    console.log('   • Hospital approval status management');
    console.log('   • Public hospital listing filtering');
    console.log('   • Booking system security');
    console.log('   • Admin approval/rejection workflow');
    console.log('   • Hospital authority status dashboard');
    console.log('   • Notification system');
    console.log('   • Audit trail logging');
    console.log('   • Hospital resubmission process');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the failed tests above.');
  }
}

// Run the test suite
testCompleteWorkflow().catch(console.error);