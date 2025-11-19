const faceapi = require('face-api.js');
const { Canvas, Image, ImageData, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// Configure face-api.js to use node-canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;
let modelsLoadError = null;
let modelsPromise = null;

// Configuration
const CONFIG = {
  // Recognition thresholds
  MIN_SIMILARITY_THRESHOLD: 0.50,  // Lowered to 0.50 for better matching - allows more lenient recognition
  HIGH_CONFIDENCE_THRESHOLD: 0.75,  // High confidence match
  VERY_HIGH_CONFIDENCE_THRESHOLD: 0.85, // Very high confidence
  
  // Face detection settings
  MIN_FACE_SIZE: 100,  // Minimum face size in pixels
  MAX_FACE_SIZE: 1000, // Maximum face size in pixels
  MIN_DETECTION_SCORE: 0.5, // Minimum detection confidence
  
  // Face quality requirements
  MIN_FACE_QUALITY: 0.3, // Minimum face quality score (lowered to be less strict)
  MAX_FACE_ANGLE: 30, // Maximum face angle in degrees (for pitch/yaw)
};

async function loadModels() {
  if (modelsLoaded) {
    return;
  }

  if (modelsPromise) {
    return modelsPromise;
  }

  // Models path: C:\Clock-in\FaceClockBackend\models\face-api
  // Official repository: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
  const modelsPath = path.join(__dirname, '../models/face-api');
  modelsPromise = (async () => {
    modelsLoadError = null;

    try {
      const loadedFromDisk = await tryLoadModelsFromDisk(modelsPath);
      if (loadedFromDisk) {
        modelsLoaded = true;
        console.log(`✅ Models loaded from local directory: ${modelsPath}`);
        return;
      }
    } catch (diskError) {
      console.warn(`⚠️ Failed to load models from disk: ${diskError.message}`);
    }

    console.log('📦 Attempting to load models from CDN (fallback)...');
    // Official repository: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
    const cdnSources = [
      { name: 'GitHub raw (master - official)', url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights' },
      { name: 'jsDelivr (@vladmandic)', url: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model' },
      { name: 'unpkg (@vladmandic)', url: 'https://unpkg.com/@vladmandic/face-api@1.7.14/model' },
      { name: 'GitHub raw (face-api.js-models main)', url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/main/weights' },
      { name: 'GitHub raw (face-api.js-models master)', url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/weights' },
    ];

    for (const source of cdnSources) {
      try {
        await loadModelsFromUri(source.url, source.name);
        modelsLoaded = true;
        console.log(`✅ Face recognition models loaded successfully from ${source.name}`);
        return;
      } catch (error) {
        console.warn(`⚠️ Could not load from ${source.name}: ${error?.message || error}`);
      }
    }

    throw new Error('Unable to load face recognition models from disk or CDN sources');
  })();

  try {
    await modelsPromise;
  } catch (error) {
    modelsLoadError = error;
    modelsLoaded = false;
    throw error;
  } finally {
    modelsPromise = null;
  }
}

async function tryLoadModelsFromDisk(modelsPath) {
  if (!fs.existsSync(modelsPath)) {
    console.log(`📁 Local models directory missing: ${modelsPath}`);
    console.log('   Skipping disk load. Will try CDN fallback.');
    return false;
  }

  console.log(`📁 Found local models directory: ${modelsPath}`);
  
  const requiredManifest = path.join(modelsPath, 'face_landmark_68_model-weights_manifest.json');
  if (!fs.existsSync(requiredManifest)) {
    console.warn(`⚠️ Local models directory exists but required files are missing.`);
    console.warn(`   Expected manifest: ${requiredManifest}`);
    return false;
  }

  console.log('📦 Loading face recognition models from local disk...');
  console.log(`   Models path: ${modelsPath}`);
  console.log(`   Official repo: https://github.com/justadudewhohacks/face-api.js/tree/master/weights`);
  
  // Load SSD MobileNet v1 first (our PRIMARY detector - most reliable)
  const ssdManifestPath = path.join(modelsPath, 'ssd_mobilenetv1_model-weights_manifest.json');
  if (fs.existsSync(ssdManifestPath)) {
    try {
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
      console.log('   ✅ SSD MobileNet v1 loaded (primary detector - default)');
    } catch (err) {
      console.warn(`   ⚠️ SSD MobileNet v1 load failed: ${err.message}`);
    }
  } else {
    console.warn('   ⚠️ SSD MobileNet v1 manifest not found. Will use TinyFaceDetector as fallback.');
  }
  
  // Load TinyFaceDetector (fallback detector - faster but less reliable)
  const tinyDetectorManifestPath = path.join(modelsPath, 'tiny_face_detector_model-weights_manifest.json');
  if (fs.existsSync(tinyDetectorManifestPath)) {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromDisk(modelsPath);
      console.log('   ✅ TinyFaceDetector loaded (fallback detector available)');
    } catch (err) {
      console.warn(`   ⚠️ TinyFaceDetector load failed: ${err.message}`);
    }
  } else {
    console.warn('   ⚠️ TinyFaceDetector manifest not found locally. Continuing without fallback detector.');
  }
  
  // Load required models (landmarks and recognition)
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
  
  // Verify models are actually loaded and ready
  if (!faceapi.nets.ssdMobilenetv1.isLoaded) {
    throw new Error('SSD MobileNet v1 model failed to load properly');
  }
  if (!faceapi.nets.faceLandmark68Net.isLoaded) {
    throw new Error('Face Landmark 68 model failed to load properly');
  }
  if (!faceapi.nets.faceRecognitionNet.isLoaded) {
    throw new Error('Face Recognition model failed to load properly');
  }
  
  console.log('✅ Face recognition models loaded successfully from disk');
  return true;
}

async function loadModelsFromUri(baseUrl, sourceName) {
  console.log(`   Loading models from ${sourceName} (${baseUrl})...`);
  
  // Load SSD MobileNet v1 first (PRIMARY detector - most reliable)
  try {
    await faceapi.nets.ssdMobilenetv1.loadFromUri(baseUrl);
    console.log('   ✅ SSD MobileNet v1 loaded (primary detector - default)');
  } catch (ssdError) {
    console.warn(`   ⚠️ SSD MobileNet v1 unavailable from ${sourceName}: ${ssdError.message}`);
  }
  
  // Load TinyFaceDetector (fallback detector - faster but less reliable)
  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri(baseUrl);
    console.log('   ✅ TinyFaceDetector loaded (fallback detector available)');
  } catch (tinyError) {
    console.warn(`   ⚠️ TinyFaceDetector unavailable from ${sourceName}: ${tinyError.message}`);
  }

  // Load required models (landmarks and recognition)
  await faceapi.nets.faceLandmark68Net.loadFromUri(baseUrl);
  await faceapi.nets.faceRecognitionNet.loadFromUri(baseUrl);
  
  // Verify models are actually loaded and ready
  if (!faceapi.nets.ssdMobilenetv1.isLoaded && !faceapi.nets.tinyFaceDetector.isLoaded) {
    throw new Error('No face detection model loaded properly');
  }
  if (!faceapi.nets.faceLandmark68Net.isLoaded) {
    throw new Error('Face Landmark 68 model failed to load properly');
  }
  if (!faceapi.nets.faceRecognitionNet.isLoaded) {
    throw new Error('Face Recognition model failed to load properly');
  }
}

// Simple cosine similarity for comparing embeddings
function cosineSimilarity(embedding1, embedding2) {
  if (embedding1.length !== embedding2.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }
  
  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);
  
  if (norm1 === 0 || norm2 === 0) return 0;
  
  return dotProduct / (norm1 * norm2);
}

// Extract and validate facial features from landmarks
function extractFacialFeatures(landmarks) {
  if (!landmarks || !landmarks.positions || landmarks.positions.length < 68) {
    return null;
  }
  
  const positions = landmarks.positions;
  
  // Face landmark indices (68-point model)
  // Jaw: 0-16, Right eyebrow: 17-21, Left eyebrow: 22-26
  // Nose: 27-35, Right eye: 36-41, Left eye: 42-47
  // Mouth: 48-67
  
  return {
    // Jaw/face shape (17 points: 0-16)
    jaw: positions.slice(0, 17),
    
    // Right eyebrow (5 points: 17-21)
    rightEyebrow: positions.slice(17, 22),
    
    // Left eyebrow (5 points: 22-26)
    leftEyebrow: positions.slice(22, 27),
    
    // Nose (9 points: 27-35)
    nose: positions.slice(27, 36),
    noseTip: positions[30], // Point 30 is nose tip
    noseBridge: positions[27], // Point 27 is top of nose bridge
    
    // Right eye (6 points: 36-41)
    rightEye: positions.slice(36, 42),
    rightEyeCenter: {
      x: positions.slice(36, 42).reduce((sum, p) => sum + p.x, 0) / 6,
      y: positions.slice(36, 42).reduce((sum, p) => sum + p.y, 0) / 6
    },
    
    // Left eye (6 points: 42-47)
    leftEye: positions.slice(42, 48),
    leftEyeCenter: {
      x: positions.slice(42, 48).reduce((sum, p) => sum + p.x, 0) / 6,
      y: positions.slice(42, 48).reduce((sum, p) => sum + p.y, 0) / 6
    },
    
    // Mouth (20 points: 48-67)
    mouth: positions.slice(48, 68),
    mouthCenter: {
      x: positions.slice(48, 68).reduce((sum, p) => sum + p.x, 0) / 20,
      y: positions.slice(48, 68).reduce((sum, p) => sum + p.y, 0) / 20
    },
    
    // Face center (average of all points)
    faceCenter: {
      x: positions.reduce((sum, p) => sum + p.x, 0) / positions.length,
      y: positions.reduce((sum, p) => sum + p.y, 0) / positions.length
    }
  };
}

// Calculate eye openness (simple heuristic)
function calculateEyeOpenness(eyePoints) {
  if (!eyePoints || eyePoints.length !== 6) return 0;
  
  // Eye points: [left corner, top, right corner, bottom, ...]
  const topY = Math.min(eyePoints[1].y, eyePoints[2].y);
  const bottomY = Math.max(eyePoints[4].y, eyePoints[5].y);
  const eyeHeight = bottomY - topY;
  
  const leftX = eyePoints[0].x;
  const rightX = eyePoints[3].x;
  const eyeWidth = Math.abs(rightX - leftX);
  
  // Normalized eye openness (height/width ratio)
  return eyeWidth > 0 ? eyeHeight / eyeWidth : 0;
}

// Validate that key facial features are visible and properly detected
function validateFacialFeatures(features) {
  const issues = [];
  
  if (!features) {
    return { valid: false, issues: ['No facial features detected'], score: 0 };
  }
  
  let featureScore = 1.0;
  
  // Check eyes
  if (!features.leftEye || features.leftEye.length !== 6) {
    issues.push('Left eye not properly detected');
    featureScore *= 0.3;
  } else {
    const leftEyeOpenness = calculateEyeOpenness(features.leftEye);
    if (leftEyeOpenness < 0.1) {
      issues.push('Left eye appears closed');
      featureScore *= 0.7;
    }
  }
  
  if (!features.rightEye || features.rightEye.length !== 6) {
    issues.push('Right eye not properly detected');
    featureScore *= 0.3;
  } else {
    const rightEyeOpenness = calculateEyeOpenness(features.rightEye);
    if (rightEyeOpenness < 0.1) {
      issues.push('Right eye appears closed');
      featureScore *= 0.7;
    }
  }
  
  // Check nose
  if (!features.nose || features.nose.length !== 9) {
    issues.push('Nose not properly detected');
    featureScore *= 0.4;
  }
  
  // Check mouth
  if (!features.mouth || features.mouth.length !== 20) {
    issues.push('Mouth not properly detected');
    featureScore *= 0.5;
  }
  
  // Check face symmetry (eyes should be roughly at same height)
  if (features.leftEyeCenter && features.rightEyeCenter) {
    const eyeHeightDiff = Math.abs(features.leftEyeCenter.y - features.rightEyeCenter.y);
    const avgEyeWidth = (Math.abs(features.leftEye[3].x - features.leftEye[0].x) + 
                         Math.abs(features.rightEye[3].x - features.rightEye[0].x)) / 2;
    
    if (eyeHeightDiff > avgEyeWidth * 0.3) {
      issues.push('Face appears tilted (eyes not level)');
      featureScore *= 0.8;
    }
  }
  
  // Check if face is facing forward (nose should be roughly centered)
  if (features.faceCenter && features.noseTip) {
    const faceWidth = Math.max(...features.jaw.map(p => p.x)) - Math.min(...features.jaw.map(p => p.x));
    const noseOffset = Math.abs(features.noseTip.x - features.faceCenter.x);
    
    if (noseOffset > faceWidth * 0.25) {
      issues.push('Face not facing camera directly');
      featureScore *= 0.8;
    }
  }
  
  return {
    valid: featureScore >= 0.6,
    issues,
    score: featureScore,
    features: {
      eyesDetected: !!(features.leftEye && features.rightEye),
      noseDetected: !!features.nose,
      mouthDetected: !!features.mouth,
      faceShapeDetected: !!features.jaw
    }
  };
}

// Calculate face quality score based on detection properties
function calculateFaceQuality(detection) {
  if (!detection || !detection.detection || !detection.landmarks) {
    return 0;
  }
  
  let qualityScore = 1.0;
  
  // Check detection score
  const detectionScore = detection.detection.score || 0;
  qualityScore *= detectionScore;
  
  // Check face size (larger faces are generally better)
  const box = detection.detection.box;
  const faceArea = box.width * box.height;
  const minArea = CONFIG.MIN_FACE_SIZE * CONFIG.MIN_FACE_SIZE;
  const maxArea = CONFIG.MAX_FACE_SIZE * CONFIG.MAX_FACE_SIZE;
  
  if (faceArea < minArea) {
    qualityScore *= 0.5; // Face too small
  } else if (faceArea > maxArea) {
    qualityScore *= 0.8; // Face too large (might be too close)
  }
  
  // Validate facial features
  const features = extractFacialFeatures(detection.landmarks);
  const featureValidation = validateFacialFeatures(features);
  
  // Incorporate feature validation into quality score
  qualityScore *= featureValidation.score;
  
  return Math.max(0, Math.min(1, qualityScore));
}

// Validate face detection quality
function validateFaceDetection(detection) {
  if (!detection) {
    return { valid: false, reason: 'No face detected' };
  }
  
  // Extract and validate facial features
  const features = extractFacialFeatures(detection.landmarks);
  const featureValidation = validateFacialFeatures(features);
  
  const quality = calculateFaceQuality(detection);
  
  // Build detailed reason if validation fails
  let reason = '';
  if (quality < CONFIG.MIN_FACE_QUALITY) {
    reason = `Face quality too low (${(quality * 100).toFixed(1)}%). `;
    
    if (featureValidation.issues.length > 0) {
      reason += `Issues: ${featureValidation.issues.join(', ')}. `;
    }
    
    reason += 'Please ensure good lighting, face the camera directly, and keep eyes open.';
  }
  
  if (quality < CONFIG.MIN_FACE_QUALITY) {
    return { 
      valid: false, 
      reason,
      quality,
      featureIssues: featureValidation.issues,
      featuresDetected: featureValidation.features
    };
  }
  
  const detectionScore = detection.detection?.score || 0;
  if (detectionScore < CONFIG.MIN_DETECTION_SCORE) {
    return { 
      valid: false, 
      reason: `Detection confidence too low (${(detectionScore * 100).toFixed(1)}%)`,
      quality,
      featureIssues: featureValidation.issues,
      featuresDetected: featureValidation.features
    };
  }
  
  // Log detected features
  if (featureValidation.features) {
    console.log(`👁️ Features detected - Eyes: ${featureValidation.features.eyesDetected ? '✅' : '❌'}, ` +
                `Nose: ${featureValidation.features.noseDetected ? '✅' : '❌'}, ` +
                `Mouth: ${featureValidation.features.mouthDetected ? '✅' : '❌'}, ` +
                `Face Shape: ${featureValidation.features.faceShapeDetected ? '✅' : '❌'}`);
  }
  
  return { 
    valid: true, 
    quality, 
    detectionScore,
    features: featureValidation.features,
    featureIssues: featureValidation.issues
  };
}

// Generate face embedding from image buffer with enhanced validation
async function generateEmbedding(imageBuffer) {
  const totalStartTime = Date.now();
  try {
    await loadModels();
  } catch (err) {
    console.error('❌ Face recognition models not loaded:', err?.message || err);
    throw new Error('Face recognition models are not available. Please ensure download-models.js has been executed successfully.');
  }
  
  try {
    // Load image from buffer using canvas.loadImage (works properly in Node.js)
    // This is the correct way to load images from Buffers in Node.js with canvas
    console.log(`🖼️ Loading image from buffer (${imageBuffer.length} bytes)...`);
    let img;
    try {
      // Use canvas.loadImage which properly handles Buffers in Node.js
      // This supports JPEG, PNG, GIF, WebP, SVG, and other formats
      // ⚡ OPTIMIZED: Reduced timeout from 10s to 5s (faster failure detection)
      const loadImagePromise = loadImage(imageBuffer);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Image loading timeout after 5 seconds')), 5000)
      );
      
      img = await Promise.race([loadImagePromise, timeoutPromise]);
      console.log(`✅ Image loaded successfully - Dimensions: ${img.width}x${img.height}`);
    } catch (loadError) {
      const errorMsg = loadError?.message || String(loadError) || 'Unknown error';
      console.error('❌ Error loading image from buffer:', errorMsg);
      throw new Error(`Failed to load image: ${errorMsg}. Please ensure the image is a valid format (JPEG, PNG, etc.).`);
    }
    
    // Use SSD MobileNet v1 as PRIMARY detector (most reliable and accurate)
    // SSD MobileNet v1 is the default because it always works reliably
    console.log('🔍 Starting face detection (SSD MobileNet v1 - default detector)...');
    const detectionStartTime = Date.now();
    let detections;
    let detectionMethod = 'SSD MobileNet v1';
    
    try {
      // Verify models are loaded
      if (!faceapi.nets.faceLandmark68Net.isLoaded) {
        throw new Error('Face Landmark 68 model is not loaded. Please ensure models are properly downloaded.');
      }
      if (!faceapi.nets.faceRecognitionNet.isLoaded) {
        throw new Error('Face Recognition model is not loaded. Please ensure models are properly downloaded.');
      }
      
      // Use SSD MobileNet v1 as PRIMARY detector (most reliable)
      // ⚡ OPTIMIZED: Reduced timeout and optimized settings for speed
      if (faceapi.nets.ssdMobilenetv1.isLoaded) {
        try {
          const detectionPromise = faceapi
            .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ 
              minConfidence: 0.4, // Slightly higher for faster processing (fewer false positives)
              maxResults: 1 // Only need 1 face - faster processing
            }))
            .withFaceLandmarks()
            .withFaceDescriptors();
          
          // ⚡ OPTIMIZED: Reduced timeout from 8s to 6s (faster failure detection)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Face detection timeout after 6 seconds')), 6000)
          );
          
          detections = await Promise.race([detectionPromise, timeoutPromise]);
          const detectionTime = Date.now() - detectionStartTime;
          console.log(`✅ Face detection completed in ${detectionTime}ms (${detectionMethod}) - Found ${detections.length} face(s)`);
        } catch (ssdError) {
          console.warn(`⚠️ SSD MobileNet v1 failed: ${ssdError.message}, falling back to TinyFaceDetector`);
          detectionMethod = 'TinyFaceDetector (fallback)';
          throw ssdError; // Will be caught by outer catch
        }
      } else {
        // Fallback to TinyFaceDetector if SSD MobileNet v1 not available
        detectionMethod = 'TinyFaceDetector (fallback)';
        throw new Error('SSD MobileNet v1 not loaded, using TinyFaceDetector');
      }
    } catch (primaryError) {
      // Fallback to TinyFaceDetector if SSD MobileNet v1 fails or not available
      if (faceapi.nets.tinyFaceDetector.isLoaded) {
        try {
          console.log('🔄 Falling back to TinyFaceDetector for face detection...');
          detectionMethod = 'TinyFaceDetector (fallback)';
          
          const detectionPromise = faceapi
            .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ 
              inputSize: 320, // 320 = fastest (optimized for speed)
              scoreThreshold: 0.4  // Slightly higher for faster processing
            }))
            .withFaceLandmarks()
            .withFaceDescriptors();
          
          // ⚡ OPTIMIZED: Reduced timeout from 5s to 4s
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Face detection timeout after 4 seconds')), 4000)
          );
          
          detections = await Promise.race([detectionPromise, timeoutPromise]);
          const detectionTime = Date.now() - detectionStartTime;
          console.log(`✅ Face detection completed in ${detectionTime}ms (${detectionMethod}) - Found ${detections.length} face(s)`);
        } catch (tinyError) {
          // If TinyFaceDetector also fails, throw the original error
          const errorMsg = tinyError?.message || primaryError?.message || String(tinyError) || 'Unknown error';
          throw new Error(`Face detection failed: ${errorMsg}`);
        }
      } else {
        throw new Error('No face detection model available. Please ensure models are properly loaded.');
      }
    }
    
    // Check if detections were successful
    if (!detections || detections.length === 0) {
      throw new Error('No face detected in image. Please ensure your face is visible and well-lit.');
    }
    
    // If multiple faces detected, use the largest/most confident one
    let bestDetection = detections[0];
    let bestScore = detections[0].detection?.score || 0;
    
    for (const detection of detections) {
      const score = detection.detection?.score || 0;
      const box = detection.detection?.box;
      const area = box ? box.width * box.height : 0;
      const bestArea = bestDetection.detection?.box ? 
        bestDetection.detection.box.width * bestDetection.detection.box.height : 0;
      
      // Prefer larger faces with good scores
      if (score > bestScore * 0.9 && area > bestArea) {
        bestDetection = detection;
        bestScore = score;
      } else if (score > bestScore) {
        bestDetection = detection;
        bestScore = score;
      }
    }
    
    // Validate the selected face (but be lenient - always generate embedding if face detected)
    const validation = validateFaceDetection(bestDetection);
    
    // Always use quality from validation (it always returns a quality value)
    // If validation failed, log warning but continue anyway (be lenient)
    const finalQuality = validation.quality || Math.max(0.3, bestScore * 0.8);
    const finalDetectionScore = validation.detectionScore || bestScore;
    
    if (!validation.valid) {
      console.warn(`⚠️ Face validation failed: ${validation.reason || 'Quality below threshold'}`);
      console.warn(`   Quality: ${(finalQuality * 100).toFixed(1)}%, but will still generate embedding`);
    }
    
    // Log quality metrics
    const totalTime = Date.now() - totalStartTime;
    console.log(`✅ Face detected - Quality: ${(finalQuality * 100).toFixed(1)}%, Confidence: ${(finalDetectionScore * 100).toFixed(1)}%`);
    console.log(`⚡ Total embedding generation time: ${totalTime}ms`);
    
    return {
      embedding: Array.from(bestDetection.descriptor),
      quality: finalQuality,
      detectionScore: finalDetectionScore,
      faceCount: detections.length
    };
  } catch (error) {
    const errorMessage = error?.message || String(error) || 'Unknown error';
    console.error('❌ Error generating embedding:', errorMessage);
    throw error instanceof Error ? error : new Error(errorMessage);
  }
}

// Find best matching staff with enhanced matching logic
async function findMatchingStaff(embeddingData, staffList) {
  const matchingStartTime = Date.now();
  // Validate input
  if (!embeddingData) {
    console.error('❌ findMatchingStaff: embeddingData is null or undefined');
    return null;
  }
  
  // Handle both new format (object with embedding) and old format (just array)
  const embedding = embeddingData.embedding || embeddingData;
  const quality = embeddingData.quality || 1.0;
  
  // Validate embedding
  if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
    console.error('❌ findMatchingStaff: Invalid embedding - not an array or empty');
    return null;
  }
  
  // Validate staff list
  if (!staffList || !Array.isArray(staffList) || staffList.length === 0) {
    console.error('❌ findMatchingStaff: Invalid staff list - empty or not an array');
    return null;
  }
  
  // Adjust threshold based on image quality
  // Use MUCH more lenient thresholds - people change appearance daily
  let threshold = CONFIG.MIN_SIMILARITY_THRESHOLD;
  
  // If using fallback embeddings (low quality), be very lenient but still try
  const isSingleStaff = staffList.length === 1;
  
  // Much more lenient thresholds to account for real-world variations
  if (quality < 0.4) {
    // Very low quality - lower threshold significantly
    threshold = isSingleStaff ? 0.35 : 0.42;
  } else if (quality < 0.6) {
    // Low-medium quality
    threshold = isSingleStaff ? 0.38 : 0.45;
  } else if (quality < 0.8) {
    // Medium quality
    threshold = isSingleStaff ? 0.42 : 0.48;
  } else {
    // High quality - still lenient for variations
    threshold = isSingleStaff ? 0.45 : 0.50;
  }
  
  if (isSingleStaff) {
    console.log(`📌 Only one staff member - using extra lenient threshold: ${(threshold * 100).toFixed(1)}%`);
  }
  
  console.log(`🔍 Matching with threshold: ${(threshold * 100).toFixed(1)}% (quality: ${(quality * 100).toFixed(1)}%)`);
  
  let bestMatch = null;
  let bestSimilarity = 0;
  const candidates = [];
  
  // Calculate similarity for all staff members
  // Now support multiple embeddings per person (new approach)
  console.log(`🔍 Comparing with ${staffList.length} registered staff members...`);
  
  for (const staff of staffList) {
    // Support both old format (single embedding) and new format (multiple embeddings)
    let staffEmbeddings = [];
    
    // Check for multiple embeddings (new format)
    if (staff.faceEmbeddings && Array.isArray(staff.faceEmbeddings) && staff.faceEmbeddings.length > 0) {
      staffEmbeddings = staff.faceEmbeddings;
    } else {
      // Fall back to single embedding (old format)
      const singleEmbedding = staff.decryptedEmbedding || staff.faceEmbedding;
      if (singleEmbedding && Array.isArray(singleEmbedding) && singleEmbedding.length > 0) {
        staffEmbeddings = [singleEmbedding];
      }
    }
    
    if (staffEmbeddings.length === 0) {
      console.warn(`⚠️ No valid embeddings for staff: ${staff.name}`);
      continue;
    }
    
    // Compare against ALL embeddings for this person, use the BEST match
    let bestStaffSimilarity = 0;
    let matchingEmbeddingIndex = -1;
    
    for (let i = 0; i < staffEmbeddings.length; i++) {
      const staffEmbedding = staffEmbeddings[i];
      
      if (!staffEmbedding || !Array.isArray(staffEmbedding) || staffEmbedding.length === 0) {
        continue;
      }
      
      // Ensure embeddings are same length
      if (embedding.length !== staffEmbedding.length) {
        console.warn(`⚠️ Embedding length mismatch for ${staff.name} (embedding ${i + 1}): ${embedding.length} vs ${staffEmbedding.length}`);
        continue;
      }
      
      const similarity = cosineSimilarity(embedding, staffEmbedding);
      
      // Track best similarity for this person
      if (similarity > bestStaffSimilarity) {
        bestStaffSimilarity = similarity;
        matchingEmbeddingIndex = i;
      }
    }
    
    const similarity = bestStaffSimilarity;
    const embeddingInfo = staffEmbeddings.length > 1 
      ? `(best of ${staffEmbeddings.length} embeddings: #${matchingEmbeddingIndex + 1})`
      : '';
    
    const matchStatus = similarity >= threshold ? '✅ MATCH' : '❌ below threshold';
    const gapFromThreshold = similarity >= threshold ? '' : ` (${((threshold - similarity) * 100).toFixed(1)}% below)`;
    console.log(`   ${staff.name}: ${(similarity * 100).toFixed(1)}% similarity ${embeddingInfo} ${matchStatus}${gapFromThreshold}`);
    
    // Collect all candidates above threshold
    if (similarity >= threshold) {
      candidates.push({ staff, similarity });
      
      // EARLY EXIT: If we find a very high confidence match (>85%), stop searching immediately
      // This can save 50-200ms when we have many staff members
      if (similarity >= CONFIG.VERY_HIGH_CONFIDENCE_THRESHOLD) {
        console.log(`⚡ Early exit: Found very high confidence match (${(similarity * 100).toFixed(1)}%) - stopping search`);
        bestMatch = { staff, similarity };
        bestSimilarity = similarity;
        break; // Exit loop early - no need to check remaining staff
      }
    }
    
    // Track best match across all staff (even if below threshold for debugging)
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = { staff, similarity };
    }
  }
  
  console.log(`📊 Best match: ${bestMatch ? bestMatch.staff.name : 'None'} - ${(bestSimilarity * 100).toFixed(1)}%`);
  console.log(`📊 Candidates above threshold (${(threshold * 100).toFixed(1)}%): ${candidates.length}`);
  
  // If we have candidates, use the best one
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.similarity - a.similarity);
    const topMatch = candidates[0];
    
    // Only check for ambiguity if we have multiple candidates AND similarity is low
    if (candidates.length > 1) {
      const secondMatch = candidates[1];
      const similarityGap = topMatch.similarity - secondMatch.similarity;
      // Only reject if gap is very small AND similarity is very low
      if (similarityGap < 0.02 && topMatch.similarity < 0.55) {
        console.warn(`⚠️ Multiple very close matches detected. Top: ${(topMatch.similarity * 100).toFixed(1)}%, Second: ${(secondMatch.similarity * 100).toFixed(1)}%`);
        // Still accept if it's above threshold
      }
    }
    
    bestMatch = topMatch;
    bestSimilarity = topMatch.similarity;
  }
  
  // Final check - be VERY lenient for real-world use
  if (!bestMatch) {
    console.log(`❌ No match found. Best similarity: ${(bestSimilarity * 100).toFixed(1)}%, Required: ${(threshold * 100).toFixed(1)}%`);
    console.log(`📊 Debug: All similarity scores were below threshold. Consider:`);
    console.log(`   - Re-registering with better lighting/angle`);
    console.log(`   - Ensuring same person is registering and clocking in`);
    console.log(`   - Checking if face detection quality is sufficient`);
    return null;
  }
  
  // Accept match if it's above threshold OR very close (much more lenient)
  if (bestSimilarity < threshold) {
    // Be very lenient - accept if within 8% of threshold
    const margin = threshold - 0.08; // 8% margin for leniency
    
    if (bestSimilarity >= margin) {
      console.log(`✅ Match accepted (lenient): ${(bestSimilarity * 100).toFixed(1)}% (threshold: ${(threshold * 100).toFixed(1)}%, margin: ${(margin * 100).toFixed(1)}%)`);
      // Accept it - people change appearance
    } else if (staffList.length === 1 && bestSimilarity >= 0.30) {
      // If only one staff and similarity is reasonable (above 30%), accept
      console.log(`✅ Match accepted (single staff, very lenient): ${(bestSimilarity * 100).toFixed(1)}%`);
      // Accept it anyway if only one staff member
    } else if (bestSimilarity >= 0.35 && staffList.length <= 3) {
      // For small groups (3 or fewer), accept if similarity is at least 35%
      console.log(`✅ Match accepted (small group, lenient): ${(bestSimilarity * 100).toFixed(1)}%`);
      } else {
        console.log(`❌ No match found. Best similarity: ${(bestSimilarity * 100).toFixed(1)}%, Required: ${(threshold * 100).toFixed(1)}%`);
        return null;
    }
  }
  
  // Log match quality
  let confidenceLevel = 'Medium';
  if (bestSimilarity >= CONFIG.VERY_HIGH_CONFIDENCE_THRESHOLD) {
    confidenceLevel = 'Very High';
  } else if (bestSimilarity >= CONFIG.HIGH_CONFIDENCE_THRESHOLD) {
    confidenceLevel = 'High';
  }
  
  const matchingTime = Date.now() - matchingStartTime;
  console.log(`✅ Match found: ${bestMatch.staff.name} - Similarity: ${(bestSimilarity * 100).toFixed(1)}% (${confidenceLevel} confidence)`);
  console.log(`⚡ Matching time: ${matchingTime}ms (${staffList.length} staff members compared)`);
  
  return {
    staff: bestMatch.staff,
    similarity: bestSimilarity,
    confidenceLevel,
    quality
  };
}

module.exports = {
  loadModels,
  generateEmbedding,
  findMatchingStaff,
  cosineSimilarity
};

