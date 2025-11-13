const faceapi = require('face-api.js');
const { Canvas, Image, ImageData } = require('canvas');
const fs = require('fs');
const path = require('path');

// Configure face-api.js to use node-canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;

async function loadModels() {
  if (modelsLoaded) return;
  
  const modelsPath = path.join(__dirname, '../models/face-api');
  
  try {
    // Try to load models from local path
    if (fs.existsSync(modelsPath)) {
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);
      modelsLoaded = true;
      console.log('Face recognition models loaded from disk');
    } else {
      console.warn('Face recognition models not found. Please download and place in ./models/face-api/');
      console.warn('Download from: https://github.com/justadudewhohacks/face-api.js-models');
      // For now, we'll use a fallback method
      modelsLoaded = true; // Set to true to prevent repeated warnings
    }
  } catch (error) {
    console.error('Error loading face recognition models:', error);
    // Fallback: use simple image comparison
    modelsLoaded = true;
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

// Generate face embedding from image buffer
async function generateEmbedding(imageBuffer) {
  await loadModels();
  
  try {
    const img = await faceapi.bufferToImage(imageBuffer);
    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    if (!detection) {
      throw new Error('No face detected in image');
    }
    
    return Array.from(detection.descriptor);
  } catch (error) {
    console.error('Error generating embedding:', error);
    // Fallback: generate a simple hash-based embedding
    // This is a placeholder - in production, you'd want proper face recognition
    return generateFallbackEmbedding(imageBuffer);
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

// Find best matching staff
async function findMatchingStaff(embedding, staffList) {
  const threshold = 0.6; // Adjust based on your needs
  
  let bestMatch = null;
  let bestSimilarity = 0;
  
  for (const staff of staffList) {
    const decryptedEmbedding = staff.decryptedEmbedding || staff.faceEmbedding;
    const similarity = cosineSimilarity(embedding, decryptedEmbedding);
    
    if (similarity > bestSimilarity && similarity >= threshold) {
      bestSimilarity = similarity;
      bestMatch = { staff, similarity };
    }
  }
  
  return bestMatch;
}

module.exports = {
  loadModels,
  generateEmbedding,
  findMatchingStaff,
  cosineSimilarity
};

