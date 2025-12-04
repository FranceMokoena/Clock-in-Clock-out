// NOTE: TensorFlow.js Node backend (@tensorflow/tfjs-node) is disabled
// because it conflicts with face-api.js, causing "forwardFunc_1 is not a function" errors.
// face-api.js works reliably with the CPU backend (pure JavaScript).
// If you need faster performance, consider using a different face recognition library
// that's compatible with TensorFlow.js Node backend.

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const staffRoutes = require('./routes/staff');
const locationsRoutes = require('./routes/locations');
let loadModels;
let staffCache;

// ONNX Runtime is MANDATORY - face-api.js has been removed
// Using SCRFD (face detection) + ArcFace (face recognition) for maximum accuracy
let faceRecognition;

try {
  faceRecognition = require('./utils/faceRecognitionONNX');
  loadModels = faceRecognition.loadModels;
  console.log('✅ Using ONNX Runtime face recognition (SCRFD + ArcFace)');
  console.log('   SCRFD face detection: ~95% accuracy');
  console.log('   ArcFace recognition: 99.83% accuracy on LFW');
  console.log('   No TensorFlow.js dependencies required!');
} catch (onnxError) {
  console.error('\n❌ ========================================');
  console.error('❌ ONNX IMPLEMENTATION LOAD FAILED');
  console.error('❌ ========================================');
  console.error(`\nError: ${onnxError.message}`);
  console.error('\n💡 Solutions:');
  console.error('   1. Download ONNX models:');
  console.error('      npm run download-models');
  console.error('   2. If models fail to download, see MIGRATION_INSTRUCTIONS.md');
  console.error('   3. Ensure models are in: models/onnx/');
  console.error('      - scrfd_10g_gnkps_fp32.onnx (face detection)');
  console.error('      - w600k_r50.onnx (face recognition)');
  console.error('\n');
  process.exit(1);
}

staffCache = require('./utils/staffCache');

// AWS Rekognition client (optional - lazy loaded in routes)
const rekognition = require('./utils/rekognitionClient');

const app = express();

// CORS configuration - allow all origins (adjust for production if needed)
app.use(cors({
  origin: '*', // In production, specify your frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsers - Express automatically skips multipart/form-data
// But we'll configure them to be safe
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.path.includes('/register') || req.path.includes('/clock')) {
    console.log(`   📦 Body keys: ${Object.keys(req.body || {}).join(', ')}`);
    console.log(`   📦 Files: ${req.files ? Object.keys(req.files).join(', ') : 'none'}`);
  }
  next();
});

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/Employees';

// Improved MongoDB connection with better error handling
mongoose.connect(MONGO_URI)
.then(() => {
  console.log('✅ MongoDB connected successfully');
  console.log(`📊 Database: ${mongoose.connection.name}`);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  if (err.message.includes('IP') || err.message.includes('whitelist')) {
    console.error('\n🔒 IP WHITELIST ISSUE DETECTED!');
    console.error('📝 To fix this:');
    console.error('   1. Go to MongoDB Atlas: https://cloud.mongodb.com/');
    console.error('   2. Navigate to: Network Access → IP Access List');
    console.error('   3. Click "Add IP Address"');
    console.error('   4. For Render.com, add: 0.0.0.0/0 (allows all IPs)');
    console.error('      OR add specific Render IP ranges if available');
    console.error('   5. Wait 1-2 minutes for changes to propagate');
  }
  console.error('\n💡 Make sure:');
  console.error('   - MONGO_URI is set correctly in .env file');
  console.error('   - Your IP address is whitelisted in MongoDB Atlas');
  console.error('   - Database user has correct permissions');
});

// Debug: Log all incoming requests to /api/staff (must be before routes)
app.use('/api/staff', (req, res, next) => {
  console.log(`📥 ========== INCOMING REQUEST TO /api/staff ==========`);
  console.log(`📥 Method: ${req.method}`);
  console.log(`📥 Path: ${req.path}`);
  console.log(`📥 Full URL: ${req.url}`);
  console.log(`📥 Headers:`, {
    'content-type': req.headers['content-type'],
    'content-length': req.headers['content-length'],
    'user-agent': req.headers['user-agent']?.substring(0, 50)
  });
  console.log(`📥 Body keys: ${Object.keys(req.body || {}).join(', ') || 'none'}`);
  console.log(`📥 Files: ${req.files ? Object.keys(req.files).join(', ') : 'none'}`);
  console.log(`📥 ===================================================`);
  next();
});

// Routes
app.use('/api/staff', staffRoutes);
app.use('/api/locations', locationsRoutes);

// 🏦 BANK-GRADE: Model warmup on startup (preload + warm inference)
// This eliminates "cold start" latency on first request
(async () => {
  try {
    console.log('\n🔥 ========== MODEL WARMUP ==========');
    console.log('🔥 Preloading ONNX models and warming up inference...');
    const warmupStart = Date.now();
    
    // Load models
    await loadModels();
    console.log('✅ Models loaded successfully');
    
    // Check AWS Rekognition configuration (optional)
    if (rekognition.isConfigured()) {
      console.log('🌐 AWS Rekognition: Configured');
      console.log(`   Region: ${process.env.AWS_REGION || 'us-east-1'}`);
      if (process.env.S3_BUCKET) {
        console.log(`   S3 Bucket: ${process.env.S3_BUCKET}`);
      } else {
        console.log('   S3 Bucket: Not configured (images won\'t be uploaded to S3)');
      }
      // Test Rekognition connection (non-blocking)
      try {
        await rekognition.ensureCollection();
        console.log('✅ AWS Rekognition: Collection ready');
      } catch (rekError) {
        console.warn('⚠️ AWS Rekognition: Collection check failed (will retry on first use):', rekError.message);
      }
    } else {
      console.log('⚠️ AWS Rekognition: Not configured (using ONNX only)');
      console.log('   Set AWS_REGION in .env to enable Rekognition');
    }
    
    // Preload staff cache
    console.log('🔥 Preloading staff cache...');
    await staffCache.preload();
    console.log('✅ Staff cache preloaded');
    
    // Warmup inference with dummy image (eliminates first-request latency)
    console.log('🔥 Warming up inference pipeline with dummy image...');
    const dummyImageBuffer = Buffer.alloc(640 * 480 * 3); // 640x480 RGB
    try {
      await faceRecognition.warmupInference(dummyImageBuffer);
      console.log('✅ Inference pipeline warmed up');
    } catch (warmupError) {
      console.warn('⚠️ Warmup inference failed (non-critical):', warmupError.message);
    }
    
    const warmupTime = Date.now() - warmupStart;
    console.log(`✅ Warmup complete in ${warmupTime}ms (${(warmupTime / 1000).toFixed(1)}s)`);
    console.log('🔥 ===================================\n');
  } catch (error) {
    console.error('⚠️ Warmup failed (non-critical):', error.message);
  }
})();

// Health check
app.get('/api/health', (req, res) => {
  const used = process.memoryUsage();
  const mbUsed = Math.round(used.heapUsed / 1024 / 1024);
  const mbTotal = Math.round(used.heapTotal / 1024 / 1024);
  const mbRss = Math.round(used.rss / 1024 / 1024);
  
  res.json({ 
    status: 'OK', 
    message: 'Face Clock API is running',
    memory: {
      heapUsed: `${mbUsed}MB`,
      heapTotal: `${mbTotal}MB`,
      rss: `${mbRss}MB`,
      limit: '512MB',
      usagePercent: Math.round((mbUsed / 512) * 100)
    }
  });
});

// 💾 MEMORY OPTIMIZATION: Monitor memory usage every 30 seconds
setInterval(() => {
  const used = process.memoryUsage();
  const mbUsed = Math.round(used.heapUsed / 1024 / 1024);
  const mbTotal = Math.round(used.heapTotal / 1024 / 1024);
  const mbRss = Math.round(used.rss / 1024 / 1024);
  const usagePercent = Math.round((mbUsed / 512) * 100);
  
  console.log(`💾 Memory: ${mbUsed}MB / ${mbTotal}MB heap, ${mbRss}MB RSS (${usagePercent}% of 512MB limit)`);
  
  if (mbUsed > 450) {
    console.warn('⚠️ Memory usage high! Consider optimizing or upgrading hosting plan.');
  }
  if (mbUsed > 480) {
    console.error('🚨 Memory usage critical! Service may crash soon.');
  }
}, 30000); // Every 30 seconds

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Internship Success Clock-in/Clock-out API',
      endpoints: {
      health: '/api/health',
      register: 'POST /api/staff/register',
      clock: 'POST /api/staff/clock',
      list: 'GET /api/staff/list',
      logs: 'GET /api/staff/logs',
      test: 'GET /api/staff/test',
      locations: 'GET /api/locations/all',
      locationsSearch: 'GET /api/locations/search?q=query',
      provinces: 'GET /api/locations/provinces'
    }
  });
});

const PORT = process.env.PORT || 5000;

// 404 handler for undefined routes (must be before error handler)
app.use((req, res) => {
  console.error(`❌ Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Route not found',
    method: req.method,
    path: req.path,
      availableEndpoints: [
        'GET /api/health',
        'POST /api/staff/login',
        'POST /api/staff/register',
        'POST /api/staff/clock',
        'GET /api/staff/list',
        'GET /api/staff/logs',
        'GET /api/staff/test',
        'GET /api/staff/admin/stats',
        'GET /api/staff/admin/staff',
        'GET /api/staff/admin/not-accountable',
        'GET /api/staff/admin/staff/:staffId/timesheet'
      ]
  });
});

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

async function startServer() {
  // LAZY LOADING: Don't load models at startup to save memory
  // Models will be loaded on first request (lazy loading)
  console.log('🚀 Starting server with lazy model loading...');
  console.log('💡 Face recognition models will load on first use to save memory');
  
  // Only verify models exist, don't load them yet
  const fs = require('fs');
  const path = require('path');
  const modelsPath = path.join(__dirname, 'models', 'onnx');
  const detectionModel = path.join(modelsPath, 'scrfd_10g_gnkps_fp32.onnx');
  const detectionModelFallback = path.join(modelsPath, 'scrfd_500m_bnkps.onnx');
  const recognitionModel = path.join(modelsPath, 'w600k_r50.onnx');
  
  const hasDetection = fs.existsSync(detectionModel) || fs.existsSync(detectionModelFallback);
  const hasRecognition = fs.existsSync(recognitionModel);
  
  if (!hasDetection || !hasRecognition) {
    console.warn('⚠️  WARNING: Some models are missing. They will be downloaded on first use.');
    console.warn('   Missing detection:', !hasDetection);
    console.warn('   Missing recognition:', !hasRecognition);
  } else {
    console.log('✅ Model files found (will load on first request)');
  }

  console.log('📦 Warming staff cache...');
  await staffCache.preload();
  staffCache.startBackgroundRefresh();

  app.listen(PORT, '0.0.0.0', () => {
    const env = process.env.NODE_ENV || 'development';
    const externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.EXTERNAL_URL;

    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${env}`);

    if (env === 'production' && externalUrl) {
      // Render / production: show public URL instead of localhost
      console.log(`📡 API available at ${externalUrl}/api`);
      console.log(`🌐 External URL: ${externalUrl}`);
    } else {
      // Local / development helpers
      console.log(`📡 API available at http://localhost:${PORT}/api`);
      console.log(`📱 Android emulator: http://10.0.2.2:${PORT}/api`);
      console.log(`📱 Physical device: Use your computer's IP (e.g., http://192.168.0.104:${PORT}/api)`);
      console.log(`   Find your IP: ipconfig (Windows) or ifconfig (Mac/Linux)`);
    }

    console.log(`\n✅ Server ready! Models will load automatically on first face recognition request.`);
  });
}

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
