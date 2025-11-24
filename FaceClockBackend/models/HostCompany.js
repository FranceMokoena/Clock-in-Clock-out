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
  businessType: {
    type: String,
    required: false,
    trim: true,
    enum: ['Pty Ltd', 'LLC', 'Sole Proprietor', 'NGO', 'Partnership', 'Corporation', 'Other', '']
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
hostCompanySchema.index({ username: 1 }); // For login lookups

module.exports = mongoose.model('HostCompany', hostCompanySchema);

