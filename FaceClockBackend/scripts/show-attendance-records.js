#!/usr/bin/env node

/**
 * Script: show-attendance-records.js
 * Purpose: Lists each staff/intern that already has one or more attendance logs
 *          along with the earliest/latest timestamps and a short sample of the stored records.
 *          Also surfaces which current staff members do not yet have any logs.
 *
 * Usage:
 *   node show-attendance-records.js [--start=YYYY-MM-DD] [--end=YYYY-MM-DD] [--limit=20]
 *
 * Options:
 *   --start : Optional start date filter (inclusive)
 *   --end   : Optional end date filter (inclusive)
 *   --limit : How many staff records to display in detail (default 20)
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const ClockLog = require('../models/ClockLog');

const args = process.argv.slice(2);
const parseOption = (name) => {
  const match = args.find((arg) => arg.startsWith(`${name}=`));
  return match ? match.split('=')[1] : null;
};

const startDateArg = parseOption('--start');
const endDateArg = parseOption('--end');
const staffArg = parseOption('--staff');
const limitArg = parseInt(parseOption('--limit'), 10) || 20;

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startFilter = toDate(startDateArg);
const endFilter = toDate(endDateArg);

async function main() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Missing MONGO_URI in .env; please set it before running the script.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const staffFilter = {
    role: { $in: ['Intern', 'Staff'] },
    isActive: { $ne: false },
  };
  if (staffArg) {
    const ids = staffArg.split(',').map((id) => id.trim());
    staffFilter._id = { $in: ids };
  }
  const staffList = await Staff.find(staffFilter).lean();

  const match = { staffId: { $exists: true } };
  if (startFilter || endFilter) {
    match.timestamp = {};
    if (startFilter) match.timestamp.$gte = startFilter;
    if (endFilter) {
      const end = new Date(endFilter);
      end.setHours(23, 59, 59, 999);
      match.timestamp.$lte = end;
    }
  }

  const groups = await ClockLog.aggregate([
    { $match: match },
    { $sort: { timestamp: 1 } },
    {
      $group: {
        _id: '$staffId',
        totalLogs: { $sum: 1 },
        earliest: { $first: '$$ROOT' },
        latest: { $last: '$$ROOT' },
        entries: { $push: { activityType: '$activityType', timestamp: '$timestamp', confidence: '$confidence' } },
      },
    },
    {
      $lookup: {
        from: 'staff',
        localField: '_id',
        foreignField: '_id',
        as: 'staff',
      },
    },
    { $unwind: '$staff' },
  ]);

  const staffWithLogs = new Set(groups.map((group) => group._id.toString()));

  console.log('\n📋 Attendance Records by Staff/Intern');
  console.log('   Showing up to', limitArg, 'staff with logs\n');

  groups.slice(0, limitArg).forEach((group) => {
    const staff = group.staff;
    const hostCompanyName = staff.hostCompany?.name
      || staff.hostCompany
      || staff.hostCompanyId?.companyName
      || staff.hostCompanyId?.name
      || 'N/A';

    const earliest = new Date(group.earliest.timestamp).toISOString();
    const latest = new Date(group.latest.timestamp).toISOString();

    const perDate = group.entries.reduce((map, entry) => {
      const dateKey = new Date(entry.timestamp).toISOString().split('T')[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(entry);
      return map;
    }, {});

    console.log(`▶ ${staff.name || staff.fullName || 'Unknown'} (${staff.role || 'Staff'}) - ${hostCompanyName}`);
    console.log(`  Staff ID: ${staff._id.toString()}`);
    console.log(`  Logs: ${group.totalLogs} entries (${earliest} → ${latest})`);
    console.log('  Daily breakdown:');
    Object.keys(perDate)
      .sort()
      .forEach((dateKey) => {
        console.log(`    • ${dateKey}`);
        perDate[dateKey].forEach((entry) => {
          console.log(`        - ${entry.activityType} @ ${new Date(entry.timestamp).toISOString()} (confidence: ${entry.confidence ?? 'n/a'})`);
        });
      });
    console.log('');
  });

  const staffWithoutLogs = staffList
    .filter((staff) => !staffWithLogs.has(staff._id.toString()))
    .map((staff) => ({
      id: staff._id.toString(),
      name: `${staff.name || staff.firstName || ''} ${staff.surname || staff.lastName || ''}`.trim() || 'Unknown',
      role: staff.role || 'Staff',
    }));

  console.log('⚠️ Staff/Interns without attendance logs:', staffWithoutLogs.length);
  staffWithoutLogs.slice(0, 100).forEach((staff) => {
    console.log(`  - ${staff.name} (${staff.role}) [${staff.id}]`);
  });

  if (staffWithoutLogs.length > 100) {
    console.log(`  ...and ${staffWithoutLogs.length - 100} more`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
