const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const sharp = require('sharp');
const Staff = require('../models/Staff');
const ClockLog = require('../models/ClockLog');
const Department = require('../models/Department');
const HostCompany = require('../models/HostCompany');
const staffCache = require('../utils/staffCache');
const rekognition = require('../utils/rekognitionClient');
const AttendanceCorrection = require('../models/AttendanceCorrection');
const LeaveApplication = require('../models/LeaveApplication');
const ReportSettings = require('../models/ReportSettings');
const { logAction } = require('../utils/actionLogger');
const autoReports = require('../modules/autoReports');
const { renderTemplate } = require('../modules/autoReports/reportTemplates');
const { sendPlainEmail } = require('../modules/autoReports/reportDelivery');

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

const {
  generateEmbedding,
  generateIDEmbedding,
  findMatchingStaff,
  validatePreview,
  computeCentroidTemplate,
  validateTimePattern,
  trackDeviceQuality,
  generateDeviceFingerprint,
  createTrustedDeviceEntry,
} = faceRecognition;

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// 💾 MEMORY OPTIMIZATION: Resize images before processing to reduce memory usage
async function resizeImage(buffer, maxSize = 1024) {
  try {
    const metadata = await sharp(buffer).metadata();
    // If image is already small enough, return as-is
    if (metadata.width <= maxSize && metadata.height <= maxSize) {
      return buffer;
    }

    // Resize to max dimension while maintaining aspect ratio
    const resized = await sharp(buffer)
      .resize(maxSize, maxSize, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 }) // Compress to JPEG
      .toBuffer();

    return resized;
  } catch (error) {
    console.warn('⚠️ Image resize failed, using original:', error.message);
    return buffer; // Fallback to original if resize fails
  }
}

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

const ADMIN_OWNER_ID = '000000000000000000000001';

const getRegistrationSettings = async (ownerType, ownerId) => {
  if (!ownerId || !mongoose.Types.ObjectId.isValid(ownerId)) return null;
  const settings = await ReportSettings.findOne({ ownerType, ownerId }).lean();
  if (settings) return settings;
  const defaults = new ReportSettings({ ownerType, ownerId });
  return defaults.toObject();
};

const resolveRegistrationOwnerSettings = async (hostCompanyId) => {
  if (hostCompanyId && mongoose.Types.ObjectId.isValid(hostCompanyId)) {
    const hostSettings = await getRegistrationSettings('HostCompany', hostCompanyId);
    if (hostSettings) return hostSettings;
  }
  return getRegistrationSettings('Admin', ADMIN_OWNER_ID);
};

const sendRegistrationEmail = async ({ to, template, data }) => {
  if (!to) return { sent: false, skipped: true, reason: 'No recipient email' };
  if (template && template.enabled === false) {
    return { sent: false, skipped: true, reason: 'Template disabled' };
  }
  const subject = renderTemplate(template?.subject || '', data);
  const body = renderTemplate(template?.body || '', data);
  return sendPlainEmail({ to, subject, text: body });
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
]), handleMulterError, async (req, res) => {
  // Log only if files are missing (error case)
  if (!req.files || Object.values(req.files).flat().length === 0) {
    console.warn('⚠️ Registration request received with no files');
  }

  try {
    const { name, surname, idNumber, phoneNumber, emailAddress, role, department, hostCompanyId, location, customAddress, clockInTime, clockOutTime, breakStartTime, breakEndTime, extraHoursStartTime, extraHoursEndTime, password } = req.body;
    const registrationFingerprintResult = generateDeviceFingerprint(req.headers, { includeMeta: true });
    const registrationDeviceFingerprint = typeof registrationFingerprintResult === 'string'
      ? registrationFingerprintResult
      : registrationFingerprintResult?.fingerprint;
    const registrationDeviceInfo = typeof registrationFingerprintResult === 'object'
      ? registrationFingerprintResult?.deviceInfo
      : null;
    // Validate required fields
    if (!name || !surname || !idNumber || !phoneNumber || !role || !department) {
      return res.status(400).json({ error: 'Name, surname, ID number, phone number, role, and department are required' });
    }

    // 🔐 Validate password for Staff and Intern roles
    if (role === 'Staff' || role === 'Intern') {
      if (!password || !password.trim()) {
        return res.status(400).json({ error: 'Password is required for Staff and Intern roles' });
      }
      // Validate password strength (minimum 6 characters)
      if (password.trim().length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }
      // Optional: Add more password strength requirements
      if (password.trim().length > 128) {
        return res.status(400).json({ error: 'Password must be less than 128 characters' });
      }
    }

    // Validate hostCompanyId if provided (should be valid ObjectId)
    let validatedHostCompanyId = null;
    let resolvedHostCompany = null;
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
      resolvedHostCompany = hostCompany;
    }

    // Validate and clean email address (optional)
    let cleanedEmailAddress = undefined;
    if (emailAddress && typeof emailAddress === 'string' && emailAddress.trim()) {
      const trimmedEmail = emailAddress.trim().toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        cleanedEmailAddress = trimmedEmail;
      } else {
        return res.status(400).json({ error: 'Please enter a valid email address or leave it blank' });
      }
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

    // ⏰ VALIDATE WORKING HOURS: Validate time format if provided (HH:MM format)
    const timeFormatRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (clockInTime && !timeFormatRegex.test(clockInTime.trim())) {
      return res.status(400).json({ error: 'Clock-in time must be in HH:MM format (24-hour, e.g., "07:30")' });
    }
    if (clockOutTime && !timeFormatRegex.test(clockOutTime.trim())) {
      return res.status(400).json({ error: 'Clock-out time must be in HH:MM format (24-hour, e.g., "16:30")' });
    }
    if (breakStartTime && !timeFormatRegex.test(breakStartTime.trim())) {
      return res.status(400).json({ error: 'Break start time must be in HH:MM format (24-hour, e.g., "13:00")' });
    }
    if (breakEndTime && !timeFormatRegex.test(breakEndTime.trim())) {
      return res.status(400).json({ error: 'Break end time must be in HH:MM format (24-hour, e.g., "14:00")' });
    }
    if (extraHoursStartTime && !timeFormatRegex.test(extraHoursStartTime.trim())) {
      return res.status(400).json({ error: 'Extra hours start time must be in HH:MM format (24-hour, e.g., "18:00")' });
    }
    if (extraHoursEndTime && !timeFormatRegex.test(extraHoursEndTime.trim())) {
      return res.status(400).json({ error: 'Extra hours end time must be in HH:MM format (24-hour, e.g., "20:00")' });
    }

    // 🌍 GEOCODING: Get location coordinates (from static dataset or geocode API)
    const { getLocation, searchLocations } = require('../config/locations');
    const { geocodeLocation, geocodeLocationWithRetry } = require('../utils/geocoding');

    let locationLatitude, locationLongitude, locationName, locationAddress;
    let isCustomAddress = false;

    if (customAddress && customAddress.trim().length > 0) {
      // Custom address provided - geocode it using API
      isCustomAddress = true;
      try {
        const geocodeResult = await geocodeLocationWithRetry(customAddress.trim(), 'South Africa', 2);
        locationLatitude = geocodeResult.latitude;
        locationLongitude = geocodeResult.longitude;
        locationName = customAddress.trim();
        locationAddress = geocodeResult.address;
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

    // ⚡ OPTIMIZED: Use lean() for faster query (returns plain JS object, not Mongoose document)
    const existingStaff = await Staff.findOne({ idNumber: idNumber.trim(), isActive: true }).lean();
    if (existingStaff) {
      return res.status(400).json({ error: `Staff with ID number ${idNumber.trim()} is already registered` });
    }

    console.log(`📸 Processing registration for ${name.trim()} ${surname.trim()} (ID: ${idNumber.trim()})`);

    // 🌐 AWS Rekognition: PRIMARY validation (validate faces FIRST before ONNX processing)
    // This provides early quality checks and ensures we only process high-quality images
    if (rekognition.isConfigured()) {
      try {
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          try {
            const analysis = await rekognition.detectFaceAttributes(image.buffer);
            if (!analysis || analysis.faceCount === 0) {
              console.warn(`⚠️ [Rekognition] Image ${i + 1}: No face detected`);
            } else if (analysis.faceCount > 1) {
              console.warn(`⚠️ [Rekognition] Image ${i + 1}: Multiple faces detected (${analysis.faceCount})`);
            }
          } catch (rekError) {
            console.warn(`⚠️ [Rekognition] Image ${i + 1} validation failed: ${rekError.message}`);
          }
        }
      } catch (awsErr) {
        console.warn(`⚠️ [Rekognition] Primary validation failed, using ONNX only: ${awsErr.message}`);
      }
    }

    // ⚡ ENTERPRISE: Process images SEQUENTIALLY to avoid ONNX Runtime concurrency issues
    // ONNX Runtime sessions are not thread-safe for concurrent inference
    // Multiple embeddings (3-5) dramatically improve recognition accuracy
    const registrationStartTime = Date.now();
    const embeddingResults = [];
    const embeddingQualities = []; // 🏦 BANK-GRADE: Store quality metadata per embedding

    // Validate images before processing
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (!img || !img.buffer || img.buffer.length === 0) {
        throw new Error(`Image ${i + 1} is invalid or empty`);
      }
    }

    try {
      // Process images sequentially to avoid ONNX Runtime concurrency issues
      const failedImageNumbers = [];
      const errorDetails = [];

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        try {
          const result = await generateEmbedding(image.buffer);

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
        } catch (imageError) {
          // Track failed images
          failedImageNumbers.push(i + 1);
          const errorMsg = imageError?.message || String(imageError) || 'Unknown error';
          errorDetails.push({ image: i + 1, error: errorMsg });
          console.error(`❌ Error processing image ${i + 1}: ${errorMsg}`);
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
    } catch (error) {
      console.error('❌ Error processing registration images:', error.message);
      return res.status(500).json({ error: `Failed to process images: ${error.message}` });
    }

    // 🏦 BANK-GRADE: Calculate average quality and compute centroid template
    const avgQuality = embeddingQualities.reduce((sum, q) => sum + (q.score || 0.75), 0) / embeddingQualities.length;
    const qualityDetails = embeddingQualities.map((q, i) => `Image ${i + 1}: ${((q.score || 0.75) * 100).toFixed(1)}%`).join(', ');
    console.log(`   📊 Average face quality: ${(avgQuality * 100).toFixed(1)}% (${qualityDetails})`);

    // 🏦 BANK-GRADE: Compute weighted centroid template from all embeddings
    let centroidEmbedding;
    try {
      centroidEmbedding = computeCentroidTemplate(embeddingResults, embeddingQualities);
    } catch (centroidError) {
      console.warn(`⚠️ Failed to compute centroid template: ${centroidError.message}`);
      // Fallback: use first embedding as centroid
      centroidEmbedding = embeddingResults[0];
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

    // 🌐 AWS Rekognition: PRIMARY validation for ID document (validate FIRST before ONNX)
    if (rekognition.isConfigured()) {
      try {
        const idAnalysis = await rekognition.detectFaceAttributes(idImage.buffer);
        if (!idAnalysis || idAnalysis.faceCount === 0) {
          console.warn(`⚠️ [Rekognition] ID document: No face detected`);
        } else if (idAnalysis.faceCount > 1) {
          console.warn(`⚠️ [Rekognition] ID document: Multiple faces detected (${idAnalysis.faceCount})`);
        }
      } catch (rekError) {
        console.warn(`⚠️ [Rekognition] ID document validation failed, using ONNX only: ${rekError.message}`);
      }
    }

    try {
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
      email: cleanedEmailAddress,
      role: role,
      department: department.trim(), // Department (required)
      hostCompanyId: validatedHostCompanyId, // Host company ID (optional)
      // Note: mentorId and mentorName removed - mentors are not assigned during registration
      location: location || customAddress || locationName, // Store location key or custom address
      locationLatitude: locationLatitude, // Store geocoded coordinates
      locationLongitude: locationLongitude,
      locationAddress: isCustomAddress ? locationAddress : undefined, // Store full address if custom
      // ⏰ WORKING HOURS: Store assigned working hours (optional - will fall back to host company default if not provided)
      clockInTime: clockInTime && clockInTime.trim() ? clockInTime.trim() : undefined,
      clockOutTime: clockOutTime && clockOutTime.trim() ? clockOutTime.trim() : undefined,
      breakStartTime: breakStartTime && breakStartTime.trim() ? breakStartTime.trim() : undefined,
      breakEndTime: breakEndTime && breakEndTime.trim() ? breakEndTime.trim() : undefined,
      // ⏰ EXTRA HOURS: Store extra hours availability (optional)
      extraHoursStartTime: extraHoursStartTime && extraHoursStartTime.trim() ? extraHoursStartTime.trim() : undefined,
      extraHoursEndTime: extraHoursEndTime && extraHoursEndTime.trim() ? extraHoursEndTime.trim() : undefined,
      // 🔐 Password (required for Staff and Intern roles only)
      password: (role === 'Staff' || role === 'Intern') && password ? password.trim() : undefined,
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

    // 🔔 LOG ACTION FOR REAL-TIME NOTIFICATIONS
    await logAction('STAFF_REGISTERED', {
      staffId: staff._id?.toString(),
      staffName: `${staff.name} ${staff.surname}`,
      role: staff.role,
      idNumber: staff.idNumber,
      hostCompanyId: staff.hostCompanyId?.toString(),
      departmentId: staff.department?.toString(),
      email: staff.email
    }, null);

    // ✉️ Send registration email with credentials (if enabled and email provided)
    try {
      const shouldSendRegistrationEmail =
        cleanedEmailAddress &&
        (role === 'Staff' || role === 'Intern') &&
        password &&
        password.trim();

      if (shouldSendRegistrationEmail) {
        const settings = await resolveRegistrationOwnerSettings(validatedHostCompanyId);
        const fallbackSettings = new ReportSettings({
          ownerType: validatedHostCompanyId ? 'HostCompany' : 'Admin',
          ownerId: validatedHostCompanyId || ADMIN_OWNER_ID,
        }).toObject();
        const registrationTemplate = settings?.registrationTemplates?.staff
          || fallbackSettings?.registrationTemplates?.staff
          || {};
        const signature = settings?.templates?.emailSignature
          || fallbackSettings?.templates?.emailSignature
          || 'Internship Success';
        const loginUrl = process.env.PORTAL_LOGIN_URL || process.env.APP_LOGIN_URL || '';
        const companyName = resolvedHostCompany?.companyName || resolvedHostCompany?.name || 'Internship Success';

        const templateData = {
          fullName: staff.name,
          role: staff.role,
          companyName,
          mentorName: resolvedHostCompany?.name || '',
          username: staff.idNumber,
          temporaryPassword: password.trim(),
          loginUrl,
          signature,
        };

        await sendRegistrationEmail({
          to: cleanedEmailAddress,
          template: registrationTemplate,
          data: templateData,
        });
      }
    } catch (emailError) {
      console.warn('⚠️ Registration email failed:', emailError?.message || emailError);
    }

    // 🌐 AWS Rekognition integration (collection-based indexing)
    // This runs AFTER ONNX registration succeeds. Rekognition is best-effort:
    // - If AWS is misconfigured or temporarily unavailable, ONNX registration still succeeds.
    if (rekognition.isConfigured()) {
      try {
        // For now use a global collection; we can later move to per-host-company collections
        const collectionId = await rekognition.ensureCollection();
        const staffIdString = staff._id.toString();

        // Index all successful registration images for this staff member
        const imageBuffers = images.map(img => img.buffer);

        // 📦 OPTIONAL: Upload images to S3 for backup/storage (if S3_BUCKET is configured)
        const s3Uploads = [];
        if (process.env.S3_BUCKET) {
          try {
            for (let i = 0; i < images.length; i++) {
              const image = images[i];
              const s3Key = `staff/${staffIdString}/registration/image${i + 1}_${Date.now()}.jpg`;
              const s3Result = await rekognition.uploadToS3(s3Key, image.buffer, image.mimetype || 'image/jpeg');
              if (s3Result) {
                s3Uploads.push(s3Result);
              }
            }
            // Store S3 keys in staff record for reference
            if (s3Uploads.length > 0) {
              staff.s3ImageKeys = s3Uploads.map(u => u.key);
              staff.s3Bucket = process.env.S3_BUCKET;
            }
          } catch (s3Error) {
            console.warn('⚠️ [S3] Failed to upload images to S3 (non-critical):', s3Error.message);
            // Continue with Rekognition indexing even if S3 upload fails
          }
        }

        const indexedFaceIds = await rekognition.indexFacesForStaff(
          collectionId,
          staffIdString,
          imageBuffers
        );

        // Persist Rekognition metadata on staff record
        staff.rekognitionCollectionId = collectionId;
        staff.rekognitionFaceIds = indexedFaceIds;
        staff.rekognitionEnabled = indexedFaceIds.length > 0;
        staff.rekognitionLastSyncedAt = new Date();

        await staff.save().catch(err => {
          console.warn('⚠️ [Rekognition] Failed to save Rekognition fields on staff:', err.message);
        });
      } catch (awsError) {
        console.warn('⚠️ [Rekognition] Registration succeeded with ONNX, but Rekognition indexing failed:', awsError.message);
      }
    }

    if (registrationDeviceFingerprint) {
      const registrationDeviceEntry = createTrustedDeviceEntry(registrationDeviceFingerprint, registrationDeviceInfo, {
        label: 'Registration Device',
        status: 'trusted',
      });

      if (registrationDeviceEntry) {
        await Staff.findByIdAndUpdate(staff._id, {
          $push: { trustedDevices: registrationDeviceEntry },
        });
        staff.trustedDevices = [registrationDeviceEntry];
      }
    }
    const saveTime = Date.now() - saveStartTime;

    const totalRegistrationTime = Date.now() - registrationStartTime;
    console.log(`✅ Staff registered: ${fullName} - ID: ${idNumber.trim()}, Role: ${role}, Embeddings: ${embeddingResults.length}, Time: ${totalRegistrationTime}ms`);

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

















// Clock in/out\\\\\\\\\\\\\\f0r clockin request
router.post('/clock', upload.single('image'), async (req, res) => {
  const requestStartTime = Date.now();
  try {
    console.log('📸 Clock request received');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file ? `File received (${req.file.size} bytes)` : 'No file');

    const { type, latitude, longitude } = req.body; // 'in', 'out', 'break_start', 'break_end', 'extra_shift_in', 'extra_shift_out', 'lunch_start', 'lunch_end'

    const validClockTypes = ['in', 'out', 'break_start', 'break_end', 'extra_shift_in', 'extra_shift_out', 'lunch_start', 'lunch_end'];
    if (!type || !validClockTypes.includes(type)) {
      console.error('❌ Invalid clock type:', type);
      return res.status(400).json({ error: `Clock type must be one of: ${validClockTypes.join(', ')}` });
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


    // 💾 MEMORY OPTIMIZATION: Resize image before processing to reduce memory usage
    let processedImageBuffer = req.file.buffer;
    try {
      processedImageBuffer = await resizeImage(req.file.buffer, 1024);
      // Free original buffer if resized
      if (processedImageBuffer !== req.file.buffer) {
        req.file.buffer = null; // Explicitly free memory
      }
    } catch (resizeError) {
      console.warn('⚠️ Image resize failed, using original:', resizeError.message);
    }

    // 🌐 AWS Rekognition: PRIMARY identification (try FIRST to avoid loading ONNX models)
    // If Rekognition finds a match, we can skip ONNX entirely (saves ~200-250MB memory)
    let primaryStaff = null;
    let primaryFaceSimilarity = null;
    let rekognitionMatchFound = false;

    if (rekognition.isConfigured()) {
      try {
        // First: Quality check (face count)
        const analysis = await rekognition.detectFaceAttributes(processedImageBuffer);
        if (!analysis || analysis.faceCount === 0) {
          // Free buffer before returning
          processedImageBuffer = null;
          return res.status(400).json({
            success: false,
            error: 'We could not detect a face. Please face the camera directly in good lighting.',
          });
        }
        if (analysis.faceCount > 1) {
          // Free buffer before returning
          processedImageBuffer = null;
          return res.status(400).json({
            success: false,
            error: 'Multiple faces detected. Only one person may appear in the frame when clocking in.',
          });
        }

        // Second: Face matching (PRIMARY PATH - saves memory if successful)
        const collectionId = await rekognition.ensureCollection();
        const rekognitionMatch = await rekognition.searchFaceByImage(
          collectionId,
          processedImageBuffer,
          85,
          1
        );

        if (rekognitionMatch && rekognitionMatch.externalImageId) {
          rekognitionMatchFound = true;
          const matchedStaffId = rekognitionMatch.externalImageId;
          const matchedStaff = await Staff.findById(matchedStaffId).lean().catch(() => null);

          if (matchedStaff) {
            primaryStaff = matchedStaff;
            primaryFaceSimilarity = rekognitionMatch.similarity;
            console.log(
              `✅ [Rekognition] Match found: ${matchedStaff.name} (${rekognitionMatch.similarity.toFixed(1)}%) - Skipping ONNX (memory saved!)`
            );
          }
        }
      } catch (awsErr) {
        console.warn(
          '[Rekognition] Failed, will use ONNX fallback:',
          awsErr.message
        );
      }
    }

    // 💾 MEMORY OPTIMIZATION: If Rekognition found a match, skip ONNX entirely
    // This saves ~200-250MB by not loading ONNX models
    if (rekognitionMatchFound && primaryStaff) {
      // Free buffer immediately - we don't need it anymore
      processedImageBuffer = null;
      req.file.buffer = null;

      // Get staff cache for location validation (lightweight)
      const staffWithEmbeddings = await staffCache.getStaff();

      // Continue with Rekognition match (skip ONNX embedding generation)
      // We'll handle the rest of the clock-in logic below
      // ... (code continues to location validation and clock log creation)
    }

    // 🏦 BANK-GRADE Phase 4: Generate device fingerprint for quality tracking
    const fingerprintResult = generateDeviceFingerprint(req.headers, { includeMeta: true });
    const deviceFingerprint = typeof fingerprintResult === 'string' ? fingerprintResult : fingerprintResult?.fingerprint;
    const requestDeviceInfo = typeof fingerprintResult === 'object' ? fingerprintResult?.deviceInfo : null;
    if (deviceFingerprint) {
      console.log(`🏦 Device fingerprint: ${deviceFingerprint.substring(0, 8)}...`);
    }

    // 💾 MEMORY OPTIMIZATION: Only generate ONNX embedding if Rekognition didn't find a match
    // This prevents loading ~200-250MB ONNX models when Rekognition works
    let embeddingResult;

    // Skip ONNX if Rekognition already found a match
    if (!rekognitionMatchFound) {
      // Generate embedding from captured image (now returns object with embedding, quality, etc.)
      // Pass device fingerprint for adaptive quality thresholds
      try {
        embeddingResult = await generateEmbedding(processedImageBuffer, deviceFingerprint);

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

        // 💾 MEMORY OPTIMIZATION: Free buffer after embedding generation
        processedImageBuffer = null;
        req.file.buffer = null;
      } catch (embeddingError) {
        const errorMsg = embeddingError?.message || String(embeddingError) || 'Unknown error';
        console.error('❌ Error generating embedding:', errorMsg);

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

        // Free buffer before returning error
        processedImageBuffer = null;
        req.file.buffer = null;

        return res.status(500).json({
          success: false,
          error: userFriendlyError
        });
      }
    }

    // Get all active staff members from cache (FAST PATH - no DB query!)
    const staffWithEmbeddings = await staffCache.getStaff();

    if (!staffWithEmbeddings || staffWithEmbeddings.length === 0) {
      // Free buffer before returning
      processedImageBuffer = null;
      req.file.buffer = null;
      return res.status(404).json({
        success: false,
        error: 'No staff members registered. Please register staff first.'
      });
    }

    // 🔍 ONNX: Fallback / secondary matcher (only if Rekognition didn't find a match)
    let match = null;
    if (!rekognitionMatchFound) {
      console.log(`🔍 Starting ONNX face matching process (Rekognition fallback)...`);
      // Extract quality score (can be object or number)
      const qualityScore = typeof embeddingResult.quality === 'object'
        ? (embeddingResult.quality?.score || embeddingResult.quality?.detectionScore || 0.75)
        : (embeddingResult.quality || 0.75);
      console.log(`   - Clock-in embedding quality: ${(qualityScore * 100).toFixed(1)}%`);
      console.log(`   - Clock-in embedding length: ${embeddingResult.embedding ? embeddingResult.embedding.length : 'N/A'}`);
      console.log(`   - Staff members to compare: ${staffWithEmbeddings.length}`);

      const matchingStartTime = Date.now();

      // 🏦 BANK-GRADE Phase 3: Pass device fingerprint and location to matching
      // Note: Location validation happens after matching, so we pass locationValid: true initially
      // Location will be validated separately and can affect final score
      match = await findMatchingStaff(embeddingResult, staffWithEmbeddings, {
        deviceFingerprint,      // Device fingerprint for multi-signal fusion
        locationValid: true,    // Will be validated after matching
        useType: 'daily',
      });
      const matchingTime = Date.now() - matchingStartTime;
    }

    // Decide final staff using Rekognition as primary, ONNX as fallback
    let staff;
    let similarity;
    let confidenceLevel;
    let riskScore;
    let signals;

    if (primaryStaff) {
      // Rekognition-success path: use Rekognition's identity, ONNX only for additional signals if available
      staff = primaryStaff;
      similarity = (primaryFaceSimilarity || 0) / 100; // normalize to 0–1 for consistency
      confidenceLevel =
        primaryFaceSimilarity >= 95
          ? 'Very High'
          : primaryFaceSimilarity >= 90
            ? 'High'
            : primaryFaceSimilarity >= 85
              ? 'Medium'
              : 'Low';
      riskScore = match?.riskScore || { score: 0, level: 'low', factors: [] };
      signals = match?.signals || {
        face: similarity,
        temporal: 0,
        device: 0,
        location: 0,
      };
      console.log(
        `✅ Rekognition primary match used for identity: ${staff.name} (${primaryFaceSimilarity?.toFixed(
          1
        )}% similarity)`
      );
    } else {
      // Rekognition failed or not configured – use ONNX match as before
      if (!match) {
        console.error('❌ Face not recognized - no matching staff found (ONNX fallback)');
        console.error(`📊 Final debug info:`);
        console.error(`   - Staff members in database: ${staffWithEmbeddings.length}`);
        const qualityScoreForError = typeof embeddingResult.quality === 'object'
          ? (embeddingResult.quality?.score || embeddingResult.quality?.detectionScore || 0.75)
          : (embeddingResult.quality || 0.75);
        console.error(`   - Embedding quality: ${(qualityScoreForError * 100).toFixed(1)}%`);
        console.error(`   - Embedding type: ${Array.isArray(embeddingResult.embedding) ? 'Array' : typeof embeddingResult.embedding}`);
        console.error(`   - Embedding length: ${embeddingResult.embedding ? embeddingResult.embedding.length : 'N/A'}`);
        console.error(`   - Detection score: ${embeddingResult.detectionScore ? (embeddingResult.detectionScore * 100).toFixed(1) + '%' : 'N/A'}`);

        if (qualityScoreForError < 0.3) {
          console.error('⚠️ WARNING: Using fallback embeddings - models may not be loaded!');
          return res.status(500).json({
            success: false,
            error: 'Face recognition models not properly loaded. Please contact administrator.'
          });
        }

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

      ({ staff, similarity, confidenceLevel, riskScore, signals } = match);
    }

    const confidence = Math.round((similarity || 0) * 100);
    let deviceTrustStatus = deviceFingerprint ? 'unknown' : 'not_provided';
    const trustedDevices = Array.isArray(staff.trustedDevices) ? staff.trustedDevices : [];

    if (deviceFingerprint) {
      if (trustedDevices.length === 0) {
        const autoTrustedDevice = createTrustedDeviceEntry(deviceFingerprint, requestDeviceInfo, {
          label: 'Auto-Bound Device',
          status: 'trusted',
        });

        if (autoTrustedDevice) {
          await Staff.findByIdAndUpdate(staff._id, { $push: { trustedDevices: autoTrustedDevice } }).catch(err => {
            console.warn('⚠️ Failed to auto-bind device:', err.message);
          });
          staffCache.invalidate();
          trustedDevices.push(autoTrustedDevice);
          deviceTrustStatus = 'trusted';
        }
      } else {
        let existingDevice = trustedDevices.find(device => device.fingerprint === deviceFingerprint);

        if (!existingDevice) {
          // Check whether this fingerprint already belongs to another staff member
          let otherDeviceOwner = null;
          try {
            otherDeviceOwner = await Staff.findOne(
              {
                _id: { $ne: staff._id },
                'trustedDevices.fingerprint': deviceFingerprint,
              },
              { name: 1, surname: 1 }
            ).lean();
          } catch (deviceLookupError) {
            console.warn('⚠️ Failed to look up fingerprint ownership:', deviceLookupError.message);
          }

          if (otherDeviceOwner) {
            console.warn(
              `⚠️ Device fingerprint already trusted for ${otherDeviceOwner.name} ${otherDeviceOwner.surname}. ` +
              `Sharing it with ${staff.name} ${staff.surname} without additional approval.`
            );
            const sharedDeviceEntry = createTrustedDeviceEntry(deviceFingerprint, requestDeviceInfo, {
              label: `Shared Device (${otherDeviceOwner.name} ${otherDeviceOwner.surname})`,
              status: 'trusted',
            });

            if (!sharedDeviceEntry) {
              return res.status(403).json({
                success: false,
                error: 'Unable to share the device at this time. Please try again later.',
                deviceStatus: 'blocked_shared_device',
                warning: true,
              });
            }

            await Staff.findByIdAndUpdate(staff._id, { $push: { trustedDevices: sharedDeviceEntry } }).catch(err => {
              console.warn('⚠️ Failed to auto-share device:', err.message);
            });
            staffCache.invalidate();
            trustedDevices.push(sharedDeviceEntry);
            deviceTrustStatus = 'trusted';
            existingDevice = sharedDeviceEntry;

            const sharedDeviceOwner = {
              staffId: otherDeviceOwner._id?.toString?.() || null,
              staffName: `${otherDeviceOwner.name} ${otherDeviceOwner.surname}`.trim(),
            };
            try {
              await logAction('SHARED_DEVICE_CLOCKIN', {
                staffId: staff._id.toString(),
                staffName: staff.name,
                hostCompanyId: staff.hostCompanyId?.toString(),
                departmentId: staff.department?.toString(),
                location: req.body.location || 'Unknown',
                deviceFingerprint,
                sharedDeviceOwner,
                conflictWithStaffId: otherDeviceOwner._id?.toString?.() || null,
                conflictWithStaffName: `${otherDeviceOwner.name} ${otherDeviceOwner.surname}`.trim(),
                confidence,
                type,
              }, req.user?._id);
            } catch (logError) {
              console.warn('ƒsÿ‹,? Failed to log shared device event:', logError?.message || logError);
            }
          } else {
            const pendingDevice = createTrustedDeviceEntry(deviceFingerprint, requestDeviceInfo, {
              label: 'Pending Approval',
              status: 'pending',
            });

            if (pendingDevice) {
              await Staff.findByIdAndUpdate(staff._id, { $push: { trustedDevices: pendingDevice } }).catch(err => {
                console.warn('⚠️ Failed to queue device for approval:', err.message);
              });
              staffCache.invalidate();
            }

            return res.status(403).json({
              success: false,
              error: 'Unrecognized device. This device is pending approval by your administrator.',
              requiresDeviceApproval: true,
              deviceStatus: 'pending',
            });
          }
        }

        if (existingDevice.status === 'revoked') {
          return res.status(403).json({
            success: false,
            error: 'This device has been revoked. Please contact your administrator.',
            deviceStatus: 'revoked',
          });
        }

        if (existingDevice.status === 'pending') {
          return res.status(403).json({
            success: false,
            error: 'This device is pending approval. Please contact your administrator to approve it.',
            requiresDeviceApproval: true,
            deviceStatus: 'pending',
          });
        }

        deviceTrustStatus = 'trusted';
        const normalizedInfo = createTrustedDeviceEntry(deviceFingerprint, requestDeviceInfo, {
          label: existingDevice.label,
          status: existingDevice.status,
        });

        await Staff.updateOne(
          { _id: staff._id, 'trustedDevices.fingerprint': deviceFingerprint },
          {
            $set: {
              'trustedDevices.$.lastSeenAt': new Date(),
              ...(normalizedInfo?.deviceInfo
                ? { 'trustedDevices.$.deviceInfo': { ...(existingDevice.deviceInfo || {}), ...normalizedInfo.deviceInfo } }
                : {}),
            },
          }
        ).catch(err => {
          console.warn('⚠️ Failed to update trusted device metadata:', err.message);
        });
      }
    } else if (trustedDevices.length > 0) {
      console.warn(`⚠️ No device fingerprint provided for ${staff.name}, but trusted devices exist.`);
    }

    // 🚦 If the device is not trusted, force a modal-friendly response immediately
    if (deviceTrustStatus !== 'trusted') {
      const deviceApprovalMessage =
        'This device is pending approval. Please contact your administrator to approve it.';
      return res.status(403).json({
        success: false,
        error: deviceApprovalMessage,
        requiresDeviceApproval: true,
        deviceStatus: deviceTrustStatus,
        deviceMessage: deviceApprovalMessage,
        staffName: staff.name,
      });
    }

    // 🏦 BANK-GRADE Phase 4: Log risk score if elevated
    if (riskScore && riskScore.score > 0.3) {
      console.warn(`⚠️ Elevated risk score: ${(riskScore.score * 100).toFixed(1)}% (${riskScore.level})`);
      if (riskScore.factors && riskScore.factors.length > 0) {
        console.warn(`   Risk factors: ${riskScore.factors.join(', ')}`);
      }
    }

    // ENTERPRISE: Time-based pattern validation
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
        staffName: staff.name, // Include staff name for personalized frontend message
        assignedLocation: staffLocationName, // Include assigned location name
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
      clockTypeText = 'Started Tea Time';
    } else if (type === 'break_end') {
      clockTypeText = 'Ended Tea Time';
    } else if (type === 'extra_shift_in') {
      clockTypeText = 'Started Extra Shift';
    } else if (type === 'extra_shift_out') {
      clockTypeText = 'Ended Extra Shift';
    } else if (type === 'lunch_start') {
      clockTypeText = 'Started Lunch';
    } else if (type === 'lunch_end') {
      clockTypeText = 'Ended Lunch';
    }

    console.log(`✅ Success: ${staff.name} ${clockTypeText} on ${shortDateString} at ${timeString}`);

    // ⏰ WORKING HOURS VALIDATION: Check if clock time is within assigned hours
    const TOLERANCE = 15; // 15 minutes tolerance
    let timeWarning = null;
    let expectedTime = null;
    let isOnTime = true;
    let timeDiffMinutes = null;

    // Helper to parse time string (HH:MM) to hour and minute
    const parseTime = (timeString) => {
      if (!timeString) return null;
      const parts = timeString.split(':');
      if (parts.length !== 2) return null;
      const hour = parseInt(parts[0], 10);
      const minute = parseInt(parts[1], 10);
      if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return null;
      }
      return { hour, minute };
    };

    // Get working hours for staff (staff-specific or host company default)
    let workingHours = null;
    if (staff.clockInTime && staff.clockOutTime) {
      // Staff has assigned hours
      workingHours = {
        clockIn: parseTime(staff.clockInTime),
        clockOut: parseTime(staff.clockOutTime),
        startBreak: parseTime(staff.breakStartTime),
        endBreak: parseTime(staff.breakEndTime),
        source: 'staff'
      };
    } else if (staff.hostCompanyId) {
      // Fall back to host company default hours
      const HostCompany = require('../models/HostCompany');
      const hostCompany = await HostCompany.findById(staff.hostCompanyId).lean();
      if (hostCompany && hostCompany.defaultClockInTime && hostCompany.defaultClockOutTime) {
        workingHours = {
          clockIn: parseTime(hostCompany.defaultClockInTime),
          clockOut: parseTime(hostCompany.defaultClockOutTime),
          startBreak: parseTime(hostCompany.defaultBreakStartTime),
          endBreak: parseTime(hostCompany.defaultBreakEndTime),
          source: 'hostCompany'
        };
      }
    }

    // Check if current time is within assigned hours (only for weekdays)
    if (workingHours) {
      const currentDay = timestamp.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const isWeekday = currentDay >= 1 && currentDay <= 5; // Monday to Friday

      if (isWeekday) {
        let expectedTimeObj = null;
        let timeType = '';

        if (type === 'in' && workingHours.clockIn) {
          expectedTimeObj = workingHours.clockIn;
          timeType = 'clock-in';
        } else if (type === 'out' && workingHours.clockOut) {
          expectedTimeObj = workingHours.clockOut;
          timeType = 'clock-out';
        } else if (type === 'break_start' && workingHours.startBreak) {
          expectedTimeObj = workingHours.startBreak;
          timeType = 'break start';
        } else if (type === 'break_end' && workingHours.endBreak) {
          expectedTimeObj = workingHours.endBreak;
          timeType = 'break end';
        }

        if (expectedTimeObj) {
          const expectedDate = new Date(timestamp);
          expectedDate.setHours(expectedTimeObj.hour, expectedTimeObj.minute, 0, 0);

          const diffMinutes = (timestamp - expectedDate) / (1000 * 60);
          timeDiffMinutes = diffMinutes;

          if (Math.abs(diffMinutes) > TOLERANCE) {
            isOnTime = false;
            expectedTime = expectedDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });

            const diffText = diffMinutes > 0 ? `${Math.round(diffMinutes)} minutes late` : `${Math.round(Math.abs(diffMinutes))} minutes early`;
            timeWarning = `${timeType.charAt(0).toUpperCase() + timeType.slice(1)} time is ${diffText}. Expected: ${expectedTime}`;
          }
        }
      }
    }

    // Prepare response data with date and time
    // Provide a user-friendly modal message whenever the device is not trusted/pending
    let deviceApprovalMessage = null;
    if (deviceTrustStatus !== 'trusted') {
      deviceApprovalMessage =
        'This device is pending approval. Please contact your administrator to approve it.';
    } else if ((riskScore?.factors || []).includes('Device not recognized as trusted')) {
      deviceApprovalMessage =
        'This device is pending approval. Please contact your administrator to approve it.';
    }

    const responseData = {
      success: true,
      message: `${staff.name} — ${clockTypeText}`,
      staffName: staff.name,
      clockType: type,
      timestamp: timestamp.toISOString(),
      date: dateString,
      time: timeString,
      dateTime: `${dateString} at ${timeString}`,
      confidence,
      deviceStatus: deviceTrustStatus,
      requiresDeviceApproval: Boolean(deviceApprovalMessage),
      deviceMessage: deviceApprovalMessage,
      // ⏰ WORKING HOURS: Include time validation info
      timeValidation: {
        isOnTime,
        expectedTime,
        warning: timeWarning,
        workingHours: workingHours ? {
          clockIn: workingHours.clockIn ? `${String(workingHours.clockIn.hour).padStart(2, '0')}:${String(workingHours.clockIn.minute).padStart(2, '0')}` : null,
          clockOut: workingHours.clockOut ? `${String(workingHours.clockOut.hour).padStart(2, '0')}:${String(workingHours.clockOut.minute).padStart(2, '0')}` : null,
          breakStart: workingHours.startBreak ? `${String(workingHours.startBreak.hour).padStart(2, '0')}:${String(workingHours.startBreak.minute).padStart(2, '0')}` : null,
          breakEnd: workingHours.endBreak ? `${String(workingHours.endBreak.hour).padStart(2, '0')}:${String(workingHours.endBreak.minute).padStart(2, '0')}` : null,
          source: workingHours.source
        } : null
      }
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
        console.log(`✅ Clock log saved for ${staff.name}`);

        // 🔔 LOG ACTION FOR REAL-TIME NOTIFICATIONS
        const actionType = type === 'out' ? 'CLOCK_OUT' : 'CLOCK_IN';
        await logAction(actionType, {
          staffId: staff._id.toString(),
          staffName: staff.name,
          timestamp: timestamp,
          hostCompanyId: staff.hostCompanyId?.toString(),
          departmentId: staff.department?.toString(),
          clockLogId: clockLog._id?.toString(),
          location: req.body.location || 'Unknown',
          type: type,
          confidence: confidence
        }, req.user?._id);

        if (type === 'in' && typeof timeDiffMinutes === 'number') {
          try {
            await autoReports.lateClockMonitor.handleLateClockIn({
              staff,
              timestamp,
              timeDiffMinutes
            });
          } catch (notifyError) {
            console.warn('Late clock-in report failed:', notifyError?.message || notifyError);
          }
        }

        // 🏦 BANK-GRADE Phase 4: Track device quality after successful clock-in
        if (deviceFingerprint && embeddingResult?.qualityMetrics) {
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
    const message = error?.message || String(error);
    console.error('Error verifying registration:', error);
    res.status(500).json({ error: 'Failed to verify registration', details: message });
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
    const { hostCompanyId, departmentId } = req.query;
    let filter = { isActive: true };

    // Filter by host company if provided
    if (hostCompanyId) {
      if (!mongoose.Types.ObjectId.isValid(hostCompanyId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid host company ID format'
        });
      }
      filter.hostCompanyId = hostCompanyId;
    }

    // Filter by department if provided
    // Department can be stored as department ID (string) or department name
    if (departmentId) {
      if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid department ID format'
        });
      }

      // Try to find the department to get its name as well
      const Department = require('../models/Department');
      const department = await Department.findById(departmentId).select('_id name').lean();

      if (department) {
        // Match both department ID (as string) and department name
        // Staff.department field can store either format
        // Combine with existing filters using $and to avoid conflicts
        const departmentFilter = {
          $or: [
            { department: departmentId.toString() },
            { department: department.name }
          ]
        };

        // Merge with existing filter using $and
        const baseFilter = { ...filter };
        filter = {
          $and: [
            baseFilter,
            departmentFilter
          ]
        };
      } else {
        // Department not found, but still try to match by ID
        filter.department = departmentId.toString();
      }
    }

    // Include all necessary fields for mentor selection: name, surname, role, department, mentorName
    const staff = await Staff.find(filter).select('name surname role department mentorName hostCompanyId createdAt').sort({ createdAt: -1 });
    res.json({ success: true, staff });
  } catch (error) {
    console.error('Error fetching staff list:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch staff list' });
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
      // Use a fixed MongoDB ObjectId for admin (24 hex chars)
      const ADMIN_OBJECT_ID = '000000000000000000000001';
      return res.json({
        success: true,
        user: {
          id: ADMIN_OBJECT_ID, // ✅ Valid MongoDB ObjectId format
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

// Intern login with face recognition
router.post('/intern/login', upload.single('image'), async (req, res) => {
  try {
    const { idNumber, password } = req.body;

    if (!idNumber) {
      return res.status(400).json({
        success: false,
        error: 'ID number is required'
      });
    }

    // For test accounts, allow password-only login (bypass face recognition)
    const TEST_ACCOUNTS = {
      'intern1': { password: 'intern123', idNumber: '0000000000001' },
      'intern2': { password: 'intern123', idNumber: '0000000000002' },
      'test': { password: 'test123', idNumber: '0000000000003' }
    };

    const testAccount = TEST_ACCOUNTS[idNumber.trim().toLowerCase()];
    const isTestAccount = testAccount && password === testAccount.password;

    let intern;

    if (isTestAccount) {
      // For test accounts, find by the mapped ID number
      intern = await Staff.findOne({
        idNumber: testAccount.idNumber,
        role: 'Intern',
        isActive: true
      });

      // If test intern doesn't exist, create a mock response for testing
      if (!intern) {
        console.log('⚠️ Test account login - intern not found in database, using mock data');
        // Return mock intern data for testing
        return res.json({
          success: true,
          user: {
            type: 'intern',
            id: 'test_intern_id',
            idNumber: testAccount.idNumber,
            name: 'Test',
            surname: 'Intern',
            fullName: 'Test Intern',
            hostCompanyId: null,
            department: 'Testing',
          }
        });
      }
    } else {
      // Find intern by ID number (normal flow) - select password field for verification
      intern = await Staff.findOne({
        idNumber: idNumber.trim(),
        role: 'Intern',
        isActive: true
      }).select('+password'); // Select password field (normally excluded)

      if (!intern) {
        return res.status(401).json({
          success: false,
          error: 'Intern not found or inactive'
        });
      }
    }

    // Check password authentication if password is provided
    let isPasswordValid = false;
    if (password && intern.password) {
      // Use comparePassword method if available, otherwise use bcrypt directly
      if (typeof intern.comparePassword === 'function') {
        isPasswordValid = await intern.comparePassword(password);
      } else {
        const bcrypt = require('bcryptjs');
        isPasswordValid = await bcrypt.compare(password, intern.password);
      }

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid password. Please check your credentials.'
        });
      }
    }

    // If it's a test account with valid password, skip face recognition
    if (isTestAccount && password && isPasswordValid) {
      console.log('✅ Test account login (password-only):', idNumber);
      // Continue to device tracking and return success
    } else if (password && isPasswordValid) {
      // Regular password login (password verified above)
      console.log('✅ Password login successful for intern:', idNumber);
      // Continue to device tracking and return success
    } else if (req.file) {
      // If image is provided, verify face
      const processedImageBuffer = await resizeImage(req.file.buffer, 1024);
      const embedding = await generateEmbedding(processedImageBuffer);
      const match = await findMatchingStaff(embedding, { threshold: 0.65 });

      if (!match || match.staff._id.toString() !== intern._id.toString()) {
        return res.status(401).json({
          success: false,
          error: 'Face recognition failed. Please ensure you are the registered person.'
        });
      }
    } else {
      // No image and no valid password - require face recognition or password
      return res.status(401).json({
        success: false,
        error: 'Face recognition or valid password is required for login.'
      });
    }

    // Track device info
    const deviceFingerprintResult = generateDeviceFingerprint(req.headers, { includeMeta: true });
    const deviceFingerprint = typeof deviceFingerprintResult === 'string'
      ? deviceFingerprintResult
      : deviceFingerprintResult?.fingerprint;
    const deviceInfo = typeof deviceFingerprintResult === 'object'
      ? deviceFingerprintResult?.deviceInfo
      : null;

    // Save or update device info
    if (deviceFingerprint && deviceInfo) {
      const DeviceInfo = require('../models/DeviceInfo');
      await DeviceInfo.findOneAndUpdate(
        { userId: intern._id, deviceFingerprint },
        {
          userId: intern._id,
          userName: `${intern.name} ${intern.surname}`,
          deviceFingerprint,
          deviceName: deviceInfo.modelName || 'Unknown Device',
          platform: deviceInfo.platform || 'unknown',
          brand: deviceInfo.brand,
          manufacturer: deviceInfo.manufacturer,
          modelName: deviceInfo.modelName,
          osVersion: deviceInfo.osVersion,
          appVersion: deviceInfo.appVersion,
          buildNumber: deviceInfo.buildNumber,
          language: deviceInfo.language,
          timezone: deviceInfo.timezone,
          deviceId: deviceInfo.deviceId,
          screenWidth: deviceInfo.screenWidth,
          screenHeight: deviceInfo.screenHeight,
          screenScale: deviceInfo.screenScale,
          deviceType: deviceInfo.deviceType,
          hostCompanyId: intern.hostCompanyId,
          lastSeenAt: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    // Fetch host company info
    let hostCompanyName = null;
    if (intern.hostCompanyId) {
      const HostCompany = require('../models/HostCompany');
      const hostCompany = await HostCompany.findById(intern.hostCompanyId).lean();
      if (hostCompany) {
        hostCompanyName = hostCompany.companyName || hostCompany.name;
      }
    }

    // Fetch mentor info if assigned
    let mentorName = null;
    if (intern.mentorId) {
      const mentor = await Staff.findById(intern.mentorId).select('name surname').lean();
      if (mentor) {
        mentorName = `${mentor.name} ${mentor.surname}`.trim();
      }
    }

    console.log('✅ Intern login successful:', intern.name);
    res.json({
      success: true,
      user: {
        type: 'intern',
        id: intern._id,
        idNumber: intern.idNumber,
        name: intern.name,
        surname: intern.surname,
        fullName: `${intern.name} ${intern.surname}`,
        hostCompanyId: intern.hostCompanyId,
        hostCompanyName: hostCompanyName,
        mentorName: mentorName,
        department: intern.department,
      }
    });
  } catch (error) {
    console.error('❌ Intern login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.'
    });
  }
});

// ========== INTERN DASHBOARD ROUTES ==========

// Get intern dashboard data (attendance summary)
router.get('/intern/dashboard', async (req, res) => {
  try {
    const { internId, period = 'today' } = req.query;

    if (!internId) {
      return res.status(400).json({
        success: false,
        error: 'Intern ID is required'
      });
    }

    // Handle test accounts - return mock dashboard data
    if (internId === 'test_intern_id') {
      return res.json({
        success: true,
        attendance: [],
        stats: {
          totalHours: '0.0',
          daysPresent: '0',
          attendanceRate: '0'
        }
      });
    }

    // Find intern
    const intern = await Staff.findById(internId).lean();
    if (!intern) {
      return res.status(404).json({
        success: false,
        error: 'Intern not found'
      });
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate, endDate;

    if (period === 'today') {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'weekly') {
      // Get start of week (Monday)
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid period. Use: today, weekly, or monthly'
      });
    }

    // Get clock logs for the period
    const logs = await ClockLog.find({
      staffId: internId,
      timestamp: { $gte: startDate, $lte: endDate }
    }).sort({ timestamp: 1 }).lean();

    // Group logs by date
    const attendanceByDate = {};
    logs.forEach(log => {
      const dateKey = new Date(log.timestamp).toISOString().split('T')[0];
      if (!attendanceByDate[dateKey]) {
        attendanceByDate[dateKey] = {
          date: dateKey,
          clockIn: null,
          clockOut: null,
          breakStart: null,
          breakEnd: null,
          lunchStart: null,
          lunchEnd: null,
          extraShiftIn: null,
          extraShiftOut: null,
        };
      }

      const timeStr = log.timestamp;
      if (log.clockType === 'in') {
        attendanceByDate[dateKey].clockIn = timeStr;
      } else if (log.clockType === 'out') {
        attendanceByDate[dateKey].clockOut = timeStr;
      } else if (log.clockType === 'break_start') {
        attendanceByDate[dateKey].breakStart = timeStr;
      } else if (log.clockType === 'break_end') {
        attendanceByDate[dateKey].breakEnd = timeStr;
      } else if (log.clockType === 'lunch_start') {
        attendanceByDate[dateKey].lunchStart = timeStr;
      } else if (log.clockType === 'lunch_end') {
        attendanceByDate[dateKey].lunchEnd = timeStr;
      } else if (log.clockType === 'extra_shift_in') {
        attendanceByDate[dateKey].extraShiftIn = timeStr;
      } else if (log.clockType === 'extra_shift_out') {
        attendanceByDate[dateKey].extraShiftOut = timeStr;
      }
    });

    // Calculate hours for each day
    const attendanceData = Object.values(attendanceByDate).map(day => {
      let hoursWorked = 0;

      // Calculate regular hours (clock in to clock out, excluding breaks and lunch)
      if (day.clockIn && day.clockOut) {
        const clockInTime = new Date(day.clockIn).getTime();
        const clockOutTime = new Date(day.clockOut).getTime();
        let totalMinutes = (clockOutTime - clockInTime) / (1000 * 60);

        // Subtract break duration
        if (day.breakStart && day.breakEnd) {
          const breakStart = new Date(day.breakStart).getTime();
          const breakEnd = new Date(day.breakEnd).getTime();
          const breakMinutes = (breakEnd - breakStart) / (1000 * 60);
          totalMinutes -= breakMinutes;
        }

        // Subtract lunch duration
        if (day.lunchStart && day.lunchEnd) {
          const lunchStart = new Date(day.lunchStart).getTime();
          const lunchEnd = new Date(day.lunchEnd).getTime();
          const lunchMinutes = (lunchEnd - lunchStart) / (1000 * 60);
          totalMinutes -= lunchMinutes;
        }

        hoursWorked = Math.max(0, totalMinutes / 60);
      }

      // Add extra shift hours
      if (day.extraShiftIn && day.extraShiftOut) {
        const extraStart = new Date(day.extraShiftIn).getTime();
        const extraEnd = new Date(day.extraShiftOut).getTime();
        const extraMinutes = (extraEnd - extraStart) / (1000 * 60);
        hoursWorked += extraMinutes / 60;
      }

      return {
        date: day.date,
        clockIn: day.clockIn,
        clockOut: day.clockOut,
        hoursWorked: hoursWorked.toFixed(1)
      };
    });

    // Calculate stats
    const totalHours = attendanceData.reduce((sum, day) => sum + parseFloat(day.hoursWorked || 0), 0);
    const daysPresent = attendanceData.filter(day => day.clockIn).length;

    // Calculate expected days based on period
    let expectedDays = 1;
    if (period === 'weekly') {
      expectedDays = 5; // Weekdays only
    } else if (period === 'monthly') {
      // Count weekdays in the month
      const currentDate = new Date(startDate);
      let weekdayCount = 0;
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
          weekdayCount++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      expectedDays = weekdayCount;
    }

    const attendanceRate = expectedDays > 0 ? Math.round((daysPresent / expectedDays) * 100) : 0;

    const stats = {
      totalHours: totalHours.toFixed(1),
      daysPresent: daysPresent.toString(),
      attendanceRate: attendanceRate.toString()
    };

    res.json({
      success: true,
      attendance: attendanceData,
      stats: stats
    });
  } catch (error) {
    console.error('❌ Intern dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load dashboard data'
    });
  }
});

// Get detailed intern attendance with comprehensive stats
router.get('/intern/stipend', async (req, res) => {
  try {
    const { internId } = req.query;

    if (!internId) {
      return res.status(400).json({
        success: false,
        error: 'Intern ID is required'
      });
    }

    if (internId === 'test_intern_id') {
      return res.json({
        success: true,
        stipendAmount: null
      });
    }

    const intern = await Staff.findById(internId).select('stipendAmount role').lean();
    if (!intern) {
      return res.status(404).json({
        success: false,
        error: 'Intern not found'
      });
    }

    return res.json({
      success: true,
      stipendAmount: intern.stipendAmount ?? null
    });
  } catch (error) {
    console.error('Error fetching intern stipend:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch stipend'
    });
  }
});

// Get intern working hours (expected hours for payroll)
router.get('/intern/working-hours', async (req, res) => {
  try {
    const { internId, month, year } = req.query;

    if (!internId) {
      return res.status(400).json({
        success: false,
        error: 'Intern ID is required'
      });
    }

    if (internId === 'test_intern_id') {
      return res.json({
        success: true,
        workingHours: null
      });
    }

    const intern = await Staff.findById(internId)
      .select([
        'hostCompanyId',
        'clockInTime',
        'clockOutTime',
        'breakStartTime',
        'breakEndTime',
        'expectedWorkingDaysPerWeek',
        'expectedWorkingDaysPerMonth',
        'expectedHoursPerDay',
        'expectedWeeklyHours',
        'expectedMonthlyHours'
      ])
      .lean();

    if (!intern) {
      return res.status(404).json({
        success: false,
        error: 'Intern not found'
      });
    }

    const now = new Date();
    const resolvedYear = year ? Number(year) : now.getFullYear();
    const resolvedMonth = month ? Number(month) : now.getMonth() + 1;

    if (!Number.isFinite(resolvedYear) || !Number.isFinite(resolvedMonth) || resolvedMonth < 1 || resolvedMonth > 12) {
      return res.status(400).json({
        success: false,
        error: 'Invalid month or year'
      });
    }

    const countWeekdaysInMonth = (yearValue, monthValue) => {
      const monthIndex = monthValue - 1;
      const cursor = new Date(yearValue, monthIndex, 1);
      let count = 0;
      while (cursor.getMonth() === monthIndex) {
        const day = cursor.getDay();
        if (day >= 1 && day <= 5) {
          count += 1;
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      return count;
    };

    const parseTimeToMinutes = (timeString) => {
      if (!timeString || typeof timeString !== 'string') return null;
      const parts = timeString.split(':');
      if (parts.length !== 2) return null;
      const hours = Number(parts[0]);
      const minutes = Number(parts[1]);
      if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
      return (hours * 60) + minutes;
    };

    const computeHoursPerDayFromTimes = (clockIn, clockOut, breakStart, breakEnd) => {
      const clockInMinutes = parseTimeToMinutes(clockIn);
      const clockOutMinutes = parseTimeToMinutes(clockOut);
      if (clockInMinutes === null || clockOutMinutes === null) {
        return null;
      }
      let totalMinutes = clockOutMinutes - clockInMinutes;
      if (totalMinutes <= 0) {
        return null;
      }
      if (breakStart && breakEnd) {
        const breakStartMinutes = parseTimeToMinutes(breakStart);
        const breakEndMinutes = parseTimeToMinutes(breakEnd);
        if (breakStartMinutes !== null && breakEndMinutes !== null && breakEndMinutes > breakStartMinutes) {
          totalMinutes -= (breakEndMinutes - breakStartMinutes);
        }
      }
      if (totalMinutes <= 0) {
        return null;
      }
      return totalMinutes / 60;
    };

    const resolveClockTimes = async () => {
      if (intern.clockInTime && intern.clockOutTime) {
        return {
          clockInTime: intern.clockInTime,
          clockOutTime: intern.clockOutTime,
          breakStartTime: intern.breakStartTime,
          breakEndTime: intern.breakEndTime,
          source: 'registration'
        };
      }

      if (intern.hostCompanyId) {
        const hostCompany = await HostCompany.findById(intern.hostCompanyId)
          .select('defaultClockInTime defaultClockOutTime defaultBreakStartTime defaultBreakEndTime')
          .lean();
        if (hostCompany && hostCompany.defaultClockInTime && hostCompany.defaultClockOutTime) {
          return {
            clockInTime: hostCompany.defaultClockInTime,
            clockOutTime: hostCompany.defaultClockOutTime,
            breakStartTime: hostCompany.defaultBreakStartTime,
            breakEndTime: hostCompany.defaultBreakEndTime,
            source: 'hostCompany'
          };
        }
      }

      return null;
    };

    const workingDaysPerWeekDefault = 5;
    const workingDaysPerMonthDefault = countWeekdaysInMonth(resolvedYear, resolvedMonth);

    const assignedFields = [
      intern.expectedWorkingDaysPerWeek,
      intern.expectedWorkingDaysPerMonth,
      intern.expectedHoursPerDay,
      intern.expectedWeeklyHours,
      intern.expectedMonthlyHours
    ];

    const hasAssignedWorkingHours = assignedFields.some(value => value !== null && value !== undefined);
    const hasAssignedHoursOnly = [
      intern.expectedHoursPerDay,
      intern.expectedWeeklyHours,
      intern.expectedMonthlyHours
    ].some(value => value !== null && value !== undefined);

    const workingDaysPerWeek = Number.isFinite(intern.expectedWorkingDaysPerWeek)
      ? intern.expectedWorkingDaysPerWeek
      : workingDaysPerWeekDefault;
    const workingDaysPerMonth = Number.isFinite(intern.expectedWorkingDaysPerMonth)
      ? intern.expectedWorkingDaysPerMonth
      : workingDaysPerMonthDefault;

    let hoursPerDay = Number.isFinite(intern.expectedHoursPerDay) ? intern.expectedHoursPerDay : null;
    let weeklyHours = Number.isFinite(intern.expectedWeeklyHours) ? intern.expectedWeeklyHours : null;
    let monthlyHours = Number.isFinite(intern.expectedMonthlyHours) ? intern.expectedMonthlyHours : null;

    let source = hasAssignedWorkingHours ? 'staff' : null;

    if (!hasAssignedHoursOnly) {
      const clockTimes = await resolveClockTimes();
      if (clockTimes) {
        const derivedHoursPerDay = computeHoursPerDayFromTimes(
          clockTimes.clockInTime,
          clockTimes.clockOutTime,
          clockTimes.breakStartTime,
          clockTimes.breakEndTime
        );
        if (hoursPerDay === null && derivedHoursPerDay !== null) {
          hoursPerDay = derivedHoursPerDay;
        }
        if (!source) {
          source = clockTimes.source;
        }
      }
    }

    if (hoursPerDay === null) {
      if (weeklyHours !== null && workingDaysPerWeek > 0) {
        hoursPerDay = weeklyHours / workingDaysPerWeek;
      } else if (monthlyHours !== null && workingDaysPerMonth > 0) {
        hoursPerDay = monthlyHours / workingDaysPerMonth;
      }
    }

    if (weeklyHours === null && hoursPerDay !== null && workingDaysPerWeek > 0) {
      weeklyHours = hoursPerDay * workingDaysPerWeek;
    }

    if (monthlyHours === null && hoursPerDay !== null && workingDaysPerMonth > 0) {
      monthlyHours = hoursPerDay * workingDaysPerMonth;
    }

    const roundValue = (value) => {
      if (!Number.isFinite(value)) return null;
      return Math.round(value * 100) / 100;
    };

    return res.json({
      success: true,
      workingHours: {
        workingDaysPerWeek: roundValue(workingDaysPerWeek),
        workingDaysPerMonth: roundValue(workingDaysPerMonth),
        hoursPerDay: roundValue(hoursPerDay),
        weeklyHours: roundValue(weeklyHours),
        monthlyHours: roundValue(monthlyHours),
        source: source || 'none'
      },
      period: {
        month: resolvedMonth,
        year: resolvedYear
      }
    });
  } catch (error) {
    console.error('Error fetching working hours:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch working hours'
    });
  }
});

router.get('/intern/attendance/detailed', async (req, res) => {
  try {
    const { internId, period = 'monthly', startDate, endDate } = req.query;

    if (!internId) {
      return res.status(400).json({
        success: false,
        error: 'Intern ID is required'
      });
    }

    // Handle test accounts
    if (internId === 'test_intern_id') {
      return res.json({
        success: true,
        attendance: [],
        stats: {
          totalHours: 0,
          totalMinutes: 0,
          daysPresent: 0,
          daysAbsent: 0,
          missingClockIns: 0,
          missingClockOuts: 0,
          submittedCorrections: 0,
          attendanceRate: 0
        },
        period: period
      });
    }

    // Find intern
    const intern = await Staff.findById(internId).lean();
    if (!intern) {
      return res.status(404).json({
        success: false,
        error: 'Intern not found'
      });
    }

    // Calculate date range
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      if (period === 'today') {
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
      } else if (period === 'weekly') {
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        start = new Date(now.setDate(diff));
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
      } else if (period === 'monthly') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid period. Use: today, weekly, or monthly'
        });
      }
    }

    // Get clock logs
    const logs = await ClockLog.find({
      staffId: internId,
      timestamp: { $gte: start, $lte: end }
    }).sort({ timestamp: 1 }).lean();

    // Get attendance corrections count
    const correctionsCount = await AttendanceCorrection.countDocuments({
      internId: internId,
      createdAt: { $gte: start, $lte: end }
    });

    // Group logs by date
    const attendanceByDate = {};
    logs.forEach(log => {
      const dateKey = new Date(log.timestamp).toISOString().split('T')[0];
      if (!attendanceByDate[dateKey]) {
        attendanceByDate[dateKey] = {
          date: dateKey,
          clockIn: null,
          clockOut: null,
          breakStart: null,
          breakEnd: null,
          lunchStart: null,
          lunchEnd: null,
          extraShiftIn: null,
          extraShiftOut: null,
        };
      }

      if (log.clockType === 'in') {
        attendanceByDate[dateKey].clockIn = log.timestamp;
      } else if (log.clockType === 'out') {
        attendanceByDate[dateKey].clockOut = log.timestamp;
      } else if (log.clockType === 'break_start') {
        attendanceByDate[dateKey].breakStart = log.timestamp;
      } else if (log.clockType === 'break_end') {
        attendanceByDate[dateKey].breakEnd = log.timestamp;
      } else if (log.clockType === 'lunch_start') {
        attendanceByDate[dateKey].lunchStart = log.timestamp;
      } else if (log.clockType === 'lunch_end') {
        attendanceByDate[dateKey].lunchEnd = log.timestamp;
      } else if (log.clockType === 'extra_shift_in') {
        attendanceByDate[dateKey].extraShiftIn = log.timestamp;
      } else if (log.clockType === 'extra_shift_out') {
        attendanceByDate[dateKey].extraShiftOut = log.timestamp;
      }
    });

    // Calculate stats and process attendance
    let totalMinutes = 0;
    let daysPresent = 0;
    let daysAbsent = 0;
    let missingClockIns = 0;
    let missingClockOuts = 0;

    // Generate all dates in range for comprehensive analysis
    const allDates = [];
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      // Only count weekdays
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        allDates.push(dateKey);
        const dayData = attendanceByDate[dateKey] || { date: dateKey, clockIn: null, clockOut: null };

        if (dayData.clockIn) {
          daysPresent++;

          // Calculate hours for the day
          let dayMinutes = 0;
          if (dayData.clockIn && dayData.clockOut) {
            const clockInTime = new Date(dayData.clockIn).getTime();
            const clockOutTime = new Date(dayData.clockOut).getTime();
            dayMinutes = (clockOutTime - clockInTime) / (1000 * 60);

            // Subtract breaks
            if (dayData.breakStart && dayData.breakEnd) {
              const breakStart = new Date(dayData.breakStart).getTime();
              const breakEnd = new Date(dayData.breakEnd).getTime();
              dayMinutes -= (breakEnd - breakStart) / (1000 * 60);
            }

            if (dayData.lunchStart && dayData.lunchEnd) {
              const lunchStart = new Date(dayData.lunchStart).getTime();
              const lunchEnd = new Date(dayData.lunchEnd).getTime();
              dayMinutes -= (lunchEnd - lunchStart) / (1000 * 60);
            }

            // Add extra shift
            if (dayData.extraShiftIn && dayData.extraShiftOut) {
              const extraStart = new Date(dayData.extraShiftIn).getTime();
              const extraEnd = new Date(dayData.extraShiftOut).getTime();
              dayMinutes += (extraEnd - extraStart) / (1000 * 60);
            }
          } else {
            // Has clock in but no clock out
            if (dayData.clockIn && !dayData.clockOut) {
              missingClockOuts++;
            }
          }
          totalMinutes += Math.max(0, dayMinutes);
        } else {
          daysAbsent++;
          if (!dayData.clockIn && !dayData.clockOut) {
            missingClockIns++;
          }
        }

        // Check for missing clock out on present days
        if (dayData.clockIn && !dayData.clockOut) {
          missingClockOuts++;
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = Math.round(totalMinutes % 60);
    const expectedDays = allDates.length;
    const attendanceRate = expectedDays > 0 ? Math.round((daysPresent / expectedDays) * 100) : 0;

    // Format attendance data for response
    const attendanceData = Object.values(attendanceByDate)
      .filter(day => allDates.includes(day.date))
      .map(day => {
        let dayMinutes = 0;
        if (day.clockIn && day.clockOut) {
          const clockInTime = new Date(day.clockIn).getTime();
          const clockOutTime = new Date(day.clockOut).getTime();
          dayMinutes = (clockOutTime - clockInTime) / (1000 * 60);

          if (day.breakStart && day.breakEnd) {
            const breakStart = new Date(day.breakStart).getTime();
            const breakEnd = new Date(day.breakEnd).getTime();
            dayMinutes -= (breakEnd - breakStart) / (1000 * 60);
          }

          if (day.lunchStart && day.lunchEnd) {
            const lunchStart = new Date(day.lunchStart).getTime();
            const lunchEnd = new Date(day.lunchEnd).getTime();
            dayMinutes -= (lunchEnd - lunchStart) / (1000 * 60);
          }

          if (day.extraShiftIn && day.extraShiftOut) {
            const extraStart = new Date(day.extraShiftIn).getTime();
            const extraEnd = new Date(day.extraShiftOut).getTime();
            dayMinutes += (extraEnd - extraStart) / (1000 * 60);
          }
        }

        const hours = Math.floor(Math.max(0, dayMinutes) / 60);
        const mins = Math.round(Math.max(0, dayMinutes) % 60);

        return {
          date: day.date,
          clockIn: day.clockIn,
          clockOut: day.clockOut,
          breakStart: day.breakStart,
          breakEnd: day.breakEnd,
          lunchStart: day.lunchStart,
          lunchEnd: day.lunchEnd,
          extraShiftIn: day.extraShiftIn,
          extraShiftOut: day.extraShiftOut,
          hoursWorked: Math.max(0, dayMinutes) / 60,
          hoursWorkedFormatted: `${hours}h ${mins}m`,
          hasClockIn: !!day.clockIn,
          hasClockOut: !!day.clockOut,
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      attendance: attendanceData,
      stats: {
        totalHours,
        totalMinutes: Math.round(totalMinutes),
        totalHoursFormatted: `${totalHours}h ${remainingMinutes}m`,
        daysPresent,
        daysAbsent,
        missingClockIns,
        missingClockOuts,
        submittedCorrections: correctionsCount,
        attendanceRate,
        expectedDays,
      },
      period: period,
      startDate: start,
      endDate: end
    });
  } catch (error) {
    console.error('❌ Detailed attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load detailed attendance data'
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

    // Add department filter if provided - handle both name and ObjectId matching
    if (department) {
      // First, try to find if the department parameter is a name or ObjectId
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(department) && department.length === 24) {
        // It's an ObjectId - fetch the department name first
        const deptDoc = await Department.findById(department).select('name').lean();
        if (deptDoc) {
          // Match by name (case-insensitive)
          staffFilter.department = { $regex: new RegExp(`^${deptDoc.name}$`, 'i') };
        } else {
          // Invalid ObjectId, also try as ObjectId match for backward compatibility
          staffFilter.department = department;
        }
      } else {
        // It's a department name - use case-insensitive regex match
        staffFilter.department = { $regex: new RegExp(`^${department}$`, 'i') };
      }
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

    // 🔧 FIX: Resolve department IDs to department names
    // Check if any staff have department as ObjectId (24 hex characters)
    const mongoose = require('mongoose');
    const departmentIdMap = {}; // Cache for department ID -> name mapping
    const departmentIdsToResolve = new Set();

    staff.forEach(member => {
      const dept = member.department;
      if (dept && typeof dept === 'string' && mongoose.Types.ObjectId.isValid(dept) && dept.length === 24) {
        // This looks like an ObjectId - need to resolve it
        departmentIdsToResolve.add(dept);
      }
    });

    // Fetch all departments that need to be resolved
    if (departmentIdsToResolve.size > 0) {
      const departmentIdsArray = Array.from(departmentIdsToResolve);
      const departments = await Department.find({
        _id: { $in: departmentIdsArray }
      }).select('_id name').lean();

      departments.forEach(dept => {
        departmentIdMap[dept._id.toString()] = dept.name;
      });
    }

    // Helper to parse time string (HH:MM) to hour and minute
    const parseTime = (timeString) => {
      if (!timeString) return null;
      const parts = timeString.split(':');
      if (parts.length !== 2) return null;
      const hour = parseInt(parts[0], 10);
      const minute = parseInt(parts[1], 10);
      if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return null;
      }
      return { hour, minute };
    };

    // Build timesheets for each staff member
    const staffWithTimesheets = await Promise.all(staff.map(async (member) => {
      const staffId = member._id.toString();
      const logs = logsByStaffId[staffId] || [];

      // Get working hours for this staff member
      let workingHours = null;
      if (member.clockInTime && member.clockOutTime) {
        workingHours = {
          clockIn: parseTime(member.clockInTime),
          clockOut: parseTime(member.clockOutTime),
          source: 'staff'
        };
      } else if (member.hostCompanyId) {
        const hostCompanyIdValue = typeof member.hostCompanyId === 'object'
          ? member.hostCompanyId._id || member.hostCompanyId
          : member.hostCompanyId;
        const HostCompany = require('../models/HostCompany');
        const hostCompany = await HostCompany.findById(hostCompanyIdValue).lean();
        if (hostCompany && hostCompany.defaultClockInTime && hostCompany.defaultClockOutTime) {
          workingHours = {
            clockIn: parseTime(hostCompany.defaultClockInTime),
            clockOut: parseTime(hostCompany.defaultClockOutTime),
            source: 'hostCompany'
          };
        }
      }

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
            timeOut: null,
            extraHours: null,
            activities: []
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

      // Calculate Extra Hours for days with working hours but no attendance
      if (workingHours && workingHours.clockIn && workingHours.clockOut) {
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const dateKey = currentDate.toISOString().split('T')[0];
          const dayOfWeek = currentDate.getDay();
          const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

          if (isWeekday) {
            if (!timesheetByDate[dateKey]) {
              timesheetByDate[dateKey] = {
                date: dateKey,
                timeIn: null,
                startLunch: null,
                endLunch: null,
                timeOut: null,
                extraHours: null
              };
            }

            const hasClockIn = timesheetByDate[dateKey].timeIn !== null;
            if (!hasClockIn) {
              const startTimeStr = `${String(workingHours.clockIn.hour).padStart(2, '0')}:${String(workingHours.clockIn.minute).padStart(2, '0')}`;
              const endTimeStr = `${String(workingHours.clockOut.hour).padStart(2, '0')}:${String(workingHours.clockOut.minute).padStart(2, '0')}`;
              timesheetByDate[dateKey].extraHours = `Extra Hours: Was Available (${startTimeStr} - ${endTimeStr}) Not Attended`;
            }
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

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

      // 🔧 FIX: Resolve department ID to name if it's an ObjectId
      let departmentName = member.department;
      if (member.department && typeof member.department === 'string') {
        const deptId = member.department;
        // Check if it's an ObjectId (24 hex characters)
        if (mongoose.Types.ObjectId.isValid(deptId) && deptId.length === 24) {
          // It's an ObjectId - resolve to name
          departmentName = departmentIdMap[deptId] || member.department; // Fallback to original if not found
        }
        // Otherwise, it's already a name string, use it as-is
      }

      // Extract company name from populated hostCompany object
      let hostCompanyName = null;
      if (hostCompany) {
        hostCompanyName = hostCompany.companyName || hostCompany.name;
      }

      return {
        _id: member._id,
        name: member.name,
        surname: member.surname,
        idNumber: member.idNumber,
        phoneNumber: member.phoneNumber,
        role: member.role,
        department: departmentName, // 🔧 FIX: Use resolved department name instead of ID
        location: member.location,
        hostCompanyId: hostCompanyIdValue, // Include hostCompanyId (as ID)
        hostCompanyName: hostCompanyName, // 🔧 FIX: Extract company name from populated object
        hostCompany: hostCompany, // Populated hostCompany object (if populated)
        createdAt: member.createdAt,
        timesheet
      };
    }));

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

    // ⏰ WORKING HOURS: No longer hardcoded - will use staff's assigned hours or host company default
    // Tolerance window (in minutes) - allow 15 minutes before/after
    const TOLERANCE = 15;

    // Helper function to parse time string (HH:MM) to hour and minute
    const parseTime = (timeString) => {
      if (!timeString) return null;
      const parts = timeString.split(':');
      if (parts.length !== 2) return null;
      const hour = parseInt(parts[0], 10);
      const minute = parseInt(parts[1], 10);
      if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return null;
      }
      return { hour, minute };
    };

    // Helper function to get working hours for a staff member
    // Returns staff's assigned hours if available, otherwise falls back to host company default
    const getWorkingHours = async (staffMember) => {
      // Check if staff has assigned hours
      if (staffMember.clockInTime && staffMember.clockOutTime) {
        return {
          clockIn: parseTime(staffMember.clockInTime),
          clockOut: parseTime(staffMember.clockOutTime),
          startBreak: parseTime(staffMember.breakStartTime),
          endBreak: parseTime(staffMember.breakEndTime),
          source: 'staff' // Indicates these are staff-specific hours
        };
      }

      // Fall back to host company default hours
      if (staffMember.hostCompanyId) {
        const HostCompany = require('../models/HostCompany');
        const hostCompany = await HostCompany.findById(staffMember.hostCompanyId).lean();
        if (hostCompany && hostCompany.defaultClockInTime && hostCompany.defaultClockOutTime) {
          return {
            clockIn: parseTime(hostCompany.defaultClockInTime),
            clockOut: parseTime(hostCompany.defaultClockOutTime),
            startBreak: parseTime(hostCompany.defaultBreakStartTime),
            endBreak: parseTime(hostCompany.defaultBreakEndTime),
            source: 'hostCompany' // Indicates these are company default hours
          };
        }
      }

      // No hours assigned - return null (will skip validation for this staff)
      return null;
    };

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
    // Include hostCompanyId, role, and department fields for staff
    const [allLogs, allStaff] = await Promise.all([
      ClockLog.find(clockLogFilter)
        .select('staffId staffName clockType timestamp')
        .sort({ timestamp: 1 })
        .lean(), // Use lean() - we don't need Mongoose documents

      Staff.find(staffFilter)
        .select('_id name role department hostCompanyId clockInTime clockOutTime breakStartTime breakEndTime')
        .lean()
    ]);

    // Fetch host company names for all staff
    const hostCompanyIds = [...new Set(allStaff.map(s => s.hostCompanyId).filter(Boolean))];
    const hostCompanyMap = {};
    if (hostCompanyIds.length > 0) {
      const HostCompany = require('../models/HostCompany');
      const hostCompanies = await HostCompany.find({ _id: { $in: hostCompanyIds } })
        .select('_id companyName name')
        .lean();
      hostCompanies.forEach(hc => {
        hostCompanyMap[hc._id.toString()] = hc.companyName || hc.name;
      });
    }

    // Resolve department IDs to names
    const departmentIds = [...new Set(allStaff.map(s => {
      const dept = s.department;
      if (dept && typeof dept === 'string' && mongoose.Types.ObjectId.isValid(dept) && dept.length === 24) {
        return dept;
      }
      return null;
    }).filter(Boolean))];

    const departmentNameMap = {};
    if (departmentIds.length > 0) {
      const departments = await Department.find({ _id: { $in: departmentIds } })
        .select('_id name')
        .lean();
      departments.forEach(dept => {
        departmentNameMap[dept._id.toString()] = dept.name;
      });
    }

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

    // Check each staff member (using async/await for working hours lookup)
    for (const staff of allStaff) {
      const staffId = staff._id.toString();
      const logs = staffLogs[staffId] || [];

      // ⏰ Get working hours for this staff member (staff-specific or host company default)
      const workingHours = await getWorkingHours(staff);

      // Skip validation if no working hours are assigned (neither staff nor host company)
      if (!workingHours) {
        console.warn(`⚠️ No working hours assigned for ${staff.name} (ID: ${staffId}) - skipping time validation`);
        continue;
      }

      // Resolve department name if needed
      let departmentName = staff.department;
      if (staff.department && typeof staff.department === 'string') {
        const deptId = staff.department;
        if (mongoose.Types.ObjectId.isValid(deptId) && deptId.length === 24) {
          departmentName = departmentNameMap[deptId] || staff.department;
        }
      }

      // Get host company name
      const hostCompanyName = staff.hostCompanyId ? hostCompanyMap[staff.hostCompanyId.toString()] : null;

      // Helper to format expected time for display
      const formatExpectedTime = (hour, minute) => {
        const time = new Date(targetDate);
        time.setHours(hour, minute, 0, 0);
        return time.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      };

      // Helper to add standard fields to notAccountable entries
      const createNotAccountableEntry = (baseEntry) => {
        return {
          ...baseEntry,
          staffId: staff._id,
          role: staff.role,
          department: departmentName,
          hostCompanyName: hostCompanyName
        };
      };

      // Check if clock-in exists and is at wrong time
      const clockInLog = logs.find(log => log.clockType === 'in');
      if (!clockInLog) {
        notAccountable.push(createNotAccountableEntry({
          staffName: staff.name,
          reason: 'No clock-in recorded',
          details: 'Staff member did not clock in',
          expectedClockIn: workingHours.clockIn ? formatExpectedTime(workingHours.clockIn.hour, workingHours.clockIn.minute) : 'N/A'
        }));
      } else if (workingHours.clockIn) {
        const clockInTime = new Date(clockInLog.timestamp);
        const expectedTime = new Date(targetDate);
        expectedTime.setHours(workingHours.clockIn.hour, workingHours.clockIn.minute, 0, 0);

        const diffMinutes = (clockInTime - expectedTime) / (1000 * 60);
        // Only flag LATE clock-ins (after expected time + tolerance), not early ones
        // Early clock-ins are allowed but not flagged
        if (diffMinutes > TOLERANCE) {
          const actualTime = clockInTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          const expectedTimeStr = formatExpectedTime(workingHours.clockIn.hour, workingHours.clockIn.minute);
          notAccountable.push(createNotAccountableEntry({
            staffName: staff.name,
            reason: `Clock-in at wrong time: ${actualTime} (Expected: ${expectedTimeStr})`,
            details: `Clocked in at ${actualTime} instead of ${expectedTimeStr}`,
            clockInTime: actualTime,
            clockInTimestamp: clockInLog.timestamp,
            expectedClockIn: expectedTimeStr
          }));
        }
      }

      // Check break start time
      const breakStartLog = logs.find(log => log.clockType === 'break_start');
      if (breakStartLog && workingHours.startBreak) {
        const breakStartTime = new Date(breakStartLog.timestamp);
        const expectedTime = new Date(targetDate);
        expectedTime.setHours(workingHours.startBreak.hour, workingHours.startBreak.minute, 0, 0);

        const diffMinutes = (breakStartTime - expectedTime) / (1000 * 60);
        // Only flag LATE break starts, not early ones
        if (diffMinutes > TOLERANCE) {
          const actualTime = breakStartTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          const expectedTimeStr = formatExpectedTime(workingHours.startBreak.hour, workingHours.startBreak.minute);
          notAccountable.push(createNotAccountableEntry({
            staffName: staff.name,
            reason: `Start break at wrong time: ${actualTime} (Expected: ${expectedTimeStr})`,
            details: `Started break at ${actualTime} instead of ${expectedTimeStr}`,
            breakStartTime: actualTime,
            breakStartTimestamp: breakStartLog.timestamp,
            expectedBreakStart: expectedTimeStr
          }));
        }
      }

      // Check break end time
      const breakEndLog = logs.find(log => log.clockType === 'break_end');
      if (breakEndLog && workingHours.endBreak) {
        const breakEndTime = new Date(breakEndLog.timestamp);
        const expectedTime = new Date(targetDate);
        expectedTime.setHours(workingHours.endBreak.hour, workingHours.endBreak.minute, 0, 0);

        const diffMinutes = (breakEndTime - expectedTime) / (1000 * 60);
        // Only flag LATE break ends, not early ones
        if (diffMinutes > TOLERANCE) {
          const actualTime = breakEndTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          const expectedTimeStr = formatExpectedTime(workingHours.endBreak.hour, workingHours.endBreak.minute);
          notAccountable.push(createNotAccountableEntry({
            staffName: staff.name,
            reason: `End break at wrong time: ${actualTime} (Expected: ${expectedTimeStr})`,
            details: `Ended break at ${actualTime} instead of ${expectedTimeStr}`,
            breakEndTime: actualTime,
            breakEndTimestamp: breakEndLog.timestamp,
            expectedBreakEnd: expectedTimeStr
          }));
        }
      }

      // Check clock-out time
      const clockOutLog = logs.find(log => log.clockType === 'out');
      if (clockOutLog && workingHours.clockOut) {
        const clockOutTime = new Date(clockOutLog.timestamp);
        const expectedTime = new Date(targetDate);
        expectedTime.setHours(workingHours.clockOut.hour, workingHours.clockOut.minute, 0, 0);

        const diffMinutes = (clockOutTime - expectedTime) / (1000 * 60);
        // Only flag LATE clock-outs, not early ones
        if (diffMinutes > TOLERANCE) {
          const actualTime = clockOutTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          const expectedTimeStr = formatExpectedTime(workingHours.clockOut.hour, workingHours.clockOut.minute);
          notAccountable.push(createNotAccountableEntry({
            staffName: staff.name,
            reason: `Clock-out at wrong time: ${actualTime} (Expected: ${expectedTimeStr})`,
            details: `Clocked out at ${actualTime} instead of ${expectedTimeStr}`,
            clockOutTime: actualTime,
            clockOutTimestamp: clockOutLog.timestamp,
            expectedClockOut: expectedTimeStr
          }));
        }
      }
    }

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

    // Helper to parse time string (HH:MM) to hour and minute
    const parseTime = (timeString) => {
      if (!timeString) return null;
      const parts = timeString.split(':');
      if (parts.length !== 2) return null;
      const hour = parseInt(parts[0], 10);
      const minute = parseInt(parts[1], 10);
      if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return null;
      }
      return { hour, minute };
    };

    // Get working hours for staff (staff-specific or host company default)
    let workingHours = null;
    if (staff.clockInTime && staff.clockOutTime) {
      workingHours = {
        clockIn: parseTime(staff.clockInTime),
        clockOut: parseTime(staff.clockOutTime),
        source: 'staff'
      };
    } else if (staff.hostCompanyId) {
      const HostCompany = require('../models/HostCompany');
      const hostCompany = await HostCompany.findById(staff.hostCompanyId).lean();
      if (hostCompany && hostCompany.defaultClockInTime && hostCompany.defaultClockOutTime) {
        workingHours = {
          clockIn: parseTime(hostCompany.defaultClockInTime),
          clockOut: parseTime(hostCompany.defaultClockOutTime),
          source: 'hostCompany'
        };
      }
    }

    // Check for Extra Hours (working hours set but no clock-in)
    let extraHours = null;
    if (workingHours && workingHours.clockIn && workingHours.clockOut) {
      const dayOfWeek = targetDate.getDay();
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
      const hasClockIn = logs.some(log => log.clockType === 'in');

      if (isWeekday && !hasClockIn) {
        const startTimeStr = `${String(workingHours.clockIn.hour).padStart(2, '0')}:${String(workingHours.clockIn.minute).padStart(2, '0')}`;
        const endTimeStr = `${String(workingHours.clockOut.hour).padStart(2, '0')}:${String(workingHours.clockOut.minute).padStart(2, '0')}`;
        extraHours = `Extra Hours: Was Available (${startTimeStr} - ${endTimeStr}) Not Attended`;
      }
    }

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
      },
      extraHours: extraHours
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

    // Run lightweight validation (detection only, no embedding)
    const validationResult = await validatePreview(req.file.buffer);

    console.log(`   ✅ Preview validation complete:`, {
      ready: validationResult.ready,
      quality: validationResult.quality,
      issues: validationResult.issues,
      feedback: validationResult.feedback,
      gender: validationResult.metadata?.gender || 'NOT_FOUND',
      genderConfidence: validationResult.metadata?.genderConfidence || 'NOT_FOUND'
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

// ========== INTERN ATTENDANCE CORRECTIONS & LEAVE APPLICATIONS ==========

// Create attendance correction
router.post('/intern/attendance-corrections', async (req, res) => {
  try {
    const { internId, internName, date, correctionType, requestedChange, hostCompanyId } = req.body;

    if (!internId || !internName || !date || !correctionType || !requestedChange?.description || !hostCompanyId) {
      return res.status(400).json({
        success: false,
        error: 'internId, internName, date, correctionType, description, and hostCompanyId are required',
      });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
      });
    }

    // Handle test accounts - return success without saving to database
    if (internId === 'test_intern_id') {
      return res.status(201).json({
        success: true,
        correction: {
          internId: 'test_intern_id',
          internName,
          date: parsedDate,
          correctionType,
          requestedChange,
          hostCompanyId: null,
          status: 'pending',
          createdAt: new Date(),
        },
        message: 'Test account - correction not saved to database',
      });
    }

    const correction = new AttendanceCorrection({
      internId,
      internName,
      date: parsedDate,
      correctionType,
      requestedChange,
      hostCompanyId,
    });

    await correction.save();

    // 🔔 LOG ACTION FOR REAL-TIME NOTIFICATIONS
    await logAction('ATTENDANCE_CORRECTION_REQUEST', {
      staffId: internId,
      staffName: internName,
      date: parsedDate,
      correctionType: correctionType,
      description: requestedChange?.description,
      originalTime: requestedChange?.originalTime,
      correctedTime: requestedChange?.requestedTime,
      reason: requestedChange?.reason,
      hostCompanyId: hostCompanyId?.toString(),
      attendanceCorrectionId: correction._id?.toString()
    }, null);

    res.status(201).json({
      success: true,
      correction,
    });
  } catch (error) {
    console.error('❌ Create attendance correction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit attendance correction',
    });
  }
});

// List attendance corrections for an intern
router.get('/intern/attendance-corrections', async (req, res) => {
  try {
    const { internId } = req.query;

    if (!internId) {
      return res.status(400).json({
        success: false,
        error: 'internId is required',
      });
    }

    // Handle test accounts - return empty array
    if (internId === 'test_intern_id') {
      return res.json({
        success: true,
        corrections: [],
      });
    }

    const corrections = await AttendanceCorrection.find({ internId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      corrections,
    });
  } catch (error) {
    console.error('❌ List attendance corrections error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load attendance corrections',
    });
  }
});

// Get attendance corrections for admin or host company
router.get('/admin/attendance-corrections', async (req, res) => {
  try {
    const { hostCompanyId, status, reviewerRole } = req.query;

    // Build filter - admin can see all, host company only sees their own
    const filter = {};
    if (hostCompanyId) {
      if (!mongoose.Types.ObjectId.isValid(hostCompanyId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid host company ID format',
        });
      }
      filter.hostCompanyId = hostCompanyId;
    }

    // Filter by status if provided
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const corrections = await AttendanceCorrection.find(filter)
      .populate('internId', 'name surname idNumber department hostCompanyId phoneNumber location')
      .populate('hostCompanyId', 'name companyName')
      .sort({ createdAt: -1 })
      .lean();

    const annotated = corrections.map(corr => {
      const belongsToHost =
        hostCompanyId && corr.hostCompanyId && corr.hostCompanyId._id && corr.hostCompanyId._id.toString() === hostCompanyId;
      const adminOwns = !corr.hostCompanyId || !corr.hostCompanyId._id; // Admin-registered interns have no host company
      const canReview =
        reviewerRole === 'hostCompany' ? belongsToHost : reviewerRole === 'admin' ? adminOwns : true; // Admin can review all

      const hostCompanyName =
        corr.hostCompanyId && (corr.hostCompanyId.companyName || corr.hostCompanyId.name)
          ? (corr.hostCompanyId.companyName || corr.hostCompanyId.name)
          : null;

      const internName = corr.internId
        ? `${corr.internId.name || ''} ${corr.internId.surname || ''}`.trim() || corr.internName
        : corr.internName;

      return {
        ...corr,
        canReview,
        hostCompanyName,
        internName,
      };
    });

    res.json({
      success: true,
      corrections: annotated,
    });
  } catch (error) {
    console.error('❌ Get attendance corrections error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load attendance corrections',
    });
  }
});

// Approve or reject attendance correction
router.put('/admin/attendance-corrections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason, reviewedBy, reviewerRole, reviewerHostCompanyId } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'action is required and must be "approve" or "reject"',
      });
    }

    if (action === 'reject' && (!rejectionReason || !rejectionReason.trim())) {
      return res.status(400).json({
        success: false,
        error: 'rejectionReason is required when rejecting a correction',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid correction ID format',
      });
    }

    const correction = await AttendanceCorrection.findById(id);
    if (!correction) {
      return res.status(404).json({
        success: false,
        error: 'Attendance correction not found',
      });
    }

    // Permission check
    const belongsToHost =
      reviewerHostCompanyId &&
      correction.hostCompanyId &&
      correction.hostCompanyId.toString() === reviewerHostCompanyId;
    const adminOwns = !correction.hostCompanyId; // Admin-created interns have no host

    const canReview =
      reviewerRole === 'hostCompany'
        ? belongsToHost
        : reviewerRole === 'admin'
          ? true // Admin can review all
          : false;

    if (!canReview) {
      return res.status(403).json({
        success: false,
        error: 'You are not allowed to approve/reject this correction',
      });
    }

    // Update correction status
    correction.status = action === 'approve' ? 'approved' : 'rejected';
    correction.reviewedAt = new Date();

    if (reviewedBy && mongoose.Types.ObjectId.isValid(reviewedBy)) {
      correction.reviewedBy = reviewedBy;
    }

    if (action === 'reject') {
      correction.rejectionReason = rejectionReason.trim();
    } else {
      correction.rejectionReason = undefined;
    }

    await correction.save();

    // 🔔 LOG ACTION FOR REAL-TIME NOTIFICATIONS
    const actionType = action === 'approve' ? 'CORRECTION_APPROVED' : 'CORRECTION_REJECTED';
    await logAction(actionType, {
      staffId: correction.internId?.toString(),
      staffName: correction.internName,
      date: correction.date,
      correctionType: correction.correctionType,
      originalTime: correction.requestedChange?.originalTime,
      correctedTime: correction.requestedChange?.requestedTime,
      attendanceCorrectionId: correction._id?.toString(),
      hostCompanyId: correction.hostCompanyId?.toString(),
      rejectionReason: action === 'reject' ? rejectionReason : undefined,
      reviewedBy: reviewedBy,
      reviewerRole: reviewerRole
    }, reviewedBy);

    res.json({
      success: true,
      correction,
      message: `Attendance correction ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error) {
    console.error('❌ Update attendance correction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update attendance correction',
    });
  }
});

// Create leave application
router.post('/intern/leave-applications', async (req, res) => {
  try {
    const {
      internId,
      internName,
      leaveType,
      startDate,
      endDate,
      reason,
      hostCompanyId,
      supportingDocuments = [],
      createdByRole = 'intern',
      createdById
    } = req.body;

    console.log('📝 Leave application request:', {
      internId,
      internName,
      leaveType,
      startDate,
      endDate,
      reason: reason ? 'provided' : 'missing',
      hostCompanyId,
      createdByRole,
      createdById,
      supportingDocumentsCount: supportingDocuments.length
    });

    if (!internId || !internName || !leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        error: 'internId, internName, leaveType, startDate, endDate, and reason are required',
      });
    }

    // Validate internId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(internId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid intern ID format',
      });
    }

    // Fetch the intern record to get their hostCompanyId if not provided
    const Staff = require('../models/Staff');
    const intern = await Staff.findById(internId);

    if (!intern) {
      return res.status(404).json({
        success: false,
        error: 'Intern not found',
      });
    }

    // Use the intern's hostCompanyId from their record (the company that registered them)
    let validatedHostCompanyId = hostCompanyId || intern.hostCompanyId;

    // Validate hostCompanyId if provided (should be valid ObjectId)
    if (validatedHostCompanyId) {
      if (!mongoose.Types.ObjectId.isValid(validatedHostCompanyId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid host company ID format',
        });
      }
    }

    console.log('📝 Using hostCompanyId:', validatedHostCompanyId, '(from:', hostCompanyId ? 'request' : 'intern record', ')');

    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);

    if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid startDate or endDate format',
      });
    }

    if (parsedEnd < parsedStart) {
      return res.status(400).json({
        success: false,
        error: 'endDate cannot be before startDate',
      });
    }

    // Auto-calculate number of days (inclusive calendar days)
    const msPerDay = 1000 * 60 * 60 * 24;
    const numberOfDays = Math.max(1, Math.round((parsedEnd - parsedStart) / msPerDay) + 1);

    // Validate supporting documents for sick leave
    if (leaveType === 'Sick' && (!Array.isArray(supportingDocuments) || supportingDocuments.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Supporting document is required for Sick leave',
      });
    }

    // Map and sanitize supporting documents
    const normalizedDocs = Array.isArray(supportingDocuments)
      ? supportingDocuments
        .filter(doc => doc && doc.fileName && doc.fileUrl && doc.fileType)
        .map(doc => ({
          fileName: doc.fileName,
          fileUrl: doc.fileUrl,
          fileType: doc.fileType,
          uploadedAt: new Date()
        }))
      : [];

    // Handle test accounts - return success without saving to database
    if (internId === 'test_intern_id') {
      return res.status(201).json({
        success: true,
        application: {
          internId: 'test_intern_id',
          internName,
          leaveType,
          startDate: parsedStart,
          endDate: parsedEnd,
          numberOfDays,
          reason,
          hostCompanyId: validatedHostCompanyId,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          supportingDocuments: normalizedDocs
        },
        message: 'Test account - application not saved to database',
      });
    }

    const application = new LeaveApplication({
      internId,
      internName,
      leaveType,
      startDate: parsedStart,
      endDate: parsedEnd,
      numberOfDays,
      reason,
      hostCompanyId: validatedHostCompanyId,
      supportingDocuments: normalizedDocs,
      createdByRole,
      createdById: mongoose.Types.ObjectId.isValid(createdById) ? createdById : undefined
    });

    await application.save();

    // 🔔 LOG ACTION FOR REAL-TIME NOTIFICATIONS
    await logAction('LEAVE_REQUEST', {
      staffId: internId,
      staffName: internName,
      leaveType: leaveType,
      startDate: parsedStart,
      endDate: parsedEnd,
      numberOfDays: numberOfDays,
      reason: reason,
      hostCompanyId: validatedHostCompanyId?.toString(),
      leaveApplicationId: application._id?.toString()
    }, createdById);

    res.status(201).json({
      success: true,
      application,
    });
  } catch (error) {
    console.error('❌ Create leave application error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit leave application',
    });
  }
});

// List leave applications for an intern
router.get('/intern/leave-applications', async (req, res) => {
  try {
    const { internId } = req.query;

    if (!internId) {
      return res.status(400).json({
        success: false,
        error: 'internId is required',
      });
    }

    // Handle test accounts - return empty array
    if (internId === 'test_intern_id') {
      return res.json({
        success: true,
        applications: [],
      });
    }

    const applications = await LeaveApplication.find({ internId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      applications,
    });
  } catch (error) {
    console.error('❌ List leave applications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load leave applications',
    });
  }
});

// Upload intern profile picture
router.post('/intern/upload-profile-picture', upload.single('profilePicture'), async (req, res) => {
  try {
    const { internId } = req.query;

    console.log('📸 Profile picture upload request received');
    console.log('📸 Intern ID from query:', internId);
    console.log('📸 File info:', req.file ? { name: req.file.originalname, size: req.file.size } : 'No file');

    if (!internId) {
      return res.status(400).json({
        success: false,
        error: 'Intern ID is required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(internId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid intern ID format',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image provided',
      });
    }

    // Find the staff member (intern)
    const intern = await Staff.findById(internId);
    if (!intern) {
      return res.status(404).json({
        success: false,
        error: 'Intern not found',
      });
    }

    // Process and optimize image
    const processedImage = await sharp(req.file.buffer)
      .resize(256, 256, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 90, progressive: true })
      .toBuffer();

    // Convert to base64 for storage
    const base64Image = processedImage.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    // Update staff record with profile picture
    intern.profilePicture = dataUrl;
    await intern.save();

    // Log the action (wrapped in try-catch to not break upload on logging failure)
    try {
      await logAction({
        userId: internId,
        action: 'PROFILE_PICTURE_UPLOAD',
        message: `Profile picture uploaded: ${req.file.originalname}`,
        details: {
          fileName: req.file.originalname,
          fileSize: req.file.size,
        },
        status: 'success',
      });
    } catch (logError) {
      console.warn('⚠️ Action logging failed (non-critical):', logError.message);
    }

    console.log(`✅ Profile picture uploaded for intern ${internId}`);

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      profilePicture: dataUrl,
    });
  } catch (error) {
    console.error('❌ Profile picture upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload profile picture',
    });
  }
});

// Get leave applications for admin or host company
router.get('/admin/leave-applications', async (req, res) => {
  try {
    const { hostCompanyId, status, reviewerRole } = req.query;

    // Build filter - admin can see all, host company only sees their own
    const filter = {};
    if (hostCompanyId) {
      if (!mongoose.Types.ObjectId.isValid(hostCompanyId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid host company ID format',
        });
      }
      filter.hostCompanyId = hostCompanyId;
    }

    // Filter by status if provided
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const applications = await LeaveApplication.find(filter)
      .populate('internId', 'name surname idNumber department hostCompanyId phoneNumber location')
      .populate('hostCompanyId', 'name companyName')
      .sort({ createdAt: -1 })
      .lean();

    const annotated = applications.map(app => {
      const belongsToHost =
        hostCompanyId && app.hostCompanyId && app.hostCompanyId._id && app.hostCompanyId._id.toString() === hostCompanyId;
      const adminOwns = !app.hostCompanyId || !app.hostCompanyId._id; // Admin-registered interns have no host company
      const canReview =
        reviewerRole === 'hostCompany' ? belongsToHost : reviewerRole === 'admin' ? adminOwns : false;

      const hostCompanyName =
        app.hostCompanyId && (app.hostCompanyId.companyName || app.hostCompanyId.name)
          ? (app.hostCompanyId.companyName || app.hostCompanyId.name)
          : null;

      return {
        ...app,
        canReview,
        hostCompanyName,
      };
    });

    res.json({
      success: true,
      applications: annotated,
    });
  } catch (error) {
    console.error('❌ Get leave applications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load leave applications',
    });
  }
});

// Approve or reject leave application
router.put('/admin/leave-applications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason, reviewedBy, reviewerRole, reviewerHostCompanyId } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'action is required and must be "approve" or "reject"',
      });
    }

    if (action === 'reject' && (!rejectionReason || !rejectionReason.trim())) {
      return res.status(400).json({
        success: false,
        error: 'rejectionReason is required when rejecting an application',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid application ID format',
      });
    }

    const application = await LeaveApplication.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Leave application not found',
      });
    }

    // Permission check
    const belongsToHost =
      reviewerHostCompanyId &&
      application.hostCompanyId &&
      application.hostCompanyId.toString() === reviewerHostCompanyId;
    const adminOwns = !application.hostCompanyId; // Admin-created interns have no host

    const canReview =
      reviewerRole === 'hostCompany'
        ? belongsToHost
        : reviewerRole === 'admin'
          ? adminOwns
          : false;

    if (!canReview) {
      return res.status(403).json({
        success: false,
        error: 'You are not allowed to approve/reject this application',
      });
    }

    // Update application status
    application.status = action === 'approve' ? 'approved' : 'rejected';
    application.reviewedAt = new Date();

    if (reviewedBy && mongoose.Types.ObjectId.isValid(reviewedBy)) {
      application.reviewedBy = reviewedBy;
    }

    if (action === 'reject') {
      application.rejectionReason = rejectionReason.trim();
    } else {
      application.rejectionReason = undefined;
    }

    await application.save();

    // 🔔 LOG ACTION FOR REAL-TIME NOTIFICATIONS
    const actionType = action === 'approve' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED';
    await logAction(actionType, {
      staffId: application.internId?.toString(),
      staffName: application.internName,
      leaveType: application.leaveType,
      startDate: application.startDate,
      endDate: application.endDate,
      leaveApplicationId: application._id?.toString(),
      hostCompanyId: application.hostCompanyId?.toString(),
      rejectionReason: action === 'reject' ? rejectionReason : undefined,
      reviewedBy: reviewedBy,
      reviewerRole: reviewerRole
    }, reviewedBy);

    res.json({
      success: true,
      application,
      message: `Leave application ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error) {
    console.error('❌ Update leave application error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update leave application',
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

    // Helper to parse time string (HH:MM) to hour and minute
    const parseTime = (timeString) => {
      if (!timeString) return null;
      const parts = timeString.split(':');
      if (parts.length !== 2) return null;
      const hour = parseInt(parts[0], 10);
      const minute = parseInt(parts[1], 10);
      if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return null;
      }
      return { hour, minute };
    };

    // Get working hours for staff (staff-specific or host company default)
    let workingHours = null;
    if (staff.clockInTime && staff.clockOutTime) {
      workingHours = {
        clockIn: parseTime(staff.clockInTime),
        clockOut: parseTime(staff.clockOutTime),
        source: 'staff'
      };
    } else if (staff.hostCompanyId) {
      const HostCompany = require('../models/HostCompany');
      const hostCompany = await HostCompany.findById(staff.hostCompanyId).lean();
      if (hostCompany && hostCompany.defaultClockInTime && hostCompany.defaultClockOutTime) {
        workingHours = {
          clockIn: parseTime(hostCompany.defaultClockInTime),
          clockOut: parseTime(hostCompany.defaultClockOutTime),
          source: 'hostCompany'
        };
      }
    }

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
          timeOut: null,
          extraHours: null,
          activities: []
        };
      }

      const timeStr = new Date(log.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      const entry = timesheetByDate[dateKey];
      entry.activities.push({
        clockType: log.clockType,
        timestamp: log.timestamp,
        time: timeStr,
        confidence: log.confidence
      });

      if (log.clockType === 'in') {
        entry.timeIn = timeStr;
      } else if (log.clockType === 'break_start') {
        entry.startLunch = timeStr;
      } else if (log.clockType === 'break_end') {
        entry.endLunch = timeStr;
      } else if (log.clockType === 'out') {
        entry.timeOut = timeStr;
      }
    });

    // Calculate Extra Hours for days with working hours but no attendance
    if (workingHours && workingHours.clockIn && workingHours.clockOut) {
      // Generate all dates in the period
      const allDates = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday

        if (isWeekday) {
          // Check if this date already has a timesheet entry
          if (!timesheetByDate[dateKey]) {
            timesheetByDate[dateKey] = {
              date: dateKey,
              timeIn: null,
              startLunch: null,
              endLunch: null,
              timeOut: null,
              extraHours: null,
              activities: []
            };
          }

          // Check if there was a clock-in on this day
          const hasClockIn = timesheetByDate[dateKey].timeIn !== null;

          // If no clock-in and working hours are set, mark as extra hours not attended
          if (!hasClockIn) {
            const startTimeStr = `${String(workingHours.clockIn.hour).padStart(2, '0')}:${String(workingHours.clockIn.minute).padStart(2, '0')}`;
            const endTimeStr = `${String(workingHours.clockOut.hour).padStart(2, '0')}:${String(workingHours.clockOut.minute).padStart(2, '0')}`;
            timesheetByDate[dateKey].extraHours = `Extra Hours: Was Available (${startTimeStr} - ${endTimeStr}) Not Attended`;
          }
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

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
          confidence: {},
          activities: []
        };
      }

      const timeStr = new Date(log.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      const entry = timesheetsByStaff[staffId].timesheet[dateKey];
      entry.activities.push({
        clockType: log.clockType,
        timestamp: log.timestamp,
        time: timeStr,
        confidence: log.confidence
      });

      if (log.clockType === 'in') {
        entry.timeIn = timeStr;
        entry.confidence.timeIn = log.confidence;
      } else if (log.clockType === 'break_start') {
        entry.startLunch = timeStr;
        entry.confidence.startLunch = log.confidence;
      } else if (log.clockType === 'break_end') {
        entry.endLunch = timeStr;
        entry.confidence.endLunch = log.confidence;
      } else if (log.clockType === 'out') {
        entry.timeOut = timeStr;
        entry.confidence.timeOut = log.confidence;
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

// 🎯 STRATEGIC ENDPOINT: Get all departments WITH intern counts
// This endpoint efficiently calculates intern counts for each department
router.get('/admin/departments-with-counts', async (req, res) => {
  try {
    const { hostCompanyId } = req.query;

    // Build filter - host company users can only see their own departments
    const filter = {};
    if (hostCompanyId) {
      if (!mongoose.Types.ObjectId.isValid(hostCompanyId)) {
        return res.status(400).json({ error: 'Invalid host company ID format' });
      }
      filter.hostCompanyId = hostCompanyId;
    }

    const departments = await Department.find(filter)
      .sort({ name: 1 })
      .lean();

    // 🔧 Efficiently count interns for each department
    const departmentsWithCounts = await Promise.all(
      departments.map(async (dept) => {
        try {
          // First, get all interns in the system (active only)
          const allInterns = await Staff.find({
            role: 'Intern',
            isActive: true
          }).select('department').lean();

          // Normalize department name for matching
          const normalizedDeptName = dept.name.trim().toLowerCase();

          // Count interns where department matches (normalized)
          const internCount = allInterns.filter(staff => {
            if (!staff.department) return false;
            const normalizedStaffDept = staff.department.trim().toLowerCase();
            return normalizedStaffDept === normalizedDeptName;
          }).length;

          if (internCount > 0 || dept.name === 'HR & ADMIN') {
            console.log(`📊 Department "${dept.name}": ${internCount} interns (normalized match)`);
          }

          return {
            ...dept,
            internCount
          };
        } catch (error) {
          console.error(`❌ Error counting interns for department "${dept.name}":`, error.message);
          return {
            ...dept,
            internCount: 0
          };
        }
      })
    );

    const totalInterns = departmentsWithCounts.reduce((sum, d) => sum + (d.internCount || 0), 0);
    console.log(`📊 Fetched ${departmentsWithCounts.length} departments with ${totalInterns} total interns`);

    res.json({
      success: true,
      departments: departmentsWithCounts
    });
  } catch (error) {
    console.error('❌ Error fetching departments with counts:', error.message);
    res.status(500).json({ error: 'Failed to fetch departments with counts' });
  }
});

// 🔍 DIAGNOSTIC ENDPOINT: Get data structure info for debugging
// This helps understand the actual department/staff data format
router.get('/admin/debug/department-staff-mapping', async (req, res) => {
  try {
    console.log('🔍 Running diagnostic: Department-Staff mapping');

    // Get all departments
    const departments = await Department.find().select('name').lean();
    console.log(`📋 Total departments: ${departments.length}`);

    // Get all interns
    const allStaff = await Staff.find({ isActive: true }).select('name role department').lean();
    const interns = allStaff.filter(s => s.role === 'Intern');
    console.log(`👥 Total interns (active): ${interns.length}`);

    // Group interns by department
    const internsByDept = {};
    interns.forEach(intern => {
      const dept = intern.department || 'UNASSIGNED';
      if (!internsByDept[dept]) {
        internsByDept[dept] = [];
      }
      internsByDept[dept].push(intern.name);
    });

    console.log('📊 Interns by department:');
    Object.keys(internsByDept).forEach(dept => {
      console.log(`  - "${dept}": ${internsByDept[dept].length} interns`);
    });

    res.json({
      success: true,
      departments: departments.map(d => d.name),
      internsByDepartment: internsByDept,
      totalDepartments: departments.length,
      totalInterns: interns.length
    });
  } catch (error) {
    console.error('❌ Error in diagnostic:', error.message);
    res.status(500).json({ error: 'Failed to run diagnostic' });
  }
});

// Get single department by ID
router.get('/admin/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid department ID format'
      });
    }

    const department = await Department.findById(id).lean();

    if (!department) {
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }

    // Note: Department has mentorName field separately, which is correct
    // But if it's empty, we might need to get from the host company
    // For now, return as-is since departments have their own mentorName field
    res.json({
      success: true,
      department
    });
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch department'
    });
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
    const message = error?.message || String(error);
    console.error('Error fetching host companies:', error);
    res.status(500).json({ error: 'Failed to fetch host companies', details: message });
  }
});

// Get single host company
router.get('/admin/host-companies/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid host company ID format'
      });
    }

    const company = await HostCompany.findById(id).select('-password').lean();

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Host company not found'
      });
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

    // IMPORTANT: 'name' field is the mentor name, 'companyName' is the actual company name
    // Return name as mentorName for frontend compatibility
    res.json({
      success: true,
      company: {
        ...company,
        mentorName: company.name, // name field IS the mentor name
        departmentCount,
        internCount
      }
    });
  } catch (error) {
    console.error('Error fetching host company:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch host company'
    });
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
      password,
      defaultClockInTime,
      defaultClockOutTime,
      defaultBreakStartTime,
      defaultBreakEndTime
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

    // ⏰ VALIDATE DEFAULT WORKING HOURS: Validate time format if provided (HH:MM format)
    const timeFormatRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (defaultClockInTime && !timeFormatRegex.test(defaultClockInTime.trim())) {
      return res.status(400).json({ error: 'Default clock-in time must be in HH:MM format (24-hour, e.g., "07:30")' });
    }
    if (defaultClockOutTime && !timeFormatRegex.test(defaultClockOutTime.trim())) {
      return res.status(400).json({ error: 'Default clock-out time must be in HH:MM format (24-hour, e.g., "16:30")' });
    }
    if (defaultBreakStartTime && !timeFormatRegex.test(defaultBreakStartTime.trim())) {
      return res.status(400).json({ error: 'Default break start time must be in HH:MM format (24-hour, e.g., "13:00")' });
    }
    if (defaultBreakEndTime && !timeFormatRegex.test(defaultBreakEndTime.trim())) {
      return res.status(400).json({ error: 'Default break end time must be in HH:MM format (24-hour, e.g., "14:00")' });
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
      // ⏰ DEFAULT WORKING HOURS: Store default working hours for this host company
      defaultClockInTime: defaultClockInTime && defaultClockInTime.trim() ? defaultClockInTime.trim() : undefined,
      defaultClockOutTime: defaultClockOutTime && defaultClockOutTime.trim() ? defaultClockOutTime.trim() : undefined,
      defaultBreakStartTime: defaultBreakStartTime && defaultBreakStartTime.trim() ? defaultBreakStartTime.trim() : undefined,
      defaultBreakEndTime: defaultBreakEndTime && defaultBreakEndTime.trim() ? defaultBreakEndTime.trim() : undefined,
      isActive: true
    });

    await company.save();

    // ✉️ Send host company account creation email (if enabled and email provided)
    try {
      if (cleanedEmailAddress && password) {
        const settings = await getRegistrationSettings('Admin', ADMIN_OWNER_ID);
        const fallbackSettings = new ReportSettings({
          ownerType: 'Admin',
          ownerId: ADMIN_OWNER_ID,
        }).toObject();
        const registrationTemplate = settings?.registrationTemplates?.hostCompany
          || fallbackSettings?.registrationTemplates?.hostCompany
          || {};
        const signature = settings?.templates?.emailSignature
          || fallbackSettings?.templates?.emailSignature
          || 'Internship Success';
        const loginUrl = process.env.PORTAL_LOGIN_URL || process.env.APP_LOGIN_URL || '';

        const templateData = {
          companyName: company.companyName || company.name,
          mentorName: company.name || '',
          username: company.username,
          temporaryPassword: password,
          loginUrl,
          signature,
        };

        await sendRegistrationEmail({
          to: cleanedEmailAddress,
          template: registrationTemplate,
          data: templateData,
        });
      }
    } catch (emailError) {
      console.warn('⚠️ Host company registration email failed:', emailError?.message || emailError);
    }

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
      isActive,
      defaultClockInTime,
      defaultClockOutTime,
      defaultBreakStartTime,
      defaultBreakEndTime
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

    // ⏰ VALIDATE AND UPDATE DEFAULT WORKING HOURS
    const timeFormatRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (defaultClockInTime !== undefined) {
      if (defaultClockInTime && !timeFormatRegex.test(defaultClockInTime.trim())) {
        return res.status(400).json({ error: 'Default clock-in time must be in HH:MM format (24-hour, e.g., "07:30")' });
      }
      company.defaultClockInTime = defaultClockInTime ? defaultClockInTime.trim() : undefined;
    }
    if (defaultClockOutTime !== undefined) {
      if (defaultClockOutTime && !timeFormatRegex.test(defaultClockOutTime.trim())) {
        return res.status(400).json({ error: 'Default clock-out time must be in HH:MM format (24-hour, e.g., "16:30")' });
      }
      company.defaultClockOutTime = defaultClockOutTime ? defaultClockOutTime.trim() : undefined;
    }
    if (defaultBreakStartTime !== undefined) {
      if (defaultBreakStartTime && !timeFormatRegex.test(defaultBreakStartTime.trim())) {
        return res.status(400).json({ error: 'Default break start time must be in HH:MM format (24-hour, e.g., "13:00")' });
      }
      company.defaultBreakStartTime = defaultBreakStartTime ? defaultBreakStartTime.trim() : undefined;
    }
    if (defaultBreakEndTime !== undefined) {
      if (defaultBreakEndTime && !timeFormatRegex.test(defaultBreakEndTime.trim())) {
        return res.status(400).json({ error: 'Default break end time must be in HH:MM format (24-hour, e.g., "14:00")' });
      }
      company.defaultBreakEndTime = defaultBreakEndTime ? defaultBreakEndTime.trim() : undefined;
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

// Delete host company - FULL CASCADE DELETE (removes company, departments, and all staff/interns)
router.delete('/admin/host-companies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { cascade } = req.query; // If cascade=true, delete everything including staff

    const company = await HostCompany.findById(id);
    if (!company) {
      return res.status(404).json({ error: 'Host company not found' });
    }

    // Get counts for confirmation
    const departmentCount = await Department.countDocuments({ hostCompanyId: id });
    const staffCount = await Staff.countDocuments({ hostCompanyId: id });

    if (cascade === 'true') {
      // FULL CASCADE DELETE - Delete everything related to this host company
      console.log(`🗑️ CASCADE DELETE: Deleting host company "${company.name}" with ${departmentCount} departments and ${staffCount} staff/interns`);

      // 1. Delete all staff/interns belonging to this host company (hard delete)
      const staffDeleteResult = await Staff.deleteMany({ hostCompanyId: id });
      console.log(`   ✓ Deleted ${staffDeleteResult.deletedCount} staff/interns`);

      // 2. Delete all departments belonging to this host company (hard delete)
      const deptDeleteResult = await Department.deleteMany({ hostCompanyId: id });
      console.log(`   ✓ Deleted ${deptDeleteResult.deletedCount} departments`);

      // 3. Delete all leave applications for staff of this company
      const leaveDeleteResult = await LeaveApplication.deleteMany({ hostCompanyId: id });
      console.log(`   ✓ Deleted ${leaveDeleteResult.deletedCount} leave applications`);

      // 4. Delete all attendance corrections for staff of this company
      const correctionDeleteResult = await AttendanceCorrection.deleteMany({ hostCompanyId: id });
      console.log(`   ✓ Deleted ${correctionDeleteResult.deletedCount} attendance corrections`);

      // 5. Delete the host company itself (hard delete)
      await HostCompany.findByIdAndDelete(id);
      console.log(`   ✓ Deleted host company "${company.name}"`);

      res.json({
        success: true,
        message: `Host company "${company.name}" and all related data deleted successfully`,
        deleted: {
          company: company.name,
          departments: deptDeleteResult.deletedCount,
          staff: staffDeleteResult.deletedCount,
          leaveApplications: leaveDeleteResult.deletedCount,
          attendanceCorrections: correctionDeleteResult.deletedCount
        }
      });
    } else {
      // NON-CASCADE: Only allow delete if no departments/staff exist
      if (departmentCount > 0 || staffCount > 0) {
        return res.status(400).json({
          error: `Cannot delete host company. This company has ${departmentCount} department(s) and ${staffCount} staff/intern(s). Use cascade delete to remove all related data.`,
          requiresCascade: true,
          counts: {
            departments: departmentCount,
            staff: staffCount
          }
        });
      }

      // Safe to delete - no related data
      await HostCompany.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'Host company deleted successfully'
      });
    }
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

// Remove (delete) a staff member
router.put('/admin/staff/:staffId/stipend', async (req, res) => {
  try {
    const { staffId } = req.params;
    const { stipendAmount } = req.body;
    const hostCompanyId = req.query.hostCompanyId || req.body.hostCompanyId;

    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid staff ID format'
      });
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    if (hostCompanyId) {
      if (!staff.hostCompanyId || staff.hostCompanyId.toString() !== hostCompanyId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'You can only update stipend for staff in your company'
        });
      }
    }

    let normalizedAmount = null;
    if (stipendAmount !== null && stipendAmount !== undefined && String(stipendAmount).trim() !== '') {
      const parsedAmount = Number(stipendAmount);
      if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
        return res.status(400).json({
          success: false,
          error: 'Stipend amount must be a non-negative number'
        });
      }
      normalizedAmount = parsedAmount;
    }

    staff.stipendAmount = normalizedAmount;
    await staff.save();
    staffCache.invalidate();

    return res.json({
      success: true,
      staffId: staff._id,
      stipendAmount: staff.stipendAmount ?? null
    });
  } catch (error) {
    console.error('Error updating stipend amount:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update stipend amount'
    });
  }
});

router.put('/admin/staff/:staffId/working-hours', async (req, res) => {
  try {
    const { staffId } = req.params;
    const hostCompanyId = req.query.hostCompanyId || req.body.hostCompanyId;
    const {
      expectedWorkingDaysPerWeek,
      expectedWorkingDaysPerMonth,
      expectedHoursPerDay,
      expectedWeeklyHours,
      expectedMonthlyHours
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid staff ID format'
      });
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    if (hostCompanyId) {
      if (!staff.hostCompanyId || staff.hostCompanyId.toString() !== hostCompanyId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'You can only update working hours for staff in your company'
        });
      }
    }

    const parseOptionalNumber = (value, label) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'string' && value.trim() === '') return null;
      const parsedValue = Number(value);
      if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        throw new Error(`${label} must be a non-negative number`);
      }
      return parsedValue;
    };

    try {
      staff.expectedWorkingDaysPerWeek = parseOptionalNumber(expectedWorkingDaysPerWeek, 'Working days per week');
      staff.expectedWorkingDaysPerMonth = parseOptionalNumber(expectedWorkingDaysPerMonth, 'Working days per month');
      staff.expectedHoursPerDay = parseOptionalNumber(expectedHoursPerDay, 'Hours per day');
      staff.expectedWeeklyHours = parseOptionalNumber(expectedWeeklyHours, 'Weekly hours');
      staff.expectedMonthlyHours = parseOptionalNumber(expectedMonthlyHours, 'Monthly hours');
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message || 'Invalid working hours input'
      });
    }

    await staff.save();
    staffCache.invalidate();

    return res.json({
      success: true,
      staffId: staff._id,
      workingHours: {
        expectedWorkingDaysPerWeek: staff.expectedWorkingDaysPerWeek ?? null,
        expectedWorkingDaysPerMonth: staff.expectedWorkingDaysPerMonth ?? null,
        expectedHoursPerDay: staff.expectedHoursPerDay ?? null,
        expectedWeeklyHours: staff.expectedWeeklyHours ?? null,
        expectedMonthlyHours: staff.expectedMonthlyHours ?? null
      }
    });
  } catch (error) {
    console.error('Error updating working hours:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update working hours'
    });
  }
});

router.delete('/admin/staff/:staffId', async (req, res) => {
  try {
    const { staffId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(staffId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid staff ID format',
      });
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found',
      });
    }

    const staffName = `${staff.name} ${staff.surname}`;
    const staffIdString = staff._id?.toString();
    const hostCompanyId = staff.hostCompanyId?.toString();

    // Delete the staff member
    await Staff.findByIdAndDelete(staffId);

    // 🔔 LOG ACTION FOR REAL-TIME NOTIFICATIONS
    await logAction('STAFF_REMOVED', {
      staffId: staffIdString,
      staffName: staffName,
      role: staff.role,
      idNumber: staff.idNumber,
      hostCompanyId: hostCompanyId,
      departmentId: staff.department?.toString()
    }, null);

    res.json({
      success: true,
      message: `Staff member "${staffName}" has been removed successfully`,
      staffId: staffIdString,
      staffName: staffName
    });
  } catch (error) {
    console.error('❌ Error removing staff member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove staff member',
    });
  }
});

// ============================================
// 🏦 DEVICE MANAGEMENT ENDPOINTS
// ============================================

// Get all devices with pending approvals
router.get('/admin/devices', async (req, res) => {
  try {
    const hostCompanyId = req.query.hostCompanyId;
    const filterStatus = req.query.status;

    // Build query
    let query = {};
    if (hostCompanyId) {
      query.hostCompanyId = ObjectId.isValid(hostCompanyId) ? new ObjectId(hostCompanyId) : hostCompanyId;
    }

    // Get all staff and their devices
    const staff = await Staff.find(query).select('_id name idNumber email role hostCompanyId department trustedDevices').lean();

    // Flatten devices with staff info
    const devices = [];
    for (const staffMember of staff) {
      if (Array.isArray(staffMember.trustedDevices)) {
        for (const device of staffMember.trustedDevices) {
          // Filter by status if specified
          if (filterStatus && device.status !== filterStatus) {
            continue;
          }

          devices.push({
            _id: device._id || `${staffMember._id}_${device.fingerprint}`,
            staffId: staffMember._id.toString(),
            staffName: staffMember.name,
            staffEmail: staffMember.email,
            staffIdNumber: staffMember.idNumber,
            staffRole: staffMember.role,
            fingerprint: device.fingerprint,
            status: device.status || 'unknown',
            label: device.label,
            registeredAt: device.registeredAt || device.createdAt || new Date(),
            lastSeenAt: device.lastSeenAt,
            deviceInfo: device.deviceInfo || {},
            hostCompanyId: staffMember.hostCompanyId,
          });
        }
      }
    }

    // Sort by registration date (newest first)
    devices.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));

    res.json({
      success: true,
      devices: devices,
      count: devices.length,
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch devices',
    });
  }
});

// Update device status (approve/reject/revoke)
router.patch('/admin/devices/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { action } = req.body; // approve, reject, revoke

    if (!['approve', 'reject', 'revoke'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be approve, reject, or revoke',
      });
    }

    console.log(`🔐 Device update request: deviceId=${deviceId}, action=${action}`);

    // Search through all staff to find the device
    let staff = null;
    let targetDevice = null;

    const allStaff = await Staff.find({}).select('_id name trustedDevices hostCompanyId').lean();

    for (const s of allStaff) {
      if (Array.isArray(s.trustedDevices)) {
        const device = s.trustedDevices.find(d => {
          // Try matching by _id or fingerprint
          const deviceIdStr = d._id ? d._id.toString() : null;
          return deviceIdStr === deviceId || d.fingerprint === deviceId;
        });

        if (device) {
          staff = s;
          targetDevice = device;
          break;
        }
      }
    }

    if (!staff || !targetDevice) {
      console.warn(`⚠️ Device not found: ${deviceId}`);
      return res.status(404).json({
        success: false,
        error: 'Device not found',
      });
    }

    console.log(`✅ Found device for staff: ${staff.name}, current status: ${targetDevice.status}`);

    // Update device status
    const newStatus = action === 'approve' ? 'trusted' : 'revoked';

    // Get the staff document with all fields to update
    const staffToUpdate = await Staff.findById(staff._id);
    const deviceIndex = staffToUpdate.trustedDevices.findIndex(d =>
      (d._id && d._id.toString() === deviceId) || d.fingerprint === deviceId
    );

    if (deviceIndex !== -1) {
      staffToUpdate.trustedDevices[deviceIndex].status = newStatus;
      staffToUpdate.trustedDevices[deviceIndex].updatedAt = new Date();
      await staffToUpdate.save();
      staffCache.invalidate();

      console.log(`✅ Device status updated: ${staffToUpdate.name} - ${targetDevice.fingerprint.substring(0, 8)}... → ${newStatus}`);

      // 🔔 LOG ACTION
      await logAction(action === 'approve' ? 'DEVICE_APPROVED' : 'DEVICE_REVOKED', {
        staffId: staff._id.toString(),
        staffName: staff.name,
        deviceFingerprint: targetDevice.fingerprint,
        deviceModel: targetDevice.deviceInfo?.modelName || 'Unknown',
        action: action,
        hostCompanyId: staff.hostCompanyId?.toString(),
      }, null).catch(err => {
        console.warn('⚠️ Failed to log device action:', err.message);
      });
    }

    res.json({
      success: true,
      message: `Device ${action === 'approve' ? 'approved' : 'revoked'} successfully`,
      device: {
        _id: targetDevice._id,
        fingerprint: targetDevice.fingerprint,
        status: newStatus,
      },
    });
  } catch (error) {
    console.error('❌ Error updating device:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update device status: ' + error.message,
    });
  }
});

// Export router
module.exports = router;
