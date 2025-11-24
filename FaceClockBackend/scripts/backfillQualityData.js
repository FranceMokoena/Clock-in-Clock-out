/**
 * 🏦 BANK-GRADE: Backfill Quality Data for Existing Staff
 * 
 * This script computes and stores quality data for existing staff members
 * who don't have embeddingQualities stored. This improves centroid computation
 * and matching accuracy for all staff.
 * 
 * Usage: node scripts/backfillQualityData.js
 */

const mongoose = require('mongoose');
const Staff = require('../models/Staff');
require('dotenv').config();

async function backfillQualityData() {
  try {
    // Connect to MongoDB
    // Use same logic as server.js: try MONGO_URI first, then MONGODB_URI, then default
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/Employees';
    
    console.log(`🔌 Connecting to MongoDB...`);
    console.log(`   URI: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials in log
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${mongoose.connection.name}`);

    // Find all staff with embeddings but missing quality data
    const staffList = await Staff.find({ 
      isActive: true,
      faceEmbeddings: { $exists: true, $ne: [] },
      $or: [
        { embeddingQualities: { $exists: false } },
        { embeddingQualities: { $size: 0 } },
        { embeddingQualities: null }
      ]
    }).lean();

    console.log(`📊 Found ${staffList.length} staff members missing quality data`);

    if (staffList.length === 0) {
      console.log('✅ All staff already have quality data!');
      await mongoose.disconnect();
      return;
    }

    let updated = 0;
    let failed = 0;

    for (const staff of staffList) {
      try {
        const embeddings = staff.faceEmbeddings || [];
        if (embeddings.length === 0) {
          console.warn(`⚠️ ${staff.name}: No embeddings found, skipping`);
          continue;
        }

        console.log(`\n📝 Processing ${staff.name} (${embeddings.length} embeddings)...`);

        // Compute quality scores from embedding norms
        // Higher norm (closer to 1.0) typically indicates better quality
        const embeddingQualities = embeddings.map((emb, idx) => {
          if (!emb || !Array.isArray(emb) || emb.length !== 512) {
            console.warn(`   ⚠️ Embedding ${idx + 1} is invalid, using default quality`);
            return {
              score: 0.75,
              sharpness: 0.75,
              blurVariance: 100,
              brightness: 0.5,
              detectionScore: 0.75,
              createdAt: new Date(),
            };
          }

          // Compute norm as quality indicator
          const norm = Math.sqrt(emb.reduce((sum, val) => sum + val * val, 0));
          
          // Normalized embeddings should have norm ~1.0
          // Norm close to 1.0 = good quality, far from 1.0 = lower quality
          const normQuality = Math.min(1.0, norm);
          const estimatedScore = Math.max(0.6, Math.min(0.9, normQuality * 0.9 + 0.1));

          return {
            score: estimatedScore,
            sharpness: estimatedScore,
            blurVariance: 100 + (estimatedScore - 0.75) * 200, // Estimate blur variance
            brightness: 0.5 + (estimatedScore - 0.75) * 0.2, // Estimate brightness
            detectionScore: estimatedScore,
            faceSize: 0,
            faceWidth: 0,
            faceHeight: 0,
            pose: { yaw: 0, pitch: 0, roll: 0 },
            createdAt: new Date(),
          };
        });

        // Compute centroid template
        const { computeCentroidTemplate } = require('../utils/faceRecognitionONNX');
        let centroidEmbedding;
        try {
          centroidEmbedding = computeCentroidTemplate(embeddings, embeddingQualities);
          console.log(`   ✅ Centroid computed successfully`);
        } catch (centroidError) {
          console.warn(`   ⚠️ Failed to compute centroid: ${centroidError.message}`);
          // Fallback: use first embedding as centroid
          const firstEmbedding = embeddings[0];
          if (firstEmbedding && Array.isArray(firstEmbedding) && firstEmbedding.length === 512) {
            const firstNorm = Math.sqrt(firstEmbedding.reduce((sum, val) => sum + val * val, 0));
            centroidEmbedding = firstNorm > 0.001 ? firstEmbedding.map(val => val / firstNorm) : firstEmbedding;
            console.log(`   ⚠️ Using first embedding as centroid (fallback)`);
          } else {
            console.error(`   ❌ No valid embeddings for centroid, skipping`);
            failed++;
            continue;
          }
        }

        // Update staff record
        await Staff.updateOne(
          { _id: staff._id },
          {
            $set: {
              embeddingQualities: embeddingQualities,
              centroidEmbedding: centroidEmbedding,
            }
          }
        );

        const avgQuality = embeddingQualities.reduce((sum, q) => sum + q.score, 0) / embeddingQualities.length;
        console.log(`   ✅ Updated: ${staff.name} - Average quality: ${(avgQuality * 100).toFixed(1)}%`);
        updated++;

      } catch (error) {
        console.error(`   ❌ Failed to process ${staff.name}:`, error.message);
        failed++;
      }
    }

    console.log(`\n📊 Backfill complete:`);
    console.log(`   ✅ Updated: ${updated} staff members`);
    console.log(`   ❌ Failed: ${failed} staff members`);

    // Invalidate cache to force refresh
    try {
      const staffCache = require('../utils/staffCache');
      if (staffCache && typeof staffCache.invalidate === 'function') {
        staffCache.invalidate();
        console.log(`   🔄 Staff cache invalidated`);
      } else {
        console.warn(`   ⚠️ Cache will refresh automatically on next request`);
      }
    } catch (cacheError) {
      console.warn(`   ⚠️ Could not invalidate cache: ${cacheError.message}`);
      console.warn(`   💡 Cache will refresh automatically on next request`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Backfill complete!');

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
}

// Run backfill
backfillQualityData();

