#!/usr/bin/env node

/**
 * Frontend Health Check Script
 * Verifies that the frontend application is running and can connect to the backend
 */

const http = require('http');
const https = require('https');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

console.log('🏥 RapidCare Frontend Health Check');
console.log('=====================================');

// Health check function
async function checkEndpoint(url, name) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const startTime = Date.now();
    
    const req = client.get(url, (res) => {
      const responseTime = Date.now() - startTime;
      const status = res.statusCode;
      
      console.log(`${name}:`);
      console.log(`  URL: ${url}`);
      console.log(`  Status: ${status}`);
      console.log(`  Response Time: ${responseTime}ms`);
      
      if (status >= 200 && status < 400) {
        console.log(`  ✅ ${name} is healthy`);
        resolve({ success: true, status, responseTime });
      } else {
        console.log(`  ❌ ${name} returned status ${status}`);
        resolve({ success: false, status, responseTime });
      }
    });
    
    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      console.log(`${name}:`);
      console.log(`  URL: ${url}`);
      console.log(`  Error: ${error.message}`);
      console.log(`  ❌ ${name} is not accessible`);
      resolve({ success: false, error: error.message, responseTime });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      console.log(`${name}:`);
      console.log(`  URL: ${url}`);
      console.log(`  ❌ ${name} timed out (10s)`);
      resolve({ success: false, error: 'Timeout', responseTime: 10000 });
    });
  });
}

// Main health check
async function runHealthCheck() {
  console.log(`🔍 Checking frontend at: ${FRONTEND_URL}`);
  console.log(`🔍 Checking backend at: ${BACKEND_URL}/health`);
  console.log('');
  
  const results = [];
  
  // Check frontend
  const frontendResult = await checkEndpoint(FRONTEND_URL, 'Frontend');
  results.push({ name: 'Frontend', ...frontendResult });
  
  console.log('');
  
  // Check backend API
  const backendResult = await checkEndpoint(`${BACKEND_URL}/health`, 'Backend API');
  results.push({ name: 'Backend API', ...backendResult });
  
  console.log('');
  console.log('📊 Health Check Summary:');
  console.log('========================');
  
  let allHealthy = true;
  
  results.forEach(result => {
    const status = result.success ? '✅ Healthy' : '❌ Unhealthy';
    console.log(`${result.name}: ${status} (${result.responseTime}ms)`);
    if (!result.success) allHealthy = false;
  });
  
  console.log('');
  
  if (allHealthy) {
    console.log('🎉 All services are healthy!');
    console.log('🚀 RapidCare is ready to serve emergency medical needs');
    process.exit(0);
  } else {
    console.log('⚠️  Some services are not healthy');
    console.log('🔧 Please check the configuration and try again');
    process.exit(1);
  }
}

// Environment check
console.log('🔧 Environment Configuration:');
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`  NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL || 'not set'}`);
console.log(`  NEXT_PUBLIC_ENABLE_POLLING: ${process.env.NEXT_PUBLIC_ENABLE_POLLING || 'not set'}`);
console.log('');

// Run the health check
runHealthCheck().catch(error => {
  console.error('💥 Health check failed:', error.message);
  process.exit(1);
});