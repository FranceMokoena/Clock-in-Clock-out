const express = require('express');
const router = express.Router();
const multer = require('multer');
const Staff = require('../models/Staff');
const ClockLog = require('../models/ClockLog');
const { generateEmbedding, findMatchingStaff } = require('../utils/faceRecognition');

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Test route to verify router is working
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Staff routes are working!' });
});

// Register new staff member
router.post('/register', upload.single('image'), async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !req.file) {
      return res.status(400).json({ error: 'Name and image are required' });
    }

    // Generate face embedding
    const embedding = await generateEmbedding(req.file.buffer);
    
    // Encrypt embedding
    const encryptedEmbedding = Staff.encryptEmbedding(embedding);
    
    // Save staff member
    const staff = new Staff({
      name,
      faceEmbedding: embedding, // Keep unencrypted in memory for comparison (consider removing in production)
      encryptedEmbedding
    });
    
    await staff.save();
    
    res.json({
      success: true,
      staff: {
        id: staff._id,
        name: staff.name,
        createdAt: staff.createdAt
      }
    });
  } catch (error) {
    console.error('Error registering staff:', error);
    res.status(500).json({ error: error.message || 'Failed to register staff' });
  }
});

// Clock in/out
router.post('/clock', upload.single('image'), async (req, res) => {
  try {
    console.log('📸 Clock request received');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file ? `File received (${req.file.size} bytes)` : 'No file');
    
    const { type } = req.body; // 'in', 'out', 'break_start', or 'break_end'
    
    if (!type || !['in', 'out', 'break_start', 'break_end'].includes(type)) {
      console.error('❌ Invalid clock type:', type);
      return res.status(400).json({ error: 'Clock type must be "in", "out", "break_start", or "break_end"' });
    }
    
    if (!req.file) {
      console.error('❌ No image file received');
      return res.status(400).json({ error: 'Image is required' });
    }
    
    console.log(`✅ Processing ${type} request for staff member`);

    // Generate embedding from captured image
    const embedding = await generateEmbedding(req.file.buffer);
    
    // Get all active staff members
    const allStaff = await Staff.find({ isActive: true });
    
    // Decrypt embeddings for comparison
    const staffWithEmbeddings = allStaff.map(staff => ({
      ...staff.toObject(),
      decryptedEmbedding: Staff.decryptEmbedding(staff.encryptedEmbedding)
    }));
    
    // Find matching staff
    const match = await findMatchingStaff(embedding, staffWithEmbeddings);
    
    if (!match) {
      console.error('❌ Face not recognized - no matching staff found');
      return res.status(404).json({ 
        success: false,
        error: 'Face not recognized. Please register first.' 
      });
    }
    
    const { staff, similarity } = match;
    const confidence = Math.round(similarity * 100);
    
    // Create clock log
    const clockLog = new ClockLog({
      staffId: staff._id,
      staffName: staff.name,
      clockType: type,
      confidence
    });
    
    await clockLog.save();
    
    // Format timestamp
    const timestamp = new Date();
    const timeString = timestamp.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    let clockTypeText;
    if (type === 'in') {
      clockTypeText = 'Clocked In';
    } else if (type === 'out') {
      clockTypeText = 'Clocked Out';
    } else if (type === 'break_start') {
      clockTypeText = 'Started Break';
    } else if (type === 'break_end') {
      clockTypeText = 'Ended Break';
    }
    
    console.log(`✅ Success: ${staff.name} ${clockTypeText} at ${timeString}`);
    
    res.json({
      success: true,
      message: `${staff.name} — ${clockTypeText} at ${timeString}`,
      staffName: staff.name,
      clockType: type,
      timestamp: timestamp.toISOString(),
      confidence
    });
  } catch (error) {
    console.error('❌ Error clocking in/out:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message || 'Failed to process clock in/out' });
  }
});

// Get all staff members
router.get('/list', async (req, res) => {
  try {
    const staff = await Staff.find({ isActive: true }).select('name createdAt').sort({ createdAt: -1 });
    res.json({ success: true, staff });
  } catch (error) {
    console.error('Error fetching staff list:', error);
    res.status(500).json({ error: 'Failed to fetch staff list' });
  }
});

// Get clock logs
router.get('/logs', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const logs = await ClockLog.find()
      .populate('staffId', 'name')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    
    res.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching clock logs:', error);
    res.status(500).json({ error: 'Failed to fetch clock logs' });
  }
});

module.exports = router;

