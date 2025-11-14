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

    // Generate face embedding (now returns object with embedding, quality, etc.)
    const embeddingResult = await generateEmbedding(req.file.buffer);
    const embedding = embeddingResult.embedding || embeddingResult;
    
    // Check if staff already exists (update with additional embedding)
    let staff = await Staff.findOne({ name: name.trim(), isActive: true });
    
    if (staff) {
      // Staff exists - add this embedding to their collection
      if (!staff.faceEmbeddings) {
        staff.faceEmbeddings = [];
      }
      // If they only have old single embedding, migrate it
      if (staff.faceEmbedding && staff.faceEmbeddings.length === 0) {
        staff.faceEmbeddings.push(staff.faceEmbedding);
      }
      // Add new embedding (limit to 5 embeddings per person)
      if (staff.faceEmbeddings.length < 5) {
        staff.faceEmbeddings.push(embedding);
        console.log(`✅ Added embedding ${staff.faceEmbeddings.length} for ${name} - Face quality: ${embeddingResult.quality ? (embeddingResult.quality * 100).toFixed(1) + '%' : 'N/A'}`);
      } else {
        // Replace oldest embedding (simple FIFO)
        staff.faceEmbeddings.shift();
        staff.faceEmbeddings.push(embedding);
        console.log(`✅ Updated embeddings for ${name} (replaced oldest) - Face quality: ${embeddingResult.quality ? (embeddingResult.quality * 100).toFixed(1) + '%' : 'N/A'}`);
      }
      // Update single embedding (for backward compatibility)
      staff.faceEmbedding = embedding;
      // Encrypt embedding
      staff.encryptedEmbedding = Staff.encryptEmbedding(embedding);
      await staff.save();
      console.log(`✅ Staff updated: ${name} - Total embeddings: ${staff.faceEmbeddings.length}`);
    } else {
      // New staff - create with first embedding
      const encryptedEmbedding = Staff.encryptEmbedding(embedding);
      staff = new Staff({
        name,
        faceEmbedding: embedding, // Keep for backward compatibility
        faceEmbeddings: [embedding], // New multi-embedding format
        encryptedEmbedding
      });
      await staff.save();
      console.log(`✅ Staff registered: ${name} - Face quality: ${embeddingResult.quality ? (embeddingResult.quality * 100).toFixed(1) + '%' : 'N/A'}`);
    }
    
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
    console.error('Error stack:', error?.stack);
    const errorMessage = error?.message || String(error) || 'Failed to register staff';
    res.status(500).json({ error: errorMessage });
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
    
    // Get all active staff members
    const allStaff = await Staff.find({ isActive: true });
    
    if (allStaff.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'No staff members registered. Please register staff first.' 
      });
    }
    
    // Extract embeddings for comparison - support both old and new formats
    const staffWithEmbeddings = allStaff.map(staff => {
      try {
        const staffObj = staff.toObject();
        
        // Support new format: multiple embeddings per person
        let faceEmbeddings = [];
        
        if (staffObj.faceEmbeddings && Array.isArray(staffObj.faceEmbeddings) && staffObj.faceEmbeddings.length > 0) {
          // Use multiple embeddings (new format)
          faceEmbeddings = staffObj.faceEmbeddings;
          console.log(`   Using ${faceEmbeddings.length} embeddings for ${staffObj.name}`);
        } else {
          // Fall back to single embedding (old format)
          let decryptedEmbedding = staffObj.faceEmbedding;
          
          if (!decryptedEmbedding || !Array.isArray(decryptedEmbedding) || decryptedEmbedding.length === 0) {
            // Try to decrypt if faceEmbedding is not available
            if (staffObj.encryptedEmbedding) {
              decryptedEmbedding = Staff.decryptEmbedding(staffObj.encryptedEmbedding);
              console.log(`   Decrypted embedding for ${staffObj.name}: ${decryptedEmbedding ? decryptedEmbedding.length : 0} dimensions`);
            } else {
              console.error(`⚠️ No embedding available for ${staffObj.name}`);
              return null;
            }
          }
          
          if (decryptedEmbedding && Array.isArray(decryptedEmbedding) && decryptedEmbedding.length > 0) {
            faceEmbeddings = [decryptedEmbedding];
            console.log(`   Using single faceEmbedding for ${staffObj.name}: ${decryptedEmbedding.length} dimensions`);
          }
        }
        
        if (faceEmbeddings.length === 0) {
          console.error(`⚠️ No valid embeddings for ${staffObj.name}`);
          return null;
        }
        
        return {
          ...staffObj,
          faceEmbeddings: faceEmbeddings,
          decryptedEmbedding: faceEmbeddings[0], // Keep for backward compatibility
          faceEmbedding: faceEmbeddings[0] // Keep for backward compatibility
        };
      } catch (decryptError) {
        console.error(`⚠️ Error processing embeddings for ${staff.name}:`, decryptError?.message || decryptError);
        return null;
      }
    }).filter(staff => staff !== null && staff.faceEmbeddings && Array.isArray(staff.faceEmbeddings) && staff.faceEmbeddings.length > 0);
    
    if (staffWithEmbeddings.length === 0) {
      return res.status(500).json({ 
        success: false,
        error: 'No valid staff embeddings found. Please re-register staff members.' 
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
      
      // Check if using fallback embeddings (models not loaded)
      if (embeddingResult.quality && embeddingResult.quality < 0.3) {
        console.error('⚠️ WARNING: Using fallback embeddings - models may not be loaded!');
        return res.status(500).json({ 
          success: false,
          error: 'Face recognition models not properly loaded. Please contact administrator.' 
        });
      }
      
      return res.status(404).json({ 
        success: false,
        error: 'Face not recognized. Please ensure you are the same person who registered, with similar lighting and angle. Try registering again if this persists.' 
      });
    }
    
    const { staff, similarity, confidenceLevel } = match;
    const confidence = Math.round(similarity * 100);
    
    console.log(`✅ Match found: ${staff.name} - Confidence: ${confidence}% (${confidenceLevel || 'Medium'})`);
    
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

module.exports = router;

