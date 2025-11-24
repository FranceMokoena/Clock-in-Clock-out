const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const ClockLog = require('../models/ClockLog');
const Department = require('../models/Department');
const HostCompany = require('../models/HostCompany');
const staffCache = require('../utils/staffCache');

// ONNX Runtime is MANDATORY - face-api.js has been removed
// Using SCRFD (face detection) + ArcFace (face recognition) for maximum accuracy
let faceRecognition;

try {
  faceRecognition = require('../utils/faceRecognitionONNX');
} catch (onnxError) {
  console.error('❌ Failed to load ONNX face recognition:', onnxError.message);
  console.error('💡 Ensure ONNX models are downloaded: npm run download-models');
  throw onnxError;
}

const { generateEmbedding, generateIDEmbedding, findMatchingStaff, validatePreview } = faceRecognition;

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Add error handling for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('❌ ========== MULTER ERROR ==========');
    console.error('❌ Multer error:', err.code, err.message);
    console.error('❌ Field:', err.field);
    console.error('❌ ===================================');
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  } else if (err) {
    console.error('❌ ========== UPLOAD ERROR ==========');
    console.error('❌ Upload error:', err.message);
    console.error('❌ Error stack:', err.stack);
    console.error('❌ ===================================');
    return res.status(500).json({ error: `Upload error: ${err.message}` });
  }
  next();
};

// Test route to verify router is working
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Staff routes are working!' });
});

// Register new staff member - ENTERPRISE: accepts 3-5 images for maximum accuracy
router.post('/register', upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 },
  { name: 'image5', maxCount: 1 },
  { name: 'idImage', maxCount: 1 } // 🏦 BANK-GRADE Phase 5: ID document image
]), (req, res, next) => {
  // Log multer parsing results IMMEDIATELY
  process.stdout.write(`\n📦 [MULTER] Files parsed: ${req.files ? Object.keys(req.files).length : 0} field(s)\n`);
  if (req.files) {
    Object.keys(req.files).forEach(key => {
      process.stdout.write(`📦 [MULTER] Field "${key}": ${req.files[key].length} file(s)\n`);
      req.files[key].forEach((file, idx) => {
        process.stdout.write(`   📦 File ${idx + 1}: ${file.originalname || 'unnamed'}, ${file.size} bytes, ${file.mimetype || 'no type'}\n`);
      });
    });
  } else {
    process.stdout.write(`📦 [MULTER] req.files is null/undefined\n`);
  }
  process.stdout.write(`📦 [MULTER] req.body keys: ${Object.keys(req.body || {}).join(', ')}\n`);
  next();
}, handleMulterError, async (req, res) => {
  // Log IMMEDIATELY when route handler is called
  console.log('🚀 ========== REGISTRATION ROUTE HANDLER CALLED ==========');
  console.log('🚀 This log should appear IMMEDIATELY when request arrives');
  console.log('🚀 ======================================================');
  
  console.log('🚀 ========== REGISTRATION REQUEST RECEIVED ==========');
  console.log('   📥 Request method:', req.method);
  console.log('   📥 Request URL:', req.url);
  console.log('   📥 Request body keys:', Object.keys(req.body || {}));
  console.log('   📥 Request files:', req.files ? Object.keys(req.files) : 'none');
  console.log('   📥 Number of image files:', req.files ? Object.values(req.files).flat().length : 0);
  
  // Detailed file logging
  if (req.files) {
    console.log('   📦 Detailed files info:');
    Object.keys(req.files).forEach(key => {
      console.log(`      ${key}: ${req.files[key].length} file(s)`);
      req.files[key].forEach((file, idx) => {
        console.log(`         File ${idx + 1}: ${file.originalname || 'unnamed'}, ${file.size} bytes`);
      });
    });
  } else {
    console.log('   ❌ req.files is null or undefined - multer did not parse files!');
    console.log('   📋 Content-Type header:', req.headers['content-type']);
    console.log('   📋 Request body type:', typeof req.body);
    console.log('   📋 Request body:', JSON.stringify(Object.keys(req.body || {})));
  }
  
  try {
    const { name, surname, idNumber, phoneNumber, role, department, hostCompanyId, location, customAddress } = req.body;
    console.log('   📋 Extracted form data:', { name, surname, idNumber, role, department, hostCompanyId, location, customAddress });
    
    // Validate required fields
    if (!name || !surname || !idNumber || !phoneNumber || !role || !department) {
      return res.status(400).json({ error: 'Name, surname, ID number, phone number, role, and department are required' });
    }
    
    // Validate hostCompanyId if provided (should be valid ObjectId)
    let validatedHostCompanyId = null;
    if (hostCompanyId && hostCompanyId.trim()) {
      if (!mongoose.Types.ObjectId.isValid(hostCompanyId)) {
        return res.status(400).json({ error: 'Invalid host company ID format' });
      }
      // Verify host company exists
      const HostCompany = require('../models/HostCompany');
      const hostCompany = await HostCompany.findById(hostCompanyId);
      if (!hostCompany) {
        return res.status(400).json({ error: 'Host company not found' });
      }
      if (!hostCompany.isActive) {
        return res.status(400).json({ error: 'Host company is not active' });
      }
      validatedHostCompanyId = hostCompanyId;
    }
    
    // Validate location or custom address
    if (!location && !customAddress) {
      return res.status(400).json({ error: 'Either location or custom address is required' });
    }
    
    // Validate ID number format (13 digits)
    if (!/^\d{13}$/.test(idNumber.trim())) {
      return res.status(400).json({ error: 'ID Number must be exactly 13 digits' });
    }
    
    // Validate role
    if (!['Intern', 'Staff', 'Other'].includes(role)) {
      return res.status(400).json({ error: 'Role must be Intern, Staff, or Other' });
    }
    
    // 🌍 GEOCODING: Get location coordinates (from static dataset or geocode API)
    const { getLocation, searchLocations } = require('../config/locations');
    const { geocodeLocation, geocodeLocationWithRetry } = require('../utils/geocoding');
    
    let locationLatitude, locationLongitude, locationName, locationAddress;
    let isCustomAddress = false;
    
    if (customAddress && customAddress.trim().length > 0) {
      // Custom address provided - geocode it using API
      console.log(`🌍 Geocoding custom address: "${customAddress.trim()}"...`);
      isCustomAddress = true;
      try {
        const geocodeResult = await geocodeLocationWithRetry(customAddress.trim(), 'South Africa', 2);
        locationLatitude = geocodeResult.latitude;
        locationLongitude = geocodeResult.longitude;
        locationName = customAddress.trim();
        locationAddress = geocodeResult.address;
        console.log(`✅ Custom address geocoded: ${locationLatitude.toFixed(6)}, ${locationLongitude.toFixed(6)}`);
      } catch (geocodeError) {
        console.error(`❌ Failed to geocode custom address: "${customAddress.trim()}"`, geocodeError.message);
        return res.status(400).json({ 
          error: `Failed to geocode custom address: "${customAddress.trim()}". Please check the address and try again, or select a location from the dropdown.`,
          details: geocodeError.message
        });
      }
    } else if (location && location.trim().length > 0) {
      // Predefined location selected - get from static dataset
      const locationKey = location.trim();
      const locationData = getLocation(locationKey);
      
      if (!locationData) {
        console.error(`❌ Invalid location key: "${locationKey}"`);
        // Try to search for similar locations
        const searchResults = searchLocations(locationKey);
        if (searchResults.length > 0) {
          return res.status(400).json({ 
            error: `Location "${locationKey}" not found. Did you mean: ${searchResults.slice(0, 3).map(l => l.name).join(', ')}?`,
            suggestions: searchResults.slice(0, 5).map(l => ({ key: l.key, name: l.name }))
          });
        }
        return res.status(400).json({ 
          error: `Invalid location selected: "${locationKey}". Please select a location from the dropdown or enter a custom address.` 
        });
      }
      
      locationLatitude = locationData.latitude;
      locationLongitude = locationData.longitude;
      locationName = locationData.name;
      locationAddress = locationData.address || locationData.name;
      console.log(`✅ Location from dataset: ${locationName} (${locationLatitude.toFixed(6)}, ${locationLongitude.toFixed(6)})`);
    } else {
      return res.status(400).json({ error: 'Location or custom address is required' });
    }
    
    // Validate coordinates are valid
    if (typeof locationLatitude !== 'number' || typeof locationLongitude !== 'number' ||
        isNaN(locationLatitude) || isNaN(locationLongitude) ||
        locationLatitude < -90 || locationLatitude > 90 ||
        locationLongitude < -180 || locationLongitude > 180) {
      return res.status(400).json({ error: 'Invalid location coordinates. Please try again or contact support.' });
    }
    
    // ENTERPRISE: Require EXACTLY 5 images for maximum accuracy (100% matching goal)
    // 5 diverse images provide best ensemble matching accuracy
    const images = [
      req.files?.image1?.[0],
      req.files?.image2?.[0],
      req.files?.image3?.[0],
      req.files?.image4?.[0],
      req.files?.image5?.[0]
    ].filter(img => img !== undefined && img !== null); // Filter out undefined/null
    
    if (images.length !== 5) {
      return res.status(400).json({ 
        error: `Exactly 5 images are required for enterprise-grade registration accuracy (received: ${images.length}). Please capture 5 images with different angles and lighting conditions.` 
      });
    }
    
    console.log(`   📸 Processing ${images.length} images for registration (enterprise-grade accuracy)`);
    
    // ⚡ OPTIMIZED: Use lean() for faster query (returns plain JS object, not Mongoose document)
    const existingStaff = await Staff.findOne({ idNumber: idNumber.trim(), isActive: true }).lean();
    if (existingStaff) {
      return res.status(400).json({ error: `Staff with ID number ${idNumber.trim()} is already registered` });
    }
    
    console.log(`📸 Processing registration for ${name.trim()} ${surname.trim()} (ID: ${idNumber.trim()})`);
    console.log(`   Role: ${role}, Phone: ${phoneNumber.trim()}, Location: ${locationName}`);
    console.log(`   Location coordinates: ${locationLatitude.toFixed(6)}, ${locationLongitude.toFixed(6)}`);
    console.log(`   ⚡ ENTERPRISE: Processing ${images.length} face images SEQUENTIALLY (ONNX Runtime requires sequential inference)...`);
    
    // ⚡ ENTERPRISE: Process images SEQUENTIALLY to avoid ONNX Runtime concurrency issues
    // ONNX Runtime sessions are not thread-safe for concurrent inference
    // Multiple embeddings (3-5) dramatically improve recognition accuracy
    const registrationStartTime = Date.now();
      const embeddingResults = [];
      const embeddingQualities = []; // 🏦 BANK-GRADE: Store quality metadata per embedding
    
    // Validate images before processing
    console.log(`   📋 Validating ${images.length} images before processing...`);
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      console.log(`   📸 Image ${i + 1}: buffer size = ${img?.buffer?.length || 0} bytes, mimetype = ${img?.mimetype || 'unknown'}`);
      if (!img || !img.buffer || img.buffer.length === 0) {
        throw new Error(`Image ${i + 1} is invalid or empty`);
      }
    }
    console.log(`   ✅ All images validated`);
    
    try {
      // Process images sequentially to avoid ONNX Runtime concurrency issues
      const failedImageNumbers = [];
      const errorDetails = [];
      
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        console.log(`   ⚡ Processing image ${i + 1}/${images.length} (sequential)...`);
        console.log(`   📦 Image ${i + 1} buffer size: ${image.buffer.length} bytes`);
        try {
          console.log(`   🚀 Calling generateEmbedding for image ${i + 1}...`);
          process.stdout.write(`\n📸 [REGISTER] Processing image ${i + 1}/${images.length}\n`);
          const result = await generateEmbedding(image.buffer);
          process.stdout.write(`\n✅ [REGISTER] Image ${i + 1} processed successfully\n`);
          
          const embedding = result.embedding || result;
          const quality = result.quality || {};
          
          if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
            console.warn(`⚠️ Invalid embedding from image ${i + 1}, skipping...`);
            failedImageNumbers.push(i + 1);
            errorDetails.push({ image: i + 1, error: 'Invalid embedding generated' });
            continue;
          }
          
          // 🏦 BANK-GRADE: Store embedding with quality metadata
          embeddingResults.push(embedding);
          
          // Extract quality metadata (support both object and number formats)
          const qualityMetadata = typeof quality === 'object' ? quality : {
            score: quality || 0.75,
            sharpness: 0.75,
            blurVariance: 100,
            brightness: 0.5,
            detectionScore: quality || 0.75,
          };
          
          embeddingQualities.push({
            score: qualityMetadata.score || 0.75,
            sharpness: qualityMetadata.sharpness || 0.75,
            blurVariance: qualityMetadata.blurVariance || 100,
            brightness: qualityMetadata.brightness || 0.5,
            faceSize: qualityMetadata.faceSize || 0,
            faceWidth: qualityMetadata.faceWidth || 0,
            faceHeight: qualityMetadata.faceHeight || 0,
            pose: qualityMetadata.pose || { yaw: 0, pitch: 0, roll: 0 },
            detectionScore: qualityMetadata.detectionScore || qualityMetadata.score || 0.75,
            createdAt: new Date(),
          });
          
          const qualityScore = qualityMetadata.score || 0.75;
          console.log(`   ✅ Image ${i + 1} processed - Quality: ${(qualityScore * 100).toFixed(1)}%`);
        } catch (imageError) {
          // Track failed images
          failedImageNumbers.push(i + 1);
          const errorMsg = imageError?.message || String(imageError) || 'Unknown error';
          errorDetails.push({ image: i + 1, error: errorMsg });
          
          // IMMEDIATE error logging to stderr
          process.stderr.write(`\n❌ ========== ERROR PROCESSING IMAGE ${i + 1} ==========\n`);
          process.stderr.write(`❌ Error message: ${errorMsg}\n`);
          process.stderr.write(`❌ Error name: ${imageError.name}\n`);
          if (imageError.stack) {
            process.stderr.write(`❌ Error stack: ${imageError.stack}\n`);
          }
          if (imageError.cause) {
            process.stderr.write(`❌ Error cause: ${imageError.cause}\n`);
          }
          process.stderr.write(`❌ ===============================================\n`);
          
          // Also log to console.error
          console.error(`   ❌ ========== ERROR PROCESSING IMAGE ${i + 1} ==========`);
          console.error(`   ❌ Error message: ${errorMsg}`);
          console.error(`   ❌ Error name: ${imageError.name}`);
          console.error(`   ❌ Error stack: ${imageError.stack}`);
          if (imageError.cause) {
            console.error(`   ❌ Error cause: ${imageError.cause}`);
          }
          console.error(`   ❌ Full error object:`, JSON.stringify(imageError, Object.getOwnPropertyNames(imageError)));
          console.error(`   ❌ ===============================================`);
          // Continue with other images even if one fails
          continue;
        }
      }
      
      // 🏦 BANK-GRADE FIX: Validate quality data matches embedding count
      if (embeddingResults.length !== embeddingQualities.length) {
        console.error(`❌ Quality data mismatch: ${embeddingResults.length} embeddings but ${embeddingQualities.length} quality records`);
        return res.status(500).json({ 
          error: `Internal error: Quality data mismatch. Please try again.`
        });
      }
      
      // 🏦 BANK-GRADE FIX: Validate all quality records are complete
      const incompleteQualities = embeddingQualities.filter((q, idx) => {
        const hasScore = q && typeof q.score === 'number' && q.score > 0;
        const hasDetectionScore = q && typeof q.detectionScore === 'number' && q.detectionScore > 0;
        if (!hasScore || !hasDetectionScore) {
          console.warn(`⚠️ Quality record ${idx + 1} is incomplete:`, q);
          return true;
        }
        return false;
      });
      
      if (incompleteQualities.length > 0) {
        console.error(`❌ ${incompleteQualities.length} quality record(s) are incomplete`);
        return res.status(500).json({ 
          error: `Quality data incomplete for ${incompleteQualities.length} image(s). Please retry registration.`
        });
      }
      
      // 🏦 ENTERPRISE: Require minimum 3 embeddings for registration (allows for 1-2 failures)
      // 3-5 embeddings still provide excellent accuracy, and this is more user-friendly
      const MIN_REQUIRED_EMBEDDINGS = 3;
      if (embeddingResults.length < MIN_REQUIRED_EMBEDDINGS) {
        let errorMessage = `Failed to generate enough valid embeddings. Only ${embeddingResults.length} valid embedding(s) generated (minimum: ${MIN_REQUIRED_EMBEDDINGS}).`;
        
        if (failedImageNumbers.length > 0) {
          errorMessage += `\n\n❌ Failed images: ${failedImageNumbers.join(', ')}`;
          errorMessage += `\n\nPlease retry capturing image(s) ${failedImageNumbers.join(', ')}.`;
          
          // Add specific guidance based on error types
          const hasMultipleFaces = errorDetails.some(e => e.error.toLowerCase().includes('multiple'));
          const hasBlur = errorDetails.some(e => e.error.toLowerCase().includes('blur'));
          const hasBrightness = errorDetails.some(e => e.error.toLowerCase().includes('brightness'));
          const hasSize = errorDetails.some(e => e.error.toLowerCase().includes('too small') || e.error.toLowerCase().includes('too large'));
          const hasLiveness = errorDetails.some(e => e.error.toLowerCase().includes('liveness') || e.error.toLowerCase().includes('eye spacing'));
          
          if (hasMultipleFaces) {
            errorMessage += `\n\n⚠️ Multiple faces detected: Ensure only ONE person is in the frame for all images.`;
          }
          if (hasBlur) {
            errorMessage += `\n\n⚠️ Blur detected: Hold still and ensure camera is focused.`;
          }
          if (hasBrightness) {
            errorMessage += `\n\n⚠️ Brightness issue: Adjust lighting (not too dark or too bright).`;
          }
          if (hasSize) {
            errorMessage += `\n\n⚠️ Face size issue: Move closer or further from camera.`;
          }
          if (hasLiveness) {
            errorMessage += `\n\n⚠️ Liveness check failed: Ensure you are using a live camera (not a photo) and face the camera directly.`;
          }
        }
        
        errorMessage += `\n\nAt least ${MIN_REQUIRED_EMBEDDINGS} images must pass quality checks.`;
        
        return res.status(500).json({ 
          error: errorMessage
        });
      }
      
      // Log if not all 5 images passed (but registration can still proceed with 3-4)
      if (embeddingResults.length < 5) {
        console.warn(`⚠️ Registration proceeding with ${embeddingResults.length}/5 embeddings (minimum: ${MIN_REQUIRED_EMBEDDINGS}). This is still acceptable for enterprise-grade accuracy.`);
      }
      
      const sequentialProcessingTime = Date.now() - registrationStartTime;
      console.log(`   ⚡⚡⚡ Sequential processing completed in ${sequentialProcessingTime}ms - ${embeddingResults.length} embeddings generated`);
    } catch (error) {
      // IMMEDIATE error logging to stderr
      process.stderr.write(`\n❌ ========== ERROR PROCESSING IMAGES ==========\n`);
      process.stderr.write(`❌ Error message: ${error.message}\n`);
      process.stderr.write(`❌ Error name: ${error.name}\n`);
      if (error.stack) {
        process.stderr.write(`❌ Error stack: ${error.stack}\n`);
      }
      if (error.cause) {
        process.stderr.write(`❌ Error cause: ${error.cause}\n`);
      }
      process.stderr.write(`❌ ===============================================\n`);
      
      // Also log to console.error
      console.error('   ❌ ========== ERROR PROCESSING IMAGES ==========');
      console.error('   ❌ Error message:', error.message);
      console.error('   ❌ Error name:', error.name);
      console.error('   ❌ Error stack:', error.stack);
      console.error('   ❌ Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      if (error.cause) {
        console.error('   ❌ Error cause:', error.cause);
      }
      console.error('   ❌ ===============================================');
      return res.status(500).json({ error: `Failed to process images: ${error.message}` });
    }
    
    // 🏦 BANK-GRADE: Calculate average quality and compute centroid template
    const avgQuality = embeddingQualities.reduce((sum, q) => sum + (q.score || 0.75), 0) / embeddingQualities.length;
    const qualityDetails = embeddingQualities.map((q, i) => `Image ${i + 1}: ${((q.score || 0.75) * 100).toFixed(1)}%`).join(', ');
    console.log(`   📊 Average face quality: ${(avgQuality * 100).toFixed(1)}% (${qualityDetails})`);
    
    // 🏦 BANK-GRADE: Compute weighted centroid template from all embeddings
    const { computeCentroidTemplate } = require('../utils/faceRecognitionONNX');
    let centroidEmbedding;
    try {
      centroidEmbedding = computeCentroidTemplate(embeddingResults, embeddingQualities);
      console.log(`   🏦 Centroid template computed from ${embeddingResults.length} embeddings`);
    } catch (centroidError) {
      console.warn(`   ⚠️ Failed to compute centroid template: ${centroidError.message}`);
      // Fallback: use first embedding as centroid
      centroidEmbedding = embeddingResults[0];
      console.log(`   ⚠️ Using first embedding as centroid (fallback)`);
    }
    
    // 🏦 BANK-GRADE Phase 5: Process ID document image (REQUIRED for bank-grade accuracy)
    // ID document is the stable anchor template - required for core matching process
    const idImage = req.files?.idImage?.[0];
    if (!idImage || !idImage.buffer || idImage.buffer.length === 0) {
      return res.status(400).json({ 
        error: 'ID document image is REQUIRED for registration. Please capture a photo of your ID card, passport, or driver\'s license. The ID photo serves as the stable anchor template for accurate face matching.' 
      });
    }
    
    let idEmbedding = undefined;
    let idEmbeddingQuality = undefined;
    
    try {
      console.log(`   🆔 Processing ID document image (${idImage.buffer.length} bytes)...`);
      process.stdout.write(`\n📸 [REGISTER] Processing ID document image (REQUIRED)\n`);
      
      const idEmbeddingResult = await generateIDEmbedding(idImage.buffer);
      
      if (idEmbeddingResult && idEmbeddingResult.embedding) {
        idEmbedding = idEmbeddingResult.embedding;
        idEmbeddingQuality = idEmbeddingResult.quality || {
          score: 0.75,
          sharpness: 0.75,
          blurVariance: 100,
          brightness: 0.5,
          detectionScore: 0.75,
          createdAt: new Date()
        };
        
        const qualityScore = idEmbeddingQuality.score || 0.75;
        process.stdout.write(`\n✅ [REGISTER] ID document image processed successfully\n`);
        console.log(`   ✅ ID embedding generated with quality: ${(qualityScore * 100).toFixed(1)}%`);
      } else {
        throw new Error('Invalid embedding result from ID document');
      }
    } catch (idError) {
      // ID processing is REQUIRED - registration fails if ID cannot be processed
      const errorMsg = idError?.message || String(idError) || 'Unknown error';
      console.error(`   ❌ Failed to process ID document image (REQUIRED): ${errorMsg}`);
      return res.status(400).json({ 
        error: `ID document processing failed: ${errorMsg}. Please ensure the ID photo is clear, well-lit, and shows your face clearly. The ID document is required for bank-grade accuracy.` 
      });
    }
    
    // 🏦 BANK-GRADE: Store all embeddings with quality metadata and centroid template
    const fullName = `${name.trim()} ${surname.trim()}`;
    const primaryEmbedding = embeddingResults[0]; // Use first embedding as primary (backward compatibility)
    const encryptedEmbedding = Staff.encryptEmbedding(primaryEmbedding);
    
    staff = new Staff({
      name: fullName, // Store full name in name field for backward compatibility
      surname: surname.trim(),
      idNumber: idNumber.trim(),
        phoneNumber: phoneNumber.trim(),
        role: role,
        department: department.trim(), // Department (required)
        hostCompanyId: validatedHostCompanyId, // Host company ID (optional)
        location: location || customAddress || locationName, // Store location key or custom address
        locationLatitude: locationLatitude, // Store geocoded coordinates
        locationLongitude: locationLongitude,
        locationAddress: isCustomAddress ? locationAddress : undefined, // Store full address if custom
      faceEmbedding: primaryEmbedding, // Primary embedding (for backward compatibility)
      faceEmbeddings: embeddingResults, // 🏦 BANK-GRADE: ALL embeddings (3-5) for centroid fusion
      embeddingQualities: embeddingQualities, // 🏦 BANK-GRADE: Quality metadata per embedding
      centroidEmbedding: centroidEmbedding, // 🏦 BANK-GRADE: Weighted centroid template (primary matching)
      idEmbedding: idEmbedding, // 🏦 BANK-GRADE Phase 5: ID document anchor embedding
      idEmbeddingQuality: idEmbeddingQuality, // Quality metrics for ID extraction
      encryptedEmbedding
    });
    
    // ⚡ OPTIMIZED: Save staff record
    const saveStartTime = Date.now();
    await staff.save();
    const saveTime = Date.now() - saveStartTime;
    
    const totalRegistrationTime = Date.now() - registrationStartTime;
    console.log(`✅ Staff registered: ${fullName} - ID: ${idNumber.trim()}, Role: ${role}`);
    console.log(`   Face quality: ${(avgQuality * 100).toFixed(1)}% (${qualityDetails})`);
    console.log(`   Total embeddings: ${embeddingResults.length} (ENTERPRISE-GRADE)`);
    console.log(`   ⚡⚡⚡ TOTAL REGISTRATION TIME: ${totalRegistrationTime}ms (DB save: ${saveTime}ms)`);
    
    // ⚡ OPTIMIZED: Invalidate cache asynchronously (don't wait for it)
    staffCache.invalidate(); // This triggers async refresh, doesn't block response
    
    // ⚡ OPTIMIZED: Include request ID for status verification
    const requestId = `${staff._id}_${Date.now()}`;
    
    // Build quality object for response
    const qualityResponse = {};
    embeddingQualities.forEach((q, i) => {
      qualityResponse[`image${i + 1}`] = ((q.score || 0.75) * 100).toFixed(1);
    });
    qualityResponse.average = (avgQuality * 100).toFixed(1);
    
    res.json({
      success: true,
      requestId, // For status verification
      staff: {
        id: staff._id,
        name: staff.name,
        surname: staff.surname,
        idNumber: staff.idNumber,
        role: staff.role,
        createdAt: staff.createdAt
      },
      quality: qualityResponse,
      embeddingsCount: embeddingResults.length
    });
  } catch (error) {
    console.error('❌ ========== REGISTRATION ERROR ==========');
    console.error('❌ Error registering staff:', error);
    console.error('❌ Error message:', error?.message);
    console.error('❌ Error name:', error?.name);
    console.error('❌ Error stack:', error?.stack);
    console.error('❌ Error code:', error?.code);
    console.error('❌ Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error('❌ =========================================');
    
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

    // 🏦 BANK-GRADE Phase 4: Generate device fingerprint for quality tracking
    const { generateDeviceFingerprint } = require('../utils/faceRecognitionONNX');
    const deviceFingerprint = generateDeviceFingerprint(req.headers);
    if (deviceFingerprint) {
      console.log(`🏦 Device fingerprint: ${deviceFingerprint.substring(0, 8)}...`);
    }
    
    // Generate embedding from captured image (now returns object with embedding, quality, etc.)
    // Pass device fingerprint for adaptive quality thresholds
    let embeddingResult;
    try {
      const embeddingStartTime = Date.now();
      process.stdout.write(`\n🕐 [CLOCK] Starting embedding generation...\n`);
      console.log(`⏱️ [PERF] Embedding generation started at ${new Date().toISOString()}`);
      
      embeddingResult = await generateEmbedding(req.file.buffer, deviceFingerprint);
      
      const embeddingTime = Date.now() - embeddingStartTime;
      process.stdout.write(`\n✅ [CLOCK] Embedding generation complete (${embeddingTime}ms)\n`);
      console.log(`⏱️ [PERF] Embedding generation took ${embeddingTime}ms (${(embeddingTime/1000).toFixed(1)}s)`);
      
      // Validate embedding result
      if (!embeddingResult) {
        throw new Error('Failed to generate face embedding - no result returned');
      }
      
      // Ensure embedding exists
      const embedding = embeddingResult.embedding || embeddingResult;
      if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Invalid embedding generated - embedding is not a valid array');
      }
      
      // Extract quality score (can be object or number)
      const qualityScore = typeof embeddingResult.quality === 'object' 
        ? (embeddingResult.quality?.score || embeddingResult.quality?.detectionScore || 0.75)
        : (embeddingResult.quality || 0.75);
      console.log(`✅ Embedding generated - Quality: ${(qualityScore * 100).toFixed(1)}%, Length: ${embedding.length}`);
    } catch (embeddingError) {
      const errorMsg = embeddingError?.message || String(embeddingError) || 'Failed to generate face embedding';
      // IMMEDIATE error logging to stderr
      process.stderr.write(`\n❌ [CLOCK] Error generating embedding: ${errorMsg}\n`);
      if (embeddingError.stack) {
        process.stderr.write(`❌ [CLOCK] Error stack: ${embeddingError.stack}\n`);
      }
      // Also log to console.error
      console.error('❌ Error generating embedding:', errorMsg);
      if (embeddingError.stack) {
        console.error('❌ Error stack:', embeddingError.stack);
      }
      
      // ENTERPRISE: Provide user-friendly error messages
      let userFriendlyError = errorMsg;
      if (errorMsg.includes('too small')) {
        userFriendlyError = 'Face too small. Please move closer to the camera (at least 150px face size required).';
      } else if (errorMsg.includes('too large')) {
        userFriendlyError = 'Face too large. Please move further from the camera.';
      } else if (errorMsg.includes('too blurry')) {
        userFriendlyError = 'Image is too blurry. Please ensure camera is focused and hold still.';
      } else if (errorMsg.includes('brightness')) {
        userFriendlyError = 'Image brightness out of range. Please adjust lighting (not too dark or too bright).';
      } else if (errorMsg.includes('Multiple faces')) {
        userFriendlyError = 'Multiple faces detected. Please ensure only ONE person is in the frame.';
      } else if (errorMsg.includes('No face detected')) {
        userFriendlyError = 'No face detected. Please ensure your face is visible, well-lit, and facing the camera directly.';
      } else if (errorMsg.includes('quality too low')) {
        userFriendlyError = 'Face detection quality too low. Please ensure good lighting and face the camera directly.';
      } else if (errorMsg.includes('landmarks')) {
        userFriendlyError = 'Facial features not properly detected. Please ensure your face is clearly visible and facing the camera directly.';
      }
      
      return res.status(500).json({ 
        success: false,
        error: userFriendlyError 
      });
    }
    
    // Get all active staff members from cache (FAST PATH - no DB query!)
    const cacheStartTime = Date.now();
    const staffWithEmbeddings = await staffCache.getStaff();
    const cacheTime = Date.now() - cacheStartTime;
    console.log(`⏱️ [PERF] Staff cache retrieval took ${cacheTime}ms`);
    
    if (!staffWithEmbeddings || staffWithEmbeddings.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'No staff members registered. Please register staff first.' 
      });
    }
    
    // Find matching staff (pass the full embedding result object)
    console.log(`🔍 Starting face matching process...`);
    // Extract quality score (can be object or number)
    const qualityScore = typeof embeddingResult.quality === 'object' 
      ? (embeddingResult.quality?.score || embeddingResult.quality?.detectionScore || 0.75)
      : (embeddingResult.quality || 0.75);
    console.log(`   - Clock-in embedding quality: ${(qualityScore * 100).toFixed(1)}%`);
    console.log(`   - Clock-in embedding length: ${embeddingResult.embedding ? embeddingResult.embedding.length : 'N/A'}`);
    console.log(`   - Staff members to compare: ${staffWithEmbeddings.length}`);
    
    // Find matching staff member with multi-signal fusion
    const matchingStartTime = Date.now();
    console.log(`⏱️ [PERF] Starting face matching with ${staffWithEmbeddings.length} staff members...`);
    
    // 🏦 BANK-GRADE Phase 3: Pass device fingerprint and location to matching
    // Note: Location validation happens after matching, so we pass locationValid: true initially
    // Location will be validated separately and can affect final score
    const match = await findMatchingStaff(embeddingResult, staffWithEmbeddings, {
      deviceFingerprint,      // Device fingerprint for multi-signal fusion
      locationValid: true,    // Will be validated after matching
      useType: 'daily',
    });
    const matchingTime = Date.now() - matchingStartTime;
    console.log(`⏱️ [PERF] Face matching took ${matchingTime}ms (${(matchingTime/1000).toFixed(1)}s)`);
    
    if (!match) {
      console.error('❌ Face not recognized - no matching staff found');
      console.error(`📊 Final debug info:`);
      console.error(`   - Staff members in database: ${staffWithEmbeddings.length}`);
      // Extract quality score (can be object or number)
      const qualityScoreForError = typeof embeddingResult.quality === 'object' 
        ? (embeddingResult.quality?.score || embeddingResult.quality?.detectionScore || 0.75)
        : (embeddingResult.quality || 0.75);
      console.error(`   - Embedding quality: ${(qualityScoreForError * 100).toFixed(1)}%`);
      console.error(`   - Embedding type: ${Array.isArray(embeddingResult.embedding) ? 'Array' : typeof embeddingResult.embedding}`);
      console.error(`   - Embedding length: ${embeddingResult.embedding ? embeddingResult.embedding.length : 'N/A'}`);
      console.error(`   - Detection score: ${embeddingResult.detectionScore ? (embeddingResult.detectionScore * 100).toFixed(1) + '%' : 'N/A'}`);
      
      // Check if using fallback embeddings (models not loaded)
      if (qualityScoreForError < 0.3) {
        console.error('⚠️ WARNING: Using fallback embeddings - models may not be loaded!');
        return res.status(500).json({ 
          success: false,
          error: 'Face recognition models not properly loaded. Please contact administrator.' 
        });
      }
      
      // Provide helpful error message
      let errorMessage = 'Face not recognized. ';
      if (qualityScoreForError < 0.5) {
        errorMessage += 'The face detection quality is low. Please ensure good lighting and face the camera directly. ';
      }
      errorMessage += 'Please ensure you are the same person who registered, with similar lighting and angle. Try registering again if this persists.';
      
      return res.status(404).json({ 
        success: false,
        error: errorMessage
      });
    }
    
    const { staff, similarity, confidenceLevel, riskScore, signals } = match;
    const confidence = Math.round(similarity * 100);
    
    // 🏦 BANK-GRADE Phase 4: Log risk score if elevated
    if (riskScore && riskScore.score > 0.3) {
      console.warn(`⚠️ Elevated risk score: ${(riskScore.score * 100).toFixed(1)}% (${riskScore.level})`);
      if (riskScore.factors && riskScore.factors.length > 0) {
        console.warn(`   Risk factors: ${riskScore.factors.join(', ')}`);
      }
    }
    
    // ENTERPRISE: Time-based pattern validation
    const { validateTimePattern } = require('../utils/faceRecognitionONNX');
    const timeValidation = validateTimePattern(type, new Date());
    if (!timeValidation.valid && timeValidation.warning) {
      console.warn(`⚠️ Time pattern warning: ${timeValidation.warning}`);
      // Don't block, just warn - allow flexibility for different work schedules
    }
    
    // 🏦 BANK-GRADE Phase 3: Validate location - user MUST be at their assigned location
    // This validation happens AFTER face recognition to ensure only authenticated users can clock in
    // UPDATED: Uses stored coordinates from staff record (100% accurate)
    if (!staff.locationLatitude || !staff.locationLongitude) {
      console.error(`❌ Location validation failed for ${staff.name}: No coordinates stored`);
      console.error(`   Location field: ${staff.location || 'none'}`);
      console.error(`   Coordinates: ${staff.locationLatitude || 'missing'}, ${staff.locationLongitude || 'missing'}`);
      return res.status(403).json({
        success: false,
        error: 'No location coordinates stored for this staff member. Please contact administrator to update your location.'
      });
    }
    
    const { isLocationValid } = require('../config/locations');
    const staffLocationName = staff.location || 'Assigned location';
    const staffLocationAddress = staff.locationAddress || null;
    // 🏦 INTELLIGENT RADIUS: Pass null for radius to auto-detect town-level vs specific address
    // isLocationValid will automatically use 5km for towns/cities, 200m for specific addresses
    const locationValidation = isLocationValid(
      userLat, 
      userLon, 
      staff.locationLatitude, 
      staff.locationLongitude, 
      staffLocationName,
      null, // Auto-detect radius based on location type
      staffLocationAddress // Pass address to help determine if it's town-level
    );
    
    if (!locationValidation.valid) {
      console.error(`❌ Location validation FAILED for ${staff.name}`);
      console.error(`   Assigned location: ${staffLocationName}`);
      console.error(`   Location coordinates: ${staff.locationLatitude.toFixed(6)}, ${staff.locationLongitude.toFixed(6)}`);
      console.error(`   User's current coordinates: ${userLat.toFixed(6)}, ${userLon.toFixed(6)}`);
      console.error(`   Distance from assigned location: ${locationValidation.distance}m`);
      console.error(`   Required: Within ${locationValidation.requiredRadius}m`);
      console.error(`   Error: ${locationValidation.error}`);
      
      // Provide detailed error message with coordinates for debugging
      const errorMessage = locationValidation.error || 
        `You are ${locationValidation.distance}m away from your assigned location. You must be within ${locationValidation.requiredRadius}m to clock in/out.`;
      
      return res.status(403).json({
        success: false,
        error: errorMessage,
        details: {
          distance: locationValidation.distance,
          requiredRadius: locationValidation.requiredRadius,
          userCoordinates: { lat: userLat, lon: userLon },
          locationCoordinates: locationValidation.locationCoordinates
        }
      });
    }
    
    console.log(`✅ Location validated: ${staff.name} is at ${locationValidation.locationName} (${locationValidation.distance}m away)`);
    
    // 🏦 BANK-GRADE Phase 3: Update location signal if location validation passed
    // Location validation passed, so location signal is valid
    const locationValid = locationValidation.valid;
    
    // ⚡ OPTIMIZED: Calculate timing before DB save
    const preSaveTime = Date.now() - requestStartTime;
    console.log(`✅ Match found: ${staff.name} - Confidence: ${confidence}% (${confidenceLevel || 'Medium'})`);
    if (signals) {
      console.log(`🏦 Signals - Face: ${((signals.face || 0) * 100).toFixed(1)}%, Temporal: ${((signals.temporal || 0) * 100).toFixed(1)}%, Device: ${((signals.device || 0) * 100).toFixed(1)}%, Location: ${((signals.location || 0) * 100).toFixed(1)}%`);
    }
    console.log(`⚡ Pre-save time: ${preSaveTime}ms (face detection + matching)`);
    
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
    
    // ⚡ OPTIMIZED: Include request ID for status verification
    responseData.requestId = `${staff._id}_${type}_${timestamp.getTime()}`;
    
    // Send response immediately - don't wait for database save
    res.json(responseData);
    console.log(`📤 Response sent to client for ${staff.name} (Request ID: ${responseData.requestId})`);
    
    // Save clock log in background (non-blocking, fire-and-forget)
    // Don't await - let it run in background while response is sent
    (async () => {
      try {
        console.log(`💾 Saving clock log for ${staff.name}...`);
        // 🏦 BANK-GRADE Phase 3 & 4: Save device fingerprint and risk score
        const clockLog = new ClockLog({
          staffId: staff._id,
          staffName: staff.name,
          clockType: type,
          confidence,
          timestamp: timestamp,
          deviceFingerprint: deviceFingerprint, // 🏦 BANK-GRADE: Device fingerprint
          riskScore: riskScore || { score: 0, level: 'low', factors: [] }, // 🏦 BANK-GRADE: Risk score
          signals: signals || { // 🏦 BANK-GRADE: Signal values for audit
            face: match.baseSimilarity || similarity,
            temporal: (signals && signals.temporal) || 0,
            device: (signals && signals.device) || 0,
            location: locationValid ? 1 : 0,
          },
        });
        
        // ⚡ OPTIMIZED: Reduced timeout from 5s to 3s (faster failure detection)
        const saveStartTime = Date.now();
        const savePromise = clockLog.save();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database save timeout after 3 seconds')), 3000)
        );
        
        await Promise.race([savePromise, timeoutPromise]);
        const saveTime = Date.now() - saveStartTime;
        console.log(`✅ Clock log saved successfully for ${staff.name} (${saveTime}ms)`);
        
        // 🏦 BANK-GRADE Phase 4: Track device quality after successful clock-in
        if (deviceFingerprint && embeddingResult.qualityMetrics) {
          const { trackDeviceQuality } = require('../utils/faceRecognitionONNX');
          trackDeviceQuality(deviceFingerprint, embeddingResult.qualityMetrics).catch(err => {
            console.warn('⚠️ Failed to track device quality:', err.message);
            // Don't fail the clock-in if quality tracking fails
          });
        }
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

// ⚡ STATUS VERIFICATION: Check if registration succeeded (for timeout recovery)
router.get('/verify-registration', async (req, res) => {
  try {
    const { idNumber } = req.query;
    if (!idNumber) {
      return res.status(400).json({ error: 'ID number is required' });
    }
    
    const staff = await Staff.findOne({ idNumber: idNumber.trim(), isActive: true }).lean();
    if (staff) {
      res.json({ 
        success: true, 
        registered: true,
        staff: {
          id: staff._id,
          name: staff.name,
          idNumber: staff.idNumber,
          createdAt: staff.createdAt
        }
      });
    } else {
      res.json({ success: true, registered: false });
    }
  } catch (error) {
    console.error('Error verifying registration:', error);
    res.status(500).json({ error: 'Failed to verify registration' });
  }
});

// ⚡ STATUS VERIFICATION: Check if clock-in succeeded (for timeout recovery)
router.get('/verify-clock', async (req, res) => {
  try {
    const { staffId, type, timestamp } = req.query;
    if (!staffId || !type || !timestamp) {
      return res.status(400).json({ error: 'staffId, type, and timestamp are required' });
    }
    
    // Check for clock log within 5 minutes of the timestamp
    const checkTime = new Date(parseInt(timestamp));
    const startTime = new Date(checkTime.getTime() - 5 * 60 * 1000); // 5 minutes before
    const endTime = new Date(checkTime.getTime() + 5 * 60 * 1000); // 5 minutes after
    
    const log = await ClockLog.findOne({
      staffId: staffId,
      clockType: type,
      timestamp: { $gte: startTime, $lte: endTime }
    }).lean();
    
    if (log) {
      res.json({ 
        success: true, 
        clocked: true,
        log: {
          clockType: log.clockType,
          timestamp: log.timestamp,
          confidence: log.confidence
        }
      });
    } else {
      res.json({ success: true, clocked: false });
    }
  } catch (error) {
    console.error('Error verifying clock:', error);
    res.status(500).json({ error: 'Failed to verify clock' });
  }
});

// Get all staff members
router.get('/list', async (req, res) => {
  try {
    const { hostCompanyId } = req.query;
    const filter = { isActive: true };
    
    // Filter by host company if provided
    if (hostCompanyId) {
      filter.hostCompanyId = hostCompanyId;
    }
    
    const staff = await Staff.find(filter).select('name createdAt').sort({ createdAt: -1 });
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

// ========== AUTHENTICATION ROUTES ==========

// Login endpoint for admin and host companies
router.post('/login', async (req, res) => {
  console.log('🔐 ========== LOGIN REQUEST RECEIVED ==========');
  console.log('🔐 Path:', req.path);
  console.log('🔐 Method:', req.method);
  console.log('🔐 Body:', { username: req.body?.username, hasPassword: !!req.body?.password });
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      console.log('🔐 ❌ Missing username or password');
      return res.status(400).json({ 
        success: false,
        error: 'Username and password are required' 
      });
    }
    
    console.log('🔐 Validating credentials for:', username);
    
    // Check if it's admin login (hardcoded for now, can be moved to config/env)
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (username.toLowerCase() === ADMIN_USERNAME.toLowerCase() && password === ADMIN_PASSWORD) {
      console.log('🔐 ✅ Admin login successful');
      return res.json({
        success: true,
        user: {
          type: 'admin',
          username: ADMIN_USERNAME,
          name: 'System Administrator'
        }
      });
    }
    
    // Check if it's a host company login
    const hostCompany = await HostCompany.findOne({ 
      username: username.toLowerCase().trim(),
      isActive: true 
    });
    
    if (!hostCompany) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid username or password' 
      });
    }
    
    // Verify password
    const isPasswordValid = await hostCompany.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid username or password' 
      });
    }
    
    // Return host company info (without password)
    console.log('🔐 ✅ Host company login successful:', hostCompany.name);
    res.json({
      success: true,
      user: {
        type: 'hostCompany',
        id: hostCompany._id,
        username: hostCompany.username,
        name: hostCompany.name,
        companyName: hostCompany.companyName
      }
    });
  } catch (error) {
    console.error('🔐 ❌ Error during login:', error);
    res.status(500).json({ 
      success: false,
      error: 'Login failed. Please try again.' 
    });
  }
});

// ========== ADMIN DASHBOARD ROUTES ==========

// Get dashboard statistics (OPTIMIZED - parallel queries + fresh data)
router.get('/admin/stats', async (req, res) => {
  const statsStartTime = Date.now();
  try {
    const { hostCompanyId } = req.query;
    
    // Build staff filter based on hostCompanyId
    const staffFilter = { isActive: true };
    if (hostCompanyId) {
      staffFilter.hostCompanyId = hostCompanyId;
    }
    
    // Get staff IDs for filtering clock logs
    const staffMembers = await Staff.find(staffFilter).select('_id').lean();
    const staffIds = staffMembers.map(s => s._id);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Build clock log filter
    const clockLogFilter = {
      timestamp: { $gte: today, $lt: tomorrow }
    };
    if (hostCompanyId && staffIds.length > 0) {
      clockLogFilter.staffId = { $in: staffIds };
    } else if (hostCompanyId && staffIds.length === 0) {
      // No staff for this company - return empty stats
      return res.json({
        success: true,
        stats: {
          totalStaff: 0,
          clockInsToday: 0,
          currentlyIn: 0,
          lateArrivals: 0,
          lateArrivalsList: []
        }
      });
    }

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
      Staff.countDocuments(staffFilter),
      
      // Clock-ins today count
      ClockLog.countDocuments({
        clockType: 'in',
        ...clockLogFilter
      }),
      
      // Clock-outs today count
      ClockLog.countDocuments({
        clockType: 'out',
        ...clockLogFilter
      }),
      
      // Currently clocked in (select only staffId for faster query)
      ClockLog.find({
        clockType: 'in',
        ...clockLogFilter
      }).select('staffId staffName').lean(),
      
      // Clocked out today
      ClockLog.find({
        clockType: 'out',
        ...clockLogFilter
      }).select('staffId').lean(),
      
      // Late arrivals (after 8:00 AM)
      ClockLog.find({
        clockType: 'in',
        timestamp: { 
          $gte: new Date(today.setHours(8, 0, 0, 0)), 
          $lt: tomorrow 
        },
        ...(hostCompanyId && staffIds.length > 0 && { staffId: { $in: staffIds } })
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
    const { month, year, hostCompanyId } = req.query;
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    // Build staff filter
    const staffFilter = { isActive: true };
    if (hostCompanyId) {
      staffFilter.hostCompanyId = hostCompanyId;
    }

    // Check if full data is requested
    const { fullData, department } = req.query;
    
    // Add department filter if provided
    if (department) {
      staffFilter.department = department;
    }
    
    // OPTIMIZATION: Fetch staff and logs in parallel, then group in memory
    let staffQuery;
    
    if (fullData === 'true') {
      // For full data, we need to populate hostCompany, so don't use lean()
      staffQuery = Staff.find(staffFilter)
        .select('-faceEmbedding -faceEmbeddings -embeddingQualities -centroidEmbedding -idEmbedding -idEmbeddingQuality -facialFeatures -encryptedEmbedding') // Exclude sensitive embedding data
        .populate('hostCompanyId', 'name companyName registrationNumber businessType industry operatingHours emailAddress isActive')
        .sort({ name: 1 });
    } else {
      // For basic data, use lean() for performance
      staffQuery = Staff.find(staffFilter)
        .select('name surname idNumber phoneNumber role location createdAt')
        .sort({ name: 1 })
        .lean();
    }
    
    const [staff, allLogs] = await Promise.all([
      staffQuery.exec(),
      
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

      // Handle both populated (object) and non-populated (ID) hostCompanyId
      const hostCompany = member.hostCompanyId && typeof member.hostCompanyId === 'object' 
        ? member.hostCompanyId 
        : null;
      const hostCompanyIdValue = member.hostCompanyId 
        ? (typeof member.hostCompanyId === 'object' ? member.hostCompanyId._id : member.hostCompanyId)
        : null;

      return {
        _id: member._id,
        name: member.name,
        surname: member.surname,
        idNumber: member.idNumber,
        phoneNumber: member.phoneNumber,
        role: member.role,
        department: member.department, // Include department field
        location: member.location,
        hostCompanyId: hostCompanyIdValue, // Include hostCompanyId (as ID)
        hostCompany: hostCompany, // Populated hostCompany object (if populated)
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
    const { date, hostCompanyId } = req.query;
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

    // Build staff filter
    const staffFilter = { isActive: true };
    if (hostCompanyId) {
      staffFilter.hostCompanyId = hostCompanyId;
    }
    
    // Get staff IDs for filtering clock logs
    const staffMembers = await Staff.find(staffFilter).select('_id').lean();
    const staffIds = staffMembers.map(s => s._id);
    
    // Build clock log filter
    const clockLogFilter = {
      timestamp: { $gte: targetDate, $lt: nextDate }
    };
    if (hostCompanyId && staffIds.length > 0) {
      clockLogFilter.staffId = { $in: staffIds };
    } else if (hostCompanyId && staffIds.length === 0) {
      // No staff for this company - return empty
      return res.json({
        success: true,
        notAccountable: []
      });
    }

    // OPTIMIZATION: Fetch logs and staff in parallel, use lean() for speed
    const [allLogs, allStaff] = await Promise.all([
      ClockLog.find(clockLogFilter)
        .select('staffId staffName clockType timestamp')
        .sort({ timestamp: 1 })
        .lean(), // Use lean() - we don't need Mongoose documents
      
      Staff.find(staffFilter)
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
// 🎯 PREVIEW VALIDATION ENDPOINT: Lightweight validation for frontend preview frames
// ⚡ FAST: Only face detection, no embedding generation (200-500ms)
// ✅ SPECIFIC: Returns exact issues and feedback so users know what to fix
// 🎯 GOAL: Help users satisfy quality gates before full capture
router.post('/validate-preview', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No image provided',
        ready: false,
        feedback: 'Please capture an image'
      });
    }

    console.log('🔍 Preview validation request received');
    console.log(`   📦 Image size: ${req.file.size} bytes`);
    
    // Run lightweight validation (detection only, no embedding)
    const validationResult = await validatePreview(req.file.buffer);
    
    console.log(`   ✅ Preview validation complete:`, {
      ready: validationResult.ready,
      quality: validationResult.quality,
      issues: validationResult.issues,
      feedback: validationResult.feedback
    });
    
    // Return validation result
    res.json({
      success: true,
      ...validationResult
    });
    
  } catch (error) {
    console.error('❌ Preview validation error:', error.message);
    res.status(500).json({
      success: false,
      ready: false,
      quality: 0,
      issues: ['validation_error'],
      feedback: 'Unable to analyze image. Please try again.',
      error: error.message
    });
  }
});

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

// 📊 REPORT GENERATION: Get filtered clock logs for report generation
// Supports filtering by: date range, staff (individual/group), location, role
router.get('/admin/reports/data', async (req, res) => {
  console.log('📊 Report generation request received');
  console.log('   Query params:', req.query);
  try {
    const { 
      startDate, 
      endDate, 
      staffIds,  // Comma-separated staff IDs or 'all'
      location,   // Filter by location
      role,       // Filter by role
      period,     // 'daily', 'weekly', 'monthly' (for date range calculation)
      hostCompanyId  // Filter by host company (for host company users)
    } = req.query;

    // Build date range
    let dateStart, dateEnd;
    if (startDate && endDate) {
      dateStart = new Date(startDate);
      dateEnd = new Date(endDate);
      dateEnd.setHours(23, 59, 59, 999);
    } else if (period) {
      const now = new Date();
      switch (period) {
        case 'daily':
          dateStart = new Date(now);
          dateStart.setHours(0, 0, 0, 0);
          dateEnd = new Date(now);
          dateEnd.setHours(23, 59, 59, 999);
          break;
        case 'weekly':
          dateStart = new Date(now);
          dateStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
          dateStart.setHours(0, 0, 0, 0);
          dateEnd = new Date(dateStart);
          dateEnd.setDate(dateStart.getDate() + 6);
          dateEnd.setHours(23, 59, 59, 999);
          break;
        case 'monthly':
          dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
          dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          break;
        default:
          dateStart = new Date(now);
          dateStart.setHours(0, 0, 0, 0);
          dateEnd = new Date(now);
          dateEnd.setHours(23, 59, 59, 999);
      }
    } else {
      // Default to today
      dateStart = new Date();
      dateStart.setHours(0, 0, 0, 0);
      dateEnd = new Date();
      dateEnd.setHours(23, 59, 59, 999);
    }

    // Build staff filter
    let staffFilter = {};
    
    // CRITICAL: Host company users can ONLY see their own company's staff
    if (hostCompanyId) {
      staffFilter.hostCompanyId = hostCompanyId;
    }
    
    if (staffIds && staffIds !== 'all') {
      const ids = staffIds.split(',').map(id => id.trim());
      staffFilter._id = { $in: ids };
      // If hostCompanyId is set, ensure selected staff belong to that company
      if (hostCompanyId) {
        const validStaff = await Staff.find({ 
          _id: { $in: ids },
          hostCompanyId: hostCompanyId 
        }).select('_id').lean();
        const validIds = validStaff.map(s => s._id.toString());
        staffFilter._id = { $in: validIds };
      }
    }

    // Add location filter
    if (location && location !== 'all') {
      staffFilter.location = location;
    }

    // Add role filter
    if (role && role !== 'all') {
      staffFilter.role = role;
    }

    // Fetch staff matching filters
    const staff = await Staff.find({ ...staffFilter, isActive: true })
      .select('_id name surname idNumber phoneNumber role location')
      .lean();

    if (staff.length === 0) {
      return res.json({
        success: true,
        staff: [],
        logs: [],
        summary: {
          totalStaff: 0,
          totalLogs: 0,
          dateRange: {
            start: dateStart.toISOString(),
            end: dateEnd.toISOString()
          }
        }
      });
    }

    const staffIdsArray = staff.map(s => s._id);

    // Fetch clock logs for the date range and staff
    const logs = await ClockLog.find({
      staffId: { $in: staffIdsArray },
      timestamp: { $gte: dateStart, $lte: dateEnd }
    })
      .populate('staffId', 'name surname idNumber role location')
      .sort({ timestamp: 1 })
      .lean();

    // Group logs by staff and date for timesheet format
    const timesheetsByStaff = {};
    staff.forEach(s => {
      timesheetsByStaff[s._id.toString()] = {
        staff: s,
        timesheet: {}
      };
    });

    logs.forEach(log => {
      const staffId = log.staffId?._id?.toString() || log.staffId?.toString();
      if (!timesheetsByStaff[staffId]) return;

      const dateKey = new Date(log.timestamp).toISOString().split('T')[0];
      if (!timesheetsByStaff[staffId].timesheet[dateKey]) {
        timesheetsByStaff[staffId].timesheet[dateKey] = {
          date: dateKey,
          timeIn: null,
          startLunch: null,
          endLunch: null,
          timeOut: null,
          confidence: {}
        };
      }

      const timeStr = new Date(log.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      if (log.clockType === 'in') {
        timesheetsByStaff[staffId].timesheet[dateKey].timeIn = timeStr;
        timesheetsByStaff[staffId].timesheet[dateKey].confidence.timeIn = log.confidence;
      } else if (log.clockType === 'break_start') {
        timesheetsByStaff[staffId].timesheet[dateKey].startLunch = timeStr;
        timesheetsByStaff[staffId].timesheet[dateKey].confidence.startLunch = log.confidence;
      } else if (log.clockType === 'break_end') {
        timesheetsByStaff[staffId].timesheet[dateKey].endLunch = timeStr;
        timesheetsByStaff[staffId].timesheet[dateKey].confidence.endLunch = log.confidence;
      } else if (log.clockType === 'out') {
        timesheetsByStaff[staffId].timesheet[dateKey].timeOut = timeStr;
        timesheetsByStaff[staffId].timesheet[dateKey].confidence.timeOut = log.confidence;
      }
    });

    // Convert timesheet objects to arrays
    const reportData = Object.values(timesheetsByStaff).map(item => ({
      staff: item.staff,
      timesheet: Object.values(item.timesheet).sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      )
    }));

    // Calculate summary
    const summary = {
      totalStaff: staff.length,
      totalLogs: logs.length,
      dateRange: {
        start: dateStart.toISOString(),
        end: dateEnd.toISOString()
      },
      filters: {
        location: location || 'all',
        role: role || 'all',
        period: period || 'custom'
      }
    };

    res.json({
      success: true,
      data: reportData,
      summary
    });
  } catch (error) {
    console.error('Error fetching report data:', error);
    res.status(500).json({ error: 'Failed to fetch report data' });
  }
});

// ========== DEPARTMENT MANAGEMENT ROUTES (Admin Only) ==========

// Get all departments
router.get('/admin/departments', async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true })
      .sort({ name: 1 })
      .lean();
    
    res.json({
      success: true,
      departments
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Get all departments (including inactive) - for admin management
router.get('/admin/departments/all', async (req, res) => {
  try {
    const { hostCompanyId } = req.query;
    
    // Build filter - host company users can only see their own departments
    const filter = {};
    if (hostCompanyId) {
      filter.hostCompanyId = hostCompanyId;
    }
    
    const departments = await Department.find(filter)
      .sort({ name: 1 })
      .lean();
    
    res.json({
      success: true,
      departments
    });
  } catch (error) {
    console.error('Error fetching all departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Create new department
router.post('/admin/departments', async (req, res) => {
  try {
    const { name, departmentCode, companyName, description, location, customAddress, hostCompanyId } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Department name is required' });
    }
    
    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    
    // Validate location or custom address
    if (!location && !customAddress) {
      return res.status(400).json({ error: 'Location or custom address is required' });
    }
    
    // CRITICAL: If hostCompanyId is provided, validate it exists and is active
    let validatedHostCompanyId = null;
    if (hostCompanyId) {
      if (!mongoose.Types.ObjectId.isValid(hostCompanyId)) {
        return res.status(400).json({ error: 'Invalid host company ID format' });
      }
      const hostCompany = await HostCompany.findById(hostCompanyId);
      if (!hostCompany) {
        return res.status(400).json({ error: 'Host company not found' });
      }
      if (!hostCompany.isActive) {
        return res.status(400).json({ error: 'Host company is not active' });
      }
      validatedHostCompanyId = hostCompanyId;
    }
    
    // Check if department already exists (within the same company if hostCompanyId is set)
    const existingFilter = { 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    };
    if (validatedHostCompanyId) {
      existingFilter.hostCompanyId = validatedHostCompanyId;
    }
    const existing = await Department.findOne(existingFilter);
    
    if (existing) {
      return res.status(400).json({ error: 'Department with this name already exists' + (validatedHostCompanyId ? ' for this company' : '') });
    }
    
    // 🌍 GEOCODING: Get location coordinates (from static dataset or geocode API)
    const { getLocation, searchLocations } = require('../config/locations');
    const { geocodeLocationWithRetry } = require('../utils/geocoding');
    
    let locationLatitude, locationLongitude, locationName, locationAddress;
    let isCustomAddress = false;
    
    if (customAddress && customAddress.trim().length > 0) {
      // Custom address provided - geocode it using API
      console.log(`🌍 Geocoding department custom address: "${customAddress.trim()}"...`);
      isCustomAddress = true;
      try {
        const geocodeResult = await geocodeLocationWithRetry(customAddress.trim(), 'South Africa', 2);
        locationLatitude = geocodeResult.latitude;
        locationLongitude = geocodeResult.longitude;
        locationName = customAddress.trim();
        locationAddress = geocodeResult.address;
        console.log(`✅ Department custom address geocoded: ${locationLatitude.toFixed(6)}, ${locationLongitude.toFixed(6)}`);
      } catch (geocodeError) {
        console.error(`❌ Failed to geocode department custom address: "${customAddress.trim()}"`, geocodeError.message);
        return res.status(400).json({ 
          error: `Failed to geocode custom address: "${customAddress.trim()}". Please check the address and try again, or select a location from the dropdown.`,
          details: geocodeError.message
        });
      }
    } else if (location && location.trim().length > 0) {
      // Predefined location selected - get from static dataset
      const locationKey = location.trim();
      const locationData = getLocation(locationKey);
      
      if (!locationData) {
        console.error(`❌ Invalid location key: "${locationKey}"`);
        // Try to search for similar locations
        const searchResults = searchLocations(locationKey);
        if (searchResults.length > 0) {
          return res.status(400).json({ 
            error: `Location "${locationKey}" not found. Did you mean: ${searchResults.slice(0, 3).map(l => l.name).join(', ')}?`,
            suggestions: searchResults.slice(0, 5).map(l => ({ key: l.key, name: l.name }))
          });
        }
        return res.status(400).json({ 
          error: `Invalid location selected: "${locationKey}". Please select a location from the dropdown or enter a custom address.` 
        });
      }
      
      locationLatitude = locationData.latitude;
      locationLongitude = locationData.longitude;
      locationName = locationData.name;
      locationAddress = locationData.address || locationData.name;
      console.log(`✅ Department location from dataset: ${locationName} (${locationLatitude.toFixed(6)}, ${locationLongitude.toFixed(6)})`);
    } else {
      return res.status(400).json({ error: 'Location or custom address is required' });
    }
    
    // Validate coordinates are valid
    if (typeof locationLatitude !== 'number' || typeof locationLongitude !== 'number' ||
        isNaN(locationLatitude) || isNaN(locationLongitude) ||
        locationLatitude < -90 || locationLatitude > 90 ||
        locationLongitude < -180 || locationLongitude > 180) {
      return res.status(400).json({ error: 'Invalid location coordinates. Please try again or contact support.' });
    }
    
    const department = new Department({
      name: name.trim(),
      departmentCode: departmentCode ? departmentCode.trim() : undefined,
      companyName: companyName.trim(),
      description: description ? description.trim() : '',
      location: location || customAddress || locationName,
      locationLatitude: locationLatitude,
      locationLongitude: locationLongitude,
      locationAddress: isCustomAddress ? locationAddress : undefined,
      isActive: true,
      // CRITICAL: Set hostCompanyId if provided (for host company users)
      ...(validatedHostCompanyId && { hostCompanyId: validatedHostCompanyId })
    });
    
    await department.save();
    
    res.json({
      success: true,
      department,
      message: 'Department created successfully'
    });
  } catch (error) {
    console.error('Error creating department:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'Department with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create department' });
    }
  }
});

// Update department
router.put('/admin/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, departmentCode, companyName, description, location, customAddress, isActive, hostCompanyId } = req.body;
    
    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    // CRITICAL: Host company users can ONLY edit their own company's departments
    if (hostCompanyId) {
      if (!mongoose.Types.ObjectId.isValid(hostCompanyId)) {
        return res.status(400).json({ error: 'Invalid host company ID format' });
      }
      if (department.hostCompanyId && department.hostCompanyId.toString() !== hostCompanyId) {
        return res.status(403).json({ error: 'You can only edit departments belonging to your company' });
      }
      // If department doesn't have hostCompanyId yet, set it (for migration)
      if (!department.hostCompanyId) {
        const hostCompany = await HostCompany.findById(hostCompanyId);
        if (!hostCompany || !hostCompany.isActive) {
          return res.status(400).json({ error: 'Host company not found or inactive' });
        }
        department.hostCompanyId = hostCompanyId;
      }
    }
    
    if (name && name.trim()) {
      // Check if new name conflicts with existing department (within same company if hostCompanyId is set)
      const existingFilter = { 
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
      };
      if (hostCompanyId && department.hostCompanyId) {
        existingFilter.hostCompanyId = department.hostCompanyId;
      }
      const existing = await Department.findOne(existingFilter);
      
      if (existing) {
        return res.status(400).json({ error: 'Department with this name already exists' + (hostCompanyId ? ' for this company' : '') });
      }
      
      department.name = name.trim();
    }
    
    if (companyName && companyName.trim()) {
      department.companyName = companyName.trim();
    }
    
    if (departmentCode !== undefined) {
      department.departmentCode = departmentCode ? departmentCode.trim() : undefined;
    }
    
    if (description !== undefined) {
      department.description = description ? description.trim() : '';
    }
    
    // Handle location update
    if (location || customAddress) {
      const { getLocation, searchLocations } = require('../config/locations');
      const { geocodeLocationWithRetry } = require('../utils/geocoding');
      
      let locationLatitude, locationLongitude, locationName, locationAddress;
      let isCustomAddress = false;
      
      if (customAddress && customAddress.trim().length > 0) {
        // Custom address provided - geocode it
        isCustomAddress = true;
        try {
          const geocodeResult = await geocodeLocationWithRetry(customAddress.trim(), 'South Africa', 2);
          locationLatitude = geocodeResult.latitude;
          locationLongitude = geocodeResult.longitude;
          locationName = customAddress.trim();
          locationAddress = geocodeResult.address;
        } catch (geocodeError) {
          return res.status(400).json({ 
            error: `Failed to geocode custom address: "${customAddress.trim()}". Please check the address and try again.`,
            details: geocodeError.message
          });
        }
      } else if (location && location.trim().length > 0) {
        // Predefined location selected
        const locationKey = location.trim();
        const locationData = getLocation(locationKey);
        
        if (!locationData) {
          return res.status(400).json({ 
            error: `Invalid location selected: "${locationKey}". Please select a location from the dropdown or enter a custom address.` 
          });
        }
        
        locationLatitude = locationData.latitude;
        locationLongitude = locationData.longitude;
        locationName = locationData.name;
        locationAddress = locationData.address || locationData.name;
      }
      
      // Validate coordinates
      if (typeof locationLatitude === 'number' && typeof locationLongitude === 'number' &&
          !isNaN(locationLatitude) && !isNaN(locationLongitude) &&
          locationLatitude >= -90 && locationLatitude <= 90 &&
          locationLongitude >= -180 && locationLongitude <= 180) {
        department.location = location || customAddress || locationName;
        department.locationLatitude = locationLatitude;
        department.locationLongitude = locationLongitude;
        if (isCustomAddress) {
          department.locationAddress = locationAddress;
        }
      }
    }
    
    if (isActive !== undefined) {
      department.isActive = isActive;
    }
    
    department.updatedAt = Date.now();
    await department.save();
    
    res.json({
      success: true,
      department,
      message: 'Department updated successfully'
    });
  } catch (error) {
    console.error('Error updating department:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'Department with this name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update department' });
    }
  }
});

// Delete department (soft delete - set isActive to false)
router.delete('/admin/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { hostCompanyId } = req.query; // Get hostCompanyId from query params
    
    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    // CRITICAL: Host company users can ONLY delete their own company's departments
    if (hostCompanyId) {
      if (!mongoose.Types.ObjectId.isValid(hostCompanyId)) {
        return res.status(400).json({ error: 'Invalid host company ID format' });
      }
      if (department.hostCompanyId && department.hostCompanyId.toString() !== hostCompanyId) {
        return res.status(403).json({ error: 'You can only delete departments belonging to your company' });
      }
    }
    
    // Check if any staff members are using this department
    const staffCount = await Staff.countDocuments({ 
      department: department.name,
      isActive: true 
    });
    
    if (staffCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete department. ${staffCount} staff member(s) are assigned to this department. Please reassign them first.` 
      });
    }
    
    // Soft delete
    department.isActive = false;
    department.updatedAt = Date.now();
    await department.save();
    
    res.json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

// ========== HOST COMPANY MANAGEMENT ROUTES (Admin Only) ==========

// Get all host companies with statistics
router.get('/admin/host-companies', async (req, res) => {
  try {
    const { hostCompanyId } = req.query;
    
    // Build filter - host company users can only see their own company
    const filter = {};
    if (hostCompanyId) {
      filter._id = hostCompanyId;
    }
    
    const companies = await HostCompany.find(filter)
      .select('-password') // Exclude password from response
      .sort({ name: 1 })
      .lean();
    
    // Get statistics for each company
    const companiesWithStats = await Promise.all(
      companies.map(async (company) => {
        // Count departments
        const departmentCount = await Department.countDocuments({
          hostCompanyId: company._id,
          isActive: true
        });
        
        // Count interns (staff with role 'Intern' in departments belonging to this company)
        const departments = await Department.find({
          hostCompanyId: company._id,
          isActive: true
        }).select('_id').lean();
        
        const departmentIds = departments.map(d => d._id.toString());
        const internCount = await Staff.countDocuments({
          department: { $in: departmentIds },
          role: 'Intern',
          isActive: true
        });
        
        return {
          ...company,
          departmentCount,
          internCount
        };
      })
    );
    
    res.json({
      success: true,
      companies: companiesWithStats
    });
  } catch (error) {
    console.error('Error fetching host companies:', error);
    res.status(500).json({ error: 'Failed to fetch host companies' });
  }
});

// Get single host company
router.get('/admin/host-companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const company = await HostCompany.findById(id).select('-password').lean();
    
    if (!company) {
      return res.status(404).json({ error: 'Host company not found' });
    }
    
    // Get statistics
    const departmentCount = await Department.countDocuments({
      hostCompanyId: id,
      isActive: true
    });
    
    const departments = await Department.find({
      hostCompanyId: id,
      isActive: true
    }).select('_id').lean();
    
    const departmentIds = departments.map(d => d._id.toString());
    const internCount = await Staff.countDocuments({
      department: { $in: departmentIds },
      role: 'Intern',
      isActive: true
    });
    
    res.json({
      success: true,
      company: {
        ...company,
        departmentCount,
        internCount
      }
    });
  } catch (error) {
    console.error('Error fetching host company:', error);
    res.status(500).json({ error: 'Failed to fetch host company' });
  }
});

// Create new host company
router.post('/admin/host-companies', async (req, res) => {
  try {
    const {
      name,
      companyName,
      registrationNumber,
      operatingHours,
      emailAddress,
      businessType,
      industry,
      username,
      password
    } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    
    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password is required and must be at least 6 characters' });
    }
    
    // Check if company already exists
    const existing = await HostCompany.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Host company with this name already exists' });
    }
    
    // Check if username already exists
    const existingUsername = await HostCompany.findOne({
      username: username.trim().toLowerCase()
    });
    
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already exists. Please choose a different username.' });
    }
    
    // Validate and clean email address - only set if it's a valid email
    let cleanedEmailAddress = undefined;
    if (emailAddress && typeof emailAddress === 'string' && emailAddress.trim()) {
      const trimmedEmail = emailAddress.trim().toLowerCase();
      // Basic email validation
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        cleanedEmailAddress = trimmedEmail;
      } else {
        // If email is provided but invalid, return error
        return res.status(400).json({ error: 'Please enter a valid email address or leave it blank' });
      }
    }
    
    // Validate operating hours is not being sent as email
    if (operatingHours && typeof operatingHours === 'string' && operatingHours.trim()) {
      // Check if operating hours looks like an email (shouldn't happen, but safety check)
      if (operatingHours.includes('@')) {
        console.warn('⚠️ Operating hours contains @ symbol, might be mis-mapped');
      }
    }
    
    const company = new HostCompany({
      name: name.trim(),
      companyName: companyName.trim(),
      registrationNumber: registrationNumber && registrationNumber.trim() ? registrationNumber.trim() : undefined,
      operatingHours: operatingHours && operatingHours.trim() ? operatingHours.trim() : undefined,
      emailAddress: cleanedEmailAddress,
      businessType: businessType && businessType.trim() ? businessType : undefined,
      industry: industry && industry.trim() ? industry.trim() : undefined,
      username: username.trim().toLowerCase(),
      password: password, // Will be hashed by pre-save hook
      isActive: true
    });
    
    await company.save();
    
    // Don't send password in response
    const companyResponse = company.toObject();
    delete companyResponse.password;
    
    res.json({
      success: true,
      company: companyResponse,
      message: 'Host company created successfully'
    });
  } catch (error) {
    console.error('Error creating host company:', error);
    if (error.code === 11000) {
      if (error.keyPattern.username) {
        res.status(400).json({ error: 'Username already exists. Please choose a different username.' });
      } else {
        res.status(400).json({ error: 'Host company with this name already exists' });
      }
    } else {
      res.status(500).json({ error: 'Failed to create host company' });
    }
  }
});

// Update host company
router.put('/admin/host-companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      companyName,
      registrationNumber,
      operatingHours,
      emailAddress,
      businessType,
      industry,
      username,
      password,
      isActive
    } = req.body;
    
    const company = await HostCompany.findById(id);
    if (!company) {
      return res.status(404).json({ error: 'Host company not found' });
    }
    
    if (name && name.trim()) {
      // Check if new name conflicts with existing company
      const existing = await HostCompany.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
      });
      
      if (existing) {
        return res.status(400).json({ error: 'Host company with this name already exists' });
      }
      
      company.name = name.trim();
    }
    
    if (companyName && companyName.trim()) {
      company.companyName = companyName.trim();
    }
    
    if (registrationNumber !== undefined) {
      company.registrationNumber = registrationNumber ? registrationNumber.trim() : undefined;
    }
    
    if (operatingHours !== undefined) {
      company.operatingHours = operatingHours ? operatingHours.trim() : undefined;
    }
    
    if (emailAddress !== undefined) {
      company.emailAddress = emailAddress ? emailAddress.trim().toLowerCase() : undefined;
    }
    
    if (businessType !== undefined) {
      company.businessType = businessType || undefined;
    }
    
    if (industry !== undefined) {
      company.industry = industry ? industry.trim() : undefined;
    }
    
    if (username && username.trim()) {
      // Check if new username conflicts with existing company
      const existingUsername = await HostCompany.findOne({
        _id: { $ne: id },
        username: username.trim().toLowerCase()
      });
      
      if (existingUsername) {
        return res.status(400).json({ error: 'Username already exists. Please choose a different username.' });
      }
      
      company.username = username.trim().toLowerCase();
    }
    
    if (password && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      company.password = password; // Will be hashed by pre-save hook
    }
    
    if (isActive !== undefined) {
      company.isActive = isActive;
    }
    
    company.updatedAt = Date.now();
    await company.save();
    
    // Don't send password in response
    const companyResponse = company.toObject();
    delete companyResponse.password;
    
    res.json({
      success: true,
      company: companyResponse,
      message: 'Host company updated successfully'
    });
  } catch (error) {
    console.error('Error updating host company:', error);
    if (error.code === 11000) {
      if (error.keyPattern.username) {
        res.status(400).json({ error: 'Username already exists. Please choose a different username.' });
      } else {
        res.status(400).json({ error: 'Host company with this name already exists' });
      }
    } else {
      res.status(500).json({ error: 'Failed to update host company' });
    }
  }
});

// Delete host company (soft delete)
router.delete('/admin/host-companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const company = await HostCompany.findById(id);
    if (!company) {
      return res.status(404).json({ error: 'Host company not found' });
    }
    
    // Check if any departments are using this company
    const departmentCount = await Department.countDocuments({
      hostCompanyId: id,
      isActive: true
    });
    
    if (departmentCount > 0) {
      return res.status(400).json({
        error: `Cannot delete host company. ${departmentCount} department(s) are assigned to this company. Please reassign them first.`
      });
    }
    
    // Soft delete
    company.isActive = false;
    company.updatedAt = Date.now();
    await company.save();
    
    res.json({
      success: true,
      message: 'Host company deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting host company:', error);
    res.status(500).json({ error: 'Failed to delete host company' });
  }
});

// 🚨 ADMIN ROUTE: View staff centroids, qualities, and re-enroll flags
router.get('/admin/diagnostics', async (req, res) => {
  try {
    const staffList = await Staff.find({}).select('name idNumber embeddings embeddingQualities centroidEmbedding centroidQuality createdAt');
    
    const diagnostics = staffList.map(staff => {
      // Check both faceEmbeddings (new) and faceEmbedding (old single)
      const embeddingCount = staff.faceEmbeddings?.length || (staff.faceEmbedding ? 1 : 0);
      const qualities = staff.embeddingQualities || [];
      
      // Calculate quality statistics
      const qualityScores = qualities.map(q => q?.score || 0.5);
      const avgQuality = qualityScores.length > 0 
        ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length 
        : 0.5;
      const minQuality = qualityScores.length > 0 ? Math.min(...qualityScores) : 0.5;
      const maxQuality = qualityScores.length > 0 ? Math.max(...qualityScores) : 0.5;
      
      // Check if re-enrollment is recommended
      const needsReEnroll = 
        embeddingCount < 3 ||
        avgQuality < 0.70 ||
        staff.centroidQuality < 0.70 ||
        minQuality < 0.50;
      
      return {
        id: staff._id,
        name: staff.name,
        idNumber: staff.idNumber,
        embeddingCount,
        centroidQuality: staff.centroidQuality || avgQuality,
        qualityStats: {
          avg: avgQuality,
          min: minQuality,
          max: maxQuality
        },
        needsReEnroll,
        createdAt: staff.createdAt,
        lastUpdated: staff.updatedAt
      };
    });
    
    // Sort by needsReEnroll (problematic first)
    diagnostics.sort((a, b) => {
      if (a.needsReEnroll && !b.needsReEnroll) return -1;
      if (!a.needsReEnroll && b.needsReEnroll) return 1;
      return a.name.localeCompare(b.name);
    });
    
    res.json({
      success: true,
      totalStaff: diagnostics.length,
      needsReEnroll: diagnostics.filter(d => d.needsReEnroll).length,
      diagnostics
    });
  } catch (error) {
    console.error('Error fetching diagnostics:', error);
    res.status(500).json({ error: 'Failed to fetch diagnostics' });
  }
});

// 🚨 ADMIN ROUTE: Get detailed embedding analysis for a specific staff member
router.get('/admin/diagnostics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const staff = await Staff.findById(id).select('name idNumber embeddings embeddingQualities centroidEmbedding centroidQuality createdAt');
    
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }
    
    const embeddingCount = staff.embeddings?.length || 0;
    const qualities = staff.embeddingQualities || [];
    
    // Get embeddings (check both faceEmbeddings and faceEmbedding)
    const embeddings = staff.faceEmbeddings && staff.faceEmbeddings.length > 0 
      ? staff.faceEmbeddings 
      : (staff.faceEmbedding ? [staff.faceEmbedding] : []);
    const actualEmbeddingCount = embeddings.length;
    
    // Detailed quality analysis per embedding
    const embeddingDetails = [];
    for (let i = 0; i < actualEmbeddingCount; i++) {
      const embedding = embeddings[i];
      const quality = qualities[i] || {};
      
      embeddingDetails.push({
        index: i + 1,
        quality: quality.score || 0.5,
        sharpness: quality.sharpness || 0.5,
        brightness: quality.brightness || 0.5,
        faceSize: quality.faceSize || 0,
        detectionScore: quality.detectionScore || 0,
        embeddingNorm: embedding ? Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0)) : 0
      });
    }
    
    // Calculate statistics
    const qualityScores = qualities.map(q => q?.score || 0.5);
    const avgQuality = qualityScores.length > 0 
      ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length 
      : 0.5;
    
    const needsReEnroll = 
      embeddingCount < 3 ||
      avgQuality < 0.70 ||
      staff.centroidQuality < 0.70 ||
      qualityScores.some(q => q < 0.50);
    
    res.json({
      success: true,
      staff: {
        id: staff._id,
        name: staff.name,
        idNumber: staff.idNumber,
        embeddingCount,
        centroidQuality: staff.centroidQuality || avgQuality,
        needsReEnroll,
        createdAt: staff.createdAt
      },
      embeddingDetails,
      recommendations: needsReEnroll ? [
        'Re-enroll with 5 high-quality images',
        'Ensure different angles (front, left, right)',
        'Use good lighting and clear focus',
        'Remove glasses if possible',
        'Maintain neutral expression'
      ] : ['Embedding quality is acceptable']
    });
  } catch (error) {
    console.error('Error fetching staff diagnostics:', error);
    res.status(500).json({ error: 'Failed to fetch staff diagnostics' });
  }
});

module.exports = router;

