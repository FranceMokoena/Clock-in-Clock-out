const mongoose = require('mongoose');

const leaveApplicationSchema = new mongoose.Schema({
  internId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
    index: true
  },
  internName: {
    type: String,
    required: true
  },
  leaveType: {
    type: String,
    enum: ['Annual', 'Sick', 'Study Leave', 'Family Responsibility', 'Other'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  numberOfDays: {
    type: Number,
    required: true,
    min: 0.5
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  supportingDocuments: [{
    fileName: {
      type: String,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  createdByRole: {
    type: String,
    enum: ['admin', 'hostCompany', 'intern', 'staff'],
    default: 'intern'
  },
  createdById: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostCompany',
    required: false
  },
  reviewedAt: {
    type: Date,
    required: false
  },
  rejectionReason: {
    type: String,
    required: false,
    trim: true
  },
  hostCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostCompany',
    required: false, // Optional - some interns may not have a host company assigned yet
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
leaveApplicationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for faster queries
leaveApplicationSchema.index({ internId: 1, status: 1 });
leaveApplicationSchema.index({ hostCompanyId: 1, status: 1 });
leaveApplicationSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('LeaveApplication', leaveApplicationSchema);

