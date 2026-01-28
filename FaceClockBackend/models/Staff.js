const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const staffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  surname: {
    type: String,
    required: true,
    trim: true
  },
  idNumber: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    validate: {
      validator: function(v) {
        // 13 digits, valid South African ID format (YYMMDDGSSSCAZ)
        return /^\d{13}$/.test(v);
      },
      message: 'ID Number must be exactly 13 digits'
    }
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: false,
    trim: true,
    lowercase: true
  },
  role: {
    type: String,
    required: true,
    enum: ['Intern', 'Staff', 'Other'],
    default: 'Staff'
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  hostCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostCompany',
    required: false // Optional for backward compatibility
  },
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: false // Optional - mentor assigned to interns/staff
  },
  mentorName: {
    type: String,
    required: false,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  // Location coordinates for GPS validation
  locationLatitude: {
    type: Number,
    required: true,
    validate: {
      validator: function(v) {
        // Valid latitude range: -90 to 90
        return typeof v === 'number' && !isNaN(v) && v >= -90 && v <= 90;
      },
      message: 'Latitude must be a number between -90 and 90'
    }
  },
  locationLongitude: {
    type: Number,
    required: true,
    validate: {
      validator: function(v) {
        // Valid longitude range: -180 to 180
        return typeof v === 'number' && !isNaN(v) && v >= -180 && v <= 180;
      },
      message: 'Longitude must be a number between -180 and 180'
    }
  },
  // Full address (if custom address was used)
  locationAddress: {
    type: String,
    required: false,
    trim: true
  },
  // ⏰ WORKING HOURS: Assigned during registration (weekdays only)
  // If not assigned, will fall back to host company default hours
  clockInTime: {
    type: String, // Format: "HH:MM" (e.g., "07:30")
    required: false,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional
        // Validate time format HH:MM (24-hour format)
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Clock-in time must be in HH:MM format (24-hour, e.g., "07:30")'
    }
  },
  clockOutTime: {
    type: String, // Format: "HH:MM" (e.g., "16:30")
    required: false,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Clock-out time must be in HH:MM format (24-hour, e.g., "16:30")'
    }
  },
  breakStartTime: {
    type: String, // Format: "HH:MM" (e.g., "13:00")
    required: false,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Break start time must be in HH:MM format (24-hour, e.g., "13:00")'
    }
  },
  breakEndTime: {
    type: String, // Format: "HH:MM" (e.g., "14:00")
    required: false,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Break end time must be in HH:MM format (24-hour, e.g., "14:00")'
    }
  },
  // ⏰ EXTRA HOURS: Optional extra hours availability
  extraHoursStartTime: {
    type: String, // Format: "HH:MM" (e.g., "18:00")
    required: false,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Extra hours start time must be in HH:MM format (24-hour, e.g., "18:00")'
    }
  },
  extraHoursEndTime: {
    type: String, // Format: "HH:MM" (e.g., "20:00")
    required: false,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Extra hours end time must be in HH:MM format (24-hour, e.g., "20:00")'
    }
  },
  faceEmbedding: {
    type: [Number],
    required: false  // Now optional, use faceEmbeddings array instead
  },
  // Multiple embeddings per person for better matching
  faceEmbeddings: {
    type: [[Number]],  // Array of embedding arrays (512-d normalized embeddings)
    default: []
  },
  // 🏦 BANK-GRADE: Quality metadata for each embedding (for weighted centroid)
  embeddingQualities: {
    type: [{
      score: Number,           // Detection confidence (0-1)
      sharpness: Number,       // Blur/sharpness score (0-1)
      blurVariance: Number,    // Laplacian variance
      brightness: Number,      // Brightness (0-1)
      faceSize: Number,        // Face size in pixels²
      faceWidth: Number,       // Face width in pixels
      faceHeight: Number,      // Face height in pixels
      pose: {                  // Pose angles in degrees
        yaw: Number,
        pitch: Number,
        roll: Number
      },
      detectionScore: Number,  // Detection score (0-1)
      createdAt: {             // When this embedding was created
        type: Date,
        default: Date.now
      }
    }],
    default: []
  },
  // 🏦 BANK-GRADE: Weighted centroid template (primary matching template)
  centroidEmbedding: {
    type: [Number],  // 512-d normalized centroid embedding
    required: false
  },
  // 🏦 BANK-GRADE Phase 5: ID Document anchor embedding (stable reference)
  idEmbedding: {
    type: [Number],  // 512-d normalized embedding from ID document photo
    required: false
  },
  // Quality metrics for ID document extraction
  idEmbeddingQuality: {
    type: {
      score: Number,           // Detection confidence (0-1)
      sharpness: Number,       // Blur/sharpness score (0-1)
      blurVariance: Number,    // Laplacian variance
      brightness: Number,      // Brightness (0-1)
      faceSize: Number,        // Face size in pixels²
      faceWidth: Number,       // Face width in pixels
      faceHeight: Number,     // Face height in pixels
      detectionScore: Number,  // Detection score (0-1)
      extractedAt: {           // When ID embedding was extracted
        type: Date,
        default: Date.now
      }
    },
    required: false
  },
  // Document type (optional, for future use)
  idDocumentType: {
    type: String,
    enum: ['ID_CARD', 'PASSPORT', 'DRIVERS_LICENSE', 'UNKNOWN'],
    default: 'UNKNOWN'
  },
  // 🌐 AWS Rekognition integration
  rekognitionCollectionId: {
    type: String,
    required: false,
    trim: true,
  },
  rekognitionFaceIds: {
    type: [String],
    default: [],
  },
  rekognitionEnabled: {
    type: Boolean,
    default: false,
  },
  rekognitionLastSyncedAt: {
    type: Date,
    required: false,
  },
  // 📦 S3 Storage: Image keys for backup/storage (optional)
  s3ImageKeys: {
    type: [String],
    default: [],
    required: false,
  },
  s3Bucket: {
    type: String,
    required: false,
    trim: true,
  },
  trustedDevices: {
    type: [{
      fingerprint: {
        type: String,
        required: true,
        index: true,
      },
      label: {
        type: String,
        default: 'Registered Device',
        trim: true,
      },
      status: {
        type: String,
        enum: ['trusted', 'pending', 'revoked'],
        default: 'trusted',
      },
      addedAt: {
        type: Date,
        default: Date.now,
      },
      lastSeenAt: {
        type: Date,
      },
      deviceInfo: {
        platform: String,
        brand: String,
        manufacturer: String,
        modelName: String,
        osVersion: String,
        appVersion: String,
        buildNumber: String,
        language: String,
        timezone: String,
        deviceId: String,
        deviceHash: String,
        screenWidth: Number,
        screenHeight: Number,
        screenScale: Number,
        deviceType: String,
        raw: {
          type: Object,
          default: null,
        },
      },
    }],
    default: [],
  },
  // Facial features for enhanced matching accuracy (eyes, nose, mouth, head shape)
  facialFeatures: {
    type: [{
      // Eye features
      eyeWidth: Number,        // Average eye width
      eyeHeight: Number,       // Average eye height
      eyeSpacing: Number,      // Distance between eyes
      eyeShape: Number,        // Eye shape ratio (width/height)
      
      // Nose features
      noseWidth: Number,       // Nose width
      noseHeight: Number,      // Nose height
      noseShape: Number,      // Nose shape ratio
      
      // Mouth features
      mouthWidth: Number,     // Mouth width
      mouthHeight: Number,     // Mouth height
      mouthShape: Number,      // Mouth shape ratio
      
      // Head/face shape features
      faceWidth: Number,       // Face width (jaw points)
      faceHeight: Number,     // Face height
      faceShape: Number,      // Face shape ratio
      jawShape: [Number],      // Jaw shape (normalized coordinates)
      
      // Symmetry features
      faceSymmetry: Number,    // Face symmetry score (0-1)
      eyeLevel: Number,        // Eye level alignment
      
      // Feature vector for comparison (normalized)
      featureVector: [Number]  // Combined normalized feature vector
    }],
    default: []
  },
  encryptedEmbedding: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Profile picture (base64 encoded or URL)
  profilePicture: {
    type: String,
    required: false,
    trim: true
  },
  stipendAmount: {
    type: Number,
    required: false,
    min: 0
  },
  // Expected working hours (used for payroll expectations only)
  expectedWorkingDaysPerWeek: {
    type: Number,
    required: false,
    min: 0
  },
  expectedWorkingDaysPerMonth: {
    type: Number,
    required: false,
    min: 0
  },
  expectedHoursPerDay: {
    type: Number,
    required: false,
    min: 0
  },
  expectedWeeklyHours: {
    type: Number,
    required: false,
    min: 0
  },
  expectedMonthlyHours: {
    type: Number,
    required: false,
    min: 0
  },
  rotationPlan: {
    currentDepartment: {
      departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: false
      },
      departmentName: {
        type: String,
        trim: true
      }
    },
    startDate: {
      type: Date,
      required: false
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed'],
      default: 'active'
    },
    notes: {
      type: String,
      trim: true,
      required: false
    },
    history: {
      type: [{
        departmentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Department',
          required: false
        },
        departmentName: {
          type: String,
          trim: true
        },
        startDate: {
          type: Date,
          required: false
        },
        endDate: {
          type: Date,
          required: false
        },
        status: String,
        notes: String,
        recordedAt: {
          type: Date,
          default: Date.now
        }
      }],
      default: []
    },
    approvals: {
      type: [{
        supervisorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Staff',
          required: false
        },
        adminId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Staff',
          required: false
        },
        status: {
          type: String,
          enum: ['pending', 'approved', 'denied'],
          default: 'pending'
        },
        notes: {
          type: String,
          trim: true,
          required: false
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }],
      default: []
    }
  },
  // 🔐 Password field (required for Staff and Intern roles only)
  password: {
    type: String,
    required: function() {
      // Password is required only for Staff and Intern roles
      return this.role === 'Staff' || this.role === 'Intern';
    },
    select: false // Don't include password in queries by default
  }
});

// Add indexes for faster queries
staffSchema.index({ isActive: 1, name: 1 }); // Compound index for active staff queries
staffSchema.index({ createdAt: -1 }); // For sorting by creation date
staffSchema.index({ name: 1 }); // For name lookups
// Note: idNumber index is automatically created by unique: true, no need to add it explicitly

// Encryption/Decryption helpers
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';

// Ensure encryption key is exactly 32 bytes (64 hex characters)
// If key is hex string, convert it; if it's already bytes, use as is
function getEncryptionKey() {
  const key = ENCRYPTION_KEY.trim();
  // If it's a hex string (64 chars = 32 bytes), convert it
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, 'hex');
  }
  // If it's shorter, pad or use directly (not recommended)
  // For now, if it's not 64 hex chars, generate a new one
  if (key.length < 64) {
    console.warn('ENCRYPTION_KEY is too short. Generating a new one. This will break existing encrypted data!');
    return crypto.randomBytes(32);
  }
  // Use first 64 hex characters if longer
  return Buffer.from(key.slice(0, 64), 'hex');
}

const encryptionKeyBuffer = getEncryptionKey();

staffSchema.statics.encryptEmbedding = function(embedding) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKeyBuffer, iv);
  let encrypted = cipher.update(JSON.stringify(embedding), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

staffSchema.statics.decryptEmbedding = function(encryptedData) {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encryptedText = parts.join(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKeyBuffer, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
};

// 🔐 Hash password before saving (only for Staff and Intern roles)
staffSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new) and role requires it
  if (!this.isModified('password')) {
    return next();
  }
  
  // Only hash if password exists and role is Staff or Intern
  if (this.password && (this.role === 'Staff' || this.role === 'Intern')) {
    try {
      // Hash password with cost of 10
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// 🔐 Method to compare password for login
staffSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Staff', staffSchema);

