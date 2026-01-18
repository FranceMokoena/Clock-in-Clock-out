const mongoose = require('mongoose');

const rotationPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  hostCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostCompany',
    required: false,
    index: true
  },
  rotationPath: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    }],
    default: []
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED', 'PAUSED', 'REQUIRES_ACTION'],
    default: 'ACTIVE',
    index: true
  },
  startDate: {
    type: Date,
    required: false
  },
  endDate: {
    type: Date,
    required: false
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

rotationPlanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

rotationPlanSchema.index({ userId: 1 }, { unique: true });
rotationPlanSchema.index({ userId: 1, hostCompanyId: 1 });
rotationPlanSchema.index({ status: 1, endDate: 1 });

module.exports = mongoose.model('RotationPlan', rotationPlanSchema);
