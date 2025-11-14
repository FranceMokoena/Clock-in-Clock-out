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
// Try multiple sources for reliability - using correct repository structure
const modelSources = [
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master',
  'https://github.com/justadudewhohacks/face-api.js-models/raw/master',
  'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js-models@master',
];
const modelsBaseUrl = modelSources[0];

// Model files needed - with correct paths in repository
const models = {
  'ssd_mobilenetv1_model-weights_manifest.json': 'weights/ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1': 'weights/ssd_mobilenetv1_model-shard1',
  'face_landmark_68_model-weights_manifest.json': 'weights/face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1': 'weights/face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json': 'weights/face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1': 'weights/face_recognition_model-shard1',
  'face_recognition_model-shard2': 'weights/face_recognition_model-shard2',
};

function downloadFile(url, filepath, retries = 3) {
  return new Promise((resolve, reject) => {
    const attemptDownload = (attemptUrl, attemptNumber) => {
      console.log(`📥 Downloading (attempt ${attemptNumber}/${retries}): ${path.basename(filepath)} from ${attemptUrl}`);
      const file = fs.createWriteStream(filepath);
      
      https.get(attemptUrl, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirect
          file.close();
          return attemptDownload(response.headers.location, attemptNumber);
        }
        
        if (response.statusCode !== 200) {
          file.close();
          fs.unlink(filepath, () => {}); // Delete the file on error
          if (attemptNumber < retries) {
            // Try alternative source
            const altUrl = attemptUrl.replace(modelSources[0], modelSources[1] || modelSources[0]);
            if (altUrl !== attemptUrl) {
              return attemptDownload(altUrl, attemptNumber + 1);
            }
          }
          reject(new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`));
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`✅ Downloaded: ${path.basename(filepath)} (${(fs.statSync(filepath).size / 1024).toFixed(1)} KB)`);
          resolve();
        });
      }).on('error', (err) => {
        file.close();
        fs.unlink(filepath, () => {}); // Delete the file on error
        if (attemptNumber < retries) {
          // Try alternative source
          const altUrl = attemptUrl.replace(modelSources[0], modelSources[1] || modelSources[0]);
          if (altUrl !== attemptUrl) {
            return attemptDownload(altUrl, attemptNumber + 1);
          }
        }
        reject(err);
      });
    };
    
    attemptDownload(url, 1);
  });
}

async function downloadModels() {
  try {
    // Create models directory (with parent directories if needed)
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
      console.log(`📁 Created directory: ${modelsDir}`);
    } else {
      console.log(`📁 Using existing directory: ${modelsDir}`);
    }
    
    // Verify directory was created
    if (!fs.existsSync(modelsDir)) {
      throw new Error(`Failed to create models directory: ${modelsDir}`);
    }
    
    console.log('📦 Starting model download...');
    console.log(`📁 Target directory: ${modelsDir}`);
    console.log(`📁 Absolute path: ${path.resolve(modelsDir)}\n`);
    
    let successCount = 0;
    let failCount = 0;
    const failedFiles = [];
    
    for (const [filename, urlPath] of Object.entries(models)) {
      const filepath = path.join(modelsDir, filename);
      
      // Check if file exists and has content
      if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        if (stats.size > 0) {
          console.log(`⏭️  Skipping (already exists): ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);
          successCount++;
          continue;
        } else {
          console.log(`⚠️  File exists but is empty, re-downloading: ${filename}`);
          fs.unlinkSync(filepath);
        }
      }
      
      // Try each source
      let downloaded = false;
      for (let i = 0; i < modelSources.length; i++) {
        const baseUrl = modelSources[i];
        const url = `${baseUrl}/${urlPath}`;
        try {
          await downloadFile(url, filepath);
          successCount++;
          downloaded = true;
          break; // Success, move to next file
        } catch (error) {
          console.warn(`   Failed from source ${i + 1} (${baseUrl}): ${error.message}`);
          // Try next source
        }
      }
      
      if (!downloaded) {
        console.error(`❌ Error downloading ${filename} from all sources`);
        failCount++;
        failedFiles.push(filename);
      }
    }
    
    console.log(`\n📊 Download summary: ${successCount} succeeded, ${failCount} failed`);
    
    if (successCount === Object.keys(models).length) {
      console.log('✅ All models downloaded successfully!');
      console.log(`📁 Models saved to: ${modelsDir}`);
      
      // Verify all files exist
      let allExist = true;
      for (const filename of Object.keys(models)) {
        const filepath = path.join(modelsDir, filename);
        if (!fs.existsSync(filepath) || fs.statSync(filepath).size === 0) {
          console.error(`❌ Verification failed: ${filename} is missing or empty`);
          allExist = false;
        }
      }
      
      if (allExist) {
        console.log('✅ All model files verified successfully!');
      }
    } else if (successCount > 0) {
      console.log('⚠️  Some models failed to download. System will try CDN fallback.');
      console.log(`   Failed files: ${failedFiles.join(', ')}`);
    } else {
      console.log('❌ All model downloads failed. System will use CDN fallback.');
      console.log(`   Failed files: ${failedFiles.join(', ')}`);
    }
    
    return successCount === Object.keys(models).length;
  } catch (error) {
    console.error('❌ Error in downloadModels:', error.message);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  downloadModels()
    .then((success) => {
      if (success) {
        console.log('\n✅ Model download process completed successfully');
        process.exit(0);
      } else {
        console.log('\n⚠️  Model download completed with some failures - CDN fallback will be used');
        process.exit(0); // Exit with 0 so postinstall doesn't fail
      }
    })
    .catch((error) => {
      console.error('\n❌ Model download failed:', error.message);
      console.error('⚠️  System will use CDN fallback during runtime');
      process.exit(0); // Exit with 0 so postinstall doesn't fail the build
    });
}

module.exports = { downloadModels };

