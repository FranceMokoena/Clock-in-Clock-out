/**
 * Script to download face-api.js models for deployment
 * Run this before deploying to ensure models are available
 * 
 * Usage: node download-models.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'models', 'face-api');
const modelsBaseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/weights';

// Model files needed
const models = {
  'ssd_mobilenetv1_model-weights_manifest.json': 'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1': 'ssd_mobilenetv1_model-shard1',
  'face_landmark_68_model-weights_manifest.json': 'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1': 'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json': 'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1': 'face_recognition_model-shard1',
  'face_recognition_model-shard2': 'face_recognition_model-shard2',
};

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Downloading: ${path.basename(filepath)}...`);
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        return downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded: ${path.basename(filepath)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete the file on error
      reject(err);
    });
  });
}

async function downloadModels() {
  // Create models directory
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
    console.log(`📁 Created directory: ${modelsDir}`);
  }
  
  console.log('📦 Starting model download...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const [filename, urlPath] of Object.entries(models)) {
    const filepath = path.join(modelsDir, filename);
    const url = `${modelsBaseUrl}/${urlPath}`;
    
    // Skip if file already exists
    if (fs.existsSync(filepath)) {
      console.log(`⏭️  Skipping (already exists): ${filename}`);
      successCount++;
      continue;
    }
    
    try {
      await downloadFile(url, filepath);
      successCount++;
    } catch (error) {
      console.error(`❌ Error downloading ${filename}:`, error.message);
      failCount++;
      // Continue with other files
    }
  }
  
  console.log(`\n📊 Download summary: ${successCount} succeeded, ${failCount} failed`);
  
  if (successCount === Object.keys(models).length) {
    console.log('✅ All models downloaded successfully!');
    console.log(`📁 Models saved to: ${modelsDir}`);
  } else if (successCount > 0) {
    console.log('⚠️  Some models failed to download. System will try CDN fallback.');
  } else {
    console.log('❌ All model downloads failed. System will use CDN fallback.');
  }
}

// Run if called directly
if (require.main === module) {
  downloadModels().catch(console.error);
}

module.exports = { downloadModels };

