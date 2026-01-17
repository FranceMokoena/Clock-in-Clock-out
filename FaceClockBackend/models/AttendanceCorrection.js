const mongoose = require('mongoose');

const attendanceCorrectionSchema = new mongoose.Schema({
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
  date: {
    type: Date,
    required: true,
    index: true
  },
  correctionType: {
    type: String,
    enum: ['missing_clock_in', 'missing_clock_out', 'wrong_time', 'missing_break', 'other'],
    required: true
  },
  originalClockLogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClockLog',
    required: false
  },
  requestedChange: {
    clockInTime: {
      type: Date,
      required: false
    },
    clockOutTime: {
      type: Date,
      required: false
    },
    breakStartTime: {
      type: Date,
      required: false
    },
    breakEndTime: {
      type: Date,
      required: false
    },
    lunchStartTime: {
      type: Date,
      required: false
    },
    lunchEndTime: {
      type: Date,
      required: false
    },
    description: {
      type: String,
      required: true,
      trim: true
    }
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
    required: true,
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
attendanceCorrectionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for faster queries
attendanceCorrectionSchema.index({ internId: 1, status: 1 });
attendanceCorrectionSchema.index({ hostCompanyId: 1, status: 1 });
attendanceCorrectionSchema.index({ date: 1 });

module.exports = mongoose.model('AttendanceCorrection', attendanceCorrectionSchema);

