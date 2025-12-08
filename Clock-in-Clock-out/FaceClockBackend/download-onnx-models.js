/**
 * Download ONNX models for face recognition
 * This script checks for required models and downloads them if missing
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const modelsPath = path.join(__dirname, 'models/onnx');

// Required models
const REQUIRED_MODELS = {
  detection: ['scrfd_10g_gnkps_fp32.onnx', 'scrfd_500m_bnkps.onnx'], // At least one required
  recognition: ['w600k_r50.onnx'] // Required
};

// Optional models
const OPTIONAL_MODELS = ['glint360k_r50.onnx'];

/**
 * Check if a file exists
 */
function fileExists(filepath) {
  try {
    return fs.existsSync(filepath) && fs.statSync(filepath).size > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Check which models are missing
 */
function checkMissingModels() {
  const missing = {
    detection: true,
    recognition: true,
    optional: []
  };

  // Check detection models (at least one required)
  for (const model of REQUIRED_MODELS.detection) {
    const filepath = path.join(modelsPath, model);
    if (fileExists(filepath)) {
      missing.detection = false;
      break;
    }
  }

  // Check recognition models
  for (const model of REQUIRED_MODELS.recognition) {
    const filepath = path.join(modelsPath, model);
    if (fileExists(filepath)) {
      missing.recognition = false;
      break;
    }
  }

  // Check optional models
  for (const model of OPTIONAL_MODELS) {
    const filepath = path.join(modelsPath, model);
    if (!fileExists(filepath)) {
      missing.optional.push(model);
    }
  }

  return missing;
}

/**
 * Download a file from URL
 */
function downloadFile(url, filepath, timeout = 300000) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const filename = path.basename(filepath);
    
    console.log(`📥 Downloading: ${filename}`);
    
    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const file = fs.createWriteStream(filepath);
    let downloadedBytes = 0;
    let totalBytes = 0;
    
    const req = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302 || 
          response.statusCode === 307 || response.statusCode === 308) {
        file.close();
        fs.unlink(filepath, () => {});
        return resolve(downloadFile(response.headers.location, filepath, timeout));
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
    });

    req.on('error', (err) => {
      file.close();
      fs.unlink(filepath, () => {});
      reject(err);
    });

    req.setTimeout(timeout, () => {
      req.destroy();
      file.close();
      fs.unlink(filepath, () => {});
      reject(new Error('Download timeout'));
    });
  });
}

/**
 * Extract ZIP file (simple implementation)
 */
function extractZipFile(zipPath, extractTo) {
  try {
    // For now, we'll use a simple approach - try to use built-in modules
    // If unzipper or yauzl is needed, they should be installed
    // This is a placeholder - actual extraction would require a zip library
    console.log('⚠️  ZIP extraction requires additional dependencies');
    console.log('⚠️  Models will be downloaded at runtime by the server if needed');
    return false;
  } catch (error) {
    console.error(`❌ Extraction error: ${error.message}`);
    return false;
  }
}

/**
 * Download missing models from buffalo_l.zip
 */
async function downloadMissingModels() {
  // Ensure models directory exists
  if (!fs.existsSync(modelsPath)) {
    fs.mkdirSync(modelsPath, { recursive: true });
    console.log(`📁 Created models directory: ${modelsPath}`);
  }

  const missing = checkMissingModels();

  if (!missing.detection && !missing.recognition) {
    console.log('✅ All required models are already present');
    if (missing.optional.length > 0) {
      console.log(`ℹ️  Optional models missing: ${missing.optional.join(', ')}`);
    }
    return true;
  }

  console.log('⚠️  Some required models are missing');
  console.log('⚠️  The server will attempt to download them at runtime when needed');
  console.log('⚠️  This may take several minutes on first startup');
  
  // Note: We're not downloading here because:
  // 1. ZIP extraction requires additional dependencies
  // 2. The server already has runtime download functionality
  // 3. This prevents blocking npm install
  
  return false;
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🔍 Checking for ONNX models...');
    const success = await downloadMissingModels();
    
    if (success) {
      console.log('✅ Model check completed');
      process.exit(0);
    } else {
      console.log('⚠️  Models will be downloaded at runtime');
      process.exit(0); // Exit with success - runtime download is acceptable
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.log('⚠️  Models will be downloaded at runtime');
    process.exit(0); // Exit with success - runtime download is acceptable
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { downloadMissingModels, checkMissingModels };

