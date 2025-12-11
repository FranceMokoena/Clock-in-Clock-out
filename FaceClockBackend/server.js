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

// CORS - allow all origins (adjust if you want stricter rules)
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));

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

// Routes
app.use('/api/staff', staffRoutes);
app.use('/api/locations', locationsRoutes);

// Health check
app.get('/api/health', (req, res) => {
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
});

// Root
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
      locations: 'GET /api/locations/all'
    }
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', method: req.method, path: req.path });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
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
