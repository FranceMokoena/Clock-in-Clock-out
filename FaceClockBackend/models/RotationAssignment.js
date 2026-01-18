const mongoose = require('mongoose');

const rotationAssignmentSchema = new mongoose.Schema({
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RotationPlan',
    required: false,
    index: true
  },
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
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: true,
    index: true
  },
  durationType: {
    type: String,
    enum: ['week', 'weeks', 'month', 'months', 'days', 'custom'],
    required: false
  },
  durationValue: {
    type: Number,
    required: false,
    min: 0
  },
  supervisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: false
  },
  status: {
    type: String,
    enum: [
      'ACTIVE',
      'COMPLETED',
      'UPCOMING',
      'PENDING_APPROVAL',
      'PENDING_REVIEW',
      'REGRESS',
      'DECLINED'
    ],
    default: 'UPCOMING',
    index: true
  },
  notes: {
    type: String,
    trim: true
  },
  reviewDate: {
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

rotationAssignmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

rotationAssignmentSchema.index({ userId: 1, hostCompanyId: 1 });
rotationAssignmentSchema.index({ status: 1, endDate: 1 });

module.exports = mongoose.model('RotationAssignment', rotationAssignmentSchema);
