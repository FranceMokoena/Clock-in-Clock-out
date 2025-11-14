const faceapi = require('face-api.js');
const { Canvas, Image, ImageData } = require('canvas');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configure face-api.js to use node-canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;
let modelsLoading = false;
let modelsLoadError = null;

// Configuration
const CONFIG = {
  // Recognition thresholds
  MIN_SIMILARITY_THRESHOLD: 0.60,  // Lowered to 0.60 for better matching (was 0.65)
  HIGH_CONFIDENCE_THRESHOLD: 0.75,  // High confidence match
  VERY_HIGH_CONFIDENCE_THRESHOLD: 0.85, // Very high confidence
  
  // Face detection settings
  MIN_FACE_SIZE: 100,  // Minimum face size in pixels
  MAX_FACE_SIZE: 1000, // Maximum face size in pixels
  MIN_DETECTION_SCORE: 0.5, // Minimum detection confidence
  
  // Face quality requirements
  MIN_FACE_QUALITY: 0.5, // Minimum face quality score
  MAX_FACE_ANGLE: 30, // Maximum face angle in degrees (for pitch/yaw)
};

async function loadModels() {
  if (modelsLoaded && !modelsLoadError) {
    // Models already loaded successfully
    return;
  }
  
  if (modelsLoading) {
    // Wait for ongoing load
    while (modelsLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }
  
  // Reset error if we're retrying
  if (modelsLoadError) {
    console.log('🔄 Retrying to load face recognition models...');
    modelsLoadError = null;
  }
  
  modelsLoading = true;
  const modelsPath = path.join(__dirname, '../models/face-api');
  
  try {
    // Try to load models from local path first
    if (fs.existsSync(modelsPath)) {
      // Check if at least one model file exists
      const manifestPath = path.join(modelsPath, 'ssd_mobilenetv1_model-weights_manifest.json');
      if (fs.existsSync(manifestPath)) {
        console.log('📦 Loading face recognition models from disk...');
        try {
          await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
          await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
          await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
          modelsLoaded = true;
          modelsLoading = false;
          modelsLoadError = null; // Clear any previous errors
          console.log('✅ Face recognition models loaded successfully from disk');
          return;
        } catch (diskError) {
          console.warn('⚠️ Failed to load models from disk, will try CDN:', diskError.message);
          // Continue to CDN fallback
        }
      } else {
        console.log('📦 Models directory exists but is empty, will use CDN');
      }
    }
    
    // Try to load from CDN/remote (for Render deployment)
    console.log('📦 Attempting to load models from CDN...');
    
    // Try multiple CDN sources in order of reliability
    const cdnSources = [
      {
        name: 'jsdelivr CDN',
        url: 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'
      },
      {
        name: 'unpkg CDN',
        url: 'https://unpkg.com/@vladmandic/face-api@1.7.14/model'
      },
      {
        name: 'GitHub Raw',
        url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/weights'
      },
      {
        name: 'GitHub Raw (alternative)',
        url: 'https://github.com/justadudewhohacks/face-api.js-models/raw/master/weights'
      }
    ];
    
    for (const source of cdnSources) {
      try {
        console.log(`   Trying ${source.name}...`);
        const baseUrl = source.url;
        console.log(`   Loading SSD MobileNet v1 from ${baseUrl}...`);
        await faceapi.nets.ssdMobilenetv1.loadFromUri(baseUrl);
        console.log(`   Loading Face Landmark 68 Net from ${baseUrl}...`);
        await faceapi.nets.faceLandmark68Net.loadFromUri(baseUrl);
        console.log(`   Loading Face Recognition Net from ${baseUrl}...`);
        await faceapi.nets.faceRecognitionNet.loadFromUri(baseUrl);
        modelsLoaded = true;
        modelsLoading = false;
        modelsLoadError = null; // Clear any previous errors
        console.log(`✅ Face recognition models loaded successfully from ${source.name}`);
        return;
      } catch (error) {
        const errorMsg = error?.message || String(error) || 'Unknown error';
        console.warn(`⚠️ Could not load from ${source.name}:`, errorMsg);
        // Continue to next source
      }
    }
    
    // If all CDN sources failed
    console.error('❌ All CDN sources failed to load models');
    modelsLoadError = 'All CDN attempts failed';
    
    // If both fail, warn but don't crash
    console.error('❌ Face recognition models not found!');
    console.error('📝 Please download models and place in: ./models/face-api/');
    console.error('🔗 Download from: https://github.com/justadudewhohacks/face-api.js-models');
    console.error('⚠️ System will use fallback method (less accurate)');
    modelsLoadError = 'Models not found - using fallback';
    modelsLoaded = true; // Set to true to prevent repeated warnings
    modelsLoading = false;
  } catch (error) {
    console.error('❌ Error loading face recognition models:', error);
    modelsLoaded = true; // Set to true to prevent repeated attempts
    modelsLoading = false;
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
  await loadModels();
  
  // Check if models actually loaded successfully
  // If models failed to load, try one more time before giving up
  if (modelsLoadError) {
    console.warn('⚠️ Models previously failed to load, attempting to reload...');
    modelsLoaded = false; // Reset to allow retry
    await loadModels();
    
    // Check again after retry
    if (modelsLoadError) {
      console.error('❌ Cannot generate proper embeddings: Models not loaded after retry');
      console.error(`   Error: ${modelsLoadError}`);
      console.error('💡 Suggestions:');
      console.error('   1. Check Render logs for model download errors');
      console.error('   2. Verify CDN connectivity');
      console.error('   3. Manually download models and commit to repository');
      throw new Error('Face recognition models not loaded. Please ensure models are available.');
    }
  }
  
  try {
    const img = await faceapi.bufferToImage(imageBuffer);
    
    // Try to detect faces with better options
    const detections = await faceapi
      .detectAllFaces(img)
      .withFaceLandmarks()
      .withFaceDescriptors();
    
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
    
    // Validate the selected face
    const validation = validateFaceDetection(bestDetection);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }
    
    // Log quality metrics
    console.log(`✅ Face detected - Quality: ${(validation.quality * 100).toFixed(1)}%, Confidence: ${(validation.detectionScore * 100).toFixed(1)}%`);
    
    return {
      embedding: Array.from(bestDetection.descriptor),
      quality: validation.quality,
      detectionScore: validation.detectionScore,
      faceCount: detections.length
    };
  } catch (error) {
    const errorMessage = error?.message || String(error) || 'Unknown error';
    console.error('❌ Error generating embedding:', errorMessage);
    
    // Only use fallback if models are actually loaded
    // Otherwise, throw the error so user knows models need to be set up
    if (errorMessage.includes('No face detected') || errorMessage.includes('quality')) {
      throw error; // Re-throw quality/detection errors
    }
    
    // For other errors, try fallback but warn
    console.warn('⚠️ Using fallback embedding method (less accurate)');
    return {
      embedding: generateFallbackEmbedding(imageBuffer),
      quality: 0.3, // Low quality for fallback
      detectionScore: 0.3,
      faceCount: 0
    };
  }
}

// Fallback embedding generator (simple hash-based)
function generateFallbackEmbedding(imageBuffer) {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(imageBuffer).digest();
  // Convert to 128-dimensional vector (like face-api.js)
  const embedding = [];
  for (let i = 0; i < 128; i++) {
    embedding.push((hash[i % hash.length] - 128) / 128);
  }
  return embedding;
}

// Find best matching staff with enhanced matching logic
async function findMatchingStaff(embeddingData, staffList) {
  // Handle both new format (object with embedding) and old format (just array)
  const embedding = embeddingData.embedding || embeddingData;
  const quality = embeddingData.quality || 1.0;
  
  // Adjust threshold based on image quality
  // Lower quality images need higher similarity to match
  // BUT: Lower threshold for first-time matching to be more lenient
  let threshold = CONFIG.MIN_SIMILARITY_THRESHOLD;
  
  // If using fallback embeddings (low quality), matching won't work - reject early
  if (quality < 0.5) {
    console.error('❌ Cannot match: Using fallback embeddings (models not loaded)');
    return null;
  }
  
  if (quality < 0.6) {
    threshold = 0.70; // Stricter threshold for low quality
  } else if (quality < 0.8) {
    threshold = 0.68; // Slightly stricter
  } else {
    // For high quality, use slightly lower threshold for better matching
    threshold = 0.62; // More lenient for good quality images
  }
  
  console.log(`🔍 Matching with threshold: ${(threshold * 100).toFixed(1)}% (quality: ${(quality * 100).toFixed(1)}%)`);
  
  let bestMatch = null;
  let bestSimilarity = 0;
  const candidates = [];
  
  // Calculate similarity for all staff members
  console.log(`🔍 Comparing with ${staffList.length} registered staff members...`);
  
  for (const staff of staffList) {
    const decryptedEmbedding = staff.decryptedEmbedding || staff.faceEmbedding;
    if (!decryptedEmbedding || !Array.isArray(decryptedEmbedding)) {
      console.warn(`⚠️ Invalid embedding for staff: ${staff.name}`);
      continue;
    }
    
    // Ensure embeddings are same length
    if (embedding.length !== decryptedEmbedding.length) {
      console.warn(`⚠️ Embedding length mismatch for ${staff.name}: ${embedding.length} vs ${decryptedEmbedding.length}`);
      continue;
    }
    
    const similarity = cosineSimilarity(embedding, decryptedEmbedding);
    
    console.log(`   ${staff.name}: ${(similarity * 100).toFixed(1)}% similarity`);
    
    // Collect all candidates above threshold
    if (similarity >= threshold) {
      candidates.push({ staff, similarity });
    }
    
    // Track best match
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = { staff, similarity };
    }
  }
  
  console.log(`📊 Best match: ${bestMatch ? bestMatch.staff.name : 'None'} - ${(bestSimilarity * 100).toFixed(1)}%`);
  
  // If we have multiple candidates, ensure the best one is significantly better
  if (candidates.length > 1) {
    // Sort by similarity
    candidates.sort((a, b) => b.similarity - a.similarity);
    const topMatch = candidates[0];
    const secondMatch = candidates[1];
    
    // If top match isn't significantly better than second, be more cautious
    const similarityGap = topMatch.similarity - secondMatch.similarity;
    if (similarityGap < 0.05 && topMatch.similarity < CONFIG.HIGH_CONFIDENCE_THRESHOLD) {
      console.warn(`⚠️ Multiple close matches detected. Top: ${(topMatch.similarity * 100).toFixed(1)}%, Second: ${(secondMatch.similarity * 100).toFixed(1)}%`);
      // Require higher threshold when matches are close
      if (topMatch.similarity < CONFIG.HIGH_CONFIDENCE_THRESHOLD) {
        return null; // Too ambiguous
      }
    }
    
    bestMatch = topMatch;
    bestSimilarity = topMatch.similarity;
  }
  
  // Final validation: ensure match meets threshold
  if (!bestMatch || bestSimilarity < threshold) {
    console.log(`❌ No match found. Best similarity: ${(bestSimilarity * 100).toFixed(1)}%, Required: ${(threshold * 100).toFixed(1)}%`);
    return null;
  }
  
  // Log match quality
  let confidenceLevel = 'Medium';
  if (bestSimilarity >= CONFIG.VERY_HIGH_CONFIDENCE_THRESHOLD) {
    confidenceLevel = 'Very High';
  } else if (bestSimilarity >= CONFIG.HIGH_CONFIDENCE_THRESHOLD) {
    confidenceLevel = 'High';
  }
  
  console.log(`✅ Match found: ${bestMatch.staff.name} - Similarity: ${(bestSimilarity * 100).toFixed(1)}% (${confidenceLevel} confidence)`);
  
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

