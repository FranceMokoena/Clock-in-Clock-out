/**
 * 🏦 BANK-GRADE: Threshold Calibration Script
 * 
 * Calibrates similarity thresholds based on genuine/impostor distributions
 * This ensures thresholds are data-driven, not arbitrary
 * 
 * Usage: node scripts/calibrateThresholds.js
 */

const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const ClockLog = require('../models/ClockLog');
const { cosineSimilarity } = require('../utils/faceRecognitionONNX');
require('dotenv').config();

async function calibrateThresholds() {
  try {
    // Connect to MongoDB
    // Use same logic as server.js: try MONGO_URI first, then MONGODB_URI, then default
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/Employees';
    
    console.log(`🔌 Connecting to MongoDB...`);
    console.log(`   URI: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials in log
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    
    // Get all active staff with multiple embeddings
    const staffList = await Staff.find({ 
      isActive: true, 
      faceEmbeddings: { $exists: true, $ne: [] } 
    }).lean();
    
    console.log(`📊 Found ${staffList.length} staff members with embeddings`);
    
    if (staffList.length < 2) {
      console.error('❌ Need at least 2 staff members for calibration');
      await mongoose.disconnect();
      return;
    }
    
    // Collect genuine pairs (same person, different images)
    const genuinePairs = [];
    for (const staff of staffList) {
      if (staff.faceEmbeddings && staff.faceEmbeddings.length >= 2) {
        // Compare all pairs of embeddings for same person
        for (let i = 0; i < staff.faceEmbeddings.length; i++) {
          for (let j = i + 1; j < staff.faceEmbeddings.length; j++) {
            const similarity = cosineSimilarity(staff.faceEmbeddings[i], staff.faceEmbeddings[j]);
            genuinePairs.push({
              staffId: staff._id,
              staffName: staff.name,
              similarity,
              type: 'genuine'
            });
          }
        }
      }
    }
    
    // Collect impostor pairs (different people)
    const impostorPairs = [];
    for (let i = 0; i < staffList.length; i++) {
      for (let j = i + 1; j < staffList.length; j++) {
        const staff1 = staffList[i];
        const staff2 = staffList[j];
        
        if (staff1.faceEmbeddings && staff1.faceEmbeddings.length > 0 && 
            staff2.faceEmbeddings && staff2.faceEmbeddings.length > 0) {
          // Compare first embedding of each person
          const similarity = cosineSimilarity(
            staff1.faceEmbeddings[0], 
            staff2.faceEmbeddings[0]
          );
          impostorPairs.push({
            staff1Id: staff1._id,
            staff1Name: staff1.name,
            staff2Id: staff2._id,
            staff2Name: staff2.name,
            similarity,
            type: 'impostor'
          });
        }
      }
    }
    
    console.log(`\n📊 Collected ${genuinePairs.length} genuine pairs`);
    console.log(`📊 Collected ${impostorPairs.length} impostor pairs`);
    
    if (genuinePairs.length === 0 || impostorPairs.length === 0) {
      console.error('❌ Insufficient data for calibration');
      await mongoose.disconnect();
      return;
    }
    
    // Calculate distributions
    const genuineSimilarities = genuinePairs.map(p => p.similarity).sort((a, b) => a - b);
    const impostorSimilarities = impostorPairs.map(p => p.similarity).sort((a, b) => a - b);
    
    // Calculate statistics
    const genuineMean = genuineSimilarities.reduce((a, b) => a + b, 0) / genuineSimilarities.length;
    const impostorMean = impostorSimilarities.reduce((a, b) => a + b, 0) / impostorSimilarities.length;
    
    const genuineStd = Math.sqrt(
      genuineSimilarities.reduce((sum, val) => sum + Math.pow(val - genuineMean, 2), 0) / genuineSimilarities.length
    );
    const impostorStd = Math.sqrt(
      impostorSimilarities.reduce((sum, val) => sum + Math.pow(val - impostorMean, 2), 0) / impostorSimilarities.length
    );
    
    console.log(`\n📈 Genuine Distribution:`);
    console.log(`   Mean: ${(genuineMean * 100).toFixed(2)}%`);
    console.log(`   Std Dev: ${(genuineStd * 100).toFixed(2)}%`);
    console.log(`   Min: ${(genuineSimilarities[0] * 100).toFixed(2)}%`);
    console.log(`   Max: ${(genuineSimilarities[genuineSimilarities.length - 1] * 100).toFixed(2)}%`);
    console.log(`   Median: ${(genuineSimilarities[Math.floor(genuineSimilarities.length / 2)] * 100).toFixed(2)}%`);

    console.log(`\n📈 Impostor Distribution:`);
    console.log(`   Mean: ${(impostorMean * 100).toFixed(2)}%`);
    console.log(`   Std Dev: ${(impostorStd * 100).toFixed(2)}%`);
    console.log(`   Min: ${(impostorSimilarities[0] * 100).toFixed(2)}%`);
    console.log(`   Max: ${(impostorSimilarities[impostorSimilarities.length - 1] * 100).toFixed(2)}%`);
    console.log(`   Median: ${(impostorSimilarities[Math.floor(impostorSimilarities.length / 2)] * 100).toFixed(2)}%`);

    // 🚨 CRITICAL WARNING: If impostor mean is higher than genuine mean, there's a data quality issue
    if (impostorMean > genuineMean) {
      console.error(`\n🚨 CRITICAL DATA QUALITY ISSUE DETECTED:`);
      console.error(`   Impostor mean (${(impostorMean * 100).toFixed(2)}%) is HIGHER than genuine mean (${(genuineMean * 100).toFixed(2)}%)`);
      console.error(`   This suggests:`);
      console.error(`   1. Embeddings may not be well-separated`);
      console.error(`   2. Staff may have similar appearances`);
      console.error(`   3. Registration images may be low quality`);
      console.error(`   4. Sample size may be too small (${genuinePairs.length} genuine, ${impostorPairs.length} impostor pairs)`);
      console.error(`\n   💡 RECOMMENDATIONS:`);
      console.error(`   - Re-register staff with higher quality images`);
      console.error(`   - Ensure diverse angles and lighting during registration`);
      console.error(`   - Use threshold around ${((genuineMean + impostorMean) / 2 * 100).toFixed(1)}% (midpoint)`);
      console.error(`   - Consider using stricter thresholds until data quality improves`);
    } else {
      const separation = genuineMean - impostorMean;
      console.log(`\n✅ Good separation: Genuine mean is ${(separation * 100).toFixed(2)}% higher than impostor mean`);
      if (separation < 0.10) {
        console.warn(`   ⚠️ Separation is small (<10%) - consider improving registration quality`);
      }
    }
    
    // Find EER (Equal Error Rate) - threshold where FAR = FRR
    let eerThreshold = null;
    let minError = Infinity;
    
    for (let threshold = 0.50; threshold <= 0.95; threshold += 0.01) {
      const far = impostorSimilarities.filter(s => s >= threshold).length / impostorSimilarities.length;
      const frr = genuineSimilarities.filter(s => s < threshold).length / genuineSimilarities.length;
      const error = Math.abs(far - frr);
      
      if (error < minError) {
        minError = error;
        eerThreshold = threshold;
      }
    }
    
    console.log(`\n🎯 EER (Equal Error Rate): ${(eerThreshold * 100).toFixed(2)}%`);
    const farAtEER = impostorSimilarities.filter(s => s >= eerThreshold).length / impostorSimilarities.length;
    const frrAtEER = genuineSimilarities.filter(s => s < eerThreshold).length / genuineSimilarities.length;
    console.log(`   FAR at EER: ${(farAtEER * 100).toFixed(2)}%`);
    console.log(`   FRR at EER: ${(frrAtEER * 100).toFixed(2)}%`);
    
    // Calculate thresholds for different FAR targets
    const farTargets = [0.001, 0.01, 0.05, 0.10]; // 0.1%, 1%, 5%, 10%
    
    console.log(`\n🎯 Recommended Thresholds for Different FAR Targets:`);
    for (const farTarget of farTargets) {
      const targetIndex = Math.floor(impostorSimilarities.length * (1 - farTarget));
      if (targetIndex >= 0 && targetIndex < impostorSimilarities.length) {
        const threshold = impostorSimilarities[targetIndex];
        const frr = genuineSimilarities.filter(s => s < threshold).length / genuineSimilarities.length;
        
        console.log(`   FAR = ${(farTarget * 100).toFixed(1)}%: Threshold = ${(threshold * 100).toFixed(2)}%, FRR = ${(frr * 100).toFixed(2)}%`);
      }
    }
    
    // Calculate thresholds for different FRR targets
    const frrTargets = [0.01, 0.05, 0.10, 0.20]; // 1%, 5%, 10%, 20%
    
    console.log(`\n🎯 Recommended Thresholds for Different FRR Targets:`);
    for (const frrTarget of frrTargets) {
      const targetIndex = Math.floor(genuineSimilarities.length * frrTarget);
      if (targetIndex >= 0 && targetIndex < genuineSimilarities.length) {
        const threshold = genuineSimilarities[targetIndex];
        const far = impostorSimilarities.filter(s => s >= threshold).length / impostorSimilarities.length;
        
        console.log(`   FRR = ${(frrTarget * 100).toFixed(0)}%: Threshold = ${(threshold * 100).toFixed(2)}%, FAR = ${(far * 100).toFixed(2)}%`);
      }
    }
    
    // Generate recommended CONFIG values
    console.log(`\n💡 Recommended CONFIG.THRESHOLDS (based on your data):`);
    
    // For FAR = 1% (very secure)
    const secureIndex = Math.floor(impostorSimilarities.length * 0.99);
    if (secureIndex >= 0 && secureIndex < impostorSimilarities.length) {
      const secureThreshold = impostorSimilarities[secureIndex];
      console.log(`   For FAR = 1% (very secure):`);
      console.log(`     daily: ${(secureThreshold * 100).toFixed(1)}%`);
      console.log(`     enrollment: ${((secureThreshold + 0.05) * 100).toFixed(1)}%`);
    }
    
    // For FRR = 5% (balanced)
    const balancedIndex = Math.floor(genuineSimilarities.length * 0.05);
    if (balancedIndex >= 0 && balancedIndex < genuineSimilarities.length) {
      const balancedThreshold = genuineSimilarities[balancedIndex];
      console.log(`   For FRR = 5% (balanced):`);
      console.log(`     daily: ${(balancedThreshold * 100).toFixed(1)}%`);
      console.log(`     enrollment: ${((balancedThreshold + 0.05) * 100).toFixed(1)}%`);
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Calibration complete!');
    
  } catch (error) {
    console.error('❌ Calibration failed:', error);
    process.exit(1);
  }
}

// Run calibration
calibrateThresholds();

