const mongoose = require('mongoose');

const requestMetricSchema = new mongoose.Schema({
  path: {
    type: String,
    required: true,
    index: true,
  },
  method: {
    type: String,
    required: true,
  },
  statusCode: {
    type: Number,
  },
  durationMs: {
    type: Number,
    required: true,
  },
  outcome: {
    type: String,
    enum: ['success', 'error', 'timeout'],
    default: 'success',
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

requestMetricSchema.index({ path: 1, createdAt: -1 });
requestMetricSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

module.exports = mongoose.model('RequestMetric', requestMetricSchema);
