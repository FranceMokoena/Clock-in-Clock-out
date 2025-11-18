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
    const { name, surname, idNumber, phoneNumber, role, location } = req.body;
    
    // Validate required fields
    if (!name || !surname || !idNumber || !phoneNumber || !role || !location) {
      return res.status(400).json({ error: 'Name, surname, ID number, phone number, role, and location are required' });
    }
    
    // Validate ID number format (13 digits)
    if (!/^\d{13}$/.test(idNumber.trim())) {
      return res.status(400).json({ error: 'ID Number must be exactly 13 digits' });
    }
    
    // Validate role
    if (!['Intern', 'Staff', 'Other'].includes(role)) {
      return res.status(400).json({ error: 'Role must be Intern, Staff, or Other' });
    }
    
    // Validate location
    const { getLocation } = require('../config/locations');
    const locationData = getLocation(location);
    if (!locationData) {
      return res.status(400).json({ error: 'Invalid location selected' });
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
    console.log(`   Role: ${role}, Phone: ${phoneNumber.trim()}, Location: ${locationData.name}`);
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
      location: location, // Store location key
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
    
    const { type, latitude, longitude } = req.body; // 'in', 'out', 'break_start', or 'break_end'
    
    if (!type || !['in', 'out', 'break_start', 'break_end'].includes(type)) {
      console.error('❌ Invalid clock type:', type);
      return res.status(400).json({ error: 'Clock type must be "in", "out", "break_start", or "break_end"' });
    }
    
    if (!req.file) {
      console.error('❌ No image file received');
      return res.status(400).json({ error: 'Image is required' });
    }
    
    // Validate location coordinates
    if (!latitude || !longitude) {
      console.error('❌ Location coordinates missing');
      return res.status(400).json({ error: 'Location coordinates (latitude and longitude) are required' });
    }
    
    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);
    
    if (isNaN(userLat) || isNaN(userLon)) {
      console.error('❌ Invalid location coordinates:', latitude, longitude);
      return res.status(400).json({ error: 'Invalid location coordinates. Please ensure GPS is enabled.' });
    }
    
    console.log(`✅ Processing ${type} request for staff member`);
    console.log(`   User location: ${userLat}, ${userLon}`);

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
    
    // Validate location - user must be at their assigned location
    const { isLocationValid } = require('../config/locations');
    const locationValidation = isLocationValid(userLat, userLon, staff.location);
    
    if (!locationValidation.valid) {
      console.error(`❌ Location validation failed for ${staff.name}`);
      console.error(`   Assigned location: ${staff.location}`);
      console.error(`   User location: ${userLat}, ${userLon}`);
      console.error(`   Error: ${locationValidation.error}`);
      return res.status(403).json({
        success: false,
        error: locationValidation.error
      });
    }
    
    console.log(`✅ Location validated: ${staff.name} is at ${locationValidation.locationName} (${locationValidation.distance}m away)`);
    
    const totalRequestTime = Date.now() - requestStartTime;
    console.log(`✅ Match found: ${staff.name} - Confidence: ${confidence}% (${confidenceLevel || 'Medium'})`);
    console.log(`⚡⚡⚡ TOTAL CLOCK-IN TIME: ${totalRequestTime}ms (Target: <2000ms for bank-level speed)`);
    
    // Format timestamp before saving (in case save fails, we still have the time)
    const timestamp = new Date();
    
    // Format date and time separately for better display
    const dateString = timestamp.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const timeString = timestamp.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    });
    
    // Short date format for console logs
    const shortDateString = timestamp.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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
    
    console.log(`✅ Success: ${staff.name} ${clockTypeText} on ${shortDateString} at ${timeString}`);
    
    // Prepare response data with date and time
    const responseData = {
      success: true,
      message: `${staff.name} — ${clockTypeText}`,
      staffName: staff.name,
      clockType: type,
      timestamp: timestamp.toISOString(),
      date: dateString,
      time: timeString,
      dateTime: `${dateString} at ${timeString}`,
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
    
    // Format dates for better readability
    const formattedLogs = logs.map(log => {
      const timestamp = new Date(log.timestamp);
      return {
        ...log.toObject(),
        date: timestamp.toLocaleDateString('en-US', { 
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        time: timestamp.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit',
          hour12: true 
        }),
        dateTime: `${timestamp.toLocaleDateString('en-US', { 
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })} at ${timestamp.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit',
          hour12: true 
        })}`
      };
    });
    
    res.json({ success: true, logs: formattedLogs });
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

// ========== ADMIN DASHBOARD ROUTES ==========

// Get dashboard statistics (OPTIMIZED - parallel queries + fresh data)
router.get('/admin/stats', async (req, res) => {
  const statsStartTime = Date.now();
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // OPTIMIZATION: Run all queries in parallel for faster response
    const [
      totalStaff,
      clockInsToday,
      clockOutsToday,
      clockedInToday,
      clockedOutToday,
      lateArrivals
    ] = await Promise.all([
      // Total staff count
      Staff.countDocuments({ isActive: true }),
      
      // Clock-ins today count
      ClockLog.countDocuments({
        clockType: 'in',
        timestamp: { $gte: today, $lt: tomorrow }
      }),
      
      // Clock-outs today count
      ClockLog.countDocuments({
        clockType: 'out',
        timestamp: { $gte: today, $lt: tomorrow }
      }),
      
      // Currently clocked in (select only staffId for faster query)
      ClockLog.find({
        clockType: 'in',
        timestamp: { $gte: today, $lt: tomorrow }
      }).select('staffId staffName').lean(),
      
      // Clocked out today
      ClockLog.find({
        clockType: 'out',
        timestamp: { $gte: today, $lt: tomorrow }
      }).select('staffId').lean(),
      
      // Late arrivals (after 8:00 AM)
      ClockLog.find({
        clockType: 'in',
        timestamp: { 
          $gte: new Date(today.setHours(8, 0, 0, 0)), 
          $lt: tomorrow 
        }
      }).select('staffId staffName timestamp').lean()
    ]);

    // Calculate currently in (using staffName from logs to avoid populate)
    const clockedInIds = new Set(clockedInToday.map(log => log.staffId?.toString()).filter(Boolean));
    const clockedOutIds = new Set(clockedOutToday.map(log => log.staffId?.toString()).filter(Boolean));
    const currentlyIn = clockedInIds.size - clockedOutIds.size;

    // Format late arrivals (use staffName from log, fallback to lookup if needed)
    const lateArrivalsList = lateArrivals
      .filter(log => log.staffId && log.staffName) // Filter out null references
      .map(log => ({
        staffId: log.staffId,
        staffName: log.staffName || 'Unknown',
        timestamp: log.timestamp,
        time: new Date(log.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      }));

    const statsTime = Date.now() - statsStartTime;
    console.log(`⚡ Admin stats fetched in ${statsTime}ms`);

    res.json({
      success: true,
      stats: {
        totalStaff,
        clockInsToday,
        clockOutsToday,
        currentlyIn: Math.max(0, currentlyIn),
        lateArrivals: lateArrivalsList.length,
        lateArrivalsList
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get all staff with their monthly timesheet (OPTIMIZED - single query instead of N+1)
router.get('/admin/staff', async (req, res) => {
  const staffStartTime = Date.now();
  try {
    const { month, year } = req.query;
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    // OPTIMIZATION: Fetch staff and logs in parallel, then group in memory
    const [staff, allLogs] = await Promise.all([
      Staff.find({ isActive: true })
        .select('name surname idNumber phoneNumber role location createdAt')
        .sort({ name: 1 })
        .lean(), // Use lean() for faster queries (returns plain objects)
      
      ClockLog.find({
        timestamp: { $gte: startDate, $lte: endDate }
      })
        .select('staffId clockType timestamp')
        .sort({ timestamp: 1 })
        .lean()
    ]);

    // Group logs by staffId in memory (much faster than N+1 queries)
    const logsByStaffId = {};
    allLogs.forEach(log => {
      const staffId = log.staffId?.toString();
      if (!staffId) return; // Skip logs with null staffId
      if (!logsByStaffId[staffId]) {
        logsByStaffId[staffId] = [];
      }
      logsByStaffId[staffId].push(log);
    });

    // Build timesheets for each staff member
    const staffWithTimesheets = staff.map(member => {
      const staffId = member._id.toString();
      const logs = logsByStaffId[staffId] || [];

        // Group logs by date
        const timesheetByDate = {};
        logs.forEach(log => {
          const dateKey = new Date(log.timestamp).toISOString().split('T')[0];
          if (!timesheetByDate[dateKey]) {
            timesheetByDate[dateKey] = {
              date: dateKey,
              timeIn: null,
              startLunch: null,
              endLunch: null,
              timeOut: null
            };
          }

          const timeStr = new Date(log.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });

          if (log.clockType === 'in') {
            timesheetByDate[dateKey].timeIn = timeStr;
          } else if (log.clockType === 'break_start') {
            timesheetByDate[dateKey].startLunch = timeStr;
          } else if (log.clockType === 'break_end') {
            timesheetByDate[dateKey].endLunch = timeStr;
          } else if (log.clockType === 'out') {
            timesheetByDate[dateKey].timeOut = timeStr;
          }
        });

        const timesheet = Object.values(timesheetByDate).sort((a, b) => 
          new Date(a.date) - new Date(b.date)
        );

      return {
        _id: member._id,
        name: member.name,
        surname: member.surname,
        idNumber: member.idNumber,
        phoneNumber: member.phoneNumber,
        role: member.role,
        location: member.location,
        createdAt: member.createdAt,
        timesheet
      };
    });

    const staffTime = Date.now() - staffStartTime;
    console.log(`⚡ Admin staff data fetched in ${staffTime}ms (${staff.length} staff, ${allLogs.length} logs)`);

    res.json({
      success: true,
      month: targetMonth,
      year: targetYear,
      staff: staffWithTimesheets
    });
  } catch (error) {
    console.error('Error fetching staff with timesheets:', error);
    res.status(500).json({ error: 'Failed to fetch staff data' });
  }
});

// Get not accountable (wrong time usage) for a specific date (OPTIMIZED)
router.get('/admin/not-accountable', async (req, res) => {
  const notAccountableStartTime = Date.now();
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Expected times (in 24-hour format for easier comparison)
    const EXPECTED_TIMES = {
      clockIn: { hour: 7, minute: 30 },      // 07:30 AM
      startBreak: { hour: 13, minute: 0 },  // 13:00 PM (1:00 PM)
      endBreak: { hour: 14, minute: 0 },   // 14:00 PM (2:00 PM)
      clockOut: { hour: 16, minute: 30 }    // 16:30 PM (4:30 PM)
    };

    // Tolerance window (in minutes) - allow 15 minutes before/after
    const TOLERANCE = 15;

    // OPTIMIZATION: Fetch logs and staff in parallel, use lean() for speed
    const [allLogs, allStaff] = await Promise.all([
      ClockLog.find({
        timestamp: { $gte: targetDate, $lt: nextDate }
      })
        .select('staffId staffName clockType timestamp')
        .sort({ timestamp: 1 })
        .lean(), // Use lean() - we don't need Mongoose documents
      
      Staff.find({ isActive: true })
        .select('_id name')
        .lean()
    ]);

    // Create staff map for quick lookup
    const staffMap = new Map(allStaff.map(s => [s._id.toString(), s.name]));

    // Group logs by staff member
    // Handle null staffId (orphaned references) - with lean(), staffId is just an ObjectId, not populated
    const staffLogs = {};
    allLogs.forEach(log => {
      // Check if staffId exists (with lean(), it's just an ObjectId, not an object)
      const staffId = log.staffId?.toString();
      if (!staffId) {
        console.warn(`⚠️ Skipping log with null/invalid staffId: ${log._id}`);
        return; // Skip logs with invalid staffId references
      }
      if (!staffLogs[staffId]) {
        staffLogs[staffId] = [];
      }
      staffLogs[staffId].push(log);
    });

    const notAccountable = [];

    // Check each staff member
    allStaff.forEach(staff => {
      const staffId = staff._id.toString();
      const logs = staffLogs[staffId] || [];
      
      // Check if clock-in exists and is at wrong time
      const clockInLog = logs.find(log => log.clockType === 'in');
      if (!clockInLog) {
        notAccountable.push({
          staffId: staff._id,
          staffName: staff.name,
          reason: 'No clock-in recorded',
          details: 'Staff member did not clock in'
        });
      } else {
        const clockInTime = new Date(clockInLog.timestamp);
        const expectedTime = new Date(targetDate);
        expectedTime.setHours(EXPECTED_TIMES.clockIn.hour, EXPECTED_TIMES.clockIn.minute, 0, 0);
        
        const diffMinutes = (clockInTime - expectedTime) / (1000 * 60);
        if (Math.abs(diffMinutes) > TOLERANCE) {
          const actualTime = clockInTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          notAccountable.push({
            staffId: staff._id,
            staffName: staff.name,
            reason: `Clock-in at wrong time: ${actualTime} (Expected: 07:30 AM)`,
            details: `Clocked in at ${actualTime} instead of 07:30 AM`,
            clockInTime: actualTime,
            clockInTimestamp: clockInLog.timestamp
          });
        }
      }

      // Check break start time
      const breakStartLog = logs.find(log => log.clockType === 'break_start');
      if (breakStartLog) {
        const breakStartTime = new Date(breakStartLog.timestamp);
        const expectedTime = new Date(targetDate);
        expectedTime.setHours(EXPECTED_TIMES.startBreak.hour, EXPECTED_TIMES.startBreak.minute, 0, 0);
        
        const diffMinutes = (breakStartTime - expectedTime) / (1000 * 60);
        if (Math.abs(diffMinutes) > TOLERANCE) {
          const actualTime = breakStartTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          notAccountable.push({
            staffId: staff._id,
            staffName: staff.name,
            reason: `Start break at wrong time: ${actualTime} (Expected: 01:00 PM)`,
            details: `Started break at ${actualTime} instead of 01:00 PM`,
            breakStartTime: actualTime,
            breakStartTimestamp: breakStartLog.timestamp
          });
        }
      }

      // Check break end time
      const breakEndLog = logs.find(log => log.clockType === 'break_end');
      if (breakEndLog) {
        const breakEndTime = new Date(breakEndLog.timestamp);
        const expectedTime = new Date(targetDate);
        expectedTime.setHours(EXPECTED_TIMES.endBreak.hour, EXPECTED_TIMES.endBreak.minute, 0, 0);
        
        const diffMinutes = (breakEndTime - expectedTime) / (1000 * 60);
        if (Math.abs(diffMinutes) > TOLERANCE) {
          const actualTime = breakEndTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          notAccountable.push({
            staffId: staff._id,
            staffName: staff.name,
            reason: `End break at wrong time: ${actualTime} (Expected: 02:00 PM)`,
            details: `Ended break at ${actualTime} instead of 02:00 PM`,
            breakEndTime: actualTime,
            breakEndTimestamp: breakEndLog.timestamp
          });
        }
      }

      // Check clock-out time
      const clockOutLog = logs.find(log => log.clockType === 'out');
      if (clockOutLog) {
        const clockOutTime = new Date(clockOutLog.timestamp);
        const expectedTime = new Date(targetDate);
        expectedTime.setHours(EXPECTED_TIMES.clockOut.hour, EXPECTED_TIMES.clockOut.minute, 0, 0);
        
        const diffMinutes = (clockOutTime - expectedTime) / (1000 * 60);
        if (Math.abs(diffMinutes) > TOLERANCE) {
          const actualTime = clockOutTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          notAccountable.push({
            staffId: staff._id,
            staffName: staff.name,
            reason: `Clock-out at wrong time: ${actualTime} (Expected: 04:30 PM)`,
            details: `Clocked out at ${actualTime} instead of 04:30 PM`,
            clockOutTime: actualTime,
            clockOutTimestamp: clockOutLog.timestamp
          });
        }
      }
    });

    const notAccountableTime = Date.now() - notAccountableStartTime;
    console.log(`⚡ Not accountable data fetched in ${notAccountableTime}ms (${notAccountable.length} issues found)`);

    res.json({
      success: true,
      date: targetDate.toISOString().split('T')[0],
      notAccountable
    });
  } catch (error) {
    console.error('Error fetching not accountable:', error);
    res.status(500).json({ error: 'Failed to fetch not accountable list' });
  }
});

// Get detailed day data for a specific staff member and date
router.get('/admin/staff/:staffId/day-details', async (req, res) => {
  try {
    const { staffId } = req.params;
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const logs = await ClockLog.find({
      staffId: staff._id,
      timestamp: { $gte: targetDate, $lt: nextDate }
    }).sort({ timestamp: 1 });

    const dayDetails = {
      staff: {
        _id: staff._id,
        name: staff.name,
        surname: staff.surname,
        idNumber: staff.idNumber,
        role: staff.role,
        location: staff.location
      },
      date: targetDate.toISOString().split('T')[0],
      logs: logs.map(log => ({
        clockType: log.clockType,
        timestamp: log.timestamp,
        time: new Date(log.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }),
        dateTime: new Date(log.timestamp).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }),
        confidence: log.confidence
      })),
      summary: {
        clockIn: logs.find(log => log.clockType === 'in') || null,
        startBreak: logs.find(log => log.clockType === 'break_start') || null,
        endBreak: logs.find(log => log.clockType === 'break_end') || null,
        clockOut: logs.find(log => log.clockType === 'out') || null
      }
    };

    res.json({
      success: true,
      ...dayDetails
    });
  } catch (error) {
    console.error('Error fetching day details:', error);
    res.status(500).json({ error: 'Failed to fetch day details' });
  }
});

// Get single staff member timesheet for PDF export
router.get('/admin/staff/:staffId/timesheet', async (req, res) => {
  try {
    const { staffId } = req.params;
    const { month, year } = req.query;
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const logs = await ClockLog.find({
      staffId: staff._id,
      timestamp: { $gte: startDate, $lte: endDate }
    }).sort({ timestamp: 1 });

    // Group logs by date
    const timesheetByDate = {};
    logs.forEach(log => {
      const dateKey = new Date(log.timestamp).toISOString().split('T')[0];
      if (!timesheetByDate[dateKey]) {
        timesheetByDate[dateKey] = {
          date: dateKey,
          timeIn: null,
          startLunch: null,
          endLunch: null,
          timeOut: null
        };
      }

      const timeStr = new Date(log.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      if (log.clockType === 'in') {
        timesheetByDate[dateKey].timeIn = timeStr;
      } else if (log.clockType === 'break_start') {
        timesheetByDate[dateKey].startLunch = timeStr;
      } else if (log.clockType === 'break_end') {
        timesheetByDate[dateKey].endLunch = timeStr;
      } else if (log.clockType === 'out') {
        timesheetByDate[dateKey].timeOut = timeStr;
      }
    });

    const timesheet = Object.values(timesheetByDate).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    res.json({
      success: true,
      staff: {
        _id: staff._id,
        name: staff.name,
        surname: staff.surname,
        idNumber: staff.idNumber,
        phoneNumber: staff.phoneNumber,
        role: staff.role,
        location: staff.location
      },
      month: targetMonth,
      year: targetYear,
      timesheet
    });
  } catch (error) {
    console.error('Error fetching staff timesheet:', error);
    res.status(500).json({ error: 'Failed to fetch timesheet' });
  }
});

module.exports = router;

