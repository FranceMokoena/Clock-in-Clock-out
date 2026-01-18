const mongoose = require('mongoose');

const rotationDecisionSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RotationAssignment',
    required: true,
    index: true
  },
  decisionType: {
    type: String,
    enum: ['COMPLETED', 'REGRESS', 'DECLINED'],
    required: true,
    index: true
  },
  notes: {
    type: String,
    trim: true
  },
  overrideFlag: {
    type: Boolean,
    default: false
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: false
  },
  decidedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

rotationDecisionSchema.index({ assignmentId: 1, decidedAt: -1 });

module.exports = mongoose.model('RotationDecision', rotationDecisionSchema);
