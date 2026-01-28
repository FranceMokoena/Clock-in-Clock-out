const ClockLog = require('../models/ClockLog');
const Staff = require('../models/Staff');
const HostCompany = require('../models/HostCompany');
const AttendanceCorrection = require('../models/AttendanceCorrection');

const TOLERANCE_MINUTES = 15;

const parseTimeToMinutes = (timeString) => {
  if (!timeString || typeof timeString !== 'string') return null;
  const parts = timeString.split(':');
  if (parts.length !== 2) return null;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return (hours * 60) + minutes;
};

const computeHoursPerDayFromTimes = (clockIn, clockOut, breakStart, breakEnd) => {
  const clockInMinutes = parseTimeToMinutes(clockIn);
  const clockOutMinutes = parseTimeToMinutes(clockOut);
  if (clockInMinutes === null || clockOutMinutes === null) {
    return null;
  }
  let totalMinutes = clockOutMinutes - clockInMinutes;
  if (totalMinutes <= 0) {
    return null;
  }
  if (breakStart && breakEnd) {
    const breakStartMinutes = parseTimeToMinutes(breakStart);
    const breakEndMinutes = parseTimeToMinutes(breakEnd);
    if (breakStartMinutes !== null && breakEndMinutes !== null && breakEndMinutes > breakStartMinutes) {
      totalMinutes -= (breakEndMinutes - breakStartMinutes);
    }
  }
  if (totalMinutes <= 0) {
    return null;
  }
  return totalMinutes / 60;
};

const countWeekdaysInRange = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  let count = 0;
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day >= 1 && day <= 5) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
};

const countWeekdaysInMonth = (yearValue, monthValue) => {
  const monthIndex = monthValue - 1;
  const cursor = new Date(yearValue, monthIndex, 1);
  let count = 0;
  while (cursor.getMonth() === monthIndex) {
    const day = cursor.getDay();
    if (day >= 1 && day <= 5) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
};

const roundValue = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
};

const resolveClockTimes = async (staff) => {
  if (staff.clockInTime && staff.clockOutTime) {
    return {
      clockInTime: staff.clockInTime,
      clockOutTime: staff.clockOutTime,
      breakStartTime: staff.breakStartTime,
      breakEndTime: staff.breakEndTime,
      source: 'staff'
    };
  }

  if (staff.hostCompanyId) {
    const hostCompany = await HostCompany.findById(staff.hostCompanyId)
      .select('defaultClockInTime defaultClockOutTime defaultBreakStartTime defaultBreakEndTime')
      .lean();
    if (hostCompany && hostCompany.defaultClockInTime && hostCompany.defaultClockOutTime) {
      return {
        clockInTime: hostCompany.defaultClockInTime,
        clockOutTime: hostCompany.defaultClockOutTime,
        breakStartTime: hostCompany.defaultBreakStartTime,
        breakEndTime: hostCompany.defaultBreakEndTime,
        source: 'hostCompany'
      };
    }
  }

  if (process.env.DEFAULT_CLOCK_IN_TIME && process.env.DEFAULT_CLOCK_OUT_TIME) {
    return {
      clockInTime: process.env.DEFAULT_CLOCK_IN_TIME,
      clockOutTime: process.env.DEFAULT_CLOCK_OUT_TIME,
      breakStartTime: process.env.DEFAULT_BREAK_START_TIME || null,
      breakEndTime: process.env.DEFAULT_BREAK_END_TIME || null,
      source: 'system'
    };
  }

  return null;
};

const resolveWorkingHours = async (staff, startDate, endDate) => {
  const assignedFields = [
    staff.expectedWorkingDaysPerWeek,
    staff.expectedWorkingDaysPerMonth,
    staff.expectedHoursPerDay,
    staff.expectedWeeklyHours,
    staff.expectedMonthlyHours
  ];

  const hasAssignedWorkingHours = assignedFields.some(
    (value) => value !== null && value !== undefined
  );
  const hasAssignedHoursOnly = [
    staff.expectedHoursPerDay,
    staff.expectedWeeklyHours,
    staff.expectedMonthlyHours
  ].some((value) => value !== null && value !== undefined);

  const defaultWorkingDaysPerWeek = Number.isFinite(Number(process.env.DEFAULT_WORKING_DAYS_PER_WEEK))
    ? Number(process.env.DEFAULT_WORKING_DAYS_PER_WEEK)
    : 5;

  const rangeStart = startDate ? new Date(startDate) : new Date();
  const monthValue = rangeStart.getMonth() + 1;
  const yearValue = rangeStart.getFullYear();
  const defaultWorkingDaysPerMonth = countWeekdaysInMonth(yearValue, monthValue);

  const workingDaysPerWeek = Number.isFinite(staff.expectedWorkingDaysPerWeek)
    ? staff.expectedWorkingDaysPerWeek
    : defaultWorkingDaysPerWeek;
  const workingDaysPerMonth = Number.isFinite(staff.expectedWorkingDaysPerMonth)
    ? staff.expectedWorkingDaysPerMonth
    : defaultWorkingDaysPerMonth;

  let hoursPerDay = Number.isFinite(staff.expectedHoursPerDay) ? staff.expectedHoursPerDay : null;
  let weeklyHours = Number.isFinite(staff.expectedWeeklyHours) ? staff.expectedWeeklyHours : null;
  let monthlyHours = Number.isFinite(staff.expectedMonthlyHours) ? staff.expectedMonthlyHours : null;

  let source = hasAssignedWorkingHours ? 'staff' : null;

  if (!hasAssignedHoursOnly) {
    const clockTimes = await resolveClockTimes(staff);
    if (clockTimes) {
      const derivedHoursPerDay = computeHoursPerDayFromTimes(
        clockTimes.clockInTime,
        clockTimes.clockOutTime,
        clockTimes.breakStartTime,
        clockTimes.breakEndTime
      );
      if (hoursPerDay === null && derivedHoursPerDay !== null) {
        hoursPerDay = derivedHoursPerDay;
      }
      if (!source) {
        source = clockTimes.source;
      }
    }
  }

  if (hoursPerDay === null) {
    if (weeklyHours !== null && workingDaysPerWeek > 0) {
      hoursPerDay = weeklyHours / workingDaysPerWeek;
    } else if (monthlyHours !== null && workingDaysPerMonth > 0) {
      hoursPerDay = monthlyHours / workingDaysPerMonth;
    }
  }

  if (weeklyHours === null && hoursPerDay !== null && workingDaysPerWeek > 0) {
    weeklyHours = hoursPerDay * workingDaysPerWeek;
  }

  if (monthlyHours === null && hoursPerDay !== null && workingDaysPerMonth > 0) {
    monthlyHours = hoursPerDay * workingDaysPerMonth;
  }

  return {
    workingDaysPerWeek,
    workingDaysPerMonth,
    hoursPerDay,
    weeklyHours,
    monthlyHours,
    source: source || 'none'
  };
};

const computeExpectedHoursForRange = (workingHours, startDate, endDate) => {
  if (!workingHours || !startDate || !endDate) return 0;
  const rangeStart = new Date(startDate);
  const rangeEnd = new Date(endDate);
  const totalDays = Math.max(
    Math.round((rangeEnd.setHours(0, 0, 0, 0) - rangeStart.setHours(0, 0, 0, 0)) / 86400000) + 1,
    1
  );
  const weekdayCount = countWeekdaysInRange(startDate, endDate);
  const workingDayRatio = workingHours.workingDaysPerWeek && workingHours.workingDaysPerWeek > 0
    ? workingHours.workingDaysPerWeek / 5
    : 1;
  const expectedDays = Math.max(Math.round(weekdayCount * workingDayRatio), 0);

  const isFullMonthRange = (() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start.getFullYear() !== end.getFullYear() || start.getMonth() !== end.getMonth()) {
      return false;
    }
    const firstOfMonth = new Date(start.getFullYear(), start.getMonth(), 1);
    const lastOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    return start.toDateString() === firstOfMonth.toDateString()
      && end.toDateString() === lastOfMonth.toDateString();
  })();

  if (isFullMonthRange && Number.isFinite(workingHours.monthlyHours)) {
    return workingHours.monthlyHours;
  }

  if (Number.isFinite(workingHours.weeklyHours)) {
    return workingHours.weeklyHours * (totalDays / 7);
  }

  if (Number.isFinite(workingHours.hoursPerDay)) {
    return workingHours.hoursPerDay * expectedDays;
  }

  return 0;
};

const buildDailyAttendance = (logs) => {
  const attendanceByDate = {};
  logs.forEach((log) => {
    const dateKey = new Date(log.timestamp).toISOString().split('T')[0];
    if (!attendanceByDate[dateKey]) {
      attendanceByDate[dateKey] = {
        clockIn: null,
        clockOut: null,
        breakStart: null,
        breakEnd: null,
        lunchStart: null,
        lunchEnd: null,
        extraShiftIn: null,
        extraShiftOut: null
      };
    }

    if (log.activityType === 'in') {
      attendanceByDate[dateKey].clockIn = log.timestamp;
    } else if (log.activityType === 'out') {
      attendanceByDate[dateKey].clockOut = log.timestamp;
    } else if (log.activityType === 'break_start') {
      attendanceByDate[dateKey].breakStart = log.timestamp;
    } else if (log.activityType === 'break_end') {
      attendanceByDate[dateKey].breakEnd = log.timestamp;
    } else if (log.activityType === 'lunch_start') {
      attendanceByDate[dateKey].lunchStart = log.timestamp;
    } else if (log.activityType === 'lunch_end') {
      attendanceByDate[dateKey].lunchEnd = log.timestamp;
    } else if (log.activityType === 'extra_shift_in') {
      attendanceByDate[dateKey].extraShiftIn = log.timestamp;
    } else if (log.activityType === 'extra_shift_out') {
      attendanceByDate[dateKey].extraShiftOut = log.timestamp;
    }
  });
  return attendanceByDate;
};

const computeHoursWorkedForDay = (day) => {
  let hoursWorked = 0;
  if (day.clockIn && day.clockOut) {
    const clockInTime = new Date(day.clockIn).getTime();
    const clockOutTime = new Date(day.clockOut).getTime();
    let totalMinutes = (clockOutTime - clockInTime) / (1000 * 60);

    if (day.breakStart && day.breakEnd) {
      const breakStart = new Date(day.breakStart).getTime();
      const breakEnd = new Date(day.breakEnd).getTime();
      const breakMinutes = (breakEnd - breakStart) / (1000 * 60);
      totalMinutes -= breakMinutes;
    }

    if (day.lunchStart && day.lunchEnd) {
      const lunchStart = new Date(day.lunchStart).getTime();
      const lunchEnd = new Date(day.lunchEnd).getTime();
      const lunchMinutes = (lunchEnd - lunchStart) / (1000 * 60);
      totalMinutes -= lunchMinutes;
    }

    hoursWorked = Math.max(0, totalMinutes / 60);
  }

  if (day.extraShiftIn && day.extraShiftOut) {
    const extraStart = new Date(day.extraShiftIn).getTime();
    const extraEnd = new Date(day.extraShiftOut).getTime();
    const extraMinutes = (extraEnd - extraStart) / (1000 * 60);
    hoursWorked += extraMinutes / 60;
  }

  return hoursWorked;
};

const computeLateCount = (attendanceByDate, expectedClockIn) => {
  if (!expectedClockIn) return 0;
  const expectedMinutes = parseTimeToMinutes(expectedClockIn);
  if (expectedMinutes === null) return 0;
  let lateCount = 0;

  Object.values(attendanceByDate).forEach((day) => {
    if (!day.clockIn) return;
    const clockInDate = new Date(day.clockIn);
    const dayOfWeek = clockInDate.getDay();
    if (dayOfWeek < 1 || dayOfWeek > 5) return;
    const actualMinutes = clockInDate.getHours() * 60 + clockInDate.getMinutes();
    if (actualMinutes - expectedMinutes > TOLERANCE_MINUTES) {
      lateCount += 1;
    }
  });

  return lateCount;
};

const EMPTY_EVIDENCE = {
  actualHours: null,
  expectedHours: null,
  attendanceRate: null,
  lateCount: null,
  missedClockOutCount: null,
  unresolvedCorrectionsCount: null
};

async function computeRotationEvidence({ userId, startDate, endDate }) {
  if (!userId || !startDate || !endDate) {
    return EMPTY_EVIDENCE;
  }

  const rangeStart = new Date(startDate);
  const rangeEnd = new Date(endDate);
  if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime()) || rangeEnd < rangeStart) {
    return EMPTY_EVIDENCE;
  }

  const staff = await Staff.findById(userId)
    .select([
      'hostCompanyId',
      'clockInTime',
      'clockOutTime',
      'breakStartTime',
      'breakEndTime',
      'expectedWorkingDaysPerWeek',
      'expectedWorkingDaysPerMonth',
      'expectedHoursPerDay',
      'expectedWeeklyHours',
      'expectedMonthlyHours'
    ])
    .lean();

  if (!staff) {
    return EMPTY_EVIDENCE;
  }

  const logs = await ClockLog.find({
    staffId: userId,
    timestamp: { $gte: rangeStart, $lte: rangeEnd }
  })
    .select('activityType timestamp')
    .sort({ timestamp: 1 })
    .lean();

  const attendanceByDate = buildDailyAttendance(logs);
  const dailyEntries = Object.values(attendanceByDate);

  let actualHours = 0;
  let missedClockOutCount = 0;
  dailyEntries.forEach((day) => {
    actualHours += computeHoursWorkedForDay(day);
    if (day.clockIn && !day.clockOut) {
      missedClockOutCount += 1;
    }
  });

  const workingHours = await resolveWorkingHours(staff, rangeStart, rangeEnd);
  const expectedHours = computeExpectedHoursForRange(workingHours, rangeStart, rangeEnd);
  const attendanceRate = expectedHours > 0
    ? Math.min(100, Math.max(0, (actualHours / expectedHours) * 100))
    : 0;

  const clockTimes = await resolveClockTimes(staff);
  const lateCount = computeLateCount(attendanceByDate, clockTimes ? clockTimes.clockInTime : null);
  const unresolvedCorrectionsCount = await AttendanceCorrection.countDocuments({
    internId: userId,
    status: 'pending',
    date: { $gte: rangeStart, $lte: rangeEnd }
  });

  return {
    actualHours: roundValue(actualHours),
    expectedHours: roundValue(expectedHours),
    attendanceRate: roundValue(attendanceRate),
    lateCount,
    missedClockOutCount,
    unresolvedCorrectionsCount
  };
}

module.exports = {
  computeRotationEvidence,
  resolveWorkingHours,
  computeExpectedHoursForRange
};
