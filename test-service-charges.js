#!/usr/bin/env node

/**
 * Test script to generate service charge data for admin dashboard
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test credentials
const testCredentials = {
    email: 'user@example.com',
    password: 'password123'
};

const adminCredentials = {
    email: 'admin@example.com',
    password: 'password123'
};

async function testServiceCharges() {
    console.log('🧪 Testing Service Charge Tracking\n');

    try {
        // Step 1: Login as regular user
        console.log('1️⃣ Logging in as user...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, testCredentials);
        const { token } = loginResponse.data.data;
        console.log('✅ User login successful');

        // Step 2: Create a booking with payment
        console.log('\n2️⃣ Creating booking with payment...');
        const bookingData = {
            hospitalId: 761, // Use existing hospital
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
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (bookingResponse.data.success) {
            const bookingId = bookingResponse.data.data.id;
            console.log(`✅ Booking created: ${bookingId}`);

            // Step 3: Process payment
            console.log('\n3️⃣ Processing payment...');
            const paymentData = {
                bookingId: bookingId,
                transactionId: 'TEST_TXN_' + Date.now(),
                amount: 156 // ৳120 base + 30% service charge = ৳156
            };

            const paymentResponse = await axios.post(`${API_BASE}/bookings/payment`, paymentData, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (paymentResponse.data.success) {
                console.log('✅ Payment processed successfully');
                console.log(`💰 Total Amount: ৳${paymentResponse.data.data.payment.amount}`);
                console.log(`🏥 Hospital Share: ৳${paymentResponse.data.data.payment.cost_breakdown.hospital_share}`);
                console.log(`⚡ Service Charge: ৳${paymentResponse.data.data.payment.cost_breakdown.service_charge_share}`);
            }
        }

        // Step 4: Login as admin and check service charges
        console.log('\n4️⃣ Logging in as admin...');
        const adminLoginResponse = await axios.post(`${API_BASE}/auth/login`, adminCredentials);
        const adminToken = adminLoginResponse.data.data.token;
        console.log('✅ Admin login successful');

        // Step 5: Get service charge analytics
        console.log('\n5️⃣ Fetching service charge analytics...');
        const serviceChargeResponse = await axios.get(`${API_BASE}/admin/service-charges`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        if (serviceChargeResponse.data.success) {
            const analytics = serviceChargeResponse.data.data;
            console.log('✅ Service charge analytics retrieved:');
            console.log(`💰 Total Service Charges: ৳${analytics.totalServiceCharges}`);
            console.log(`🏥 Hospitals with earnings: ${analytics.earningsByHospital.length}`);
            console.log(`📊 Time periods with data: ${analytics.earningsByTimePeriod.length}`);

            if (analytics.totalServiceCharges > 0) {
                console.log('\n🎉 SUCCESS! Service charges are now being tracked properly!');
            } else {
                console.log('\n⚠️  No service charges found. May need to check data flow.');
            }
        }

        // Step 6: Get platform financials
        console.log('\n6️⃣ Fetching platform financials...');
        const financialsResponse = await axios.get(`${API_BASE}/admin/financials`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        if (financialsResponse.data.success) {
            const financials = financialsResponse.data.data;
            console.log('✅ Platform financials retrieved:');
            console.log(`💰 Total Revenue: ৳${financials.totalRevenue}`);
            console.log(`⚡ Total Service Charges: ৳${financials.totalServiceCharges}`);
            console.log(`🏥 Total Hospital Earnings: ৳${financials.totalHospitalEarnings}`);
            console.log(`📊 Service Charge Rate: ${(financials.serviceChargeRate * 100).toFixed(1)}%`);
        }

    } catch (error) {
        console.log('❌ Test failed:', error.message);
        if (error.response) {
            console.log('📄 Response data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Run the test
testServiceCharges();