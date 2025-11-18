const express = require('express');
const router = express.Router();
const multer = require('multer');
const Staff = require('../models/Staff');
const ClockLog = require('../models/ClockLog');
const { generateEmbedding, findMatchingStaff } = require('../utils/faceRecognition');
const staffCache = require('../utils/staffCache');

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

// Register new staff member - accepts 2 images for accuracy
router.post('/register', upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, surname, idNumber, phoneNumber, role } = req.body;
    
    // Validate required fields
    if (!name || !surname || !idNumber || !phoneNumber || !role) {
      return res.status(400).json({ error: 'Name, surname, ID number, phone number, and role are required' });
    }
    
    // Validate ID number format (13 digits)
    if (!/^\d{13}$/.test(idNumber.trim())) {
      return res.status(400).json({ error: 'ID Number must be exactly 13 digits' });
    }
    
    // Validate role
    if (!['Intern', 'Staff', 'Other'].includes(role)) {
      return res.status(400).json({ error: 'Role must be Intern, Staff, or Other' });
    }
    
    // Check if both images are provided
    const image1 = req.files?.image1?.[0];
    const image2 = req.files?.image2?.[0];
    
    if (!image1 || !image2) {
      return res.status(400).json({ error: 'Two images are required for registration (for accuracy)' });
    }
    
    // Check if staff with this ID number already exists
    const existingStaff = await Staff.findOne({ idNumber: idNumber.trim(), isActive: true });
    if (existingStaff) {
      return res.status(400).json({ error: `Staff with ID number ${idNumber.trim()} is already registered` });
    }
    
    console.log(`📸 Processing registration for ${name.trim()} ${surname.trim()} (ID: ${idNumber.trim()})`);
    console.log(`   Role: ${role}, Phone: ${phoneNumber.trim()}`);
    console.log(`   Processing 2 face images for accuracy...`);
    
    // Generate embeddings for both images
    let embedding1, embedding2, quality1, quality2;
    
    try {
      console.log('   Processing image 1...');
      const embeddingResult1 = await generateEmbedding(image1.buffer);
      embedding1 = embeddingResult1.embedding || embeddingResult1;
      quality1 = embeddingResult1.quality || 0;
      console.log(`   ✅ Image 1 processed - Quality: ${(quality1 * 100).toFixed(1)}%`);
    } catch (error1) {
      console.error('   ❌ Error processing image 1:', error1.message);
      return res.status(500).json({ error: `Failed to process first image: ${error1.message}` });
    }
    
    try {
      console.log('   Processing image 2...');
      const embeddingResult2 = await generateEmbedding(image2.buffer);
      embedding2 = embeddingResult2.embedding || embeddingResult2;
      quality2 = embeddingResult2.quality || 0;
      console.log(`   ✅ Image 2 processed - Quality: ${(quality2 * 100).toFixed(1)}%`);
    } catch (error2) {
      console.error('   ❌ Error processing image 2:', error2.message);
      return res.status(500).json({ error: `Failed to process second image: ${error2.message}` });
    }
    
    // Validate embeddings
    if (!embedding1 || !Array.isArray(embedding1) || embedding1.length === 0) {
      return res.status(500).json({ error: 'Invalid embedding generated from first image' });
    }
    if (!embedding2 || !Array.isArray(embedding2) || embedding2.length === 0) {
      return res.status(500).json({ error: 'Invalid embedding generated from second image' });
    }
    
    // Calculate average quality
    const avgQuality = ((quality1 + quality2) / 2);
    console.log(`   📊 Average face quality: ${(avgQuality * 100).toFixed(1)}%`);
    
    // Create staff with both embeddings
    const fullName = `${name.trim()} ${surname.trim()}`;
    const encryptedEmbedding = Staff.encryptEmbedding(embedding1); // Use first embedding as primary
    
    staff = new Staff({
      name: fullName, // Store full name in name field for backward compatibility
      surname: surname.trim(),
      idNumber: idNumber.trim(),
      phoneNumber: phoneNumber.trim(),
      role: role,
      faceEmbedding: embedding1, // Primary embedding (for backward compatibility)
      faceEmbeddings: [embedding1, embedding2], // Both embeddings for accuracy
      encryptedEmbedding
    });
    
    await staff.save();
    console.log(`✅ Staff registered: ${fullName} - ID: ${idNumber.trim()}, Role: ${role}`);
    console.log(`   Face quality: ${(avgQuality * 100).toFixed(1)}% (Image 1: ${(quality1 * 100).toFixed(1)}%, Image 2: ${(quality2 * 100).toFixed(1)}%)`);
    console.log(`   Total embeddings: 2`);
    
    // Invalidate cache so next request gets fresh data
    staffCache.invalidate();
    
    res.json({
      success: true,
      staff: {
        id: staff._id,
        name: staff.name,
        surname: staff.surname,
        idNumber: staff.idNumber,
        role: staff.role,
        createdAt: staff.createdAt
      },
      quality: {
        image1: (quality1 * 100).toFixed(1),
        image2: (quality2 * 100).toFixed(1),
        average: (avgQuality * 100).toFixed(1)
      }
    });
  } catch (error) {
    console.error('Error registering staff:', error);
    console.error('Error stack:', error?.stack);
    
    // Handle duplicate ID number error
    if (error.code === 11000 && error.keyPattern?.idNumber) {
      return res.status(400).json({ error: `Staff with ID number ${req.body.idNumber} is already registered` });
    }
    
    const errorMessage = error?.message || String(error) || 'Failed to register staff';
    res.status(500).json({ error: errorMessage });
  }
});

// Clock in/out
router.post('/clock', upload.single('image'), async (req, res) => {
  const requestStartTime = Date.now();
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

    // Generate embedding from captured image (now returns object with embedding, quality, etc.)
    let embeddingResult;
    try {
      embeddingResult = await generateEmbedding(req.file.buffer);
      
      // Validate embedding result
      if (!embeddingResult) {
        throw new Error('Failed to generate face embedding - no result returned');
      }
      
      // Ensure embedding exists
      const embedding = embeddingResult.embedding || embeddingResult;
      if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Invalid embedding generated - embedding is not a valid array');
      }
      
      console.log(`✅ Embedding generated - Quality: ${embeddingResult.quality ? (embeddingResult.quality * 100).toFixed(1) + '%' : 'N/A'}, Length: ${embedding.length}`);
    } catch (embeddingError) {
      const errorMsg = embeddingError?.message || String(embeddingError) || 'Failed to generate face embedding';
      console.error('❌ Error generating embedding:', errorMsg);
      return res.status(500).json({ 
        success: false,
        error: errorMsg 
      });
    }
    
    // Get all active staff members from cache (FAST PATH - no DB query!)
    const staffWithEmbeddings = await staffCache.getStaff();
    
    if (!staffWithEmbeddings || staffWithEmbeddings.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'No staff members registered. Please register staff first.' 
      });
    }
    
    // Find matching staff (pass the full embedding result object)
    console.log(`🔍 Starting face matching process...`);
    console.log(`   - Clock-in embedding quality: ${embeddingResult.quality ? (embeddingResult.quality * 100).toFixed(1) + '%' : 'N/A'}`);
    console.log(`   - Clock-in embedding length: ${embeddingResult.embedding ? embeddingResult.embedding.length : 'N/A'}`);
    console.log(`   - Staff members to compare: ${staffWithEmbeddings.length}`);
    
    const match = await findMatchingStaff(embeddingResult, staffWithEmbeddings);
    
    if (!match) {
      console.error('❌ Face not recognized - no matching staff found');
      console.error(`📊 Final debug info:`);
      console.error(`   - Staff members in database: ${staffWithEmbeddings.length}`);
      console.error(`   - Embedding quality: ${embeddingResult.quality ? (embeddingResult.quality * 100).toFixed(1) + '%' : 'N/A'}`);
      console.error(`   - Embedding type: ${Array.isArray(embeddingResult.embedding) ? 'Array' : typeof embeddingResult.embedding}`);
      console.error(`   - Embedding length: ${embeddingResult.embedding ? embeddingResult.embedding.length : 'N/A'}`);
      console.error(`   - Detection score: ${embeddingResult.detectionScore ? (embeddingResult.detectionScore * 100).toFixed(1) + '%' : 'N/A'}`);
      
      // Check if using fallback embeddings (models not loaded)
      if (embeddingResult.quality && embeddingResult.quality < 0.3) {
        console.error('⚠️ WARNING: Using fallback embeddings - models may not be loaded!');
        return res.status(500).json({ 
          success: false,
          error: 'Face recognition models not properly loaded. Please contact administrator.' 
        });
      }
      
      // Provide helpful error message
      let errorMessage = 'Face not recognized. ';
      if (embeddingResult.quality && embeddingResult.quality < 0.5) {
        errorMessage += 'The face detection quality is low. Please ensure good lighting and face the camera directly. ';
      }
      errorMessage += 'Please ensure you are the same person who registered, with similar lighting and angle. Try registering again if this persists.';
      
      return res.status(404).json({ 
        success: false,
        error: errorMessage
      });
    }
    
    const { staff, similarity, confidenceLevel } = match;
    const confidence = Math.round(similarity * 100);
    
    const totalRequestTime = Date.now() - requestStartTime;
    console.log(`✅ Match found: ${staff.name} - Confidence: ${confidence}% (${confidenceLevel || 'Medium'})`);
    console.log(`⚡⚡⚡ TOTAL CLOCK-IN TIME: ${totalRequestTime}ms (Target: <2000ms for bank-level speed)`);
    
    // Format timestamp before saving (in case save fails, we still have the time)
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
    
    // Prepare response data
    const responseData = {
      success: true,
      message: `${staff.name} — ${clockTypeText} at ${timeString}`,
      staffName: staff.name,
      clockType: type,
      timestamp: timestamp.toISOString(),
      confidence
    };
    
    // Send response immediately - don't wait for database save
    res.json(responseData);
    console.log(`📤 Response sent to client for ${staff.name}`);
    
    // Save clock log in background (non-blocking, fire-and-forget)
    // Don't await - let it run in background while response is sent
    (async () => {
      try {
        console.log(`💾 Saving clock log for ${staff.name}...`);
        const clockLog = new ClockLog({
          staffId: staff._id,
          staffName: staff.name,
          clockType: type,
          confidence,
          timestamp: timestamp
        });
        
        // Add timeout to prevent hanging (5 seconds max for database save)
        const savePromise = clockLog.save();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database save timeout after 5 seconds')), 5000)
        );
        
        await Promise.race([savePromise, timeoutPromise]);
        console.log(`✅ Clock log saved successfully for ${staff.name}`);
      } catch (saveError) {
        // Log error but don't fail the request - response already sent
        const errorMsg = saveError?.message || String(saveError) || 'Unknown error';
        console.error(`⚠️ Failed to save clock log (non-critical): ${errorMsg}`);
        console.error(`   Staff: ${staff.name}, Type: ${type}, Confidence: ${confidence}%`);
        if (saveError?.stack) {
          console.error(`   Stack: ${saveError.stack}`);
        }
      }
    })().catch(err => {
      // Extra safety catch for any unhandled errors in background save
      console.error(`⚠️ Unhandled error in background clock log save: ${err.message}`);
    });
  } catch (error) {
    console.error('❌ Error clocking in/out:', error);
    console.error('Error stack:', error?.stack);
    const errorMessage = error?.message || String(error) || 'Failed to process clock in/out';
    res.status(500).json({ error: errorMessage });
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

// Get cache statistics (for monitoring)
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = staffCache.getStats();
    res.json({ success: true, cache: stats });
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    res.status(500).json({ error: 'Failed to fetch cache stats' });
  }
});

// Manually refresh cache (admin endpoint)
router.post('/cache/refresh', async (req, res) => {
  try {
    staffCache.invalidate();
    await staffCache.getStaff();
    res.json({ success: true, message: 'Cache refreshed successfully' });
  } catch (error) {
    console.error('Error refreshing cache:', error);
    res.status(500).json({ error: 'Failed to refresh cache' });
  }
});

module.exports = router;

