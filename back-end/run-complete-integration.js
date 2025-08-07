#!/usr/bin/env node

/**
 * Complete Integration Test Runner
 * Starts the server, seeds data, and runs comprehensive integration tests
 */

const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');

const SERVER_PORT = 5000;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;
const MAX_STARTUP_TIME = 30000; // 30 seconds
const HEALTH_CHECK_INTERVAL = 1000; // 1 second

let serverProcess = null;

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    server: '🚀'
  }[type] || '📋';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

async function waitForServer() {
  log('Waiting for server to start...', 'info');
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < MAX_STARTUP_TIME) {
    try {
      const response = await axios.get(`${SERVER_URL}/api/health`, {
        timeout: 2000
      });
      
      if (response.status === 200 && response.data.status === 'OK') {
        log('Server is ready!', 'success');
        return true;
      }
    } catch (error) {
      // Server not ready yet, continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, HEALTH_CHECK_INTERVAL));
  }
  
  throw new Error('Server failed to start within timeout period');
}

async function startServer() {
  log('Starting RapidCare server...', 'server');
  
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['index.js'], {
      cwd: __dirname,
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let serverOutput = '';
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      serverOutput += output;
      
      // Log server output with prefix
      output.split('\n').forEach(line => {
        if (line.trim()) {
          log(`SERVER: ${line.trim()}`, 'server');
        }
      });
      
      // Check if server started successfully
      if (output.includes('RapidCare API server running on port')) {
        resolve();
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      log(`SERVER ERROR: ${output.trim()}`, 'error');
    });
    
    serverProcess.on('error', (error) => {
      log(`Failed to start server: ${error.message}`, 'error');
      reject(error);
    });
    
    serverProcess.on('exit', (code, signal) => {
      if (code !== 0 && code !== null) {
        log(`Server exited with code ${code}`, 'error');
        reject(new Error(`Server process exited with code ${code}`));
      }
    });
    
    // Timeout if server doesn't start
    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        log('Server startup timeout', 'error');
        reject(new Error('Server startup timeout'));
      }
    }, MAX_STARTUP_TIME);
  });
}

async function seedTestData() {
  log('Seeding test data...', 'info');
  
  try {
    // Run the seeder
    const seederProcess = spawn('node', ['seed-test-data.js'], {
      cwd: __dirname,
      stdio: 'inherit'
    });
    
    return new Promise((resolve, reject) => {
      seederProcess.on('exit', (code) => {
        if (code === 0) {
          log('Test data seeded successfully', 'success');
          resolve();
        } else {
          log('Failed to seed test data', 'error');
          reject(new Error(`Seeder exited with code ${code}`));
        }
      });
      
      seederProcess.on('error', (error) => {
        log(`Seeder error: ${error.message}`, 'error');
        reject(error);
      });
    });
  } catch (error) {
    log(`Error running seeder: ${error.message}`, 'error');
    throw error;
  }
}

async function runIntegrationTests() {
  log('Running comprehensive integration tests...', 'info');
  
  try {
    const { runIntegrationTests, testResults } = require('./integration-test-complete.js');
    await runIntegrationTests();
    return testResults;
  } catch (error) {
    log(`Integration tests failed: ${error.message}`, 'error');
    throw error;
  }
}

function stopServer() {
  if (serverProcess && !serverProcess.killed) {
    log('Stopping server...', 'info');
    serverProcess.kill('SIGTERM');
    
    // Force kill after 5 seconds if graceful shutdown fails
    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        log('Force killing server...', 'warning');
        serverProcess.kill('SIGKILL');
      }
    }, 5000);
  }
}

async function runCompleteIntegration() {
  console.log('🚀 RapidCare Complete Integration Test Suite');
  console.log('==============================================');
  console.log('📋 This will test the complete bKash financial system:');
  console.log('   🔧 Start RapidCare server');
  console.log('   🌱 Seed test data');
  console.log('   🧪 Run comprehensive integration tests');
  console.log('   💰 Verify Taka currency support');
  console.log('   📊 Test financial analytics and reporting');
  console.log('   🔒 Validate security and error handling');
  console.log('==============================================\n');
  
  const startTime = Date.now();
  
  try {
    // Step 1: Start the server
    await startServer();
    await waitForServer();
    
    // Step 2: Seed test data
    await seedTestData();
    
    // Step 3: Run integration tests
    const testResults = await runIntegrationTests();
    
    const endTime = Date.now();
    const totalDuration = (endTime - startTime) / 1000;
    
    console.log('\n==============================================');
    console.log('🎉 COMPLETE INTEGRATION TEST RESULTS');
    console.log('==============================================');
    console.log(`✅ Total Tests Passed: ${testResults.passed}`);
    console.log(`❌ Total Tests Failed: ${testResults.failed}`);
    console.log(`⏱️  Total Duration: ${totalDuration.toFixed(2)} seconds`);
    
    if (testResults.failed === 0) {
      console.log('\n🎊 ALL INTEGRATION TESTS PASSED!');
      console.log('💰 bKash Financial System is fully integrated and operational');
      console.log('🔒 All security measures are working correctly');
      console.log('📊 Analytics and reporting are functioning properly');
      console.log('💱 Taka currency support is complete throughout the system');
      console.log('\n✨ The system is ready for production deployment!');
    } else {
      console.log('\n❌ SOME INTEGRATION TESTS FAILED');
      console.log('Please review the test output above for details.');
    }
    
  } catch (error) {
    console.error('\n💥 INTEGRATION TEST SUITE FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    stopServer();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️  Integration test suite interrupted by user');
  stopServer();
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Integration test suite terminated');
  stopServer();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  stopServer();
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  stopServer();
  process.exit(1);
});

// Run the complete integration test suite
if (require.main === module) {
  runCompleteIntegration();
}

module.exports = {
  runCompleteIntegration,
  startServer,
  stopServer,
  waitForServer,
  seedTestData,
  runIntegrationTests
};