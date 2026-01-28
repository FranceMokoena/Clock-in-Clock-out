const ReportSettings = require('../../models/ReportSettings');
const ReportRun = require('../../models/ReportRun');
const reportGenerator = require('./reportGenerator');
const reportDelivery = require('./reportDelivery');
const lateClockMonitor = require('./lateClockMonitor');
const {
  getNow,
  isTimeMatch,
  isLastDayOfMonth,
  getWeeklyPeriod,
  getMonthlyPeriod,
  buildPeriodKey,
  DEFAULT_TIMEZONE,
} = require('./timeUtils');

const DEFAULT_INTERVAL_MS = 60 * 1000;
let intervalId = null;

const hasRecipients = (settings) => {
  const emails = settings?.recipients?.emails || [];
  const whatsapp = settings?.recipients?.whatsappNumbers || [];
  return emails.length > 0 || whatsapp.length > 0;
};

const normalizeTime = (value, fallback) => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
};

const shouldRunWeekly = (settings, now) => {
  const weekly = settings?.weekly || {};
  if (weekly.enabled === false) return false;
  const dayOfWeek = weekly.dayOfWeek ?? 5; // Friday
  const time = normalizeTime(weekly.time, '17:00');
  return now.weekday === dayOfWeek && isTimeMatch(now, time);
};

const shouldRunMonthly = (settings, now) => {
  const monthly = settings?.monthly || {};
  if (monthly.enabled === false) return false;
  const sendOnLastDay = monthly.sendOnLastDay !== false;
  if (sendOnLastDay && !isLastDayOfMonth(now)) return false;
  const time = normalizeTime(monthly.time, '17:00');
  return isTimeMatch(now, time);
};

const runSummaryReport = async (type, settings, now) => {
  if (!hasRecipients(settings)) return;

  const timezone = settings.timezone || DEFAULT_TIMEZONE;
  const period = type === 'weekly' ? getWeeklyPeriod(now) : getMonthlyPeriod(now);
  const periodKey = buildPeriodKey(type, period.key, settings.ownerType, settings.ownerId);

  const exists = await ReportRun.findOne({
    ownerType: settings.ownerType,
    ownerId: settings.ownerId,
    reportType: type,
    periodKey,
  }).lean();

  if (exists) return;

  let run;
  try {
    run = await ReportRun.create({
      ownerType: settings.ownerType,
      ownerId: settings.ownerId,
      reportType: type,
      periodKey,
      periodStart: period.start.toJSDate(),
      periodEnd: period.end.toJSDate(),
      recipients: settings.recipients,
      status: 'queued',
    });
  } catch (error) {
    if (error && error.code === 11000) return;
    throw error;
  }

  try {
    const report = await reportGenerator.buildSummaryReport({
      ownerType: settings.ownerType,
      ownerId: settings.ownerId,
      periodStart: period.start.toJSDate(),
      periodEnd: period.end.toJSDate(),
      timezone,
      graceMinutes: settings?.lateRule?.graceMinutes ?? 30,
      reportType: type,
      periodKey,
      filters: settings?.filters,
    });

    const delivery = await reportDelivery.deliverReport({ report, settings });

    await ReportRun.findByIdAndUpdate(run._id, {
      status: delivery.success ? 'sent' : 'generated',
      fileUrl: delivery.filePath || '',
      errorMessage: delivery.errorMessage || '',
    });
  } catch (error) {
    await ReportRun.findByIdAndUpdate(run._id, {
      status: 'failed',
      errorMessage: error?.message || 'Failed to generate report',
    });
  }
};

const tick = async () => {
  const settingsList = await ReportSettings.find({}).lean();
  if (!settingsList.length) return;

  for (const settings of settingsList) {
    const timezone = settings.timezone || DEFAULT_TIMEZONE;
    const now = getNow(timezone);

    if (shouldRunWeekly(settings, now)) {
      await runSummaryReport('weekly', settings, now);
    }

    if (shouldRunMonthly(settings, now)) {
      await runSummaryReport('monthly', settings, now);
    }
  }

  await lateClockMonitor.checkMissingClockIns(settingsList);
};

const start = (intervalMs = DEFAULT_INTERVAL_MS) => {
  if (intervalId) return;
  intervalId = setInterval(() => {
    tick().catch((err) => {
      console.error('Auto report scheduler error:', err?.message || err);
    });
  }, intervalMs);

  tick().catch((err) => {
    console.error('Auto report scheduler startup error:', err?.message || err);
  });
};

const stop = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};

module.exports = {
  start,
  stop,
  tick,
};
