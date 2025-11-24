const mongoose = require('mongoose');

/**
 * 🏦 BANK-GRADE Phase 4: Device Quality Tracking
 * Tracks device quality metrics over time to automatically apply lenient thresholds
 * for consistently low-quality devices (e.g., older phones, budget cameras)
 */
const deviceQualitySchema = new mongoose.Schema({
  deviceFingerprint: {
    type: String,
    required: true,
    unique: true,
    index: true // Fast lookups by device
  },
  
  // Quality classification (auto-updated based on history)
  qualityTier: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  
  // Quality metrics (rolling averages over last 30 clock-ins)
  averageBlurVariance: {
    type: Number,
    default: 0
  },
  averageImageWidth: {
    type: Number,
    default: 0
  },
  averageImageHeight: {
    type: Number,
    default: 0
  },
  averageBrightness: {
    type: Number,
    default: 0.5
  },
  averageQualityScore: {
    type: Number,
    default: 0.75
  },
  
  // Quality history (last 30 clock-ins for rolling average)
  qualityHistory: [{
    blurVariance: Number,
    imageWidth: Number,
    imageHeight: Number,
    brightness: Number,
    qualityScore: Number,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Statistics
  totalClockIns: {
    type: Number,
    default: 0
  },
  successfulClockIns: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // First and last seen
  firstSeen: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
});

// Index for fast queries by quality tier
deviceQualitySchema.index({ qualityTier: 1, lastSeen: -1 });

// Method to update quality metrics with new clock-in data
deviceQualitySchema.methods.updateQualityMetrics = function(metrics) {
  const { blurVariance, imageWidth, imageHeight, brightness, qualityScore } = metrics;
  
  // Add to history (keep last 30)
  this.qualityHistory.push({
    blurVariance,
    imageWidth,
    imageHeight,
    brightness,
    qualityScore,
    timestamp: new Date()
  });
  
  // Keep only last 30 entries
  if (this.qualityHistory.length > 30) {
    this.qualityHistory = this.qualityHistory.slice(-30);
  }
  
  // Calculate rolling averages
  const history = this.qualityHistory;
  this.averageBlurVariance = history.reduce((sum, h) => sum + (h.blurVariance || 0), 0) / history.length;
  this.averageImageWidth = history.reduce((sum, h) => sum + (h.imageWidth || 0), 0) / history.length;
  this.averageImageHeight = history.reduce((sum, h) => sum + (h.imageHeight || 0), 0) / history.length;
  this.averageBrightness = history.reduce((sum, h) => sum + (h.brightness || 0.5), 0) / history.length;
  this.averageQualityScore = history.reduce((sum, h) => sum + (h.qualityScore || 0.75), 0) / history.length;
  
  // Auto-classify quality tier based on metrics
  this.classifyQualityTier();
  
  this.totalClockIns += 1;
  this.lastUpdated = new Date();
  this.lastSeen = new Date();
  
  return this.save();
};

// Method to auto-classify device quality tier
deviceQualitySchema.methods.classifyQualityTier = function() {
  // Low quality: Small images (<500px) OR low blur variance (<60) OR low quality score (<0.65)
  if (this.averageImageWidth < 500 || 
      this.averageBlurVariance < 60 || 
      this.averageQualityScore < 0.65) {
    this.qualityTier = 'low';
  }
  // High quality: Large images (≥800px) AND high blur variance (≥100) AND high quality score (≥0.85)
  else if (this.averageImageWidth >= 800 && 
           this.averageBlurVariance >= 100 && 
           this.averageQualityScore >= 0.85) {
    this.qualityTier = 'high';
  }
  // Medium quality: Everything else
  else {
    this.qualityTier = 'medium';
  }
  
  return this.qualityTier;
};

// Static method to get or create device quality record
deviceQualitySchema.statics.getOrCreate = async function(deviceFingerprint) {
  let deviceQuality = await this.findOne({ deviceFingerprint });
  
  if (!deviceQuality) {
    deviceQuality = new this({
      deviceFingerprint,
      qualityTier: 'medium', // Default until we have history
      firstSeen: new Date(),
      lastSeen: new Date()
    });
    await deviceQuality.save();
  }
  
  return deviceQuality;
};

module.exports = mongoose.model('DeviceQuality', deviceQualitySchema);

