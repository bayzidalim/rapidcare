#!/usr/bin/env node

/**
 * Build Verification Script
 * Verifies that the Next.js build completed successfully and checks for common issues
 */

const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, '..', '.next');
const STATIC_DIR = path.join(BUILD_DIR, 'static');

console.log('🔍 Verifying build output...');

// Check if build directory exists
if (!fs.existsSync(BUILD_DIR)) {
  console.error('❌ Build directory not found:', BUILD_DIR);
  process.exit(1);
}

// Check if static directory exists
if (!fs.existsSync(STATIC_DIR)) {
  console.error('❌ Static directory not found:', STATIC_DIR);
  process.exit(1);
}

// Check for essential files
const essentialFiles = [
  '.next/BUILD_ID',
  '.next/package.json',
  '.next/routes-manifest.json'
];

const missingFiles = essentialFiles.filter(file => {
  const filePath = path.join(__dirname, '..', file);
  return !fs.existsSync(filePath);
});

if (missingFiles.length > 0) {
  console.error('❌ Missing essential build files:');
  missingFiles.forEach(file => console.error(`  - ${file}`));
  process.exit(1);
}

// Check build size
try {
  const buildStats = fs.statSync(BUILD_DIR);
  const staticStats = fs.statSync(STATIC_DIR);
  
  console.log('📊 Build Statistics:');
  console.log(`  Build directory size: ${(getBuildSize(BUILD_DIR) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Static assets size: ${(getBuildSize(STATIC_DIR) / 1024 / 1024).toFixed(2)} MB`);
  
  // Check for large bundles (warning only)
  const staticFiles = fs.readdirSync(STATIC_DIR, { recursive: true });
  const largeFiles = staticFiles
    .map(file => {
      const filePath = path.join(STATIC_DIR, file);
      if (fs.statSync(filePath).isFile()) {
        const size = fs.statSync(filePath).size;
        return { file, size };
      }
      return null;
    })
    .filter(Boolean)
    .filter(item => item.size > 1024 * 1024) // Files larger than 1MB
    .sort((a, b) => b.size - a.size);
  
  if (largeFiles.length > 0) {
    console.log('\n⚠️  Large files detected (>1MB):');
    largeFiles.slice(0, 5).forEach(item => {
      console.log(`  - ${item.file}: ${(item.size / 1024 / 1024).toFixed(2)} MB`);
    });
  }
  
} catch (error) {
  console.warn('⚠️  Could not analyze build size:', error.message);
}

// Check for common issues
const buildManifest = path.join(BUILD_DIR, 'build-manifest.json');
if (fs.existsSync(buildManifest)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf8'));
    
    // Check for pages
    const pages = Object.keys(manifest.pages || {});
    console.log(`📄 Built pages: ${pages.length}`);
    
    if (pages.length === 0) {
      console.error('❌ No pages found in build manifest');
      process.exit(1);
    }
    
    // Check for essential pages
    const essentialPages = ['/', '/_app', '/_error'];
    const missingPages = essentialPages.filter(page => !pages.includes(page));
    
    if (missingPages.length > 0) {
      console.warn('⚠️  Missing essential pages:', missingPages.join(', '));
    }
    
  } catch (error) {
    console.warn('⚠️  Could not parse build manifest:', error.message);
  }
}

// Environment variable check
console.log('\n🔧 Environment Configuration:');
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`  NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL || 'not set'}`);

if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn('⚠️  NEXT_PUBLIC_API_URL not set - API calls may fail');
}

console.log('\n✅ Build verification completed successfully!');
console.log('🚀 Ready for deployment');

// Helper function to calculate directory size
function getBuildSize(dirPath) {
  let totalSize = 0;
  
  function calculateSize(currentPath) {
    const stats = fs.statSync(currentPath);
    
    if (stats.isDirectory()) {
      const files = fs.readdirSync(currentPath);
      files.forEach(file => {
        calculateSize(path.join(currentPath, file));
      });
    } else {
      totalSize += stats.size;
    }
  }
  
  try {
    calculateSize(dirPath);
  } catch (error) {
    console.warn('Could not calculate size for:', dirPath);
  }
  
  return totalSize;
}