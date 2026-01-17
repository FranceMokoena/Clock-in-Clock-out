#!/usr/bin/env node

/**
 * 🔧 FIX DEPARTMENT REFERENCES
 * 
 * This script corrects staff department assignments from ObjectIDs to department names.
 * It maps each staff member to their actual department name based on the department ID.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const Department = require('../models/Department');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function separator(title = '') {
  const line = '═'.repeat(100);
  if (title) {
    log(`\n${line}`, 'cyan');
    log(`  ${title}`, 'bright');
    log(`${line}\n`, 'cyan');
  }
}

async function fixDepartmentReferences() {
  try {
    log('🔗 Connecting to MongoDB...', 'blue');
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    if (!mongoUri) {
      log('❌ ERROR: MONGO_URI not found in .env file', 'red');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    log('✅ Connected successfully\n', 'green');

    separator('🔧 FIXING DEPARTMENT REFERENCES');

    // Get all departments
    const departments = await Department.find().lean();
    log(`Found ${departments.length} departments:\n`, 'bright');
    departments.forEach((dept) => {
      log(`  • ${dept.name} (ID: ${dept._id})`, 'white');
    });

    // Create a map of ObjectID to department name
    const deptIdToName = {};
    departments.forEach((dept) => {
      deptIdToName[dept._id.toString()] = dept.name;
    });

    log('\n\nCreated ID-to-Name mapping:', 'cyan');
    Object.entries(deptIdToName).forEach(([id, name]) => {
      log(`  ${id} => ${name}`, 'dim');
    });

    // Get all staff
    const allStaff = await Staff.find().lean();
    log(`\n\nFound ${allStaff.length} staff members to process:\n`, 'bright');

    let updateCount = 0;
    const updates = [];

    for (const staff of allStaff) {
      const currentDept = staff.department;
      
      if (!currentDept) {
        log(`⏭️  ${staff.name} ${staff.surname}: Already unassigned, skipping`, 'yellow');
        continue;
      }

      // Check if department field is an ObjectID
      const isObjectId = /^[a-f\d]{24}$/i.test(currentDept);
      
      if (isObjectId) {
        const newDeptName = deptIdToName[currentDept];
        
        if (newDeptName) {
          log(
            `✅ ${staff.name} ${staff.surname}: ${currentDept} => ${newDeptName}`,
            'green'
          );
          updates.push({
            updateOne: {
              filter: { _id: staff._id },
              update: { $set: { department: newDeptName } },
            },
          });
          updateCount++;
        } else {
          log(
            `⚠️  ${staff.name} ${staff.surname}: ObjectID ${currentDept} not found in departments!`,
            'red'
          );
        }
      } else {
        log(`ℹ️  ${staff.name} ${staff.surname}: Already has text department: "${currentDept}"`, 'dim');
      }
    }

    separator('📊 UPDATE SUMMARY');

    if (updates.length === 0) {
      log('✅ No updates needed!', 'green');
      log('\nAll staff already have proper department names.', 'white');
    } else {
      log(`Ready to update ${updates.length} staff members:\n`, 'bright');
      
      // Execute all updates
      const result = await Staff.bulkWrite(updates);
      
      log(`\n✅ Updates successful:`, 'green');
      log(`   Modified: ${result.modifiedCount}`, 'green');
      log(`   Matched: ${result.matchedCount}`, 'green');
    }

    separator('✅ VERIFICATION');

    // Verify the fix
    log('\nRe-checking departments now:\n', 'bright');

    for (const dept of departments) {
      const staffInDept = await Staff.find({ 
        department: dept.name,
        role: 'Intern',
        isActive: true 
      }).lean();

      const marker = staffInDept.length > 0 ? '✅' : '❌';
      log(`${marker} ${dept.name}: ${staffInDept.length} active interns`, 
        staffInDept.length > 0 ? 'green' : 'yellow'
      );

      staffInDept.forEach((staff) => {
        log(`   • ${staff.name} ${staff.surname}`, 'dim');
      });
    }

    log('\n✅ DEPARTMENT REFERENCE FIX COMPLETE\n', 'green');
    process.exit(0);
  } catch (error) {
    log(`\n❌ ERROR: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the fix
fixDepartmentReferences();
