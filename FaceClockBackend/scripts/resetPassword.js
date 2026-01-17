/**
 * Script to reset a staff/intern password
 * Usage: node scripts/resetPassword.js <idNumber> <newPassword>
 * Example: node scripts/resetPassword.js 0109095708086 112233
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Staff = require('../models/Staff');

const idNumber = process.argv[2];
const newPassword = process.argv[3];

if (!idNumber || !newPassword) {
  console.error('❌ Usage: node scripts/resetPassword.js <idNumber> <newPassword>');
  console.error('   Example: node scripts/resetPassword.js 0109095708086 112233');
  process.exit(1);
}

if (newPassword.length < 6) {
  console.error('❌ Password must be at least 6 characters long');
  process.exit(1);
}

async function resetPassword() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI not found in environment variables');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find the staff member
    const staff = await Staff.findOne({ idNumber: idNumber.trim() });
    
    if (!staff) {
      console.error(`❌ Staff member with ID number ${idNumber} not found`);
      process.exit(1);
    }

    console.log(`✅ Found staff member: ${staff.name} ${staff.surname} (${staff.role})`);

    // Update password (will be hashed by pre-save hook)
    staff.password = newPassword;
    await staff.save();

    console.log(`✅ Password reset successfully for ${staff.name} ${staff.surname}`);
    console.log(`   ID Number: ${staff.idNumber}`);
    console.log(`   Role: ${staff.role}`);
    console.log(`   New password: ${newPassword}`);
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    process.exit(1);
  }
}

resetPassword();

