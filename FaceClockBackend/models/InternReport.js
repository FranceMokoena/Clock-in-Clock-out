const mongoose = require('mongoose');

const InternReportSchema = new mongoose.Schema({
  internId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff', // Interns are stored as Staff with role: 'Intern'
    required: true
  },
  hostCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostCompany',
    required: true
  },
  reportType: {
    type: String,
    enum: [
      'Behavioural Concern',
      'Policy Violation',
      'Attendance Concern',
      'Performance Concern',
      'General Observation'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 5000
  },
  incidentDate: {
    type: Date,
    required: true
  },
  supportingNotes: {
    type: String,
    maxlength: 2000,
    default: null
  },
  submittedByRole: {
    type: String,
    enum: ['HOST_COMPANY', 'ADMIN'],
    required: true
  },
  submittedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  status: {
    type: String,
    enum: ['Submitted', 'Reviewed', 'Actioned'],
    default: 'Submitted'
  },
  adminNotes: {
    type: String,
    maxlength: 2000,
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  }
}, { timestamps: true });

// Index for efficient queries
InternReportSchema.index({ internId: 1, hostCompanyId: 1 });
InternReportSchema.index({ hostCompanyId: 1, createdAt: -1 });
InternReportSchema.index({ status: 1 });

module.exports = mongoose.model('InternReport', InternReportSchema);
