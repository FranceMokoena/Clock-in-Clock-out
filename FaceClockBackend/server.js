const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const staffRoutes = require('./routes/staff');

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

// Routes
app.use('/api/staff', staffRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Face Clock API is running' });
});

const PORT = process.env.PORT || 5000;

// Error handling middleware
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.RENDER_EXTERNAL_URL) {
    console.log(`🌐 External URL: ${process.env.RENDER_EXTERNAL_URL}`);
  }
});
