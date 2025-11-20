/**
 * Script to check what models are available in InsightFace repository
 * 
 * Usage: node check-insightface-models.js "path/to/insightface"
 */

const fs = require('fs');
const path = require('path');

const insightfacePath = process.argv[2];

if (!insightfacePath) {
  console.log('Usage: node check-insightface-models.js "path/to/insightface"');
  console.log('\nExample:');
  console.log('  node check-insightface-models.js "C:\\Users\\YourName\\Downloads\\insightface"');
  process.exit(1);
}

if (!fs.existsSync(insightfacePath)) {
  console.error(`❌ Path not found: ${insightfacePath}`);
  process.exit(1);
}

console.log(`\n🔍 Searching for models in: ${insightfacePath}\n`);

function findModels(dir, extensions = ['.onnx', '.pth', '.params'], maxDepth = 5, currentDepth = 0) {
  if (currentDepth > maxDepth) return [];
  
  const results = [];
  
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        // Skip node_modules and other large directories
        if (!['node_modules', '.git', '__pycache__', '.idea'].includes(file.name)) {
          results.push(...findModels(fullPath, extensions, maxDepth, currentDepth + 1));
        }
      } else {
        const ext = path.extname(file.name).toLowerCase();
        if (extensions.includes(ext)) {
          const relativePath = path.relative(insightfacePath, fullPath);
          const stats = fs.statSync(fullPath);
          results.push({
            path: relativePath,
            fullPath: fullPath,
            size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
            ext: ext
          });
        }
      }
    }
  } catch (err) {
    // Skip directories we can't read
  }
  
  return results;
}

// Look for models
const models = findModels(insightfacePath);

if (models.length === 0) {
  console.log('❌ No model files found (.onnx, .pth, .params)');
  console.log('\n💡 The models might be:');
  console.log('   1. In a different location');
  console.log('   2. Need to be downloaded separately');
  console.log('   3. Available through InsightFace Python package');
  console.log('\n📝 Check these locations manually:');
  console.log('   - model_zoo/');
  console.log('   - python-package/insightface/model_zoo/');
  console.log('   - detection/');
  console.log('   - recognition/');
} else {
  console.log(`✅ Found ${models.length} model file(s):\n`);
  
  // Group by extension
  const byExt = {};
  models.forEach(m => {
    if (!byExt[m.ext]) byExt[m.ext] = [];
    byExt[m.ext].push(m);
  });
  
  // Show ONNX first (most useful)
  if (byExt['.onnx']) {
    console.log('📦 ONNX Models (ready to use):');
    byExt['.onnx'].forEach(m => {
      console.log(`   ✅ ${m.path} (${m.size})`);
    });
    console.log('');
  }
  
  // Show PyTorch models
  if (byExt['.pth']) {
    console.log('📦 PyTorch Models (need conversion):');
    byExt['.pth'].forEach(m => {
      console.log(`   ⚠️  ${m.path} (${m.size})`);
    });
    console.log('');
  }
  
  // Show MXNet models
  if (byExt['.params']) {
    console.log('📦 MXNet Models (need conversion):');
    byExt['.params'].forEach(m => {
      console.log(`   ⚠️  ${m.path} (${m.size})`);
    });
    console.log('');
  }
  
  // Check for specific models we need
  console.log('🎯 Looking for required models:\n');
  
  const scrfd = models.find(m => m.path.toLowerCase().includes('scrfd') && m.path.toLowerCase().includes('500m'));
  const arcface = models.find(m => 
    (m.path.toLowerCase().includes('w600k') || 
     m.path.toLowerCase().includes('glint360k') ||
     m.path.toLowerCase().includes('arcface')) &&
    (m.path.toLowerCase().includes('r50') || m.path.toLowerCase().includes('50'))
  );
  
  if (scrfd) {
    console.log(`✅ SCRFD Detection Model Found:`);
    console.log(`   ${scrfd.path} (${scrfd.size})`);
    if (scrfd.ext === '.onnx') {
      console.log(`   ✅ Ready to use! Copy to: FaceClockBackend/models/onnx/`);
    } else {
      console.log(`   ⚠️  Needs conversion from ${scrfd.ext} to .onnx`);
    }
  } else {
    console.log(`❌ SCRFD Detection Model Not Found`);
    console.log(`   Looking for: scrfd_500m_bnkps.onnx or .pth`);
  }
  
  console.log('');
  
  if (arcface) {
    console.log(`✅ ArcFace Recognition Model Found:`);
    console.log(`   ${arcface.path} (${arcface.size})`);
    if (arcface.ext === '.onnx') {
      console.log(`   ✅ Ready to use! Copy to: FaceClockBackend/models/onnx/`);
    } else {
      console.log(`   ⚠️  Needs conversion from ${arcface.ext} to .onnx`);
    }
  } else {
    console.log(`❌ ArcFace Recognition Model Not Found`);
    console.log(`   Looking for: w600k_r50.onnx or glint360k_r50.onnx or .pth versions`);
  }
  
  console.log('\n📋 Next Steps:');
  if (scrfd && scrfd.ext === '.onnx' && arcface && arcface.ext === '.onnx') {
    console.log('   1. Copy both .onnx files to: FaceClockBackend/models/onnx/');
    console.log('   2. Run: npm start');
  } else {
    console.log('   1. If you found .onnx files: Copy them to FaceClockBackend/models/onnx/');
    console.log('   2. If you only have .pth/.params: Convert to ONNX (see COPY_MODELS_GUIDE.md)');
    console.log('   3. Or download pre-converted models from Hugging Face (easiest)');
  }
}

console.log('');

