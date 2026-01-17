require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');

const staffRoutes = require('./routes/staff');
const locationsRoutes = require('./routes/locations');
const internReportsRoutes = require('./routes/internReports');
const notificationsRoutes = require('./routes/notifications');
const staffCache = require('./utils/staffCache');
const eventEmitter = require('./utils/eventEmitter');
const API_BASE_URL = process.env.API_BASE_URL;


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

// Create HTTP server for Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000
});

// Register Socket.IO with event emitter for real-time delivery
eventEmitter.registerSocketIO(io);

// CORS - allow all origins and methods
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-device-*']
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB connection

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) throw new Error('MONGO_URI must be set in .env');
mongoose.set('bufferCommands', false);

// MongoDB connection options to prevent timeout errors
const mongoOptions = {
  serverSelectionTimeoutMS: 30000, // 30 seconds - time to wait for server selection
  socketTimeoutMS: 45000, // 45 seconds - time to wait for socket connection
  connectTimeoutMS: 30000, // 30 seconds - time to wait for initial connection
   // Disable mongoose buffering - fail immediately if not connected
  bufferCommands: false, // Disable mongoose buffering
  maxPoolSize: 10, // Maximum number of connections in the connection pool
  minPoolSize: 2, // Minimum number of connections in the connection pool
  retryWrites: true,
  w: 'majority'
};

const mongoConnectPromise = mongoose.connect(MONGO_URI, mongoOptions)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🔗 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('❌ Full error:', err);
    throw err;
  });

// Register routes
console.log('Registering routes...');
try {
  console.log('staffRoutes type:', typeof staffRoutes, Object.keys(staffRoutes || {}));
} catch (e) {
  console.warn('Could not inspect staffRoutes:', e.message);
}
app.use('/api/staff', staffRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/intern-reports', internReportsRoutes);
app.use('/api/notifications', notificationsRoutes);

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
    },
    websocket: {
      status: 'ready',
      activeConnections: eventEmitter.getActiveConnections()
    }
  });
};
app.get('/api/health', healthHandler);
app.post('/api/health', healthHandler);
app.options('/api/health', (req, res) => res.sendStatus(204));

// API root endpoint listing all API routes (handle both /api and /api/)
const apiRootHandler = (req, res) => {
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
      adminTimesheet: 'GET /api/staff/admin/staff/:staffId/timesheet',
      internReportsCreate: 'POST /api/intern-reports',
      internReportsGet: 'GET /api/intern-reports',
      internReportsDetail: 'GET /api/intern-reports/:reportId',
      internReportsUpdate: 'PATCH /api/intern-reports/:reportId'
    }
  });
};
app.all('/api', apiRootHandler);
app.all('/api/', apiRootHandler);

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
      adminTimesheet: 'GET /api/staff/admin/staff/:staffId/timesheet',
      internReportsCreate: 'POST /api/intern-reports',
      internReportsGet: 'GET /api/intern-reports',
      internReportsDetail: 'GET /api/intern-reports/:reportId',
      internReportsUpdate: 'PATCH /api/intern-reports/:reportId'
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
      'GET /api/staff/admin/staff/:staffId/timesheet',
      'POST /api/intern-reports',
      'GET /api/intern-reports',
      'GET /api/intern-reports/:reportId',
      'PATCH /api/intern-reports/:reportId'
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
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 API Base URL: https://clock-in.duckdns.org/api`);
    console.log(`📡 WebSocket ready for real-time notifications`);
  });
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
