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
const { execSync } = require('child_process');

const modelsDir = path.join(__dirname, 'models', 'onnx');
const tempDir = path.join(__dirname, 'temp_models');

// CORRECT SOURCE: Models are in buffalo_l.zip from GitHub releases
// URL: https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip
const BUFFALO_L_ZIP_URL = 'https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip';

// Required ONNX files that should be extracted from the ZIP
const requiredModelFiles = [
  { filename: 'scrfd_10g_gnkps_fp32.onnx', required: true },
  { filename: 'scrfd_500m_bnkps.onnx', required: false },
  { filename: 'w600k_r50.onnx', required: true },
  { filename: 'glint360k_r50.onnx', required: false }
];

function downloadFile(url, filepath, timeout = 300000) { // 5 minute timeout
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const filename = path.basename(filepath);
    
    console.log(`📥 Downloading: ${filename}`);
    console.log(`   From: ${url}`);
    
    const file = fs.createWriteStream(filepath);
    let downloadedBytes = 0;
    let totalBytes = 0;
    let timeoutId;

    const req = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
        file.close();
        fs.unlink(filepath, () => {});
        const redirectUrl = response.headers.location;
        console.log(`   Redirecting to: ${redirectUrl}`);
        clearTimeout(timeoutId);
        return resolve(downloadFile(redirectUrl, filepath, timeout));
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(filepath, () => {});
        clearTimeout(timeoutId);
        return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
      }

      totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      
      // Set timeout for download
      timeoutId = setTimeout(() => {
        req.destroy();
        file.close();
        fs.unlink(filepath, () => {});
        reject(new Error(`Download timeout after ${timeout / 1000} seconds`));
      }, timeout);
      
      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes > 0) {
          const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
          process.stdout.write(`\r   Progress: ${percent}% (${(downloadedBytes / 1024 / 1024).toFixed(2)} MB)`);
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        clearTimeout(timeoutId);
        file.close();
        const sizeMB = (fs.statSync(filepath).size / 1024 / 1024).toFixed(2);
        console.log(`\n✅ Downloaded: ${filename} (${sizeMB} MB)`);
        resolve();
      });
    });

    req.on('error', (err) => {
      clearTimeout(timeoutId);
      file.close();
      fs.unlink(filepath, () => {});
      reject(err);
    });

    req.setTimeout(timeout, () => {
      req.destroy();
      file.close();
      fs.unlink(filepath, () => {});
      reject(new Error(`Request timeout after ${timeout / 1000} seconds`));
    });
  });
}

function extractZip(zipPath, extractTo) {
  // Try to use unzip command (available on Linux/Mac)
  // Fallback to Python zipfile if unzip not available
  try {
    console.log('📦 Extracting ZIP file...');
    execSync(`unzip -q -o "${zipPath}" -d "${extractTo}"`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.log('⚠️  unzip command failed, trying Python...');
    try {
      // Use Python to extract ZIP
      const pythonScript = `
import zipfile
import sys
zipfile.ZipFile('${zipPath}').extractall('${extractTo}')
`;
      execSync(`python3 -c "${pythonScript}"`, { stdio: 'inherit' });
      return true;
    } catch (pyError) {
      try {
        execSync(`python -c "${pythonScript}"`, { stdio: 'inherit' });
        return true;
      } catch (py2Error) {
        console.error('❌ Failed to extract ZIP:', py2Error.message);
        return false;
      }
    }
  }
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
    console.log(`📁 Target directory: ${modelsDir}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📅 Time: ${new Date().toISOString()}\n`);

    // Check if required models already exist
    const requiredModels = requiredModelFiles.filter(m => m.required);
    let allRequiredExist = true;
    for (const model of requiredModels) {
      const filepath = path.join(modelsDir, model.filename);
      if (!fs.existsSync(filepath) || fs.statSync(filepath).size < 1024) {
        allRequiredExist = false;
        break;
      }
    }

    if (allRequiredExist) {
      console.log('✅ All required models already exist, skipping download');
      return true;
    }

    // Create temp directory for ZIP extraction
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const zipPath = path.join(tempDir, 'buffalo_l.zip');
    const extractDir = path.join(tempDir, 'buffalo_l');

    // Download the ZIP file
    console.log('📥 Downloading buffalo_l.zip from GitHub releases...');
    console.log(`   URL: ${BUFFALO_L_ZIP_URL}`);
    try {
      await downloadFile(BUFFALO_L_ZIP_URL, zipPath, 600000); // 10 minute timeout for large file
    } catch (error) {
      console.error(`❌ Failed to download ZIP: ${error.message}`);
      // Cleanup
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      return false;
    }

    // Extract ZIP file
    if (!extractZip(zipPath, tempDir)) {
      console.error('❌ Failed to extract ZIP file');
      // Cleanup
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      return false;
    }

    // List contents of extracted directory to debug structure
    console.log('\n🔍 Checking extracted ZIP structure...');
    function listDirRecursive(dir, prefix = '') {
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory()) {
            console.log(`${prefix}📁 ${item.name}/`);
            listDirRecursive(fullPath, prefix + '  ');
          } else {
            const sizeMB = (fs.statSync(fullPath).size / 1024 / 1024).toFixed(2);
            console.log(`${prefix}📄 ${item.name} (${sizeMB} MB)`);
          }
        }
      } catch (error) {
        console.warn(`   ⚠️  Error listing directory: ${error.message}`);
      }
    }
    
    if (fs.existsSync(extractDir)) {
      console.log(`📁 Contents of ${extractDir}:`);
      listDirRecursive(extractDir);
    } else {
      // Check if extraction created a different structure
      const tempContents = fs.readdirSync(tempDir, { withFileTypes: true });
      console.log(`📁 Contents of temp directory:`);
      for (const item of tempContents) {
        const fullPath = path.join(tempDir, item.name);
        if (item.isDirectory()) {
          console.log(`📁 ${item.name}/`);
          listDirRecursive(fullPath, '  ');
        } else {
          const sizeMB = (fs.statSync(fullPath).size / 1024 / 1024).toFixed(2);
          console.log(`📄 ${item.name} (${sizeMB} MB)`);
        }
      }
    }

    // Copy ONNX files from extracted directory to models directory
    console.log('\n📋 Copying ONNX files...');
    let copiedCount = 0;
    let failedFiles = [];

    // Function to find file recursively
    function findFileRecursive(dir, filename) {
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory()) {
            const found = findFileRecursive(fullPath, filename);
            if (found) return found;
          } else if (item.name === filename) {
            return fullPath;
          }
        }
      } catch (error) {
        // Ignore errors
      }
      return null;
    }

    for (const model of requiredModelFiles) {
      // Search recursively in the extracted directory
      const foundPath = findFileRecursive(tempDir, model.filename);
      
      if (foundPath) {
        const dstPath = path.join(modelsDir, model.filename);
        fs.copyFileSync(foundPath, dstPath);
        const sizeMB = (fs.statSync(dstPath).size / 1024 / 1024).toFixed(2);
        console.log(`   ✅ Copied: ${model.filename} (${sizeMB} MB) from ${path.relative(tempDir, foundPath)}`);
        copiedCount++;
      } else {
        console.warn(`   ⚠️  Not found in ZIP: ${model.filename}`);
        if (model.required) {
          failedFiles.push(model.filename);
        }
      }
    }

    // Cleanup temp files
    console.log('\n🧹 Cleaning up temporary files...');
    try {
      if (fs.existsSync(extractDir)) {
        fs.rmSync(extractDir, { recursive: true, force: true });
      }
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }
      if (fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir);
      }
    } catch (cleanupError) {
      console.warn(`⚠️  Cleanup warning: ${cleanupError.message}`);
    }

    // Verify required models
    const requiredSuccess = requiredModels.filter(m => 
      fs.existsSync(path.join(modelsDir, m.filename)) && 
      fs.statSync(path.join(modelsDir, m.filename)).size > 1024
    ).length;

    console.log(`\n📊 Download summary: ${copiedCount} files copied`);
    console.log(`📋 Required models: ${requiredSuccess}/${requiredModels.length} available`);

    if (requiredSuccess === requiredModels.length) {
      console.log('✅ All REQUIRED ONNX models downloaded successfully!');
      console.log(`📁 Models saved to: ${modelsDir}`);
      return true;
    } else {
      console.log('⚠️  Some required models are missing.');
      console.log(`   Missing files: ${failedFiles.join(', ')}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error in downloadModels:', error.message);
    console.error(error.stack);
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

