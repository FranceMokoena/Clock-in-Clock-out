const mongoose = require('mongoose');

const payrollRecordSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
    index: true
  },
  staffName: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  // Clock times
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
  extraShiftStartTime: {
    type: Date,
    required: false
  },
  extraShiftEndTime: {
    type: Date,
    required: false
  },
  // Calculated hours
  totalHoursWorked: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  breakDuration: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  lunchDuration: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  extraShiftHours: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  // Weekly and monthly aggregations
  weekStartDate: {
    type: Date,
    required: false,
    index: true
  },
  month: {
    type: Number,
    required: false,
    min: 1,
    max: 12,
    index: true
  },
  year: {
    type: Number,
    required: false,
    index: true
  },
  // Metadata
  hostCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostCompany',
    required: false,
    index: true
  },
  isWeekend: {
    type: Boolean,
    default: false
  },
  isHoliday: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    required: false,
    trim: true
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

// Update the updatedAt field before saving
payrollRecordSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for faster queries
payrollRecordSchema.index({ staffId: 1, date: 1 });
payrollRecordSchema.index({ staffId: 1, weekStartDate: 1 });
payrollRecordSchema.index({ staffId: 1, year: 1, month: 1 });
payrollRecordSchema.index({ hostCompanyId: 1, date: 1 });

module.exports = mongoose.model('PayrollRecord', payrollRecordSchema);

