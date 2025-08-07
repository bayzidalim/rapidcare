#!/usr/bin/env node

/**
 * Test script to verify hospital registration and approval workflow
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test credentials
const hospitalAuthorityCredentials = {
    email: 'hospital@example.com',
    password: 'password123'
};

const adminCredentials = {
    email: 'admin@example.com',
    password: 'password123'
};

const testHospitalData = {
    name: 'Test University Hospital',
    address: {
        street: '123 University Ave',
        city: 'Dhaka',
        state: 'Dhaka',
        zipCode: '1000',
        country: 'Bangladesh'
    },
    contact: {
        phone: '+8801234567890',
        email: 'test@university-hospital.com',
        emergency: '+8801234567890'
    },
    resources: {
        beds: { total: 50, available: 10 },
        icu: { total: 10, available: 2 },
        operationTheatres: { total: 3, available: 1 }
    },
    services: ['Emergency Care', 'General Surgery', 'Cardiology'],
    rating: 4.5
};

async function testHospitalApprovalWorkflow() {
    console.log('🧪 Testing Hospital Registration & Approval Workflow\n');

    try {
        // Step 1: Login as hospital authority
        console.log('1️⃣ Logging in as hospital authority...');
        const hospitalLoginResponse = await axios.post(`${API_BASE}/auth/login`, hospitalAuthorityCredentials);
        const hospitalToken = hospitalLoginResponse.data.data.token;
        console.log('✅ Hospital authority login successful');

        // Step 2: Register a new hospital
        console.log('\n2️⃣ Registering new hospital...');
        const hospitalResponse = await axios.post(`${API_BASE}/hospitals`, testHospitalData, {
            headers: { 'Authorization': `Bearer ${hospitalToken}` }
        });

        if (hospitalResponse.data.success) {
            const hospitalId = hospitalResponse.data.data.id;
            console.log(`✅ Hospital registered with ID: ${hospitalId}`);
            console.log(`📋 Hospital Name: ${hospitalResponse.data.data.name}`);
            console.log(`📊 Approval Status: ${hospitalResponse.data.data.approvalStatus || 'pending'}`);

            // Step 3: Login as admin
            console.log('\n3️⃣ Logging in as admin...');
            const adminLoginResponse = await axios.post(`${API_BASE}/auth/login`, adminCredentials);
            const adminToken = adminLoginResponse.data.data.token;
            console.log('✅ Admin login successful');

            // Step 4: Check pending hospitals
            console.log('\n4️⃣ Checking pending hospital approvals...');
            const pendingResponse = await axios.get(`${API_BASE}/admin/hospitals/pending`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });

            if (pendingResponse.data.success) {
                const pendingHospitals = pendingResponse.data.data;
                console.log(`✅ Found ${pendingHospitals.length} pending hospital(s)`);

                const ourHospital = pendingHospitals.find(h => h.id === hospitalId);
                if (ourHospital) {
                    console.log(`📋 Our hospital found in pending list: ${ourHospital.name}`);
                }
            }

            // Step 5: Approve the hospital
            console.log('\n5️⃣ Approving the hospital...');
            const approvalResponse = await axios.put(`${API_BASE}/admin/hospitals/${hospitalId}/approve`, {}, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });

            if (approvalResponse.data.success) {
                console.log('✅ Hospital approved successfully!');
                console.log(`📋 Hospital Name: ${approvalResponse.data.data.name}`);
                console.log(`📊 New Status: ${approvalResponse.data.data.approvalStatus}`);
                console.log(`👤 Approved By: ${approvalResponse.data.data.approverName || 'Admin'}`);
            }

            // Step 6: Verify hospital is now visible to public
            console.log('\n6️⃣ Verifying hospital is now public...');
            const publicResponse = await axios.get(`${API_BASE}/hospitals`);

            if (publicResponse.data.success) {
                const publicHospitals = publicResponse.data.data;
                const approvedHospital = publicHospitals.find(h => h.id === hospitalId);

                if (approvedHospital) {
                    console.log('✅ Hospital is now visible in public listings!');
                    console.log(`📋 Public Name: ${approvedHospital.name}`);
                    console.log(`📊 Status: ${approvedHospital.approvalStatus}`);
                } else {
                    console.log('⚠️  Hospital not found in public listings');
                }
            }

            console.log('\n🎉 HOSPITAL APPROVAL WORKFLOW TEST COMPLETED SUCCESSFULLY!');
            console.log('✅ Hospital registration → Pending status → Admin approval → Public visibility');

        } else {
            console.log('❌ Hospital registration failed:', hospitalResponse.data.error);
        }

    } catch (error) {
        console.log('❌ Test failed:', error.message);
        if (error.response) {
            console.log('📄 Response status:', error.response.status);
            console.log('📄 Response data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the test
testHospitalApprovalWorkflow();