const { DateTime } = require('luxon');

const DEFAULT_TIMEZONE = process.env.REPORT_TIMEZONE || 'Africa/Johannesburg';

const getNow = (timeZone = DEFAULT_TIMEZONE) => DateTime.now().setZone(timeZone);

const parseTimeString = (value) => {
  if (!value || typeof value !== 'string') return null;
  const parts = value.split(':');
  if (parts.length !== 2) return null;
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
};

const isTimeMatch = (now, timeString) => {
  if (!timeString) return false;
  return now.toFormat('HH:mm') === timeString;
};

const isLastDayOfMonth = (now) => now.day === now.endOf('month').day;

const getWeeklyPeriod = (now) => {
  const start = now.startOf('week');
  const key = `${now.weekYear}-W${String(now.weekNumber).padStart(2, '0')}`;
  return { start, end: now, key };
};

const getMonthlyPeriod = (now) => {
  const start = now.startOf('month');
  const key = now.toFormat('yyyy-LL');
  return { start, end: now, key };
};

const buildPeriodKey = (reportType, periodKey, ownerType, ownerId, staffId = null) => {
  const safeOwner = ownerId ? ownerId.toString() : 'unknown';
  const safeStaff = staffId ? staffId.toString() : 'all';
  return `${reportType}:${periodKey}:${ownerType}:${safeOwner}:${safeStaff}`;
};

module.exports = {
  DEFAULT_TIMEZONE,
  getNow,
  parseTimeString,
  isTimeMatch,
  isLastDayOfMonth,
  getWeeklyPeriod,
  getMonthlyPeriod,
  buildPeriodKey,
};
