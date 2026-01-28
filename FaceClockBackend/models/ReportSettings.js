const mongoose = require('mongoose');

const reportScheduleSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: true },
  dayOfWeek: { type: Number, default: 5 },
  time: { type: String, default: '17:00' },
  sendOnLastDay: { type: Boolean, default: true },
}, { _id: false });

const reportSettingsSchema = new mongoose.Schema({
  ownerType: { type: String, enum: ['Admin', 'HostCompany'], required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  timezone: { type: String, default: 'Africa/Johannesburg' },
  weekly: { type: reportScheduleSchema, default: () => ({}) },
  monthly: { type: reportScheduleSchema, default: () => ({}) },
  lateRule: {
    graceMinutes: { type: Number, default: 30 },
    notifyOnLateClockIn: { type: Boolean, default: true },
    notifyOnMissingClockIn: { type: Boolean, default: true },
  },
  recipients: {
    emails: { type: [String], default: [] },
    whatsappNumbers: { type: [String], default: [] },
  },
  filters: {
    departmentName: { type: String, default: '' },
    includeAllDepartments: { type: Boolean, default: true },
  },
  templates: {
    emailSubject: { type: String, default: 'Auto Report' },
    emailBody: { type: String, default: 'Hello, please find the attached report.' },
    whatsappMessage: { type: String, default: 'Auto report attached.' },
    emailSignature: { type: String, default: '' },
    emailSalutation: { type: String, default: 'Dear Sir/Madam,' },
  },
  registrationTemplates: {
    staff: {
      enabled: { type: Boolean, default: true },
      subject: { type: String, default: 'Welcome to Internship Success Clock-in System' },
      body: { type: String, default: 'Dear {{fullName}},\n\nYour account has been created.\n\nUsername: {{username}}\nTemporary Password: {{temporaryPassword}}\n\nPlease change your password after first login.\n\nRegards,\n{{signature}}' },
    },
    hostCompany: {
      enabled: { type: Boolean, default: true },
      subject: { type: String, default: 'Your Host Company Account is Ready' },
      body: { type: String, default: 'Dear {{companyName}},\n\nYour host company account has been created.\n\nUsername: {{username}}\nTemporary Password: {{temporaryPassword}}\n\nPlease change your password after first login.\n\nRegards,\n{{signature}}' },
    },
  },
}, { timestamps: true });

reportSettingsSchema.index({ ownerType: 1, ownerId: 1 }, { unique: true });

module.exports = mongoose.model('ReportSettings', reportSettingsSchema);
