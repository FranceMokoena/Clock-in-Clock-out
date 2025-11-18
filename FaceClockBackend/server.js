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
const { loadModels } = require('./utils/faceRecognition');
const staffCache = require('./utils/staffCache');

const app = express();

// CORS configuration - allow all origins (adjust for production if needed)
app.use(cors({
  origin: '*', // In production, specify your frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
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
  console.log(`📥 ${req.method} ${req.path} - Headers:`, {
    'content-type': req.headers['content-type'],
    'content-length': req.headers['content-length']
  });
  next();
});

// Routes
app.use('/api/staff', staffRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Face Clock API is running' });
});

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
      test: 'GET /api/staff/test'
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
      'POST /api/staff/register',
      'POST /api/staff/clock',
      'GET /api/staff/list',
      'GET /api/staff/logs',
      'GET /api/staff/test'
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
  console.log('🚀 Preparing face recognition services...');
  await loadModels();
  console.log('✅ Face recognition models ready');

  console.log('📦 Warming staff cache...');
  await staffCache.preload();
  staffCache.startBackgroundRefresh();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
    console.log(`📱 Android emulator: http://10.0.2.2:${PORT}/api`);
    console.log(`📱 Physical device: Use your computer's IP (e.g., http://192.168.1.104:${PORT}/api)`);
    console.log(`   Find your IP: ipconfig (Windows) or ifconfig (Mac/Linux)`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    if (process.env.RENDER_EXTERNAL_URL) {
      console.log(`🌐 External URL: ${process.env.RENDER_EXTERNAL_URL}`);
    }
    console.log(`\n✅ Server ready! Make sure Windows Firewall allows connections on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
