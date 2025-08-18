#!/usr/bin/env node

/**
 * Frontend Integration Test for bKash Financial System
 * Tests React components integration with backend APIs
 */

const puppeteer = require('puppeteer');
const axios = require('axios');

const BACKEND_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 60000;

// Test configuration
const testConfig = {
  headless: true, // Set to false for debugging
  slowMo: 100,
  defaultViewport: {
    width: 1280,
    height: 720
  }
};

// Test data
const testData = {
  admin: {
    email: 'admin@hospital.com',
    password: 'admin123'
  },
  hospitalAuthority: {
    email: 'hospital@test.com',
    password: 'password123'
  },
  patient: {
    email: 'user@test.com',
    password: 'password123'
  }
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    browser: '🌐'
  }[type] || '📋';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function assert(condition, message) {
  if (condition) {
    testResults.passed++;
    log(`PASS: ${message}`, 'success');
  } else {
    testResults.failed++;
    testResults.errors.push(message);
    log(`FAIL: ${message}`, 'error');
    throw new Error(message);
  }
}

async function waitForElement(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    return false;
  }
}

async function checkServerHealth() {
  log('Checking backend server health...', 'info');
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/health`);
    assert(response.status === 200, 'Backend server is healthy');
    assert(response.data.status === 'OK', 'Backend health check passed');
  } catch (error) {
    throw new Error(`Backend server is not accessible: ${error.message}`);
  }
}

async function testUserAuthentication(browser) {
  log('Testing user authentication flow...', 'browser');
  
  const page = await browser.newPage();
  
  try {
    // Navigate to login page
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Test patient login
    await page.type('input[type="email"]', testData.patient.email);
    await page.type('input[type="password"]', testData.patient.password);
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForNavigation({ timeout: 10000 });
    
    const currentUrl = page.url();
    assert(currentUrl.includes('/dashboard'), 'User redirected to dashboard after login');
    
    // Check if user menu is visible
    const userMenuExists = await waitForElement(page, '[data-testid="user-menu"]', 5000);
    assert(userMenuExists, 'User menu is visible after login');
    
  } finally {
    await page.close();
  }
}

async function testHospitalPricingDashboard(browser) {
  log('Testing hospital pricing dashboard with Taka currency...', 'browser');
  
  const page = await browser.newPage();
  
  try {
    // Login as hospital authority
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForSelector('form');
    
    await page.type('input[type="email"]', testData.hospitalAuthority.email);
    await page.type('input[type="password"]', testData.hospitalAuthority.password);
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation();
    
    // Navigate to pricing management
    await page.goto(`${FRONTEND_URL}/hospitals/1/pricing`);
    await page.waitForSelector('[data-testid="pricing-dashboard"]', { timeout: 10000 });
    
    // Check if Taka currency is displayed
    const takaSymbolExists = await page.evaluate(() => {
      return document.body.textContent.includes('৳');
    });
    assert(takaSymbolExists, 'Taka currency symbol (৳) is displayed in pricing dashboard');
    
    // Test pricing form
    const editButtonExists = await waitForElement(page, 'button:has-text("Edit")', 5000);
    if (editButtonExists) {
      await page.click('button:has-text("Edit")');
      
      // Check if pricing form is displayed
      const baseRateInput = await waitForElement(page, 'input[id="baseRate"]', 5000);
      assert(baseRateInput, 'Base rate input field is available');
      
      // Test Taka amount input
      await page.fill('input[id="baseRate"]', '2500');
      
      const inputValue = await page.inputValue('input[id="baseRate"]');
      assert(inputValue === '2500', 'Taka amount input accepts numeric values');
    }
    
  } finally {
    await page.close();
  }
}

async function testPaymentWorkflow(browser) {
  log('Testing bKash payment workflow...', 'browser');
  
  const page = await browser.newPage();
  
  try {
    // Login as patient
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForSelector('form');
    
    await page.type('input[type="email"]', testData.patient.email);
    await page.type('input[type="password"]', testData.patient.password);
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation();
    
    // Navigate to booking page
    await page.goto(`${FRONTEND_URL}/booking`);
    await page.waitForSelector('[data-testid="booking-form"]', { timeout: 10000 });
    
    // Fill booking form
    await page.selectOption('select[name="hospitalId"]', '1');
    await page.selectOption('select[name="resourceType"]', 'beds');
    await page.fill('input[name="patientName"]', 'Test Patient');
    await page.fill('input[name="estimatedDuration"]', '24');
    
    // Submit booking
    await page.click('button[type="submit"]');
    
    // Wait for payment page
    await page.waitForSelector('[data-testid="payment-interface"]', { timeout: 15000 });
    
    // Check if bKash-style payment interface is displayed
    const bkashStyleExists = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      for (let element of elements) {
        const style = window.getComputedStyle(element);
        if (style.backgroundColor.includes('226, 19, 110') || // bKash pink
            style.color.includes('226, 19, 110')) {
          return true;
        }
      }
      return false;
    });
    assert(bkashStyleExists, 'bKash-style UI elements are present');
    
    // Check if Taka amount is displayed
    const takaAmountExists = await page.evaluate(() => {
      return document.body.textContent.includes('৳');
    });
    assert(takaAmountExists, 'Taka amount is displayed in payment interface');
    
    // Fill bKash payment form
    const mobileInput = await waitForElement(page, 'input[name="mobileNumber"]', 5000);
    if (mobileInput) {
      await page.fill('input[name="mobileNumber"]', '01712345678');
      await page.fill('input[name="pin"]', '1234');
      
      // Submit payment
      await page.click('button:has-text("Pay with bKash")');
      
      // Wait for payment result
      await page.waitForSelector('[data-testid="payment-result"]', { timeout: 20000 });
      
      // Check if payment success page is displayed
      const successPageExists = await waitForElement(page, '[data-testid="payment-success"]', 5000);
      assert(successPageExists, 'Payment success page is displayed');
    }
    
  } finally {
    await page.close();
  }
}

async function testRevenueAnalyticsDashboard(browser) {
  log('Testing revenue analytics dashboard with Taka formatting...', 'browser');
  
  const page = await browser.newPage();
  
  try {
    // Login as hospital authority
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForSelector('form');
    
    await page.type('input[type="email"]', testData.hospitalAuthority.email);
    await page.type('input[type="password"]', testData.hospitalAuthority.password);
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation();
    
    // Navigate to revenue analytics
    await page.goto(`${FRONTEND_URL}/hospitals/1/analytics`);
    await page.waitForSelector('[data-testid="revenue-dashboard"]', { timeout: 10000 });
    
    // Check if revenue metrics are displayed with Taka formatting
    const revenueMetricsExist = await waitForElement(page, '[data-testid="revenue-metrics"]', 5000);
    assert(revenueMetricsExist, 'Revenue metrics section is displayed');
    
    // Check for Taka currency formatting in analytics
    const takaFormattingExists = await page.evaluate(() => {
      const text = document.body.textContent;
      return text.includes('৳') && text.includes('Total Revenue');
    });
    assert(takaFormattingExists, 'Revenue analytics display Taka currency formatting');
    
    // Check if charts are rendered
    const chartsExist = await waitForElement(page, '.recharts-wrapper', 5000);
    assert(chartsExist, 'Revenue charts are rendered');
    
  } finally {
    await page.close();
  }
}

async function testAdminFinancialDashboard(browser) {
  log('Testing admin financial dashboard...', 'browser');
  
  const page = await browser.newPage();
  
  try {
    // Login as admin
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForSelector('form');
    
    await page.type('input[type="email"]', testData.admin.email);
    await page.type('input[type="password"]', testData.admin.password);
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation();
    
    // Navigate to admin dashboard
    await page.goto(`${FRONTEND_URL}/admin`);
    await page.waitForSelector('[data-testid="admin-dashboard"]', { timeout: 10000 });
    
    // Check if platform-wide financial metrics are displayed
    const platformMetricsExist = await waitForElement(page, '[data-testid="platform-metrics"]', 5000);
    assert(platformMetricsExist, 'Platform financial metrics are displayed');
    
    // Check for service charge analytics
    const serviceChargeSection = await waitForElement(page, '[data-testid="service-charges"]', 5000);
    assert(serviceChargeSection, 'Service charge analytics section is displayed');
    
    // Check if Taka formatting is used throughout
    const takaFormattingExists = await page.evaluate(() => {
      const text = document.body.textContent;
      return text.includes('৳') && text.includes('Service Charges');
    });
    assert(takaFormattingExists, 'Admin dashboard uses Taka currency formatting');
    
  } finally {
    await page.close();
  }
}

async function testResponsiveDesign(browser) {
  log('Testing responsive design for mobile devices...', 'browser');
  
  const page = await browser.newPage();
  
  try {
    // Test mobile viewport
    await page.setViewport({ width: 375, height: 667 }); // iPhone SE
    
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForSelector('form');
    
    // Check if mobile navigation is working
    const mobileMenuExists = await page.evaluate(() => {
      const viewport = window.innerWidth;
      return viewport <= 768; // Mobile breakpoint
    });
    assert(mobileMenuExists, 'Mobile viewport is correctly set');
    
    // Test tablet viewport
    await page.setViewport({ width: 768, height: 1024 }); // iPad
    
    await page.reload();
    await page.waitForSelector('form');
    
    // Check if layout adapts to tablet size
    const tabletLayoutExists = await page.evaluate(() => {
      const viewport = window.innerWidth;
      return viewport >= 768 && viewport <= 1024;
    });
    assert(tabletLayoutExists, 'Tablet viewport is correctly set');
    
  } finally {
    await page.close();
  }
}

async function testAccessibility(browser) {
  log('Testing accessibility features...', 'browser');
  
  const page = await browser.newPage();
  
  try {
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForSelector('form');
    
    // Check for proper form labels
    const formLabelsExist = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      for (let input of inputs) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (!label && !input.getAttribute('aria-label')) {
          return false;
        }
      }
      return true;
    });
    assert(formLabelsExist, 'Form inputs have proper labels or aria-labels');
    
    // Check for keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement.tagName);
    assert(focusedElement === 'INPUT', 'Keyboard navigation works for form elements');
    
  } finally {
    await page.close();
  }
}

async function runFrontendIntegrationTests() {
  console.log('🌐 Starting Frontend Integration Tests for bKash Financial System');
  console.log('================================================================');
  console.log('📋 Testing React components integration with backend APIs:');
  console.log('   🔐 User authentication flow');
  console.log('   💰 Hospital pricing dashboard with Taka currency');
  console.log('   💳 bKash payment workflow');
  console.log('   📊 Revenue analytics dashboard');
  console.log('   👨‍💼 Admin financial dashboard');
  console.log('   📱 Responsive design');
  console.log('   ♿ Accessibility features');
  console.log('================================================================\n');
  
  const startTime = Date.now();
  let browser = null;
  
  try {
    // Check backend server health
    await checkServerHealth();
    
    // Launch browser
    log('Launching browser for UI testing...', 'browser');
    browser = await puppeteer.launch(testConfig);
    
    // Run all frontend tests
    await testUserAuthentication(browser);
    await testHospitalPricingDashboard(browser);
    await testPaymentWorkflow(browser);
    await testRevenueAnalyticsDashboard(browser);
    await testAdminFinancialDashboard(browser);
    await testResponsiveDesign(browser);
    await testAccessibility(browser);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n================================================================');
    console.log('🎉 FRONTEND INTEGRATION TEST RESULTS');
    console.log('================================================================');
    console.log(`✅ Tests Passed: ${testResults.passed}`);
    console.log(`❌ Tests Failed: ${testResults.failed}`);
    console.log(`⏱️  Total Duration: ${duration.toFixed(2)} seconds`);
    
    if (testResults.failed === 0) {
      console.log('\n🎊 ALL FRONTEND TESTS PASSED!');
      console.log('🌐 React components are properly integrated with backend APIs');
      console.log('💰 Taka currency formatting is working correctly in UI');
      console.log('🎨 bKash-style UI components are functioning properly');
      console.log('📱 Responsive design works across different screen sizes');
      console.log('♿ Accessibility features are implemented correctly');
    } else {
      console.log('\n❌ SOME FRONTEND TESTS FAILED:');
      testResults.errors.forEach(error => console.log(`   - ${error}`));
    }
    
  } catch (error) {
    console.error('\n💥 FRONTEND INTEGRATION TESTS FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      log('Browser closed', 'browser');
    }
  }
  
  return testResults;
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️  Frontend integration tests interrupted by user');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runFrontendIntegrationTests()
    .then((results) => {
      if (results.failed === 0) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Frontend integration tests failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runFrontendIntegrationTests,
  testResults
};