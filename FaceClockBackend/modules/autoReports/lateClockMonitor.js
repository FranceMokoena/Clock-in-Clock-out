const { DateTime } = require('luxon');
const Staff = require('../../models/Staff');
const ClockLog = require('../../models/ClockLog');
const ReportSettings = require('../../models/ReportSettings');
const ReportRun = require('../../models/ReportRun');
const reportGenerator = require('./reportGenerator');
const reportDelivery = require('./reportDelivery');
const { buildPeriodKey, DEFAULT_TIMEZONE, parseTimeString } = require('./timeUtils');

const getSettingsForStaff = async (staff) => {
  const settings = [];
  const adminSettings = await ReportSettings.find({ ownerType: 'Admin' }).lean();
  settings.push(...adminSettings);
  if (staff.hostCompanyId) {
    const hostSettings = await ReportSettings.find({
      ownerType: 'HostCompany',
      ownerId: staff.hostCompanyId,
    }).lean();
    settings.push(...hostSettings);
  }
  return settings;
};

const shouldNotifyLate = (settings, diffMinutes) => {
  const grace = settings?.lateRule?.graceMinutes ?? 30;
  const enabled = settings?.lateRule?.notifyOnLateClockIn !== false;
  return enabled && diffMinutes > grace;
};

const shouldNotifyMissing = (settings) => settings?.lateRule?.notifyOnMissingClockIn !== false;

const hasRecipients = (settings) => {
  const emails = settings?.recipients?.emails || [];
  const whatsapp = settings?.recipients?.whatsappNumbers || [];
  return emails.length > 0 || whatsapp.length > 0;
};

const createRunIfMissing = async ({ ownerType, ownerId, reportType, periodKey, periodStart, periodEnd, staffId, recipients }) => {
  const exists = await ReportRun.findOne({ ownerType, ownerId, reportType, periodKey }).lean();
  if (exists) return null;
  try {
    return await ReportRun.create({
      ownerType,
      ownerId,
      reportType,
      periodKey,
      periodStart,
      periodEnd,
      staffId,
      recipients,
      status: 'queued',
    });
  } catch (error) {
    if (error && error.code === 11000) return null;
    throw error;
  }
};

const handleLateClockIn = async ({ staff, timestamp, timeDiffMinutes }) => {
  if (!staff || typeof timeDiffMinutes !== 'number' || timeDiffMinutes <= 0) return;

  const settingsList = await getSettingsForStaff(staff);
  for (const settings of settingsList) {
    if (!settings || !shouldNotifyLate(settings, timeDiffMinutes) || !hasRecipients(settings)) continue;

    const timezone = settings.timezone || DEFAULT_TIMEZONE;
    const eventTime = DateTime.fromJSDate(timestamp).setZone(timezone);
    const periodKey = buildPeriodKey('late', eventTime.toISODate(), settings.ownerType, settings.ownerId, staff._id);

    const run = await createRunIfMissing({
      ownerType: settings.ownerType,
      ownerId: settings.ownerId,
      reportType: 'late',
      periodKey,
      periodStart: eventTime.startOf('day').toJSDate(),
      periodEnd: eventTime.endOf('day').toJSDate(),
      staffId: staff._id,
      recipients: settings.recipients,
    });

    if (!run) continue;

    try {
      const report = await reportGenerator.buildLateClockInReport({
        staff,
        timestamp,
        timeDiffMinutes,
        ownerType: settings.ownerType,
        ownerId: settings.ownerId,
        timezone,
        graceMinutes: settings?.lateRule?.graceMinutes ?? 30,
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
        errorMessage: error?.message || 'Late report failed',
      });
    }
  }
};

const checkMissingClockIns = async (settingsList = []) => {
  if (!settingsList.length) return;

  for (const settings of settingsList) {
    if (!settings || !shouldNotifyMissing(settings) || !hasRecipients(settings)) continue;
    const timezone = settings.timezone || DEFAULT_TIMEZONE;
    const now = DateTime.now().setZone(timezone);

    const staffFilter = { isActive: true };
    if (settings.ownerType === 'HostCompany') {
      staffFilter.hostCompanyId = settings.ownerId;
    }

    const staffList = await Staff.find(staffFilter)
      .populate('hostCompanyId', 'defaultClockInTime')
      .lean();

    if (!staffList.length) continue;

    for (const staff of staffList) {
      const expectedClockIn = staff.clockInTime || staff.hostCompanyId?.defaultClockInTime;
      if (!expectedClockIn) continue;
      const expectedTime = parseTimeString(expectedClockIn);
      if (!expectedTime) continue;

      const expectedDateTime = now.set({
        hour: expectedTime.hour,
        minute: expectedTime.minute,
        second: 0,
        millisecond: 0,
      });
      const graceMinutes = settings?.lateRule?.graceMinutes ?? 30;
      if (now < expectedDateTime.plus({ minutes: graceMinutes })) continue;

      const dateKey = now.toISODate();
      const startOfDay = now.startOf('day').toJSDate();
      const endOfDay = now.endOf('day').toJSDate();

      const hasClockIn = await ClockLog.exists({
        staffId: staff._id,
        clockType: 'in',
        timestamp: { $gte: startOfDay, $lte: endOfDay },
      });

      if (hasClockIn) continue;

      const periodKey = buildPeriodKey('missing', dateKey, settings.ownerType, settings.ownerId, staff._id);

      const run = await createRunIfMissing({
        ownerType: settings.ownerType,
        ownerId: settings.ownerId,
        reportType: 'missing',
        periodKey,
        periodStart: startOfDay,
        periodEnd: endOfDay,
        staffId: staff._id,
        recipients: settings.recipients,
      });

      if (!run) continue;

      try {
        const report = await reportGenerator.buildMissingClockInReport({
          staff,
          dateKey,
          ownerType: settings.ownerType,
          ownerId: settings.ownerId,
          timezone,
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
          errorMessage: error?.message || 'Missing clock-in report failed',
        });
      }
    }
  }
};

module.exports = {
  handleLateClockIn,
  checkMissingClockIns,
};
