const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  departmentCode: {
    type: String,
    required: false,
    trim: true,
    sparse: true // Allows multiple null values but enforces uniqueness for non-null values
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  mentorName: {
    type: String,
    required: false,
    trim: true
  },
  hostCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostCompany',
    required: false
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  // Location coordinates for GPS validation and reporting
  locationLatitude: {
    type: Number,
    required: true,
    validate: {
      validator: function(v) {
        return v >= -90 && v <= 90;
      },
      message: 'Latitude must be between -90 and 90'
    }
  },
  locationLongitude: {
    type: Number,
    required: true,
    validate: {
      validator: function(v) {
        return v >= -180 && v <= 180;
      },
      message: 'Longitude must be between -180 and 180'
    }
  },
  locationAddress: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
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
departmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add index for faster queries
departmentSchema.index({ isActive: 1, name: 1 });

module.exports = mongoose.model('Department', departmentSchema);

