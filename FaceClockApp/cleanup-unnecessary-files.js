/**
 * Cleanup Script for Unnecessary Files
 * This script removes files that shouldn't be included in production builds
 * Run: node cleanup-unnecessary-files.js
 */

const fs = require('fs');
const path = require('path');

const filesToRemove = [
  // Documentation files (keep only README.md if needed)
  'AUTO_CAPTURE_STRATEGY.md',
  'CLEAR_CACHE_INSTRUCTIONS.md',
  'DEPLOYMENT_FIX.md',
  'EAS_BUILD_GUIDE.md',
  'FACE_DETECTION_IMPROVEMENTS.md',
  'FACE_DETECTION_SETUP.md',
  'FACE_RECOGNITION_ANALYSIS.md',
  'FRONTEND_ANALYSIS_STRATEGY.md',
  'HOW_TO_GET_GOOGLE_VISION_API_KEY.md',
  'ICON_FIX.md',
  'ISSUES_SUMMARY.md',
  'ML_KIT_SETUP.md',
  'TROUBLESHOOTING.md',
  
  // Build artifacts
  'assets/Internship-Success.apk',
  
  // Unused assets
  'assets/8e8d722b-6a0a-4da0-9ca2-3aba986f49e9.eps',
  'assets/splash-icon.png',
  'assets/WATERMARK.png',
  
  // Development scripts
  'resize-icon.js',
  
  // Example files
  'config/faceDetection.example.js',
];

const directoriesToCheck = [
  'assets',
  'config',
];

console.log('🧹 Starting cleanup of unnecessary files...\n');

let removedCount = 0;
let notFoundCount = 0;

filesToRemove.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Removed: ${file}`);
      removedCount++;
    } catch (error) {
      console.error(`❌ Error removing ${file}:`, error.message);
    }
  } else {
    console.log(`⚠️  Not found: ${file} (already removed or doesn't exist)`);
    notFoundCount++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`   ✅ Removed: ${removedCount} files`);
console.log(`   ⚠️  Not found: ${notFoundCount} files`);
console.log(`\n✨ Cleanup complete!`);

