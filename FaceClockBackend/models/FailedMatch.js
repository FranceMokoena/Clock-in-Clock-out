const mongoose = require('mongoose');

/**
 * FailedMatch - Tracks failed face recognition attempts for active learning
 * ENTERPRISE: Used to improve matching accuracy by learning from failures
 */
const failedMatchSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: false // May be null if person not registered
  },
  embedding: {
    type: [Number], // 512-d embedding
    required: true
  },
  bestSimilarity: {
    type: Number,
    required: true
  },
  bestMatchStaffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: false
  },
  bestMatchStaffName: {
    type: String,
    required: false
  },
  quality: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true // Index for time-based queries
  },
  reason: {
    type: String,
    enum: ['below_threshold', 'ambiguous_match', 'no_match', 'quality_too_low'],
    required: true
  },
  reviewed: {
    type: Boolean,
    default: false
  },
  reviewNotes: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Index for active learning queries
failedMatchSchema.index({ staffId: 1, timestamp: -1 });
failedMatchSchema.index({ reviewed: 1, timestamp: -1 });

module.exports = mongoose.model('FailedMatch', failedMatchSchema);

