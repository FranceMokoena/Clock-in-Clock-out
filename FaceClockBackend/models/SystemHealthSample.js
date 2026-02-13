const mongoose = require('mongoose');

const systemHealthSampleSchema = new mongoose.Schema({
  memoryRssMB: {
    type: Number,
    required: true,
  },
  memoryHeapUsedMB: {
    type: Number,
    required: true,
  },
  memoryHeapTotalMB: {
    type: Number,
    required: true,
  },
  memoryPercent: {
    type: Number,
    default: null,
  },
  dbState: {
    type: Number,
    required: true,
  },
  dbStateLabel: {
    type: String,
    required: true,
  },
  activeConnections: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

systemHealthSampleSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

module.exports = mongoose.model('SystemHealthSample', systemHealthSampleSchema);
