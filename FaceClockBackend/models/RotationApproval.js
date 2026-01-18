const mongoose = require('mongoose');

const rotationApprovalSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RotationAssignment',
    required: true
  },
  supervisorRecommendation: {
    type: String,
    enum: ['APPROVE', 'EXTEND', 'REJECT', 'PENDING'],
    default: 'PENDING',
    index: true
  },
  supervisorNotes: {
    type: String,
    trim: true
  },
  supervisorAt: {
    type: Date,
    required: false
  },
  supervisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: false
  },
  adminDecision: {
    type: String,
    enum: ['APPROVE', 'REJECT', 'PENDING'],
    default: 'PENDING',
    index: true
  },
  adminNotes: {
    type: String,
    trim: true
  },
  adminAt: {
    type: Date,
    required: false
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
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

rotationApprovalSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

rotationApprovalSchema.index({ assignmentId: 1 });
rotationApprovalSchema.index({ supervisorRecommendation: 1, adminDecision: 1 });

module.exports = mongoose.model('RotationApproval', rotationApprovalSchema);
