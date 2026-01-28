const { DateTime } = require('luxon');
const Staff = require('../../models/Staff');
const ClockLog = require('../../models/ClockLog');
const { parseTimeString } = require('./timeUtils');

const formatDate = (dt) => dt.toFormat('yyyy-LL-dd');
const formatTime = (dt) => dt.toFormat('HH:mm');

const resolveExpectedClockIn = (staff) => {
  if (staff.clockInTime) return staff.clockInTime;
  const hostCompany = staff.hostCompanyId;
  if (hostCompany && hostCompany.defaultClockInTime) return hostCompany.defaultClockInTime;
  return null;
};

const resolveExpectedClockOut = (staff) => {
  if (staff.clockOutTime) return staff.clockOutTime;
  const hostCompany = staff.hostCompanyId;
  if (hostCompany && hostCompany.defaultClockOutTime) return hostCompany.defaultClockOutTime;
  return null;
};

const resolveBreakStart = (staff) => {
  if (staff.breakStartTime) return staff.breakStartTime;
  const hostCompany = staff.hostCompanyId;
  if (hostCompany && hostCompany.defaultBreakStartTime) return hostCompany.defaultBreakStartTime;
  return null;
};

const resolveBreakEnd = (staff) => {
  if (staff.breakEndTime) return staff.breakEndTime;
  const hostCompany = staff.hostCompanyId;
  if (hostCompany && hostCompany.defaultBreakEndTime) return hostCompany.defaultBreakEndTime;
  return null;
};

const resolveHostCompanyName = (staff) => {
  const hostCompany = staff.hostCompanyId;
  if (!hostCompany) return 'N/A';
  return hostCompany.companyName || hostCompany.name || 'N/A';
};

const buildStaffDetails = (staff) => ({
  staffId: staff._id.toString(),
  name: staff.name,
  surname: staff.surname,
  role: staff.role,
  idNumber: staff.idNumber,
  email: staff.email,
  phoneNumber: staff.phoneNumber,
  department: staff.department,
  hostCompanyName: resolveHostCompanyName(staff),
  mentorName: staff.mentorName,
  location: staff.location,
  locationAddress: staff.locationAddress,
  locationLatitude: staff.locationLatitude,
  locationLongitude: staff.locationLongitude,
  expectedClockIn: resolveExpectedClockIn(staff) || null,
  expectedClockOut: resolveExpectedClockOut(staff) || null,
  breakStartTime: resolveBreakStart(staff) || null,
  breakEndTime: resolveBreakEnd(staff) || null,
  extraHoursStartTime: staff.extraHoursStartTime || null,
  extraHoursEndTime: staff.extraHoursEndTime || null,
  expectedWorkingDaysPerWeek: staff.expectedWorkingDaysPerWeek,
  expectedWorkingDaysPerMonth: staff.expectedWorkingDaysPerMonth,
  expectedHoursPerDay: staff.expectedHoursPerDay,
  expectedWeeklyHours: staff.expectedWeeklyHours,
  expectedMonthlyHours: staff.expectedMonthlyHours,
  stipendAmount: staff.stipendAmount,
  isActive: staff.isActive,
  createdAt: staff.createdAt,
  rotationStatus: staff.rotationPlan?.status,
  rotationDepartment: staff.rotationPlan?.currentDepartment?.departmentName,
});

const buildDayEntry = (dateKey) => ({
  date: dateKey,
  clockIn: null,
  breakStart: null,
  breakEnd: null,
  clockOut: null,
  totalMinutes: 0,
  lateMinutes: null,
});

const applyLogToDay = (day, log, timezone) => {
  const logTime = DateTime.fromJSDate(log.timestamp).setZone(timezone);
  if (log.clockType === 'in') {
    if (!day.clockIn || logTime < DateTime.fromISO(day.clockIn, { zone: timezone })) {
      day.clockIn = logTime.toISO();
    }
  }
  if (log.clockType === 'out') {
    if (!day.clockOut || logTime > DateTime.fromISO(day.clockOut, { zone: timezone })) {
      day.clockOut = logTime.toISO();
    }
  }
  if (log.clockType === 'break_start') {
    if (!day.breakStart || logTime < DateTime.fromISO(day.breakStart, { zone: timezone })) {
      day.breakStart = logTime.toISO();
    }
  }
  if (log.clockType === 'break_end') {
    if (!day.breakEnd || logTime > DateTime.fromISO(day.breakEnd, { zone: timezone })) {
      day.breakEnd = logTime.toISO();
    }
  }
};

const finalizeDay = (day, timezone, expectedClockIn, graceMinutes) => {
  const clockIn = day.clockIn ? DateTime.fromISO(day.clockIn, { zone: timezone }) : null;
  const clockOut = day.clockOut ? DateTime.fromISO(day.clockOut, { zone: timezone }) : null;
  const breakStart = day.breakStart ? DateTime.fromISO(day.breakStart, { zone: timezone }) : null;
  const breakEnd = day.breakEnd ? DateTime.fromISO(day.breakEnd, { zone: timezone }) : null;

  if (clockIn && clockOut) {
    let minutes = Math.max(0, clockOut.diff(clockIn, 'minutes').minutes);
    if (breakStart && breakEnd && breakEnd > breakStart) {
      minutes -= Math.max(0, breakEnd.diff(breakStart, 'minutes').minutes);
    }
    day.totalMinutes = Math.max(0, Math.round(minutes));
  }

  if (clockIn && expectedClockIn) {
    const expected = parseTimeString(expectedClockIn);
    if (expected) {
      const expectedTime = DateTime.fromISO(day.date, { zone: timezone }).set({
        hour: expected.hour,
        minute: expected.minute,
        second: 0,
        millisecond: 0,
      });
      const diffMinutes = clockIn.diff(expectedTime, 'minutes').minutes;
      if (diffMinutes > graceMinutes) {
        day.lateMinutes = Math.round(diffMinutes);
      }
    }
  }

  day.clockIn = clockIn ? formatTime(clockIn) : null;
  day.clockOut = clockOut ? formatTime(clockOut) : null;
  day.breakStart = breakStart ? formatTime(breakStart) : null;
  day.breakEnd = breakEnd ? formatTime(breakEnd) : null;
  return day;
};

const buildTimesheetData = async ({ ownerType, ownerId, periodStart, periodEnd, timezone, graceMinutes, filters }) => {
  const staffFilter = { isActive: true };
  if (ownerType === 'HostCompany') {
    staffFilter.hostCompanyId = ownerId;
  }
  const departmentName = filters?.includeAllDepartments === false ? filters?.departmentName : '';
  if (departmentName) {
    staffFilter.department = departmentName;
  }

  const staffList = await Staff.find(staffFilter)
    .populate('hostCompanyId', 'name companyName defaultClockInTime defaultClockOutTime defaultBreakStartTime defaultBreakEndTime')
    .lean();

  if (!staffList.length) {
    return { staff: [], summary: { totalStaff: 0, totalDays: 0, totalLate: 0, totalMinutes: 0 } };
  }

  const staffIds = staffList.map((s) => s._id);
  const logs = await ClockLog.find({
    staffId: { $in: staffIds },
    timestamp: { $gte: periodStart, $lte: periodEnd },
  }).sort({ timestamp: 1 }).lean();

  const dayMap = new Map();

  logs.forEach((log) => {
    const staffId = log.staffId.toString();
    const dateKey = formatDate(DateTime.fromJSDate(log.timestamp).setZone(timezone));
    const key = `${staffId}:${dateKey}`;
    if (!dayMap.has(key)) {
      dayMap.set(key, buildDayEntry(dateKey));
    }
    applyLogToDay(dayMap.get(key), log, timezone);
  });

  let totalDays = 0;
  let totalLate = 0;
  let totalMinutes = 0;

  const staffReports = staffList.map((staff) => {
    const staffId = staff._id.toString();
    const staffDetails = buildStaffDetails(staff);
    const expectedClockIn = staffDetails.expectedClockIn;

    const days = Array.from(dayMap.entries())
      .filter(([key]) => key.startsWith(`${staffId}:`))
      .map(([, day]) => finalizeDay(day, timezone, expectedClockIn, graceMinutes))
      .sort((a, b) => a.date.localeCompare(b.date));

    const staffTotals = {
      daysPresent: days.length,
      lateCount: days.filter((d) => d.lateMinutes != null).length,
      totalMinutes: days.reduce((sum, d) => sum + (d.totalMinutes || 0), 0),
    };

    totalDays += staffTotals.daysPresent;
    totalLate += staffTotals.lateCount;
    totalMinutes += staffTotals.totalMinutes;

    return {
      ...staffDetails,
      days,
      totals: staffTotals,
    };
  });

  return {
    staff: staffReports,
    summary: {
      totalStaff: staffReports.length,
      totalDays,
      totalLate,
      totalMinutes,
    },
  };
};

const buildSummaryReport = async ({ ownerType, ownerId, periodStart, periodEnd, timezone, graceMinutes, reportType, periodKey, filters }) => {
  const data = await buildTimesheetData({
    ownerType,
    ownerId,
    periodStart,
    periodEnd,
    timezone,
    graceMinutes,
    filters,
  });

  return {
    reportType,
    ownerType,
    ownerId,
    periodStart,
    periodEnd,
    periodKey,
    timezone,
    generatedAt: new Date(),
    filters,
    summary: {
      ...data.summary,
      totalHours: Number((data.summary.totalMinutes / 60).toFixed(2)),
    },
    staff: data.staff,
  };
};

const buildLateClockInReport = async ({ staff, timestamp, timeDiffMinutes, ownerType, ownerId, timezone, graceMinutes }) => {
  const eventTime = DateTime.fromJSDate(timestamp).setZone(timezone);
  const dateKey = formatDate(eventTime);
  const staffDetails = buildStaffDetails(staff);
  const expectedClockIn = staffDetails.expectedClockIn;

  return {
    reportType: 'late',
    ownerType,
    ownerId,
    periodStart: eventTime.startOf('day').toJSDate(),
    periodEnd: eventTime.endOf('day').toJSDate(),
    periodKey: `late-${dateKey}`,
    timezone,
    generatedAt: new Date(),
    summary: {
      totalStaff: 1,
      totalDays: 1,
      totalLate: 1,
      totalMinutes: 0,
      totalHours: 0,
    },
    staff: [{
      ...staffDetails,
      days: [{
        date: dateKey,
        clockIn: formatTime(eventTime),
        breakStart: null,
        breakEnd: null,
        clockOut: null,
        totalMinutes: 0,
        lateMinutes: Math.round(timeDiffMinutes),
      }],
      totals: { daysPresent: 1, lateCount: 1, totalMinutes: 0 },
    }],
    metadata: {
      graceMinutes,
      lateMinutes: Math.round(timeDiffMinutes),
    },
  };
};

const buildMissingClockInReport = async ({ staff, dateKey, ownerType, ownerId, timezone }) => {
  const staffDetails = buildStaffDetails(staff);
  return {
    reportType: 'missing',
    ownerType,
    ownerId,
    periodStart: DateTime.fromISO(dateKey, { zone: timezone }).startOf('day').toJSDate(),
    periodEnd: DateTime.fromISO(dateKey, { zone: timezone }).endOf('day').toJSDate(),
    periodKey: `missing-${dateKey}`,
    timezone,
    generatedAt: new Date(),
    summary: {
      totalStaff: 1,
      totalDays: 1,
      totalLate: 0,
      totalMinutes: 0,
      totalHours: 0,
    },
    staff: [{
      ...staffDetails,
      days: [{
        date: dateKey,
        clockIn: null,
        breakStart: null,
        breakEnd: null,
        clockOut: null,
        totalMinutes: 0,
        lateMinutes: null,
      }],
      totals: { daysPresent: 0, lateCount: 0, totalMinutes: 0 },
    }],
  };
};

module.exports = {
  buildSummaryReport,
  buildLateClockInReport,
  buildMissingClockInReport,
};
