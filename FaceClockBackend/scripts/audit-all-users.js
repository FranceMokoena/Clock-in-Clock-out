#!/usr/bin/env node

/**
 * 🔍 COMPREHENSIVE USER AUDIT SCRIPT
 * 
 * This script audits ALL users in the system and provides detailed information about:
 * - All staff/intern metadata
 * - Department assignments
 * - Host company associations
 * - Active/inactive status
 * - Data consistency issues
 * 
 * Usage: node audit-all-users.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const Department = require('../models/Department');
const HostCompany = require('../models/HostCompany');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
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
  } else {
    log(`\n${line}\n`, 'cyan');
  }
}

async function auditAllUsers() {
  try {
    // Connect to MongoDB
    log('🔗 Connecting to MongoDB...', 'blue');
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    if (!mongoUri) {
      log('❌ ERROR: MONGO_URI not found in .env file', 'red');
      log('Please make sure your .env file contains: MONGO_URI=mongodb+srv://...', 'yellow');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    log('✅ Connected successfully\n', 'green');

    separator('📊 SYSTEM OVERVIEW');

    // Get counts
    const totalStaff = await Staff.countDocuments();
    const totalDepartments = await Department.countDocuments();
    const totalHostCompanies = await HostCompany.countDocuments();
    const totalInterns = await Staff.countDocuments({ role: 'Intern' });
    const totalStaffRole = await Staff.countDocuments({ role: 'Staff' });
    const totalOther = await Staff.countDocuments({ role: 'Other' });
    const activeStaff = await Staff.countDocuments({ isActive: true });
    const inactiveStaff = await Staff.countDocuments({ isActive: false });

    log(`Total Staff/Interns:        ${totalStaff}`, 'white');
    log(`  ├─ Interns:               ${totalInterns}`, 'green');
    log(`  ├─ Staff:                 ${totalStaffRole}`, 'yellow');
    log(`  └─ Other:                 ${totalOther}`, 'yellow');
    log(`\nActive:                     ${activeStaff}`, 'green');
    log(`Inactive:                   ${inactiveStaff}`, 'red');
    log(`\nTotal Departments:          ${totalDepartments}`, 'white');
    log(`Total Host Companies:       ${totalHostCompanies}`, 'white');

    separator('👥 DETAILED STAFF LISTING');

    // Get all staff with full details
    const allStaff = await Staff.find()
      .populate('hostCompanyId', 'name companyName')
      .sort({ name: 1 })
      .lean();

    log(`Found ${allStaff.length} staff members:\n`, 'bright');

    // Create detailed table
    const staffByDept = {};
    const staffByCompany = {};
    const unassignedStaff = [];
    const inactiveStaffList = [];

    allStaff.forEach((staff) => {
      const status = staff.isActive ? '✅' : '❌';
      const dept = staff.department || 'UNASSIGNED';
      const company = staff.hostCompanyId?.companyName || staff.hostCompanyId?.name || 'NO COMPANY';

      // Group by department
      if (!staffByDept[dept]) {
        staffByDept[dept] = [];
      }
      staffByDept[dept].push(staff);

      // Group by company
      if (!staffByCompany[company]) {
        staffByCompany[company] = [];
      }
      staffByCompany[company].push(staff);

      // Track unassigned
      if (!staff.department) {
        unassignedStaff.push(staff);
      }

      // Track inactive
      if (!staff.isActive) {
        inactiveStaffList.push(staff);
      }

      // Print individual entry
      const internMarker = staff.role === 'Intern' ? '👤' : '👔';
      log(
        `${status} ${internMarker} ${staff.name} ${staff.surname}` +
        ` | ID: ${staff.idNumber}` +
        ` | Role: ${staff.role}` +
        ` | Dept: ${dept}` +
        ` | Company: ${company}`,
        staff.isActive ? 'white' : 'dim'
      );
    });

    separator('📋 BREAKDOWN BY DEPARTMENT');

    const deptNames = Object.keys(staffByDept).sort();
    deptNames.forEach((dept) => {
      const staffList = staffByDept[dept];
      const internCount = staffList.filter((s) => s.role === 'Intern').length;
      const staffCount = staffList.filter((s) => s.role === 'Staff').length;
      const otherCount = staffList.filter((s) => s.role === 'Other').length;

      if (dept === 'UNASSIGNED') {
        log(`\n⚠️  ${dept} (${staffList.length} total)`, 'red');
      } else {
        log(`\n✅ ${dept}`, 'green');
      }

      log(`   Total: ${staffList.length} | Interns: ${internCount} | Staff: ${staffCount} | Other: ${otherCount}`, 'white');

      staffList.forEach((staff) => {
        const status = staff.isActive ? '✅' : '❌';
        log(`   ${status} ${staff.name} ${staff.surname} (${staff.role})`, staff.isActive ? 'dim' : 'red');
      });
    });

    separator('🏢 BREAKDOWN BY HOST COMPANY');

    const companyNames = Object.keys(staffByCompany).sort();
    companyNames.forEach((company) => {
      const staffList = staffByCompany[company];
      const internCount = staffList.filter((s) => s.role === 'Intern').length;
      const staffCount = staffList.filter((s) => s.role === 'Staff').length;

      if (company === 'NO COMPANY') {
        log(`\n⚠️  ${company} (${staffList.length} total)`, 'yellow');
      } else {
        log(`\n✅ ${company}`, 'green');
      }

      log(`   Total: ${staffList.length} | Interns: ${internCount} | Staff: ${staffCount}`, 'white');

      staffList.forEach((staff) => {
        const status = staff.isActive ? '✅' : '❌';
        log(
          `   ${status} ${staff.name} ${staff.surname} (${staff.role}) - Dept: ${staff.department || 'UNASSIGNED'}`,
          staff.isActive ? 'dim' : 'red'
        );
      });
    });

    separator('⚠️  ISSUES DETECTED');

    let issueCount = 0;

    // Unassigned staff
    if (unassignedStaff.length > 0) {
      issueCount++;
      log(`\n❌ UNASSIGNED STAFF (${unassignedStaff.length})`, 'red');
      log(`   These staff have no department assigned:`, 'yellow');
      unassignedStaff.forEach((staff) => {
        log(`   - ${staff.name} ${staff.surname} (${staff.role})`, 'white');
      });
    }

    // Inactive staff
    if (inactiveStaffList.length > 0) {
      issueCount++;
      log(`\n❌ INACTIVE STAFF (${inactiveStaffList.length})`, 'red');
      log(`   These staff are marked inactive:`, 'yellow');
      inactiveStaffList.forEach((staff) => {
        log(
          `   - ${staff.name} ${staff.surname} (${staff.role}) in ${staff.department || 'UNASSIGNED'}`,
          'white'
        );
      });
    }

    // Staff with no host company
    const noHostCompany = allStaff.filter((s) => !s.hostCompanyId);
    if (noHostCompany.length > 0) {
      issueCount++;
      log(`\n⚠️  STAFF WITH NO HOST COMPANY (${noHostCompany.length})`, 'yellow');
      noHostCompany.forEach((staff) => {
        log(
          `   - ${staff.name} ${staff.surname} (${staff.role}) in ${staff.department || 'UNASSIGNED'}`,
          'white'
        );
      });
    }

    if (issueCount === 0) {
      log('\n✅ NO ISSUES DETECTED!', 'green');
    }

    separator('📈 DEPARTMENT COMPARISON');

    // Get all departments
    const allDepartments = await Department.find().lean();
    log(`Total departments in system: ${allDepartments.length}\n`, 'white');

    allDepartments.forEach((dept) => {
      const internInDept = allStaff.filter(
        (s) => s.role === 'Intern' && s.department && s.department.toLowerCase() === dept.name.toLowerCase()
      );
      const allInDept = allStaff.filter(
        (s) => s.department && s.department.toLowerCase() === dept.name.toLowerCase()
      );

      if (internInDept.length > 0 || allInDept.length > 0) {
        log(
          `✅ ${dept.name}: ${internInDept.length} interns, ${allInDept.length} total`,
          'green'
        );
        internInDept.forEach((s) => {
          log(`   - ${s.name} ${s.surname} (${s.role})`, 'dim');
        });
      } else {
        log(`❌ ${dept.name}: NO STAFF ASSIGNED`, 'red');
      }
    });

    separator('🔍 DATA CONSISTENCY CHECK');

    // Check for department name mismatches
    const departmentNames = allDepartments.map((d) => d.name.toLowerCase());
    const staffDepartments = [...new Set(allStaff.map((s) => s.department?.toLowerCase()).filter(Boolean))];
    const mismatchedDepts = staffDepartments.filter((d) => !departmentNames.includes(d));

    if (mismatchedDepts.length > 0) {
      log(`\n⚠️  DEPARTMENT NAME MISMATCHES (${mismatchedDepts.length})`, 'yellow');
      log(`   Staff assigned to departments that don't exist in Department collection:`, 'yellow');
      mismatchedDepts.forEach((dept) => {
        const staffInDept = allStaff.filter((s) => s.department?.toLowerCase() === dept);
        log(`   - "${dept}" (${staffInDept.length} staff)`, 'white');
        staffInDept.forEach((s) => {
          log(`     • ${s.name} ${s.surname}`, 'dim');
        });
      });
    } else {
      log('\n✅ All staff departments match department collection', 'green');
    }

    separator('📊 SUMMARY FOR INTERN COUNTING');

    log('\nThis is critical for the department intern count feature:', 'bright');
    log('\nFor each department, the system counts:', 'white');
    log('- Staff WHERE role = "Intern" AND isActive = true AND department matches', 'dim');

    log('\n\nExpected counts per department:', 'bright');
    allDepartments.forEach((dept) => {
      const count = allStaff.filter(
        (s) => s.role === 'Intern' &&
               s.isActive === true &&
               s.department &&
               s.department.toLowerCase() === dept.name.toLowerCase()
      ).length;

      const marker = count > 0 ? '✅' : '❌';
      log(`${marker} ${dept.name}: ${count} interns`, count > 0 ? 'green' : 'yellow');
    });

    separator('💾 EXPORT DATA FOR REFERENCE');

    // Create export format
    const exportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalStaff,
        totalInterns,
        totalDepartments,
        totalHostCompanies,
      },
      departments: allDepartments.map((d) => ({
        name: d.name,
        code: d.departmentCode,
        company: d.companyName,
        interns: allStaff
          .filter(
            (s) => s.role === 'Intern' &&
                   s.department &&
                   s.department.toLowerCase() === d.name.toLowerCase()
          )
          .map((s) => ({
            name: `${s.name} ${s.surname}`,
            idNumber: s.idNumber,
            role: s.role,
          })),
      })),
      issues: {
        unassignedStaff: unassignedStaff.length,
        inactiveStaff: inactiveStaffList.length,
        departmentMismatches: mismatchedDepts.length,
      },
    };

    const fs = require('fs');
    const exportPath = `./scripts/audit-report-${Date.now()}.json`;
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    log(`\n✅ Full audit report exported to: ${exportPath}`, 'green');

    log('\n\n✅ AUDIT COMPLETE\n', 'green');
    process.exit(0);
  } catch (error) {
    log(`\n❌ ERROR: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the audit
auditAllUsers();
