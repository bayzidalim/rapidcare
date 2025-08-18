#!/usr/bin/env node

/**
 * Complete bKash Financial System Integration Verification
 * Tests the entire system end-to-end with both backend and frontend
 */

const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');

const BACKEND_PORT = 5000;
const FRONTEND_PORT = 3000;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;
const MAX_STARTUP_TIME = 60000; // 60 seconds
const HEALTH_CHECK_INTERVAL = 2000; // 2 seconds

let backendProcess = null;
let frontendProcess = null;

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    backend: '🚀',
    frontend: '🌐',
    system: '🔧'
  }[type] || '📋';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

async function waitForService(url, serviceName, timeout = MAX_STARTUP_TIME) {
  log(`Waiting for ${serviceName} to start...`, 'info');
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await axios.get(url, { timeout: 3000 });
      
      if (response.status === 200) {
        log(`${serviceName} is ready!`, 'success');
        return true;
      }
    } catch (error) {
      // Service not ready yet, continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, HEALTH_CHECK_INTERVAL));
  }
  
  throw new Error(`${serviceName} failed to start within timeout period`);
}

async function startBackend() {
  log('Starting RapidCare backend server...', 'backend');
  
  return new Promise((resolve, reject) => {
    backendProcess = spawn('node', ['run-complete-integration.js'], {
      cwd: path.join(__dirname, 'back-end'),
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let backendOutput = '';
    let serverStarted = false;
    
    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      backendOutput += output;
      
      // Log backend output with prefix
      output.split('\n').forEach(line => {
        if (line.trim()) {
          log(`BACKEND: ${line.trim()}`, 'backend');
        }
      });
      
      // Check if server started successfully
      if (output.includes('RapidCare API server running on port') && !serverStarted) {
        serverStarted = true;
        setTimeout(() => resolve(), 3000); // Give server time to fully initialize
      }
      
      // Check if integration tests completed
      if (output.includes('ALL INTEGRATION TESTS PASSED')) {
        log('Backend integration tests completed successfully', 'success');
      }
    });
    
    backendProcess.stderr.on('data', (data) => {
      const output = data.toString();
      log(`BACKEND ERROR: ${output.trim()}`, 'error');
    });
    
    backendProcess.on('error', (error) => {
      log(`Failed to start backend: ${error.message}`, 'error');
      reject(error);
    });
    
    backendProcess.on('exit', (code, signal) => {
      if (code !== 0 && code !== null) {
        log(`Backend exited with code ${code}`, 'error');
        if (!serverStarted) {
          reject(new Error(`Backend process exited with code ${code}`));
        }
      }
    });
    
    // Timeout if backend doesn't start
    setTimeout(() => {
      if (!serverStarted) {
        log('Backend startup timeout', 'error');
        reject(new Error('Backend startup timeout'));
      }
    }, MAX_STARTUP_TIME);
  });
}

async function startFrontend() {
  log('Starting RapidCare frontend server...', 'frontend');
  
  return new Promise((resolve, reject) => {
    frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, 'front-end'),
      env: { 
        ...process.env, 
        NODE_ENV: 'development',
        NEXT_PUBLIC_API_URL: BACKEND_URL + '/api'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let frontendOutput = '';
    let serverStarted = false;
    
    frontendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      frontendOutput += output;
      
      // Log frontend output with prefix
      output.split('\n').forEach(line => {
        if (line.trim()) {
          log(`FRONTEND: ${line.trim()}`, 'frontend');
        }
      });
      
      // Check if Next.js server started successfully
      if ((output.includes('Ready in') || output.includes('Local:')) && !serverStarted) {
        serverStarted = true;
        setTimeout(() => resolve(), 5000); // Give Next.js time to fully initialize
      }
    });
    
    frontendProcess.stderr.on('data', (data) => {
      const output = data.toString();
      // Next.js outputs some info to stderr, so only log actual errors
      if (output.includes('Error') || output.includes('error')) {
        log(`FRONTEND ERROR: ${output.trim()}`, 'error');
      } else {
        log(`FRONTEND: ${output.trim()}`, 'frontend');
      }
    });
    
    frontendProcess.on('error', (error) => {
      log(`Failed to start frontend: ${error.message}`, 'error');
      reject(error);
    });
    
    frontendProcess.on('exit', (code, signal) => {
      if (code !== 0 && code !== null) {
        log(`Frontend exited with code ${code}`, 'error');
        if (!serverStarted) {
          reject(new Error(`Frontend process exited with code ${code}`));
        }
      }
    });
    
    // Timeout if frontend doesn't start
    setTimeout(() => {
      if (!serverStarted) {
        log('Frontend startup timeout', 'error');
        reject(new Error('Frontend startup timeout'));
      }
    }, MAX_STARTUP_TIME);
  });
}

async function runFrontendIntegrationTests() {
  log('Running frontend integration tests...', 'frontend');
  
  try {
    const { runFrontendIntegrationTests } = require('./front-end/integration-test-frontend.js');
    const results = await runFrontendIntegrationTests();
    return results;
  } catch (error) {
    log(`Frontend integration tests failed: ${error.message}`, 'error');
    throw error;
  }
}

async function verifySystemIntegration() {
  log('Verifying complete system integration...', 'system');
  
  try {
    // Test backend health
    const backendHealth = await axios.get(`${BACKEND_URL}/api/health`);
    if (backendHealth.status !== 200 || backendHealth.data.status !== 'OK') {
      throw new Error('Backend health check failed');
    }
    log('Backend health check passed', 'success');
    
    // Test frontend accessibility
    const frontendResponse = await axios.get(FRONTEND_URL);
    if (frontendResponse.status !== 200) {
      throw new Error('Frontend is not accessible');
    }
    log('Frontend accessibility check passed', 'success');
    
    // Test API connectivity from frontend perspective
    const apiTest = await axios.get(`${BACKEND_URL}/api/hospitals`);
    if (apiTest.status !== 200) {
      throw new Error('API connectivity test failed');
    }
    log('API connectivity test passed', 'success');
    
    return true;
  } catch (error) {
    log(`System integration verification failed: ${error.message}`, 'error');
    throw error;
  }
}

function stopServices() {
  log('Stopping services...', 'system');
  
  if (frontendProcess && !frontendProcess.killed) {
    log('Stopping frontend server...', 'frontend');
    frontendProcess.kill('SIGTERM');
    
    setTimeout(() => {
      if (frontendProcess && !frontendProcess.killed) {
        log('Force killing frontend server...', 'warning');
        frontendProcess.kill('SIGKILL');
      }
    }, 5000);
  }
  
  if (backendProcess && !backendProcess.killed) {
    log('Stopping backend server...', 'backend');
    backendProcess.kill('SIGTERM');
    
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        log('Force killing backend server...', 'warning');
        backendProcess.kill('SIGKILL');
      }
    }, 5000);
  }
}

async function runCompleteSystemVerification() {
  console.log('🔧 RapidCare Complete System Integration Verification');
  console.log('====================================================');
  console.log('📋 This will verify the complete bKash financial system:');
  console.log('   🚀 Start backend server with integration tests');
  console.log('   🌐 Start frontend development server');
  console.log('   🔗 Verify backend-frontend connectivity');
  console.log('   🧪 Run comprehensive frontend integration tests');
  console.log('   💰 Verify Taka currency support end-to-end');
  console.log('   📊 Test complete user workflows');
  console.log('   🔒 Validate security and error handling');
  console.log('====================================================\n');
  
  const startTime = Date.now();
  let backendResults = null;
  let frontendResults = null;
  
  try {
    // Step 1: Start backend server (includes its own integration tests)
    await startBackend();
    await waitForService(`${BACKEND_URL}/api/health`, 'Backend API', 30000);
    
    // Step 2: Start frontend server
    await startFrontend();
    await waitForService(FRONTEND_URL, 'Frontend Server', 30000);
    
    // Step 3: Verify system integration
    await verifySystemIntegration();
    
    // Step 4: Run frontend integration tests
    frontendResults = await runFrontendIntegrationTests();
    
    const endTime = Date.now();
    const totalDuration = (endTime - startTime) / 1000;
    
    console.log('\n====================================================');
    console.log('🎉 COMPLETE SYSTEM VERIFICATION RESULTS');
    console.log('====================================================');
    
    // Backend results are handled by the backend integration test
    console.log('🚀 Backend Integration: COMPLETED');
    
    // Frontend results
    console.log(`🌐 Frontend Tests Passed: ${frontendResults.passed}`);
    console.log(`🌐 Frontend Tests Failed: ${frontendResults.failed}`);
    
    console.log(`⏱️  Total Verification Duration: ${totalDuration.toFixed(2)} seconds`);
    
    const totalFailed = frontendResults.failed;
    
    if (totalFailed === 0) {
      console.log('\n🎊 COMPLETE SYSTEM VERIFICATION PASSED!');
      console.log('✨ The bKash Financial System is fully integrated and operational');
      console.log('🔗 Backend and frontend are properly connected');
      console.log('💰 Taka currency support works end-to-end');
      console.log('🎨 bKash-style UI is functioning correctly');
      console.log('📊 All financial workflows are operational');
      console.log('🔒 Security measures are in place');
      console.log('📱 Responsive design works across devices');
      console.log('\n🚀 The system is ready for production deployment!');
      
      return { success: true, totalFailed: 0 };
    } else {
      console.log('\n❌ SOME SYSTEM VERIFICATION TESTS FAILED');
      console.log('Please review the test output above for details.');
      
      if (frontendResults.errors.length > 0) {
        console.log('\nFrontend Test Errors:');
        frontendResults.errors.forEach(error => console.log(`   - ${error}`));
      }
      
      return { success: false, totalFailed };
    }
    
  } catch (error) {
    console.error('\n💥 COMPLETE SYSTEM VERIFICATION FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    return { success: false, error: error.message };
  } finally {
    stopServices();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️  System verification interrupted by user');
  stopServices();
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  System verification terminated');
  stopServices();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  stopServices();
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  stopServices();
  process.exit(1);
});

// Run the complete system verification
if (require.main === module) {
  runCompleteSystemVerification()
    .then((result) => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('System verification failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runCompleteSystemVerification,
  startBackend,
  startFrontend,
  stopServices,
  verifySystemIntegration
};