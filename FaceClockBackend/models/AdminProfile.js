const mongoose = require('mongoose');

const adminProfileSchema = new mongoose.Schema({
  adminId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  profilePicture: {
    type: String,
    required: false,
    trim: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

adminProfileSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('AdminProfile', adminProfileSchema);
