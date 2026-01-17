const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientType: {
    type: String,
    enum: ['HR', 'HostCompany', 'Intern', 'All', 'Admin', 'DepartmentManager', 'Staff'],
    required: true,
    index: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: [
      'attendance',
      'attendance_summary',
      'leave_request',
      'leave_approved',
      'leave_rejected',
      'attendance_correction',
      'payroll',
      'system',
      'security',
      'department',
      'staff_action',
      'other'
    ],
    required: true,
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  // Enhanced fields for action tracking
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  // Source of the action
  source: {
    type: String,
    enum: ['mobile_app', 'desktop_app', 'api', 'system', 'admin_dashboard'],
    required: false
  },
  // Device information
  deviceInfo: {
    deviceId: String,
    platform: String,
    appVersion: String
  },
  // Link to related entities
  relatedEntities: {
    staffId: mongoose.Schema.Types.ObjectId,
    hostCompanyId: mongoose.Schema.Types.ObjectId,
    departmentId: mongoose.Schema.Types.ObjectId,
    clockLogId: mongoose.Schema.Types.ObjectId,
    leaveApplicationId: mongoose.Schema.Types.ObjectId,
    attendanceCorrectionId: mongoose.Schema.Types.ObjectId,
    payrollRecordId: mongoose.Schema.Types.ObjectId
  },
  // Delivery channels
  deliveryChannels: {
    inApp: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false }
  },
  // Delivery status tracking
  deliveryStatus: {
    inAppDelivered: { type: Boolean, default: false },
    inAppDeliveredAt: Date,
    pushDelivered: { type: Boolean, default: false },
    pushDeliveredAt: Date,
    emailDelivered: { type: Boolean, default: false },
    emailDeliveredAt: Date,
    smsDelivered: { type: Boolean, default: false },
    smsDeliveredAt: Date
  },
  // Read status
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date,
    required: false
  },
  // Interaction tracking
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date,
  actionUrl: {
    type: String,
    required: false,
    trim: true
  },
  actionData: {
    actionType: String,
    payload: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    required: false,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
});

// TTL index for automatic deletion of old notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Indexes for faster queries
notificationSchema.index({ recipientType: 1, recipientId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ priority: 1, createdAt: -1 });
notificationSchema.index({ 'relatedEntities.staffId': 1 });
notificationSchema.index({ 'relatedEntities.hostCompanyId': 1 });

// Auto-archive old notifications
notificationSchema.index({ isRead: 1, readAt: 1 });

module.exports = mongoose.model('Notification', notificationSchema);

