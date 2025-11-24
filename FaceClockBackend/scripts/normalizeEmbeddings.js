/**
 * Normalize all stored embeddings and recompute centroids
 * 
 * This script ensures all embeddings are L2-normalized (required for cosine similarity)
 * and recomputes centroids using quality-weighted averaging.
 * 
 * Run: node scripts/normalizeEmbeddings.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Staff = require('../models/Staff');

// Import centroid computation function
const faceRecognition = require('../utils/faceRecognitionONNX');
const { computeCentroidTemplate } = faceRecognition;

/**
 * L2 normalize a vector
 */
function normalize(vector) {
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return vector; // Avoid division by zero
  return vector.map(x => x / norm);
}

/**
 * Normalize all embeddings for a staff member
 */
function normalizeEmbeddings(embeddings) {
  if (!embeddings || !Array.isArray(embeddings)) {
    return [];
  }
  
  return embeddings.map(embedding => {
    if (!embedding || !Array.isArray(embedding)) {
      return embedding;
    }
    
    // Check if already normalized (norm should be ~1.0)
    const currentNorm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (Math.abs(currentNorm - 1.0) < 0.01) {
      // Already normalized
      return embedding;
    }
    
    // Normalize
    return normalize(embedding);
  });
}

async function normalizeAll() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get all staff
    const staffList = await Staff.find({});
    console.log(`📋 Found ${staffList.length} staff members`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const staff of staffList) {
      // Check both faceEmbeddings (new) and faceEmbedding (old single)
      const embeddings = staff.faceEmbeddings && staff.faceEmbeddings.length > 0 
        ? staff.faceEmbeddings 
        : (staff.faceEmbedding ? [staff.faceEmbedding] : []);
      
      if (embeddings.length === 0) {
        console.log(`⚠️ Skipping ${staff.name} - No embeddings found`);
        skippedCount++;
        continue;
      }
      
      console.log(`\n📝 Processing ${staff.name} (${embeddings.length} embedding(s))...`);
      
      // Normalize all embeddings
      const normalizedEmbeddings = normalizeEmbeddings(embeddings);
      
      // Check if normalization changed anything
      let changed = false;
      for (let i = 0; i < normalizedEmbeddings.length; i++) {
        const originalNorm = Math.sqrt(embeddings[i].reduce((sum, val) => sum + val * val, 0));
        const newNorm = Math.sqrt(normalizedEmbeddings[i].reduce((sum, val) => sum + val * val, 0));
        if (Math.abs(originalNorm - newNorm) > 0.01) {
          changed = true;
          console.log(`   🔧 Embedding ${i + 1}: Normalized (norm: ${originalNorm.toFixed(3)} → ${newNorm.toFixed(3)})`);
        }
      }
      
      if (!changed && staff.centroidEmbedding) {
        console.log(`   ✅ All embeddings already normalized`);
      } else {
        // Update embeddings (use faceEmbeddings array)
        staff.faceEmbeddings = normalizedEmbeddings;
        // Clear old single embedding if it exists
        if (staff.faceEmbedding) {
          staff.faceEmbedding = undefined;
        }
        
        // Recompute centroid using quality-weighted averaging
        const qualities = staff.embeddingQualities || [];
        const centroid = computeCentroidTemplate(normalizedEmbeddings, qualities);
        
        if (centroid && centroid.length > 0) {
          staff.centroidEmbedding = centroid;
          
          // Compute centroid quality (average of embedding qualities)
          if (qualities.length > 0) {
            const avgQuality = qualities.reduce((sum, q) => sum + (q?.score || 0.5), 0) / qualities.length;
            staff.centroidQuality = avgQuality;
          }
          
          console.log(`   ✅ Centroid recomputed (${centroid.length} dimensions)`);
        } else {
          console.warn(`   ⚠️ Failed to compute centroid`);
        }
        
        // Save
        await staff.save();
        console.log(`   ✅ Saved`);
        updatedCount++;
      }
    }
    
    console.log(`\n✅ Normalization complete!`);
    console.log(`   Updated: ${updatedCount} staff members`);
    console.log(`   Skipped: ${skippedCount} staff members`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run
normalizeAll();

