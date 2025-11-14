const mongoose = require('mongoose');
const crypto = require('crypto');

const staffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  faceEmbedding: {
    type: [Number],
    required: false  // Now optional, use faceEmbeddings array instead
  },
  // Multiple embeddings per person for better matching
  faceEmbeddings: {
    type: [[Number]],  // Array of embedding arrays
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
  }
});

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

module.exports = mongoose.model('Staff', staffSchema);

