/**
 * Script to delete all staff members from the database
 * 
 * WARNING: This will permanently delete ALL staff members!
 * 
 * Usage:
 *   node scripts/deleteAllStaff.js
 * 
 * To also delete clock logs:
 *   node scripts/deleteAllStaff.js --include-logs
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const ClockLog = require('../models/ClockLog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/Employees';
const includeLogs = process.argv.includes('--include-logs');

async function deleteAllStaff() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Count staff before deletion
    const staffCount = await Staff.countDocuments();
    console.log(`📊 Found ${staffCount} staff member(s) in database`);

    if (staffCount === 0) {
      console.log('ℹ️  No staff members to delete.');
      await mongoose.connection.close();
      return;
    }

    // Show confirmation
    console.log('\n⚠️  WARNING: This will delete ALL staff members!');
    console.log(`   - ${staffCount} staff member(s) will be deleted`);
    
    if (includeLogs) {
      const logCount = await ClockLog.countDocuments();
      console.log(`   - ${logCount} clock log(s) will also be deleted`);
    }
    
    console.log('\n❌ This action cannot be undone!\n');

    // Delete staff members
    console.log('🗑️  Deleting staff members...');
    const deleteResult = await Staff.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} staff member(s)`);

    // Optionally delete clock logs
    if (includeLogs) {
      console.log('\n🗑️  Deleting clock logs...');
      const logDeleteResult = await ClockLog.deleteMany({});
      console.log(`✅ Deleted ${logDeleteResult.deletedCount} clock log(s)`);
    }

    // Verify deletion
    const remainingStaff = await Staff.countDocuments();
    console.log(`\n📊 Remaining staff members: ${remainingStaff}`);

    if (remainingStaff === 0) {
      console.log('✅ All staff members successfully deleted!');
    } else {
      console.log('⚠️  Warning: Some staff members may still exist');
    }

    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the script
deleteAllStaff();

