const mongoose = require('mongoose');

const clockLogSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  staffName: {
    type: String,
    required: true
  },
  clockType: {
    type: String,
    enum: ['in', 'out', 'break_start', 'break_end'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  confidence: {
    type: Number,
    required: true
  },
  // 🏦 BANK-GRADE Phase 3: Device fingerprinting
  deviceFingerprint: {
    type: String,
    required: false,
    index: true // Index for faster device-based queries
  },
  // 🏦 BANK-GRADE Phase 4: Risk scoring
  riskScore: {
    score: {
      type: Number,
      default: 0
    },
    level: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    factors: [{
      type: String
    }]
  },
  // 🏦 BANK-GRADE Phase 3: Signal values for audit trail
  signals: {
    face: Number,      // Face similarity (0-1)
    temporal: Number,  // Temporal signal (0-1)
    device: Number,    // Device signal (0-1)
    location: Number,  // Location signal (0-1)
  }
});

module.exports = mongoose.model('ClockLog', clockLogSchema);

