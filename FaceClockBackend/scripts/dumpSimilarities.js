/**
 * Dump pairwise similarities between all staff embeddings
 * 
 * This script computes cosine similarity between all stored centroids
 * to identify if any staff members have unusually close embeddings.
 * 
 * Run: node scripts/dumpSimilarities.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Staff = require('../models/Staff');

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) {
    return 0;
  }
  
  let dot = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const norm = Math.sqrt(normA) * Math.sqrt(normB);
  if (norm === 0) return 0;
  
  return dot / norm;
}

/**
 * Compute similarity between two staff members using all embeddings
 */
function computeStaffSimilarity(staff1, staff2) {
  if (!staff1.centroidEmbedding || !staff2.centroidEmbedding) {
    return null;
  }
  
  // Use centroids for comparison
  const centroidSim = cosineSimilarity(staff1.centroidEmbedding, staff2.centroidEmbedding);
  
  // Also compute max similarity across all embedding pairs
  let maxSim = 0;
  const emb1List = staff1.faceEmbeddings && staff1.faceEmbeddings.length > 0 
    ? staff1.faceEmbeddings 
    : (staff1.faceEmbedding ? [staff1.faceEmbedding] : []);
  const emb2List = staff2.faceEmbeddings && staff2.faceEmbeddings.length > 0 
    ? staff2.faceEmbeddings 
    : (staff2.faceEmbedding ? [staff2.faceEmbedding] : []);
  
  if (emb1List.length > 0 && emb2List.length > 0) {
    for (const emb1 of emb1List) {
      for (const emb2 of emb2List) {
        const sim = cosineSimilarity(emb1, emb2);
        if (sim > maxSim) {
          maxSim = sim;
        }
      }
    }
  }
  
  return {
    centroid: centroidSim,
    max: maxSim,
    avg: (centroidSim + maxSim) / 2
  };
}

async function dumpSimilarities() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get all staff
    const staffList = await Staff.find({});
    console.log(`📋 Found ${staffList.length} staff members\n`);
    
    if (staffList.length < 2) {
      console.log('⚠️ Need at least 2 staff members to compare');
      return;
    }
    
    // Compute pairwise similarities
    const similarities = [];
    
    for (let i = 0; i < staffList.length; i++) {
      for (let j = i + 1; j < staffList.length; j++) {
        const staff1 = staffList[i];
        const staff2 = staffList[j];
        
        const sim = computeStaffSimilarity(staff1, staff2);
        
        if (sim) {
          similarities.push({
            staff1: staff1.name,
            staff2: staff2.name,
            centroid: sim.centroid,
            max: sim.max,
            avg: sim.avg
          });
          
          console.log(`${staff1.name} <-> ${staff2.name}:`);
          console.log(`   Centroid similarity: ${(sim.centroid * 100).toFixed(2)}%`);
          console.log(`   Max similarity: ${(sim.max * 100).toFixed(2)}%`);
          console.log(`   Average: ${(sim.avg * 100).toFixed(2)}%`);
          
          // Warn if similarity is high (potential overlap)
          if (sim.centroid > 0.80 || sim.max > 0.85) {
            console.log(`   ⚠️ WARNING: High similarity - potential overlap!`);
          }
          console.log('');
        } else {
          console.log(`${staff1.name} <-> ${staff2.name}: No embeddings available\n`);
        }
      }
    }
    
    // Summary statistics
    if (similarities.length > 0) {
      const centroids = similarities.map(s => s.centroid);
      const maxes = similarities.map(s => s.max);
      
      const minCentroid = Math.min(...centroids);
      const maxCentroid = Math.max(...centroids);
      const avgCentroid = centroids.reduce((a, b) => a + b, 0) / centroids.length;
      
      const minMax = Math.min(...maxes);
      const maxMax = Math.max(...maxes);
      const avgMax = maxes.reduce((a, b) => a + b, 0) / maxes.length;
      
      console.log('\n📊 SUMMARY STATISTICS:');
      console.log(`   Centroid similarities: ${(minCentroid * 100).toFixed(2)}% - ${(maxCentroid * 100).toFixed(2)}% (avg: ${(avgCentroid * 100).toFixed(2)}%)`);
      console.log(`   Max similarities: ${(minMax * 100).toFixed(2)}% - ${(maxMax * 100).toFixed(2)}% (avg: ${(avgMax * 100).toFixed(2)}%)`);
      
      // Identify problematic pairs
      const problematic = similarities.filter(s => s.centroid > 0.80 || s.max > 0.85);
      if (problematic.length > 0) {
        console.log('\n⚠️ PROBLEMATIC PAIRS (high similarity - may cause false matches):');
        problematic.forEach(p => {
          console.log(`   ${p.staff1} <-> ${p.staff2}: Centroid ${(p.centroid * 100).toFixed(2)}%, Max ${(p.max * 100).toFixed(2)}%`);
        });
        console.log('\n💡 RECOMMENDATION: Re-enroll these staff members with higher quality, more diverse images');
      } else {
        console.log('\n✅ No problematic pairs detected - embeddings are well-separated');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run
dumpSimilarities();

