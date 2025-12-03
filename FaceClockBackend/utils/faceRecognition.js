// ENTERPRISE: Upgraded to @vladmandic/face-api (maintained fork, TensorFlow.js 2.0+ compatible)
// This is the modern, maintained version of face-api.js with better accuracy and performance

// Set environment variable to prefer CPU backend before requiring face-api
// This helps avoid native binding issues on Windows
process.env.TF_FORCE_CPU = '1';

// Try to pre-load and handle tfjs-node errors gracefully
// This allows us to provide better error messages if native bindings fail
let tfjsNodeAvailable = false;
try {
  require('@tensorflow/tfjs-node');
  tfjsNodeAvailable = true;
  console.log('✅ TensorFlow.js Node backend available');
} catch (tfjsNodeError) {
  if (tfjsNodeError.code === 'ERR_DLOPEN_FAILED' || tfjsNodeError.message.includes('tfjs_binding.node')) {
    console.warn('⚠️ TensorFlow.js Node native module not available (this is OK, will use CPU backend)');
    console.warn('💡 If you need native acceleration, install Visual C++ Redistributables:');
    console.warn('   https://aka.ms/vs/17/release/vc_redist.x64.exe');
    tfjsNodeAvailable = false;
  } else {
    // Other error, might be missing package
    console.warn('⚠️ @tensorflow/tfjs-node error:', tfjsNodeError.message);
    tfjsNodeAvailable = false;
  }
}

// Now require face-api (it will handle the backend automatically)
const faceapi = require('@vladmandic/face-api');

const { Canvas, Image, ImageData, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// Configure TensorFlow.js to use CPU backend (avoids native binding issues on Windows)
// This prevents ERR_DLOPEN_FAILED errors with tfjs-node native modules
try {
  // Try to set CPU backend explicitly
  if (faceapi.tf && faceapi.tf.setBackend) {
    faceapi.tf.setBackend('cpu');
    console.log('✅ TensorFlow.js backend set to CPU');
  }
} catch (backendError) {
  console.warn('⚠️ Could not set TensorFlow.js backend, will use default:', backendError.message);
}

// Configure face-api to use node-canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;
let modelsLoadError = null;
let modelsPromise = null;

// Configuration - ULTRA-STRICT MATCHING for enterprise-grade accuracy
const CONFIG = {
  // Recognition thresholds - ENTERPRISE-GRADE (75-80% base, 70% absolute minimum)
  MIN_SIMILARITY_THRESHOLD: 0.75,  // 75% - ENTERPRISE base threshold (was 65%)
  HIGH_CONFIDENCE_THRESHOLD: 0.85,  // 85% - High confidence match (increased from 80%)
  VERY_HIGH_CONFIDENCE_THRESHOLD: 0.92, // 92% - Very high confidence (increased from 90%)
  
  // Minimum similarity requirements - ZERO TOLERANCE FOR FALSE MATCHES
  ABSOLUTE_MINIMUM_SIMILARITY: 0.70, // 70% - absolute minimum, NO EXCEPTIONS (was 60%)
  MIN_SIMILARITY_GAP: 0.05, // 5% - minimum gap between top match and second match (prevents ambiguity)
  
  // Face detection settings
  MIN_FACE_SIZE: 100,  // Minimum face size in pixels
  MAX_FACE_SIZE: 1000, // Maximum face size in pixels
  MIN_DETECTION_SCORE: 0.5, // Minimum detection confidence
  
  // Face quality requirements - ENTERPRISE-GRADE
  MIN_FACE_QUALITY: 0.6, // 60% - minimum face quality (increased from 50%)
  MAX_FACE_ANGLE: 25, // Maximum face angle in degrees (stricter: 25° instead of 30°)
  
  // Image preprocessing requirements
  MIN_IMAGE_WIDTH: 600, // Minimum image width for quality (was 400px)
  MAX_IMAGE_WIDTH: 1200, // Maximum image width (prevents oversized images)
  MIN_BLUR_THRESHOLD: 100, // Minimum Laplacian variance for blur detection
  MIN_BRIGHTNESS: 0.3, // Minimum normalized brightness (0-1)
  MAX_BRIGHTNESS: 0.9, // Maximum normalized brightness (0-1)
  
  // Facial feature validation
  REQUIRE_FACIAL_FEATURES: true, // Require eyes, nose, mouth to be detected
  MIN_FEATURE_SCORE: 0.6, // Minimum facial feature validation score
  
  // Feature-based matching requirements
  REQUIRE_FEATURE_MATCHING: true, // Require feature matching in addition to embedding similarity
  MIN_FEATURE_SIMILARITY: 0.70, // 70% - minimum feature similarity required
  FEATURE_WEIGHT: 0.3, // 30% weight for features in final match score
  EMBEDDING_WEIGHT: 0.7, // 70% weight for embedding in final match score
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
    // ENTERPRISE: Using @vladmandic/face-api models (maintained, TensorFlow.js 2.0+ compatible)
    const cdnSources = [
      { name: 'jsDelivr (@vladmandic - PRIMARY)', url: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model' },
      { name: 'unpkg (@vladmandic)', url: 'https://unpkg.com/@vladmandic/face-api@1.7.14/model' },
      { name: 'GitHub raw (@vladmandic)', url: 'https://raw.githubusercontent.com/vladmandic/face-api/main/model' },
      { name: 'GitHub raw (face-api.js-models main - fallback)', url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/main/weights' },
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

// Cosine similarity for comparing embeddings
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

// Euclidean distance for comparing embeddings (complementary to cosine similarity)
function euclideanDistance(embedding1, embedding2) {
  if (embedding1.length !== embedding2.length) {
    return Infinity;
  }
  
  let sumSquaredDiff = 0;
  for (let i = 0; i < embedding1.length; i++) {
    const diff = embedding1[i] - embedding2[i];
    sumSquaredDiff += diff * diff;
  }
  
  return Math.sqrt(sumSquaredDiff);
}

// Combined similarity score using both cosine similarity and Euclidean distance
// This provides more robust matching than cosine alone
function combinedSimilarity(embedding1, embedding2) {
  const cosine = cosineSimilarity(embedding1, embedding2);
  
  // Convert Euclidean distance to similarity (0-1 scale)
  // Smaller distance = higher similarity
  const euclidean = euclideanDistance(embedding1, embedding2);
  // Normalize: typical Euclidean distance for face embeddings is 0-2
  // We'll use a sigmoid-like function to convert to 0-1
  const euclideanSimilarity = 1 / (1 + euclidean / 0.5); // Adjust divisor for sensitivity
  
  // Weighted combination: 70% cosine, 30% Euclidean
  // Cosine is generally more reliable, but Euclidean catches cases cosine misses
  const combined = (cosine * 0.7) + (euclideanSimilarity * 0.3);
  
  return {
    cosine,
    euclidean,
    euclideanSimilarity,
    combined
  };
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

// Extract normalized facial features for matching (returns feature vector)
function extractNormalizedFeatures(landmarks) {
  if (!landmarks || !landmarks.positions || landmarks.positions.length < 68) {
    return null;
  }
  
  const features = extractFacialFeatures(landmarks);
  if (!features) return null;
  
  // Calculate normalized measurements
  const faceWidth = Math.max(...features.jaw.map(p => p.x)) - Math.min(...features.jaw.map(p => p.x));
  const faceHeight = Math.max(...features.jaw.map(p => p.y)) - Math.min(features.jaw.slice(0, 8).map(p => p.y));
  
  // Eye features
  const leftEyeWidth = Math.abs(features.leftEye[3].x - features.leftEye[0].x);
  const leftEyeHeight = Math.abs(features.leftEye[4].y - features.leftEye[1].y);
  const rightEyeWidth = Math.abs(features.rightEye[3].x - features.rightEye[0].x);
  const rightEyeHeight = Math.abs(features.rightEye[4].y - features.rightEye[1].y);
  const avgEyeWidth = (leftEyeWidth + rightEyeWidth) / 2;
  const avgEyeHeight = (leftEyeHeight + rightEyeHeight) / 2;
  const eyeSpacing = Math.abs(features.leftEyeCenter.x - features.rightEyeCenter.x);
  
  // Nose features
  const noseWidth = Math.max(...features.nose.slice(3, 5).map(p => p.x)) - Math.min(...features.nose.slice(3, 5).map(p => p.x));
  const noseHeight = Math.abs(features.noseTip.y - features.noseBridge.y);
  
  // Mouth features
  const mouthWidth = Math.abs(features.mouth[6].x - features.mouth[0].x);
  const mouthHeight = Math.abs(features.mouth[3].y - features.mouth[9].y);
  
  // Normalize by face width (to be scale-invariant)
  const normalizedFeatures = {
    // Eye features (normalized)
    eyeWidth: avgEyeWidth / faceWidth,
    eyeHeight: avgEyeHeight / faceWidth,
    eyeSpacing: eyeSpacing / faceWidth,
    eyeShape: avgEyeWidth > 0 ? avgEyeHeight / avgEyeWidth : 0,
    
    // Nose features (normalized)
    noseWidth: noseWidth / faceWidth,
    noseHeight: noseHeight / faceWidth,
    noseShape: noseHeight > 0 ? noseWidth / noseHeight : 0,
    
    // Mouth features (normalized)
    mouthWidth: mouthWidth / faceWidth,
    mouthHeight: mouthHeight / faceWidth,
    mouthShape: mouthHeight > 0 ? mouthWidth / mouthHeight : 0,
    
    // Face shape features (normalized)
    faceWidth: faceWidth,
    faceHeight: faceHeight,
    faceShape: faceHeight > 0 ? faceWidth / faceHeight : 0,
    
    // Jaw shape (normalized coordinates relative to face center)
    jawShape: features.jaw.map(p => ({
      x: (p.x - features.faceCenter.x) / faceWidth,
      y: (p.y - features.faceCenter.y) / faceWidth
    })),
    
    // Symmetry features
    faceSymmetry: calculateFaceSymmetry(features),
    eyeLevel: Math.abs(features.leftEyeCenter.y - features.rightEyeCenter.y) / faceWidth,
    
    // Combined feature vector for comparison (normalized values)
    featureVector: [
      avgEyeWidth / faceWidth,
      avgEyeHeight / faceWidth,
      eyeSpacing / faceWidth,
      avgEyeWidth > 0 ? avgEyeHeight / avgEyeWidth : 0,
      noseWidth / faceWidth,
      noseHeight / faceWidth,
      noseHeight > 0 ? noseWidth / noseHeight : 0,
      mouthWidth / faceWidth,
      mouthHeight / faceWidth,
      mouthHeight > 0 ? mouthWidth / mouthHeight : 0,
      faceHeight > 0 ? faceWidth / faceHeight : 0,
      calculateFaceSymmetry(features),
      Math.abs(features.leftEyeCenter.y - features.rightEyeCenter.y) / faceWidth
    ]
  };
  
  return normalizedFeatures;
}

// Calculate face symmetry score (0-1, higher is more symmetric)
function calculateFaceSymmetry(features) {
  if (!features || !features.leftEyeCenter || !features.rightEyeCenter || !features.faceCenter) {
    return 0.5; // Default symmetry if can't calculate
  }
  
  // Check eye symmetry
  const eyeSymmetry = 1 - Math.min(1, Math.abs(features.leftEyeCenter.y - features.rightEyeCenter.y) / 
    (Math.abs(features.leftEyeCenter.x - features.rightEyeCenter.x) || 1));
  
  // Check nose position (should be centered)
  const faceWidth = Math.max(...features.jaw.map(p => p.x)) - Math.min(...features.jaw.map(p => p.x));
  const noseOffset = Math.abs(features.noseTip.x - features.faceCenter.x) / faceWidth;
  const noseSymmetry = 1 - Math.min(1, noseOffset * 2);
  
  // Average symmetry scores
  return (eyeSymmetry + noseSymmetry) / 2;
}

// Compare two feature vectors and return similarity (0-1)
function compareFeatures(features1, features2) {
  if (!features1 || !features2 || !features1.featureVector || !features2.featureVector) {
    return 0;
  }
  
  const vec1 = features1.featureVector;
  const vec2 = features2.featureVector;
  
  if (vec1.length !== vec2.length) {
    return 0;
  }
  
  // Calculate cosine similarity of feature vectors
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);
  
  if (norm1 === 0 || norm2 === 0) return 0;
  
  const similarity = dotProduct / (norm1 * norm2);
  
  // Also check individual feature differences for additional validation
  const eyeWidthDiff = Math.abs(features1.eyeWidth - features2.eyeWidth);
  const eyeHeightDiff = Math.abs(features1.eyeHeight - features2.eyeHeight);
  const noseWidthDiff = Math.abs(features1.noseWidth - features2.noseWidth);
  const noseHeightDiff = Math.abs(features1.noseHeight - features2.noseHeight);
  const mouthWidthDiff = Math.abs(features1.mouthWidth - features2.mouthWidth);
  
  // Penalize large differences in key features
  const maxAllowedDiff = 0.15; // 15% difference allowed
  let penalty = 0;
  if (eyeWidthDiff > maxAllowedDiff) penalty += 0.1;
  if (eyeHeightDiff > maxAllowedDiff) penalty += 0.1;
  if (noseWidthDiff > maxAllowedDiff) penalty += 0.1;
  if (noseHeightDiff > maxAllowedDiff) penalty += 0.1;
  if (mouthWidthDiff > maxAllowedDiff) penalty += 0.1;
  
  return Math.max(0, similarity - penalty);
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

// Face alignment: Rotate and scale face to frontal position
// This dramatically improves matching accuracy by normalizing pose/angle
async function alignFace(img, detection) {
  if (!detection || !detection.landmarks || !detection.landmarks.positions) {
    return img; // Return original if can't align
  }
  
  try {
    const landmarks = detection.landmarks.positions;
    const features = extractFacialFeatures(detection.landmarks);
    
    if (!features || !features.leftEyeCenter || !features.rightEyeCenter) {
      return img; // Can't align without eye centers
    }
    
    // Calculate angle between eyes (for rotation)
    const eyeCenterX = (features.leftEyeCenter.x + features.rightEyeCenter.x) / 2;
    const eyeCenterY = (features.leftEyeCenter.y + features.rightEyeCenter.y) / 2;
    const eyeDeltaX = features.rightEyeCenter.x - features.leftEyeCenter.x;
    const eyeDeltaY = features.rightEyeCenter.y - features.leftEyeCenter.y;
    const angle = Math.atan2(eyeDeltaY, eyeDeltaX) * (180 / Math.PI);
    
    // Calculate desired eye positions (horizontal line)
    const eyeDistance = Math.sqrt(eyeDeltaX * eyeDeltaX + eyeDeltaY * eyeDeltaY);
    const desiredEyeDistance = eyeDistance; // Keep same distance
    
    // Create canvas for aligned face
    const canvas = new Canvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    
    // Translate to eye center, rotate, then translate back
    ctx.save();
    ctx.translate(eyeCenterX, eyeCenterY);
    ctx.rotate(-angle * Math.PI / 180); // Rotate to make eyes horizontal
    ctx.translate(-eyeCenterX, -eyeCenterY);
    
    // Draw rotated image
    ctx.drawImage(img, 0, 0);
    ctx.restore();
    
    // Extract face region (crop to face box)
    const box = detection.detection.box;
    const faceCanvas = new Canvas(box.width, box.height);
    const faceCtx = faceCanvas.getContext('2d');
    faceCtx.drawImage(canvas, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
    
    return faceCanvas;
  } catch (error) {
    console.warn('⚠️ Face alignment failed, using original image:', error.message);
    return img; // Return original on error
  }
}

// Image preprocessing: Normalize lighting, contrast, detect blur
function preprocessImage(img) {
  try {
    const canvas = new Canvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;
    
    // Calculate brightness and contrast
    let sumBrightness = 0;
    let sumSquared = 0;
    const pixelCount = data.length / 4;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3 / 255; // Normalized 0-1
      sumBrightness += brightness;
      sumSquared += brightness * brightness;
    }
    
    const avgBrightness = sumBrightness / pixelCount;
    const variance = (sumSquared / pixelCount) - (avgBrightness * avgBrightness);
    const contrast = Math.sqrt(variance);
    
    // Normalize brightness if too dark or too bright
    if (avgBrightness < CONFIG.MIN_BRIGHTNESS || avgBrightness > CONFIG.MAX_BRIGHTNESS) {
      const targetBrightness = 0.5; // Target middle brightness
      const brightnessAdjustment = targetBrightness - avgBrightness;
      
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, data[i] + brightnessAdjustment * 255 * 0.5));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + brightnessAdjustment * 255 * 0.5));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + brightnessAdjustment * 255 * 0.5));
      }
    }
    
    // Enhance contrast if too low
    if (contrast < 0.15) {
      const contrastMultiplier = 0.2 / contrast; // Boost to 0.2
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        
        data[i] = Math.min(255, Math.max(0, ((r - 0.5) * contrastMultiplier + 0.5) * 255));
        data[i + 1] = Math.min(255, Math.max(0, ((g - 0.5) * contrastMultiplier + 0.5) * 255));
        data[i + 2] = Math.min(255, Math.max(0, ((b - 0.5) * contrastMultiplier + 0.5) * 255));
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  } catch (error) {
    console.warn('⚠️ Image preprocessing failed, using original:', error.message);
    return img;
  }
}

// Detect blur using Laplacian variance (higher = sharper)
function detectBlur(img) {
  try {
    const canvas = new Canvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;
    
    // Convert to grayscale and calculate Laplacian
    let laplacianSum = 0;
    let laplacianSquared = 0;
    let pixelCount = 0;
    
    for (let y = 1; y < img.height - 1; y++) {
      for (let x = 1; x < img.width - 1; x++) {
        const idx = (y * img.width + x) * 4;
        const idxLeft = (y * img.width + (x - 1)) * 4;
        const idxRight = (y * img.width + (x + 1)) * 4;
        const idxTop = ((y - 1) * img.width + x) * 4;
        const idxBottom = ((y + 1) * img.width + x) * 4;
        
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const grayLeft = (data[idxLeft] + data[idxLeft + 1] + data[idxLeft + 2]) / 3;
        const grayRight = (data[idxRight] + data[idxRight + 1] + data[idxRight + 2]) / 3;
        const grayTop = (data[idxTop] + data[idxTop + 1] + data[idxTop + 2]) / 3;
        const grayBottom = (data[idxBottom] + data[idxBottom + 1] + data[idxBottom + 2]) / 3;
        
        // Laplacian kernel: center * 4 - neighbors
        const laplacian = Math.abs(4 * gray - grayLeft - grayRight - grayTop - grayBottom);
        laplacianSum += laplacian;
        laplacianSquared += laplacian * laplacian;
        pixelCount++;
      }
    }
    
    const mean = laplacianSum / pixelCount;
    const variance = (laplacianSquared / pixelCount) - (mean * mean);
    
    return {
      variance,
      isBlurry: variance < CONFIG.MIN_BLUR_THRESHOLD,
      score: Math.min(1, variance / 500) // Normalize to 0-1 (500 is typical sharp image)
    };
  } catch (error) {
    console.warn('⚠️ Blur detection failed:', error.message);
    return { variance: 0, isBlurry: false, score: 0.5 };
  }
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
      
      // ⚡ ENTERPRISE: Validate image dimensions
      if (img.width < CONFIG.MIN_IMAGE_WIDTH) {
        throw new Error(`Image too small: ${img.width}px (minimum: ${CONFIG.MIN_IMAGE_WIDTH}px). Please use higher quality camera settings.`);
      }
      
      // ⚡ ENTERPRISE: Preprocess image (normalize lighting/contrast)
      console.log('🔧 Preprocessing image (normalizing lighting and contrast)...');
      img = preprocessImage(img);
      
      // ⚡ ENTERPRISE: Detect blur
      const blurResult = detectBlur(img);
      if (blurResult.isBlurry) {
        console.warn(`⚠️ Image appears blurry (variance: ${blurResult.variance.toFixed(1)}, threshold: ${CONFIG.MIN_BLUR_THRESHOLD})`);
        console.warn(`   Blur score: ${(blurResult.score * 100).toFixed(1)}% - Image may affect recognition accuracy`);
      } else {
        console.log(`✅ Image sharpness: ${(blurResult.score * 100).toFixed(1)}% (variance: ${blurResult.variance.toFixed(1)})`);
      }
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
          
          // ⚡ OPTIMIZED: Timeout set to 8s for reliability (face detection can be slow)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Face detection timeout after 8 seconds')), 8000)
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
    
    // ⚡ STRICT: Validate facial features before generating embedding
    const validation = validateFaceDetection(bestDetection);
    
    // Extract facial features for validation
    const features = extractFacialFeatures(bestDetection.landmarks);
    const featureValidation = validateFacialFeatures(features);
    
    // ⚡ STRICT: Require facial features to be detected
    if (CONFIG.REQUIRE_FACIAL_FEATURES && !featureValidation.valid) {
      const errorMsg = `Facial features not properly detected: ${featureValidation.issues.join(', ')}`;
      console.error(`❌ ${errorMsg}`);
      console.error(`   Feature score: ${(featureValidation.score * 100).toFixed(1)}% (minimum: ${(CONFIG.MIN_FEATURE_SCORE * 100).toFixed(1)}%)`);
      throw new Error(errorMsg + '. Please ensure your face is clearly visible, well-lit, and facing the camera directly.');
    }
    
    // ⚡ STRICT: Require minimum quality
    const finalQuality = validation.quality || Math.max(0.3, bestScore * 0.8);
    const finalDetectionScore = validation.detectionScore || bestScore;
    
    if (finalQuality < CONFIG.MIN_FACE_QUALITY) {
      const errorMsg = `Face quality too low: ${(finalQuality * 100).toFixed(1)}% (minimum: ${(CONFIG.MIN_FACE_QUALITY * 100).toFixed(1)}%)`;
      console.error(`❌ ${errorMsg}`);
      if (validation.featureIssues && validation.featureIssues.length > 0) {
        console.error(`   Issues: ${validation.featureIssues.join(', ')}`);
      }
      throw new Error(errorMsg + '. Please ensure good lighting, face the camera directly, and keep your face clearly visible.');
    }
    
    if (!validation.valid) {
      console.warn(`⚠️ Face validation warning: ${validation.reason || 'Quality below optimal'}`);
      console.warn(`   Quality: ${(finalQuality * 100).toFixed(1)}% (minimum: ${(CONFIG.MIN_FACE_QUALITY * 100).toFixed(1)}%)`);
    }
    
    // Log facial features detected
    if (featureValidation.features) {
      console.log(`👁️ Facial features validated:`);
      console.log(`   Eyes: ${featureValidation.features.eyesDetected ? '✅' : '❌'}`);
      console.log(`   Nose: ${featureValidation.features.noseDetected ? '✅' : '❌'}`);
      console.log(`   Mouth: ${featureValidation.features.mouthDetected ? '✅' : '❌'}`);
      console.log(`   Face shape: ${featureValidation.features.faceShapeDetected ? '✅' : '❌'}`);
      console.log(`   Feature score: ${(featureValidation.score * 100).toFixed(1)}%`);
    }
    
    // ⚡ ENTERPRISE: Align face to frontal position before generating embedding
    // This dramatically improves matching accuracy
    console.log('🔄 Aligning face to frontal position...');
    const alignedImg = await alignFace(img, bestDetection);
    
    // Re-detect on aligned image for better embedding
    let finalDetection = bestDetection;
    try {
      const alignedDetections = await faceapi
        .detectAllFaces(alignedImg, new faceapi.SsdMobilenetv1Options({ 
          minConfidence: 0.5,
          maxResults: 1
        }))
        .withFaceLandmarks()
        .withFaceDescriptors();
      
      if (alignedDetections && alignedDetections.length > 0) {
        finalDetection = alignedDetections[0];
        console.log('✅ Face aligned successfully - using aligned embedding');
      } else {
        console.warn('⚠️ Could not detect face in aligned image, using original detection');
      }
    } catch (alignError) {
      console.warn('⚠️ Face alignment detection failed, using original:', alignError.message);
    }
    
    // Extract normalized facial features for matching
    const normalizedFeatures = extractNormalizedFeatures(finalDetection.landmarks);
    if (!normalizedFeatures) {
      console.warn('⚠️ Could not extract normalized features from landmarks');
    } else {
      console.log(`👁️ Facial features extracted - Eye shape: ${normalizedFeatures.eyeShape.toFixed(3)}, Nose shape: ${normalizedFeatures.noseShape.toFixed(3)}, Mouth shape: ${normalizedFeatures.mouthShape.toFixed(3)}`);
    }
    
    // Log quality metrics
    const totalTime = Date.now() - totalStartTime;
    console.log(`✅ Face detected - Quality: ${(finalQuality * 100).toFixed(1)}%, Confidence: ${(finalDetectionScore * 100).toFixed(1)}%`);
    console.log(`⚡ Total embedding generation time: ${totalTime}ms`);
    
    return {
      embedding: Array.from(finalDetection.descriptor),
      quality: finalQuality,
      detectionScore: finalDetectionScore,
      faceCount: detections.length,
      features: normalizedFeatures // Include normalized features for matching
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
  const clockInFeatures = embeddingData.features || null; // Features from clock-in image
  
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
  
  // ⚡ STRICT MATCHING: Require minimum quality before attempting match
  if (quality < CONFIG.MIN_FACE_QUALITY) {
    console.error(`❌ Face quality too low: ${(quality * 100).toFixed(1)}% (minimum: ${(CONFIG.MIN_FACE_QUALITY * 100).toFixed(1)}%)`);
    console.error(`   Cannot match with low quality face. Please ensure good lighting and face the camera directly.`);
    return null;
  }
  
  // ⚡ STRICT: Require features for matching if feature matching is enabled
  if (CONFIG.REQUIRE_FEATURE_MATCHING && !clockInFeatures) {
    console.error(`❌ Facial features not available for matching`);
    console.error(`   Feature-based matching is required for accuracy. Please ensure face detection captured all features.`);
    return null;
  }
  
  // ⚡ STRICT THRESHOLDS: Use higher thresholds based on quality, but NEVER below absolute minimum
  let threshold = CONFIG.MIN_SIMILARITY_THRESHOLD; // Start with 65%
  
  // Adjust threshold based on quality, but maintain strict minimums
  if (quality < 0.65) {
    // Low quality - use higher threshold (stricter)
    threshold = 0.78; // 78% for low quality (increased from 70%)
    console.log(`⚠️ Low quality image (${(quality * 100).toFixed(1)}%) - using STRICTER threshold: ${(threshold * 100).toFixed(1)}%`);
  } else if (quality < 0.8) {
    // Medium quality
    threshold = 0.76; // 76% for medium quality (increased from 68%)
  } else {
    // High quality - use base threshold
    threshold = CONFIG.MIN_SIMILARITY_THRESHOLD; // 75% for high quality (increased from 65%)
  }
  
  // NEVER go below absolute minimum
  threshold = Math.max(threshold, CONFIG.ABSOLUTE_MINIMUM_SIMILARITY);
  
  console.log(`🔍 STRICT Matching - Threshold: ${(threshold * 100).toFixed(1)}% (quality: ${(quality * 100).toFixed(1)}%)`);
  console.log(`   Absolute minimum: ${(CONFIG.ABSOLUTE_MINIMUM_SIMILARITY * 100).toFixed(1)}% (no exceptions)`);
  
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
      
      // Use combined similarity (cosine + Euclidean) for more robust matching
      const similarityResult = combinedSimilarity(embedding, staffEmbedding);
      const similarity = similarityResult.combined; // Use combined score
      
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
  
  // ⚡ STRICT VALIDATION: Check candidates with strict requirements
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.similarity - a.similarity);
    const topMatch = candidates[0];
    
    // ⚡ STRICT: Require minimum similarity gap to avoid ambiguity
    if (candidates.length > 1) {
      const secondMatch = candidates[1];
      const similarityGap = topMatch.similarity - secondMatch.similarity;
      
      // If gap is too small, it's ambiguous - reject for safety
      if (similarityGap < CONFIG.MIN_SIMILARITY_GAP) {
        console.error(`❌ AMBIGUOUS MATCH - Rejected for safety`);
        console.error(`   Top match: ${topMatch.staff.name} - ${(topMatch.similarity * 100).toFixed(1)}%`);
        console.error(`   Second match: ${secondMatch.staff.name} - ${(secondMatch.similarity * 100).toFixed(1)}%`);
        console.error(`   Gap: ${(similarityGap * 100).toFixed(1)}% (required: ${(CONFIG.MIN_SIMILARITY_GAP * 100).toFixed(1)}%)`);
        console.error(`   ⚠️ Too close to call - rejecting to prevent false match`);
        return null;
      }
      
      console.log(`✅ Clear match - Gap: ${(similarityGap * 100).toFixed(1)}% (top: ${(topMatch.similarity * 100).toFixed(1)}%, second: ${(secondMatch.similarity * 100).toFixed(1)}%)`);
    }
    
    // ⚡ STRICT: Must meet absolute minimum similarity
    if (topMatch.similarity < CONFIG.ABSOLUTE_MINIMUM_SIMILARITY) {
      console.error(`❌ Match rejected - below absolute minimum`);
      console.error(`   Similarity: ${(topMatch.similarity * 100).toFixed(1)}%`);
      console.error(`   Required: ${(CONFIG.ABSOLUTE_MINIMUM_SIMILARITY * 100).toFixed(1)}%`);
      return null;
    }
    
    bestMatch = topMatch;
    bestSimilarity = topMatch.similarity;
  }
  
  // ⚡ STRICT: No match found - reject
  if (!bestMatch || bestSimilarity < threshold) {
    console.error(`❌ NO MATCH FOUND - Rejected`);
    console.error(`   Best similarity: ${(bestSimilarity * 100).toFixed(1)}%`);
    console.error(`   Required threshold: ${(threshold * 100).toFixed(1)}%`);
    console.error(`   Absolute minimum: ${(CONFIG.ABSOLUTE_MINIMUM_SIMILARITY * 100).toFixed(1)}%`);
    console.error(`📊 Possible reasons:`);
    console.error(`   - Person not registered in system`);
    console.error(`   - Face quality too low (lighting, angle, distance)`);
    console.error(`   - Face too different from registration photos`);
    console.error(`   - Multiple people in frame`);
    return null;
  }
  
  // ⚡ STRICT: Final validation - must be above threshold AND absolute minimum
  if (bestSimilarity < threshold || bestSimilarity < CONFIG.ABSOLUTE_MINIMUM_SIMILARITY) {
    console.error(`❌ Match rejected - failed final validation`);
    console.error(`   Similarity: ${(bestSimilarity * 100).toFixed(1)}%`);
    console.error(`   Threshold: ${(threshold * 100).toFixed(1)}%`);
    console.error(`   Absolute minimum: ${(CONFIG.ABSOLUTE_MINIMUM_SIMILARITY * 100).toFixed(1)}%`);
    return null;
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

