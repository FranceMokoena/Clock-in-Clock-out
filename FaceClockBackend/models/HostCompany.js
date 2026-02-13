const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const hostCompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
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
  registrationNumber: {
    type: String,
    required: false,
    trim: true
  },
  operatingHours: {
    type: String,
    required: false,
    trim: true
  },
  // ⏰ DEFAULT WORKING HOURS: Assigned during host company creation (weekdays only)
  // These are used as fallback when staff members don't have individual hours assigned
  defaultClockInTime: {
    type: String, // Format: "HH:MM" (e.g., "07:30")
    required: false,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Default clock-in time must be in HH:MM format (24-hour, e.g., "07:30")'
    }
  },
  defaultClockOutTime: {
    type: String, // Format: "HH:MM" (e.g., "16:30")
    required: false,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Default clock-out time must be in HH:MM format (24-hour, e.g., "16:30")'
    }
  },
  defaultBreakStartTime: {
    type: String, // Format: "HH:MM" (e.g., "13:00")
    required: false,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Default break start time must be in HH:MM format (24-hour, e.g., "13:00")'
    }
  },
  defaultBreakEndTime: {
    type: String, // Format: "HH:MM" (e.g., "14:00")
    required: false,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Default break end time must be in HH:MM format (24-hour, e.g., "14:00")'
    }
  },
  emailAddress: {
    type: String,
    required: false,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  // Profile picture (base64 encoded or URL)
  profilePicture: {
    type: String,
    required: false,
    trim: true
  },
  businessType: {
    type: String,
    required: false,
    trim: true,
    enum: ['Pty Ltd', 'LLC', 'Sole Proprietor', 'NGO', 'Partnership', 'Corporation', 'Manufacturing', 'Other', '']
  },
  industry: {
    type: String,
    required: false,
    trim: true
  },
  username: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
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

// Hash password before saving
hostCompanySchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    this.updatedAt = Date.now();
    return next();
  }
  
  try {
    // Hash password with cost of 10
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.updatedAt = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password for login
hostCompanySchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Add indexes for faster queries
hostCompanySchema.index({ isActive: 1, name: 1 });
hostCompanySchema.index({ companyName: 1 });
// Note: username index is automatically created by unique: true, no need to add it explicitly

module.exports = mongoose.model('HostCompany', hostCompanySchema);

