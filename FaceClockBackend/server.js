require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const staffRoutes = require('./routes/staff');
const locationsRoutes = require('./routes/locations');
const staffCache = require('./utils/staffCache');

// ONNX Runtime face recognition
let faceRecognition;
try {
  faceRecognition = require('./utils/faceRecognitionONNX');
  console.log('✅ Using ONNX Runtime face recognition (SCRFD + ArcFace)');
} catch (onnxError) {
  console.error('❌ ONNX IMPLEMENTATION LOAD FAILED', onnxError.message);
  process.exit(1);
}

const app = express();

// CORS - allow all origins and methods
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-device-*']
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) throw new Error('MONGO_URI must be set in .env');

const mongoConnectPromise = mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    throw err;
  });

// Register routes
app.use('/api/staff', staffRoutes);
app.use('/api/locations', locationsRoutes);

// Health check - supports GET, POST, OPTIONS
const healthHandler = (req, res) => {
  const used = process.memoryUsage();
  res.json({
    status: 'OK',
    message: 'Face Clock API is running',
    memory: {
      heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(used.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(used.rss / 1024 / 1024) + 'MB'
    }
  });
};
app.get('/api/health', healthHandler);
app.post('/api/health', healthHandler);
app.options('/api/health', (req, res) => res.sendStatus(204));

// Root endpoint listing all frontend routes
app.all('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Internship Success Clock-in/Clock-out API',
    endpoints: {
      health: 'GET/POST /api/health',
      login: 'POST /api/staff/login',
      register: 'POST /api/staff/register',
      clock: 'POST /api/staff/clock',
      validatePreview: 'POST /api/staff/validate-preview',
      verifyRegistration: 'GET /api/staff/verify-registration',
      locations: 'GET /api/locations/all',
      staffList: 'GET /api/staff/list',
      staffLogs: 'GET /api/staff/logs',
      adminStats: 'GET /api/staff/admin/stats',
      adminStaff: 'GET /api/staff/admin/staff',
      adminHostCompanies: 'GET /api/staff/admin/host-companies',
      adminDepartments: 'GET /api/staff/admin/departments/all',
      adminNotAccountable: 'GET /api/staff/admin/not-accountable',
      adminTimesheet: 'GET /api/staff/admin/staff/:staffId/timesheet'
    }
  });
});

// 404 for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.path,
    availableEndpoints: [
      'GET/POST /api/health',
      'POST /api/staff/login',
      'POST /api/staff/register',
      'POST /api/staff/clock',
      'POST /api/staff/validate-preview',
      'GET /api/staff/verify-registration',
      'GET /api/locations/all',
      'GET /api/staff/list',
      'GET /api/staff/logs',
      'GET /api/staff/admin/stats',
      'GET /api/staff/admin/staff',
      'GET /api/staff/admin/host-companies',
      'GET /api/staff/admin/departments/all',
      'GET /api/staff/admin/not-accountable',
      'GET /api/staff/admin/staff/:staffId/timesheet'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Start server
async function startServer() {
  await mongoConnectPromise;

  console.log('📦 Warming staff cache...');
  await staffCache.preload();
  staffCache.startBackgroundRefresh();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 API Base URL: https://clock-in.duckdns.org/api`);
  });
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
