/**
 * Script to download ONNX models (SCRFD + ArcFace) for face recognition
 * 
 * Models:
 * - SCRFD: Face detection (scrfd_500m_bnkps.onnx)
 * - ArcFace: Face recognition (w600k_r50.onnx or glint360k_r50.onnx)
 * 
 * Usage: node download-onnx-models.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'models', 'onnx');

// ONNX models required for face recognition
// Note: These models need to be converted from PyTorch/MXNet to ONNX format
// For now, we'll use alternative pre-converted models or provide conversion instructions
const modelFiles = [
  {
    filename: 'scrfd_10g_gnkps_fp32.onnx',
    description: 'SCRFD face detection model (10G - Preferred)',
    sources: [
      // Use raw GitHub content (more reliable than releases)
      'https://raw.githubusercontent.com/deepinsight/insightface/master/model_zoo/buffalo_l/scrfd_10g_gnkps_fp32.onnx',
      // GitHub releases
      'https://github.com/deepinsight/insightface/releases/download/v0.7/scrfd_10g_gnkps_fp32.onnx',
      // jsdelivr CDN
      'https://cdn.jsdelivr.net/gh/deepinsight/insightface@master/model_zoo/buffalo_l/scrfd_10g_gnkps_fp32.onnx',
    ],
    note: 'Preferred detection model - better accuracy',
    required: true
  },
  {
    filename: 'scrfd_500m_bnkps.onnx',
    description: 'SCRFD face detection model (500M - Fallback)',
    sources: [
      // Use raw GitHub content
      'https://raw.githubusercontent.com/deepinsight/insightface/master/model_zoo/buffalo_l/scrfd_500m_bnkps.onnx',
      // GitHub releases
      'https://github.com/deepinsight/insightface/releases/download/v0.7/scrfd_500m_bnkps.onnx',
      // jsdelivr CDN
      'https://cdn.jsdelivr.net/gh/deepinsight/insightface@master/model_zoo/buffalo_l/scrfd_500m_bnkps.onnx',
    ],
    note: 'Fallback detection model - smaller size',
    required: false
  },
  {
    filename: 'w600k_r50.onnx',
    description: 'ArcFace recognition model (W600K - Primary)',
    sources: [
      // Use raw GitHub content (more reliable)
      'https://raw.githubusercontent.com/deepinsight/insightface/master/model_zoo/buffalo_l/w600k_r50.onnx',
      // GitHub releases
      'https://github.com/deepinsight/insightface/releases/download/v0.7/w600k_r50.onnx',
      // jsdelivr CDN
      'https://cdn.jsdelivr.net/gh/deepinsight/insightface@master/model_zoo/buffalo_l/w600k_r50.onnx',
    ],
    note: 'Primary recognition model',
    required: true
  },
  {
    filename: 'glint360k_r50.onnx',
    description: 'ArcFace recognition model (Glint360K - Alternative)',
    sources: [
      // Use raw GitHub content
      'https://raw.githubusercontent.com/deepinsight/insightface/master/model_zoo/buffalo_l/glint360k_r50.onnx',
      // GitHub releases
      'https://github.com/deepinsight/insightface/releases/download/v0.7/glint360k_r50.onnx',
      // jsdelivr CDN
      'https://cdn.jsdelivr.net/gh/deepinsight/insightface@master/model_zoo/buffalo_l/glint360k_r50.onnx',
    ],
    note: 'Alternative recognition model - more accurate, optional',
    required: false
  }
];

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const filename = path.basename(filepath);
    
    console.log(`📥 Downloading: ${filename}`);
    console.log(`   From: ${url}`);
    
    const file = fs.createWriteStream(filepath);
    let downloadedBytes = 0;
    let totalBytes = 0;

    protocol
      .get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
          const redirectUrl = response.headers.location;
          file.close();
          fs.unlink(filepath, () => {});
          console.log(`   Redirecting to: ${redirectUrl}`);
          return resolve(downloadFile(redirectUrl, filepath));
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlink(filepath, () => {});
          return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        }

        totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        
        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0) {
            const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
            process.stdout.write(`\r   Progress: ${percent}% (${(downloadedBytes / 1024 / 1024).toFixed(2)} MB)`);
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          const sizeMB = (fs.statSync(filepath).size / 1024 / 1024).toFixed(2);
          console.log(`\n✅ Downloaded: ${filename} (${sizeMB} MB)`);
          resolve();
        });
      })
      .on('error', (err) => {
        file.close();
        fs.unlink(filepath, () => {});
        reject(err);
      });
  });
}

async function downloadModels() {
  try {
    // Create models directory
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
      console.log(`📁 Created directory: ${modelsDir}`);
    } else {
      console.log(`📁 Using existing directory: ${modelsDir}`);
    }

    console.log('📦 Starting ONNX model download...');
    console.log(`📁 Target directory: ${modelsDir}\n`);

    let successCount = 0;
    let failCount = 0;
    const failedFiles = [];

    for (const model of modelFiles) {
      const filepath = path.join(modelsDir, model.filename);

      // Check if file already exists
      if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        if (stats.size > 1024) { // At least 1KB
          console.log(`⏭️  Skipping (already exists): ${model.filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
          successCount++;
          continue;
        } else {
          console.log(`⚠️  File exists but is too small, re-downloading: ${model.filename}`);
          fs.unlinkSync(filepath);
        }
      }

      // Try each source
      let downloaded = false;
      for (let i = 0; i < model.sources.length; i++) {
        const url = model.sources[i];
        try {
          await downloadFile(url, filepath);
          successCount++;
          downloaded = true;
          break; // Success, move to next model
        } catch (error) {
          console.warn(`\n   ⚠️  Failed from source ${i + 1}: ${error.message}`);
          // Try next source
        }
      }

      if (!downloaded) {
        console.error(`\n❌ Error downloading ${model.filename} from all sources`);
        failCount++;
        failedFiles.push(model.filename);
      }
    }

    // Check required vs optional models
    const requiredModels = modelFiles.filter(m => m.required !== false);
    const requiredSuccess = requiredModels.filter(m => 
      fs.existsSync(path.join(modelsDir, m.filename)) && 
      fs.statSync(path.join(modelsDir, m.filename)).size > 1024
    ).length;

    console.log(`\n📊 Download summary: ${successCount} succeeded, ${failCount} failed`);
    console.log(`📋 Required models: ${requiredSuccess}/${requiredModels.length} downloaded`);

    if (requiredSuccess === requiredModels.length) {
      console.log('✅ All REQUIRED ONNX models downloaded successfully!');
      console.log(`📁 Models saved to: ${modelsDir}`);
      
      if (successCount < modelFiles.length) {
        console.log(`⚠️  Note: ${modelFiles.length - successCount} optional model(s) failed to download`);
        console.log(`   This is OK - your app will work with the required models`);
      }

      // Verify required files exist
      let allRequiredExist = true;
      for (const model of requiredModels) {
        const filepath = path.join(modelsDir, model.filename);
        if (!fs.existsSync(filepath) || fs.statSync(filepath).size < 1024) {
          console.error(`❌ Verification failed: ${model.filename} is missing or too small`);
          allRequiredExist = false;
        } else {
          const sizeMB = (fs.statSync(filepath).size / 1024 / 1024).toFixed(2);
          console.log(`   ✅ ${model.filename} (${sizeMB} MB)`);
        }
      }

      if (allRequiredExist) {
        console.log('✅ All required model files verified successfully!');
        return true; // Success - required models are present
      }
    } else if (successCount > 0) {
      console.log('⚠️  Some required models failed to download.');
      console.log(`   Failed files: ${failedFiles.join(', ')}`);
      console.log('   Server will attempt to use fallback methods.');
    } else {
      console.log('❌ All model downloads failed.');
      console.log(`   Failed files: ${failedFiles.join(', ')}`);
      console.log('\n💡 The server will start but face recognition may not work.');
      console.log('   Check Render build logs for download errors.');
      console.log('   See MODEL_DOWNLOAD_GUIDE.md for manual download options.');
    }

    // Return true if at least required models are present
    return requiredSuccess === requiredModels.length;
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
        console.log('\n✅ ONNX model download process completed successfully');
        process.exit(0);
      } else {
        console.log('\n⚠️  Model download completed with some failures');
        console.log('   The system will attempt to download models at runtime if needed.');
        process.exit(0); // Exit with 0 so postinstall doesn't fail
      }
    })
    .catch((error) => {
      console.error('\n❌ Model download failed:', error.message);
      console.error('⚠️  You may need to download models manually');
      process.exit(0); // Exit with 0 so postinstall doesn't fail the build
    });
}

module.exports = { downloadModels };

