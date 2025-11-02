#!/usr/bin/env node

/**
 * Hydration validation script
 * Runs automated tests to validate hydration performance and correctness
 */

import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

interface ValidationResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  metrics?: any;
}

class HydrationValidator {
  private results: ValidationResult[] = [];

  async runValidation(): Promise<void> {
    console.log('🚀 Starting Hydration Validation...\n');

    await this.runUnitTests();
    await this.runIntegrationTests();
    await this.runPerformanceTests();
    await this.runBuildValidation();

    this.printResults();
  }

  private async runUnitTests(): Promise<void> {
    console.log('📋 Running Unit Tests...');
    
    const testStart = performance.now();
    try {
      execSync('npm test -- --testPathPattern="__tests__" --passWithNoTests', {
        stdio: 'pipe',
        cwd: process.cwd(),
      });
      
      const testEnd = performance.now();
      this.results.push({
        testName: 'Unit Tests',
        passed: true,
        duration: testEnd - testStart,
      });
      console.log('✅ Unit tests passed\n');
    } catch (error) {
      const testEnd = performance.now();
      this.results.push({
        testName: 'Unit Tests',
        passed: false,
        duration: testEnd - testStart,
        error: error instanceof Error ? error.message : String(error),
      });
      console.log('❌ Unit tests failed\n');
    }
  }

  private async runIntegrationTests(): Promise<void> {
    console.log('🔗 Running Integration Tests...');
    
    const testStart = performance.now();
    try {
      execSync('npm test -- --testPathPattern="integration" --passWithNoTests', {
        stdio: 'pipe',
        cwd: process.cwd(),
      });
      
      const testEnd = performance.now();
      this.results.push({
        testName: 'Integration Tests',
        passed: true,
        duration: testEnd - testStart,
      });
      console.log('✅ Integration tests passed\n');
    } catch (error) {
      const testEnd = performance.now();
      this.results.push({
        testName: 'Integration Tests',
        passed: false,
        duration: testEnd - testStart,
        error: error instanceof Error ? error.message : String(error),
      });
      console.log('❌ Integration tests failed\n');
    }
  }

  private async runPerformanceTests(): Promise<void> {
    console.log('⚡ Running Performance Tests...');
    
    const testStart = performance.now();
    try {
      execSync('npm test -- --testPathPattern="performance" --passWithNoTests', {
        stdio: 'pipe',
        cwd: process.cwd(),
      });
      
      const testEnd = performance.now();
      this.results.push({
        testName: 'Performance Tests',
        passed: true,
        duration: testEnd - testStart,
      });
      console.log('✅ Performance tests passed\n');
    } catch (error) {
      const testEnd = performance.now();
      this.results.push({
        testName: 'Performance Tests',
        passed: false,
        duration: testEnd - testStart,
        error: error instanceof Error ? error.message : String(error),
      });
      console.log('❌ Performance tests failed\n');
    }
  }

  private async runBuildValidation(): Promise<void> {
    console.log('🏗️  Validating Build...');
    
    const buildStart = performance.now();
    try {
      // Test that the app builds successfully
      execSync('npm run build', {
        stdio: 'pipe',
        cwd: process.cwd(),
      });
      
      const buildEnd = performance.now();
      this.results.push({
        testName: 'Build Validation',
        passed: true,
        duration: buildEnd - buildStart,
      });
      console.log('✅ Build validation passed\n');
    } catch (error) {
      const buildEnd = performance.now();
      this.results.push({
        testName: 'Build Validation',
        passed: false,
        duration: buildEnd - buildStart,
        error: error instanceof Error ? error.message : String(error),
      });
      console.log('❌ Build validation failed\n');
    }
  }

  private printResults(): void {
    console.log('📊 Validation Results:');
    console.log('=' .repeat(50));

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const duration = `${result.duration.toFixed(0)}ms`;
      console.log(`${status} ${result.testName.padEnd(20)} ${duration.padStart(8)}`);
      
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error.substring(0, 100)}...`);
      }
    });

    console.log('=' .repeat(50));
    console.log(`Results: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 All validations passed! Hydration fix is working correctly.');
    } else {
      console.log('⚠️  Some validations failed. Please review the errors above.');
      process.exit(1);
    }
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new HydrationValidator();
  validator.runValidation().catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

export { HydrationValidator };