#!/usr/bin/env node

/**
 * RapidCare Deployment Preparation Script
 * 
 * This script helps prepare the project for deployment by:
 * - Checking for required files
 * - Validating environment variables
 * - Running tests and builds
 * - Providing deployment checklist
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 RapidCare Deployment Preparation\n');

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✅ ${description}`, 'green');
    return true;
  } else {
    log(`❌ ${description} - Missing: ${filePath}`, 'red');
    return false;
  }
}

function runCommand(command, description) {
  try {
    log(`🔄 ${description}...`, 'blue');
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} completed`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} failed`, 'red');
    return false;
  }
}

// Check required files
log('📋 Checking required files...', 'blue');
const requiredFiles = [
  ['package.json', 'Root package.json'],
  ['back-end/package.json', 'Backend package.json'],
  ['front-end/package.json', 'Frontend package.json'],
  ['back-end/.env.example', 'Backend environment example'],
  ['front-end/.env.example', 'Frontend environment example'],
  ['README.md', 'Project README'],
  ['DEPLOYMENT.md', 'Deployment guide'],
  ['CONTRIBUTING.md', 'Contributing guidelines'],
  ['.gitignore', 'Git ignore file'],
  ['back-end/index.js', 'Backend entry point'],
  ['front-end/src/app/page.tsx', 'Frontend entry point']
];

let allFilesPresent = true;
requiredFiles.forEach(([file, description]) => {
  if (!checkFile(file, description)) {
    allFilesPresent = false;
  }
});

if (!allFilesPresent) {
  log('\n❌ Some required files are missing. Please ensure all files are present before deployment.', 'red');
  process.exit(1);
}

// Check environment files
log('\n🔧 Checking environment configuration...', 'blue');
const backendEnvExists = fs.existsSync('back-end/.env');
const frontendEnvExists = fs.existsSync('front-end/.env.local');

if (!backendEnvExists) {
  log('⚠️  Backend .env file not found. Copy from .env.example for local development.', 'yellow');
}

if (!frontendEnvExists) {
  log('⚠️  Frontend .env.local file not found. Copy from .env.example for local development.', 'yellow');
}

// Install dependencies
log('\n📦 Installing dependencies...', 'blue');
if (!runCommand('npm run install:all', 'Install all dependencies')) {
  process.exit(1);
}

// Run tests
log('\n🧪 Running tests...', 'blue');
const testsPass = runCommand('npm test', 'Run all tests');

// Run linting
log('\n🔍 Running linting...', 'blue');
const lintPass = runCommand('npm run lint', 'Lint all code');

// Build frontend
log('\n🏗️  Building frontend...', 'blue');
const buildPass = runCommand('cd front-end && npm run build', 'Build frontend');

// Summary
log('\n📊 Deployment Readiness Summary:', 'blue');
log(`Files: ${allFilesPresent ? '✅' : '❌'}`, allFilesPresent ? 'green' : 'red');
log(`Tests: ${testsPass ? '✅' : '❌'}`, testsPass ? 'green' : 'red');
log(`Linting: ${lintPass ? '✅' : '❌'}`, lintPass ? 'green' : 'red');
log(`Build: ${buildPass ? '✅' : '❌'}`, buildPass ? 'green' : 'red');

const isReady = allFilesPresent && testsPass && lintPass && buildPass;

if (isReady) {
  log('\n🎉 Project is ready for deployment!', 'green');
  log('\n📋 Next steps:', 'blue');
  log('1. Push your code to GitHub');
  log('2. Set up backend deployment (Railway/Render)');
  log('3. Set up frontend deployment (Vercel)');
  log('4. Configure environment variables on deployment platforms');
  log('5. Test deployed application');
  log('\nSee DEPLOYMENT.md for detailed instructions.');
} else {
  log('\n❌ Project is not ready for deployment. Please fix the issues above.', 'red');
  process.exit(1);
}