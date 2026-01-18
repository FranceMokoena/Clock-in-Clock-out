const mongoose = require('mongoose');

const rotationHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
    index: true
  },
  hostCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostCompany',
    required: false,
    index: true
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
    index: true
  },
  startDate: {
    type: Date,
    required: false
  },
  endDate: {
    type: Date,
    required: false,
    index: true
  },
  evaluationSummary: {
    type: String,
    trim: true
  },
  outcome: {
    type: String,
    trim: true
  },
  supervisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: false
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: false
  },
  decidedAt: {
    type: Date,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

rotationHistorySchema.index({ userId: 1, hostCompanyId: 1 });
rotationHistorySchema.index({ departmentId: 1, endDate: 1 });
rotationHistorySchema.index({ decidedAt: -1 });

module.exports = mongoose.model('RotationHistory', rotationHistorySchema);
