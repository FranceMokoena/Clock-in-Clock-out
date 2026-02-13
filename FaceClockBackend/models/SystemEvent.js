const mongoose = require('mongoose');

const systemEventSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    index: true,
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'warning',
  },
  message: {
    type: String,
    default: '',
  },
  hostCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostCompany',
    index: true,
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    index: true,
  },
  deviceFingerprint: {
    type: String,
    index: true,
  },
  route: {
    type: String,
    default: '',
  },
  statusCode: {
    type: Number,
  },
  metadata: {
    type: Object,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

systemEventSchema.index({ type: 1, createdAt: -1 });
systemEventSchema.index({ hostCompanyId: 1, createdAt: -1 });
systemEventSchema.index({ staffId: 1, createdAt: -1 });
systemEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('SystemEvent', systemEventSchema);
