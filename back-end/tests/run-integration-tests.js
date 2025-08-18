const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class IntegrationTestRunner {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  async runTest(testFile, description) {
    console.log(`\n🧪 Running ${description}...`);
    console.log(`📁 Test file: ${testFile}`);
    
    return new Promise((resolve) => {
      const testProcess = spawn('npm', ['test', testFile], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      testProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      testProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      testProcess.on('close', (code) => {
        const success = code === 0;
        
        if (success) {
          console.log(`✅ ${description} - PASSED`);
          this.testResults.passed++;
        } else {
          console.log(`❌ ${description} - FAILED`);
          console.log(`Error output: ${errorOutput}`);
          this.testResults.failed++;
        }

        this.testResults.total++;
        this.testResults.details.push({
          test: description,
          file: testFile,
          success,
          output: success ? output : errorOutput
        });

        resolve(success);
      });
    });
  }

  async runAllTests() {
    console.log('🚀 Starting Hospital Booking System Integration Tests');
    console.log('=' .repeat(60));

    const tests = [
      {
        file: 'tests/integration/complete-booking-workflow.test.js',
        description: 'Complete Booking Workflow Integration'
      },
      {
        file: 'tests/integration/real-time-system.test.js',
        description: 'Real-time System Integration'
      },
      {
        file: 'tests/integration/booking-api.test.js',
        description: 'Booking API Integration'
      },
      {
        file: 'tests/controllers/bookingController.test.js',
        description: 'Booking Controller Tests'
      },
      {
        file: 'tests/services/bookingService.test.js',
        description: 'Booking Service Tests'
      },
      {
        file: 'tests/models/Booking.test.js',
        description: 'Booking Model Tests'
      }
    ];

    // Check if test files exist
    const existingTests = tests.filter(test => {
      const fullPath = path.join(__dirname, '..', test.file);
      return fs.existsSync(fullPath);
    });

    if (existingTests.length === 0) {
      console.log('❌ No test files found!');
      return false;
    }

    console.log(`📊 Found ${existingTests.length} test files to run`);

    // Run tests sequentially to avoid database conflicts
    for (const test of existingTests) {
      await this.runTest(test.file, test.description);
      
      // Add a small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.printSummary();
    return this.testResults.failed === 0;
  }

  printSummary() {
    console.log('\n' + '=' .repeat(60));
    console.log('📋 TEST SUMMARY');
    console.log('=' .repeat(60));
    
    console.log(`Total Tests: ${this.testResults.total}`);
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    
    const successRate = this.testResults.total > 0 
      ? ((this.testResults.passed / this.testResults.total) * 100).toFixed(1)
      : 0;
    
    console.log(`📈 Success Rate: ${successRate}%`);

    if (this.testResults.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults.details
        .filter(detail => !detail.success)
        .forEach(detail => {
          console.log(`  - ${detail.test}`);
          console.log(`    File: ${detail.file}`);
        });
    }

    if (this.testResults.passed === this.testResults.total) {
      console.log('\n🎉 ALL TESTS PASSED! System integration is successful.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the errors above.');
    }
  }

  async runSpecificWorkflow(workflow) {
    console.log(`🎯 Running specific workflow: ${workflow}`);
    
    const workflowTests = {
      'booking-creation': [
        'tests/integration/complete-booking-workflow.test.js'
      ],
      'real-time-updates': [
        'tests/integration/real-time-system.test.js'
      ],
      'api-endpoints': [
        'tests/integration/booking-api.test.js',
        'tests/controllers/bookingController.test.js'
      ],
      'data-models': [
        'tests/models/Booking.test.js',
        'tests/services/bookingService.test.js'
      ]
    };

    const tests = workflowTests[workflow];
    if (!tests) {
      console.log(`❌ Unknown workflow: ${workflow}`);
      console.log(`Available workflows: ${Object.keys(workflowTests).join(', ')}`);
      return false;
    }

    for (const testFile of tests) {
      if (fs.existsSync(path.join(__dirname, '..', testFile))) {
        await this.runTest(testFile, `${workflow} - ${path.basename(testFile)}`);
      }
    }

    this.printSummary();
    return this.testResults.failed === 0;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new IntegrationTestRunner();

  if (args.length === 0) {
    // Run all tests
    const success = await runner.runAllTests();
    process.exit(success ? 0 : 1);
  } else if (args[0] === '--workflow' && args[1]) {
    // Run specific workflow
    const success = await runner.runSpecificWorkflow(args[1]);
    process.exit(success ? 0 : 1);
  } else {
    console.log('Usage:');
    console.log('  node run-integration-tests.js                    # Run all tests');
    console.log('  node run-integration-tests.js --workflow <name>  # Run specific workflow');
    console.log('');
    console.log('Available workflows:');
    console.log('  - booking-creation');
    console.log('  - real-time-updates');
    console.log('  - api-endpoints');
    console.log('  - data-models');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = IntegrationTestRunner;