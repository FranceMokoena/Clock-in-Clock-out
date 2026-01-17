const mongoose = require('mongoose');

const deviceInfoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  deviceFingerprint: {
    type: String,
    required: true,
    index: true
  },
  deviceName: {
    type: String,
    required: false,
    trim: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['android', 'ios', 'web']
  },
  brand: {
    type: String,
    required: false
  },
  manufacturer: {
    type: String,
    required: false
  },
  modelName: {
    type: String,
    required: false
  },
  osVersion: {
    type: String,
    required: false
  },
  appVersion: {
    type: String,
    required: false
  },
  buildNumber: {
    type: String,
    required: false
  },
  language: {
    type: String,
    required: false
  },
  timezone: {
    type: String,
    required: false
  },
  deviceId: {
    type: String,
    required: false
  },
  screenWidth: {
    type: Number,
    required: false
  },
  screenHeight: {
    type: Number,
    required: false
  },
  screenScale: {
    type: Number,
    required: false
  },
  deviceType: {
    type: String,
    required: false
  },
  hostCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostCompany',
    required: false,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  firstSeenAt: {
    type: Date,
    default: Date.now
  },
  lastSeenAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt and lastSeenAt fields before saving
deviceInfoSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.isNew || this.isModified('lastSeenAt')) {
    this.lastSeenAt = Date.now();
  }
  next();
});

// Indexes for faster queries
deviceInfoSchema.index({ userId: 1, isActive: 1 });
deviceInfoSchema.index({ hostCompanyId: 1, isActive: 1 });
deviceInfoSchema.index({ deviceFingerprint: 1 });

module.exports = mongoose.model('DeviceInfo', deviceInfoSchema);

