/**
 * Diagnostic Script: Check Companies and Departments with Mentor Names
 * 
 * This script checks all host companies and departments to see which ones have mentor names assigned.
 * Run this script separately to diagnose mentor name issues.
 * 
 * Usage: node scripts/check-mentors.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// Import models
const HostCompany = require('../models/HostCompany');
const Department = require('../models/Department');
const Staff = require('../models/Staff');

// MongoDB connection - use MONGO_URI from environment (same as server.js)
const MONGO_URI = process.env.MONGO_URI;

async function checkMentors() {
  try {
    if (!MONGO_URI) {
      console.error('❌ Error: MONGO_URI not found in environment variables');
      console.error('   Please make sure your .env file contains MONGO_URI');
      console.error('   Example: MONGO_URI=mongodb://localhost:27017/faceclock');
      process.exit(1);
    }
    
    console.log('🔍 Connecting to MongoDB...');
    // Hide credentials in URI if present
    const displayUri = MONGO_URI.includes('@') 
      ? MONGO_URI.replace(/\/\/.*@/, '//*****@') 
      : MONGO_URI;
    console.log(`   URI: ${displayUri}`);
    
    // Use same connection options as server.js
    const mongoOptions = {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true,
      w: 'majority'
    };
    
    await mongoose.connect(MONGO_URI, mongoOptions);
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🔗 Host: ${mongoose.connection.host}:${mongoose.connection.port}\n`);

    // Check Host Companies
    // IMPORTANT: In HostCompany, 'name' field IS the mentor name, 'companyName' is the actual company name
    console.log('='.repeat(80));
    console.log('📊 HOST COMPANIES WITH MENTOR NAMES');
    console.log('='.repeat(80));
    console.log('NOTE: The "name" field is the MENTOR NAME, "companyName" is the company name\n');
    
    const companies = await HostCompany.find({}).select('_id name companyName mentorName isActive').lean();
    console.log(`\nTotal Host Companies: ${companies.length}\n`);

    // The 'name' field IS the mentor name
    const companiesWithMentors = companies.filter(c => c.name && c.name.trim());
    const companiesWithoutMentors = companies.filter(c => !c.name || !c.name.trim());

    console.log(`✅ Companies WITH mentor names (name field populated): ${companiesWithMentors.length}`);
    if (companiesWithMentors.length > 0) {
      console.log('\nCompanies with mentors:');
      companiesWithMentors.forEach(company => {
        console.log(`  - ID: ${company._id}`);
        console.log(`    Mentor Name (name field): ${company.name || 'N/A'}`);
        console.log(`    Company Name: ${company.companyName || 'N/A'}`);
        if (company.mentorName && company.mentorName.trim() && company.mentorName !== company.name) {
          console.log(`    ⚠️  Legacy mentorName field (different): ${company.mentorName}`);
        }
        console.log(`    Active: ${company.isActive ? 'Yes' : 'No'}`);
        console.log('');
      });
    }

    console.log(`\n❌ Companies WITHOUT mentor names (name field empty): ${companiesWithoutMentors.length}`);
    if (companiesWithoutMentors.length > 0) {
      console.log('\nCompanies without mentors:');
      companiesWithoutMentors.forEach(company => {
        console.log(`  - ID: ${company._id}`);
        console.log(`    Mentor Name (name field): ${company.name || 'EMPTY - NOT SET'}`);
        console.log(`    Company Name: ${company.companyName || 'N/A'}`);
        console.log(`    Active: ${company.isActive ? 'Yes' : 'No'}`);
        console.log('');
      });
    }

    // Check Departments
    console.log('\n' + '='.repeat(80));
    console.log('📊 DEPARTMENTS WITH MENTOR NAMES');
    console.log('='.repeat(80));
    
    const departments = await Department.find({}).select('_id name companyName mentorName hostCompanyId isActive').lean();
    console.log(`\nTotal Departments: ${departments.length}\n`);

    const departmentsWithMentors = departments.filter(d => d.mentorName && d.mentorName.trim());
    const departmentsWithoutMentors = departments.filter(d => !d.mentorName || !d.mentorName.trim());

    console.log(`✅ Departments WITH mentor names: ${departmentsWithMentors.length}`);
    if (departmentsWithMentors.length > 0) {
      console.log('\nDepartments with mentors:');
      departmentsWithMentors.forEach(dept => {
        console.log(`  - ID: ${dept._id}`);
        console.log(`    Name: ${dept.name || 'N/A'}`);
        console.log(`    Company Name: ${dept.companyName || 'N/A'}`);
        console.log(`    Host Company ID: ${dept.hostCompanyId || 'N/A'}`);
        console.log(`    Mentor Name: ${dept.mentorName}`);
        console.log(`    Active: ${dept.isActive ? 'Yes' : 'No'}`);
        console.log('');
      });
    }

    console.log(`\n❌ Departments WITHOUT mentor names: ${departmentsWithoutMentors.length}`);
    if (departmentsWithoutMentors.length > 0) {
      console.log('\nDepartments without mentors (first 10):');
      departmentsWithoutMentors.slice(0, 10).forEach(dept => {
        console.log(`  - ID: ${dept._id}`);
        console.log(`    Name: ${dept.name || 'N/A'}`);
        console.log(`    Company Name: ${dept.companyName || 'N/A'}`);
        console.log(`    Host Company ID: ${dept.hostCompanyId || 'N/A'}`);
        console.log(`    Active: ${dept.isActive ? 'Yes' : 'No'}`);
        console.log('');
      });
      if (departmentsWithoutMentors.length > 10) {
        console.log(`  ... and ${departmentsWithoutMentors.length - 10} more\n`);
      }
    }

    // Check Staff Mentors (Staff role members who can be mentors)
    console.log('\n' + '='.repeat(80));
    console.log('👥 STAFF MEMBERS WHO CAN BE MENTORS (Role: Staff)');
    console.log('='.repeat(80));
    
    const staffMentors = await Staff.find({ 
      role: 'Staff', 
      isActive: true 
    }).select('_id name surname department hostCompanyId').lean();
    
    console.log(`\nTotal Active Staff Members (potential mentors): ${staffMentors.length}\n`);

    if (staffMentors.length > 0) {
      console.log('Staff members by company:');
      
      // Group by hostCompanyId
      const byCompany = {};
      staffMentors.forEach(staff => {
        const companyId = staff.hostCompanyId ? staff.hostCompanyId.toString() : 'No Company';
        if (!byCompany[companyId]) {
          byCompany[companyId] = [];
        }
        byCompany[companyId].push(staff);
      });

      for (const [companyId, staffList] of Object.entries(byCompany)) {
        console.log(`\n  Company ID: ${companyId}`);
        console.log(`  Staff Count: ${staffList.length}`);
        
        staffList.forEach(staff => {
          console.log(`    - ID: ${staff._id}`);
          console.log(`      Name: ${staff.name} ${staff.surname || ''}`.trim());
          console.log(`      Department: ${staff.department || 'N/A'}`);
        });
      }
    } else {
      console.log('⚠️  No active Staff members found. Staff members with role "Staff" can be mentors.');
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📋 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Host Companies: ${companies.length}`);
    console.log(`  - With mentor names (name field): ${companiesWithMentors.length}`);
    console.log(`  - Without mentor names (name field empty): ${companiesWithoutMentors.length}`);
    console.log(`\nNote: "name" field = Mentor Name, "companyName" = Actual Company Name`);
    console.log(`\nTotal Departments: ${departments.length}`);
    console.log(`  - With mentor names: ${departmentsWithMentors.length}`);
    console.log(`  - Without mentor names: ${departmentsWithoutMentors.length}`);
    console.log(`\nTotal Active Staff (potential mentors): ${staffMentors.length}`);

    // Check for specific IDs mentioned in errors
    console.log('\n' + '='.repeat(80));
    console.log('🔍 CHECKING SPECIFIC IDs FROM ERROR LOGS');
    console.log('='.repeat(80));
    
    const errorCompanyIds = ['695f81517274f21772557e12', '695f71789cf82b5a3c68f659'];
    const errorDepartmentIds = ['695f822c7274f21772557ed5', '695f74369cf82b5a3c68f7a9'];

    console.log('\nChecking Company IDs:');
    for (const companyId of errorCompanyIds) {
      if (mongoose.Types.ObjectId.isValid(companyId)) {
        const company = await HostCompany.findById(companyId).select('_id name companyName mentorName isActive').lean();
        if (company) {
          console.log(`  ✅ Found: ${companyId}`);
          console.log(`     Mentor Name (name field): ${company.name || 'NOT SET - EMPTY'}`);
          console.log(`     Company Name: ${company.companyName || 'N/A'}`);
          if (company.mentorName && company.mentorName.trim() && company.mentorName !== company.name) {
            console.log(`     ⚠️  Legacy mentorName field: ${company.mentorName}`);
          }
          console.log(`     Active: ${company.isActive ? 'Yes' : 'No'}`);
          
          // Check staff for this company
          const staffForCompany = await Staff.find({ 
            hostCompanyId: companyId, 
            isActive: true,
            role: 'Staff'
          }).select('_id name surname department').lean();
          console.log(`     Staff mentors for this company: ${staffForCompany.length}`);
          if (staffForCompany.length > 0) {
            staffForCompany.forEach(s => {
              console.log(`       - ${s.name} ${s.surname || ''} (Dept: ${s.department})`);
            });
          }
        } else {
          console.log(`  ❌ Not Found: ${companyId}`);
        }
      } else {
        console.log(`  ⚠️  Invalid ID format: ${companyId}`);
      }
    }

    console.log('\nChecking Department IDs:');
    for (const deptId of errorDepartmentIds) {
      if (mongoose.Types.ObjectId.isValid(deptId)) {
        const dept = await Department.findById(deptId).select('_id name companyName mentorName hostCompanyId isActive').lean();
        if (dept) {
          console.log(`  ✅ Found: ${deptId}`);
          console.log(`     Name: ${dept.name || 'N/A'}`);
          console.log(`     Company Name: ${dept.companyName || 'N/A'}`);
          console.log(`     Host Company ID: ${dept.hostCompanyId || 'N/A'}`);
          console.log(`     Mentor Name: ${dept.mentorName || 'NOT SET'}`);
          console.log(`     Active: ${dept.isActive ? 'Yes' : 'No'}`);
          
          // Check staff for this department (try both department ID and department name)
          const staffByDeptId = await Staff.find({ 
            department: deptId.toString(), 
            isActive: true,
            role: 'Staff'
          }).select('_id name surname department hostCompanyId').lean();
          
          const staffByDeptName = await Staff.find({ 
            department: dept.name, 
            isActive: true,
            role: 'Staff'
          }).select('_id name surname department hostCompanyId').lean();
          
          const allStaffForDept = [...staffByDeptId, ...staffByDeptName.filter(s => 
            !staffByDeptId.find(s2 => s2._id.toString() === s._id.toString())
          )];
          
          console.log(`     Staff mentors for this department (by ID): ${staffByDeptId.length}`);
          console.log(`     Staff mentors for this department (by Name): ${staffByDeptName.length}`);
          console.log(`     Total unique staff mentors: ${allStaffForDept.length}`);
          if (allStaffForDept.length > 0) {
            allStaffForDept.forEach(s => {
              console.log(`       - ${s.name} ${s.surname || ''} (Dept stored as: "${s.department}", Company: ${s.hostCompanyId || 'N/A'})`);
            });
          }
        } else {
          console.log(`  ❌ Not Found: ${deptId}`);
        }
      } else {
        console.log(`  ⚠️  Invalid ID format: ${deptId}`);
      }
    }

    console.log('\n✅ Diagnostic complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.name === 'MongooseServerSelectionError' || error.name === 'MongoServerSelectionError') {
      console.error('\n💡 Troubleshooting tips:');
      console.error('   1. Make sure MongoDB is running');
      console.error('   2. Check that MONGO_URI in .env file is correct');
      console.error('   3. Verify MongoDB is accessible from this machine');
      console.error('   4. If using MongoDB Atlas, check your network access settings');
      console.error(`\n   Current MONGO_URI: ${MONGO_URI.includes('@') ? MONGO_URI.replace(/\/\/.*@/, '//*****@') : MONGO_URI}`);
    }
    if (error.stack) {
      console.error('\nFull error details:', error.stack);
    }
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the diagnostic
checkMentors();

