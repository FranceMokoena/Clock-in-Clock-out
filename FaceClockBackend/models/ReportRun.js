const mongoose = require('mongoose');

const reportRunSchema = new mongoose.Schema({
  ownerType: { type: String, enum: ['Admin', 'HostCompany'], required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  reportType: { type: String, enum: ['weekly', 'monthly', 'late', 'missing'], required: true },
  periodKey: { type: String, required: true, index: true },
  periodStart: { type: Date },
  periodEnd: { type: Date },
  staffId: { type: mongoose.Schema.Types.ObjectId },
  recipients: {
    emails: { type: [String], default: [] },
    whatsappNumbers: { type: [String], default: [] },
  },
  status: { type: String, enum: ['queued', 'generated', 'sent', 'failed'], default: 'queued' },
  fileUrl: { type: String, default: '' },
  errorMessage: { type: String, default: '' },
}, { timestamps: true });

reportRunSchema.index({ ownerType: 1, ownerId: 1, reportType: 1, periodKey: 1 }, { unique: true });
reportRunSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ReportRun', reportRunSchema);
