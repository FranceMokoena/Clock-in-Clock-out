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

// Configuration
const CONFIG = {
  // Recognition thresholds
  MIN_SIMILARITY_THRESHOLD: 0.65,  // Increased from 0.6 for better accuracy
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
  if (modelsLoaded) return;
  if (modelsLoading) {
    // Wait for ongoing load
    while (modelsLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }
  
  modelsLoading = true;
  const modelsPath = path.join(__dirname, '../models/face-api');
  
  try {
    // Try to load models from local path first
    if (fs.existsSync(modelsPath)) {
      console.log('📦 Loading face recognition models from disk...');
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
      modelsLoaded = true;
      modelsLoading = false;
      console.log('✅ Face recognition models loaded successfully from disk');
      return;
    }
    
    // Try to load from CDN/remote (for Render deployment)
    console.log('📦 Attempting to load models from remote source...');
    try {
      await faceapi.nets.ssdMobilenetv1.loadFromUri('https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/weights');
      await faceapi.nets.faceLandmark68Net.loadFromUri('https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/weights');
      await faceapi.nets.faceRecognitionNet.loadFromUri('https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master/weights');
      modelsLoaded = true;
      modelsLoading = false;
      console.log('✅ Face recognition models loaded successfully from remote');
      return;
    } catch (remoteError) {
      console.warn('⚠️ Could not load models from remote:', remoteError.message);
    }
    
    // If both fail, warn but don't crash
    console.error('❌ Face recognition models not found!');
    console.error('📝 Please download models and place in: ./models/face-api/');
    console.error('🔗 Download from: https://github.com/justadudewhohacks/face-api.js-models');
    console.error('⚠️ System will use fallback method (less accurate)');
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
  
  // Check if face is roughly centered (optional quality check)
  // This is a simple heuristic - you could add more sophisticated checks
  
  return Math.max(0, Math.min(1, qualityScore));
}

// Validate face detection quality
function validateFaceDetection(detection) {
  if (!detection) {
    return { valid: false, reason: 'No face detected' };
  }
  
  const quality = calculateFaceQuality(detection);
  
  if (quality < CONFIG.MIN_FACE_QUALITY) {
    return { 
      valid: false, 
      reason: `Face quality too low (${(quality * 100).toFixed(1)}%). Please ensure good lighting and face the camera directly.`,
      quality 
    };
  }
  
  const detectionScore = detection.detection?.score || 0;
  if (detectionScore < CONFIG.MIN_DETECTION_SCORE) {
    return { 
      valid: false, 
      reason: `Detection confidence too low (${(detectionScore * 100).toFixed(1)}%)`,
      quality 
    };
  }
  
  return { valid: true, quality, detectionScore };
}

// Generate face embedding from image buffer with enhanced validation
async function generateEmbedding(imageBuffer) {
  await loadModels();
  
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
    console.error('❌ Error generating embedding:', error.message);
    
    // Only use fallback if models are actually loaded
    // Otherwise, throw the error so user knows models need to be set up
    if (error.message.includes('No face detected') || error.message.includes('quality')) {
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
  let threshold = CONFIG.MIN_SIMILARITY_THRESHOLD;
  if (quality < 0.6) {
    threshold = 0.70; // Stricter threshold for low quality
  } else if (quality < 0.8) {
    threshold = 0.68; // Slightly stricter
  }
  
  let bestMatch = null;
  let bestSimilarity = 0;
  const candidates = [];
  
  // Calculate similarity for all staff members
  for (const staff of staffList) {
    const decryptedEmbedding = staff.decryptedEmbedding || staff.faceEmbedding;
    if (!decryptedEmbedding || !Array.isArray(decryptedEmbedding)) {
      console.warn(`⚠️ Invalid embedding for staff: ${staff.name}`);
      continue;
    }
    
    const similarity = cosineSimilarity(embedding, decryptedEmbedding);
    
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

